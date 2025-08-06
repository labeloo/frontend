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
    displayTransform: (point: { x: number; y: number }) => { x: number; y: number }
  ) => {
    // Validate freehand annotation requirements
    if (annotation.type !== 'freehand' || !annotation.points || annotation.points.length === 0) {
      return {}
    }

    // Convert all points to display coordinates and flatten them
    const displayPoints = annotation.points
      .map(point => displayTransform(point))
      .flatMap(point => [point.x, point.y])

    // Determine styling based on selection and hover state
    const isSelected = selectedIndex === index
    const isHovered = hoveredIndex === index

    return {
      points: displayPoints,
      stroke: isSelected ? '#4285f4' : (isHovered ? '#34a853' : '#00c851'),
      strokeWidth: isSelected ? 4 : (isHovered ? 3 : 2),
      fill: 'transparent',
      closed: false,
      draggable: true,
      listening: true,
      hitStrokeWidth: 20, // Increase hit area for better selection
      tension: 0.3,
      lineCap: 'round',
      lineJoin: 'round',
      perfectDrawEnabled: false
    }
  }

  return {
    createFreehandConfig
  }
}
