/**
 * Web Worker for Polygon Simplification
 * Handles Ramer-Douglas-Peucker algorithm processing in background thread
 * Keeps main UI thread responsive during complex polygon operations
 */

/**
 * Ramer-Douglas-Peucker algorithm implementation
 * Optimized for web worker environment
 */
class PolygonSimplifier {
  /**
   * Simplify a polygon using Ramer-Douglas-Peucker algorithm
   */
  static simplifyPolygon(points, tolerance, preserveShape = true) {
    if (points.length < 6) return points // Need at least 3 points (x,y pairs)
    
    // Convert flat array to point objects
    const pointObjects = []
    for (let i = 0; i < points.length - 1; i += 2) {
      const x = points[i]
      const y = points[i + 1]
      if (x !== undefined && y !== undefined) {
        pointObjects.push({ x, y })
      }
    }
    
    if (pointObjects.length < 3) return points
    
    // Apply simplification
    const simplified = this.ramerDouglasPeucker(pointObjects, tolerance, preserveShape)
    
    // Convert back to flat array
    const result = []
    simplified.forEach(point => {
      result.push(point.x, point.y)
    })
    
    return result
  }
  
  /**
   * Core Ramer-Douglas-Peucker implementation
   */
  static ramerDouglasPeucker(points, tolerance, preserveShape) {
    if (points.length < 3) return points
    
    const first = points[0]
    const last = points[points.length - 1]
    
    if (!first || !last) return points
    
    let maxDistance = 0
    let maxIndex = 0
    
    // Find the point with maximum distance from the line
    for (let i = 1; i < points.length - 1; i++) {
      const point = points[i]
      if (point) {
        const distance = this.perpendicularDistance(point, first, last)
        if (distance > maxDistance) {
          maxDistance = distance
          maxIndex = i
        }
      }
    }
    
    // Adjust tolerance based on shape preservation setting
    const effectiveTolerance = preserveShape ? tolerance * 0.7 : tolerance
    
    // If max distance is greater than tolerance, recursively simplify
    if (maxDistance > effectiveTolerance) {
      const left = this.ramerDouglasPeucker(points.slice(0, maxIndex + 1), tolerance, preserveShape)
      const right = this.ramerDouglasPeucker(points.slice(maxIndex), tolerance, preserveShape)
      
      // Combine results, avoiding duplicate middle point
      return left.slice(0, -1).concat(right)
    } else {
      // All points between first and last are within tolerance
      return [first, last]
    }
  }
  
  /**
   * Calculate perpendicular distance from point to line
   */
  static perpendicularDistance(point, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x
    const dy = lineEnd.y - lineStart.y
    
    if (dx === 0 && dy === 0) {
      return Math.sqrt(Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2))
    }
    
    const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy)
    
    let closestX, closestY
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
}

/**
 * Handle messages from main thread
 */
self.onmessage = function(event) {
  const startTime = performance.now()
  const request = event.data
  
  try {
    if (request.type === 'simplify') {
      // Validate input
      if (!Array.isArray(request.points) || request.points.length < 6) {
        const errorResponse = {
          id: request.id,
          type: 'error',
          message: 'Invalid points array: must have at least 6 elements (3 coordinate pairs)'
        }
        self.postMessage(errorResponse)
        return
      }
      
      if (typeof request.tolerance !== 'number' || request.tolerance <= 0) {
        const errorResponse = {
          id: request.id,
          type: 'error',
          message: 'Invalid tolerance: must be a positive number'
        }
        self.postMessage(errorResponse)
        return
      }
      
      // Perform simplification
      const simplifiedPoints = PolygonSimplifier.simplifyPolygon(
        request.points, 
        request.tolerance, 
        request.preserveShape || true
      )
      
      const processingTime = performance.now() - startTime
      const originalPointCount = request.points.length / 2
      const simplifiedPointCount = simplifiedPoints.length / 2
      const compressionRatio = (simplifiedPointCount / originalPointCount) * 100
      
      // Send successful response
      const response = {
        id: request.id,
        type: 'simplified',
        originalPoints: originalPointCount,
        simplifiedPoints: simplifiedPoints,
        processingTime: processingTime,
        compressionRatio: compressionRatio
      }
      
      self.postMessage(response)
      
      // Log performance metrics
      console.log(`🔧 Worker: Simplified ${originalPointCount} → ${simplifiedPointCount} points (${compressionRatio.toFixed(1)}%) in ${processingTime.toFixed(1)}ms`)
      
    } else {
      const errorResponse = {
        id: request.id,
        type: 'error',
        message: `Unknown request type: ${request.type}`
      }
      self.postMessage(errorResponse)
    }
    
  } catch (error) {
    const errorResponse = {
      id: request.id,
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }
    self.postMessage(errorResponse)
  }
}

/**
 * Send ready signal to main thread
 */
self.postMessage({ type: 'ready', message: 'Polygon simplification worker ready' })
