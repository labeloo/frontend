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

interface RectConfig {
  x: number
  y: number
  width: number
  height: number
  stroke: string
  strokeWidth: number
  fill: string
  draggable: boolean
  listening: boolean
  perfectDrawEnabled: boolean
}

export function useRectConfig() {
  /**
   * Generate configuration for a rectangle annotation in Konva
   * @param annotation - The annotation object containing rectangle data
   * @param index - The index of the annotation in the annotations array
   * @param selectedIndex - Index of the currently selected annotation
   * @param hoveredIndex - Index of the currently hovered annotation
   * @param displayTransform - Function to convert original coordinates to display coordinates
   * @param sizeTransform - Function to convert original size to display size
   * @returns Konva rectangle configuration object or empty object if invalid
   */
  const createRectangleConfig = (
    annotation: CanvasAnnotation,
    index: number,
    selectedIndex: number | null,
    hoveredIndex: number | null,
    displayTransform: (point: { x: number; y: number }) => { x: number; y: number },
    sizeTransform: (size: { width: number; height: number }) => { width: number; height: number }
  ): RectConfig | Record<string, never> => {
    // Validate required properties
    if (!annotation.startPoint || annotation.width === undefined || annotation.height === undefined) {
      return {}
    }

    // Convert coordinates and size from original to display coordinates
    const displayStart = displayTransform(annotation.startPoint)
    const displaySize = sizeTransform({ width: annotation.width, height: annotation.height })

    // Determine visual state
    const isSelected = selectedIndex === index
    const isHovered = hoveredIndex === index

    // Return Konva configuration with conditional styling
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

  return {
    createRectangleConfig
  }
}
