<template>
  <div class="container mx-auto p-4">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">Image Annotation Demo</h1>
      <button 
        @click="$router.push('/')"
        class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
      >
        Back to Home
      </button>
    </div>
    
    <!-- Tool Selection -->
    <div class="mb-4 flex items-center space-x-4">
      <button 
        v-for="tool in tools" 
        :key="tool"
        @click="selectTool(tool)"
        :class="['px-4 py-2 rounded transition-colors', 
                 currentTool === tool ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300']"
      >
        {{ tool }}
      </button>

      <!-- Complete Button -->
      <button 
        v-if="isAnnotating"
        @click="completeAnnotation"
        class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
      >
        Complete
      </button>

      <!-- Cancel Button -->
      <button 
        v-if="isAnnotating"
        @click="cancelAnnotation"
        class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
      >
        Cancel
      </button>
    </div>

    <!-- Add this after the tool selection buttons -->
    <button 
      @click="isJsonModalOpen = true"
      class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
    >
      Import JSON
    </button>

    <!-- Image Upload -->
    <div v-if="!imageUrl" class="mb-4">
      <input 
        type="file" 
        accept="image/*" 
        @change="handleImageUpload"
        class="mb-2"
      >
    </div>

    <!-- Instructions -->
    <div v-if="imageUrl" class="mb-4 text-sm text-gray-600">
      <p v-if="currentTool === 'rectangle'">
        Click to set start point, move and click again to complete rectangle
      </p>
      <p v-if="currentTool === 'polygon'">
        Click to add points. Double-click or click near first point to complete polygon
      </p>
      <p class="mt-1">Press ESC to cancel current annotation</p>
    </div>

    <!-- Canvas Container -->
    <div class="relative" ref="canvasContainer">
      <canvas 
        ref="canvas"
        @click="handleClick"
        @mousemove="handleMouseMove"
        @mousedown="handleMouseDown"
        @mouseup="handleMouseUp"
        @dblclick="handleDoubleClick"
        class="border border-gray-300"
        :class="{ 
          'cursor-crosshair': !isAnnotating && !isDragging && currentTool !== 'select',
          'cursor-pointer': isAnnotating || (currentTool === 'select' && hoveredAnnotation !== null),
          'cursor-move': isDragging,
        }"
      ></canvas>

      <!-- Annotation Tools Overlay -->
      <div 
        v-if="clickedAnnotation !== null && !isAnnotating && !isDragging"
        class="absolute bg-white rounded-lg shadow-lg p-2 flex space-x-2 z-10 transition-opacity duration-200"
        :style="{
          left: `${annotationToolsPosition.x}px`,
          top: `${annotationToolsPosition.y}px`,
        }"
      >
        <button
          @click="startEditing(clickedAnnotation)"
          class="p-2 rounded-full hover:bg-gray-100 text-blue-500 transition-colors"
          title="Edit"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          @click="deleteAnnotation(clickedAnnotation)"
          class="p-2 rounded-full hover:bg-gray-100 text-red-500 transition-colors"
          title="Delete"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        <button
          @click="toggleDragMode(clickedAnnotation)"
          class="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          title="Drag"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Update the JSON panel section -->
    <div class="mt-4">
      <div class="flex justify-between items-center mb-2">
        <h2 class="text-xl font-bold">COCO Format Annotations</h2>
        <button 
          @click="copyJsonToClipboard"
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center space-x-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          <span>Copy JSON</span>
        </button>
      </div>
      <div class="bg-gray-100 p-4 rounded-lg">
        <pre class="text-sm overflow-auto max-h-60">{{ JSON.stringify(cocoAnnotations, null, 2) }}</pre>
      </div>
    </div>

    <!-- Add this modal at the end of the template, before the closing div -->
    <div v-if="isJsonModalOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <h2 class="text-xl font-bold mb-4">Import COCO Format Annotations</h2>
        <textarea
          v-model="jsonInput"
          class="w-full h-64 p-2 border rounded mb-4 font-mono text-sm"
          placeholder="Paste COCO format JSON here..."
        ></textarea>
        <div class="flex justify-end space-x-2">
          <button
            @click="isJsonModalOpen = false"
            class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="importCocoAnnotations"
            class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const canvas = ref(null)
const canvasContainer = ref(null)
const ctx = ref(null)
const imageUrl = ref(null)
const startPoint = ref(null)
const currentPath = ref([])
const annotations = ref([])
const isAnnotating = ref(false)
const mousePosition = ref({ x: 0, y: 0 })

// New refs for annotation interaction
const hoveredAnnotation = ref(null)
const isDragging = ref(false)
const dragStartPosition = ref(null)
const selectedAnnotation = ref(null)
const annotationToolsPosition = ref({ x: 0, y: 0 })
const hoveredPoint = ref(null) // Track hovered handle point
const isOverAnnotation = ref(false) // Track if mouse is over any annotation

// Add 'select' to tools
const tools = ['select', 'rectangle', 'polygon']
const currentTool = ref('rectangle')

// Add new ref for clicked annotation
const clickedAnnotation = ref(null)

// Add these new refs
const isJsonModalOpen = ref(false)
const jsonInput = ref('')

// Add this computed property after the existing refs
const cocoAnnotations = computed(() => {
  return annotations.value.map((ann, index) => {
    if (ann.type === 'rectangle') {
      // Convert to COCO format: [x,y,width,height] where x,y is top-left corner
      const x = ann.startPoint.x
      const y = ann.startPoint.y
      const width = ann.width
      const height = ann.height
      
      // Normalize coordinates (COCO format requires positive width/height)
      const bbox = [
        Math.min(x, x + width),  // x
        Math.min(y, y + height), // y
        Math.abs(width),         // width
        Math.abs(height)         // height
      ]
      
      return {
        id: index + 1,
        image_id: 1,
        category_id: 1,
        bbox: bbox,
        area: Math.abs(width * height),
        segmentation: [] // Empty for bbox annotations
      }
    } else if (ann.type === 'polygon') {
      // For polygons, COCO format requires [x1,y1,x2,y2,...] array
      const segmentation = [
        ann.points.reduce((acc, point) => {
          acc.push(point.x, point.y)
          return acc
        }, [])
      ]
      
      // Calculate bounding box from polygon points
      const xs = ann.points.map(p => p.x)
      const ys = ann.points.map(p => p.y)
      const minX = Math.min(...xs)
      const minY = Math.min(...ys)
      const width = Math.max(...xs) - minX
      const height = Math.max(...ys) - minY
      
      return {
        id: index + 1,
        image_id: 1,
        category_id: 1,
        bbox: [minX, minY, width, height],
        area: calculatePolygonArea(ann.points),
        segmentation: segmentation
      }
    }
  }).filter(Boolean) // Remove any undefined entries
})

// Add helper function to calculate polygon area
const calculatePolygonArea = (points) => {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }
  return Math.abs(area) / 2
}

// Initialize canvas and event listeners
onMounted(() => {
  ctx.value = canvas.value.getContext('2d')
  resetCanvas()
  
  // Add keyboard listener for ESC
  window.addEventListener('keydown', handleKeyDown)
  // Add click outside listener
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('click', handleClickOutside)
})

const handleKeyDown = (event) => {
  if (event.key === 'Escape') {
    cancelAnnotation()
  }
}

const selectTool = (tool) => {
  if (isAnnotating.value) {
    cancelAnnotation()
  }
  currentTool.value = tool
}

const resetCanvas = () => {
  if (!canvas.value) return
  canvas.value.width = 800
  canvas.value.height = 600
  ctx.value.clearRect(0, 0, canvas.value.width, canvas.value.height)
  drawExistingAnnotations()
}

const handleImageUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      imageUrl.value = e.target.result
      canvas.value.width = img.width
      canvas.value.height = img.height
      ctx.value.drawImage(img, 0, 0)
      drawExistingAnnotations()
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
}

const getCanvasPoint = (event) => {
  const rect = canvas.value.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
}

const handleClick = (event) => {
  const point = getCanvasPoint(event)
  
  if (currentTool.value === 'rectangle') {
    if (!isAnnotating.value) {
      startPoint.value = point
      isAnnotating.value = true
    } else {
      completeRectangle(point)
    }
  } else if (currentTool.value === 'polygon') {
    if (!isAnnotating.value) {
      currentPath.value = [point]
      isAnnotating.value = true
    } else {
      // Check if clicking near first point to close polygon
      const firstPoint = currentPath.value[0]
      const distance = Math.hypot(point.x - firstPoint.x, point.y - firstPoint.y)
      
      if (distance < 20 && currentPath.value.length > 2) {
        completePolygon()
      } else {
        currentPath.value.push(point)
      }
    }
  } else {
    // Handle clicking annotations
    const found = findAnnotationUnderPoint(point)
    if (found !== null) {
      clickedAnnotation.value = found
      updateAnnotationToolsPosition(point)
    } else {
      // Clicked outside any annotation
      clickedAnnotation.value = null
    }
  }
}

const handleDoubleClick = () => {
  if (currentTool.value === 'polygon' && isAnnotating.value && currentPath.value.length > 2) {
    completePolygon()
  }
}

const handleMouseMove = (event) => {
  const point = getCanvasPoint(event)
  mousePosition.value = point

  if (isDragging.value && selectedAnnotation.value !== null) {
    const dx = point.x - dragStartPosition.value.x
    const dy = point.y - dragStartPosition.value.y
    
    const annotation = annotations.value[selectedAnnotation.value]
    if (annotation.type === 'rectangle') {
      annotation.startPoint.x = annotation.startPoint.x + dx
      annotation.startPoint.y = annotation.startPoint.y + dy
    } else if (annotation.type === 'polygon') {
      annotation.points = annotation.points.map(p => ({
        x: p.x + dx,
        y: p.y + dy
      }))
    }
    
    dragStartPosition.value = point
    redrawCanvas()
  } else if (isAnnotating.value) {
    // Show preview while creating new annotations
    redrawCanvas()
  } else if (!isAnnotating.value) {
    // Reset hover states
    hoveredPoint.value = null
    isOverAnnotation.value = false
    
    if (selectedAnnotation.value !== null) {
      const annotation = annotations.value[selectedAnnotation.value]
      const handlePoint = findHandlePoint(point, annotation)
      if (handlePoint !== null) {
        hoveredPoint.value = handlePoint
        isOverAnnotation.value = true
      }
    }
    
    if (!isOverAnnotation.value) {
      const found = findAnnotationUnderPoint(point)
      hoveredAnnotation.value = found
      if (found !== null) {
        isOverAnnotation.value = true
      }
    }
    redrawCanvas()
  }
}

// Find annotation under point
const findAnnotationUnderPoint = (point) => {
  // Loop through annotations in reverse order (top to bottom)
  for (let i = annotations.value.length - 1; i >= 0; i--) {
    const annotation = annotations.value[i]
    if (isPointInAnnotation(point, annotation)) {
      return i
    }
  }
  return null
}

// Check if point is inside annotation
const isPointInAnnotation = (point, annotation) => {
  if (annotation.type === 'rectangle') {
    // Normalize rectangle coordinates in case of negative width/height
    const x = annotation.startPoint.x
    const y = annotation.startPoint.y
    const width = annotation.width
    const height = annotation.height
    
    const minX = Math.min(x, x + width)
    const maxX = Math.max(x, x + width)
    const minY = Math.min(y, y + height)
    const maxY = Math.max(y, y + height)
    
    return point.x >= minX && 
           point.x <= maxX && 
           point.y >= minY && 
           point.y <= maxY
  } else if (annotation.type === 'polygon') {
    return isPointInPolygon(point, annotation.points)
  }
  return false
}

// Point in polygon check
const isPointInPolygon = (point, points) => {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, yi = points[i].y
    const xj = points[j].x, yj = points[j].y
    
    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

// Update tools position
const updateAnnotationToolsPosition = (point) => {
  const rect = canvas.value.getBoundingClientRect()
  annotationToolsPosition.value = {
    x: point.x + rect.left - 60, // Offset to position tools to the left
    y: point.y + rect.top - 40   // Offset to position tools above
  }
}

// Start editing annotation
const startEditing = (index) => {
  selectedAnnotation.value = index
  const annotation = annotations.value[index]
  
  if (annotation.type === 'rectangle') {
    isAnnotating.value = true
    currentTool.value = 'rectangle'
    startPoint.value = { ...annotation.startPoint }
  } else if (annotation.type === 'polygon') {
    isAnnotating.value = true
    currentTool.value = 'polygon'
    currentPath.value = [...annotation.points]
  }
  
  // Remove the original annotation
  annotations.value.splice(index, 1)
  clickedAnnotation.value = null
}

// Toggle drag mode
const toggleDragMode = (index) => {
  isDragging.value = true
  selectedAnnotation.value = index
  dragStartPosition.value = mousePosition.value
  clickedAnnotation.value = null
}

// Handle drag
const handleDrag = (point) => {
  const annotation = annotations.value[selectedAnnotation.value]
  const dx = point.x - mousePosition.value.x
  const dy = point.y - mousePosition.value.y

  if (annotation.type === 'rectangle') {
    annotation.startPoint.x += dx
    annotation.startPoint.y += dy
  } else if (annotation.type === 'polygon') {
    annotation.points = annotation.points.map(p => ({
      x: p.x + dx,
      y: p.y + dy
    }))
  }
}

// Handle mouse down
const handleMouseDown = (event) => {
  if (currentTool.value === 'select') {
    const point = getCanvasPoint(event)
    const found = findAnnotationUnderPoint(point)
    if (found !== null) {
      isDragging.value = true
      selectedAnnotation.value = found
      dragStartPosition.value = point
      clickedAnnotation.value = null
    }
  }
}

// Handle mouse up
const handleMouseUp = () => {
  if (isDragging.value) {
    isDragging.value = false
    selectedAnnotation.value = null
    dragStartPosition.value = null
  }
}

// Enhanced draw function
const redrawCanvas = () => {
  ctx.value.clearRect(0, 0, canvas.value.width, canvas.value.height)
  
  // Draw background image
  if (imageUrl.value) {
    const img = new Image()
    img.src = imageUrl.value
    ctx.value.drawImage(img, 0, 0)
  }

  // Draw existing annotations
  annotations.value.forEach((annotation, index) => {
    const isHovered = index === hoveredAnnotation.value
    const isSelected = index === selectedAnnotation.value
    
    // Draw fill with transparency
    ctx.value.beginPath()
    if (annotation.type === 'rectangle') {
      ctx.value.rect(
        annotation.startPoint.x,
        annotation.startPoint.y,
        annotation.width,
        annotation.height
      )
    } else if (annotation.type === 'polygon') {
      ctx.value.moveTo(annotation.points[0].x, annotation.points[0].y)
      annotation.points.forEach(point => {
        ctx.value.lineTo(point.x, point.y)
      })
      ctx.value.closePath()
    }
    
    // Fill with semi-transparent color
    if (isHovered || isSelected) {
      ctx.value.fillStyle = 'rgba(0, 255, 0, 0.1)'
      ctx.value.fill()
    }
    
    // Draw stroke
    ctx.value.strokeStyle = isSelected ? '#00ff00' : (isHovered ? '#00dd00' : '#00cc00')
    ctx.value.lineWidth = isSelected ? 3 : (isHovered ? 2.5 : 2)
    ctx.value.stroke()
    
    // Draw handle points if selected
    if (isSelected) {
      const handlePoints = getHandlePoints(annotation)
      handlePoints.forEach((point, handleIndex) => {
        ctx.value.beginPath()
        ctx.value.fillStyle = hoveredPoint.value === handleIndex ? '#00ff00' : '#ffffff'
        ctx.value.arc(point.x, point.y, 4, 0, Math.PI * 2)
        ctx.value.fill()
        ctx.value.stroke()
      })
    }
  })

  // Draw current annotation
  if (isAnnotating.value) {
    ctx.value.beginPath()
    ctx.value.strokeStyle = '#00ff00'
    ctx.value.lineWidth = 2

    if (currentTool.value === 'rectangle' && startPoint.value) {
      const width = mousePosition.value.x - startPoint.value.x
      const height = mousePosition.value.y - startPoint.value.y
      ctx.value.strokeRect(
        startPoint.value.x,
        startPoint.value.y,
        width,
        height
      )
    } else if (currentTool.value === 'polygon' && currentPath.value.length > 0) {
      // Draw completed lines
      ctx.value.moveTo(currentPath.value[0].x, currentPath.value[0].y)
      currentPath.value.forEach(point => {
        ctx.value.lineTo(point.x, point.y)
      })
      
      // Draw line to current mouse position
      ctx.value.lineTo(mousePosition.value.x, mousePosition.value.y)
      ctx.value.stroke()

      // Draw points
      currentPath.value.forEach((point, index) => {
        ctx.value.beginPath()
        ctx.value.fillStyle = index === 0 ? '#00ff00' : '#ffffff'
        ctx.value.arc(point.x, point.y, 4, 0, Math.PI * 2)
        ctx.value.fill()
        ctx.value.stroke()
      })
    }
  }
}

// Draw handle points for rectangle
const drawHandlePoints = (annotation) => {
  const points = [
    { x: annotation.startPoint.x, y: annotation.startPoint.y },
    { x: annotation.startPoint.x + annotation.width, y: annotation.startPoint.y },
    { x: annotation.startPoint.x + annotation.width, y: annotation.startPoint.y + annotation.height },
    { x: annotation.startPoint.x, y: annotation.startPoint.y + annotation.height }
  ]
  
  points.forEach(point => {
    ctx.value.beginPath()
    ctx.value.fillStyle = '#ffffff'
    ctx.value.arc(point.x, point.y, 4, 0, Math.PI * 2)
    ctx.value.fill()
    ctx.value.stroke()
  })
}

const completeRectangle = (endPoint) => {
  annotations.value.push({
    type: 'rectangle',
    startPoint: { ...startPoint.value },
    width: endPoint.x - startPoint.value.x,
    height: endPoint.y - startPoint.value.y
  })
  
  isAnnotating.value = false
  startPoint.value = null
  redrawCanvas()
}

const completePolygon = () => {
  if (currentPath.value.length < 3) return
  
  annotations.value.push({
    type: 'polygon',
    points: [...currentPath.value]
  })
  
  isAnnotating.value = false
  currentPath.value = []
  redrawCanvas()
}

const completeAnnotation = () => {
  if (!isAnnotating.value) return
  
  if (currentTool.value === 'rectangle' && startPoint.value) {
    completeRectangle(mousePosition.value)
  } else if (currentTool.value === 'polygon' && currentPath.value.length > 2) {
    completePolygon()
  }
}

const cancelAnnotation = () => {
  isAnnotating.value = false
  startPoint.value = null
  currentPath.value = []
  clickedAnnotation.value = null
  redrawCanvas()
}

const drawExistingAnnotations = () => {
  ctx.value.strokeStyle = '#00ff00'
  ctx.value.lineWidth = 2

  annotations.value.forEach(annotation => {
    ctx.value.beginPath()
    if (annotation.type === 'rectangle') {
      ctx.value.strokeRect(
        annotation.startPoint.x,
        annotation.startPoint.y,
        annotation.width,
        annotation.height
      )
    } else if (annotation.type === 'polygon') {
      ctx.value.moveTo(annotation.points[0].x, annotation.points[0].y)
      annotation.points.forEach(point => {
        ctx.value.lineTo(point.x, point.y)
      })
      ctx.value.closePath()
      ctx.value.stroke()
    }
  })
}

const deleteAnnotation = (index) => {
  annotations.value.splice(index, 1)
  clickedAnnotation.value = null
  redrawCanvas()
}

// Add this new function to find handle points
const findHandlePoint = (point, annotation) => {
  const handlePoints = getHandlePoints(annotation)
  const handleRadius = 6 // Slightly larger than visual radius for easier interaction

  for (let i = 0; i < handlePoints.length; i++) {
    const handle = handlePoints[i]
    const distance = Math.hypot(point.x - handle.x, point.y - handle.y)
    if (distance <= handleRadius) {
      return i
    }
  }
  return null
}

// Add this function to get handle points for an annotation
const getHandlePoints = (annotation) => {
  if (annotation.type === 'rectangle') {
    return [
      { x: annotation.startPoint.x, y: annotation.startPoint.y },
      { x: annotation.startPoint.x + annotation.width, y: annotation.startPoint.y },
      { x: annotation.startPoint.x + annotation.width, y: annotation.startPoint.y + annotation.height },
      { x: annotation.startPoint.x, y: annotation.startPoint.y + annotation.height }
    ]
  } else if (annotation.type === 'polygon') {
    return annotation.points
  }
  return []
}

// Add click outside handler
const handleClickOutside = (event) => {
  // Check if click is outside canvas
  if (!canvas.value.contains(event.target)) {
    clickedAnnotation.value = null
  }
}

// Add this new function to handle JSON import
const importCocoAnnotations = () => {
  try {
    let data = JSON.parse(jsonInput.value)
    
    // If the input is just an array, wrap it in the expected format
    if (Array.isArray(data)) {
      data = { annotations: data }
    }
    
    // Validate basic COCO format
    if (!data.annotations || !Array.isArray(data.annotations)) {
      throw new Error('Invalid COCO format: missing annotations array')
    }

    // Convert COCO annotations to our format
    const newAnnotations = data.annotations.map(ann => {
      // Check for segmentation first (prioritize polygon over bbox)
      if (ann.segmentation && Array.isArray(ann.segmentation) && ann.segmentation[0]) {
        // COCO segmentation format is [[x1,y1,x2,y2,...]]
        const coords = ann.segmentation[0]
        const points = []
        
        // Convert flat array of coordinates to points array
        for (let i = 0; i < coords.length; i += 2) {
          if (i + 1 < coords.length) {
            points.push({
              x: coords[i],
              y: coords[i + 1]
            })
          }
        }
        
        // Only create polygon if we have at least 3 points
        if (points.length >= 3) {
          return {
            type: 'polygon',
            points: points
          }
        }
      } else if (ann.bbox) {
        // If no valid segmentation, try bbox
        return {
          type: 'rectangle',
          startPoint: { x: ann.bbox[0], y: ann.bbox[1] },
          width: ann.bbox[2],
          height: ann.bbox[3]
        }
      }
      return null
    }).filter(Boolean)

    // Add new annotations to existing ones
    annotations.value.push(...newAnnotations)
    
    // Close modal and clear input
    isJsonModalOpen.value = false
    jsonInput.value = ''
    
    // Redraw canvas
    redrawCanvas()
  } catch (error) {
    alert('Error importing annotations: ' + error.message)
  }
}

// Add this new function to handle JSON copying
const copyJsonToClipboard = () => {
  const jsonString = JSON.stringify(cocoAnnotations.value, null, 2)
  navigator.clipboard.writeText(jsonString)
    .then(() => {
      alert('JSON copied to clipboard!')
    })
    .catch(err => {
      console.error('Failed to copy JSON:', err)
      alert('Failed to copy JSON to clipboard')
    })
}
</script>

<style scoped>
.canvas-container {
  position: relative;
}

canvas {
  cursor: crosshair;
}

.annotation-tools {
  position: absolute;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 4px;
  display: flex;
  gap: 4px;
  z-index: 10;
}

.tool-button {
  padding: 6px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.tool-button:hover {
  background-color: #f3f4f6;
}
</style>