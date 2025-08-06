import type { CanvasAnnotation } from '../types'

interface DragEndParams {
  annotation: CanvasAnnotation
  node: any
  imageScale: number
  originalImageSize: { width: number; height: number }
}

export function handlePolygonDragEnd(params: DragEndParams): CanvasAnnotation {
  const { annotation, node, imageScale, originalImageSize } = params
  
  if (!annotation.points) {
    return annotation
  }

  const dx = node.x() / imageScale
  const dy = node.y() / imageScale
  
  // Validate that all points would remain within bounds
  const newPoints = annotation.points.map(point => ({
    x: point.x + dx,
    y: point.y + dy
  }))
  
  const allPointsValid = newPoints.every(point => 
    point.x >= 0 && point.x <= originalImageSize.width &&
    point.y >= 0 && point.y <= originalImageSize.height
  )
  
  // Reset node position after updating points
  node.position({ x: 0, y: 0 })
  
  return {
    ...annotation,
    points: allPointsValid ? newPoints : annotation.points
  }
}
