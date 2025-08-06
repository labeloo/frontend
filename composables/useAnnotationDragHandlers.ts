import type { CanvasAnnotation } from '~/components/annotation/types'

interface RectangleDragEndParams {
  annotation: CanvasAnnotation
  node: any
  imageOffset: { x: number; y: number }
  displayImageSize: { width: number; height: number }
  originalSizeToDisplay: (size: { width: number; height: number }) => { width: number; height: number }
  displayToOriginal: (point: { x: number; y: number }) => { x: number; y: number }
}

interface PolygonDragEndParams {
  annotation: CanvasAnnotation
  node: any
  imageScale: number
  originalImageSize: { width: number; height: number }
}

interface DotDragEndParams {
  annotation: CanvasAnnotation
  node: any
  imageOffset: { x: number; y: number }
  displayImageSize: { width: number; height: number }
  imageScale: number
  displayToOriginal: (point: { x: number; y: number }) => { x: number; y: number }
}

interface LineDragEndParams {
  annotation: CanvasAnnotation
  node: any
  imageOffset: { x: number; y: number }
  displayImageSize: { width: number; height: number }
  displayToOriginal: (point: { x: number; y: number }) => { x: number; y: number }
}

interface CircleDragEndParams {
  annotation: CanvasAnnotation
  node: any
  imageOffset: { x: number; y: number }
  displayImageSize: { width: number; height: number }
  imageScale: number
  displayToOriginal: (point: { x: number; y: number }) => { x: number; y: number }
}

interface FreehandDragEndParams {
  annotation: CanvasAnnotation
  node: any
  imageScale: number
  originalImageSize: { width: number; height: number }
}

export function useAnnotationDragHandlers() {
  
  function handleRectangleDragEnd(params: RectangleDragEndParams): CanvasAnnotation {
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

  function handlePolygonDragEnd(params: PolygonDragEndParams): CanvasAnnotation {
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

  function handleDotDragEnd(params: DotDragEndParams): CanvasAnnotation {
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

  function handleLineDragEnd(params: LineDragEndParams): CanvasAnnotation {
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

  function handleCircleDragEnd(params: CircleDragEndParams): CanvasAnnotation {
    const { annotation, node, imageOffset, displayImageSize, imageScale, displayToOriginal } = params
    
    if (!annotation.center || !annotation.radius) {
      return annotation
    }

    // Get the new position and constrain to image bounds
    let newPos = { x: node.x(), y: node.y() }
    
    // Clamp position to ensure circle stays within image bounds
    const displayRadius = annotation.radius * imageScale
    newPos.x = Math.max(imageOffset.x + displayRadius, Math.min(newPos.x, imageOffset.x + displayImageSize.width - displayRadius))
    newPos.y = Math.max(imageOffset.y + displayRadius, Math.min(newPos.y, imageOffset.y + displayImageSize.height - displayRadius))
    
    node.position(newPos)
    
    return {
      ...annotation,
      center: displayToOriginal(newPos)
    }
  }

  function handleFreehandDragEnd(params: FreehandDragEndParams): CanvasAnnotation {
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

  return {
    handleRectangleDragEnd,
    handlePolygonDragEnd,
    handleDotDragEnd,
    handleLineDragEnd,
    handleCircleDragEnd,
    handleFreehandDragEnd
  }
}
