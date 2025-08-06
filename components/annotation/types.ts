export interface CanvasAnnotation {
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
