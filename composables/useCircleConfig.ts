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

interface CircleConfig {
  x: number
  y: number
  radius: number
  stroke: string
  strokeWidth: number
  fill: string
  draggable: boolean
  listening: boolean
  perfectDrawEnabled: boolean
}

export function useCircleConfig() {
  /**
   * Generate configuration for a circle annotation in Konva
   * @param annotation - The annotation object containing circle data
   * @param index - The index of the annotation in the annotations array
   * @param selectedIndex - Index of the currently selected annotation
   * @param hoveredIndex - Index of the currently hovered annotation
   * @param displayTransform - Function to convert original coordinates to display coordinates
   * @param imageScale - The current scale factor for the image
   * @returns Konva circle configuration object or empty object if invalid
   */
  const createCircleConfig = (
    annotation: CanvasAnnotation,
    index: number,
    selectedIndex: number | null,
    hoveredIndex: number | null,
    displayTransform: (point: { x: number; y: number }) => { x: number; y: number },
    imageScale: number
  ): CircleConfig | Record<string, never> => {
    // Validate required properties
    if (!annotation.center || annotation.radius === undefined) {
      return {}
    }

    // Convert center coordinates from original to display coordinates
    const displayCenter = displayTransform(annotation.center)
    
    // Scale the radius from original to display size
    const displayRadius = annotation.radius * imageScale

    // Determine visual state
    const isSelected = selectedIndex === index
    const isHovered = hoveredIndex === index

    // Return Konva configuration with conditional styling
    return {
      x: displayCenter.x,
      y: displayCenter.y,
      radius: displayRadius,
      stroke: isSelected ? '#4285f4' : (isHovered ? '#34a853' : '#00c851'),
      strokeWidth: isSelected ? 3 : (isHovered ? 2.5 : 2),
      fill: isSelected ? 'rgba(66, 133, 244, 0.1)' : (isHovered ? 'rgba(52, 168, 83, 0.05)' : 'transparent'),
      draggable: true,
      listening: true,
      perfectDrawEnabled: false // Better performance
    }
  }

  return {
    createCircleConfig
  }
}
