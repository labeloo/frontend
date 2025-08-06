import type { CanvasAnnotation } from '../types'

interface DragEndParams {
  annotation: CanvasAnnotation
  node: any
  imageOffset: { x: number; y: number }
  displayImageSize: { width: number; height: number }
  imageScale: number
  displayToOriginal: (point: { x: number; y: number }) => { x: number; y: number }
}

export function handleDotDragEnd(params: DragEndParams): CanvasAnnotation {
  const { annotation, node, imageOffset, displayImageSize, imageScale, displayToOriginal } = params
  
  if (!annotation.center || !annotation.radius) {
    return annotation
  }

  // Get the new position and constrain to image bounds
  let newPos = { x: node.x(), y: node.y() }
  
  // Clamp position to ensure annotation stays within image bounds
  const displayRadius = annotation.radius * imageScale
  newPos.x = Math.max(imageOffset.x + displayRadius, Math.min(newPos.x, imageOffset.x + displayImageSize.width - displayRadius))
  newPos.y = Math.max(imageOffset.y + displayRadius, Math.min(newPos.y, imageOffset.y + displayImageSize.height - displayRadius))
  
  node.position(newPos)
  
  return {
    ...annotation,
    center: displayToOriginal(newPos)
  }
}
