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

interface LineConfig {
  points: number[]
  stroke: string
  strokeWidth: number
  draggable: boolean
  listening: boolean
  lineCap: string
  perfectDrawEnabled: boolean
}

export function useLineConfig() {
  /**
   * Generate configuration for a line annotation in Konva
   * @param annotation - The annotation object containing line data
   * @param index - The index of the annotation in the annotations array
   * @param selectedIndex - Index of the currently selected annotation
   * @param hoveredIndex - Index of the currently hovered annotation
   * @param displayTransform - Function to convert original coordinates to display coordinates
   * @returns Konva line configuration object or empty object if invalid
   */
  const createLineConfig = (
    annotation: CanvasAnnotation,
    index: number,
    selectedIndex: number | null,
    hoveredIndex: number | null,
    displayTransform: (point: { x: number; y: number }) => { x: number; y: number }
  ): LineConfig | Record<string, never> => {
    // Validate required properties
    if (!annotation.startPoint || !annotation.endPoint) {
      return {}
    }

    // Convert both points from original to display coordinates
    const displayStart = displayTransform(annotation.startPoint)
    const displayEnd = displayTransform(annotation.endPoint)

    // Create points array for Konva line (flat array: [x1, y1, x2, y2])
    const points = [displayStart.x, displayStart.y, displayEnd.x, displayEnd.y]

    // Determine visual state
    const isSelected = selectedIndex === index
    const isHovered = hoveredIndex === index

    // Return Konva configuration with conditional styling
    return {
      points: points,
      stroke: isSelected ? '#4285f4' : (isHovered ? '#34a853' : '#00c851'),
      strokeWidth: isSelected ? 4 : (isHovered ? 3 : 2),
      draggable: true,
      listening: true,
      lineCap: 'round',
      perfectDrawEnabled: false // Better performance
    }
  }

  return {
    createLineConfig
  }
}
