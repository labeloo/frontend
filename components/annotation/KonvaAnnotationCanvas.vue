<template>
  <div class="w-full h-full flex items-center justify-center">
    <ClientOnly>
      <div ref="stageContainer" class="relative border border-stock-400 rounded-none ">
        <!-- Performance Indicator -->
        <div 
          v-if="isPerformanceMode" 
          class="absolute top-2 right-2 bg-ink-o text-stock-50 px-2 py-1 rounded text-xs font-bold z-10 pointer-events-none"
        >
          PERFORMANCE MODE
        </div>
        
        <!-- Sliding Buffer Status -->
    <div 
      v-if="props.currentTool === 'freehand' && isDrawingNonReactive" 
      class="absolute top-2 left-2 bg-reflex-600 text-stock-50 px-2 py-1 rounded text-xs font-mono z-10 pointer-events-none"
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
      @contextmenu="handleContextMenu"
      tabindex="0"
    >
    <!-- Background layer for image -->
    <v-layer ref="imageLayer">
      <!-- Loading is said once, in the page's own language, not painted onto
           the plate in coloured debug text. -->
      <v-image
        v-if="imageObj"
        :config="imageConfig"
      />

      <!-- Registration crosses at the plate's corners. Drawn on the canvas
           rather than over it, so they zoom and pan with the image the way
           printed marks stay with the sheet. -->
      <template v-if="imageObj && originalImageSize.width > 0">
        <v-line
          v-for="(seg, i) in registrationMarks"
          :key="`reg-${i}`"
          :config="seg"
        />
      </template>
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
          @dragmove="handleDragMove(index, $event)"
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
          @dragmove="handleDragMove(index, $event)"
          @dragend="handleDragEnd(index, $event)"
          @click="handleAnnotationClick(index, $event)"
          @mouseover="handleAnnotationMouseOver(index)"
          @mouseout="handleAnnotationMouseOut(index)"
        />
        
        <!--
          Insert handles first so real vertices sit on top of them: where a
          corner and an edge midpoint land close together, the corner must win
          the click.
        -->
        <template v-if="annotation.type === 'polygon' && selectedAnnotationIndex === index && annotation.points">
          <v-circle
            v-for="mid in midpointHandles(annotation.points)"
            :key="`mid-${index}-${mid.insertIndex}`"
            :config="getMidpointDotConfig(mid.point, index)"
            @click="handleMidpointClick(index, mid, $event)"
            @dragstart="handleMidpointDragStart(index, mid, $event)"
            @dragmove="handleVertexDragMove(index, mid.insertIndex, $event)"
            @dragend="handleVertexDragEnd(index, mid.insertIndex, $event)"
          />
          <v-circle
            v-for="{ point, originalIndex } in vertexHandles(annotation.points)"
            :key="`vertex-${index}-${originalIndex}`"
            :config="getVertexDotConfig(point, originalIndex, annotation.points.length, true, index)"
            @dragstart="handleVertexDragStart(index, originalIndex, $event)"
            @dragmove="handleVertexDragMove(index, originalIndex, $event)"
            @dragend="handleVertexDragEnd(index, originalIndex, $event)"
          />
        </template>

        <!-- Dot annotations -->
        <v-circle
          v-if="annotation.type === 'dot'"
          :ref="(el: any) => { if (el) annotationRefs[`dot-${index}`] = el.getNode() }"
          :config="annotationConfigs[index]?.config || getDotConfig(annotation, index)"
          @transformend="handleTransformEnd(index, $event)"
          @dragstart="handleDragStart(index, $event)"
          @dragmove="handleDragMove(index, $event)"
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
          @dragmove="handleDragMove(index, $event)"
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
          @dragmove="handleDragMove(index, $event)"
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
          @dragmove="handleDragMove(index, $event)"
          @dragend="handleDragEnd(index, $event)"
          @click="handleAnnotationClick(index, $event)"
          @mouseover="handleAnnotationMouseOver(index)"
          @mouseout="handleAnnotationMouseOut(index)"
        />
        
        <!-- Pretty vertex dots for selected freehand (with pagination for performance) -->
        <template v-if="annotation.type === 'freehand' && selectedAnnotationIndex === index && annotation.points">
          <v-circle
            v-for="{ point, originalIndex } in vertexHandles(annotation.points)"
            :key="`freehand-vertex-${index}-${originalIndex}`"
            :config="getVertexDotConfig(point, originalIndex, annotation.points.length, true, index)"
            @dragstart="handleVertexDragStart(index, originalIndex, $event)"
            @dragmove="handleVertexDragMove(index, originalIndex, $event)"
            @dragend="handleVertexDragEnd(index, originalIndex, $event)"
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
    
    <!-- Magic Stick Layer -->
    <v-layer ref="magicLayer" :config="{ visible: props.currentTool === 'magic' }">
      <!--
        Transparent hit blocker so clicks land on the magic tool instead of on the
        annotations underneath. It carries no handler of its own: the event bubbles
        to the stage, which is the single place magic clicks are handled.
      -->
      <v-rect :config="magicOverlayConfig" />

      <!-- Live mask preview under the cursor -->
      <v-line v-if="magicPreviewPoints.length >= 6" :config="magicPreviewConfig" />
      
      <v-group 
        v-for="(point, index) in magicPoints" 
        :key="`magic-point-${index}`" 
        :config="{ x: point.x, y: point.y }"
      >
        <!-- Main colored dot -->
        <v-circle
          :config="{
            radius: 8,
            fill: point.polar ? '#22c55e' : '#ef4444',
            stroke: 'white',
            strokeWidth: 2,
            shadowColor: 'black',
            shadowBlur: 4,
            shadowOpacity: 0.4,
            shadowOffset: { x: 1, y: 1 },
            listening: false
          }"
        />
        
        <!-- Plus icon for include -->
        <v-group v-if="point.polar" :config="{ listening: false }">
          <v-line
            :config="{
              points: [-4, 0, 4, 0],
              stroke: 'white',
              strokeWidth: 2.5,
              lineCap: 'round',
              listening: false
            }"
          />
          <v-line
            :config="{
              points: [0, -4, 0, 4],
              stroke: 'white',
              strokeWidth: 2.5,
              lineCap: 'round',
              listening: false
            }"
          />
        </v-group>
        
        <!-- Minus icon for exclude -->
        <v-line
          v-if="!point.polar"
          :config="{
            points: [-4, 0, 4, 0],
            stroke: 'white',
            strokeWidth: 2.5,
            lineCap: 'round',
            listening: false
          }"
        />
      </v-group>
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
    class="absolute bg-stock-100 rounded-none  p-2 flex space-x-2 z-10 transition-opacity duration-200 border border-stock-400"
    :style="{
      left: `${annotationToolsPosition.x}px`,
      top: `${annotationToolsPosition.y}px`,
    }"
  >
    <button
      @click="editAnnotation"
      class="p-2 rounded-full hover:bg-stock-200 text-reflex-600 transition-colors"
      title="Edit"
    >
      <UIcon name="i-heroicons-pencil" class="w-5 h-5" />
    </button>
    <button
      @click="deleteAnnotation"
      class="p-2 rounded-full hover:bg-stock-200 text-correct-500 transition-colors"
      title="Delete"
    >
      <UIcon name="i-heroicons-trash" class="w-5 h-5" />
    </button>
    <button
      @click="duplicateAnnotation"
      class="p-2 rounded-full hover:bg-stock-200 text-ink-g transition-colors"
      title="Duplicate"
    >
      <UIcon name="i-heroicons-document-duplicate" class="w-5 h-5" />
    </button>
  </div>
  
  <!--
    Degraded rendering is worth telling the annotator, because shapes are being
    simplified under their hands. It is one quiet line of furniture, not a
    coloured pill: the plate is the thing being looked at.
  -->
  <div
    v-if="isPerformanceMode || currentPerformanceLevel !== 'optimal'"
    class="furniture pointer-events-none absolute left-3 top-3 z-20 border border-stock-100/40 bg-stage-900/70 px-2 py-1 text-stock-100"
  >
    Simplified · {{ sceneComplexity.totalAnnotations }} marks
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
import { createHitboxPolygon, calculateOptimalTolerance } from '~/utils/polygonHitboxOptimization';
import { batchedDragHandlers, type DragBatchSystem } from '~/utils/dragPerformanceOptimization';
import { performanceBudgetManager, type SceneComplexity, type PerformanceLevel } from '~/utils/performanceBudgetSystem';
import type { CanvasAnnotation } from './types'
import { inkForClass, inkWash, UNASSIGNED_INK } from '~/utils/inks'

interface Props {
  imageUrl: string
  annotations: CanvasAnnotation[]
  currentTool: string
  isAnnotating: boolean
  classes?: string[]
  canvasWidth?: number
  canvasHeight?: number
  /** Broker endpoint for this organization's SAM 2 backend, e.g.
   *  `${apiUrl}/api/assist/sam2`. The service's real URL and key stay on the
   *  server; the canvas only ever talks to the broker. */
  assistUrl?: string
  /** The caller's JWT, so the broker can authenticate the proxied call. */
  authToken?: string
  /** Which organization's backend to use; the broker verifies membership. */
  orgId?: number | string
}

interface Emits {
  (e: 'update:annotations', annotations: CanvasAnnotation[]): void
  (e: 'update:isAnnotating', isAnnotating: boolean): void
  (e: 'annotation-completed', annotation: CanvasAnnotation): void
  (e: 'annotation-updated', annotation: CanvasAnnotation, index: number): void
  (e: 'annotation-deleted', index: number): void
  (e: 'show-class-selector', annotation: CanvasAnnotation, position: { x: number; y: number }): void
  (e: 'magic-error', message: string): void
  /** The service did not answer at all. Retrying only re-opens the browser's
   *  local-network prompt, so the screen should stop offering assist. */
  (e: 'magic-unreachable', message: string): void
}

const props = withDefaults(defineProps<Props>(), {
  canvasWidth: 800,
  canvasHeight: 600,
  classes: () => [],
  assistUrl: '',
  authToken: '',
  orgId: ''
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
    if (stage.value) {
      const stageNode = stage.value.getNode()
      const pointer = stageNode.getPointerPosition()
      emit('show-class-selector', newAnnotation, pointer || { x: 0, y: 0 })
    } else {
      emit('show-class-selector', newAnnotation, { x: 0, y: 0 })
    }
  } else {
    // If no classes to choose from, finalize immediately with empty className
    finalizeAnnotation('')
  }
}

// Imperative annotation functions (replaces useAnnotationLifecycle composable)
const completeAnnotation = (annotation: CanvasAnnotation) => {
  const newAnnotations = [...props.annotations, annotation]
  emit('update:annotations', newAnnotations)
  emit('annotation-completed', annotation)
  emit('update:isAnnotating', false)
}

// Part 1: Create the finalizeAnnotation Method
const finalizeAnnotation = (className: string) => {
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

// Vertex editing state for three-phase editing system
const isEditingVertex = ref(false)
let currentVertexEdit: {
  annotationIndex: number
  vertexIndex: number
  originalPolygon: any
  temporaryClone: any
  isNewVertex?: boolean
  visualAnchor?: any // Visual dot for the vertex being edited
} | null = null


// Helper: find closest point on polyline (returns projected point and segment index)
const getClosestPointOnPolyline = (points: { x: number; y: number }[], target: { x: number; y: number }) => {
  let minDist = Infinity
  let closestPoint = { x: 0, y: 0 }
  let insertIndex = 0

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!
    const b = points[i + 1]!

    // Project target onto segment ab
    const dx = b.x - a.x
    const dy = b.y - a.y
    const l2 = dx * dx + dy * dy
    let t = 0
    if (l2 > 0) {
      t = ((target.x - a.x) * dx + (target.y - a.y) * dy) / l2
      t = Math.max(0, Math.min(1, t))
    }

    const projX = a.x + t * dx
    const projY = a.y + t * dy
    const dist = Math.hypot(target.x - projX, target.y - projY)

    if (dist < minDist) {
      minDist = dist
      closestPoint = { x: projX, y: projY }
      insertIndex = i // insert after i
    }
  }

  return { point: closestPoint, insertIndex }
}




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


// Scene complexity calculation for performance budget system
const sceneComplexity = computed((): SceneComplexity => {
  const totalAnnotations = props.annotations.length
  const complexPolygons = props.annotations.filter(a => 
    (a.type === 'polygon' || a.type === 'freehand') && 
    a.points && 
    a.points.length > 20
  ).length
  
  const totalPoints = props.annotations.reduce((sum, ann) => {
    return sum + (ann.points?.length || 0)
  }, 0)
  const averagePointCount = totalAnnotations > 0 ? totalPoints / totalAnnotations : 0
  
  return {
    totalAnnotations,
    complexPolygons,
    averagePointCount,
    isZooming: isZooming.value,
    isDragging: isDraggingStage.value || isDraggingAnnotation.value
  }
})

// Current performance level for display
const currentPerformanceLevel = computed((): PerformanceLevel => {
  return performanceBudgetManager.getPerformanceLevel(sceneComplexity.value)
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
    
    // Enable CORS to prevent tainted canvas issues
    img.crossOrigin = 'anonymous'
    
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
        const layerNode = imageLayer.value.getNode ? imageLayer.value.getNode() : imageLayer.value
        if (layerNode && typeof layerNode.batchDraw === 'function') {
          layerNode.batchDraw()
        }
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

// Polygon hitbox optimization helpers
const createSimplifiedHitbox = (points: number[], zoomLevel: number): number[] => {
  const tolerance = calculateOptimalTolerance(points, zoomLevel)
  return createHitboxPolygon(points, tolerance)
}

const createHitboxFunction = (hitboxPoints: number[]) => {
  return function(context: any, shape: any) {
    // Create a simplified path for hit detection
    context.beginPath()
    for (let i = 0; i < hitboxPoints.length - 1; i += 2) {
      const x = hitboxPoints[i]!
      const y = hitboxPoints[i + 1]!
      if (i === 0) {
        context.moveTo(x, y)
      } else {
        context.lineTo(x, y)
      }
    }
    context.closePath()
    context.fillStrokeShape(shape)
  }
}

// Vertex dot pagination helpers
const MIN_HANDLE_GAP_PX = 11   // closer than this, two handles are one blob
const MAX_HANDLES = 400        // backstop; never reached at a workable zoom
const MIN_MIDPOINT_EDGE_PX = 26

/**
 * Which vertices get a handle.
 *
 * This used to be "every 5th point", which answers the wrong question. Measured
 * on a real SAM 2 mask: 147 corners, 31 handles. 116 corners - 79% of the shape
 * - had nothing to grab. Worse, a point you inserted lost its handle the instant
 * you let go unless its index happened to land on a multiple of five, so it
 * stayed in the outline and became untouchable.
 *
 * An index has nothing to do with what a person can see or hit. Two things do:
 * whether the vertex is on screen, and whether it is far enough from its
 * neighbour to be a separate target. So cull to the viewport, then thin by
 * SCREEN distance. Zooming in reveals more handles, which is exactly what
 * someone who zoomed to 375% on one corner is asking for.
 */
const vertexHandles = (points: { x: number; y: number }[]) => {
  if (!points || points.length === 0) return []
  const scale = stageScale.value || 1
  const pad = 48 / scale
  const left = -stagePosition.value.x / scale - pad
  const top = -stagePosition.value.y / scale - pad
  const right = (-stagePosition.value.x + stageSize.value.width) / scale + pad
  const bottom = (-stagePosition.value.y + stageSize.value.height) / scale + pad
  const minGap = MIN_HANDLE_GAP_PX / scale

  const out: { point: { x: number; y: number }; originalIndex: number }[] = []
  let last: { x: number; y: number } | null = null
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!
    if (p.x < left || p.x > right || p.y < top || p.y > bottom) {
      // Off screen. Reset the spacing run so the next visible vertex is always
      // kept - a handle must never be dropped for crowding a neighbour the
      // operator cannot even see.
      last = null
      continue
    }
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < minGap) continue
    out.push({ point: p, originalIndex: i })
    last = p
    if (out.length >= MAX_HANDLES) break
  }
  return out
}

/**
 * A hollow handle on the middle of each edge: click or drag it and a real
 * vertex appears there.
 *
 * The old way to add a point was to press on the polygon's own outline, which
 * collides with dragging the whole shape. The code fought that with a "circuit
 * breaker" - disable dragging, fire synthetic mouseup and dragend, re-enable on
 * a 100ms timer - and still had no drag to commit on, so a plain click left
 * nothing behind. A separate target has no conflict to break.
 *
 * Only offered between genuinely adjacent vertices: where thinning or the
 * viewport edge skipped points, a midpoint would sit on a stretch that already
 * has corners and splice in at the wrong index.
 */
const midpointHandles = (points: { x: number; y: number }[]) => {
  const kept = vertexHandles(points)
  if (kept.length < 2) return []
  const scale = stageScale.value || 1
  const out: { point: { x: number; y: number }; insertIndex: number }[] = []
  for (let k = 0; k < kept.length - 1; k++) {
    const a = kept[k]!, b = kept[k + 1]!
    if (b.originalIndex !== a.originalIndex + 1) continue
    const dx = b.point.x - a.point.x
    const dy = b.point.y - a.point.y
    if (Math.hypot(dx, dy) * scale < MIN_MIDPOINT_EDGE_PX) continue
    out.push({ point: { x: a.point.x + dx / 2, y: a.point.y + dy / 2 }, insertIndex: b.originalIndex })
  }
  return out
}

/**
 * A vertex handle: paper disc, ink ring, in the annotation's own colour.
 *
 * Was #4285f4 with a drop shadow, plus #ff4444 / #44ff44 for first and last.
 * That is another product's palette wearing this one's clothes, and the
 * first/last colour coding told the operator nothing they could act on.
 */
const getVertexDotConfig = (
  point: { x: number; y: number },
  originalIndex: number,
  totalPoints: number,
  isVisible: boolean,
  annotationIndex: number
) => {
  if (!isVisible) return null
  const canvasPoint = canvasToCanvas(point)
  const uiScale = getUIScale()
  const annotation = props.annotations[annotationIndex]
  const ink = annotation ? inkFor(annotation) : UNASSIGNED_INK
  return {
    x: canvasPoint.x,
    y: canvasPoint.y,
    radius: 5 * uiScale,
    fill: '#FAF8F2',
    stroke: ink,
    strokeWidth: 2 * uiScale,
    // The drawn circle stays small so it does not bury the shape; the hit area
    // is a finger-sized ring around it, because a 5px target is a target you
    // miss.
    hitStrokeWidth: 18 * uiScale,
    listening: true,
    draggable: true,
    strokeScaleEnabled: false,
    perfectDrawEnabled: false,
    name: `vertex-${annotationIndex}-${originalIndex}`,
    vertexIndex: originalIndex,
    annotationIndex: annotationIndex
  }
}

/** The insert handle: same ink, hollow, deliberately quieter than a real vertex. */
const getMidpointDotConfig = (point: { x: number; y: number }, annotationIndex: number) => {
  const canvasPoint = canvasToCanvas(point)
  const uiScale = getUIScale()
  const annotation = props.annotations[annotationIndex]
  const ink = annotation ? inkFor(annotation) : UNASSIGNED_INK
  return {
    x: canvasPoint.x,
    y: canvasPoint.y,
    radius: 3.5 * uiScale,
    fill: 'transparent',
    stroke: ink,
    strokeWidth: 1.5 * uiScale,
    opacity: 0.6,
    hitStrokeWidth: 16 * uiScale,
    listening: true,
    draggable: true,
    strokeScaleEnabled: false,
    perfectDrawEnabled: false,
    name: `midpoint-${annotationIndex}`
  }
}

/** Splice a vertex in and commit it. */
const insertVertex = (annotationIndex: number, insertIndex: number, point: { x: number; y: number }) => {
  const annotation = props.annotations[annotationIndex]
  if (!annotation || !annotation.points) return null
  const newPoints = [
    ...annotation.points.slice(0, insertIndex),
    { x: point.x, y: point.y },
    ...annotation.points.slice(insertIndex)
  ]
  const updated: CanvasAnnotation = { ...annotation, points: newPoints }
  const all = [...props.annotations]
  all[annotationIndex] = updated
  emit('update:annotations', all)
  emit('annotation-updated', updated, annotationIndex)
  return newPoints
}

/** Click an insert handle: the vertex simply appears, no drag required. */
const handleMidpointClick = (
  annotationIndex: number,
  mid: { point: { x: number; y: number }; insertIndex: number },
  event: any
) => {
  event.cancelBubble = true
  event.evt?.stopPropagation()
  // A drag already inserted this one on dragstart; the click that closes that
  // drag must not insert a second.
  if (isEditingVertex.value) return
  insertVertex(annotationIndex, mid.insertIndex, mid.point)
}

/** Drag an insert handle: the vertex appears and follows the cursor in one go. */
const handleMidpointDragStart = (
  annotationIndex: number,
  mid: { point: { x: number; y: number }; insertIndex: number },
  event: any
) => {
  const annotation = props.annotations[annotationIndex]
  if (!annotation || !annotation.points) return
  const newPoints = [
    ...annotation.points.slice(0, mid.insertIndex),
    { x: mid.point.x, y: mid.point.y },
    ...annotation.points.slice(mid.insertIndex)
  ]
  // Hand the not-yet-committed list to the existing three-phase editor, which
  // commits it on dragend together with wherever it was dragged to.
  handleVertexDragStart(annotationIndex, mid.insertIndex, event, newPoints, true)
}

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

// Magic Stick State
const magicPoints = ref<{x: number, y: number, polar: boolean}[]>([])
let magicHoverTimer: any = null

// ── Magic stick ──────────────────────────────────────────────────────────────
//
// The service is addressed per organization through Backend Connections, so the
// base URL arrives as a prop; there is no hardcoded host.
//
// The expensive half of SAM 2 is the image encoder, and it does not depend on
// where you click. So the image is embedded ONCE per sheet and every click after
// that sends only coordinates against the returned key. The version this
// replaced re-uploaded the whole image on every click, which is why the tool
// felt broken: each refinement paid the encoder again.

const magicPreviewPoints = ref<number[]>([])
const magicBusy = ref(false)
/** Marks the polygon this magic session owns, so refinement clicks replace it
 *  instead of stacking a new shape on top of the last one. */
const magicSessionClassName = ref<string | null>(null)
let magicSessionCounter = 0
/** Only the newest request may write; a slow one must never overwrite a fast one. */
let magicRequestSeq = 0
let magicHoverSeq = 0
/** The service's handle on this sheet's embedding. Null until the first upload. */
let magicCachedImageKey: string | null = null

const magicServiceUrl = computed(() => (props.assistUrl || '').replace(/\/+$/, ''))

const magicHeaders = (extra: Record<string, string> = {}) => ({
  ...(props.authToken ? { Authorization: `Bearer ${props.authToken}` } : {}),
  ...(props.orgId !== '' && props.orgId != null ? { orgId: String(props.orgId) } : {}),
  ...extra
})

const magicOverlayConfig = computed(() => ({
  // The stage is panned and zoomed, so a rect pinned at (0,0) slides off screen
  // as soon as the operator moves. Expressed in canvas coordinates it stays over
  // the viewport at any transform.
  x: -stagePosition.value.x / stageScale.value,
  y: -stagePosition.value.y / stageScale.value,
  width: stageSize.value.width / stageScale.value,
  height: stageSize.value.height / stageScale.value,
  fill: 'transparent',
  listening: true
}))

const magicPreviewConfig = computed(() => ({
  points: magicPreviewPoints.value,
  stroke: UNASSIGNED_INK,
  strokeWidth: 1.5 * getUIScale(),
  dash: [5 * getUIScale(), 4 * getUIScale()],
  closed: true,
  listening: false,
  perfectDrawEnabled: false,
  strokeScaleEnabled: false
}))

/** The image bytes to segment, preferring a direct fetch over a canvas re-encode. */
const getMagicImageBlob = async (): Promise<Blob> => {
  try {
    const response = await fetch(props.imageUrl, { mode: 'cors', credentials: 'same-origin' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.blob()
  } catch {
    // Fall back to re-encoding the decoded image. Needs CORS headers on the
    // image response, otherwise the canvas is tainted and toBlob throws.
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Failed to load image with CORS'))
      img.src = props.imageUrl
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get a 2d canvas context')
    ctx.drawImage(img, 0, 0)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Canvas export failed'))), 'image/png')
    })
  }
}

/** Accumulated clicks in ORIGINAL image pixels - the space the service expects. */
const magicClickPayload = () =>
  magicPoints.value.map(point => {
    const original = canvasToOriginal(point)
    return { x: Math.round(original.x), y: Math.round(original.y), label: point.polar ? 1 : 0 }
  })

/** Ask for a mask, using the cached-embedding fast path when possible. */
const requestMagicMask = async (clicks: { x: number; y: number; label: number }[]) => {
  const base = magicServiceUrl.value
  if (!base) throw new Error('No SAM 2 connection for this organization')

  if (magicCachedImageKey) {
    const response = await fetch(`${base}/predict`, {
      method: 'POST',
      headers: magicHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ image_key: magicCachedImageKey, clicks, multimask_output: false })
    })
    if (response.ok) return await response.json()
    // 409 means the service evicted this sheet from its cache. Fall through and
    // send the image again rather than surfacing an error the operator cannot act on.
    if (response.status !== 409) throw new Error(await response.text())
    magicCachedImageKey = null
  }

  const form = new FormData()
  form.append('image_file', await getMagicImageBlob(), 'sheet.png')
  form.append('clicks', JSON.stringify(clicks))
  form.append('multimask_output', 'false')
  const response = await fetch(`${base}/clicked`, { method: 'POST', headers: magicHeaders(), body: form })
  if (!response.ok) throw new Error(await response.text())
  const result = await response.json()
  if (result.image_key) magicCachedImageKey = result.image_key
  return result
}

/** Upload the sheet once so the first click is as cheap as the rest. */
const warmMagicImage = async () => {
  const base = magicServiceUrl.value
  if (!base || magicCachedImageKey || !props.imageUrl) return
  try {
    const form = new FormData()
    form.append('image_file', await getMagicImageBlob(), 'sheet.png')
    const response = await fetch(`${base}/embed`, { method: 'POST', headers: magicHeaders(), body: form })
    if (!response.ok) return
    const result = await response.json()
    if (result.image_key) magicCachedImageKey = result.image_key
  } catch {
    // Warming is an optimisation. A failure here costs one slow click, not a
    // broken tool, so it stays silent.
  }
}

/** Turn the service's polygons into this session's single annotation. */
const applyMagicResult = (annotationsFromService: any[]) => {
  const polygons = (annotationsFromService || []).filter(a => (a?.points?.length || 0) >= 3)
  if (!polygons.length) return

  if (!magicSessionClassName.value) {
    magicSessionCounter += 1
    magicSessionClassName.value = `magic-generated-${magicSessionCounter}`
  }
  const sessionClass = magicSessionClassName.value

  // Largest first: the service can return fragments, and the operator pointed at
  // the object, not at its specks.
  const best = polygons.slice().sort((a, b) => (b.points.length - a.points.length))[0]
  const canvasPoints = best.points.map((pt: any) => originalToCanvas(pt))

  const annotation: CanvasAnnotation = {
    type: 'polygon',
    points: canvasPoints,
    className: sessionClass
  }

  // Replace this session's previous shape rather than stacking on it.
  const kept = props.annotations.filter(a => a.className !== sessionClass)
  const next = [...kept, annotation]
  emit('update:annotations', next)

  if (props.classes && props.classes.length > 0) {
    emit('show-class-selector', annotation, getMagicAnnotationCenter(annotation))
  }
}

/**
 * Turn a failure into something the operator can act on.
 *
 * A browser reports an unreachable host as the bare string "Failed to fetch",
 * which names neither the problem nor the fix. The service is addressed per
 * organization, so the address itself is the useful part of the message: on a
 * deployment where nobody is running SAM 2, that line is the whole explanation.
 */
const isUnreachable = (err: any) =>
  err instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(err?.message || String(err))

const magicFailureMessage = (err: any) => {
  const raw = err?.message || String(err)
  if (!isUnreachable(err)) return raw
  const where = magicServiceUrl.value || 'no address'
  return `The SAM 2 service at ${where} did not answer, so the magic stick cannot segment. ` +
    'Start it, or point this organization at a reachable one under Organization → Settings → Connections. ' +
    'The drawing tools still work.'
}

/** A click landed: ask for the mask the accumulated points describe. */
const runMagicInference = async () => {
  const clicks = magicClickPayload()
  if (!clicks.length) return
  const seq = ++magicRequestSeq
  magicBusy.value = true
  try {
    const result = await requestMagicMask(clicks)
    if (seq !== magicRequestSeq) return // a newer click already answered
    applyMagicResult(result.annotations)
  } catch (err: any) {
    if (seq !== magicRequestSeq) return
    const message = magicFailureMessage(err)
    emit(isUnreachable(err) ? 'magic-unreachable' : 'magic-error', message)
  } finally {
    if (seq === magicRequestSeq) magicBusy.value = false
  }
}

/** Hover preview. Only runs once the embedding is cached, so moving the mouse
 *  can never trigger an upload. */
const previewMagicAt = async (canvasPoint: { x: number; y: number }) => {
  if (!magicCachedImageKey || magicBusy.value || magicPoints.value.length) return
  const base = magicServiceUrl.value
  if (!base) return
  const original = canvasToOriginal(canvasPoint)
  const seq = ++magicHoverSeq
  try {
    const response = await fetch(`${base}/predict`, {
      method: 'POST',
      headers: magicHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        image_key: magicCachedImageKey,
        clicks: [{ x: Math.round(original.x), y: Math.round(original.y), label: 1 }],
        multimask_output: false
      })
    })
    if (!response.ok || seq !== magicHoverSeq) return
    const result = await response.json()
    const best = (result.annotations || []).filter((a: any) => (a?.points?.length || 0) >= 3)
      .sort((a: any, b: any) => b.points.length - a.points.length)[0]
    if (!best || seq !== magicHoverSeq) { magicPreviewPoints.value = []; return }
    const flat: number[] = []
    for (const pt of best.points) {
      const c = originalToCanvas(pt)
      flat.push(c.x, c.y)
    }
    magicPreviewPoints.value = flat
  } catch {
    if (seq === magicHoverSeq) magicPreviewPoints.value = []
  }
}

/** Close the session but KEEP its polygon - the caller has given it a class. */
const endMagicSession = () => {
  magicPoints.value = []
  magicPreviewPoints.value = []
  magicSessionClassName.value = null
  magicRequestSeq += 1
  magicHoverSeq += 1
}

const clearMagicSession = () => {
  magicPoints.value = []
  magicPreviewPoints.value = []
  magicSessionClassName.value = null
  
  // Remove any magic-generated annotations
  const newAnnotations = props.annotations.filter(ann => 
    !ann.className || (!ann.className.includes('auto-generated') && !ann.className.includes('magic-'))
  )
  
  if (newAnnotations.length !== props.annotations.length) {
    emit('update:annotations', newAnnotations)
  }
  
}

// Helper function to calculate the center point of a magic annotation for positioning class selector
const getMagicAnnotationCenter = (annotation: CanvasAnnotation): { x: number; y: number } => {
  if (annotation.type === 'polygon' && annotation.points && annotation.points.length > 0) {
    // Calculate the centroid of the polygon
    let totalX = 0
    let totalY = 0
    for (const point of annotation.points) {
      totalX += point.x
      totalY += point.y
    }
    return {
      x: totalX / annotation.points.length,
      y: totalY / annotation.points.length
    }
  }
  
  // Fallback for other types (rectangle, circle, etc.)
  if (annotation.startPoint) {
    return annotation.startPoint
  }
  
  // Default fallback
  return { x: 100, y: 100 }
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

/**
 * A shape is drawn in its class's ink. The colour carries the classification,
 * not the interaction state - selection and hover are already told by stroke
 * weight and the fill wash, and a shape that changes hue when you point at it
 * is a shape whose colour means nothing.
 */
const inkFor = (annotation: CanvasAnnotation) => inkForClass(annotation?.className, props.classes || [])

/**
 * Registration brackets at the plate's corners, in canvas space so they zoom
 * and pan with the image the way printed marks stay with the sheet.
 */
const registrationMarks = computed(() => {
  if (!imageObj.value || !displayImageSize.value.width) return []
  const { x, y } = imageOffset.value
  const w = displayImageSize.value.width
  const h = displayImageSize.value.height
  const ui = getUIScale()
  const arm = 16 * ui
  const inset = 12 * ui
  const base = {
    stroke: '#141414',
    strokeWidth: 1 * ui,
    opacity: 0.5,
    listening: false,
    perfectDrawEnabled: false,
    strokeScaleEnabled: false
  }
  const corners = [
    { cx: x + inset, cy: y + inset, sx: 1, sy: 1 },
    { cx: x + w - inset, cy: y + inset, sx: -1, sy: 1 },
    { cx: x + inset, cy: y + h - inset, sx: 1, sy: -1 },
    { cx: x + w - inset, cy: y + h - inset, sx: -1, sy: -1 }
  ]
  return corners.flatMap(c => [
    { ...base, points: [c.cx, c.cy, c.cx + arm * c.sx, c.cy] },
    { ...base, points: [c.cx, c.cy, c.cx, c.cy + arm * c.sy] }
  ])
})

const getRectConfig = (annotation: CanvasAnnotation, index: number) => {
  // Since all annotations are now in canvas coordinates, use them directly
  if (!annotation.startPoint || annotation.width === undefined || annotation.height === undefined) {
    return {}
  }

  const isSelected = selectedAnnotationIndex.value === index
  const isHovered = hoveredAnnotationIndex.value === index
  const uiScale = getUIScale()

  const config = {
    x: annotation.startPoint.x,
    y: annotation.startPoint.y,
    width: annotation.width,
    height: annotation.height,
    stroke: inkFor(annotation),
    strokeWidth: (isSelected ? 3 : (isHovered ? 2.5 : 2)),
    fill: isSelected ? inkWash(inkFor(annotation), 0.12) : (isHovered ? inkWash(inkFor(annotation), 0.06) : 'transparent'),
    draggable: true,
    listening: true,
    perfectDrawEnabled: false
  }
  
  // Apply performance budget system
  const baseStrokeWidth = isSelected ? 3 : (isHovered ? 2.5 : 2)
  performanceBudgetManager.applyBudgetToBasicShape(
    config,
    sceneComplexity.value,
    isSelected,
    baseStrokeWidth
  )
  
  // Apply UI scale to the budget-adjusted stroke width
  config.strokeWidth = config.strokeWidth * uiScale
  
  return config
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

  const totalPolygons = polygonCount.value
  const isComplex = annotation.points && annotation.points.length > 10
  const pointCount = annotation.points.length

  // Create two-tier polygon system for better performance with interaction
  const shouldUseHitbox = pointCount > 20 || totalPolygons >= 8
  let displayPoints = flatPoints
  let hitboxPoints = flatPoints

  if (shouldUseHitbox) {
    // Create simplified hitbox for interaction while keeping visual fidelity
    hitboxPoints = createSimplifiedHitbox(flatPoints, stageScale.value)
  }

  const config = {
    points: displayPoints,
    stroke: inkFor(annotation),
    strokeWidth: (isSelected ? 3 : (isHovered ? 2.5 : 2)) * uiScale,
    fill: isSelected ? inkWash(inkFor(annotation), 0.12) : (isHovered ? inkWash(inkFor(annotation), 0.06) : 'transparent'),
    closed: true,
    draggable: true,
    listening: true, // Always keep listening enabled for interaction
    lineCap: 'round',
    lineJoin: 'round',
    visible: polygonLayerVisible.value,
    perfectDrawEnabled: false
  } as any

  // Apply performance budget system for automatic quality adjustment
  const baseStrokeWidth = isSelected ? 3 : (isHovered ? 2.5 : 2)
  performanceBudgetManager.applyBudgetToPolygon(
    config,
    sceneComplexity.value,
    isSelected,
    isHovered,
    baseStrokeWidth
  )
  
  // Apply UI scale to the budget-adjusted stroke width
  config.strokeWidth = config.strokeWidth * uiScale
  
  // For complex polygons or high complexity scenes, use simplified hitbox
  if (shouldUseHitbox && !isSelected) {
    config.hitFunc = createHitboxFunction(hitboxPoints)
  }
  
  // Apply hitStrokeWidth from budget for easier selection
  if (config.hitStrokeWidth > 0) {
    config.hitStrokeWidth = Math.max(config.hitStrokeWidth * uiScale, 2)
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

  const config = {
    points: [annotation.startPoint.x, annotation.startPoint.y, annotation.endPoint.x, annotation.endPoint.y],
    stroke: inkFor(annotation),
    strokeWidth: (isSelected ? 3 : (isHovered ? 2.5 : 2)),
    lineCap: 'round',
    draggable: true,
    listening: true,
    perfectDrawEnabled: false
  }
  
  // Apply performance budget system
  const baseStrokeWidth = isSelected ? 3 : (isHovered ? 2.5 : 2)
  performanceBudgetManager.applyBudgetToBasicShape(
    config,
    sceneComplexity.value,
    isSelected,
    baseStrokeWidth
  )
  
  // Apply UI scale to the budget-adjusted stroke width
  config.strokeWidth = config.strokeWidth * uiScale
  
  return config
}

const getCircleConfig = (annotation: CanvasAnnotation, index: number) => {
  // Since all annotations are now in canvas coordinates, use them directly
  if (!annotation.center || annotation.radius === undefined) {
    return {}
  }

  const isSelected = selectedAnnotationIndex.value === index
  const isHovered = hoveredAnnotationIndex.value === index
  const uiScale = getUIScale()

  const config = {
    x: annotation.center.x,
    y: annotation.center.y,
    radius: annotation.radius,
    stroke: inkFor(annotation),
    strokeWidth: (isSelected ? 3 : (isHovered ? 2.5 : 2)),
    fill: isSelected ? inkWash(inkFor(annotation), 0.12) : (isHovered ? inkWash(inkFor(annotation), 0.06) : 'transparent'),
    draggable: true,
    listening: true,
    perfectDrawEnabled: false
  }
  
  // Apply performance budget system
  const baseStrokeWidth = isSelected ? 3 : (isHovered ? 2.5 : 2)
  performanceBudgetManager.applyBudgetToBasicShape(
    config,
    sceneComplexity.value,
    isSelected,
    baseStrokeWidth
  )
  
  // Apply UI scale to the budget-adjusted stroke width
  config.strokeWidth = config.strokeWidth * uiScale
  
  return config
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
    stroke: inkFor(annotation),
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

  // Apply performance budget system for automatic quality adjustment
  const baseStrokeWidth = isSelected ? 3 : (isHovered ? 2.5 : 2)
  performanceBudgetManager.applyBudgetToPolygon(
    config,
    sceneComplexity.value,
    isSelected,
    isHovered,
    baseStrokeWidth
  )
  
  // Apply UI scale to the budget-adjusted stroke width
  config.strokeWidth = config.strokeWidth * uiScale
  
  // Keep listening enabled for all annotations (performance budget handles other optimizations)
  config.listening = true

  return config
}



// PART 1: UNIFIED EVENT HANDLERS - All tools use imperative model
const handleStageMouseDown = (e: any) => {
  // Magic Stick runs before the gatekeeper below, which aborts as soon as the
  // event target is a shape rather than the stage. The magic layer's overlay rect
  // IS such a shape, and so is any annotation the user clicks over - so leaving
  // this until after the gatekeeper would silently swallow most magic clicks.
  // This is the only place magic clicks are handled; the overlay carries no
  // handler of its own, since both would then fire for a single click.
  if (props.currentTool === 'magic') {
    handleMagicClick(e)
    return
  }

  // 1. Global Gatekeeper: Prevent accidental drawing when interacting with existing annotations
  // If we are hovering over an annotation, or editing a vertex, or clicking on a shape (not stage), abort drawing
  const isHoveringAnnotation = hoveredAnnotationIndex.value !== null
  const isEditing = isEditingVertex.value
  const isClickingShape = e.target !== e.target.getStage()
  
  // Exception: If tool is 'select', we allow clicking on shapes to select them
  const isSelectTool = props.currentTool === 'select'
  
  if ((isHoveringAnnotation || isEditing || isClickingShape) && !isSelectTool) {
    return
  }

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
      } else {
       
        // Check if click is near the first vertex to complete polygon
        if (currentPathImperative.length >= 3 && isNearFirstVertex(canvasPos)) {
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

  // Magic Stick: preview the mask the cursor would select. Debounced, and only
  // once the service has this image cached, so it never re-uploads on mouse move.
  if (props.currentTool === 'magic') {
    if (magicHoverTimer) clearTimeout(magicHoverTimer)
    const hoverPoint = { x: mouseCanvasPos.x, y: mouseCanvasPos.y }
    magicHoverTimer = setTimeout(() => {
      const original = canvasToOriginal(hoverPoint)
      if (original.x >= 0 && original.x <= originalImageSize.value.width &&
          original.y >= 0 && original.y <= originalImageSize.value.height) {
        previewMagicAt(hoverPoint)
      } else {
        magicPreviewPoints.value = []
      }
    }, 180)
  }

  // Handle "Soft Clay" drag for new vertices (Visuals First)
  if (isEditingVertex.value && currentVertexEdit?.isNewVertex) {
    handleVertexDragMove(currentVertexEdit.annotationIndex, currentVertexEdit.vertexIndex, e)
    return
  }
  
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
  // Handle "Soft Clay" commit for new vertices (Visuals First)
  if (isEditingVertex.value && currentVertexEdit?.isNewVertex) {
    handleVertexDragEnd(currentVertexEdit.annotationIndex, currentVertexEdit.vertexIndex, e)
    return
  }

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
  
}

const handleStageDragStart = (e: any) => {
  // Part 3: Restore Canvas Interactions - Stage drag functionality
  if (props.currentTool === 'pan' || (props.currentTool === 'select' && selectedAnnotationIndex.value === null)) {
    isDraggingStage.value = true
    
    // Enter performance mode for complex scenes during stage drag
    const shouldEnterPerformanceMode = polygonCount.value >= 6 || complexPolygonCount.value >= 2
    
    if (shouldEnterPerformanceMode && !isPerformanceMode.value) {
      polygonLayerVisible.value = false
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

const handleContextMenu = (e: any) => {
  // Prevent the native browser context menu
  if (e.evt) {
    e.evt.preventDefault()
  }
}

// Placeholder annotation event handlers
const handleTransformEnd = (index: number, event: any) => {
  // Transform handling
}

const handleDragStart = (index: number, event: any) => {
  // Prevent annotation dragging if vertex editing is active
  if (isEditingVertex.value) {
    event.evt?.preventDefault()
    event.target.stopDrag()
    return
  }
  
  // Part 2: Fix Drag vs. Draw Confusion - Set flag when dragging starts
  // Set this flag IMMEDIATELY to prevent new shape creation
  isDraggingAnnotationNonReactive = true
  isDraggingAnnotation.value = true
  
  // Clear the potential drag flag since we're now actually dragging
  potentialDragStart = false
  
  // Prevent event bubbling to stage
  event.evt?.stopPropagation()
  
  // Initialize batched drag handling for this annotation
  const nodeId = `annotation-${index}`
  batchedDragHandlers.handleDragStart(nodeId)
  
  // Set up layer redraw callback for the batch system
  batchedDragHandlers.setLayerRedrawCallback(() => {
    if (staticLayer.value) {
      staticLayer.value.getNode().batchDraw()
    }
  })
  
  // Adjust performance based on current scene complexity
  const avgPointCount = props.annotations.reduce((sum, ann) => {
    return sum + (ann.points?.length || 0)
  }, 0) / Math.max(props.annotations.length, 1)
  
  batchedDragHandlers.adjustPerformanceForComplexity(
    props.annotations.length, 
    avgPointCount
  )
}

const handleDragMove = (index: number, event: any) => {
  // Use batched drag system for performance optimization
  const node = event.target
  const nodeId = `annotation-${index}`
  const newPosition = { x: node.x(), y: node.y() }
  
  // For complex polygons or when many annotations exist, use batched updates
  const annotation = props.annotations[index]
  const shouldBatch = (
    annotation && 
    ((annotation.points && annotation.points.length > 20) || props.annotations.length >= 8)
  )
  
  if (shouldBatch) {
    // Use batched update system for better performance
    batchedDragHandlers.handleDragMove(nodeId, node, newPosition)
  } else {
    // For simple annotations, allow immediate updates
    // This maintains responsiveness for simple cases
  }
  
  // Prevent event bubbling
  event.evt?.stopPropagation()
}

// Three-phase vertex editing system
const handleVertexDragStart = (annotationIndex: number, vertexIndex: number, event: any, overridePoints?: {x: number, y: number}[], isNewVertex = false) => {
  // Prevent annotation-level dragging while editing vertices
  isDraggingAnnotationNonReactive = true
  isDraggingAnnotation.value = true
  
  // Phase 1: Hide original polygon and create temporary clone
  const annotation = props.annotations[annotationIndex]
  if (!annotation || !annotation.points) {
    console.warn('Invalid annotation for vertex editing')
    return
  }
  
  // Find the original polygon node on static layer
  const originalNodeKey = annotation.type === 'polygon' ? `polygon-${annotationIndex}` : `freehand-${annotationIndex}`
  const originalNode = annotationRefs.value[originalNodeKey]
  
  if (!originalNode || !activeLayer.value) {
    console.warn('Could not find original polygon node or active layer')
    return
  }
  
  // Hide the original polygon
  originalNode.visible(false)
  
  // Create temporary clone on active layer for smooth editing
  if (process.client) {
    const Konva = (window as any).Konva
    if (!Konva) return
    
    // Convert points to flat array
    const flatPoints: number[] = []
    const pointsToUse = overridePoints || annotation.points
    for (const point of pointsToUse) {
      flatPoints.push(point.x, point.y)
    }
    
    const temporaryClone = new Konva.Line({
      points: flatPoints,
      stroke: '#4285f4',
      strokeWidth: 3,
      fill: annotation.type === 'polygon' ? 'rgba(66, 133, 244, 0.1)' : 'transparent',
      closed: annotation.type === 'polygon',
      listening: false,
      lineCap: 'round',
      lineJoin: 'round',
      tension: annotation.type === 'freehand' ? 0.3 : 0
    })
    
    activeLayer.value.getNode().add(temporaryClone)
    
    // Create visual anchor (dot) for the vertex being edited
    // This provides immediate visual feedback for "Click-Insert" operations
    let visualAnchor = null
    const pointIndex = vertexIndex * 2
    if (pointIndex < flatPoints.length - 1) {
      visualAnchor = new Konva.Circle({
        x: flatPoints[pointIndex],
        y: flatPoints[pointIndex + 1],
        radius: 6 * getUIScale(),
        fill: '#ff4444',
        stroke: '#4285f4',
        strokeWidth: 2 * getUIScale(),
        listening: false // Purely visual
      })
      activeLayer.value.getNode().add(visualAnchor)
    }

    activeLayer.value.getNode().batchDraw()
    
    // Store editing state
    currentVertexEdit = {
      annotationIndex,
      vertexIndex,
      originalPolygon: originalNode,
      temporaryClone,
      isNewVertex,
      visualAnchor
    }
    
    isEditingVertex.value = true
  }
  
  // Prevent other drag handlers from interfering
  event.evt?.stopPropagation()
}

const handleVertexDragMove = (annotationIndex: number, vertexIndex: number, event: any) => {
  // Phase 2: Update only the dragged vertex on temporary clone for smooth performance
  if (!currentVertexEdit || !isEditingVertex.value) return
  
  // Get the absolute mouse position on the canvas (not the node's drag offset)
  const stageNode = event.target.getStage()
  const newPos = getCanvasPointerPosition(stageNode)
  
  if (!newPos) return // Safety check
  
  // Update the specific vertex in the temporary clone
  if (currentVertexEdit.temporaryClone) {
    const currentPoints = currentVertexEdit.temporaryClone.points()
    const newPoints = [...currentPoints]
    
    // Update the vertex coordinates
    const pointIndex = vertexIndex * 2
    if (pointIndex < newPoints.length - 1) {
      newPoints[pointIndex] = newPos.x
      newPoints[pointIndex + 1] = newPos.y
      
      currentVertexEdit.temporaryClone.points(newPoints)
      
      // Sync visual anchor position
      if (currentVertexEdit.visualAnchor) {
        currentVertexEdit.visualAnchor.x(newPos.x)
        currentVertexEdit.visualAnchor.y(newPos.y)
      }
      
      activeLayer.value?.getNode().batchDraw()
    }
  }
  
  // Prevent event bubbling
  event.evt?.stopPropagation()
}

const handleVertexDragEnd = (annotationIndex: number, vertexIndex: number, event: any) => {
  // Phase 3: Update permanent annotation data and restore original polygon
  if (!currentVertexEdit || !isEditingVertex.value) return
  
  const node = event.target
  
  // Get the final points from the temporary clone
  if (currentVertexEdit.temporaryClone) {
    const finalPoints = currentVertexEdit.temporaryClone.points()
    
    // Convert back to point objects
    const newPoints: { x: number; y: number }[] = []
    for (let i = 0; i < finalPoints.length - 1; i += 2) {
      newPoints.push({ x: finalPoints[i]!, y: finalPoints[i + 1]! })
    }
    
    // Update the annotation data
    const annotation = props.annotations[annotationIndex]
    if (annotation) {
      const updatedAnnotation: CanvasAnnotation = {
        ...annotation,
        points: newPoints
      }
      
      const newAnnotations = [...props.annotations]
      newAnnotations[annotationIndex] = updatedAnnotation
      
      emit('update:annotations', newAnnotations)
      emit('annotation-updated', updatedAnnotation, annotationIndex)
    }
    
    // Clean up temporary clone
    currentVertexEdit.temporaryClone.destroy()
    
    // Clean up visual anchor
    if (currentVertexEdit.visualAnchor) {
      currentVertexEdit.visualAnchor.destroy()
    }
  }
  
  // Show the original polygon again
  if (currentVertexEdit.originalPolygon) {
    // Safety Check: Ensure original polygon isn't stuck in a drag state
    if (currentVertexEdit.originalPolygon.isDragging && currentVertexEdit.originalPolygon.isDragging()) {
      currentVertexEdit.originalPolygon.stopDrag()
    }

    currentVertexEdit.originalPolygon.visible(true)
    // Ensure the polygon hasn't drifted due to ghost drags
    currentVertexEdit.originalPolygon.x(0)
    currentVertexEdit.originalPolygon.y(0)
  }
  
  // Additional Safety: Check stage drag state
  if (stage.value) {
    const stageNode = stage.value.getNode()
    if (stageNode.isDragging()) {
      stageNode.stopDrag()
    }
  }
  
  // Reset vertex dot position ONLY if not a new vertex
  if (!currentVertexEdit.isNewVertex && node && typeof node.x === 'function') {
    node.x(0)
    node.y(0)
  }
  
  // Reset vertex editing state
  currentVertexEdit = null
  isEditingVertex.value = false
  
  // Re-enable annotation-level dragging
  isDraggingAnnotationNonReactive = false
  isDraggingAnnotation.value = false
  
  // Force redraw of both layers
  nextTick(() => {
    if (staticLayer.value) {
      staticLayer.value.getNode().batchDraw()
    }
    if (activeLayer.value) {
      activeLayer.value.getNode().batchDraw()
    }
  })
  
  // Prevent event bubbling
  event.evt?.stopPropagation()
}

const handleDragEnd = (index: number, event: any) => {
  // Part 2: Fix Drag vs. Draw Confusion - Clear flag when dragging ends
  isDraggingAnnotationNonReactive = false
  isDraggingAnnotation.value = false
  potentialDragStart = false // Reset potential drag flag
  
  // Finalize batched drag operations
  const nodeId = `annotation-${index}`
  const node = event.target
  const finalPosition = { x: node.x(), y: node.y() }
  batchedDragHandlers.handleDragEnd(nodeId, finalPosition)
  
  // Since annotations are stored in canvas coordinates, we can work with node positions directly
  const annotation = props.annotations[index]
  if (!annotation) {
    return
  }
  
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
  emit('update:annotations', newAnnotations)
  emit('annotation-updated', updatedAnnotation, index)
  
  // Force a recomputation of annotation configs
  nextTick(() => {
    if (staticLayer.value) {
      staticLayer.value.getNode().batchDraw()
    }
  })
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
      // Context-aware transformer behavior based on annotation type
      if (annotation.type === 'polygon' || annotation.type === 'freehand') {
        // For polygon and freehand: hide transformer to avoid conflicting with vertex editing
        // Users should rely solely on vertex manipulation for precision editing
        transformerInstance.nodes([])
      } else {
        // For other annotation types: show transformer for scaling/rotating
        const cacheKey = `${annotation.type}-${selectedAnnotationIndex.value}`
        const node = annotationRefs.value[cacheKey]
        if (node) {
          transformerInstance.nodes([node])
        } else {
          transformerInstance.nodes([])
        }
      }
    } else {
      transformerInstance.nodes([])
    }
  } else {
    transformerInstance.nodes([])
  }
  
  // Always update the layer whether transformer is shown or hidden
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
  if (newAnnotations && oldAnnotations && newAnnotations.length !== oldAnnotations.length) {
  }
}, { immediate: false })

watch(() => props.imageUrl, async (newUrl) => {
  // A new sheet means the service's embedding for the old one is worthless.
  magicCachedImageKey = null
  magicPreviewPoints.value = []
  if (newUrl) {
    try {
      await loadImage(newUrl)
      // Embed now, in the background, so the operator's FIRST click is as cheap
      // as every one after it. This is the whole difference between the magic
      // stick feeling instant and feeling broken.
      void warmMagicImage()
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
      finishDrawing()
    } else {
      cleanupNonReactiveDrawing()
    }
  } else if (isDrawingNonReactive.value) {
    // For other tools, always cleanup to prevent state leakage
    cleanupNonReactiveDrawing()
  }
  
  // Ensure annotation state is reset when changing tools
  emit('update:isAnnotating', false)
})

// Lifecycle
onMounted(async () => {
  slidingBufferOptimizer.updateConfig(PerformancePresets.BALANCED)
  try {
    await workerManager.initialize()
  } catch (error) {
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

// Magic click handler for the magic layer overlay
/**
 * The single place a magic-stick click is handled. Reached by bubbling from the
 * magic layer's overlay rect up to the stage - there is deliberately no second
 * handler on the overlay itself, because both would fire for one click.
 */
const handleMagicClick = (e: any) => {
  if (props.currentTool !== 'magic') return
  if (e?.evt) e.evt.preventDefault()

  const stageNode = e.target?.getStage?.()
  const pointer = stageNode?.getPointerPosition?.()
  if (!pointer) return

  const canvasPoint = stageNode.getAbsoluteTransform().copy().invert().point(pointer)
  const original = canvasToOriginal(canvasPoint)
  if (
    original.x < 0 || original.x > originalImageSize.value.width ||
    original.y < 0 || original.y > originalImageSize.value.height
  ) {
    return
  }

  // Left click includes the point in the object, right click excludes it.
  const button = e.evt?.button
  if (button !== 0 && button !== 2) return

  magicPoints.value.push({ x: canvasPoint.x, y: canvasPoint.y, polar: button === 0 })
  magicPreviewPoints.value = []
  runMagicInference()
}

// Expose methods to parent
defineExpose({
  completeCurrentAnnotation,
  cancelCurrentAnnotation,
  finishDrawing,
  finalizeAnnotation, // Part 1: Expose the Finalizer
  clearMagicSession,
  endMagicSession,
  resetAnnotationState,
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