import type { Ref } from 'vue'

/**
 * Point interface for 2D coordinates
 */
export interface Point {
  x: number
  y: number
}

/**
 * Size interface for dimensions
 */
export interface Size {
  width: number
  height: number
}

/**
 * Composable for coordinate conversion utilities in Konva image viewer
 * Provides functions to convert between display coordinates (canvas space) and original image coordinates
 * 
 * @param imageScale - Reactive reference to the current image scale factor
 * @param imageOffset - Reactive reference to the current image offset (x, y position on canvas)
 * @param displayImageSize - Optional reactive reference to the displayed image size
 * @returns Object containing coordinate conversion functions
 */
export function useCoordinateUtils(
  imageScale: Ref<number>,
  imageOffset: Ref<Point>,
  displayImageSize?: Ref<Size>
) {
  /**
   * Convert a point from display coordinates to original image coordinates
   * Display coordinates are relative to the canvas/stage
   * Original coordinates are relative to the source image
   * 
   * @param point - Point in display coordinates
   * @returns Point in original image coordinates
   */
  const displayToOriginal = (point: Point): Point => ({
    x: (point.x - imageOffset.value.x) / imageScale.value,
    y: (point.y - imageOffset.value.y) / imageScale.value
  })

  /**
   * Convert a point from original image coordinates to display coordinates
   * Original coordinates are relative to the source image
   * Display coordinates are relative to the canvas/stage
   * 
   * @param point - Point in original image coordinates
   * @returns Point in display coordinates
   */
  const originalToDisplay = (point: Point): Point => ({
    x: point.x * imageScale.value + imageOffset.value.x,
    y: point.y * imageScale.value + imageOffset.value.y
  })

  /**
   * Convert size from display coordinates to original image coordinates
   * 
   * @param size - Size in display coordinates
   * @returns Size in original image coordinates
   */
  const displaySizeToOriginal = (size: Size): Size => ({
    width: size.width / imageScale.value,
    height: size.height / imageScale.value
  })

  /**
   * Convert size from original image coordinates to display coordinates
   * 
   * @param size - Size in original image coordinates
   * @returns Size in display coordinates
   */
  const originalSizeToDisplay = (size: Size): Size => ({
    width: size.width * imageScale.value,
    height: size.height * imageScale.value
  })

  /**
   * Check if a display coordinate point is within the image bounds
   * Only works if displayImageSize is provided
   * 
   * @param point - Point in display coordinates
   * @returns True if point is within image bounds, false otherwise
   */
  const isPointInImageBounds = (point: Point): boolean => {
    if (!displayImageSize) {
      console.warn('useCoordinateUtils: displayImageSize not provided, cannot check bounds')
      return true
    }

    return point.x >= imageOffset.value.x &&
           point.x <= imageOffset.value.x + displayImageSize.value.width &&
           point.y >= imageOffset.value.y &&
           point.y <= imageOffset.value.y + displayImageSize.value.height
  }

  /**
   * Clamp a display coordinate point to stay within image bounds
   * Only works if displayImageSize is provided
   * 
   * @param point - Point in display coordinates to clamp
   * @returns Clamped point within image bounds
   */
  const clampPointToImageBounds = (point: Point): Point => {
    if (!displayImageSize) {
      console.warn('useCoordinateUtils: displayImageSize not provided, returning original point')
      return point
    }

    return {
      x: Math.max(
        imageOffset.value.x,
        Math.min(point.x, imageOffset.value.x + displayImageSize.value.width)
      ),
      y: Math.max(
        imageOffset.value.y,
        Math.min(point.y, imageOffset.value.y + displayImageSize.value.height)
      )
    }
  }

  /**
   * Convert an array of points from display to original coordinates
   * Useful for polygon points or path coordinates
   * 
   * @param points - Array of points in display coordinates
   * @returns Array of points in original image coordinates
   */
  const displayPointsToOriginal = (points: Point[]): Point[] => {
    return points.map(displayToOriginal)
  }

  /**
   * Convert an array of points from original to display coordinates
   * Useful for polygon points or path coordinates
   * 
   * @param points - Array of points in original image coordinates
   * @returns Array of points in display coordinates
   */
  const originalPointsToDisplay = (points: Point[]): Point[] => {
    return points.map(originalToDisplay)
  }

  /**
   * Convert points array to flat number array for Konva (alternating x, y values)
   * 
   * @param points - Array of Point objects
   * @returns Flat array of numbers [x1, y1, x2, y2, ...]
   */
  const pointsToKonvaArray = (points: Point[]): number[] => {
    return points.flatMap(point => [point.x, point.y])
  }

  /**
   * Convert flat Konva array to points array
   * 
   * @param konvaArray - Flat array of numbers [x1, y1, x2, y2, ...]
   * @returns Array of Point objects
   */
  const konvaArrayToPoints = (konvaArray: number[]): Point[] => {
    const points: Point[] = []
    for (let i = 0; i < konvaArray.length - 1; i += 2) {
      const x = konvaArray[i]
      const y = konvaArray[i + 1]
      
      // Ensure both x and y are defined numbers
      if (x !== undefined && y !== undefined) {
        points.push({ x, y })
      }
    }
    return points
  }

  /**
   * Calculate distance between two points
   * 
   * @param point1 - First point
   * @param point2 - Second point
   * @returns Distance between the points
   */
  const calculateDistance = (point1: Point, point2: Point): number => {
    return Math.hypot(point2.x - point1.x, point2.y - point1.y)
  }

  /**
   * Calculate the center point of a rectangle
   * 
   * @param startPoint - Top-left corner of rectangle
   * @param size - Width and height of rectangle
   * @returns Center point of the rectangle
   */
  const calculateRectangleCenter = (startPoint: Point, size: Size): Point => ({
    x: startPoint.x + size.width / 2,
    y: startPoint.y + size.height / 2
  })

  /**
   * Calculate the bounding box of a set of points
   * 
   * @param points - Array of points
   * @returns Object with min/max x/y values and calculated width/height
   */
  const calculateBoundingBox = (points: Point[]) => {
    if (points.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
    }

    const minX = Math.min(...points.map(p => p.x))
    const minY = Math.min(...points.map(p => p.y))
    const maxX = Math.max(...points.map(p => p.x))
    const maxY = Math.max(...points.map(p => p.y))

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    }
  }

  return {
    // Core conversion functions
    displayToOriginal,
    originalToDisplay,
    displaySizeToOriginal,
    originalSizeToDisplay,
    
    // Bounds checking
    isPointInImageBounds,
    clampPointToImageBounds,
    
    // Array utilities
    displayPointsToOriginal,
    originalPointsToDisplay,
    pointsToKonvaArray,
    konvaArrayToPoints,
    
    // Geometry utilities
    calculateDistance,
    calculateRectangleCenter,
    calculateBoundingBox
  }
}

/**
 * Type definition for the return value of useCoordinateUtils
 */
export type CoordinateUtils = ReturnType<typeof useCoordinateUtils>
