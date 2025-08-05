<template>
  <div class="w-full h-full flex items-center justify-center">
    <ClientOnly>
      <div ref="stageContainer" class="relative border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
        <v-stage
          ref="stage"
          :config="stageConfig"
          @mousedown="handleStageMouseDown"
          @mousemove="handleStageMouseMove"
          @mouseup="handleStageMouseUp"
          @click="handleStageClick"
          @dblclick="handleStageDoubleClick"
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
        
        <!-- Annotation layer with fixed transformation context -->
        <v-layer ref="annotationLayer">
          <!-- Existing annotations -->
          <template v-for="(annotation, index) in annotations" :key="`annotation-${index}`">
            <!-- Rectangle annotations -->
            <v-rect
              v-if="annotation.type === 'rectangle'"
              :config="getRectConfig(annotation, index)"
              @transformend="handleTransformEnd(index, $event)"
              @dragend="handleDragEnd(index, $event)"
              @click="handleAnnotationClick(index, $event)"
              @mouseover="handleAnnotationMouseOver(index)"
              @mouseout="handleAnnotationMouseOut(index)"
            />
            
            <!-- Polygon annotations -->
            <v-line
              v-if="annotation.type === 'polygon'"
              :config="getPolygonConfig(annotation, index)"
              @transformend="handleTransformEnd(index, $event)"
              @dragend="handleDragEnd(index, $event)"
              @click="handleAnnotationClick(index, $event)"
              @mouseover="handleAnnotationMouseOver(index)"
              @mouseout="handleAnnotationMouseOut(index)"
            />
            
            <!-- Dot annotations -->
            <v-circle
              v-if="annotation.type === 'dot'"
              :config="getDotConfig(annotation, index)"
              @transformend="handleTransformEnd(index, $event)"
              @dragend="handleDragEnd(index, $event)"
              @click="handleAnnotationClick(index, $event)"
              @mouseover="handleAnnotationMouseOver(index)"
              @mouseout="handleAnnotationMouseOut(index)"
            />
            
            <!-- Line annotations -->
            <v-line
              v-if="annotation.type === 'line'"
              :config="getLineConfig(annotation, index)"
              @transformend="handleTransformEnd(index, $event)"
              @dragend="handleDragEnd(index, $event)"
              @click="handleAnnotationClick(index, $event)"
              @mouseover="handleAnnotationMouseOver(index)"
              @mouseout="handleAnnotationMouseOut(index)"
            />
            
            <!-- Circle annotations -->
            <v-circle
              v-if="annotation.type === 'circle'"
              :config="getCircleConfig(annotation, index)"
              @transformend="handleTransformEnd(index, $event)"
              @dragend="handleDragEnd(index, $event)"
              @click="handleAnnotationClick(index, $event)"
              @mouseover="handleAnnotationMouseOver(index)"
              @mouseout="handleAnnotationMouseOut(index)"
            />
            
            <!-- Freehand annotations -->
            <v-line
              v-if="annotation.type === 'freehand'"
              :config="getFreehandConfig(annotation, index)"
              @transformend="handleTransformEnd(index, $event)"
              @dragend="handleDragEnd(index, $event)"
              @click="handleAnnotationClick(index, $event)"
              @mouseover="handleAnnotationMouseOver(index)"
              @mouseout="handleAnnotationMouseOut(index)"
            />
            
            <!-- Class labels -->
            <v-text
              v-if="annotation.className"
              :config="getLabelConfig(annotation, index)"
            />
          </template>
          
          <!-- Current annotation being drawn -->
          <v-rect
            v-if="currentAnnotation && currentAnnotation.type === 'rectangle' && isDrawing"
            :config="getCurrentRectConfig()"
          />
          
          <v-line
            v-if="currentAnnotation && currentAnnotation.type === 'line' && isDrawing"
            :config="getCurrentLineConfig()"
          />
          
          <v-circle
            v-if="currentAnnotation && currentAnnotation.type === 'circle' && isDrawing"
            :config="getCurrentCircleConfig()"
          />
          
          <v-line
            v-if="currentAnnotation && currentAnnotation.type === 'freehand' && isDrawing"
            :config="getCurrentFreehandConfig()"
          />
          
          <v-line
            v-if="currentAnnotation && currentAnnotation.type === 'polygon' && currentPath.length > 0"
            :config="getCurrentPolygonConfig()"
          />
          
          <!-- Polygon drawing preview line -->
          <v-line
            v-if="isDrawingPolygon && currentPath.length > 0 && mousePosition"
            :config="getPolygonPreviewConfig()"
          />
          
          <!-- Polygon vertex points -->
          <template v-if="isDrawingPolygon && currentPath.length > 0">
            <v-circle
              v-for="(point, index) in currentPath"
              :key="`vertex-${index}`"
              :config="getVertexConfig(point, index)"
            />
          </template>
          
          <!-- Transform nodes for selected annotation -->
          <v-transformer
            v-if="selectedAnnotationIndex !== null"
            ref="transformer"
            :config="transformerConfig"
          />
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
    </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
// Remove direct Konva import to avoid SSR issues
// Konva will be available through vue-konva plugin

interface CanvasAnnotation {
  type: 'rectangle' | 'polygon' | 'dot' | 'line' | 'circle' | 'freehand'
  startPoint?: { x: number; y: number }
  endPoint?: { x: number; y: number }
  width?: number
  height?: number
  points?: { x: number; y: number }[]
  center?: { x: number; y: number }
  radius?: number
  className?: string
}

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
const transformer = ref<any>(null)
const stageContainer = ref<HTMLElement | null>(null)
const imageLayer = ref<any>(null)
const annotationLayer = ref<any>(null)

// State
const imageObj = ref<any>(null)
const imageScale = ref(1)
const imageOffset = ref({ x: 0, y: 0 })
const originalImageSize = ref({ width: 0, height: 0 })
const displayImageSize = ref({ width: 0, height: 0 })
const stageSize = ref({ width: props.canvasWidth, height: props.canvasHeight })

// Annotation state
const selectedAnnotationIndex = ref<number | null>(null)
const hoveredAnnotationIndex = ref<number | null>(null)
const currentAnnotation = ref<CanvasAnnotation | null>(null)
const isDrawing = ref(false)
const isDrawingPolygon = ref(false)
const startPoint = ref<{ x: number; y: number } | null>(null)
const currentPath = ref<{ x: number; y: number }[]>([])
const mousePosition = ref<{ x: number; y: number } | null>(null)

// UI state
const showAnnotationTools = ref(false)
const annotationToolsPosition = ref<{ x: number; y: number } | null>(null)

// Computed properties
const stageConfig = computed(() => ({
  width: stageSize.value.width,
  height: stageSize.value.height,
  draggable: false
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

const transformerConfig = computed(() => ({
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
    if (newBox.width < 10 || newBox.height < 10) {
      return oldBox
    }
    
    return newBox
  }
}))

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

// Coordinate conversion utilities with image offset support
const displayToOriginal = (point: { x: number; y: number }) => ({
  x: (point.x - imageOffset.value.x) / imageScale.value,
  y: (point.y - imageOffset.value.y) / imageScale.value
})

const originalToDisplay = (point: { x: number; y: number }) => ({
  x: point.x * imageScale.value + imageOffset.value.x,
  y: point.y * imageScale.value + imageOffset.value.y
})

const displaySizeToOriginal = (size: { width: number; height: number }) => ({
  width: size.width / imageScale.value,
  height: size.height / imageScale.value
})

const originalSizeToDisplay = (size: { width: number; height: number }) => ({
  width: size.width * imageScale.value,
  height: size.height * imageScale.value
})

// Utility to check if a point is within the image bounds
const isPointInImageBounds = (point: { x: number; y: number }) => {
  return point.x >= imageOffset.value.x &&
         point.x <= imageOffset.value.x + displayImageSize.value.width &&
         point.y >= imageOffset.value.y &&
         point.y <= imageOffset.value.y + displayImageSize.value.height
}

// Annotation configuration methods with improved styling
const getRectConfig = (annotation: CanvasAnnotation, index: number) => {
  if (!annotation.startPoint || annotation.width === undefined || annotation.height === undefined) {
    return {}
  }
  
  const displayStart = originalToDisplay(annotation.startPoint)
  const displaySize = originalSizeToDisplay({ width: annotation.width, height: annotation.height })
  const isSelected = selectedAnnotationIndex.value === index
  const isHovered = hoveredAnnotationIndex.value === index
  
  return {
    x: displayStart.x,
    y: displayStart.y,
    width: displaySize.width,
    height: displaySize.height,
    stroke: isSelected ? '#4285f4' : (isHovered ? '#34a853' : '#00c851'),
    strokeWidth: isSelected ? 3 : (isHovered ? 2.5 : 2),
    fill: isSelected ? 'rgba(66, 133, 244, 0.1)' : (isHovered ? 'rgba(52, 168, 83, 0.05)' : 'transparent'),
    draggable: true,
    listening: true,
    perfectDrawEnabled: false // Better performance
  }
}

const getPolygonConfig = (annotation: CanvasAnnotation, index: number) => {
  if (!annotation.points) return {}
  
  const displayPoints = annotation.points
    .map(point => originalToDisplay(point))
    .flatMap(point => [point.x, point.y])
  
  const isSelected = selectedAnnotationIndex.value === index
  const isHovered = hoveredAnnotationIndex.value === index
  
  return {
    points: displayPoints,
    stroke: isSelected ? '#4285f4' : (isHovered ? '#34a853' : '#00c851'),
    strokeWidth: isSelected ? 3 : (isHovered ? 2.5 : 2),
    fill: isSelected ? 'rgba(66, 133, 244, 0.1)' : (isHovered ? 'rgba(52, 168, 83, 0.05)' : 'transparent'),
    closed: true,
    draggable: true,
    listening: true,
    perfectDrawEnabled: false
  }
}

const getLineConfig = (annotation: CanvasAnnotation, index: number) => {
  if (!annotation.startPoint || !annotation.endPoint) return {}
  
  const displayStart = originalToDisplay(annotation.startPoint)
  const displayEnd = originalToDisplay(annotation.endPoint)
  const isSelected = selectedAnnotationIndex.value === index
  const isHovered = hoveredAnnotationIndex.value === index
  
  return {
    points: [displayStart.x, displayStart.y, displayEnd.x, displayEnd.y],
    stroke: isSelected ? '#4285f4' : (isHovered ? '#34a853' : '#00c851'),
    strokeWidth: isSelected ? 4 : (isHovered ? 3 : 2),
    draggable: true,
    listening: true,
    lineCap: 'round',
    perfectDrawEnabled: false
  }
}

const getCircleConfig = (annotation: CanvasAnnotation, index: number) => {
  if (!annotation.center || annotation.radius === undefined) return {}
  
  const displayCenter = originalToDisplay(annotation.center)
  const displayRadius = annotation.radius * imageScale.value
  const isSelected = selectedAnnotationIndex.value === index
  const isHovered = hoveredAnnotationIndex.value === index
  
  return {
    x: displayCenter.x,
    y: displayCenter.y,
    radius: displayRadius,
    stroke: isSelected ? '#4285f4' : (isHovered ? '#34a853' : '#00c851'),
    strokeWidth: isSelected ? 3 : (isHovered ? 2.5 : 2),
    fill: isSelected ? 'rgba(66, 133, 244, 0.1)' : (isHovered ? 'rgba(52, 168, 83, 0.05)' : 'transparent'),
    draggable: true,
    listening: true,
    perfectDrawEnabled: false
  }
}

const getDotConfig = (annotation: CanvasAnnotation, index: number) => {
  if (!annotation.center || annotation.radius === undefined) return {}
  
  const displayCenter = originalToDisplay(annotation.center)
  const displayRadius = annotation.radius * imageScale.value
  const isSelected = selectedAnnotationIndex.value === index
  const isHovered = hoveredAnnotationIndex.value === index
  
  return {
    x: displayCenter.x,
    y: displayCenter.y,
    radius: displayRadius,
    stroke: isSelected ? '#4285f4' : (isHovered ? '#34a853' : '#00c851'),
    strokeWidth: isSelected ? 3 : (isHovered ? 2.5 : 2),
    fill: isSelected ? 'rgba(66, 133, 244, 0.2)' : (isHovered ? 'rgba(52, 168, 83, 0.1)' : 'rgba(0, 200, 81, 0.1)'),
    draggable: true,
    listening: true,
    perfectDrawEnabled: false
  }
}

const getLabelConfig = (annotation: CanvasAnnotation, index: number) => {
  let position = { x: 0, y: 0 }
  const isSelected = selectedAnnotationIndex.value === index
  
  if (annotation.type === 'rectangle' && annotation.startPoint) {
    position = originalToDisplay(annotation.startPoint)
    position.y -= 8 // Position above the rectangle
  } else if (annotation.type === 'polygon' && annotation.points && annotation.points.length > 0) {
    const firstPoint = annotation.points[0]
    if (firstPoint) {
      position = originalToDisplay(firstPoint)
      position.y -= 8
    }
  } else if (annotation.type === 'dot' && annotation.center) {
    position = originalToDisplay(annotation.center)
    position.y -= (annotation.radius || 5) * imageScale.value + 8
  }
  
  return {
    x: position.x,
    y: position.y,
    text: annotation.className,
    fontSize: 12,
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'bold',
    fill: isSelected ? '#4285f4' : '#00c851',
    stroke: '#ffffff',
    strokeWidth: 2,
    listening: false,
    perfectDrawEnabled: false
  }
}

const getCurrentRectConfig = () => {
  if (!currentAnnotation.value || !startPoint.value || !isDrawing.value) return {}
  
  const width = Math.abs((currentAnnotation.value.width || 0) * imageScale.value)
  const height = Math.abs((currentAnnotation.value.height || 0) * imageScale.value)
  
  // Calculate proper top-left position for negative dimensions
  const x = Math.min(startPoint.value.x, startPoint.value.x + (currentAnnotation.value.width || 0) * imageScale.value)
  const y = Math.min(startPoint.value.y, startPoint.value.y + (currentAnnotation.value.height || 0) * imageScale.value)
  
  return {
    x: x,
    y: y,
    width: width,
    height: height,
    stroke: '#4285f4',
    strokeWidth: 2,
    fill: 'rgba(66, 133, 244, 0.1)',
    dash: [5, 5],
    listening: false
  }
}

const getCurrentPolygonConfig = () => {
  if (!currentAnnotation.value || currentPath.value.length === 0) return {}
  
  const points = currentPath.value.flatMap(point => [point.x, point.y])
  
  return {
    points: points,
    stroke: '#4285f4',
    strokeWidth: 3,
    fill: 'rgba(66, 133, 244, 0.1)',
    closed: false,
    listening: false,
    lineCap: 'round',
    lineJoin: 'round'
  }
}

const getPolygonPreviewConfig = () => {
  if (!mousePosition.value || currentPath.value.length === 0) return {}
  
  const lastPoint = currentPath.value[currentPath.value.length - 1]
  if (!lastPoint) return {}
  
  return {
    points: [lastPoint.x, lastPoint.y, mousePosition.value.x, mousePosition.value.y],
    stroke: '#4285f4',
    strokeWidth: 2,
    dash: [3, 3],
    listening: false,
    opacity: 0.7
  }
}

const getVertexConfig = (point: { x: number; y: number }, index: number) => {
  const isFirst = index === 0
  const isLast = index === currentPath.value.length - 1
  
  return {
    x: point.x,
    y: point.y,
    radius: 4,
    fill: isFirst ? '#ff4444' : (isLast ? '#4285f4' : '#ffffff'),
    stroke: '#4285f4',
    strokeWidth: 2,
    listening: false,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowBlur: 2,
    shadowOffsetY: 1
  }
}

const getFreehandConfig = (annotation: CanvasAnnotation, index: number) => {
  if (!annotation.points) return {}
  
  const displayPoints = annotation.points
    .map(point => originalToDisplay(point))
    .flatMap(point => [point.x, point.y])
  
  const isSelected = selectedAnnotationIndex.value === index
  const isHovered = hoveredAnnotationIndex.value === index
  
  return {
    points: displayPoints,
    stroke: isSelected ? '#4285f4' : (isHovered ? '#34a853' : '#00c851'),
    strokeWidth: isSelected ? 4 : (isHovered ? 3 : 2),
    fill: 'transparent',
    closed: false,
    draggable: true,
    listening: true,
    tension: 0.3,
    lineCap: 'round',
    lineJoin: 'round',
    perfectDrawEnabled: false
  }
}

const getCurrentCircleConfig = () => {
  if (!currentAnnotation.value || !currentAnnotation.value.center || currentAnnotation.value.radius === undefined) return {}
  
  const displayCenter = originalToDisplay(currentAnnotation.value.center)
  const displayRadius = currentAnnotation.value.radius * imageScale.value
  
  return {
    x: displayCenter.x,
    y: displayCenter.y,
    radius: displayRadius,
    stroke: '#4285f4',
    strokeWidth: 3,
    fill: 'rgba(66, 133, 244, 0.1)',
    listening: false,
    dash: [5, 5]
  }
}

const getCurrentLineConfig = () => {
  if (!currentAnnotation.value || !currentAnnotation.value.startPoint || !currentAnnotation.value.endPoint) return {}
  
  const displayStart = originalToDisplay(currentAnnotation.value.startPoint)
  const displayEnd = originalToDisplay(currentAnnotation.value.endPoint)
  
  return {
    points: [displayStart.x, displayStart.y, displayEnd.x, displayEnd.y],
    stroke: '#4285f4',
    strokeWidth: 3,
    listening: false,
    lineCap: 'round',
    dash: [5, 5]
  }
}

const getCurrentFreehandConfig = () => {
  if (!currentAnnotation.value || currentPath.value.length === 0) return {}
  
  const points = currentPath.value.flatMap(point => [point.x, point.y])
  
  return {
    points: points,
    stroke: '#4285f4',
    strokeWidth: 3,
    fill: 'transparent',
    closed: false,
    listening: false,
    tension: 0.3,
    lineCap: 'round',
    lineJoin: 'round',
    dash: [5, 5]
  }
}

// Event handlers with improved bounds checking
const handleStageMouseDown = (e: any) => {
  const pos = e.target.getStage().getPointerPosition()
  
  if (props.currentTool === 'select') {
    // Check if clicking on empty area
    const clickedOnEmpty = e.target === e.target.getStage()
    if (clickedOnEmpty) {
      selectedAnnotationIndex.value = null
      showAnnotationTools.value = false
      updateTransformer()
    }
    return
  }
  
  // Only allow annotation creation within image bounds
  if (!isPointInImageBounds(pos)) {
    return
  }
  
  // Auto-start annotating for rectangle, line, circle when tool is selected
  if (props.currentTool === 'rectangle' || props.currentTool === 'line' || props.currentTool === 'circle') {
    if (!props.isAnnotating) {
      emit('update:isAnnotating', true)
    }
    
    startPoint.value = pos
    isDrawing.value = true
    
    if (props.currentTool === 'rectangle') {
      currentAnnotation.value = {
        type: 'rectangle',
        startPoint: displayToOriginal(pos),
        width: 0,
        height: 0
      }
    } else if (props.currentTool === 'line') {
      currentAnnotation.value = {
        type: 'line',
        startPoint: displayToOriginal(pos),
        endPoint: displayToOriginal(pos)
      }
    } else if (props.currentTool === 'circle') {
      currentAnnotation.value = {
        type: 'circle',
        center: displayToOriginal(pos),
        radius: 0
      }
    }
  } else if (props.currentTool === 'freehand') {
    if (!props.isAnnotating) {
      emit('update:isAnnotating', true)
    }
    isDrawing.value = true
    currentPath.value = [pos]
    currentAnnotation.value = {
      type: 'freehand',
      points: [displayToOriginal(pos)]
    }
  }
}

const handleStageMouseMove = (e: any) => {
  const pos = e.target.getStage().getPointerPosition()
  mousePosition.value = pos
  
  if (!isDrawing.value || !startPoint.value || !currentAnnotation.value) return
  
  // Clamp position to image bounds
  const clampedPos = {
    x: Math.max(imageOffset.value.x, Math.min(pos.x, imageOffset.value.x + displayImageSize.value.width)),
    y: Math.max(imageOffset.value.y, Math.min(pos.y, imageOffset.value.y + displayImageSize.value.height))
  }
  
  if (props.currentTool === 'rectangle') {
    const width = Math.abs(clampedPos.x - startPoint.value.x)
    const height = Math.abs(clampedPos.y - startPoint.value.y)
    
    // Update current annotation for display
    currentAnnotation.value.width = width / imageScale.value
    currentAnnotation.value.height = height / imageScale.value
    
    // Handle negative dimensions by adjusting start point
    if (clampedPos.x < startPoint.value.x) {
      currentAnnotation.value.startPoint = displayToOriginal({
        x: clampedPos.x,
        y: currentAnnotation.value.startPoint!.y * imageScale.value + imageOffset.value.y
      })
    }
    if (clampedPos.y < startPoint.value.y) {
      currentAnnotation.value.startPoint = displayToOriginal({
        x: currentAnnotation.value.startPoint!.x * imageScale.value + imageOffset.value.x,
        y: clampedPos.y
      })
    }
  } else if (props.currentTool === 'line') {
    currentAnnotation.value.endPoint = displayToOriginal(clampedPos)
  } else if (props.currentTool === 'circle') {
    const distance = Math.hypot(clampedPos.x - startPoint.value.x, clampedPos.y - startPoint.value.y)
    currentAnnotation.value.radius = distance / imageScale.value
  } else if (props.currentTool === 'freehand' && currentAnnotation.value?.points) {
    // Add point to freehand path if distance is sufficient
    const lastPoint = currentPath.value[currentPath.value.length - 1]
    if (lastPoint) {
      const distance = Math.hypot(clampedPos.x - lastPoint.x, clampedPos.y - lastPoint.y)
      if (distance > 2) { // Minimum distance to reduce noise
        currentPath.value.push(clampedPos)
        currentAnnotation.value.points.push(displayToOriginal(clampedPos))
      }
    }
  }
}

const handleStageMouseUp = (e: any) => {
  if (!isDrawing.value) return
  
  isDrawing.value = false
  
  if (currentAnnotation.value) {
    const minSize = 5
    let shouldComplete = false
    
    if (props.currentTool === 'rectangle') {
      const width = Math.abs(currentAnnotation.value.width || 0)
      const height = Math.abs(currentAnnotation.value.height || 0)
      shouldComplete = width > minSize / imageScale.value && height > minSize / imageScale.value
      
      // Normalize the rectangle to have positive dimensions
      if (shouldComplete && startPoint.value) {
        const pos = e.target.getStage().getPointerPosition()
        const topLeft = {
          x: Math.min(startPoint.value.x, pos.x),
          y: Math.min(startPoint.value.y, pos.y)
        }
        const bottomRight = {
          x: Math.max(startPoint.value.x, pos.x),
          y: Math.max(startPoint.value.y, pos.y)
        }
        
        currentAnnotation.value.startPoint = displayToOriginal(topLeft)
        currentAnnotation.value.width = (bottomRight.x - topLeft.x) / imageScale.value
        currentAnnotation.value.height = (bottomRight.y - topLeft.y) / imageScale.value
      }
    } else if (props.currentTool === 'line') {
      const startPt = startPoint.value
      const pos = e.target.getStage().getPointerPosition()
      const distance = Math.hypot(pos.x - startPt!.x, pos.y - startPt!.y)
      shouldComplete = distance > minSize
    } else if (props.currentTool === 'circle') {
      shouldComplete = (currentAnnotation.value.radius || 0) > minSize / imageScale.value
    } else if (props.currentTool === 'freehand') {
      shouldComplete = currentPath.value.length > 3
    }
    
    if (shouldComplete) {
      if (props.classes && props.classes.length > 0) {
        // Show class selector
        const pos = e.target.getStage().getPointerPosition()
        emit('show-class-selector', currentAnnotation.value, pos)
      } else {
        // Complete annotation without class
        completeAnnotation(currentAnnotation.value)
      }
    }
  }
  
  currentAnnotation.value = null
  startPoint.value = null
}

const handleStageClick = (e: any) => {
  const pos = e.target.getStage().getPointerPosition()
  
  // Only allow interaction within image bounds
  if (!isPointInImageBounds(pos)) {
    return
  }
  
  if (props.currentTool === 'polygon') {
    if (!props.isAnnotating) {
      // Start new polygon
      emit('update:isAnnotating', true)
      isDrawingPolygon.value = true
      currentPath.value = [pos]
      currentAnnotation.value = {
        type: 'polygon',
        points: [displayToOriginal(pos)]
      }
    } else {
      // Add point to current polygon
      if (currentAnnotation.value && currentAnnotation.value.points) {
        const firstPoint = currentPath.value[0]
        if (firstPoint) {
          const distance = Math.hypot(pos.x - firstPoint.x, pos.y - firstPoint.y)
          
          if (distance < 15 && currentPath.value.length > 2) {
            // Close polygon - snap to first point
            completePolygon()
          } else {
            currentPath.value.push(pos)
            currentAnnotation.value.points.push(displayToOriginal(pos))
          }
        }
      }
    }
  } else if (props.currentTool === 'dots') {
    // Create dot annotation
    const dotAnnotation: CanvasAnnotation = {
      type: 'dot',
      center: displayToOriginal(pos),
      radius: 5
    }
    
    if (props.classes && props.classes.length > 0) {
      emit('show-class-selector', dotAnnotation, pos)
    } else {
      completeAnnotation(dotAnnotation)
    }
  }
}

const handleStageDoubleClick = () => {
  if (props.currentTool === 'polygon' && props.isAnnotating && currentPath.value.length > 2) {
    completePolygon()
  }
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

const handleDragEnd = (index: number, e: any) => {
  const originalAnnotation = props.annotations[index]
  if (!originalAnnotation) return
  
  const annotation: CanvasAnnotation = { ...originalAnnotation }
  const node = e.target
  
  // Get the new position and constrain to image bounds
  let newPos = { x: node.x(), y: node.y() }
  
  // Clamp position to ensure annotation stays within image bounds
  if (annotation.type === 'rectangle' && annotation.width && annotation.height) {
    const displaySize = originalSizeToDisplay({ width: annotation.width, height: annotation.height })
    newPos.x = Math.max(imageOffset.value.x, Math.min(newPos.x, imageOffset.value.x + displayImageSize.value.width - displaySize.width))
    newPos.y = Math.max(imageOffset.value.y, Math.min(newPos.y, imageOffset.value.y + displayImageSize.value.height - displaySize.height))
    
    node.position(newPos)
    annotation.startPoint = displayToOriginal(newPos)
  } else if (annotation.type === 'polygon' && annotation.points) {
    const dx = node.x() / imageScale.value
    const dy = node.y() / imageScale.value
    
    // Validate that all points would remain within bounds
    const newPoints = annotation.points.map(point => ({
      x: point.x + dx,
      y: point.y + dy
    }))
    
    const allPointsValid = newPoints.every(point => 
      point.x >= 0 && point.x <= originalImageSize.value.width &&
      point.y >= 0 && point.y <= originalImageSize.value.height
    )
    
    if (allPointsValid) {
      annotation.points = newPoints
    }
    
    // Reset node position after updating points
    node.position({ x: 0, y: 0 })
  } else if (annotation.type === 'dot' && annotation.center && annotation.radius) {
    const displayRadius = annotation.radius * imageScale.value
    newPos.x = Math.max(imageOffset.value.x + displayRadius, Math.min(newPos.x, imageOffset.value.x + displayImageSize.value.width - displayRadius))
    newPos.y = Math.max(imageOffset.value.y + displayRadius, Math.min(newPos.y, imageOffset.value.y + displayImageSize.value.height - displayRadius))
    
    node.position(newPos)
    annotation.center = displayToOriginal(newPos)
  }
  
  emit('annotation-updated', annotation, index)
}

const handleTransformEnd = (index: number, e: any) => {
  const originalAnnotation = props.annotations[index]
  if (!originalAnnotation) return
  
  const annotation: CanvasAnnotation = { ...originalAnnotation }
  const node = e.target
  
  if (annotation.type === 'rectangle') {
    let newSize = displaySizeToOriginal({
      width: node.width() * node.scaleX(),
      height: node.height() * node.scaleY()
    })
    let newStart = displayToOriginal({ x: node.x(), y: node.y() })
    
    // Constrain the rectangle to stay within image bounds
    newStart.x = Math.max(0, Math.min(newStart.x, originalImageSize.value.width - newSize.width))
    newStart.y = Math.max(0, Math.min(newStart.y, originalImageSize.value.height - newSize.height))
    
    // Ensure minimum size
    newSize.width = Math.max(5, newSize.width)
    newSize.height = Math.max(5, newSize.height)
    
    // Ensure the annotation doesn't extend beyond image bounds
    if (newStart.x + newSize.width > originalImageSize.value.width) {
      newSize.width = originalImageSize.value.width - newStart.x
    }
    if (newStart.y + newSize.height > originalImageSize.value.height) {
      newSize.height = originalImageSize.value.height - newStart.y
    }
    
    annotation.startPoint = newStart
    annotation.width = newSize.width
    annotation.height = newSize.height
    
    // Update node position and size to reflect constrained values
    const constrainedDisplayStart = originalToDisplay(newStart)
    const constrainedDisplaySize = originalSizeToDisplay(newSize)
    
    node.position(constrainedDisplayStart)
    node.size(constrainedDisplaySize)
    
    // Reset scale to 1 after transform
    node.scaleX(1)
    node.scaleY(1)
    
    emit('annotation-updated', annotation, index)
  }
}

// Annotation management methods
const completeAnnotation = (annotation: CanvasAnnotation) => {
  emit('annotation-completed', annotation)
  emit('update:isAnnotating', false)
  currentAnnotation.value = null
  currentPath.value = []
}

const completePolygon = () => {
  if (currentAnnotation.value && currentAnnotation.value.points) {
    if (props.classes && props.classes.length > 0) {
      const centerX = currentPath.value.reduce((sum, p) => sum + p.x, 0) / currentPath.value.length
      const centerY = currentPath.value.reduce((sum, p) => sum + p.y, 0) / currentPath.value.length
      emit('show-class-selector', currentAnnotation.value, { x: centerX, y: centerY })
    } else {
      completeAnnotation(currentAnnotation.value)
    }
  }
  emit('update:isAnnotating', false)
  isDrawingPolygon.value = false
}

const editAnnotation = () => {
  if (selectedAnnotationIndex.value !== null) {
    // Implementation for editing can be added here
  }
  showAnnotationTools.value = false
}

const deleteAnnotation = () => {
  if (selectedAnnotationIndex.value !== null) {
    emit('annotation-deleted', selectedAnnotationIndex.value)
    selectedAnnotationIndex.value = null
    showAnnotationTools.value = false
    updateTransformer()
  }
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
  if (!transformer.value) return
  
  const transformerNode = transformer.value.getNode()
  
  if (selectedAnnotationIndex.value !== null) {
    // Find the selected annotation node
    const layer = annotationLayer.value?.getNode()
    if (layer) {
      const nodes = layer.getChildren()
      const selectedNode = nodes.find((node: any, index: number) => {
        // Skip text nodes (labels)
        return node.getClassName() !== 'Text' && index === selectedAnnotationIndex.value! * 2 // *2 because of text labels
      })
      
      if (selectedNode) {
        transformerNode.nodes([selectedNode])
      }
    }
  } else {
    transformerNode.nodes([])
  }
  
  transformerNode.getLayer()?.batchDraw()
}

// Public methods
const completeCurrentAnnotation = (className?: string) => {
  if (currentAnnotation.value) {
    if (className) {
      currentAnnotation.value.className = className
    }
    completeAnnotation(currentAnnotation.value)
  }
}

const cancelCurrentAnnotation = () => {
  currentAnnotation.value = null
  currentPath.value = []
  startPoint.value = null
  isDrawing.value = false
  isDrawingPolygon.value = false
  mousePosition.value = null
  emit('update:isAnnotating', false)
}

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

watch(selectedAnnotationIndex, () => {
  nextTick(() => {
    updateTransformer()
  })
})

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
onMounted(() => {
  // Try to load image immediately if URL is available
  if (props.imageUrl) {
    loadImage(props.imageUrl).catch(error => {
      console.error('KonvaAnnotationCanvas: Manual image load failed:', error)
    })
  }
})

onUnmounted(() => {
  if (transformerUpdateTimeout) {
    clearTimeout(transformerUpdateTimeout)
  }
})

// Expose methods to parent with enhanced functionality
defineExpose({
  completeCurrentAnnotation,
  cancelCurrentAnnotation,
  getImageScale: () => imageScale.value,
  getImageOffset: () => imageOffset.value,
  getOriginalImageSize: () => originalImageSize.value,
  getDisplayImageSize: () => displayImageSize.value,
  isPointInBounds: isPointInImageBounds,
  convertToOriginal: displayToOriginal,
  convertToDisplay: originalToDisplay
})
</script>
