import { adaptiveSimplifyPolygon, shouldSimplifyPolygon, type Point as PolygonPoint } from '~/utils/polygonOptimization'
import { getClassColor, withOpacity } from '~/utils/classColorPalette'

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

interface PolygonConfig {
  points: number[]
  stroke: string
  strokeWidth: number
  fill: string
  closed: boolean
  draggable: boolean
  listening: boolean
  perfectDrawEnabled: boolean
  name?: string
}

export function usePolygonConfig() {
  /**
   * Generate configuration for a polygon annotation in Konva with performance optimizations
   * @param annotation - The annotation object containing polygon data
   * @param index - The index of the annotation in the annotations array
   * @param selectedIndex - Index of the currently selected annotation
   * @param hoveredIndex - Index of the currently hovered annotation
   * @param displayTransform - Function to convert original coordinates to display coordinates
   * @param zoomLevel - Current zoom level for adaptive simplification (optional)
   * @param interactionEnabled - Whether interaction (listening) should be enabled (optional)
   * @param classes - Array of class names for color mapping (optional)
   * @returns Konva polygon configuration object or empty object if invalid
   */
  const createPolygonConfig = (
    annotation: CanvasAnnotation,
    index: number,
    selectedIndex: number | null,
    hoveredIndex: number | null,
    displayTransform: (point: { x: number; y: number }) => { x: number; y: number },
    zoomLevel: number = 1.0,
    interactionEnabled: boolean = true,
    classes: string[] = []
  ): PolygonConfig | Record<string, never> => {
    // Validate required properties
    if (!annotation.points || annotation.points.length === 0) {
      return {}
    }

    // Determine if we should simplify the polygon for performance
    let processedPoints = annotation.points
    let wasSimplified = false
    
    if (shouldSimplifyPolygon(annotation.points.length, zoomLevel)) {
      const originalCount = annotation.points.length
      processedPoints = adaptiveSimplifyPolygon(annotation.points as PolygonPoint[], zoomLevel, 1.0)
      wasSimplified = processedPoints.length < originalCount
      
      // Debug log to see simplification in action
      if (wasSimplified) {
        console.log(`Polygon simplified: ${originalCount} → ${processedPoints.length} points (zoom: ${zoomLevel.toFixed(2)})`)
      }
    }

    // Convert points from original to display coordinates and flatten for Konva
    const displayPoints = processedPoints
      .map(point => displayTransform(point))
      .flatMap(point => [point.x, point.y])

    // Determine visual state
    const isSelected = selectedIndex === index
    const isHovered = hoveredIndex === index
    const isInteracting = isSelected || isHovered

    // Get class-based color or fallback to default
    const classColor = getClassColor(annotation.className, classes)
    
    // Use class color as base, with selected/hovered states taking priority
    const strokeColor = isSelected ? '#4285f4' : (isHovered ? '#34a853' : classColor)
    const fillColor = isSelected 
      ? 'rgba(66, 133, 244, 0.1)' 
      : (isHovered ? 'rgba(52, 168, 83, 0.05)' : withOpacity(classColor, 0.05))

    // Return Konva configuration with conditional styling and performance optimizations
    return {
      points: displayPoints,
      stroke: strokeColor,
      strokeWidth: isSelected ? 3 : (isHovered ? 2.5 : 2),
      fill: fillColor,
      closed: true,
      draggable: isInteracting && interactionEnabled,
      listening: isInteracting && interactionEnabled, // Only listen when interaction is needed
      perfectDrawEnabled: false, // Better performance for complex polygons
      name: 'polygon' // Add name for easier identification
    }
  }

  return {
    createPolygonConfig
  }
}
