import type { CanvasAnnotation } from '../types'

interface DragEndParams {
  annotation: CanvasAnnotation
  node: any
  imageOffset: { x: number; y: number }
  displayImageSize: { width: number; height: number }
  originalSizeToDisplay: (size: { width: number; height: number }) => { width: number; height: number }
  displayToOriginal: (point: { x: number; y: number }) => { x: number; y: number }
}

export function handleRectangleDragEnd(params: DragEndParams): CanvasAnnotation {
  const { annotation, node, imageOffset, displayImageSize, originalSizeToDisplay, displayToOriginal } = params
  
  if (!annotation.width || !annotation.height) {
    return annotation
  }

  // Get the new position and constrain to image bounds
  let newPos = { x: node.x(), y: node.y() }
  
  // Clamp position to ensure annotation stays within image bounds
  const displaySize = originalSizeToDisplay({ width: annotation.width, height: annotation.height })
  newPos.x = Math.max(imageOffset.x, Math.min(newPos.x, imageOffset.x + displayImageSize.width - displaySize.width))
  newPos.y = Math.max(imageOffset.y, Math.min(newPos.y, imageOffset.y + displayImageSize.height - displaySize.height))
  
  node.position(newPos)
  
  return {
    ...annotation,
    startPoint: displayToOriginal(newPos)
  }
}
