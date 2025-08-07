import { adaptiveSimplifyPolygon, shouldSimplifyPolygon, type Point as PolygonPoint } from '~/utils/polygonOptimization'

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

export const useFreehandConfig = () => {
  const createFreehandConfig = (
    annotation: CanvasAnnotation,
    index: number,
    selectedIndex: number | null,
    hoveredIndex: number | null,
    displayTransform: (point: { x: number; y: number }) => { x: number; y: number },
    zoomLevel: number = 1.0,
    interactionEnabled: boolean = true
  ) => {
    // Validate freehand annotation requirements
    if (annotation.type !== 'freehand' || !annotation.points || annotation.points.length === 0) {
      return {}
    }

    // Determine if we should simplify the freehand path for performance
    let processedPoints = annotation.points
    if (shouldSimplifyPolygon(annotation.points.length, zoomLevel)) {
      processedPoints = adaptiveSimplifyPolygon(annotation.points as PolygonPoint[], zoomLevel, 2.0) // Higher epsilon for freehand
    }

    // Convert all points to display coordinates and flatten them
    const displayPoints = processedPoints
      .map(point => displayTransform(point))
      .flatMap(point => [point.x, point.y])

    // Determine styling based on selection and hover state
    const isSelected = selectedIndex === index
    const isHovered = hoveredIndex === index
    const isInteracting = isSelected || isHovered

    return {
      points: displayPoints,
      stroke: isSelected ? '#4285f4' : (isHovered ? '#34a853' : '#00c851'),
      strokeWidth: isSelected ? 4 : (isHovered ? 3 : 2),
      fill: 'transparent',
      closed: false,
      draggable: isInteracting && interactionEnabled,
      listening: isInteracting && interactionEnabled, // Only listen when interaction is needed
      hitStrokeWidth: 20, // Increase hit area for better selection
      tension: 0.3,
      lineCap: 'round',
      lineJoin: 'round',
      perfectDrawEnabled: false, // Better performance for complex paths
      name: 'freehand' // Add name for easier identification
    }
  }

  return {
    createFreehandConfig
  }
}
