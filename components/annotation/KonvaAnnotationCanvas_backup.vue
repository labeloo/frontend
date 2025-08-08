<template>
  <div class="w-full h-full flex items-center justify-center">
    <ClientOnly>
      <div ref="stageContainer" class="relative border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
        <!-- Performance Indicator -->
        <div 
          v-if="isPerformanceMode" 
          class="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold z-10 pointer-events-none"
        >
          PERFORMANCE MODE
        </div>
        
        <!-- Sliding Buffer Status -->
        <div 
          v-if="props.currentTool === 'freehand' && isDrawingNonReactive" 
          class="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-mono z-10 pointer-events-none"
        >
          Buffer: {{ getBufferStatus() }}
        </div>
        
        <v-stage
          ref="stage"
          :config="stageConfig"
          @mousedown="handleStageMouseDown"
          @mousemove="handleStageMouseMove"
          @mouseup="handleStageMouseUp"
          @click="handleStageClick"
          @dblclick="handleStageDoubleClick"
          @wheel="handleStageWheel"
          @dragstart="handleStageDragStart"
          @dragend="handleStageDragEnd"
          @keydown="handleStageKeyDown"
          tabindex="0"
        >
        <!-- Background layer for image -->
        <v-layer ref="imageLayer">
          <!-- Always visible test rectangle to verify Konva is working -->
          <v-rect 
            :config="{ 
              x: 50, 
              y: 50, 
              width: 100, 
              height: 100, 
              fill: 'blue', 
              opacity: 0.5 
            }" 
          />
          
          <!-- Debug info -->
          <v-text 
            v-if="!imageObj" 
            :config="{ 
              text: 'No image object - Loading...', 
              x: 10, 
              y: 10, 
              fontSize: 16, 
              fill: 'red' 
            }" 
          />
          <v-text 
            v-if="imageObj && originalImageSize.width === 0" 
            :config="{ 
              text: 'Image object exists but no size', 
              x: 10, 
              y: 30, 
              fontSize: 16, 
              fill: 'orange' 
            }" 
          />
          <v-text 
            v-if="imageObj && originalImageSize.width > 0" 
            :config="{ 
              text: `Image loaded: ${originalImageSize.width}x${originalImageSize.height}`, 
              x: 10, 
              y: 50, 
              fontSize: 16, 
              fill: 'green' 
            }" 
          />
          <v-image
            v-if="imageObj"
            :config="imageConfig"
          />
        </v-layer>
        
        <!-- Static layer for completed annotations (NEVER redraws during real-time drawing) -->
        <v-layer ref="staticLayer">
          <!-- Completed annotations from props.annotations - uses memoized annotationConfigs -->
          <template v-for="(annotation, index) in props.annotations" :key="`annotation-${index}`">
            <!-- Rectangle annotations -->
            <v-rect
              v-if="annotation.type === 'rectangle'"
              :ref="(el: any) => { if (el) annotationRefs[`rect-${index}`] = el.getNode() }"
              :config="annotationConfigs[index]?.config || getRectConfig(annotation, index)"
              @transformend="handleTransformEnd(index, $event)"
              @dragstart="handleDragStart(index, $event)"
              @dragend="handleDragEnd(index, $event)"
              @click="handleAnnotationClick(index, $event)"
              @mouseover="handleAnnotationMouseOver(index)"
              @mouseout="handleAnnotationMouseOut(index)"
            />
            
            <!-- Polygon annotations -->
            <v-line
              v-if="annotation.type === 'polygon'"
              :ref="(el: any) => { if (el) annotationRefs[`polygon-${index}`] = el.getNode() }"
              :config="annotationConfigs[index]?.config || getPolygonConfig(annotation, index)"
              @transformend="handleTransformEnd(index, $event)"
              @dragstart="handleDragStart(index, $event)"
              @dragend="handleDragEnd(index, $event)"
              @click="handleAnnotationClick(index, $event)"
              @mouseover="handleAnnotationMouseOver(index)"
              @mouseout="handleAnnotationMouseOut(index)"
            />
            
            <!-- Pretty vertex dots for selected polygon (expensive styles only for selected) -->
            <!-- TODO: Implement getCompletedVertexConfig function -->
            <!--
            <template v-if="annotation.type === 'polygon' && selectedAnnotationIndex === index && annotation.points">
              <v-circle
                v-for="(point, pointIndex) in annotation.points"
                :key="`vertex-${index}-${pointIndex}`"
                :config="getCompletedVertexConfig(point, pointIndex, annotation.points.length)"
              />
            </template>
            -->
            
            <!-- Dot annotations -->
            <v-circle
              v-if="annotation.type === 'dot'"
              :ref="(el: any) => { if (el) annotationRefs[`dot-${index}`] = el.getNode() }"
              :config="annotationConfigs[index]?.config || getDotConfig(annotation, index)"
              @transformend="handleTransformEnd(index, $event)"
              @dragstart="handleDragStart(index, $event)"
              @dragend="handleDragEnd(index, $event)"
              @click="handleAnnotationClick(index, $event)"
              @mouseover="handleAnnotationMouseOver(index)"
              @mouseout="handleAnnotationMouseOut(index)"
            />
            
            <!-- Line annotations -->
            <v-line
              v-if="annotation.type === 'line'"
              :ref="(el: any) => { if (el) annotationRefs[`line-${index}`] = el.getNode() }"
              :config="annotationConfigs[index]?.config || getLineConfig(annotation, index)"
              @transformend="handleTransformEnd(index, $event)"
              @dragstart="handleDragStart(index, $event)"
              @dragend="handleDragEnd(index, $event)"
              @click="handleAnnotationClick(index, $event)"
              @mouseover="handleAnnotationMouseOver(index)"
              @mouseout="handleAnnotationMouseOut(index)"
            />
            
            <!-- Circle annotations -->
            <v-circle
              v-if="annotation.type === 'circle'"
              :ref="(el: any) => { if (el) annotationRefs[`circle-${index}`] = el.getNode() }"
              :config="annotationConfigs[index]?.config || getCircleConfig(annotation, index)"
              @transformend="handleTransformEnd(index, $event)"
              @dragstart="handleDragStart(index, $event)"
              @dragend="handleDragEnd(index, $event)"
              @click="handleAnnotationClick(index, $event)"
              @mouseover="handleAnnotationMouseOver(index)"
              @mouseout="handleAnnotationMouseOut(index)"
            />
            
            <!-- Freehand annotations -->
            <v-line
              v-if="annotation.type === 'freehand'"
              :ref="(el: any) => { if (el) annotationRefs[`freehand-${index}`] = el.getNode() }"
              :config="annotationConfigs[index]?.config || getFreehandConfig(annotation, index)"
              @transformend="handleTransformEnd(index, $event)"
              @dragstart="handleDragStart(index, $event)"
              @dragend="handleDragEnd(index, $event)"
              @click="handleAnnotationClick(index, $event)"
              @mouseover="handleAnnotationMouseOver(index)"
              @mouseout="handleAnnotationMouseOut(index)"
            />
            
            <!-- Pretty vertex dots for selected freehand (expensive styles only for selected) -->
            <!-- TODO: Implement getCompletedVertexConfig function -->
            <!--
            <template v-if="annotation.type === 'freehand' && selectedAnnotationIndex === index && annotation.points">
              <v-circle
                v-for="(point, pointIndex) in annotation.points"
                :key="`freehand-vertex-${index}-${pointIndex}`"
                :config="getCompletedVertexConfig(point, pointIndex, annotation.points.length)"
              />
            </template>
            -->
            
            <!-- Class labels -->
            <v-text
              v-if="annotation.className"
              :config="getLabelConfig(annotation, index)"
            />
          </template>
        </v-layer>
        <!-- Ghost annotationLayer removed for INP performance optimization -->
        
        <!-- Active drawing layer for high-performance real-time drawing (ONLY for currentShapeNode) -->
        <v-layer ref="activeLayer">
          <!-- This layer ONLY contains currentShapeNode during non-reactive drawing -->
          <!-- All content is managed directly via Konva API for maximum performance -->
          <!-- Calling batchDraw() on this layer ONLY redraws the single temporary shape -->
        </v-layer>
      </v-stage>
      
      <!-- Annotation Tools Overlay -->
      <div 
        v-if="showAnnotationTools && annotationToolsPosition"
        class="absolute bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 flex space-x-2 z-10 transition-opacity duration-200 border border-gray-200 dark:border-gray-600"
        :style="{
          left: `${annotationToolsPosition.x}px`,
          top: `${annotationToolsPosition.y}px`,
        }"
      >
        <button
          @click="editAnnotation"
          class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500 transition-colors"
          title="Edit"
        >
          <UIcon name="i-heroicons-pencil" class="w-5 h-5" />
        </button>
        <button
          @click="deleteAnnotation"
          class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500 transition-colors"
          title="Delete"
        >
          <UIcon name="i-heroicons-trash" class="w-5 h-5" />
        </button>
        <button
          @click="duplicateAnnotation"
          class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-green-500 transition-colors"
          title="Duplicate"
        >
          <UIcon name="i-heroicons-document-duplicate" class="w-5 h-5" />
        </button>
      </div>
      
      <!-- Performance Mode Indicator -->
      <div 
        v-if="isPerformanceMode"
        class="absolute top-4 right-4 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium z-20 flex items-center space-x-2"
      >
        <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <span>Performance Mode</span>
      </div>
      
      <!-- Debug Info for Polygon Optimizations (development mode) -->
      <div 
        v-if="isDevelopmentMode"
        class="absolute top-4 left-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded text-xs z-20 space-y-1"
      >
        <div>Zoom: {{ stageScale.toFixed(2) }}x</div>
        <div>Polygons: {{ polygonCount }}</div>
        <div>Complex: {{ complexPolygonCount }}</div>
        <div v-if="isPerformanceMode" class="text-orange-300">⚡ Performance Mode</div>
      </div>
    </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
/**
 * PERFORMANCE OPTIMIZATIONS APPLIED:
 * 
 * 1. Dual-Path Drawing Architecture:
 *    - High-frequency polygon/freehand drawing uses direct Konva node manipulation (non-reactive)
 *    - Low-frequency tools (rectangle, circle, line) use Vue reactivity for simplicity
 * 
 * 2. Non-reactive Drawing State:
 *    - isDrawingNonReactive: shallowRef for template access without deep reactivity
 *    - currentShapeNode: Raw Konva node reference for direct updates
 * 
 * 3. Active Layer Strategy:
 *    - Dedicated activeLayer for real-time drawing prevents interference with existing annotations
 *    - Direct batchDraw() calls avoid Vue's change detection overhead
 * 
 * 4. Optimized Mouse Handlers:
 *    - mousemove handler has ultra-lean path for polygon/freehand (bypasses Vue reactivity)
 *    - Direct points array updates on Konva nodes for 60fps+ performance
 *    - Sliding buffer optimization for freehand drawing with reduced Vue state updates
 * 
 * 5. Smart Cleanup:
 *    - Automatic cleanup of non-reactive state on tool changes and component unmount
 *    - Temporary shapes destroyed before final annotation completion
 *    - finishDrawing() function bridges imperative drawing to reactive state
 *    - Keyboard shortcuts: Enter to finish, Escape to cancel drawing
 */
import { useRectConfig } from '~/composables/useRectConfig';
import { usePolygonConfig } from '~/composables/usePolygonConfig';
import { useCircleConfig } from '~/composables/useCircleConfig';
import { useLineConfig } from '~/composables/useLineConfig';
import { useFreehandConfig } from '~/composables/useFreehandConfig';
import { useAnnotationLifecycle } from '~/composables/useAnnotationLifecycle';
import { useAnnotationDragHandlers } from '~/composables/useAnnotationDragHandlers';
import { useAnnotationTransformHandlers } from '~/composables/useAnnotationTransformHandlers';
import { slidingBufferOptimizer, PerformancePresets } from '~/utils/slidingBufferOptimization';
import { polygonPerformanceMonitor } from '~/utils/polygonPerformanceMonitor';
import { workerManager } from '~/utils/polygonWorkerManager';
import type { CanvasAnnotation } from './types'

// Remove direct Konva import to avoid SSR issues
// Konva will be available through vue-konva plugin

interface Props {
  imageUrl: string
  annotations: CanvasAnnotation[]
  currentTool: string
  isAnnotating: boolean
  classes?: string[]
  canvasWidth?: number
  canvasHeight?: number
}

interface Emits {
  (e: 'update:annotations', annotations: CanvasAnnotation[]): void
  (e: 'update:isAnnotating', isAnnotating: boolean): void
  (e: 'annotation-completed', annotation: CanvasAnnotation): void
  (e: 'annotation-updated', annotation: CanvasAnnotation, index: number): void
  (e: 'annotation-deleted', index: number): void
  (e: 'show-class-selector', annotation: CanvasAnnotation, position: { x: number; y: number }): void
}

const props = withDefaults(defineProps<Props>(), {
  canvasWidth: 800,
  canvasHeight: 600,
  classes: () => []
})

const emit = defineEmits<Emits>()

// Refs
const stage = ref<any>(null)
const stageContainer = ref<HTMLElement | null>(null)
const imageLayer = ref<any>(null)
const staticLayer = ref<any>(null)
// Removed annotationLayer ref for INP performance optimization
const activeLayer = ref<any>(null)

// Non-reactive drawing state for high-performance drawing
// Using shallowRef to avoid deep reactivity while still allowing template access
const isDrawingNonReactive = shallowRef(false)
let currentShapeNode: any = null

// Imperative drawing state (non-reactive)
let startPointImperative: { x: number; y: number } | null = null
let currentPathImperative: { x: number; y: number }[] = []
let mousePositionImperative: { x: number; y: number } | null = null

// Two-shape illusion strategy for polygon drawing (ULTRA PERFORMANCE)
let pathNode: any = null      // Completed polygon segments (immutable during mousemove)
let ghostLineNode: any = null // Active segment following mouse (only this updates on mousemove)
let vertexGroup: any = null   // Group containing vertex dots for visual feedback

// Performance-optimized transformer instance (non-reactive)
let transformerInstance: any = null

// Initialize the transformer instance once on mount (PERFORMANCE OPTIMIZATION)
const initializeTransformer = () => {
  if (!activeLayer.value || transformerInstance || !process.client) return
  
  const Konva = (window as any).Konva
  if (!Konva) return
  
  // PERFORMANCE: Create transformer instance only once, never destroy/recreate
  transformerInstance = new Konva.Transformer({
    enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center', 'middle-left', 'middle-right'],
    rotateEnabled: false,
    anchorStroke: '#4285f4',
    anchorFill: '#ffffff',
    anchorStrokeWidth: 2,
    anchorSize: 8,
    borderStroke: '#4285f4',
    borderStrokeWidth: 2,
    borderDash: [3, 3],
    keepRatio: false,
    centeredScaling: false,
    // Constrain transformer boundaries to image bounds
    boundBoxFunc: (oldBox: any, newBox: any) => {
      // Convert to original coordinates for bounds checking
      const newBoxOriginal = {
        x: (newBox.x - imageOffset.value.x) / imageScale.value,
        y: (newBox.y - imageOffset.value.y) / imageScale.value,
        width: newBox.width / imageScale.value,
        height: newBox.height / imageScale.value
      }
      
      // Check bounds and constrain if necessary
      if (newBoxOriginal.x < 0 || newBoxOriginal.y < 0 || 
          newBoxOriginal.x + newBoxOriginal.width > originalImageSize.value.width ||
          newBoxOriginal.y + newBoxOriginal.height > originalImageSize.value.height) {
        return oldBox
      }
      
      // Ensure minimum size
      const uiScale = 1 / stageScale.value
      if (newBox.width < 10 * uiScale || newBox.height < 10 * uiScale) {
        return oldBox
      }
      
      return newBox
    }
  })
  
  // PERFORMANCE: Add to activeLayer to prevent staticLayer redraws when selection changes
  activeLayer.value.getNode().add(transformerInstance)
  
  console.log('🎯 Transformer instance initialized on activeLayer')
}

// Helper function to clean up non-reactive drawing state
const cleanupNonReactiveDrawing = () => {
  if (isDrawingNonReactive.value && currentShapeNode) {
    // Remove and destroy the temporary shape from activeLayer
    currentShapeNode.destroy()
    currentShapeNode = null
    isDrawingNonReactive.value = false
    
    // Only redraw activeLayer to remove the temporary shape
    activeLayer.value?.getNode().batchDraw()
  }
  
  // Clean up polygon two-shape illusion nodes
  if (pathNode) {
    pathNode.destroy()
    pathNode = null
  }
  if (ghostLineNode) {
    ghostLineNode.destroy()
    ghostLineNode = null
  }
  
  // Clean up vertex group and dots
  if (vertexGroup) {
    vertexGroup.destroy()
    vertexGroup = null
  }
}

// Bridge function between imperative drawing and Vue's reactive state
const finishDrawing = () => {
  // Check if we have an active non-reactive drawing session
  if (!isDrawingNonReactive.value) return
  
  let flatPoints: number[] = []
  
  // Handle polygon two-shape illusion strategy
  if (props.currentTool === 'polygon' && pathNode && ghostLineNode) {
    // Combine points from pathNode and the starting point of ghostLineNode
    const pathPoints = pathNode.points() || []
    const ghostPoints = ghostLineNode.points() || []
    
    // Get the starting point of the ghost line (first two values)
    if (ghostPoints.length >= 2) {
      flatPoints = [...pathPoints, ghostPoints[0], ghostPoints[1]]
    } else {
      flatPoints = pathPoints
    }
    
    console.log(`🎯 Polygon completed with two-shape strategy: ${flatPoints.length / 2} points`)
  } else if (currentShapeNode) {
    // Handle freehand and fallback cases
    flatPoints = currentShapeNode.points() || []
  }
  
  if (!flatPoints || flatPoints.length < 4) { // Need at least 2 points (4 values)
    cleanupNonReactiveDrawing()
    return
  }
  
  // Convert flat points array back to {x, y} objects in original coordinates
  const canvasPoints: { x: number; y: number }[] = []
  for (let i = 0; i < flatPoints.length - 1; i += 2) {
    const canvasPoint = { x: flatPoints[i]!, y: flatPoints[i + 1]! }
    canvasPoints.push(canvasPoint)
  }
  
  // Convert canvas coordinates to original image coordinates
  const originalPoints: { x: number; y: number }[] = canvasPoints.map(point => 
    canvasToOriginal(point)
  )
  
  // Create a new annotation object based on the current tool
  let newAnnotation: CanvasAnnotation
  
  if (props.currentTool === 'polygon') {
    newAnnotation = {
      type: 'polygon',
      points: originalPoints,
      className: undefined // Will be set by class selector if needed
    }
  } else if (props.currentTool === 'freehand') {
    // For freehand, get the final optimized points from sliding buffer
    const finalOptimizedPoints = slidingBufferOptimizer.complete()
    
    // Convert optimized points to original coordinates
    const optimizedOriginalPoints: { x: number; y: number }[] = []
    for (let i = 0; i < finalOptimizedPoints.length - 1; i += 2) {
      const canvasPoint = { x: finalOptimizedPoints[i]!, y: finalOptimizedPoints[i + 1]! }
      optimizedOriginalPoints.push(canvasToOriginal(canvasPoint))
    }
    
    newAnnotation = {
      type: 'freehand',
      points: optimizedOriginalPoints,
      className: undefined // Will be set by class selector if needed
    }
    
    console.log(`✅ Freehand completed: ${optimizedOriginalPoints.length} final points`)
  } else {
    // Fallback for unsupported tools
    console.warn('finishDrawing called with unsupported tool:', props.currentTool)
    cleanupNonReactiveDrawing()
    return
  }
  
  // Clean up the temporary shape node from activeLayer BEFORE adding to reactive state
  cleanupNonReactiveDrawing()
  
  // Check if we need to show class selector or complete immediately
  if (props.classes && props.classes.length > 0) {
    // Store the annotation temporarily and show class selector
    currentAnnotation.value = newAnnotation
    
    // Get current mouse position for class selector positioning
    if (stage.value) {
      const stageNode = stage.value.getNode()
      const pointer = stageNode.getPointerPosition()
      emit('show-class-selector', newAnnotation, pointer || { x: 0, y: 0 })
    } else {
      emit('show-class-selector', newAnnotation, { x: 0, y: 0 })
    }
  } else {
    // Complete annotation immediately without class
    completeAnnotation(newAnnotation)
    
    // Ensure staticLayer redraws to show the newly completed annotation
    nextTick(() => {
      if (staticLayer.value) {
        staticLayer.value.getNode().batchDraw()
      }
    })
  }
}

// Imperative annotation functions (replaces useAnnotationLifecycle composable)
const completeAnnotation = (annotation: CanvasAnnotation) => {
  // Add to annotations array via emit
  const newAnnotations = [...props.annotations, annotation]
  emit('update:annotations', newAnnotations)
  emit('annotation-completed', annotation)
  
  // Update isAnnotating state
  emit('update:isAnnotating', false)
}

const resetAnnotationState = () => {
  // Clean up all imperative state
  startPointImperative = null
  currentPathImperative = []
  mousePositionImperative = null
  
  // Clean up any temporary nodes
  cleanupNonReactiveDrawing()
}

const completeCurrentAnnotation = () => {
  // Bridge to finishDrawing for imperative model
  finishDrawing()
}

const cancelCurrentAnnotation = () => {
  // Just reset everything
  resetAnnotationState()
}

// Annotation node refs for caching
const annotationRefs = ref<Record<string, any>>({})
const currentAnnotationRefs = ref<Record<string, any>>({})

// State
const imageObj = ref<any>(null)
const imageScale = ref(1)
const imageOffset = ref({ x: 0, y: 0 })
const originalImageSize = ref({ width: 0, height: 0 })
const displayImageSize = ref({ width: 0, height: 0 })
const stageSize = ref({ width: props.canvasWidth, height: props.canvasHeight })

// Zoom state
const stageScale = ref(1)
const stagePosition = ref({ x: 0, y: 0 })
const minScale = ref(0.1)
const maxScale = ref(5)
const scaleBy = 1.05

// Annotation state - REFACTORED: Removed legacy reactive state for maximum performance
const selectedAnnotationIndex = ref<number | null>(null)
const hoveredAnnotationIndex = ref<number | null>(null)
// REMOVED: currentAnnotation, isDrawing, isDrawingPolygon, startPoint, currentPath
// All drawing operations now use non-reactive imperative model

// Drag state tracking
const isDraggingAnnotation = ref(false)

// Double-click timing state for improved polygon completion
const lastClickTime = ref(0)
const doubleClickThreshold = 250 // Reduced from default ~500ms to 250ms for faster double-click

// Polygon performance optimization state
const isZooming = ref(false)
const isDraggingStage = ref(false)
const polygonLayerVisible = ref(true)
const isPerformanceMode = ref(false)

// Debounce timers for performance optimization
let zoomDebounceTimer: number | null = null
let dragDebounceTimer: number | null = null
let cacheUpdateTimer: number | null = null

// UI state
const showAnnotationTools = ref(false)
const annotationToolsPosition = ref<{ x: number; y: number } | null>(null)

// Computed properties
const stageConfig = computed(() => ({
  width: stageSize.value.width,
  height: stageSize.value.height,
  draggable: props.currentTool === 'pan' || (props.currentTool === 'select' && selectedAnnotationIndex.value === null),
  scaleX: stageScale.value,
  scaleY: stageScale.value,
  x: stagePosition.value.x,
  y: stagePosition.value.y
}))

const imageConfig = computed(() => {
  if (!imageObj.value) {
    return {}
  }
  
  const config = {
    image: imageObj.value,
    x: imageOffset.value.x,
    y: imageOffset.value.y,
    width: displayImageSize.value.width,
    height: displayImageSize.value.height,
    listening: false // Image should not capture events
  }
  
  return config
})

// Development mode and polygon stats computed properties
const isDevelopmentMode = computed(() => process.env.NODE_ENV === 'development')

const polygonCount = computed(() => {
  return props.annotations.filter(a => a.type === 'polygon' || a.type === 'freehand').length
})

const complexPolygonCount = computed(() => {
  return props.annotations.filter(a => 
    (a.type === 'polygon' || a.type === 'freehand') && 
    a.points && 
    a.points.length > 10 // Reduced from 20 to 10 to match performance threshold
  ).length
})

// Memoized annotation configs for INP performance optimization
// Pre-computed configs prevent repetitive calculations during renders
const annotationConfigs = computed(() => {
  return props.annotations.map((annotation, index) => {
    switch (annotation.type) {
      case 'rectangle':
        return { type: 'rectangle', config: getRectConfig(annotation, index) }
      case 'polygon':
        return { type: 'polygon', config: getPolygonConfig(annotation, index) }
      case 'dot':
        return { type: 'dot', config: getDotConfig(annotation, index) }
      case 'line':
        return { type: 'line', config: getLineConfig(annotation, index) }
      case 'circle':
        return { type: 'circle', config: getCircleConfig(annotation, index) }
      case 'freehand':
        return { type: 'freehand', config: getFreehandConfig(annotation, index) }
      default:
        return { type: annotation.type, config: {} }
    }
  })
})

// Methods
const loadImage = async (url: string) => {
  return new Promise<void>((resolve, reject) => {
    const img = new Image()
    // Try without crossOrigin first for local development
    // img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      originalImageSize.value = { width: img.width, height: img.height }
      
      // Fixed canvas size approach - scale image to fit within canvas while maintaining aspect ratio
      const canvasAspect = stageSize.value.width / stageSize.value.height
      const imageAspect = img.width / img.height
      
      let targetWidth, targetHeight
      
      if (imageAspect > canvasAspect) {
        // Image is wider than canvas aspect ratio
        targetWidth = stageSize.value.width
        targetHeight = stageSize.value.width / imageAspect
      } else {
        // Image is taller than canvas aspect ratio
        targetHeight = stageSize.value.height
        targetWidth = stageSize.value.height * imageAspect
      }
      
      // Center the image in the canvas
      imageOffset.value = {
        x: (stageSize.value.width - targetWidth) / 2,
        y: (stageSize.value.height - targetHeight) / 2
      }
      
      displayImageSize.value = {
        width: targetWidth,
        height: targetHeight
      }
      
      imageScale.value = targetWidth / img.width
      
      // Use the loaded image directly for Konva
      imageObj.value = img
      
      if (imageLayer.value) {
        imageLayer.value.getNode().batchDraw()
      }
      resolve()
    }
    
    img.onerror = (error: any) => {
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

// Coordinate conversion utilities with proper canvas transformation
const canvasToOriginal = (canvasPoint: { x: number; y: number }) => {
  return {
    x: (canvasPoint.x - imageOffset.value.x) / imageScale.value,
    y: (canvasPoint.y - imageOffset.value.y) / imageScale.value
  }
}

const originalToCanvas = (point: { x: number; y: number }) => {
  return {
    x: point.x * imageScale.value + imageOffset.value.x,
    y: point.y * imageScale.value + imageOffset.value.y
  }
}

// Legacy functions for backward compatibility - now use canvas coordinates properly
const displayToOriginal = (stagePoint: { x: number; y: number }) => {
  if (!stage.value) return stagePoint
  
  const stageNode = stage.value.getNode()
  const canvasPoint = getCanvasPointerPosition(stageNode)
  
  if (!canvasPoint) {
    // Fallback to manual transformation if getCanvasPointerPosition fails
    const transform = stageNode.getAbsoluteTransform().copy().invert()
    const transformedPoint = transform.point(stagePoint)
    return canvasToOriginal(transformedPoint)
  }
  
  return canvasToOriginal(canvasPoint)
}

const originalToDisplay = (point: { x: number; y: number }) => {
  if (!stage.value) return point
  
  const canvasPoint = originalToCanvas(point)
  const stageNode = stage.value.getNode()
  const transform = stageNode.getAbsoluteTransform()
  return transform.point(canvasPoint)
}

const displaySizeToOriginal = (size: { width: number; height: number }) => ({
  width: size.width / imageScale.value,
  height: size.height / imageScale.value
})

const originalSizeToDisplay = (size: { width: number; height: number }) => ({
  width: size.width * imageScale.value,
  height: size.height * imageScale.value
})

// Helper function to cache annotation nodes for performance
const cacheAnnotationNode = (node: any, key: string) => {
  if (!node) return
  
  try {
    // Clear existing cache first
    node.clearCache()
    
    // Apply cache to improve rendering performance
    // For polygons and freehand, apply optimized caching settings
    if (key.includes('polygon') || key.includes('freehand')) {
      // Use lower quality cache for complex shapes to balance performance
      node.cache({
        pixelRatio: 1, // Use 1:1 pixel ratio for complex shapes
        imageSmoothingEnabled: false // Disable smoothing for performance
      })
    } else {
      // Use standard caching for simple shapes
      node.cache()
    }
    
    // Store reference for future cache management
    annotationRefs.value[key] = node
  } catch (error) {
    console.warn('Failed to cache annotation node:', error)
  }
}

// Helper function to invalidate and recache a node with polygon-specific optimization
const updateAnnotationCache = (node: any, key: string) => {
  if (!node) return
  
  try {
    node.clearCache()
    // Use nextTick to ensure the node is fully updated before caching
    nextTick(() => {
      // Apply optimized caching for polygons and freehand
      if (key.includes('polygon') || key.includes('freehand')) {
        node.cache({
          pixelRatio: 1,
          imageSmoothingEnabled: false
        })
      } else {
        node.cache()
      }
      annotationRefs.value[key] = node
      
      // Use efficient layer batch draw instead of stage redraw
      if (staticLayer.value) {
        staticLayer.value.getNode().batchDraw()
      }
    })
  } catch (error) {
    console.warn('Failed to update annotation cache:', error)
  }
}

// Helper function to clear all annotation caches with polygon-specific handling
const clearAllAnnotationCaches = () => {
  Object.entries(annotationRefs.value).forEach(([key, node]) => {
    if (node && typeof node.clearCache === 'function') {
      try {
        node.clearCache()
      } catch (error) {
        console.warn('Failed to clear cache:', error)
      }
    }
  })
  annotationRefs.value = {}
}

// Helper function to calculate inverse scale for UI elements to maintain visual consistency
const getUIScale = () => 1 / stageScale.value

// Performance optimization functions
const enterPerformanceMode = () => {
  isPerformanceMode.value = true
  polygonLayerVisible.value = false
  polygonPerformanceMonitor.setPerformanceMode(true)
  
  // Clear polygon caches during performance mode
  Object.entries(annotationRefs.value).forEach(([key, node]) => {
    if ((key.includes('polygon') || key.includes('freehand')) && node && typeof node.clearCache === 'function') {
      try {
        node.clearCache()
      } catch (error) {
        console.warn('Failed to clear polygon cache during performance mode:', error)
      }
    }
  })
}

const exitPerformanceMode = () => {
  isPerformanceMode.value = false
  polygonLayerVisible.value = true
  polygonPerformanceMonitor.setPerformanceMode(false)
  
  // Recache polygons after exiting performance mode
  debouncedCachePolygons()
}

const debouncedCachePolygons = () => {
  if (cacheUpdateTimer) {
    clearTimeout(cacheUpdateTimer)
  }
  
  cacheUpdateTimer = window.setTimeout(() => {
    props.annotations.forEach((annotation, index) => {
      if (annotation.type === 'polygon' || annotation.type === 'freehand') {
        const cacheKey = `${annotation.type}-${index}`
        const node = annotationRefs.value[cacheKey]
        if (node) {
          cacheAnnotationNode(node, cacheKey)
        }
      }
    })
    
    // Batch draw the static layer after caching
    if (staticLayer.value) {
      staticLayer.value.getNode().batchDraw()
    }
  }, 150) // 150ms debounce
}

// Helper function to convert pointer position to canvas coordinates
const getCanvasPointerPosition = (stageNode: any) => {
  const pointer = stageNode.getPointerPosition()
  if (!pointer) return null
  
  // Get the absolute transform and invert it to convert from screen to canvas coordinates
  const transform = stageNode.getAbsoluteTransform().copy().invert()
  return transform.point(pointer)
}

// Utility to check if a point is within the image bounds
const isPointInImageBounds = (stagePoint: { x: number; y: number }) => {
  if (!stage.value) return false
  
  const stageNode = stage.value.getNode()
  const transform = stageNode.getAbsoluteTransform().copy().invert()
  const canvasPoint = transform.point(stagePoint)
  
  return canvasPoint.x >= imageOffset.value.x &&
         canvasPoint.x <= imageOffset.value.x + displayImageSize.value.width &&
         canvasPoint.y >= imageOffset.value.y &&
         canvasPoint.y <= imageOffset.value.y + displayImageSize.value.height
}

// Annotation configuration methods with improved styling
// Use the composables for annotation configuration
const { createRectangleConfig } = useRectConfig()
const { createPolygonConfig } = usePolygonConfig()
const { createCircleConfig } = useCircleConfig()
const { createLineConfig } = useLineConfig()
const { createFreehandConfig } = useFreehandConfig()

// Use annotation drag handlers composable
const {
  handleRectangleDragEnd,
  handlePolygonDragEnd,
  handleDotDragEnd,
  handleLineDragEnd,
  handleCircleDragEnd,
  handleFreehandDragEnd
} = useAnnotationDragHandlers()

// Use annotation transform handlers composable
const { handleRectangleTransformEnd } = useAnnotationTransformHandlers()

// REFACTORED: Removed useAnnotationLifecycle composable - all drawing now uses imperative model
// Functions like completeAnnotation, resetAnnotationState now implemented directly below

const getRectConfig = (annotation: CanvasAnnotation, index: number) => {
  const baseConfig = createRectangleConfig(
    annotation,
    index,
    selectedAnnotationIndex.value,
    hoveredAnnotationIndex.value,
    originalToCanvas,
    (size: { width: number; height: number }) => ({
      width: size.width * imageScale.value,
      height: size.height * imageScale.value
    })
  )
  
  // Apply UI scaling to stroke properties
  const uiScale = getUIScale()
  return {
    ...baseConfig,
    strokeWidth: (baseConfig.strokeWidth || 2) * uiScale,
    dash: (baseConfig as any).dash ? (baseConfig as any).dash.map((d: number) => d * uiScale) : undefined
  }
}

const getPolygonConfig = (annotation: CanvasAnnotation, index: number) => {
  const baseConfig = createPolygonConfig(
    annotation,
    index,
    selectedAnnotationIndex.value,
    hoveredAnnotationIndex.value,
    originalToCanvas,
    stageScale.value, // Pass current zoom level for adaptive simplification
    !isPerformanceMode.value // Disable interaction during performance mode
  )
  
  // Return early if config is empty (invalid annotation)
  if (!baseConfig || !('points' in baseConfig)) {
    return baseConfig
  }
  
  // Apply UI scaling to stroke properties
  const uiScale = getUIScale()
  const config = {
    ...baseConfig,
    strokeWidth: (baseConfig.strokeWidth || 2) * uiScale,
    visible: polygonLayerVisible.value // Use visibility control for performance
  } as any
  
  // More aggressive performance optimizations based on total polygon count
  const totalPolygons = polygonCount.value
  const isComplex = annotation.points && annotation.points.length > 10
  
  // Apply optimizations if we have many polygons OR this is a complex polygon
  if (totalPolygons >= 8 || isComplex) { // Start optimizations at 8 total polygons
    config.perfectDrawEnabled = false
    
    // Only allow listening for selected annotation when there are many polygons
    if (totalPolygons >= 12) {
      config.listening = selectedAnnotationIndex.value === index
    } else {
      config.listening = !isPerformanceMode.value && (selectedAnnotationIndex.value === index || hoveredAnnotationIndex.value === index)
    }
    
    // Use more aggressive caching for scenes with many polygons
    if (totalPolygons >= 15) {
      config.shadowEnabled = false // Disable shadows for better performance
      config.hitStrokeWidth = 0 // Reduce hit area calculation overhead
    }
  }
  
  return config
}

const getLineConfig = (annotation: CanvasAnnotation, index: number) => {
  const baseConfig = createLineConfig(
    annotation,
    index,
    selectedAnnotationIndex.value,
    hoveredAnnotationIndex.value,
    originalToCanvas
  )
  
  // Apply UI scaling to stroke properties
  const uiScale = getUIScale()
  return {
    ...baseConfig,
    strokeWidth: (baseConfig.strokeWidth || 2) * uiScale
  }
}

const getCircleConfig = (annotation: CanvasAnnotation, index: number) => {
  const baseConfig = createCircleConfig(
    annotation,
    index,
    selectedAnnotationIndex.value,
    hoveredAnnotationIndex.value,
    originalToCanvas,
    imageScale.value
  )
  
  // Apply UI scaling to stroke properties
  const uiScale = getUIScale()
  return {
    ...baseConfig,
    strokeWidth: (baseConfig.strokeWidth || 2) * uiScale
  }
}

const getDotConfig = (annotation: CanvasAnnotation, index: number) => {
  if (!annotation.center || annotation.radius === undefined) return {}
  
  const canvasCenter = originalToCanvas(annotation.center)
  const canvasRadius = annotation.radius * imageScale.value
  const isSelected = selectedAnnotationIndex.value === index
  const isHovered = hoveredAnnotationIndex.value === index
  const uiScale = getUIScale()
  
  return {
    x: canvasCenter.x,
    y: canvasCenter.y,
    radius: canvasRadius,
    stroke: isSelected ? '#4285f4' : (isHovered ? '#34a853' : '#00c851'),
    strokeWidth: (isSelected ? 3 : (isHovered ? 2.5 : 2)) * uiScale,
    fill: isSelected ? 'rgba(66, 133, 244, 0.2)' : (isHovered ? 'rgba(52, 168, 83, 0.1)' : 'rgba(0, 200, 81, 0.1)'),
    draggable: true,
    listening: true,
    perfectDrawEnabled: false
  }
}

const getLabelConfig = (annotation: CanvasAnnotation, index: number) => {
  let position = { x: 0, y: 0 }
  const isSelected = selectedAnnotationIndex.value === index
  const uiScale = getUIScale()
  
  if (annotation.type === 'rectangle' && annotation.startPoint) {
    position = originalToCanvas(annotation.startPoint)
    position.y -= 8 * uiScale // Position above the rectangle
  } else if (annotation.type === 'polygon' && annotation.points && annotation.points.length > 0) {
    const firstPoint = annotation.points[0]
    if (firstPoint) {
      position = originalToCanvas(firstPoint)
      position.y -= 8 * uiScale
    }
  } else if (annotation.type === 'dot' && annotation.center) {
    position = originalToCanvas(annotation.center)
    position.y -= (annotation.radius || 5) * imageScale.value + 8 * uiScale
  }
  
  return {
    x: position.x,
    y: position.y,
    text: annotation.className,
    fontSize: 12 * uiScale,
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'bold',
    fill: isSelected ? '#4285f4' : '#00c851',
    stroke: '#ffffff',
    strokeWidth: 2 * uiScale,
    listening: false,
    perfectDrawEnabled: false
  }
}

// REFACTORED: Removed all legacy getCurrentXXXConfig functions
// These were used by the reactive annotation layer which has been eliminated
// All drawing now uses direct Konva node manipulation in the activeLayer

// Function to create pretty vertex dots for completed polygons (expensive styles only for selected)
const getCompletedVertexConfig = (point: { x: number; y: number }, pointIndex: number, totalPoints: number) => {
  const canvasPoint = originalToCanvas(point)
  const isFirst = pointIndex === 0
  const isLast = pointIndex === totalPoints - 1
  const uiScale = getUIScale()
  
  return {
    x: canvasPoint.x,
    y: canvasPoint.y,
    radius: 5 * uiScale,
    fill: isFirst ? '#ff4444' : (isLast ? '#44ff44' : '#ffffff'),
    stroke: '#4285f4',
    strokeWidth: 2 * uiScale,
    listening: false,
    shadowColor: 'rgba(0,0,0,0.4)',
    shadowBlur: 3 * uiScale,
    shadowOffsetY: 1 * uiScale,
    shadowOffsetX: 1 * uiScale,
    // More expensive styles only applied to selected polygons
    strokeScaleEnabled: false,
    perfectDrawEnabled: true
  }
}

// Event handlers with proper coordinate transformation
const handleStageMouseDown = (e: any) => {
  const stageNode = e.target.getStage()
  const pointer = stageNode.getPointerPosition()
  
  if (!pointer) return
  
  if (props.currentTool === 'select') {
    // Check if clicking on empty area
    const clickedOnEmpty = e.target === stageNode
    if (clickedOnEmpty) {
      selectedAnnotationIndex.value = null
      showAnnotationTools.value = false
      updateTransformer()
    }
    return
  }
  
  // Only allow annotation creation within image bounds
  if (!isPointInImageBounds(pointer)) {
    return
  }
  
  // Convert to canvas coordinates
  const transform = stageNode.getAbsoluteTransform().copy().invert()
  const canvasPos = transform.point(pointer)
  const originalPos = canvasToOriginal(canvasPos)
  
  // Handle polygon and freehand tools with direct Konva node creation for performance
  if (props.currentTool === 'polygon') {
    if (!props.isAnnotating) {
      // Start new polygon - create TWO-SHAPE ILLUSION strategy for O(1) performance
      if (activeLayer.value && process.client) {
        const Konva = (window as any).Konva
        if (Konva) {
          isDrawingNonReactive.value = true
          
          // Create pathNode for completed segments (starts with first point)
          pathNode = new Konva.Line({
            points: [canvasPos.x, canvasPos.y], // Start with first click position
            stroke: '#4285f4',
            strokeWidth: 3,
            fill: 'rgba(66, 133, 244, 0.1)',
            closed: false,
            listening: false,
            lineCap: 'round',
            lineJoin: 'round'
          })
          
          // Create ghostLineNode for active segment following mouse
          ghostLineNode = new Konva.Line({
            points: [canvasPos.x, canvasPos.y, canvasPos.x, canvasPos.y], // Two identical points at mouse position
            stroke: '#4285f4',
            strokeWidth: 3,
            fill: 'transparent',
            closed: false,
            listening: false,
            lineCap: 'round',
            lineJoin: 'round',
            dash: [5, 5] // Dashed line for visual distinction
          })
          
          // Create vertex group for dots
          vertexGroup = new Konva.Group()
          
          // Create first vertex dot
          const firstVertex = new Konva.Circle({
            x: canvasPos.x,
            y: canvasPos.y,
            radius: 4,
            fill: '#ff4444', // Red for first vertex
            stroke: '#4285f4',
            strokeWidth: 2,
            listening: false,
            shadowColor: 'rgba(0,0,0,0.3)',
            shadowBlur: 2,
            shadowOffsetY: 1
          })
          
          vertexGroup.add(firstVertex)
          
          // Add all nodes to activeLayer
          activeLayer.value.getNode().add(pathNode)
          activeLayer.value.getNode().add(ghostLineNode)
          activeLayer.value.getNode().add(vertexGroup)
          activeLayer.value.getNode().batchDraw()
          
          console.log('🎯 Started polygon with two-shape illusion strategy and vertex dots')
        }
      }
    } else {
      // Add point to existing polygon using two-shape strategy
      if (pathNode && ghostLineNode && vertexGroup) {
        // FIX PROBLEM 1: Get current pathNode points and append new click position
        const currentPathPoints = pathNode.points() || []
        const newPathPoints = [...currentPathPoints, canvasPos.x, canvasPos.y]
        pathNode.points(newPathPoints)
        
        // Update ghostLineNode to start at new position
        ghostLineNode.points([canvasPos.x, canvasPos.y, canvasPos.x, canvasPos.y])
        
        // FIX PROBLEM 2: Create new vertex dot and add to vertex group
        const vertexCount = newPathPoints.length / 2
        const newVertex = new (window as any).Konva.Circle({
          x: canvasPos.x,
          y: canvasPos.y,
          radius: 4,
          fill: '#ffffff', // White for intermediate vertices
          stroke: '#4285f4',
          strokeWidth: 2,
          listening: false,
          shadowColor: 'rgba(0,0,0,0.3)',
          shadowBlur: 2,
          shadowOffsetY: 1
        })
        
        vertexGroup.add(newVertex)
        
        // Only redraw activeLayer (all nodes are on this layer)
        activeLayer.value?.getNode().batchDraw()
        
        console.log(`🎯 Added point to polygon: ${vertexCount} vertices`)
      }
    }
    return
  }
  
  if (props.currentTool === 'freehand') {
    // Create direct Konva node for freehand drawing
    if (activeLayer.value && process.client) {
      const Konva = (window as any).Konva
      if (Konva) {
        isDrawingNonReactive.value = true
        currentShapeNode = new Konva.Line({
          points: [canvasPos.x, canvasPos.y],
          stroke: '#4285f4',
          strokeWidth: 3,
          fill: 'transparent',
          closed: false,
          listening: false,
          hitGraphEnabled: false,
          perfectDrawEnabled: false,
          tension: 0.3,
          lineCap: 'round',
          lineJoin: 'round'
        })
        
        // Add to activeLayer only - keeps it separate from completed annotations
        activeLayer.value.getNode().add(currentShapeNode)
        activeLayer.value.getNode().batchDraw() // Only redraws the single temporary shape
        
        // Initialize for sliding buffer
        slidingBufferOptimizer.reset()
        currentPath.value = [canvasPos]
        
        // Still use Vue state for completion tracking
        startAnnotation('freehand', originalPos)
        console.log('🎯 Starting new freehand annotation with direct Konva node')
      }
    }
    return
  }
  
  // Auto-start annotating for rectangle, line, circle when tool is selected
  if (props.currentTool === 'rectangle' || props.currentTool === 'line' || props.currentTool === 'circle') {
    startAnnotation(props.currentTool as any, originalPos)
    startPoint.value = canvasPos // Keep canvas coordinates for calculations
  }
}

const handleStageMouseMove = (e: any) => {
  const stageNode = e.target.getStage()
  const pointer = stageNode.getPointerPosition()
  
  if (!pointer) return  // Convert pointer to canvas coordinates for consistent coordinate handling
  const mouseTransform = stageNode.getAbsoluteTransform().copy().invert()
  const mouseCanvasPos = mouseTransform.point(pointer)
  mousePosition.value = mouseCanvasPos
  
  // ULTRA-HIGH-PERFORMANCE PATH: Direct Konva node updates for polygon/freehand
  if (isDrawingNonReactive.value) {
    // Clamp position to image bounds in canvas coordinates
    const clampedCanvasPos = {
      x: Math.max(imageOffset.value.x, Math.min(mouseCanvasPos.x, imageOffset.value.x + displayImageSize.value.width)),
      y: Math.max(imageOffset.value.y, Math.min(mouseCanvasPos.y, imageOffset.value.y + displayImageSize.value.height))
    }
    
    if (props.currentTool === 'freehand' && currentShapeNode) {
      // Use sliding buffer optimization for ultra-smooth freehand drawing
      const flatPoints = slidingBufferOptimizer.addPoint(clampedCanvasPos.x, clampedCanvasPos.y)
      
      if (flatPoints !== null) {
        // Direct Konva node update - NO Vue reactivity overhead
        // CRITICAL: Only redraw activeLayer, not staticLayer with completed annotations
        currentShapeNode.points(flatPoints)
        activeLayer.value?.getNode().batchDraw() // Only redraws the single temporary shape
        
        // Minimal Vue state update for path tracking (only when buffer changes)
        const pathPoints = []
        for (let i = 0; i < flatPoints.length - 1; i += 2) {
          pathPoints.push({ x: flatPoints[i]!, y: flatPoints[i + 1]! })
        }
        currentPath.value = pathPoints
      }
    } else if (props.currentTool === 'polygon' && ghostLineNode) {
      // TWO-SHAPE ILLUSION: O(1) mousemove operation for polygon
      // Only update the second point of ghostLineNode - pathNode remains unchanged
      const ghostPoints = ghostLineNode.points()
      if (ghostPoints.length >= 2) {
        // Update only the endpoint of the ghost line
        ghostLineNode.points([ghostPoints[0], ghostPoints[1], clampedCanvasPos.x, clampedCanvasPos.y])
        
        // Single node redraw - O(1) performance regardless of polygon complexity
        activeLayer.value?.getNode().batchDraw()
      }
    }
    return // Exit early to avoid Vue reactivity overhead
  }
  
  // LEGACY PATH: Vue reactive updates for other tools
  if (!isDrawing.value || !startPoint.value || !currentAnnotation.value) return
  
  // Convert to canvas coordinates
  const transform = stageNode.getAbsoluteTransform().copy().invert()
  const canvasPos = transform.point(pointer)
  
  // Clamp position to image bounds in canvas coordinates
  const clampedCanvasPos = {
    x: Math.max(imageOffset.value.x, Math.min(canvasPos.x, imageOffset.value.x + displayImageSize.value.width)),
    y: Math.max(imageOffset.value.y, Math.min(canvasPos.y, imageOffset.value.y + displayImageSize.value.height))
  }
  
  if (props.currentTool === 'rectangle') {
    const width = Math.abs(clampedCanvasPos.x - startPoint.value.x)
    const height = Math.abs(clampedCanvasPos.y - startPoint.value.y)
    
    // Update current annotation for display
    currentAnnotation.value.width = width / imageScale.value
    currentAnnotation.value.height = height / imageScale.value
    
    // Handle negative dimensions by adjusting start point
    if (clampedCanvasPos.x < startPoint.value.x) {
      currentAnnotation.value.startPoint = canvasToOriginal({
        x: clampedCanvasPos.x,
        y: currentAnnotation.value.startPoint!.y * imageScale.value + imageOffset.value.y
      })
    }
    if (clampedCanvasPos.y < startPoint.value.y) {
      currentAnnotation.value.startPoint = canvasToOriginal({
        x: currentAnnotation.value.startPoint!.x * imageScale.value + imageOffset.value.x,
        y: clampedCanvasPos.y
      })
    }
  } else if (props.currentTool === 'line') {
    currentAnnotation.value.endPoint = canvasToOriginal(clampedCanvasPos)
  } else if (props.currentTool === 'circle') {
    const distance = Math.hypot(clampedCanvasPos.x - startPoint.value.x, clampedCanvasPos.y - startPoint.value.y)
    currentAnnotation.value.radius = distance / imageScale.value
  }
}

const handleStageMouseUp = (e: any) => {
  // Handle non-reactive drawing completion first
  if (isDrawingNonReactive.value && currentShapeNode) {
    // For freehand, complete the drawing using finishDrawing function
    if (props.currentTool === 'freehand') {
      finishDrawing()
      return
    }
    
    // For polygon, don't complete on mouseup - wait for double-click
    if (props.currentTool === 'polygon') {
      return
    }
    
    // For any other non-reactive drawing, clean up without completing
    cleanupNonReactiveDrawing()
    return
  }
  
  // Legacy reactive drawing path
  if (!isDrawing.value) return
  
  isDrawing.value = false
  
  // Don't show class selector if we're currently dragging an annotation
  if (isDraggingAnnotation.value) {
    return
  }
  
  // Only proceed with annotation completion logic if we're actually creating a new annotation
  // (not dragging an existing one). Check if this is a drag operation by looking at the event target
  const target = e.target
  const isTargetAnnotation = target && (
    target.hasName && (
      target.hasName('line') || 
      target.hasName('rectangle') || 
      target.hasName('circle') || 
      target.hasName('polygon') || 
      target.hasName('dot') || 
      target.hasName('freehand')
    )
  )
  
  // If the event target is an existing annotation, don't trigger completion logic
  if (isTargetAnnotation) {
    resetAnnotationState()
    return
  }
  
  if (currentAnnotation.value) {
    const minSize = 5 / imageScale.value // Minimum size in original coordinates
    let shouldComplete = false
    
    if (props.currentTool === 'rectangle') {
      const width = Math.abs(currentAnnotation.value.width || 0)
      const height = Math.abs(currentAnnotation.value.height || 0)
      shouldComplete = width > minSize && height > minSize
      
      // Normalize the rectangle to have positive dimensions
      if (shouldComplete && startPoint.value) {
        const stageNode = e.target.getStage()
        const pointer = stageNode.getPointerPosition()
        if (pointer) {
          const transform = stageNode.getAbsoluteTransform().copy().invert()
          const canvasPos = transform.point(pointer)
          
          const topLeft = {
            x: Math.min(startPoint.value.x, canvasPos.x),
            y: Math.min(startPoint.value.y, canvasPos.y)
          }
          const bottomRight = {
            x: Math.max(startPoint.value.x, canvasPos.x),
            y: Math.max(startPoint.value.y, canvasPos.y)
          }
          
          currentAnnotation.value.startPoint = canvasToOriginal(topLeft)
          currentAnnotation.value.width = (bottomRight.x - topLeft.x) / imageScale.value
          currentAnnotation.value.height = (bottomRight.y - topLeft.y) / imageScale.value
        }
      }
    } else if (props.currentTool === 'line') {
      if (startPoint.value) {
        const stageNode = e.target.getStage()
        const pointer = stageNode.getPointerPosition()
        if (pointer) {
          const transform = stageNode.getAbsoluteTransform().copy().invert()
          const canvasPos = transform.point(pointer)
          const distance = Math.hypot(canvasPos.x - startPoint.value.x, canvasPos.y - startPoint.value.y)
          shouldComplete = distance > 5 // Minimum distance in canvas pixels
        }
      }
    } else if (props.currentTool === 'circle') {
      shouldComplete = (currentAnnotation.value.radius || 0) > minSize
    }
    
    if (shouldComplete) {
      if (props.classes && props.classes.length > 0) {
        // Show class selector
        const stageNode = e.target.getStage()
        const pointer = stageNode.getPointerPosition()
        emit('show-class-selector', currentAnnotation.value, pointer || { x: 0, y: 0 })
      } else {
        // Complete annotation without class
        completeAnnotation(currentAnnotation.value)
      }
    } else {
      // If annotation doesn't meet minimum requirements, cancel it
      cancelCurrentAnnotation()
    }
  } else {
    // Reset state if no current annotation
    resetAnnotationState()
  }
}

const handleStageClick = (e: any) => {
  const stageNode = e.target.getStage()
  const pointer = stageNode.getPointerPosition()
  
  if (!pointer) return
  
  // Only allow interaction within image bounds
  if (!isPointInImageBounds(pointer)) {
    return
  }
  
  // Improved double-click detection
  const currentTime = Date.now()
  const timeSinceLastClick = currentTime - lastClickTime.value
  lastClickTime.value = currentTime
  
  // If this is a potential double-click, wait to see if actual double-click event fires
  if (timeSinceLastClick < doubleClickThreshold && props.currentTool === 'polygon') {
    // Don't process this click as it might be part of a double-click
    return
  }
  
  // Convert to canvas coordinates
  const transform = stageNode.getAbsoluteTransform().copy().invert()
  const canvasPos = transform.point(pointer)
  const originalPos = canvasToOriginal(canvasPos)
  
  if (props.currentTool === 'polygon') {
    if (!props.isAnnotating) {
      // Start new polygon
      startAnnotation('polygon', originalPos)
      currentPath.value = [canvasPos] // Keep canvas coordinates for drawing
      console.log('🎯 Starting new polygon annotation')
    } else {
      // Add point to current polygon
      if (currentAnnotation.value && currentAnnotation.value.points) {
        const firstPoint = currentPath.value[0]
        if (firstPoint) {
          const distance = Math.hypot(canvasPos.x - firstPoint.x, canvasPos.y - firstPoint.y)
          
          if (distance < 15 && currentPath.value.length > 2) {
            // Close polygon - check for class selection
            if (props.classes && props.classes.length > 0 && currentAnnotation.value) {
              emit('show-class-selector', currentAnnotation.value, pointer)
            } else {
              completePolygon()
            }
          } else {
            // For polygons, directly add vertices without sliding buffer optimization
            currentPath.value.push(canvasPos)
            currentAnnotation.value.points.push(originalPos)
            console.log(`🎯 Polygon vertex added: ${currentAnnotation.value.points.length} points`)
          }
        }
      }
    }
  } else if (props.currentTool === 'dots') {
    // Create dot annotation
    const dotAnnotation: CanvasAnnotation = {
      type: 'dot',
      center: originalPos,
      radius: 5
    }
    
    if (props.classes && props.classes.length > 0) {
      emit('show-class-selector', dotAnnotation, pointer)
    } else {
      completeAnnotation(dotAnnotation)
    }
  }
}

const handleStageDoubleClick = (e: any) => {
  // Reset the click timer to prevent false single clicks
  lastClickTime.value = 0
  
  if (props.currentTool === 'polygon' && props.isAnnotating) {
    // Use the two-shape illusion finishDrawing function for non-reactive drawing
    if (isDrawingNonReactive.value && pathNode && ghostLineNode) {
      finishDrawing()
      return
    }
    
    // Fallback to legacy Vue state completion for reactive drawing
    if (currentAnnotation.value && currentAnnotation.value.points && currentAnnotation.value.points.length > 2) {
      // Check for class selection before completing polygon
      if (props.classes && props.classes.length > 0) {
        const stageNode = e.target.getStage()
        const pointer = stageNode.getPointerPosition()
        emit('show-class-selector', currentAnnotation.value, pointer || { x: 0, y: 0 })
      } else {
        completePolygon()
      }
    }
  }
}

const handleStageWheel = (e: any) => {
  // Prevent default scroll behavior
  e.evt.preventDefault()
  
  if (!stage.value) return
  
  const stageNode = stage.value.getNode()
  const pointer = stageNode.getPointerPosition()
  
  if (!pointer) return
  
  // Enter performance mode during zoom
  if (!isZooming.value) {
    isZooming.value = true
    enterPerformanceMode()
  }
  
  // Clear existing zoom debounce timer
  if (zoomDebounceTimer) {
    clearTimeout(zoomDebounceTimer)
  }
  
  // Calculate new scale
  const scaleDirection = e.evt.deltaY > 0 ? -1 : 1
  const newScale = Math.min(Math.max(stageScale.value * (scaleBy ** scaleDirection), minScale.value), maxScale.value)
  
  // If scale doesn't change (hit min/max), don't do anything
  if (newScale === stageScale.value) {
    // Still need to reset zoom state
    zoomDebounceTimer = window.setTimeout(() => {
      isZooming.value = false
      exitPerformanceMode()
    }, 150)
    return
  }
  
  // Get current stage position and scale from the actual stage node
  const currentStagePos = stageNode.position()
  const currentStageScale = stageNode.scaleX()
  
  // Calculate mouse point relative to the current stage transformation
  const mousePointTo = {
    x: (pointer.x - currentStagePos.x) / currentStageScale,
    y: (pointer.y - currentStagePos.y) / currentStageScale
  }
  
  // Calculate new position to zoom relative to pointer
  const newPos = {
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale
  }
  
  // Update stage scale and position
  stageScale.value = newScale
  stagePosition.value = newPos
  
  // Set debounced timer to exit performance mode after zoom ends
  zoomDebounceTimer = window.setTimeout(() => {
    isZooming.value = false
    exitPerformanceMode()
  }, 150) // 150ms delay after last zoom event
}

// Zoom utility functions
const resetZoom = () => {
  stageScale.value = 1
  stagePosition.value = { x: 0, y: 0 }
}

const fitToScreen = () => {
  if (!imageObj.value) return
  
  // Calculate the scale needed to fit the image in the stage
  const scaleX = stageSize.value.width / displayImageSize.value.width
  const scaleY = stageSize.value.height / displayImageSize.value.height
  const fitScale = Math.min(scaleX, scaleY, 1) // Don't scale up beyond 100%
  
  stageScale.value = fitScale
  
  // Center the image
  const scaledImageWidth = displayImageSize.value.width * fitScale
  const scaledImageHeight = displayImageSize.value.height * fitScale
  
  stagePosition.value = {
    x: (stageSize.value.width - scaledImageWidth) / 2 - imageOffset.value.x * fitScale,
    y: (stageSize.value.height - scaledImageHeight) / 2 - imageOffset.value.y * fitScale
  }
}

// Keyboard event handler for drawing completion
const handleStageKeyDown = (e: any) => {
  const keyEvent = e.evt
  
  // Enter key to finish current drawing
  if (keyEvent.key === 'Enter' || keyEvent.keyCode === 13) {
    if (isDrawingNonReactive.value && currentShapeNode) {
      // Prevent default to avoid form submission
      keyEvent.preventDefault()
      
      // Check if we have enough points for a valid shape
      const flatPoints = currentShapeNode.points()
      if (flatPoints && flatPoints.length >= 4) { // At least 2 points
        console.log('🎯 Finishing drawing with Enter key')
        finishDrawing()
      }
    }
  }
  
  // Escape key to cancel current drawing
  if (keyEvent.key === 'Escape' || keyEvent.keyCode === 27) {
    if (isDrawingNonReactive.value && currentShapeNode) {
      keyEvent.preventDefault()
      console.log('🎯 Canceling drawing with Escape key')
      cleanupNonReactiveDrawing()
      
      // Also cancel Vue state
      cancelCurrentAnnotation()
    }
  }
}

// Stage drag handlers for performance optimization
const handleStageDragStart = (e: any) => {
  isDraggingStage.value = true
  enterPerformanceMode()
}

const handleStageDragEnd = (e: any) => {
  // Clear existing drag debounce timer
  if (dragDebounceTimer) {
    clearTimeout(dragDebounceTimer)
  }
  
  // Set debounced timer to exit performance mode after drag ends
  dragDebounceTimer = window.setTimeout(() => {
    isDraggingStage.value = false
    exitPerformanceMode()
  }, 100) // 100ms delay after drag ends
}

const handleAnnotationClick = (index: number, e: any) => {
  e.cancelBubble = true
  
  if (props.currentTool === 'select') {
    selectedAnnotationIndex.value = index
    const pos = e.target.getStage().getPointerPosition()
    
    showAnnotationTools.value = true
    annotationToolsPosition.value = {
      x: pos.x + 10,
      y: pos.y - 40
    }
    
    updateTransformer()
  }
}

const handleAnnotationMouseOver = (index: number) => {
  hoveredAnnotationIndex.value = index
  if (stageContainer.value) {
    stageContainer.value.style.cursor = 'pointer'
  }
}

const handleAnnotationMouseOut = (index: number) => {
  hoveredAnnotationIndex.value = null
  if (stageContainer.value) {
    stageContainer.value.style.cursor = 'default'
  }
}

const handleDragStart = (index: number, e: any) => {
  isDraggingAnnotation.value = true
  
  // Clear cache for the annotation being dragged (especially for polygons and freehand)
  const annotation = props.annotations[index]
  if (annotation && (annotation.type === 'polygon' || annotation.type === 'freehand')) {
    const cacheKey = `${annotation.type}-${index}`
    const node = annotationRefs.value[cacheKey]
    if (node && typeof node.clearCache === 'function') {
      try {
        node.clearCache()
      } catch (error) {
        console.warn('Failed to clear cache during drag start:', error)
      }
    }
  }
}

const handleDragEnd = (index: number, e: any) => {
  const originalAnnotation = props.annotations[index]
  if (!originalAnnotation) return
  
  const annotation: CanvasAnnotation = { ...originalAnnotation }
  const node = e.target
  
  let updatedAnnotation: CanvasAnnotation
  
  switch (annotation.type) {
    case 'rectangle':
      updatedAnnotation = handleRectangleDragEnd({
        annotation,
        node,
        imageOffset: imageOffset.value,
        displayImageSize: displayImageSize.value,
        originalSizeToDisplay: (size: { width: number; height: number }) => ({
          width: size.width * imageScale.value,
          height: size.height * imageScale.value
        }),
        displayToOriginal: (point: { x: number; y: number }) => canvasToOriginal(point)
      })
      break
      
    case 'polygon':
      updatedAnnotation = handlePolygonDragEnd({
        annotation,
        node,
        imageScale: imageScale.value,
        originalImageSize: originalImageSize.value
      })
      break
      
    case 'dot':
      updatedAnnotation = handleDotDragEnd({
        annotation,
        node,
        imageOffset: imageOffset.value,
        displayImageSize: displayImageSize.value,
        imageScale: imageScale.value,
        displayToOriginal: (point: { x: number; y: number }) => canvasToOriginal(point)
      })
      break
      
    case 'line':
      updatedAnnotation = handleLineDragEnd({
        annotation,
        node,
        imageOffset: imageOffset.value,
        displayImageSize: displayImageSize.value,
        displayToOriginal: (point: { x: number; y: number }) => canvasToOriginal(point)
      })
      break
      
    case 'circle':
      updatedAnnotation = handleCircleDragEnd({
        annotation,
        node,
        imageOffset: imageOffset.value,
        displayImageSize: displayImageSize.value,
        imageScale: imageScale.value,
        displayToOriginal: (point: { x: number; y: number }) => canvasToOriginal(point)
      })
      break
      
    case 'freehand':
      updatedAnnotation = handleFreehandDragEnd({
        annotation,
        node,
        imageScale: imageScale.value,
        originalImageSize: originalImageSize.value
      })
      break
      
    default:
      updatedAnnotation = annotation
  }
  
  // Update cache after drag operation (especially important for polygons and freehand)
  const cacheKey = `${annotation.type}-${index}`
  if (annotation.type === 'polygon' || annotation.type === 'freehand') {
    // Clear cache immediately for modified complex shapes
    try {
      node.clearCache()
    } catch (error) {
      console.warn('Failed to clear cache after drag:', error)
    }
    // For complex shapes, use debounced caching to avoid performance issues
    debouncedCachePolygons()
  } else {
    // For simple shapes, cache immediately
    updateAnnotationCache(node, cacheKey)
  }
  
  emit('annotation-updated', updatedAnnotation, index)
  
  // Reset drag state
  isDraggingAnnotation.value = false
}

const handleTransformEnd = (index: number, e: any) => {
  const originalAnnotation = props.annotations[index]
  if (!originalAnnotation) return
  
  const annotation: CanvasAnnotation = { ...originalAnnotation }
  const node = e.target
  
  if (annotation.type === 'rectangle') {
    const updatedAnnotation = handleRectangleTransformEnd({
      annotation,
      node,
      displaySizeToOriginal: (size: { width: number; height: number }) => ({
        width: size.width / imageScale.value,
        height: size.height / imageScale.value
      }),
      displayToOriginal: (point: { x: number; y: number }) => canvasToOriginal(point),
      originalImageSize: originalImageSize.value
    })
    
    // Update node position and size to reflect constrained values
    const constrainedCanvasStart = originalToCanvas(updatedAnnotation.startPoint!)
    const constrainedCanvasSize = {
      width: updatedAnnotation.width! * imageScale.value,
      height: updatedAnnotation.height! * imageScale.value
    }
    
    node.position(constrainedCanvasStart)
    node.size(constrainedCanvasSize)
    
    // Update cache after transform operation
    const cacheKey = `${annotation.type}-${index}`
    updateAnnotationCache(node, cacheKey)
    
    emit('annotation-updated', updatedAnnotation, index)
  }
}

// Annotation management methods - now handled by useAnnotationLifecycle composable

const editAnnotation = () => {
  if (selectedAnnotationIndex.value !== null) {
    // Implementation for editing can be added here
  }
  showAnnotationTools.value = false
}

const deleteAnnotation = () => {
  if (selectedAnnotationIndex.value !== null) {
    const annotation = props.annotations[selectedAnnotationIndex.value]
    if (annotation) {
      // Clear cache for the deleted annotation
      const cacheKey = `${annotation.type}-${selectedAnnotationIndex.value}`
      const node = annotationRefs.value[cacheKey]
      if (node && typeof node.clearCache === 'function') {
        try {
          node.clearCache()
        } catch (error) {
          console.warn('Failed to clear cache for deleted annotation:', error)
        }
      }
      delete annotationRefs.value[cacheKey]
    }
    
    emit('annotation-deleted', selectedAnnotationIndex.value)
    selectedAnnotationIndex.value = null
    showAnnotationTools.value = false
    updateTransformer()
    
    // Recache remaining annotations after deletion
    nextTick(() => {
      cacheAllAnnotations()
    })
  }
}

// Performance monitoring functions
const getBufferStatus = () => {
  const status = slidingBufferOptimizer.getStatus()
  return `${status.renderPoints}/${status.totalPoints} (${status.compressionRatio.toFixed(0)}%)`
}

const duplicateAnnotation = () => {
  if (selectedAnnotationIndex.value !== null) {
    const originalAnnotation = props.annotations[selectedAnnotationIndex.value]
    if (!originalAnnotation || !originalAnnotation.type) return
    
    const duplicatedAnnotation: CanvasAnnotation = { 
      ...originalAnnotation
    }
    
    // Offset the duplicated annotation slightly
    if (duplicatedAnnotation.type === 'rectangle' && duplicatedAnnotation.startPoint) {
      duplicatedAnnotation.startPoint = {
        x: duplicatedAnnotation.startPoint.x + 20,
        y: duplicatedAnnotation.startPoint.y + 20
      }
    } else if (duplicatedAnnotation.type === 'polygon' && duplicatedAnnotation.points) {
      duplicatedAnnotation.points = duplicatedAnnotation.points.map(point => ({
        x: point.x + 20,
        y: point.y + 20
      }))
    } else if (duplicatedAnnotation.type === 'dot' && duplicatedAnnotation.center) {
      duplicatedAnnotation.center = {
        x: duplicatedAnnotation.center.x + 20,
        y: duplicatedAnnotation.center.y + 20
      }
    }
    
    emit('annotation-completed', duplicatedAnnotation)
    showAnnotationTools.value = false
  }
}

const updateTransformer = () => {
  // Ensure transformer is initialized
  if (!transformerInstance) {
    initializeTransformer()
    if (!transformerInstance) return
  }
  
  if (selectedAnnotationIndex.value !== null) {
    // Find the selected annotation node by looking for the ref key
    const selectedAnnotation = props.annotations[selectedAnnotationIndex.value]
    if (selectedAnnotation) {
      const cacheKey = `${selectedAnnotation.type}-${selectedAnnotationIndex.value}`
      const selectedNode = annotationRefs.value[cacheKey]
      
      if (selectedNode) {
        // Only apply transformer to transformable annotation types
        if (selectedAnnotation.type === 'rectangle') {
          // PERFORMANCE: Only attach/detach nodes, never destroy/recreate transformer
          transformerInstance.nodes([selectedNode])
          
          // Update transformer config for current UI scale
          const uiScale = getUIScale()
          transformerInstance.anchorStrokeWidth(2 * uiScale)
          transformerInstance.anchorSize(8 * uiScale)
          transformerInstance.borderStrokeWidth(2 * uiScale)
          transformerInstance.borderDash([3 * uiScale, 3 * uiScale])
        } else {
          // For non-transformable types, detach transformer
          transformerInstance.nodes([])
        }
      } else {
        // Node not found, detach transformer
        transformerInstance.nodes([])
      }
    } else {
      // Annotation not found, detach transformer
      transformerInstance.nodes([])
    }
  } else {
    // No selection, detach transformer
    transformerInstance.nodes([])
  }
  
  // PERFORMANCE: Only redraw activeLayer (transformer location), not staticLayer (completed annotations)
  activeLayer.value?.getNode().batchDraw()
}

// Public methods - now handled by useAnnotationLifecycle composable

// Watchers with performance optimizations
watch(() => props.imageUrl, async (newUrl) => {
  if (newUrl) {
    try {
      await loadImage(newUrl)
    } catch (error) {
      // Emit error event to parent for handling
      emit('annotation-updated', { 
        type: 'rectangle', 
        startPoint: { x: 0, y: 0 }, 
        width: 0, 
        height: 0 
      } as CanvasAnnotation, -1) // Use -1 to indicate error
    }
  }
}, { immediate: true })

// Deep watcher removed for INP performance optimization
// Auto performance mode and caching disabled to eliminate state change cascade

// Watch stage scale changes to invalidate caches when zoom changes significantly
watch(stageScale, (newScale, oldScale) => {
  if (oldScale && Math.abs(newScale - oldScale) > 0.2) {
    // Clear and recache all annotations when zoom changes significantly
    clearAllAnnotationCaches()
    nextTick(() => {
      cacheAllAnnotations()
    })
  }
})

watch(selectedAnnotationIndex, () => {
  nextTick(() => {
    updateTransformer()
  })
})

// Watch for tool changes to clean up non-reactive drawing state
watch(() => props.currentTool, (newTool, oldTool) => {
  // If we're switching away from a drawing tool and have an active non-reactive drawing,
  // attempt to finish it before cleaning up
  if (isDrawingNonReactive.value && currentShapeNode && (oldTool === 'polygon' || oldTool === 'freehand')) {
    // Only finish if we have enough points for a valid shape
    const flatPoints = currentShapeNode.points()
    if (flatPoints && flatPoints.length >= 4) { // At least 2 points
      console.log(`🎯 Auto-finishing ${oldTool} drawing due to tool change`)
      finishDrawing()
    } else {
      // Not enough points, just clean up
      cleanupNonReactiveDrawing()
    }
  } else {
    // Normal cleanup for other cases
    cleanupNonReactiveDrawing()
  }
})

// Function to cache all visible annotations with polygon-specific optimization
const cacheAllAnnotations = () => {
  const polygonNodes: any[] = []
  const simpleNodes: any[] = []
  
  // Separate polygon/freehand from simple annotations for batch processing
  props.annotations.forEach((annotation, index) => {
    const cacheKey = `${annotation.type}-${index}`
    const node = annotationRefs.value[cacheKey]
    if (node) {
      if (annotation.type === 'polygon' || annotation.type === 'freehand') {
        polygonNodes.push({ node, key: cacheKey })
      } else {
        simpleNodes.push({ node, key: cacheKey })
      }
    }
  })
  
  // Cache simple annotations first (faster)
  simpleNodes.forEach(({ node, key }) => {
    cacheAnnotationNode(node, key)
  })
  
  // Cache complex polygons with a slight delay to prevent UI blocking
  if (polygonNodes.length > 0) {
    let processedPolygons = 0
    const batchSize = 3 // Process 3 polygons at a time
    
    const processBatch = () => {
      const batch = polygonNodes.slice(processedPolygons, processedPolygons + batchSize)
      batch.forEach(({ node, key }) => {
        cacheAnnotationNode(node, key)
      })
      
      processedPolygons += batch.length
      
      if (processedPolygons < polygonNodes.length) {
        // Use requestAnimationFrame for smooth processing
        requestAnimationFrame(processBatch)
      } else {
        // No longer need batchDraw - annotation layer removed for performance
      }
    }
    
    // Start batch processing
    requestAnimationFrame(processBatch)
  } else {
    // No longer need batchDraw - annotation layer removed for performance
  }
}

// Performance optimization: debounce transformer updates
let transformerUpdateTimeout: number | null = null
const debouncedUpdateTransformer = () => {
  if (transformerUpdateTimeout) {
    clearTimeout(transformerUpdateTimeout)
  }
  transformerUpdateTimeout = window.setTimeout(() => {
    updateTransformer()
  }, 16) // ~60fps
}

// Lifecycle with cleanup
onMounted(async () => {
  // Configure sliding buffer optimizer for optimal performance
  slidingBufferOptimizer.updateConfig(PerformancePresets.BALANCED)
  console.log('🎯 Sliding buffer optimizer initialized with BALANCED preset')
  
  // Initialize polygon simplification worker
  try {
    await workerManager.initialize()
    console.log('🔧 Polygon simplification worker ready')
  } catch (error) {
    console.warn('🔧 Could not initialize polygon worker, using fallback:', error)
  }
  
  // Try to load image immediately if URL is available
  if (props.imageUrl) {
    loadImage(props.imageUrl).catch(error => {
      console.error('KonvaAnnotationCanvas: Manual image load failed:', error)
    })
  }
  
  // Initialize after stage is ready
  nextTick(() => {
    // Initialize transformer instance
    initializeTransformer()
    
    // Cache annotations after component is mounted
    cacheAllAnnotations()
  })
})

onUnmounted(() => {
  // Clean up non-reactive drawing state
  cleanupNonReactiveDrawing()
  
  // Clean up transformer instance
  if (transformerInstance) {
    transformerInstance.destroy()
    transformerInstance = null
  }
  
  // Clean up all timers
  if (transformerUpdateTimeout) {
    clearTimeout(transformerUpdateTimeout)
  }
  if (zoomDebounceTimer) {
    clearTimeout(zoomDebounceTimer)
  }
  if (dragDebounceTimer) {
    clearTimeout(dragDebounceTimer)
  }
  if (cacheUpdateTimer) {
    clearTimeout(cacheUpdateTimer)
  }
  
  // Clear all caches on unmount to prevent memory leaks
  clearAllAnnotationCaches()
  
  // Clear current annotation refs
  Object.values(currentAnnotationRefs.value).forEach(node => {
    if (node && typeof node.clearCache === 'function') {
      try {
        node.clearCache()
      } catch (error) {
        console.warn('Failed to clear current annotation cache:', error)
      }
    }
  })
  currentAnnotationRefs.value = {}
})

// Expose methods to parent with enhanced functionality
defineExpose({
  completeCurrentAnnotation,
  cancelCurrentAnnotation,
  finishDrawing, // NEW: Bridge function for completing non-reactive drawings
  getImageScale: () => imageScale.value,
  getImageOffset: () => imageOffset.value,
  getOriginalImageSize: () => originalImageSize.value,
  getDisplayImageSize: () => displayImageSize.value,
  isPointInBounds: isPointInImageBounds,
  convertToOriginal: canvasToOriginal,
  convertToDisplay: originalToCanvas,
  // Zoom methods
  resetZoom,
  fitToScreen,
  getStageScale: () => stageScale.value,
  getStagePosition: () => stagePosition.value,
  setZoom: (scale: number, center?: { x: number; y: number }) => {
    const newScale = Math.min(Math.max(scale, minScale.value), maxScale.value)
    
    if (center && stage.value) {
      const stageNode = stage.value.getNode()
      // Zoom to specific point using proper coordinate transformation
      const transform = stageNode.getAbsoluteTransform().copy().invert()
      const canvasPoint = transform.point(center)
      
      stagePosition.value = {
        x: center.x - canvasPoint.x * newScale,
        y: center.y - canvasPoint.y * newScale
      }
    }
    
    stageScale.value = newScale
  },
  // Cache management methods with polygon-specific optimization
  cacheAllAnnotations,
  clearAllAnnotationCaches,
  updateAnnotationCache: (index: number) => {
    const annotation = props.annotations[index]
    if (annotation) {
      const cacheKey = `${annotation.type}-${index}`
      const node = annotationRefs.value[cacheKey]
      if (node) {
        updateAnnotationCache(node, cacheKey)
      }
    }
  },
  // Performance monitoring and control methods
  getPerformanceMode: () => isPerformanceMode.value,
  setPerformanceMode: (enabled: boolean) => {
    if (enabled) {
      enterPerformanceMode()
    } else {
      exitPerformanceMode()
    }
  },
  forcePolygonSimplification: (epsilon: number = 2.0) => {
    // Force simplification of all polygon annotations with the given epsilon
    props.annotations.forEach((annotation, index) => {
      if ((annotation.type === 'polygon' || annotation.type === 'freehand') && annotation.points) {
        const cacheKey = `${annotation.type}-${index}`
        const node = annotationRefs.value[cacheKey]
        if (node) {
          // Clear cache before applying simplification
          node.clearCache()
        }
      }
    })
    
    // Trigger re-render with simplified polygons
    nextTick(() => {
      debouncedCachePolygons()
    })
  },
  // Performance method to force batch draw
  batchDraw: () => {
    // No longer need batchDraw - annotation layer removed for performance
  },
  // Get polygon complexity statistics
  getPolygonStats: () => {
    const stats = {
      totalPolygons: 0,
      complexPolygons: 0, // > 50 points
      veryComplexPolygons: 0, // > 100 points
      totalPoints: 0,
      averagePoints: 0
    }
    
    props.annotations.forEach(annotation => {
      if ((annotation.type === 'polygon' || annotation.type === 'freehand') && annotation.points) {
        stats.totalPolygons++
        stats.totalPoints += annotation.points.length
        
        if (annotation.points.length > 50) {
          stats.complexPolygons++
        }
        if (annotation.points.length > 100) {
          stats.veryComplexPolygons++
        }
      }
    })
    
    stats.averagePoints = stats.totalPolygons > 0 ? stats.totalPoints / stats.totalPolygons : 0
    return stats
  }
})
</script>
