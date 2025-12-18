/**
 * Polygon Hitbox Optimization Utilities
 * Provides two-tier polygon system for improved interaction at scale
 */

export interface Point {
  x: number
  y: number
}

export interface HitboxPolygon {
  visual: number[]      // Full resolution polygon points for visual display
  hitbox: number[]      // Simplified polygon points for interaction detection
  isSimplified: boolean // Whether simplification was applied
}

/**
 * Creates a simplified hitbox polygon using Douglas-Peucker algorithm
 * with aggressive tolerance for interaction purposes
 * 
 * @param points - Original polygon points array [x1, y1, x2, y2, ...]
 * @param tolerance - Simplification tolerance (higher = more aggressive)
 * @returns Simplified points array
 */
export function createHitboxPolygon(points: number[], tolerance: number = 5.0): number[] {
  if (points.length < 6) return points // Need at least 3 points
  
  // Convert flat array to point objects
  const pointObjects: Point[] = []
  for (let i = 0; i < points.length - 1; i += 2) {
    pointObjects.push({ x: points[i]!, y: points[i + 1]! })
  }
  
  if (pointObjects.length < 3) return points
  
  // Apply Douglas-Peucker simplification
  const simplified = douglasPeucker(pointObjects, tolerance)
  
  // Convert back to flat array
  const result: number[] = []
  simplified.forEach(point => {
    result.push(point.x, point.y)
  })
  
  return result
}

/**
 * Douglas-Peucker algorithm implementation for hitbox creation
 * More aggressive than visual simplification
 */
function douglasPeucker(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points
  
  const first = points[0]!
  const last = points[points.length - 1]!
  
  let maxDistance = 0
  let maxIndex = 0
  
  // Find the point with maximum distance from the line
  for (let i = 1; i < points.length - 1; i++) {
    const point = points[i]!
    const distance = perpendicularDistance(point, first, last)
    if (distance > maxDistance) {
      maxDistance = distance
      maxIndex = i
    }
  }
  
  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance)
    const right = douglasPeucker(points.slice(maxIndex), tolerance)
    
    // Combine results, avoiding duplicate middle point
    return left.slice(0, -1).concat(right)
  } else {
    // All points between first and last are within tolerance
    return [first, last]
  }
}

/**
 * Calculate perpendicular distance from point to line segment
 */
function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y
  
  if (dx === 0 && dy === 0) {
    return Math.sqrt(Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2))
  }
  
  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy)
  
  let closestX: number, closestY: number
  if (t < 0) {
    closestX = lineStart.x
    closestY = lineStart.y
  } else if (t > 1) {
    closestX = lineEnd.x
    closestY = lineEnd.y
  } else {
    closestX = lineStart.x + t * dx
    closestY = lineStart.y + t * dy
  }
  
  return Math.sqrt(Math.pow(point.x - closestX, 2) + Math.pow(point.y - closestY, 2))
}

/**
 * Determines if a polygon should use simplified hitbox
 * based on point count and performance thresholds
 */
export function shouldUseSimplifiedHitbox(pointCount: number, totalPolygons: number): boolean {
  // Use simplified hitbox for complex polygons or when many polygons exist
  return pointCount > 20 || totalPolygons >= 8
}

/**
 * Creates a complete two-tier polygon configuration
 */
export function createTwoTierPolygon(
  points: number[], 
  totalPolygons: number,
  tolerance: number = 5.0
): HitboxPolygon {
  const needsSimplification = shouldUseSimplifiedHitbox(points.length / 2, totalPolygons)
  
  if (needsSimplification) {
    return {
      visual: points,
      hitbox: createHitboxPolygon(points, tolerance),
      isSimplified: true
    }
  }
  
  return {
    visual: points,
    hitbox: points,
    isSimplified: false
  }
}

/**
 * Calculates optimal tolerance based on polygon size and complexity
 */
export function calculateOptimalTolerance(points: number[], zoomLevel: number = 1.0): number {
  const pointCount = points.length / 2
  
  // Base tolerance - more aggressive for interaction hitboxes
  let tolerance = 5.0
  
  // Adjust based on point count
  if (pointCount > 50) {
    tolerance = 8.0
  } else if (pointCount > 100) {
    tolerance = 12.0
  }
  
  // Adjust based on zoom level - more aggressive when zoomed out
  tolerance = tolerance / Math.max(zoomLevel, 0.3)
  
  return Math.max(2.0, tolerance) // Minimum tolerance of 2 pixels
}