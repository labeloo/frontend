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

interface DotConfig {
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

export function useDotConfig() {
  /**
   * Generate configuration for a dot annotation in Konva
   * @param annotation - The annotation object containing dot data
   * @param index - The index of the annotation in the annotations array
   * @param selectedIndex - Index of the currently selected annotation
   * @param hoveredIndex - Index of the currently hovered annotation
   * @param displayTransform - Function to convert original coordinates to display coordinates
   * @param imageScale - The current scale factor for the image
   * @returns Konva circle configuration object for dot or empty object if invalid
   */
  const createDotConfig = (
    annotation: CanvasAnnotation,
    index: number,
    selectedIndex: number | null,
    hoveredIndex: number | null,
    displayTransform: (point: { x: number; y: number }) => { x: number; y: number },
    imageScale: number
  ): DotConfig | Record<string, never> => {
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

    // Return Konva configuration with dot-specific styling
    // Dots are typically filled circles with a solid appearance
    return {
      x: displayCenter.x,
      y: displayCenter.y,
      radius: displayRadius,
      stroke: isSelected ? '#4285f4' : (isHovered ? '#34a853' : '#ff4444'),
      strokeWidth: isSelected ? 2 : (isHovered ? 1.5 : 1),
      fill: isSelected ? '#4285f4' : (isHovered ? '#34a853' : '#ff4444'),
      draggable: true,
      listening: true,
      perfectDrawEnabled: false // Better performance
    }
  }

  return {
    createDotConfig
  }
}
