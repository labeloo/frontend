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
}

export function usePolygonConfig() {
  /**
   * Generate configuration for a polygon annotation in Konva
   * @param annotation - The annotation object containing polygon data
   * @param index - The index of the annotation in the annotations array
   * @param selectedIndex - Index of the currently selected annotation
   * @param hoveredIndex - Index of the currently hovered annotation
   * @param displayTransform - Function to convert original coordinates to display coordinates
   * @returns Konva polygon configuration object or empty object if invalid
   */
  const createPolygonConfig = (
    annotation: CanvasAnnotation,
    index: number,
    selectedIndex: number | null,
    hoveredIndex: number | null,
    displayTransform: (point: { x: number; y: number }) => { x: number; y: number }
  ): PolygonConfig | Record<string, never> => {
    // Validate required properties
    if (!annotation.points || annotation.points.length === 0) {
      return {}
    }

    // Convert points from original to display coordinates and flatten for Konva
    const displayPoints = annotation.points
      .map(point => displayTransform(point))
      .flatMap(point => [point.x, point.y])

    // Determine visual state
    const isSelected = selectedIndex === index
    const isHovered = hoveredIndex === index

    // Return Konva configuration with conditional styling
    return {
      points: displayPoints,
      stroke: isSelected ? '#4285f4' : (isHovered ? '#34a853' : '#00c851'),
      strokeWidth: isSelected ? 3 : (isHovered ? 2.5 : 2),
      fill: isSelected ? 'rgba(66, 133, 244, 0.1)' : (isHovered ? 'rgba(52, 168, 83, 0.05)' : 'transparent'),
      closed: true,
      draggable: true,
      listening: true,
      perfectDrawEnabled: false // Better performance
    }
  }

  return {
    createPolygonConfig
  }
}
