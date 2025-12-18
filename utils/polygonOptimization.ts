/**
 * Polygon optimization utilities for performance improvement
 */

export interface Point {
  x: number
  y: number
}

/**
 * Ramer-Douglas-Peucker algorithm for polygon simplification
 * Reduces the number of points in a polygon while preserving its general shape
 * 
 * @param points - Array of points to simplify
 * @param epsilon - Maximum allowed distance from the simplified line (higher = more simplification)
 * @returns Simplified array of points
 */
export function simplifyPolygon(points: Point[], epsilon: number = 1.0): Point[] {
  if (points.length <= 2) {
    return points
  }

  // Find the point with the maximum distance from line segment between first and last points
  let maxDistance = 0
  let maxIndex = 0
  const start = points[0]!
  const end = points[points.length - 1]!

  for (let i = 1; i < points.length - 1; i++) {
    const point = points[i]
    if (!point) continue
    
    const distance = perpendicularDistance(point, start, end)
    if (distance > maxDistance) {
      maxDistance = distance
      maxIndex = i
    }
  }

  // If max distance is greater than epsilon, recursively simplify
  if (maxDistance > epsilon) {
    // Recursively simplify both parts
    const leftPart = simplifyPolygon(points.slice(0, maxIndex + 1), epsilon)
    const rightPart = simplifyPolygon(points.slice(maxIndex), epsilon)

    // Combine results (remove duplicate point at junction)
    return [...leftPart.slice(0, -1), ...rightPart]
  } else {
    // All points are close enough to the line, return just the endpoints
    return [start, end]
  }
}

/**
 * Calculate perpendicular distance from a point to a line segment
 * 
 * @param point - The point to measure distance from
 * @param lineStart - Start point of the line segment
 * @param lineEnd - End point of the line segment
 * @returns Distance from point to line segment
 */
function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y

  // If the line segment is actually a point, return distance to that point
  if (dx === 0 && dy === 0) {
    return Math.sqrt(Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2))
  }

  // Calculate the perpendicular distance using the formula for distance from point to line
  const numerator = Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x)
  const denominator = Math.sqrt(dx * dx + dy * dy)

  return numerator / denominator
}

/**
 * Adaptive simplification that adjusts epsilon based on zoom level
 * More simplification when zoomed out, less when zoomed in
 * 
 * @param points - Array of points to simplify
 * @param zoomLevel - Current zoom/scale level (1.0 = normal, < 1.0 = zoomed out, > 1.0 = zoomed in)
 * @param baseEpsilon - Base epsilon value for simplification
 * @returns Simplified array of points
 */
export function adaptiveSimplifyPolygon(points: Point[], zoomLevel: number, baseEpsilon: number = 1.0): Point[] {
  // Adjust epsilon based on zoom level
  // When zoomed out (zoomLevel < 1), use more aggressive simplification
  // When zoomed in (zoomLevel > 1), use less simplification
  const adaptiveEpsilon = baseEpsilon / Math.max(zoomLevel, 0.1)
  
  return simplifyPolygon(points, adaptiveEpsilon)
}

/**
 * Check if polygon simplification would be beneficial
 * 
 * @param pointCount - Number of points in the polygon
 * @param zoomLevel - Current zoom level
 * @returns True if simplification should be applied
 */
export function shouldSimplifyPolygon(pointCount: number, zoomLevel: number): boolean {
  // More aggressive thresholds to prevent UI lag from the 10th polygon onwards
  // Simplify if polygon has many points and we're zoomed out
  return pointCount > 5 && zoomLevel < 1.2 // Reduced from 10 points to 5, and zoom threshold from 0.8 to 1.2
}
