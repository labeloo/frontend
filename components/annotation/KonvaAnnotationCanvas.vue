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
        <template v-if="annotation.type === 'polygon' && selectedAnnotationIndex === index && annotation.points">
          <v-circle
            v-for="(point, pointIndex) in annotation.points"
            :key="`vertex-${index}-${pointIndex}`"
            :config="getCompletedVertexConfig(point, pointIndex, annotation.points.length)"
          />
        </template>
        
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
        <template v-if="annotation.type === 'freehand' && selectedAnnotationIndex === index && annotation.points">
          <v-circle
            v-for="(point, pointIndex) in annotation.points"
            :key="`freehand-vertex-${index}-${pointIndex}`"
            :config="getCompletedVertexConfig(point, pointIndex, annotation.points.length)"
          />
        </template>
        
        <!-- Class labels with background for better visibility -->
        <!-- Always show labels, even for unlabeled annotations -->
        <v-rect
          :config="getLabelBackgroundConfig(annotation, index)"
        />
        <!-- Text label -->
        <v-text
          :config="getLabelConfig(annotation, index)"
        />
      </template>
    </v-layer>
    
    <!-- Active drawing layer for high-performance real-time drawing (ONLY for temporary shapes) -->
    <v-layer ref="activeLayer">
      <!-- This layer ONLY contains temporary shapes during non-reactive drawing -->
      <!-- All content is managed directly via Konva API for maximum performance -->
      <!-- Calling batchDraw() on this layer ONLY redraws temporary shapes -->
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
  
 
</div>
</ClientOnly>

  </div>
</template>
<script setup lang="ts">
/**
 * PERFORMANCE OPTIMIZATIONS APPLIED - REFACTORED VERSION:
 * 
 * 1. "Temporary Imperative, Final Declarative" Hybrid Architecture:
 *    - ALL drawing tools (rectangle, circle, line, polygon, freehand) use imperative model during interaction
 *    - Direct Konva node manipulation in activeLayer for 60fps+ performance
 *    - Vue reactivity only for final, static display in staticLayer
 * 
 * 2. Eliminated Legacy Reactive State:
 *    - Removed: currentAnnotation, isDrawing, currentPath, startPoint, mousePosition
 *    - Replaced with: isDrawingNonReactive + imperative variables (non-reactive)
 * 
 * 3. Perfect Polygon Drawing UX:
 *    - Re-implemented fast vertex dots using temporary Konva nodes
 *    - Two-shape illusion strategy for O(1) mousemove performance
 *    - Proper cleanup prevents memory leaks
 * 
 * 4. Memoized Annotation Configs:
 *    - Pre-calculated config objects prevent recalculation on every render
 *    - Stable object references for Konva components
 * 
 * 5. Removed Performance Traps:
 *    - No deep watchers on props.annotations
 *    - Eliminated reactive annotation layer
 *    - Strategic caching only when needed
 */

import { useRectConfig } from '~/composables/useRectConfig';
import { usePolygonConfig } from '~/composables/usePolygonConfig';
import { useCircleConfig } from '~/composables/useCircleConfig';
import { useDotConfig } from '~/composables/useDotConfig';
import { useLineConfig } from '~/composables/useLineConfig';
import { useFreehandConfig } from '~/composables/useFreehandConfig';
import { useAnnotationDragHandlers } from '~/composables/useAnnotationDragHandlers';
import { useAnnotationTransformHandlers } from '~/composables/useAnnotationTransformHandlers';
import { slidingBufferOptimizer, PerformancePresets } from '~/utils/slidingBufferOptimization';
import { polygonPerformanceMonitor } from '~/utils/polygonPerformanceMonitor';
import { workerManager } from '~/utils/polygonWorkerManager';
import type { CanvasAnnotation } from './types'

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
const activeLayer = ref<any>(null)



// Non-reactive drawing state for high-performance drawing
const isDrawingNonReactive = shallowRef(false)
let currentShapeNode: any = null

// Imperative drawing state (non-reactive for maximum performance)
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
    boundBoxFunc: (oldBox: any, newBox: any) => {
      const newBoxOriginal = {
        x: (newBox.x - imageOffset.value.x) / imageScale.value,
        y: (newBox.y - imageOffset.value.y) / imageScale.value,
        width: newBox.width / imageScale.value,
        height: newBox.height / imageScale.value
      }
      
      if (newBoxOriginal.x < 0 || newBoxOriginal.y < 0 || 
          newBoxOriginal.x + newBoxOriginal.width > originalImageSize.value.width ||
          newBoxOriginal.y + newBoxOriginal.height > originalImageSize.value.height) {
        return oldBox
      }
      
      const uiScale = 1 / stageScale.value
      if (newBox.width < 10 * uiScale || newBox.height < 10 * uiScale) {
        return oldBox
      }
      
      return newBox
    }
  })
  
  activeLayer.value.getNode().add(transformerInstance)
  console.log('🎯 Transformer instance initialized on activeLayer')
}

// Helper function to check if a point is near the first vertex (for polygon completion)
const isNearFirstVertex = (clickPos: { x: number; y: number }, threshold: number = 15) => {
  if (!currentPathImperative || currentPathImperative.length === 0) return false
  
  const firstPoint = currentPathImperative[0]
  if (!firstPoint) return false
  
  const distance = Math.hypot(clickPos.x - firstPoint.x, clickPos.y - firstPoint.y)
  return distance <= threshold / stageScale.value // Adjust threshold based on zoom level
}

// Helper function to clean up non-reactive drawing state
const cleanupNonReactiveDrawing = () => {
  if (isDrawingNonReactive.value && currentShapeNode) {
    currentShapeNode.destroy()
    currentShapeNode = null
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
  
  // Always reset the drawing flag when cleaning up
  isDrawingNonReactive.value = false
  
  // Reset imperative state
  startPointImperative = null
  currentPathImperative = []
  mousePositionImperative = null
  
  // Redraw the active layer to remove any leftover visual artifacts
  if (activeLayer.value) {
    activeLayer.value.getNode().batchDraw()
  }
  
  console.log('🧹 Cleaned up all non-reactive drawing state')
}

// Bridge function between imperative drawing and Vue's reactive state
const finishDrawing = () => {
  if (!isDrawingNonReactive.value) return
  
  let newAnnotation: CanvasAnnotation | null = null
  const tool = props.currentTool
  
  // Handle polygon two-shape illusion strategy
  if (tool === 'polygon' && pathNode && ghostLineNode) {
    const pathPoints = pathNode.points() || []
    const ghostPoints = ghostLineNode.points() || []
    
    let flatPoints: number[] = []
    if (ghostPoints.length >= 2) {
      flatPoints = [...pathPoints, ghostPoints[0], ghostPoints[1]]
    } else {
      flatPoints = pathPoints
    }
    
    // Edge case: polygon must have at least 3 points (6 coordinates)
    if (flatPoints.length < 6) {
      console.warn('Polygon too small, cleaning up')
      cleanupNonReactiveDrawing()
      return
    }
    
    // Store raw canvas coordinates without conversion
    const rawPoints: { x: number; y: number }[] = []
    for (let i = 0; i < flatPoints.length - 1; i += 2) {
      rawPoints.push({ x: flatPoints[i]!, y: flatPoints[i + 1]! })
    }
    
    newAnnotation = {
      type: 'polygon',
      points: rawPoints,
      className: undefined
    }
  }
  
  // Handle freehand drawing
  else if (tool === 'freehand' && currentShapeNode) {
    const flatPoints = currentShapeNode.points() || []
    
    // Edge case: freehand must have at least 2 points (4 coordinates)
    if (flatPoints.length < 4) {
      console.warn('Freehand too small, cleaning up')
      cleanupNonReactiveDrawing()
      return
    }
    
    // Store raw canvas coordinates without conversion
    const rawPoints: { x: number; y: number }[] = []
    for (let i = 0; i < flatPoints.length - 1; i += 2) {
      rawPoints.push({ x: flatPoints[i]!, y: flatPoints[i + 1]! })
    }
    
    newAnnotation = {
      type: 'freehand',
      points: rawPoints,
      className: undefined
    }
  }
  
  // Handle rectangle drawing
  else if (tool === 'rectangle' && currentShapeNode && startPointImperative) {
    const rect = currentShapeNode
    const x = rect.x()
    const y = rect.y()
    const width = rect.width()
    const height = rect.height()
    
    // Edge case: rectangle must have meaningful size
    const minSize = 5 / stageScale.value // 5 pixels at current zoom
    if (width < minSize || height < minSize) {
      console.warn('Rectangle too small, cleaning up')
      cleanupNonReactiveDrawing()
      return
    }
    
    // Store raw canvas coordinates without any conversion
    newAnnotation = {
      type: 'rectangle',
      startPoint: { x, y },
      width: width,
      height: height,
      className: undefined
    }
  }
  
  // Handle circle drawing
  else if (tool === 'circle' && currentShapeNode && startPointImperative) {
    const circle = currentShapeNode
    const centerX = circle.x()
    const centerY = circle.y()
    const radius = circle.radius()
    
    // Edge case: circle must have meaningful radius
    const minRadius = 3 / stageScale.value // 3 pixels at current zoom
    if (radius < minRadius) {
      console.warn('Circle too small, cleaning up')
      cleanupNonReactiveDrawing()
      return
    }
    
    // Store raw canvas coordinates without any conversion
    newAnnotation = {
      type: 'circle',
      center: { x: centerX, y: centerY },
      radius: radius,
      className: undefined
    }
  }
  
  // Handle line drawing
  else if (tool === 'line' && currentShapeNode && startPointImperative) {
    const flatPoints = currentShapeNode.points() || []
    
    // Edge case: line must have 2 points (4 coordinates)
    if (flatPoints.length < 4) {
      console.warn('Line incomplete, cleaning up')
      cleanupNonReactiveDrawing()
      return
    }
    
    // Store raw canvas coordinates without conversion
    const rawPoints = [
      { x: flatPoints[0]!, y: flatPoints[1]! },
      { x: flatPoints[2]!, y: flatPoints[3]! }
    ]
    
    // Edge case: line must have meaningful length (check in raw coordinates)
    const distance = Math.hypot(rawPoints[1]!.x - rawPoints[0]!.x, rawPoints[1]!.y - rawPoints[0]!.y)
    const minDistance = 2 / stageScale.value // 2 pixels at current zoom
    if (distance < minDistance) {
      console.warn('Line too short, cleaning up')
      cleanupNonReactiveDrawing()
      return
    }
    
    newAnnotation = {
      type: 'line',
      startPoint: rawPoints[0]!,
      endPoint: rawPoints[1]!,
      className: undefined
    }
  }
  
  // Handle dot tool (if implemented)
  else if (tool === 'dot' && startPointImperative) {
    // Store raw canvas coordinates without any conversion
    const defaultRadius = 5 // 5 pixels in raw canvas units
    
    newAnnotation = {
      type: 'dot',
      center: { x: startPointImperative.x, y: startPointImperative.y },
      radius: defaultRadius,
      className: undefined
    }
  }
  
  // If no valid annotation was created, clean up and return
  if (!newAnnotation) {
    console.warn('finishDrawing called with unsupported tool or invalid state:', tool)
    cleanupNonReactiveDrawing()
    return
  }
  
  // Core lifecycle logic:
  // 1. Set the pending state
  pendingAnnotation.value = newAnnotation
  
  // 2. For dots, keep the temporary visual until class selection is complete
  // For other tools, clean up temporary nodes immediately
  if (tool !== 'dot') {
    cleanupNonReactiveDrawing()
  }
  
  // 3. Ask the parent to show the class selector or finalize immediately
  if (props.classes && props.classes.length > 0) {
    console.log('🎯 finishDrawing: Showing class selector')
    if (stage.value) {
      const stageNode = stage.value.getNode()
      const pointer = stageNode.getPointerPosition()
      emit('show-class-selector', newAnnotation, pointer || { x: 0, y: 0 })
    } else {
      emit('show-class-selector', newAnnotation, { x: 0, y: 0 })
    }
  } else {
    console.log('🎯 finishDrawing: No classes, finalizing immediately')
    // If no classes to choose from, finalize immediately with empty className
    finalizeAnnotation('')
  }
  
  console.log('✅ finishDrawing completed for tool:', tool, 'annotation:', newAnnotation.type)
}

// Imperative annotation functions (replaces useAnnotationLifecycle composable)
const completeAnnotation = (annotation: CanvasAnnotation) => {
  console.log('🚨 completeAnnotation called - THIS SHOULD NOT BE USED!')
  const newAnnotations = [...props.annotations, annotation]
  emit('update:annotations', newAnnotations)
  emit('annotation-completed', annotation)
  emit('update:isAnnotating', false)
}

// Part 1: Create the finalizeAnnotation Method
const finalizeAnnotation = (className: string) => {
  console.log('🎯 finalizeAnnotation called with className:', className)
  if (!pendingAnnotation.value) {
    console.warn('finalizeAnnotation called but no pending annotation exists')
    return
  }
  
  // a. Take the annotation from pendingAnnotation.value
  const annotation = { ...pendingAnnotation.value }
  
  // b. Assign the className to it
  annotation.className = className || undefined
  
  // c. For dots, clean up the temporary visual now that we're finalizing
  if (annotation.type === 'dot') {
    cleanupNonReactiveDrawing()
  }
  
  console.log('🎯 About to emit update:annotations with:', [...props.annotations, annotation].length, 'annotations')
  
  // d. Push the completed annotation to the main props.annotations array via an emit
  const newAnnotations = [...props.annotations, annotation]
  emit('update:annotations', newAnnotations)
  // REMOVED: emit('annotation-completed', annotation) - This was causing the parent to add a duplicate
  emit('update:isAnnotating', false)
  
  // e. Set pendingAnnotation.value = null
  pendingAnnotation.value = null
  
  // Ensure static layer redraws to show the new annotation
  nextTick(() => {
    if (staticLayer.value) {
      staticLayer.value.getNode().batchDraw()
    }
  })
  
  console.log('✅ Annotation finalized with className:', className)
}

const resetAnnotationState = () => {
  startPointImperative = null
  currentPathImperative = []
  mousePositionImperative = null
  
  // Ensure the drawing flag is reset
  isDrawingNonReactive.value = false
  
  cleanupNonReactiveDrawing()
  
  // Reset pending annotation state
  pendingAnnotation.value = null
  
  // Reset drag flags
  isDraggingAnnotationNonReactive = false
  isDraggingAnnotation.value = false
  potentialDragStart = false
  
  // Emit that we're no longer annotating to hide the cancel button
  emit('update:isAnnotating', false)
  
  console.log('🔄 Reset all annotation state')
}

const completeCurrentAnnotation = () => {
  finishDrawing()
}

const cancelCurrentAnnotation = () => {
  resetAnnotationState()
}

// Annotation node refs for caching
const annotationRefs = ref<Record<string, any>>({})

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

// Annotation state - REFACTORED: Only essential reactive state remains
const selectedAnnotationIndex = ref<number | null>(null)
const hoveredAnnotationIndex = ref<number | null>(null)

// Part 1: Restore Core Functionality - The State Machine
const pendingAnnotation = ref<CanvasAnnotation | null>(null)

// Drag state tracking
const isDraggingAnnotation = ref(false)

// Part 2: Fix Drag vs. Draw Confusion - Non-reactive flag
let isDraggingAnnotationNonReactive = false

// Track if we're in the middle of potentially starting a drag
let potentialDragStart = false

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
  
  return {
    image: imageObj.value,
    x: imageOffset.value.x,
    y: imageOffset.value.y,
    width: displayImageSize.value.width,
    height: displayImageSize.value.height,
    listening: false
  }
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
    a.points.length > 10
  ).length
})

// PART 4: Memoized annotation configs for INP performance optimization
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
    
    img.onload = () => {
      originalImageSize.value = { width: img.width, height: img.height }
      
      const canvasAspect = stageSize.value.width / stageSize.value.height
      const imageAspect = img.width / img.height
      
      let targetWidth, targetHeight
      
      if (imageAspect > canvasAspect) {
        targetWidth = stageSize.value.width
        targetHeight = stageSize.value.width / imageAspect
      } else {
        targetHeight = stageSize.value.height
        targetWidth = stageSize.value.height * imageAspect
      }
      
      imageOffset.value = {
        x: (stageSize.value.width - targetWidth) / 2,
        y: (stageSize.value.height - targetHeight) / 2
      }
      
      displayImageSize.value = {
        width: targetWidth,
        height: targetHeight
      }
      
      imageScale.value = targetWidth / img.width
      imageObj.value = img
      
      if (imageLayer.value) {
        imageLayer.value.getNode().batchDraw()
      }
      resolve()
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

// Coordinate conversion utilities
const canvasToOriginal = (canvasPoint: { x: number; y: number }) => {
  // This function now correctly assumes the input point has already been
  // adjusted for stage pan and zoom, which our drawing logic does.
  // It only needs to handle the initial image offset and scaling.
  return {
    x: (canvasPoint.x - imageOffset.value.x) / imageScale.value,
    y: (canvasPoint.y - imageOffset.value.y) / imageScale.value
  }
}

const originalToCanvas = (point: { x: number; y: number }) => {
  // This function should only convert from original image coordinates to the
  // base, un-transformed canvas coordinates. Konva will handle the stage's
  // pan and zoom automatically when it renders the shape.
  return {
    x: point.x * imageScale.value + imageOffset.value.x,
    y: point.y * imageScale.value + imageOffset.value.y
  }
}

// Helper function to determine if annotation coordinates are already in canvas space
// Fresh annotations from finishDrawing are in canvas space, loaded annotations are converted to canvas space
const isCanvasCoordinates = (annotation: CanvasAnnotation) => {
  // All annotations from our current system are now in canvas space
  // (either fresh from finishDrawing or converted via convertApiAnnotationToCanvas)
  return true
}

// Identity function for coordinates that are already in canvas space
const canvasToCanvas = (point: { x: number; y: number }) => point

// Choose the appropriate conversion function based on coordinate space
const getCoordinateConverter = (annotation: CanvasAnnotation) => {
  return isCanvasCoordinates(annotation) ? canvasToCanvas : originalToCanvas
}

// Helper function to calculate inverse scale for UI elements
const getUIScale = () => 1 / stageScale.value

// Helper function to convert pointer position to canvas coordinates
const getCanvasPointerPosition = (stageNode: any) => {
  const pointer = stageNode.getPointerPosition()
  if (!pointer) return null
  
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

// Use the composables for annotation configuration
const { createRectangleConfig } = useRectConfig()
const { createPolygonConfig } = usePolygonConfig()
const { createCircleConfig } = useCircleConfig()
const { createDotConfig } = useDotConfig()
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

const getRectConfig = (annotation: CanvasAnnotation, index: number) => {
  // Since all annotations are now in canvas coordinates, use them directly
  if (!annotation.startPoint || annotation.width === undefined || annotation.height === undefined) {
    return {}
  }

  const isSelected = selectedAnnotationIndex.value === index
  const isHovered = hoveredAnnotationIndex.value === index
  const uiScale = getUIScale()

  return {
    x: annotation.startPoint.x,
    y: annotation.startPoint.y,
    width: annotation.width,
    height: annotation.height,
    stroke: isSelected ? '#4285f4' : (isHovered ? '#34a853' : '#00c851'),
    strokeWidth: (isSelected ? 3 : (isHovered ? 2.5 : 2)) * uiScale,
    fill: isSelected ? 'rgba(66, 133, 244, 0.1)' : (isHovered ? 'rgba(52, 168, 83, 0.05)' : 'transparent'),
    draggable: true,
    listening: true,
    perfectDrawEnabled: false
  }
}

const getPolygonConfig = (annotation: CanvasAnnotation, index: number) => {
  // Since all annotations are now in canvas coordinates, use them directly
  if (!annotation.points || annotation.points.length === 0) {
    return {}
  }

  const isSelected = selectedAnnotationIndex.value === index
  const isHovered = hoveredAnnotationIndex.value === index
  const uiScale = getUIScale()

  // Convert points array to flat array for Konva
  const flatPoints: number[] = []
  for (const point of annotation.points) {
    flatPoints.push(point.x, point.y)
  }

  const config = {
    points: flatPoints,
    stroke: isSelected ? '#4285f4' : (isHovered ? '#34a853' : '#00c851'),
    strokeWidth: (isSelected ? 3 : (isHovered ? 2.5 : 2)) * uiScale,
    fill: isSelected ? 'rgba(66, 133, 244, 0.1)' : (isHovered ? 'rgba(52, 168, 83, 0.05)' : 'transparent'),
    closed: true,
    draggable: true,
    listening: true,
    lineCap: 'round',
    lineJoin: 'round',
    visible: polygonLayerVisible.value
  } as any

  const totalPolygons = polygonCount.value
  const isComplex = annotation.points && annotation.points.length > 10

  if (totalPolygons >= 8 || isComplex) {
    config.perfectDrawEnabled = false

    if (totalPolygons >= 12) {
      config.listening = selectedAnnotationIndex.value === index
    } else {
      config.listening = !isPerformanceMode.value && (selectedAnnotationIndex.value === index || hoveredAnnotationIndex.value === index)
    }

    if (totalPolygons >= 15) {
      config.shadowEnabled = false
      config.hitStrokeWidth = 0
    }
  }

  return config
}

const getLineConfig = (annotation: CanvasAnnotation, index: number) => {
  // Since all annotations are now in canvas coordinates, use them directly
  if (!annotation.startPoint || !annotation.endPoint) {
    return {}
  }

  const isSelected = selectedAnnotationIndex.value === index
  const isHovered = hoveredAnnotationIndex.value === index
  const uiScale = getUIScale()

  return {
    points: [annotation.startPoint.x, annotation.startPoint.y, annotation.endPoint.x, annotation.endPoint.y],
    stroke: isSelected ? '#4285f4' : (isHovered ? '#34a853' : '#00c851'),
    strokeWidth: (isSelected ? 3 : (isHovered ? 2.5 : 2)) * uiScale,
    lineCap: 'round',
    draggable: true,
    listening: true,
    perfectDrawEnabled: false
  }
}

const getCircleConfig = (annotation: CanvasAnnotation, index: number) => {
  // Since all annotations are now in canvas coordinates, use them directly
  if (!annotation.center || annotation.radius === undefined) {
    return {}
  }

  const isSelected = selectedAnnotationIndex.value === index
  const isHovered = hoveredAnnotationIndex.value === index
  const uiScale = getUIScale()

  return {
    x: annotation.center.x,
    y: annotation.center.y,
    radius: annotation.radius,
    stroke: isSelected ? '#4285f4' : (isHovered ? '#34a853' : '#00c851'),
    strokeWidth: (isSelected ? 3 : (isHovered ? 2.5 : 2)) * uiScale,
    fill: isSelected ? 'rgba(66, 133, 244, 0.1)' : (isHovered ? 'rgba(52, 168, 83, 0.05)' : 'transparent'),
    draggable: true,
    listening: true,
    perfectDrawEnabled: false
  }
}

const getDotConfig = (annotation: CanvasAnnotation, index: number) => {
  return createDotConfig(
    annotation,
    index,
    selectedAnnotationIndex.value,
    hoveredAnnotationIndex.value,
    canvasToCanvas, // Since annotations are in canvas coordinates
    1 // imageScale is 1 since we're already in canvas coordinates
  )
}

const getLabelConfig = (annotation: CanvasAnnotation, index: number) => {
  let position = { x: 0, y: 0 }
  const isSelected = selectedAnnotationIndex.value === index
  const uiScale = getUIScale()
  const padding = 4 * uiScale

  // Since all annotations are now in canvas coordinates, use them directly
  if (annotation.type === 'rectangle' && annotation.startPoint) {
    position = { x: annotation.startPoint.x, y: annotation.startPoint.y }
    position.y -= 20 * uiScale // Increased spacing from annotation
  } else if (annotation.type === 'polygon' && annotation.points && annotation.points.length > 0) {
    const firstPoint = annotation.points[0]
    if (firstPoint) {
      position = { x: firstPoint.x, y: firstPoint.y }
      position.y -= 20 * uiScale // Increased spacing from annotation
    }
  } else if (annotation.type === 'dot' && annotation.center) {
    position = { x: annotation.center.x, y: annotation.center.y }
    position.y -= (annotation.radius || 5) + 20 * uiScale // Increased spacing from annotation
  } else if (annotation.type === 'line' && annotation.startPoint) {
    position = { x: annotation.startPoint.x, y: annotation.startPoint.y }
    position.y -= 20 * uiScale // Added line support
  } else if (annotation.type === 'circle' && annotation.center) {
    position = { x: annotation.center.x, y: annotation.center.y - (annotation.radius || 5) - 20 * uiScale }
  } else if (annotation.type === 'freehand' && annotation.points && annotation.points.length > 0) {
    const firstPoint = annotation.points[0]
    if (firstPoint) {
      position = { x: firstPoint.x, y: firstPoint.y }
      position.y -= 20 * uiScale // Added freehand support
    }
  }

  // Clean, readable text styling
  return {
    x: position.x + padding,
    y: position.y + padding,
    text: annotation.className || 'Unlabeled',
    fontSize: 12 * uiScale, // Normal font size
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'normal', // Normal weight instead of bold
    // Dark text for better readability on light background
    fill: isSelected ? '#ffffff' : '#333333',
    // No stroke for cleaner appearance
    stroke: '',
    strokeWidth: 0,
    // No shadow for cleaner appearance
    listening: false,
    perfectDrawEnabled: false,
    // Text alignment for better positioning
    align: 'left',
    verticalAlign: 'top'
  }
}

const getLabelBackgroundConfig = (annotation: CanvasAnnotation, index: number) => {
  const labelConfig = getLabelConfig(annotation, index)
  const isSelected = selectedAnnotationIndex.value === index
  const uiScale = getUIScale()
  
  // Calculate text dimensions for background sizing
  const text = annotation.className || 'Unlabeled'
  const fontSize = 12 * uiScale
  const padding = 4 * uiScale
  
  // More accurate text width calculation based on character count and font size
  const avgCharWidth = fontSize * 0.6 // Adjusted for normal font weight
  const textWidth = Math.max(text.length * avgCharWidth, fontSize * 2) // Minimum width
  const textHeight = fontSize * 1.1 // Line height
  
  return {
    x: labelConfig.x - padding,
    y: labelConfig.y - padding,
    width: textWidth + (padding * 2),
    height: textHeight + (padding * 2),
    // Clean, simple background - light for readability
    fill: isSelected ? 'rgba(66, 133, 244, 0.9)' : 'rgba(255, 255, 255, 0.9)',
    // Simple border
    stroke: isSelected ? '#4285f4' : '#cccccc',
    strokeWidth: 1 * uiScale,
    cornerRadius: 3 * uiScale, // Small rounded corners
    // Subtle shadow for depth
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowBlur: 2 * uiScale,
    shadowOffsetX: 1 * uiScale,
    shadowOffsetY: 1 * uiScale,
    listening: false,
    perfectDrawEnabled: false
  }
}

const getFreehandConfig = (annotation: CanvasAnnotation, index: number) => {
  // Since all annotations are now in canvas coordinates, use them directly
  if (!annotation.points || annotation.points.length === 0) {
    return {}
  }

  const isSelected = selectedAnnotationIndex.value === index
  const isHovered = hoveredAnnotationIndex.value === index
  const uiScale = getUIScale()

  // Convert points array to flat array for Konva
  const flatPoints: number[] = []
  for (const point of annotation.points) {
    flatPoints.push(point.x, point.y)
  }

  const config = {
    points: flatPoints,
    stroke: isSelected ? '#4285f4' : (isHovered ? '#34a853' : '#00c851'),
    strokeWidth: (isSelected ? 3 : (isHovered ? 2.5 : 2)) * uiScale,
    fill: 'transparent',
    closed: false,
    draggable: true,
    listening: true,
    lineCap: 'round',
    lineJoin: 'round',
    tension: 0.3,
    visible: polygonLayerVisible.value
  } as any

  const totalPolygons = polygonCount.value
  const isComplex = annotation.points && annotation.points.length > 15

  if (totalPolygons >= 6 || isComplex) {
    config.perfectDrawEnabled = false

    if (isComplex) {
      config.tension = 0.1
    }

    if (totalPolygons >= 10) {
      config.listening = selectedAnnotationIndex.value === index
    } else {
      config.listening = !isPerformanceMode.value && (selectedAnnotationIndex.value === index || hoveredAnnotationIndex.value === index)
    }

    if (totalPolygons >= 12) {
      config.shadowEnabled = false
      config.hitStrokeWidth = 0
    }
  }

  return config
}

// PART 2: Function to create pretty vertex dots for completed polygons (expensive styles only for selected)
const getCompletedVertexConfig = (point: { x: number; y: number }, pointIndex: number, totalPoints: number) => {
  // Since annotation coordinates are now in canvas space, use identity conversion
  const canvasPoint = canvasToCanvas(point)
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
    strokeScaleEnabled: false,
    perfectDrawEnabled: true
  }
}

// PART 1: UNIFIED EVENT HANDLERS - All tools use imperative model
const handleStageMouseDown = (e: any) => {
  // Part 2: Fix Drag vs. Draw Confusion - Prevent new shapes when dragging
  if (isDraggingAnnotationNonReactive) {
    return
  }
  
  const stageNode = e.target.getStage()
  const pointer = stageNode.getPointerPosition()
  
  if (!pointer) return
  
  // CRITICAL FIX: Check if mouse down is on an annotation element
  // If the target is not the stage itself, it means we clicked on an annotation
  const clickedOnAnnotation = e.target !== stageNode
  
  // Additional check: if target has certain node types that indicate annotation elements
  const isAnnotationElement = clickedOnAnnotation && (
    e.target.getClassName() === 'Rect' ||
    e.target.getClassName() === 'Circle' ||
    e.target.getClassName() === 'Line' ||
    e.target.getClassName() === 'Text'
  )
  
  if (props.currentTool === 'select') {
    const clickedOnEmpty = e.target === stageNode
    if (clickedOnEmpty) {
      selectedAnnotationIndex.value = null
      showAnnotationTools.value = false
      updateTransformer()
    }
    return
  }
  
  // CRITICAL FIX: If we clicked on an annotation (not the stage), don't start drawing
  if (isAnnotationElement) {
    console.log('🎯 Clicked on annotation element:', e.target.getClassName(), 'preventing new shape creation')
    
    // Set a flag to indicate we might be starting a drag operation
    potentialDragStart = true
    
    // Clear the flag after a short delay if no drag actually starts
    setTimeout(() => {
      if (!isDraggingAnnotationNonReactive) {
        potentialDragStart = false
      }
    }, 50)
    
    return
  }
  
  // Don't start drawing if we're potentially about to start dragging
  if (potentialDragStart) {
    console.log('🎯 Potential drag in progress, preventing new shape creation')
    return
  }
  
  if (!isPointInImageBounds(pointer)) {
    return
  }
  
  const transform = stageNode.getAbsoluteTransform().copy().invert()
  const canvasPos = transform.point(pointer)
  
  // UNIFIED IMPERATIVE APPROACH: All tools now use direct Konva node creation
  if (activeLayer.value && process.client) {
    const Konva = (window as any).Konva
    if (!Konva) return
    
    isDrawingNonReactive.value = true
    startPointImperative = canvasPos
    mousePositionImperative = canvasPos
    
    if (props.currentTool === 'polygon') {
      if (!props.isAnnotating) {
        currentPathImperative = [canvasPos]
        
        pathNode = new Konva.Line({
          points: [canvasPos.x, canvasPos.y],
          stroke: '#4285f4',
          strokeWidth: 3,
          fill: 'rgba(66, 133, 244, 0.1)',
          closed: false,
          listening: false,
          lineCap: 'round',
          lineJoin: 'round'
        })
        
        ghostLineNode = new Konva.Line({
          points: [canvasPos.x, canvasPos.y, canvasPos.x, canvasPos.y],
          stroke: '#4285f4',
          strokeWidth: 3,
          fill: 'transparent',
          closed: false,
          listening: false,
          lineCap: 'round',
          dash: [5, 5]
        })
        
        vertexGroup = new Konva.Group()
        
        const firstVertex = new Konva.Circle({
          x: canvasPos.x,
          y: canvasPos.y,
          radius: 6, // Slightly larger for easier targeting
          fill: '#ff4444',
          stroke: '#4285f4',
          strokeWidth: 2,
          listening: false
        })
        
        vertexGroup.add(firstVertex)
        
        activeLayer.value.getNode().add(pathNode)
        activeLayer.value.getNode().add(ghostLineNode)
        activeLayer.value.getNode().add(vertexGroup)
        activeLayer.value.getNode().batchDraw()
        
        emit('update:isAnnotating', true)
        console.log('🎯 Started polygon with unified imperative approach')
      } else {
        // Check if click is near the first vertex to complete polygon
        if (currentPathImperative.length >= 3 && isNearFirstVertex(canvasPos)) {
          console.log('🎯 Clicked near first vertex, completing polygon')
          finishDrawing()
          return
        }
        
        if (pathNode && ghostLineNode && vertexGroup) {
          const currentPathPoints = pathNode.points() || []
          const newPathPoints = [...currentPathPoints, canvasPos.x, canvasPos.y]
          pathNode.points(newPathPoints)
          
          currentPathImperative.push(canvasPos)
          ghostLineNode.points([canvasPos.x, canvasPos.y, canvasPos.x, canvasPos.y])
          
          const newVertex = new Konva.Circle({
            x: canvasPos.x,
            y: canvasPos.y,
            radius: 4,
            fill: '#ffffff',
            stroke: '#4285f4',
            strokeWidth: 2,
            listening: false
          })
          
          vertexGroup.add(newVertex)
          activeLayer.value.getNode().batchDraw()
          
          console.log(`🎯 Added point to polygon: ${currentPathImperative.length} vertices`)
        }
      }
      return
    }
    
    if (props.currentTool === 'freehand') {
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
      
      activeLayer.value.getNode().add(currentShapeNode)
      activeLayer.value.getNode().batchDraw()
      
      slidingBufferOptimizer.reset()
      currentPathImperative = [canvasPos]
      
      emit('update:isAnnotating', true)
      console.log('🎯 Starting freehand with unified imperative approach')
      return
    }
    
    if (props.currentTool === 'rectangle') {
      currentShapeNode = new Konva.Rect({
        x: canvasPos.x,
        y: canvasPos.y,
        width: 0,
        height: 0,
        stroke: '#4285f4',
        strokeWidth: 2,
        fill: 'rgba(66, 133, 244, 0.1)',
        dash: [5, 5],
        listening: false
      })
      
      activeLayer.value.getNode().add(currentShapeNode)
      activeLayer.value.getNode().batchDraw()
      
      emit('update:isAnnotating', true)
      console.log('🎯 Starting rectangle with unified imperative approach')
      return
    }
    
    if (props.currentTool === 'circle') {
      currentShapeNode = new Konva.Circle({
        x: canvasPos.x,
        y: canvasPos.y,
        radius: 0,
        stroke: '#4285f4',
        strokeWidth: 2,
        fill: 'rgba(66, 133, 244, 0.1)',
        dash: [5, 5],
        listening: false
      })
      
      activeLayer.value.getNode().add(currentShapeNode)
      activeLayer.value.getNode().batchDraw()
      
      emit('update:isAnnotating', true)
      console.log('🎯 Starting circle with unified imperative approach')
      return
    }
    
    if (props.currentTool === 'line') {
      currentShapeNode = new Konva.Line({
        points: [canvasPos.x, canvasPos.y, canvasPos.x, canvasPos.y],
        stroke: '#4285f4',
        strokeWidth: 3,
        listening: false,
        lineCap: 'round',
        dash: [5, 5]
      })
      
      activeLayer.value.getNode().add(currentShapeNode)
      activeLayer.value.getNode().batchDraw()
      
      emit('update:isAnnotating', true)
      console.log('🎯 Starting line with unified imperative approach')
      return
    }
    
    if (props.currentTool === 'dot') {
      // Dots are single-click annotations - show immediately and complete
      const defaultRadius = 5 // 5 pixels in canvas units
      
      currentShapeNode = new Konva.Circle({
        x: canvasPos.x,
        y: canvasPos.y,
        radius: defaultRadius,
        stroke: '#ff4444',
        strokeWidth: 1,
        fill: '#ff4444',
        listening: false
      })
      
      activeLayer.value.getNode().add(currentShapeNode)
      activeLayer.value.getNode().batchDraw()
      
      // For dots, we want to show the visual immediately but not clean up the node
      // until after class selection is complete
      emit('update:isAnnotating', true)
      
      // Complete the annotation immediately since dots are single-click
      finishDrawing()
      
      console.log('🎯 Created dot annotation with unified imperative approach')
      return
    }
  }
}

const handleStageMouseMove = (e: any) => {
  const stageNode = e.target.getStage()
  const pointer = stageNode.getPointerPosition()
  
  if (!pointer) return
  
  const mouseTransform = stageNode.getAbsoluteTransform().copy().invert()
  const mouseCanvasPos = mouseTransform.point(pointer)
  mousePositionImperative = mouseCanvasPos
  
  // ULTRA-HIGH-PERFORMANCE PATH: Direct Konva node updates for all tools
  if (isDrawingNonReactive.value) {
    const clampedCanvasPos = {
      x: Math.max(imageOffset.value.x, Math.min(mouseCanvasPos.x, imageOffset.value.x + displayImageSize.value.width)),
      y: Math.max(imageOffset.value.y, Math.min(mouseCanvasPos.y, imageOffset.value.y + displayImageSize.value.height))
    }
    
    if (props.currentTool === 'freehand' && currentShapeNode) {
      // Direct point addition for true freehand experience (bypass optimizer)
      const currentPoints = currentShapeNode.points()
      const newPoints = [...currentPoints, clampedCanvasPos.x, clampedCanvasPos.y]
      
      currentShapeNode.points(newPoints)
      activeLayer.value?.getNode().batchDraw()
      
      const pathPoints = []
      for (let i = 0; i < newPoints.length - 1; i += 2) {
        pathPoints.push({ x: newPoints[i]!, y: newPoints[i + 1]! })
      }
      currentPathImperative = pathPoints
    } else if (props.currentTool === 'polygon' && ghostLineNode) {
      const ghostPoints = ghostLineNode.points()
      if (ghostPoints.length >= 2) {
        ghostLineNode.points([ghostPoints[0], ghostPoints[1], clampedCanvasPos.x, clampedCanvasPos.y])
        
        // Visual feedback when hovering near the first vertex
        if (currentPathImperative.length >= 3 && isNearFirstVertex(clampedCanvasPos)) {
          // Change the first vertex appearance to indicate it can be clicked to finish
          const firstVertex = vertexGroup?.children?.[0]
          if (firstVertex) {
            firstVertex.fill('#00ff00') // Green color to indicate completion target
            firstVertex.radius(8) // Larger radius
          }
        } else {
          // Reset first vertex appearance
          const firstVertex = vertexGroup?.children?.[0]
          if (firstVertex) {
            firstVertex.fill('#ff4444') // Original red color
            firstVertex.radius(6) // Original radius
          }
        }
        
        activeLayer.value?.getNode().batchDraw()
      }
    } else if (props.currentTool === 'rectangle' && currentShapeNode && startPointImperative) {
      // Part 2: Fix Rectangle Drawing - Properly update width and height
      const width = clampedCanvasPos.x - startPointImperative.x
      const height = clampedCanvasPos.y - startPointImperative.y
      
      currentShapeNode.x(Math.min(startPointImperative.x, clampedCanvasPos.x))
      currentShapeNode.y(Math.min(startPointImperative.y, clampedCanvasPos.y))
      currentShapeNode.width(Math.abs(width))
      currentShapeNode.height(Math.abs(height))
      
      activeLayer.value?.getNode().batchDraw()
    } else if (props.currentTool === 'circle' && currentShapeNode && startPointImperative) {
      // Part 2: Fix Circle Drawing - Properly update radius based on distance
      const distance = Math.hypot(clampedCanvasPos.x - startPointImperative.x, clampedCanvasPos.y - startPointImperative.y)
      currentShapeNode.radius(distance)
      activeLayer.value?.getNode().batchDraw()
    } else if (props.currentTool === 'line' && currentShapeNode && startPointImperative) {
      // Part 2: Fix Line Drawing - Update end point
      currentShapeNode.points([startPointImperative.x, startPointImperative.y, clampedCanvasPos.x, clampedCanvasPos.y])
      activeLayer.value?.getNode().batchDraw()
    }
    
    return // Exit early to avoid any reactive overhead
  }
}

const handleStageMouseUp = (e: any) => {
  if (!isDrawingNonReactive.value) return
  
  // For polygon, don't complete on mouseup - wait for double-click or explicit completion
  if (props.currentTool === 'polygon') {
    return
  }
  
  // For dots, don't complete on mouseup - already completed in mousedown
  if (props.currentTool === 'dot') {
    return
  }
  
  // For all other tools, complete the drawing
  finishDrawing()
}

const handleStageClick = (e: any) => {
  // Polygon click handling is done in mousedown
}

const handleStageDoubleClick = (e: any) => {
  // Double-click functionality disabled for polygon
  // Polygon now finishes when clicking near the first vertex
}

// Placeholder functions for missing handlers (implement as needed)
const handleStageWheel = (e: any) => {
  // Part 3: Restore Canvas Interactions - Fix Zooming
  e.evt.preventDefault()
  
  if (!stage.value) return
  
  const stageNode = stage.value.getNode()
  const oldScale = stageNode.scaleX()
  const pointer = stageNode.getPointerPosition()
  
  if (!pointer) return
  
  const mousePointTo = {
    x: (pointer.x - stageNode.x()) / oldScale,
    y: (pointer.y - stageNode.y()) / oldScale,
  }
  
  // Determine new scale
  let direction = e.evt.deltaY > 0 ? -1 : 1
  
  // When we zoom on trackpad, e.evt.ctrlKey is true
  // in that case lets revert direction
  if (e.evt.ctrlKey) {
    direction = -direction
  }
  
  const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy
  
  // Constrain scale within bounds
  const clampedScale = Math.max(minScale.value, Math.min(maxScale.value, newScale))
  
  if (clampedScale === oldScale) return
  
  // Update reactive state
  stageScale.value = clampedScale
  
  const newPos = {
    x: pointer.x - mousePointTo.x * clampedScale,
    y: pointer.y - mousePointTo.y * clampedScale,
  }
  
  stagePosition.value = newPos
  
  // Set performance mode for complex scenes during zoom
  const shouldEnterPerformanceMode = polygonCount.value >= 8 || complexPolygonCount.value >= 3
  
  if (shouldEnterPerformanceMode && !isPerformanceMode.value) {
    isZooming.value = true
    
    if (zoomDebounceTimer) {
      clearTimeout(zoomDebounceTimer)
    }
    
    zoomDebounceTimer = window.setTimeout(() => {
      isZooming.value = false
      zoomDebounceTimer = null
    }, 300)
  }
  
  console.log(`🔍 Zoom: ${clampedScale.toFixed(2)}x at (${newPos.x.toFixed(0)}, ${newPos.y.toFixed(0)})`)
}

const handleStageDragStart = (e: any) => {
  // Part 3: Restore Canvas Interactions - Stage drag functionality
  if (props.currentTool === 'pan' || (props.currentTool === 'select' && selectedAnnotationIndex.value === null)) {
    isDraggingStage.value = true
    
    // Enter performance mode for complex scenes during stage drag
    const shouldEnterPerformanceMode = polygonCount.value >= 6 || complexPolygonCount.value >= 2
    
    if (shouldEnterPerformanceMode && !isPerformanceMode.value) {
      polygonLayerVisible.value = false
      console.log('🎯 Entered performance mode during stage drag')
    }
  }
}

const handleStageDragEnd = (e: any) => {
  // Part 3: Restore Canvas Interactions - Stage drag functionality
  if (isDraggingStage.value) {
    isDraggingStage.value = false
    
    // Update reactive position state
    if (stage.value) {
      const stageNode = stage.value.getNode()
      stagePosition.value = { x: stageNode.x(), y: stageNode.y() }
    }
    
    // Debounced performance mode exit
    if (dragDebounceTimer) {
      clearTimeout(dragDebounceTimer)
    }
    
    dragDebounceTimer = window.setTimeout(() => {
      if (!isZooming.value && !isDraggingStage.value) {
        polygonLayerVisible.value = true
        if (staticLayer.value) {
          staticLayer.value.getNode().batchDraw()
        }
      }
      dragDebounceTimer = null
    }, 200)
    
    console.log('🎯 Stage drag ended, position updated')
  }
}

const handleStageKeyDown = (e: any) => {
  // Keyboard shortcuts
  if (e.key === 'Enter' && isDrawingNonReactive.value) {
    finishDrawing()
  } else if (e.key === 'Escape') {
    if (isDrawingNonReactive.value) {
      cancelCurrentAnnotation()
    } else if (selectedAnnotationIndex.value !== null) {
      selectedAnnotationIndex.value = null
      showAnnotationTools.value = false
      updateTransformer()
    }
  }
}

// Placeholder annotation event handlers
const handleTransformEnd = (index: number, event: any) => {
  // Transform handling
}

const handleDragStart = (index: number, event: any) => {
  // Part 2: Fix Drag vs. Draw Confusion - Set flag when dragging starts
  // Set this flag IMMEDIATELY to prevent new shape creation
  isDraggingAnnotationNonReactive = true
  isDraggingAnnotation.value = true
  
  // Clear the potential drag flag since we're now actually dragging
  potentialDragStart = false
  
  // Prevent event bubbling to stage
  event.evt?.stopPropagation()
  
  console.log('🎯 Started dragging annotation', index)
}

const handleDragEnd = (index: number, event: any) => {
  // Part 2: Fix Drag vs. Draw Confusion - Clear flag when dragging ends
  isDraggingAnnotationNonReactive = false
  isDraggingAnnotation.value = false
  potentialDragStart = false // Reset potential drag flag
  
  // Since annotations are stored in canvas coordinates, we can work with node positions directly
  const annotation = props.annotations[index]
  if (!annotation) {
    console.warn('🎯 No annotation found at index', index)
    return
  }
  
  const node = event.target
  let updatedAnnotation: CanvasAnnotation = { ...annotation }
  
  // Since annotations are stored in canvas coordinates, we can use the node's position directly
  if (annotation.type === 'rectangle') {
    updatedAnnotation.startPoint = {
      x: node.x(),
      y: node.y()
    }
    // Width and height don't change during drag, only position
  } else if (annotation.type === 'circle' || annotation.type === 'dot') {
    updatedAnnotation.center = {
      x: node.x(),
      y: node.y()
    }
    // Radius doesn't change during drag, only position
  } else if (annotation.type === 'line') {
    // For lines, we need to update both start and end points by the same offset
    const points = node.points()
    if (points && points.length >= 4) {
      updatedAnnotation.startPoint = {
        x: node.x() + points[0],
        y: node.y() + points[1]
      }
      updatedAnnotation.endPoint = {
        x: node.x() + points[2],
        y: node.y() + points[3]
      }
    }
  } else if (annotation.type === 'polygon' || annotation.type === 'freehand') {
    // For polygons and freehand, we need to update all points by the same offset
    const points = node.points()
    if (points && points.length >= 2 && annotation.points) {
      const newPoints: { x: number; y: number }[] = []
      for (let i = 0; i < points.length - 1; i += 2) {
        newPoints.push({
          x: node.x() + points[i]!,
          y: node.y() + points[i + 1]!
        })
      }
      updatedAnnotation.points = newPoints
    }
  }
  
  // Reset the node's position to 0,0 since we've incorporated the offset into the coordinates
  node.x(0)
  node.y(0)
  
  // Update the annotations array
  const newAnnotations = [...props.annotations]
  newAnnotations[index] = updatedAnnotation
  
  console.log('🎯 Drag end - Updated annotation:', updatedAnnotation.type, 'at index:', index)
  
  emit('update:annotations', newAnnotations)
  emit('annotation-updated', updatedAnnotation, index)
  
  // Force a recomputation of annotation configs
  nextTick(() => {
    if (staticLayer.value) {
      staticLayer.value.getNode().batchDraw()
    }
  })
  
  console.log('🎯 Finished dragging annotation', index)
}

const handleAnnotationClick = (index: number, event: any) => {
  selectedAnnotationIndex.value = index
}

const handleAnnotationMouseOver = (index: number) => {
  hoveredAnnotationIndex.value = index
}

const handleAnnotationMouseOut = (index: number) => {
  hoveredAnnotationIndex.value = null
}

// Transformer update function
const updateTransformer = () => {
  if (!transformerInstance) return
  
  if (selectedAnnotationIndex.value !== null) {
    const annotation = props.annotations[selectedAnnotationIndex.value]
    if (annotation) {
      const cacheKey = `${annotation.type}-${selectedAnnotationIndex.value}`
      const node = annotationRefs.value[cacheKey]
      if (node) {
        transformerInstance.nodes([node])
      } else {
        transformerInstance.nodes([])
      }
    } else {
      transformerInstance.nodes([])
    }
  } else {
    transformerInstance.nodes([])
  }
  
  activeLayer.value?.getNode().batchDraw()
}

// Placeholder UI functions
const editAnnotation = () => {
  // Edit functionality
}

const deleteAnnotation = () => {
  // Delete functionality
}

const duplicateAnnotation = () => {
  // Duplicate functionality
}

const getBufferStatus = () => {
  return `${currentPathImperative.length} pts`
}

// Performance optimization functions
const enterPerformanceMode = () => {
  isPerformanceMode.value = true
  polygonLayerVisible.value = false
  polygonPerformanceMonitor.setPerformanceMode(true)
}

const exitPerformanceMode = () => {
  isPerformanceMode.value = false
  polygonLayerVisible.value = true
  polygonPerformanceMonitor.setPerformanceMode(false)
}

// Watchers - REFACTORED: Removed deep watchers for maximum performance
watch(() => props.annotations, (newAnnotations, oldAnnotations) => {
  console.log('🎯 ANNOTATIONS CHANGED!')
  console.log('🎯 Old count:', oldAnnotations?.length || 0)
  console.log('🎯 New count:', newAnnotations?.length || 0)
  console.log('🎯 New annotations:', newAnnotations)
  
  if (newAnnotations && oldAnnotations && newAnnotations.length !== oldAnnotations.length) {
    console.log('🔥 ANNOTATION COUNT CHANGED! This might be the source of duplication')
  }
}, { immediate: false })

watch(() => props.imageUrl, async (newUrl) => {
  if (newUrl) {
    try {
      await loadImage(newUrl)
    } catch (error) {
      console.error('Failed to load image:', error)
    }
  }
}, { immediate: true })

watch(selectedAnnotationIndex, () => {
  nextTick(() => {
    updateTransformer()
  })
})

watch(() => props.currentTool, (newTool, oldTool) => {
  // Part 2: Fix the Polygon "Second Use" Bug - Ensure proper cleanup
  if (isDrawingNonReactive.value && (oldTool === 'polygon' || oldTool === 'freehand')) {
    const flatPoints = currentShapeNode?.points() || (pathNode?.points() || [])
    if (flatPoints && flatPoints.length >= 4) {
      console.log(`🎯 Auto-finishing ${oldTool} drawing due to tool change`)
      finishDrawing()
    } else {
      console.log(`🧹 Cleaning up incomplete ${oldTool} drawing due to tool change`)
      cleanupNonReactiveDrawing()
    }
  } else if (isDrawingNonReactive.value) {
    // For other tools, always cleanup to prevent state leakage
    console.log(`🧹 Cleaning up ${oldTool} drawing due to tool change to ${newTool}`)
    cleanupNonReactiveDrawing()
  }
  
  // Ensure annotation state is reset when changing tools
  emit('update:isAnnotating', false)
})

// Lifecycle
onMounted(async () => {
  slidingBufferOptimizer.updateConfig(PerformancePresets.BALANCED)
  console.log('🎯 Sliding buffer optimizer initialized with BALANCED preset')
  
  try {
    await workerManager.initialize()
    console.log('🔧 Polygon simplification worker ready')
  } catch (error) {
    console.warn('🔧 Could not initialize polygon worker, using fallback:', error)
  }
  
  if (props.imageUrl) {
    loadImage(props.imageUrl).catch(error => {
      console.error('KonvaAnnotationCanvas: Manual image load failed:', error)
    })
  }
  
  nextTick(() => {
    initializeTransformer()
  })
})

onUnmounted(() => {
  cleanupNonReactiveDrawing()
  
  if (transformerInstance) {
    transformerInstance.destroy()
    transformerInstance = null
  }
  
  // Clean up all timers
  if (zoomDebounceTimer) {
    clearTimeout(zoomDebounceTimer)
  }
  if (dragDebounceTimer) {
    clearTimeout(dragDebounceTimer)
  }
  if (cacheUpdateTimer) {
    clearTimeout(cacheUpdateTimer)
  }
})

// Expose methods to parent
defineExpose({
  completeCurrentAnnotation,
  cancelCurrentAnnotation,
  finishDrawing,
  finalizeAnnotation, // Part 1: Expose the Finalizer
  getImageScale: () => imageScale.value,
  getImageOffset: () => imageOffset.value,
  getOriginalImageSize: () => originalImageSize.value,
  getDisplayImageSize: () => displayImageSize.value,
  isPointInBounds: isPointInImageBounds,
  convertToOriginal: canvasToOriginal,
  convertToDisplay: originalToCanvas,
  getStageScale: () => stageScale.value,
  getStagePosition: () => stagePosition.value,
  getPerformanceMode: () => isPerformanceMode.value,
  setPerformanceMode: (enabled: boolean) => {
    if (enabled) {
      enterPerformanceMode()
    } else {
      exitPerformanceMode()
    }
  }
})
</script>