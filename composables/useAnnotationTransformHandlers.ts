import type { CanvasAnnotation } from '~/components/annotation/types'

interface HandleRectangleTransformEndParams {
  annotation: CanvasAnnotation
  node: any // Konva.Node type
  displaySizeToOriginal: (size: { width: number; height: number }) => { width: number; height: number }
  displayToOriginal: (point: { x: number; y: number }) => { x: number; y: number }
  originalImageSize: { width: number; height: number }
}

export const useAnnotationTransformHandlers = () => {
  const handleRectangleTransformEnd = ({
    annotation,
    node,
    displaySizeToOriginal,
    displayToOriginal,
    originalImageSize
  }: HandleRectangleTransformEndParams): CanvasAnnotation => {
    // Create a copy of the annotation to avoid mutating the original
    const updatedAnnotation: CanvasAnnotation = { ...annotation }
    
    // Get the new size from the transformed node
    let newSize = displaySizeToOriginal({
      width: node.width() * node.scaleX(),
      height: node.height() * node.scaleY()
    })
    
    // Get the new position from the transformed node
    let newStart = displayToOriginal({ 
      x: node.x(), 
      y: node.y() 
    })
    
    // Ensure minimum size constraints
    newSize.width = Math.max(5, newSize.width)
    newSize.height = Math.max(5, newSize.height)
    
    // Constrain the rectangle to stay within image bounds
    newStart.x = Math.max(0, Math.min(newStart.x, originalImageSize.width - newSize.width))
    newStart.y = Math.max(0, Math.min(newStart.y, originalImageSize.height - newSize.height))
    
    // Ensure the annotation doesn't extend beyond image bounds
    if (newStart.x + newSize.width > originalImageSize.width) {
      newSize.width = originalImageSize.width - newStart.x
    }
    if (newStart.y + newSize.height > originalImageSize.height) {
      newSize.height = originalImageSize.height - newStart.y
    }
    
    // Update the annotation with the new values
    updatedAnnotation.startPoint = newStart
    updatedAnnotation.width = newSize.width
    updatedAnnotation.height = newSize.height
    
    // Reset the node's scale to 1 after transform
    node.scaleX(1)
    node.scaleY(1)
    
    return updatedAnnotation
  }
  
  return {
    handleRectangleTransformEnd
  }
}
