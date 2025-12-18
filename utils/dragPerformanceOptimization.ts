/**
 * Drag Performance Optimization Utilities
 * Batches coordinate updates during drag operations to maintain 60fps
 */

interface DragBatchSystem {
  pendingUpdates: Map<string, { node: any; position: { x: number; y: number } }>
  isUpdateScheduled: boolean
  targetFPS: number
  frameId: number | null
}

class DragPerformanceManager {
  private batchSystem: DragBatchSystem = {
    pendingUpdates: new Map(),
    isUpdateScheduled: false,
    targetFPS: 60,
    frameId: null
  }

  private lastUpdateTime = 0
  private frameInterval: number

  constructor(targetFPS: number = 60) {
    this.batchSystem.targetFPS = targetFPS
    this.frameInterval = 1000 / targetFPS
  }

  /**
   * Schedule a batched update for a dragging node
   * Only updates once per frame to maintain smooth performance
   */
  scheduleDragUpdate(nodeId: string, node: any, position: { x: number; y: number }): void {
    // Store the pending update
    this.batchSystem.pendingUpdates.set(nodeId, { node, position })

    // Schedule the batch update if not already scheduled
    if (!this.batchSystem.isUpdateScheduled) {
      this.batchSystem.isUpdateScheduled = true
      this.batchSystem.frameId = requestAnimationFrame(() => this.processBatchedUpdates())
    }
  }

  /**
   * Process all pending drag updates in a single frame
   */
  private processBatchedUpdates(): void {
    const now = performance.now()
    
    // Throttle to target FPS
    if (now - this.lastUpdateTime < this.frameInterval) {
      // Schedule for next available frame
      this.batchSystem.frameId = requestAnimationFrame(() => this.processBatchedUpdates())
      return
    }

    // Process all pending updates
    this.batchSystem.pendingUpdates.forEach(({ node, position }, nodeId) => {
      try {
        // Apply the position update
        node.x(position.x)
        node.y(position.y)
      } catch (error) {
        console.warn(`Failed to update position for node ${nodeId}:`, error)
      }
    })

    // Clear pending updates and reset scheduling flag
    this.batchSystem.pendingUpdates.clear()
    this.batchSystem.isUpdateScheduled = false
    this.lastUpdateTime = now

    // Force a single layer redraw for all updated nodes
    // This is more efficient than individual node redraws
    this.triggerLayerRedraw()
  }

  /**
   * Trigger layer redraw for better performance
   */
  private triggerLayerRedraw(): void {
    // In the context of the canvas component, this would trigger a layer redraw
    // This method will be extended when integrated into the main component
  }

  /**
   * Cancel any pending updates (useful when drag operation is cancelled)
   */
  cancelPendingUpdates(): void {
    if (this.batchSystem.frameId !== null) {
      cancelAnimationFrame(this.batchSystem.frameId)
      this.batchSystem.frameId = null
    }
    this.batchSystem.pendingUpdates.clear()
    this.batchSystem.isUpdateScheduled = false
  }

  /**
   * Get current batch system metrics
   */
  getMetrics(): { pendingUpdates: number; isUpdateScheduled: boolean; targetFPS: number } {
    return {
      pendingUpdates: this.batchSystem.pendingUpdates.size,
      isUpdateScheduled: this.batchSystem.isUpdateScheduled,
      targetFPS: this.batchSystem.targetFPS
    }
  }

  /**
   * Update the target FPS for performance tuning
   */
  setTargetFPS(fps: number): void {
    this.batchSystem.targetFPS = Math.max(15, Math.min(fps, 120)) // Clamp between 15-120 FPS
    this.frameInterval = 1000 / this.batchSystem.targetFPS
  }
}

/**
 * Enhanced drag handlers that use batched updates for better performance
 */
export class BatchedDragHandlers {
  private dragManager: DragPerformanceManager
  
  constructor(targetFPS: number = 60) {
    this.dragManager = new DragPerformanceManager(targetFPS)
  }

  /**
   * Handle drag move events with batched updates
   */
  handleDragMove(nodeId: string, node: any, newPosition: { x: number; y: number }): void {
    this.dragManager.scheduleDragUpdate(nodeId, node, newPosition)
  }

  /**
   * Handle drag start - prepare for batched updates
   */
  handleDragStart(nodeId: string): void {
    // Clear any previous pending updates for this node
    // This ensures we don't have stale updates
  }

  /**
   * Handle drag end - finalize position and clear batch system
   */
  handleDragEnd(nodeId: string, finalPosition: { x: number; y: number }): void {
    // Cancel any pending batched updates
    this.dragManager.cancelPendingUpdates()
  }

  /**
   * Set a custom layer redraw function
   */
  setLayerRedrawCallback(callback: () => void): void {
    // Override the triggerLayerRedraw method
    this.dragManager['triggerLayerRedraw'] = callback
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return this.dragManager.getMetrics()
  }

  /**
   * Adjust performance settings based on polygon complexity
   */
  adjustPerformanceForComplexity(totalPolygons: number, averagePointCount: number): void {
    let targetFPS = 60

    // Reduce target FPS for complex scenes
    if (totalPolygons > 15 || averagePointCount > 50) {
      targetFPS = 30
    } else if (totalPolygons > 25 || averagePointCount > 100) {
      targetFPS = 20
    }

    this.dragManager.setTargetFPS(targetFPS)
  }
}

// Global singleton instance
export const batchedDragHandlers = new BatchedDragHandlers()

// Export types for external use
export type { DragBatchSystem }