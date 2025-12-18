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

  // Get the drag position from the node
  const newPos = { x: node.x(), y: node.y() }
  
  // Simple approach: just convert the drag position to original coordinates
  // and apply the offset to both points
  const originalNewPos = displayToOriginal(newPos)
  const originalZero = displayToOriginal({ x: 0, y: 0 })
  
  // Calculate the offset in original coordinates
  const offsetX = originalNewPos.x - originalZero.x
  const offsetY = originalNewPos.y - originalZero.y
  
  // Reset node position to prevent accumulation
  node.position({ x: 0, y: 0 })
  
  // Apply the offset to both start and end points
  return {
    ...annotation,
    startPoint: {
      x: annotation.startPoint.x + offsetX,
      y: annotation.startPoint.y + offsetY
    },
    endPoint: {
      x: annotation.endPoint.x + offsetX,
      y: annotation.endPoint.y + offsetY
    }
  }
}
