import type { CanvasAnnotation } from '../types'

interface DragEndParams {
  annotation: CanvasAnnotation
  node: any
  imageOffset: { x: number; y: number }
  displayImageSize: { width: number; height: number }
  displayToOriginal: (point: { x: number; y: number }) => { x: number; y: number }
}

export function handleLineDragEnd(params: DragEndParams): CanvasAnnotation {
  const { annotation, node, imageOffset, displayImageSize, displayToOriginal } = params
  
  if (!annotation.startPoint || !annotation.endPoint) {
    return annotation
  }

  // Get the new position and constrain to image bounds
  let newPos = { x: node.x(), y: node.y() }
  
  // Calculate line dimensions to ensure it stays within bounds
  const lineWidth = Math.abs(annotation.endPoint.x - annotation.startPoint.x)
  const lineHeight = Math.abs(annotation.endPoint.y - annotation.startPoint.y)
  
  // Clamp position to ensure line stays within image bounds
  newPos.x = Math.max(imageOffset.x, Math.min(newPos.x, imageOffset.x + displayImageSize.width - lineWidth))
  newPos.y = Math.max(imageOffset.y, Math.min(newPos.y, imageOffset.y + displayImageSize.height - lineHeight))
  
  node.position(newPos)
  
  // Calculate the offset and apply to both points
  const originalStart = displayToOriginal(newPos)
  const deltaX = originalStart.x - annotation.startPoint.x
  const deltaY = originalStart.y - annotation.startPoint.y
  
  return {
    ...annotation,
    startPoint: originalStart,
    endPoint: {
      x: annotation.endPoint.x + deltaX,
      y: annotation.endPoint.y + deltaY
    }
  }
}
