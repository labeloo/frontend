import type { CanvasAnnotation } from '~/components/annotation/types'
import { slidingBufferOptimizer } from '~/utils/slidingBufferOptimization'
import { workerManager } from '~/utils/polygonWorkerManager'

interface AnnotationLifecycleOptions {
  // Reactive refs that need to be reset
  currentAnnotation: Ref<CanvasAnnotation | null>
  currentPath: Ref<{ x: number; y: number }[]>
  startPoint: Ref<{ x: number; y: number } | null>
  isDrawing: Ref<boolean>
  isDrawingPolygon: Ref<boolean>
  mousePosition: Ref<{ x: number; y: number } | null>
  
  // Emit function for events
  emit: (event: string, ...args: any[]) => void
  
  // Props for class handling
  classes?: string[]
}

export const useAnnotationLifecycle = (options: AnnotationLifecycleOptions) => {
  const {
    currentAnnotation,
    currentPath,
    startPoint,
    isDrawing,
    isDrawingPolygon,
    mousePosition,
    emit,
    classes
  } = options

  /**
   * Complete an annotation and emit the completion event
   * Resets all annotation-related state
   */
  const completeAnnotation = (annotation: CanvasAnnotation) => {
    emit('annotation-completed', annotation)
    emit('update:isAnnotating', false)
    resetAnnotationState()
  }

  /**
   * Complete a polygon annotation with special handling for class selection
   * Handles both class selection and direct completion
   * Uses Web Worker for complex polygon simplification
   */
  const completePolygon = async () => {
    if (currentAnnotation.value && currentAnnotation.value.points) {
      // For freehand annotations, use Web Worker for complex polygons
      if (currentAnnotation.value.type === 'freehand') {
        const pointCount = slidingBufferOptimizer.getStatus().totalPoints
        
        if (pointCount > 50) {
          // Use Web Worker for complex polygons
          try {
            const optimizedPoints = await slidingBufferOptimizer.getOptimizedCompletePolygonAsync(2.0, true)
            console.log(`🔧 Web Worker optimized freehand: ${pointCount} → ${optimizedPoints.length/2} points`)
            
            // Convert flat points to coordinate objects
            const finalPoints: { x: number; y: number }[] = []
            for (let i = 0; i < optimizedPoints.length - 1; i += 2) {
              const x = optimizedPoints[i]
              const y = optimizedPoints[i + 1]
              if (x !== undefined && y !== undefined) {
                // Note: These are already canvas coordinates, need conversion if required
                finalPoints.push({ x, y })
              }
            }
            
            // Update the annotation with optimized points
            currentAnnotation.value.points = finalPoints
          } catch (error) {
            console.warn('🔧 Web Worker optimization failed, using original points:', error)
          }
        }
        
        // Get final optimization statistics
        const bufferInfo = slidingBufferOptimizer.getBufferInfo()
        console.log(`📊 Freehand completion stats:`, bufferInfo)
        
        // Reset the sliding buffer
        slidingBufferOptimizer.reset()
      }
      
      if (classes && classes.length > 0) {
        // Calculate center point for class selector positioning
        const centerX = currentPath.value.reduce((sum, p) => sum + p.x, 0) / currentPath.value.length
        const centerY = currentPath.value.reduce((sum, p) => sum + p.y, 0) / currentPath.value.length
        emit('show-class-selector', currentAnnotation.value, { x: centerX, y: centerY })
      } else {
        // Complete without class selection
        completeAnnotation(currentAnnotation.value)
      }
    }
    
    // Always reset polygon-specific state
    emit('update:isAnnotating', false)
    isDrawingPolygon.value = false
  }

  /**
   * Complete the current annotation with an optional class name
   * Used when a class is selected from the class selector
   */
  const completeCurrentAnnotation = (className?: string) => {
    if (currentAnnotation.value) {
      if (className) {
        currentAnnotation.value.className = className
      }
      completeAnnotation(currentAnnotation.value)
    }
  }

  /**
   * Cancel the current annotation and reset all state
   * Used when user wants to abort the current annotation
   */
  const cancelCurrentAnnotation = () => {
    resetAnnotationState()
    emit('update:isAnnotating', false)
  }

  /**
   * Reset all annotation-related reactive state
   * Centralized state reset for consistency
   */
  const resetAnnotationState = () => {
    currentAnnotation.value = null
    currentPath.value = []
    startPoint.value = null
    isDrawing.value = false
    isDrawingPolygon.value = false
    mousePosition.value = null
  }

  /**
   * Start a new annotation of the specified type
   * Sets up initial state for annotation creation
   */
  const startAnnotation = (type: CanvasAnnotation['type'], initialPoint: { x: number; y: number }) => {
    resetAnnotationState()
    
    startPoint.value = initialPoint // This will be set by the component if needed
    
    // Initialize annotation based on type
    switch (type) {
      case 'rectangle':
        currentAnnotation.value = {
          type: 'rectangle',
          startPoint: initialPoint,
          width: 0,
          height: 0
        }
        isDrawing.value = true
        break
      case 'polygon':
        isDrawingPolygon.value = true
        currentAnnotation.value = {
          type: 'polygon',
          points: [initialPoint]
        }
        break
      case 'line':
        currentAnnotation.value = {
          type: 'line',
          startPoint: initialPoint,
          endPoint: initialPoint
        }
        isDrawing.value = true
        break
      case 'circle':
        currentAnnotation.value = {
          type: 'circle',
          center: initialPoint,
          radius: 0
        }
        isDrawing.value = true
        break
      case 'freehand':
        currentAnnotation.value = {
          type: 'freehand',
          points: [initialPoint]
        }
        isDrawing.value = true
        break
      case 'dot':
        currentAnnotation.value = {
          type: 'dot',
          center: initialPoint,
          radius: 5
        }
        break
    }
    
    emit('update:isAnnotating', true)
  }

  /**
   * Check if an annotation is currently in progress
   */
  const isAnnotationInProgress = computed(() => {
    return currentAnnotation.value !== null || isDrawing.value || isDrawingPolygon.value
  })

  /**
   * Get the current annotation type if one is in progress
   */
  const currentAnnotationType = computed(() => {
    return currentAnnotation.value?.type || null
  })

  return {
    // Core lifecycle methods
    completeAnnotation,
    completePolygon,
    completeCurrentAnnotation,
    cancelCurrentAnnotation,
    
    // State management
    resetAnnotationState,
    startAnnotation,
    
    // Computed state
    isAnnotationInProgress,
    currentAnnotationType
  }
}
