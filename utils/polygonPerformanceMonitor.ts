/**
 * Polygon Performance Monitor
 * Tracks and optimizes polygon rendering performance in real-time
 */

interface PerformanceMetrics {
  totalPolygons: number
  complexPolygons: number
  averagePoints: number
  simplifiedPolygons: number
  cachedPolygons: number
  performanceModeActive: boolean
  lastFrameTime: number
  frameRate: number
}

interface PerformanceConfig {
  maxPolygonsBeforeOptimization: number
  maxPointsBeforeSimplification: number
  targetFrameRate: number
  performanceModeThreshold: number
}

class PolygonPerformanceMonitor {
  private metrics: PerformanceMetrics = {
    totalPolygons: 0,
    complexPolygons: 0,
    averagePoints: 0,
    simplifiedPolygons: 0,
    cachedPolygons: 0,
    performanceModeActive: false,
    lastFrameTime: 0,
    frameRate: 60
  }

  private config: PerformanceConfig = {
    maxPolygonsBeforeOptimization: 6,
    maxPointsBeforeSimplification: 5,
    targetFrameRate: 30,
    performanceModeThreshold: 12
  }

  private frameHistory: number[] = []
  private lastUpdateTime = 0

  /**
   * Update performance metrics based on current annotations
   */
  updateMetrics(annotations: any[]): void {
    const polygons = annotations.filter(a => a.type === 'polygon' || a.type === 'freehand')
    
    this.metrics.totalPolygons = polygons.length
    this.metrics.complexPolygons = polygons.filter(p => p.points && p.points.length > this.config.maxPointsBeforeSimplification * 2).length
    
    if (polygons.length > 0) {
      const totalPoints = polygons.reduce((sum, p) => sum + (p.points?.length || 0), 0)
      this.metrics.averagePoints = totalPoints / polygons.length / 2 // Divide by 2 for x,y pairs
    }

    this.updateFrameRate()
  }

  /**
   * Update frame rate calculation
   */
  private updateFrameRate(): void {
    const now = performance.now()
    if (this.lastUpdateTime > 0) {
      const frameTime = now - this.lastUpdateTime
      this.frameHistory.push(frameTime)
      
      // Keep only last 30 frames for averaging
      if (this.frameHistory.length > 30) {
        this.frameHistory.shift()
      }
      
      const averageFrameTime = this.frameHistory.reduce((a, b) => a + b, 0) / this.frameHistory.length
      this.metrics.frameRate = 1000 / averageFrameTime
      this.metrics.lastFrameTime = frameTime
    }
    this.lastUpdateTime = now
  }

  /**
   * Check if performance optimizations should be enabled
   */
  shouldOptimize(): boolean {
    return (
      this.metrics.totalPolygons >= this.config.maxPolygonsBeforeOptimization ||
      this.metrics.frameRate < this.config.targetFrameRate ||
      this.metrics.complexPolygons > 3
    )
  }

  /**
   * Check if performance mode should be activated
   */
  shouldActivatePerformanceMode(): boolean {
    return (
      this.metrics.totalPolygons >= this.config.performanceModeThreshold ||
      this.metrics.frameRate < 20 ||
      this.metrics.complexPolygons > 5
    )
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = []

    if (this.metrics.totalPolygons > 10) {
      recommendations.push('Consider using polygon simplification')
    }

    if (this.metrics.frameRate < 30) {
      recommendations.push('Enable performance mode for smoother interaction')
    }

    if (this.metrics.complexPolygons > 3) {
      recommendations.push('Cache complex polygons to improve rendering')
    }

    if (this.metrics.averagePoints > 50) {
      recommendations.push('Reduce polygon detail for better performance')
    }

    return recommendations
  }

  /**
   * Get performance status for UI display
   */
  getPerformanceStatus(): 'good' | 'warning' | 'critical' {
    if (this.metrics.frameRate < 15 || this.metrics.totalPolygons > 20) {
      return 'critical'
    } else if (this.metrics.frameRate < 30 || this.metrics.totalPolygons > 10) {
      return 'warning'
    }
    return 'good'
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * Get current configuration
   */
  getConfig(): PerformanceConfig {
    return { ...this.config }
  }

  /**
   * Set performance mode status
   */
  setPerformanceMode(active: boolean): void {
    this.metrics.performanceModeActive = active
  }

  /**
   * Log performance summary to console
   */
  logPerformanceSummary(): void {
    const status = this.getPerformanceStatus()
    const recommendations = this.getRecommendations()
    
    console.group('🎯 Polygon Performance Summary')
    console.log(`Status: ${status.toUpperCase()}`)
    console.log(`Total Polygons: ${this.metrics.totalPolygons}`)
    console.log(`Complex Polygons: ${this.metrics.complexPolygons}`)
    console.log(`Average Points: ${this.metrics.averagePoints.toFixed(1)}`)
    console.log(`Frame Rate: ${this.metrics.frameRate.toFixed(1)} FPS`)
    console.log(`Performance Mode: ${this.metrics.performanceModeActive ? 'ON' : 'OFF'}`)
    
    if (recommendations.length > 0) {
      console.log('Recommendations:')
      recommendations.forEach(rec => console.log(`  • ${rec}`))
    }
    console.groupEnd()
  }

  /**
   * Create a visual performance indicator
   */
  createPerformanceIndicator(): HTMLElement {
    const indicator = document.createElement('div')
    const status = this.getPerformanceStatus()
    
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      z-index: 1000;
      pointer-events: none;
      background: ${status === 'good' ? '#4ade80' : status === 'warning' ? '#fbbf24' : '#ef4444'};
      color: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `
    
    indicator.textContent = `${this.metrics.totalPolygons} polygons | ${this.metrics.frameRate.toFixed(0)} FPS`
    
    return indicator
  }
}

export const polygonPerformanceMonitor = new PolygonPerformanceMonitor()
export type { PerformanceMetrics, PerformanceConfig }
