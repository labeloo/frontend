/**
 * Sliding Buffer Optimization for Real-time Polygon Drawing
 * Reduces rendering overhead during active annotation without losing functionality
 * Uses distance and time-based throttling with requestAnimationFrame batching
 * Integrates with Web Worker for background polygon simplification
 */

import { workerManager } from './polygonWorkerManager'

interface BufferConfig {
  maxVisiblePoints: number
  simplificationThreshold: number
  renderSkipInterval: number
  bufferSize: number
  minDistance: number // Minimum distance between points in pixels
  minTimeInterval: number // Minimum time between points in milliseconds
  batchDrawUpdates: boolean // Use requestAnimationFrame for batching
}

class SlidingBufferOptimizer {
  private config: BufferConfig = {
    maxVisiblePoints: 8, // Only show last 8 points during drawing
    simplificationThreshold: 10, // Start optimization after 10 points
    renderSkipInterval: 2, // Skip every 2nd point for rendering (but keep for final)
    bufferSize: 50, // Keep full buffer internally
    minDistance: 2, // Minimum 2px distance between points
    minTimeInterval: 16, // Minimum 16ms between points (~60fps)
    batchDrawUpdates: true // Use requestAnimationFrame for batching
  }

  private fullBuffer: number[] = [] // Complete point history
  private renderBuffer: number[] = [] // Optimized points for rendering
  private isOptimizing = false
  private lastPointTime = 0 // Track time of last point
  private lastPoint: { x: number, y: number } | null = null // Track last point position
  private pendingRenderUpdate = false // Track if render update is pending
  private renderCallback: (() => void) | null = null // Callback for render updates

  /**
   * Add a new point to the buffer with distance and time throttling
   * Returns null if point should be skipped, otherwise returns optimized points
   */
  addPoint(x: number, y: number, forceAdd: boolean = false): number[] | null {
    const currentTime = performance.now()
    
    // Check distance and time constraints (unless forced)
    if (!forceAdd && this.lastPoint) {
      const distance = Math.sqrt(
        Math.pow(x - this.lastPoint.x, 2) + Math.pow(y - this.lastPoint.y, 2)
      )
      
      const timeDiff = currentTime - this.lastPointTime
      
      // Skip point if too close in distance AND time
      if (distance < this.config.minDistance && timeDiff < this.config.minTimeInterval) {
        return null // Don't add this point
      }
    }
    
    // Add to full buffer
    this.fullBuffer.push(x, y)
    this.lastPoint = { x, y }
    this.lastPointTime = currentTime
    
    const pointCount = this.fullBuffer.length / 2
    
    // Determine if we should start optimizing
    if (pointCount >= this.config.simplificationThreshold && !this.isOptimizing) {
      this.isOptimizing = true
      console.log(`🎯 Sliding buffer optimization activated at ${pointCount} points`)
    }
    
    if (this.config.batchDrawUpdates) {
      // Schedule batched render update
      this.scheduleBatchedRender()
      return this.renderBuffer // Return current render buffer
    } else {
      // Immediate update
      return this.getOptimizedRenderPoints()
    }
  }

  /**
   * Schedule a batched render update using requestAnimationFrame
   */
  private scheduleBatchedRender(): void {
    if (this.pendingRenderUpdate) return // Already scheduled
    
    this.pendingRenderUpdate = true
    requestAnimationFrame(() => {
      this.renderBuffer = this.getOptimizedRenderPoints()
      this.pendingRenderUpdate = false
      
      // Trigger render callback if set
      if (this.renderCallback) {
        this.renderCallback()
      }
    })
  }

  /**
   * Set callback for render updates (called after batched updates)
   */
  setRenderCallback(callback: () => void): void {
    this.renderCallback = callback
  }

  /**
   * Get optimized points for real-time rendering
   */
  private getOptimizedRenderPoints(): number[] {
    const pointCount = this.fullBuffer.length / 2
    
    if (pointCount <= this.config.maxVisiblePoints) {
      // Few points, show all
      this.renderBuffer = [...this.fullBuffer]
      return this.renderBuffer
    }
    
    // Create sliding window of visible points
    const slidingWindow: number[] = []
    
    // Always include the first few points for context
    const contextPoints = 6 // 3 coordinate pairs
    for (let i = 0; i < Math.min(contextPoints, this.fullBuffer.length); i++) {
      const value = this.fullBuffer[i]
      if (value !== undefined) {
        slidingWindow.push(value)
      }
    }
    
    // Add recent points with skip interval for performance
    const recentPointsStart = Math.max(contextPoints, this.fullBuffer.length - (this.config.maxVisiblePoints * 2))
    
    for (let i = recentPointsStart; i < this.fullBuffer.length; i += this.config.renderSkipInterval) {
      if (i + 1 < this.fullBuffer.length) {
        const x = this.fullBuffer[i]
        const y = this.fullBuffer[i + 1]
        if (x !== undefined && y !== undefined) {
          slidingWindow.push(x, y)
        }
      }
    }
    
    // Always include the very last point for accurate cursor following
    const lastIdx = this.fullBuffer.length - 2
    if (lastIdx >= 0 && lastIdx + 1 < this.fullBuffer.length) {
      const x = this.fullBuffer[lastIdx]
      const y = this.fullBuffer[lastIdx + 1]
      if (x !== undefined && y !== undefined) {
        slidingWindow.push(x, y)
      }
    }
    
    this.renderBuffer = slidingWindow
    return this.renderBuffer
  }

  /**
   * Get the complete polygon for final submission
   */
  getCompletePolygon(): number[] {
    return [...this.fullBuffer]
  }

  /**
   * Get simplified version of complete polygon for final rendering (sync version)
   */
  getOptimizedCompletePolygon(tolerance: number = 2.0): number[] {
    if (this.fullBuffer.length < 6) return [...this.fullBuffer] // Less than 3 points
    
    return this.simplifyPoints(this.fullBuffer, tolerance)
  }

  /**
   * Get simplified version of complete polygon using Web Worker
   */
  async getOptimizedCompletePolygonAsync(tolerance: number = 2.0, preserveShape: boolean = true): Promise<number[]> {
    if (this.fullBuffer.length < 6) return [...this.fullBuffer] // Less than 3 points
    
    try {
      // Use Web Worker for heavy computation
      const result = await workerManager.simplifyPolygon(this.fullBuffer, tolerance, preserveShape)
      console.log(`🔧 Worker simplification: ${result.originalPoints} → ${result.simplifiedPoints.length/2} points (${result.compressionRatio.toFixed(1)}%) in ${result.processingTime.toFixed(1)}ms`)
      return result.simplifiedPoints
    } catch (error) {
      console.warn('🔧 Worker simplification failed, falling back to synchronous:', error)
      // Fallback to synchronous simplification
      return this.simplifyPoints(this.fullBuffer, tolerance)
    }
  }

  /**
   * Ramer-Douglas-Peucker simplification for final polygon
   */
  private simplifyPoints(points: number[], tolerance: number): number[] {
    if (points.length < 6) return points // Need at least 3 points
    
    // Convert to point objects for easier processing
    const pointObjects: { x: number, y: number }[] = []
    for (let i = 0; i < points.length - 1; i += 2) {
      const x = points[i]
      const y = points[i + 1]
      if (x !== undefined && y !== undefined) {
        pointObjects.push({ x, y })
      }
    }
    
    if (pointObjects.length < 3) return points
    
    const simplified = this.ramerDouglasPeucker(pointObjects, tolerance)
    
    // Convert back to flat array
    const result: number[] = []
    simplified.forEach(point => {
      result.push(point.x, point.y)
    })
    
    return result
  }

  /**
   * Ramer-Douglas-Peucker algorithm implementation
   */
  private ramerDouglasPeucker(points: {x: number, y: number}[], tolerance: number): {x: number, y: number}[] {
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
    
    // If max distance is greater than tolerance, recursively simplify
    if (maxDistance > tolerance) {
      const left = this.ramerDouglasPeucker(points.slice(0, maxIndex + 1), tolerance)
      const right = this.ramerDouglasPeucker(points.slice(maxIndex), tolerance)
      
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
  private perpendicularDistance(point: {x: number, y: number}, lineStart: {x: number, y: number}, lineEnd: {x: number, y: number}): number {
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

  /**
   * Reset the buffer for a new polygon
   */
  reset(): void {
    this.fullBuffer = []
    this.renderBuffer = []
    this.isOptimizing = false
    this.lastPoint = null
    this.lastPointTime = 0
    this.pendingRenderUpdate = false
  }

  /**
   * Get current optimization status
   */
  getStatus() {
    return {
      totalPoints: this.fullBuffer.length / 2,
      renderPoints: this.renderBuffer.length / 2,
      isOptimizing: this.isOptimizing,
      compressionRatio: this.isOptimizing ? 
        (this.renderBuffer.length / this.fullBuffer.length) * 100 : 100
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<BufferConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current buffer sizes for debugging
   */
  getBufferInfo() {
    return {
      fullBufferSize: this.fullBuffer.length,
      renderBufferSize: this.renderBuffer.length,
      pointCount: this.fullBuffer.length / 2,
      renderPointCount: this.renderBuffer.length / 2,
      memoryReduction: `${((1 - this.renderBuffer.length / this.fullBuffer.length) * 100).toFixed(1)}%`
    }
  }
}

// Global instance for polygon optimization
export const slidingBufferOptimizer = new SlidingBufferOptimizer()

// Configuration presets for different performance levels
export const PerformancePresets = {
  SMOOTH: {
    maxVisiblePoints: 12,
    simplificationThreshold: 8,
    renderSkipInterval: 1,
    bufferSize: 100,
    minDistance: 1.5, // More precise drawing
    minTimeInterval: 8, // Higher frequency updates
    batchDrawUpdates: true
  },
  BALANCED: {
    maxVisiblePoints: 8,
    simplificationThreshold: 10,
    renderSkipInterval: 2,
    bufferSize: 50,
    minDistance: 2, // Good balance
    minTimeInterval: 16, // 60fps equivalent
    batchDrawUpdates: true
  },
  PERFORMANCE: {
    maxVisiblePoints: 6,
    simplificationThreshold: 6,
    renderSkipInterval: 3,
    bufferSize: 30,
    minDistance: 3, // Aggressive throttling
    minTimeInterval: 33, // 30fps equivalent
    batchDrawUpdates: true
  }
}

export type { BufferConfig }
