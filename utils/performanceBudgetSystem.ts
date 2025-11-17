/**
 * Performance Budget System
 * Automatically adjusts rendering quality based on scene complexity
 */

export interface PerformanceBudget {
  strokeWidth: number
  shadowEnabled: boolean
  tension: number
  perfectDrawEnabled: boolean
  hitStrokeWidth: number
  dashEnabled: boolean
  fillOpacity: number
}

export interface PerformanceThresholds {
  light: number        // 0-8 annotations
  medium: number       // 8-15 annotations  
  heavy: number        // 15-25 annotations
  critical: number     // 25+ annotations
}

export interface SceneComplexity {
  totalAnnotations: number
  complexPolygons: number    // Polygons with >20 points
  averagePointCount: number
  isZooming: boolean
  isDragging: boolean
}

export type PerformanceLevel = 'optimal' | 'good' | 'reduced' | 'minimal'

class PerformanceBudgetManager {
  private thresholds: PerformanceThresholds = {
    light: 8,
    medium: 15, 
    heavy: 25,
    critical: 40
  }

  private budgets: Record<PerformanceLevel, PerformanceBudget> = {
    optimal: {
      strokeWidth: 1.0,
      shadowEnabled: true,
      tension: 0.3,
      perfectDrawEnabled: true,
      hitStrokeWidth: 0,
      dashEnabled: false,
      fillOpacity: 0.1
    },
    good: {
      strokeWidth: 1.0,
      shadowEnabled: true,
      tension: 0.2,
      perfectDrawEnabled: false,
      hitStrokeWidth: 4,
      dashEnabled: false,
      fillOpacity: 0.08
    },
    reduced: {
      strokeWidth: 0.8,
      shadowEnabled: false,
      tension: 0.1,
      perfectDrawEnabled: false,
      hitStrokeWidth: 6,
      dashEnabled: true,
      fillOpacity: 0.05
    },
    minimal: {
      strokeWidth: 0.6,
      shadowEnabled: false,
      tension: 0.05,
      perfectDrawEnabled: false,
      hitStrokeWidth: 8,
      dashEnabled: true,
      fillOpacity: 0.02
    }
  }

  /**
   * Determine performance level based on scene complexity
   */
  getPerformanceLevel(complexity: SceneComplexity): PerformanceLevel {
    const { totalAnnotations, complexPolygons, averagePointCount, isZooming, isDragging } = complexity

    // Calculate complexity score
    let complexityScore = totalAnnotations
    complexityScore += complexPolygons * 2 // Complex polygons have higher weight
    complexityScore += Math.floor(averagePointCount / 10) // Point density factor
    
    // Temporary performance reduction during interactions
    if (isZooming || isDragging) {
      complexityScore *= 1.5
    }

    // Determine performance level based on complexity
    if (complexityScore <= this.thresholds.light) {
      return 'optimal'
    } else if (complexityScore <= this.thresholds.medium) {
      return 'good'  
    } else if (complexityScore <= this.thresholds.heavy) {
      return 'reduced'
    } else {
      return 'minimal'
    }
  }

  /**
   * Get performance budget for the current scene complexity
   */
  getBudget(complexity: SceneComplexity): PerformanceBudget {
    const level = this.getPerformanceLevel(complexity)
    return { ...this.budgets[level] }
  }

  /**
   * Apply performance budget to polygon/freehand configuration
   */
  applyBudgetToPolygon(
    config: any, 
    complexity: SceneComplexity,
    isSelected: boolean,
    isHovered: boolean,
    baseStrokeWidth: number = 2
  ): any {
    const budget = this.getBudget(complexity)
    const level = this.getPerformanceLevel(complexity)
    
    // Apply budget adjustments
    config.strokeWidth = Math.max(1, baseStrokeWidth * budget.strokeWidth)
    config.shadowEnabled = budget.shadowEnabled && (isSelected || level === 'optimal')
    config.perfectDrawEnabled = budget.perfectDrawEnabled
    config.hitStrokeWidth = budget.hitStrokeWidth

    // Apply tension for smooth curves (only for freehand/polygon)
    if ('tension' in config) {
      config.tension = budget.tension
    }

    // Apply dash for non-selected annotations in reduced performance
    if (!isSelected && budget.dashEnabled) {
      config.dash = [3, 3]
    }

    // Reduce fill opacity for better performance
    if (config.fill && config.fill.includes('rgba')) {
      // Extract and modify opacity
      config.fill = config.fill.replace(/,\s*[\d.]+\)/, `, ${budget.fillOpacity})`)
    }

    return config
  }

  /**
   * Apply performance budget to basic shapes (rectangle, circle, dot, line)
   */
  applyBudgetToBasicShape(
    config: any,
    complexity: SceneComplexity,
    isSelected: boolean,
    baseStrokeWidth: number = 2
  ): any {
    const budget = this.getBudget(complexity)
    const level = this.getPerformanceLevel(complexity)

    // Apply budget adjustments for basic shapes
    config.strokeWidth = Math.max(1, baseStrokeWidth * budget.strokeWidth)
    config.shadowEnabled = budget.shadowEnabled && (isSelected || level === 'optimal')
    config.perfectDrawEnabled = budget.perfectDrawEnabled

    // Reduce fill opacity for better performance
    if (config.fill && config.fill.includes('rgba')) {
      config.fill = config.fill.replace(/,\s*[\d.]+\)/, `, ${budget.fillOpacity})`)
    }

    return config
  }

  /**
   * Get performance recommendations as text
   */
  getPerformanceRecommendations(complexity: SceneComplexity): string[] {
    const level = this.getPerformanceLevel(complexity)
    const recommendations: string[] = []

    switch (level) {
      case 'optimal':
        recommendations.push('Performance is optimal')
        break
      case 'good':
        recommendations.push('Good performance with minor optimizations')
        break
      case 'reduced':
        recommendations.push('Performance optimizations active')
        recommendations.push('Some visual quality reduced for smoother interaction')
        break
      case 'minimal':
        recommendations.push('Aggressive performance mode active')
        recommendations.push('Consider simplifying complex polygons')
        recommendations.push('Visual quality significantly reduced')
        break
    }

    if (complexity.complexPolygons > 5) {
      recommendations.push('Consider using polygon simplification')
    }

    if (complexity.averagePointCount > 50) {
      recommendations.push('High polygon complexity detected')
    }

    return recommendations
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(complexity: SceneComplexity) {
    const level = this.getPerformanceLevel(complexity)
    const budget = this.getBudget(complexity)
    
    return {
      level,
      budget,
      complexityScore: complexity.totalAnnotations + (complexity.complexPolygons * 2),
      thresholds: this.thresholds,
      recommendations: this.getPerformanceRecommendations(complexity)
    }
  }
}

// Global singleton instance
export const performanceBudgetManager = new PerformanceBudgetManager()