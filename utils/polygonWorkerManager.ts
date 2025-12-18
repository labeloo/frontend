/**
 * Web Worker Manager for Polygon Simplification
 * Handles communication with polygon simplification worker
 * Provides Promise-based API for easy integration
 */

interface SimplificationRequest {
  id: string
  type: 'simplify'
  points: number[]
  tolerance: number
  preserveShape: boolean
}

interface SimplificationResponse {
  id: string
  type: 'simplified'
  originalPoints: number
  simplifiedPoints: number[]
  processingTime: number
  compressionRatio: number
}

interface ErrorResponse {
  id: string
  type: 'error'
  message: string
}

type WorkerResponse = SimplificationResponse | ErrorResponse

interface PendingRequest {
  resolve: (response: SimplificationResponse) => void
  reject: (error: Error) => void
  startTime: number
}

class PolygonSimplificationWorkerManager {
  private worker: Worker | null = null
  private pendingRequests = new Map<string, PendingRequest>()
  private isWorkerReady = false
  private requestCounter = 0

  /**
   * Initialize the worker
   */
  async initialize(): Promise<void> {
    if (this.worker) {
      return // Already initialized
    }

    try {
      // Create worker from public directory
      this.worker = new Worker('/workers/polygonSimplificationWorker.js')
      
      // Set up message handler
      this.worker.onmessage = (event) => {
        this.handleWorkerMessage(event.data)
      }
      
      // Handle worker errors
      this.worker.onerror = (error) => {
        console.error('🔧 Polygon Worker Error:', error)
        this.rejectAllPending(new Error(`Worker error: ${error.message}`))
      }
      
      // Wait for worker ready signal
      await this.waitForWorkerReady()
      
      console.log('🔧 Polygon simplification worker initialized successfully')
      
    } catch (error) {
      console.error('🔧 Failed to initialize polygon worker:', error)
      throw new Error(`Failed to initialize polygon simplification worker: ${error}`)
    }
  }

  /**
   * Wait for worker ready signal
   */
  private waitForWorkerReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker initialization timeout'))
      }, 5000)

      const messageHandler = (event: MessageEvent) => {
        if (event.data?.type === 'ready') {
          this.isWorkerReady = true
          clearTimeout(timeout)
          this.worker?.removeEventListener('message', messageHandler)
          resolve()
        }
      }

      this.worker?.addEventListener('message', messageHandler)
    })
  }

  /**
   * Simplify polygon points using the worker
   */
  async simplifyPolygon(
    points: number[], 
    tolerance: number = 2.0, 
    preserveShape: boolean = true
  ): Promise<SimplificationResponse> {
    if (!this.worker || !this.isWorkerReady) {
      await this.initialize()
    }

    // Validate input
    if (!Array.isArray(points) || points.length < 6) {
      throw new Error('Invalid points array: must have at least 6 elements (3 coordinate pairs)')
    }

    if (typeof tolerance !== 'number' || tolerance <= 0) {
      throw new Error('Invalid tolerance: must be a positive number')
    }

    // Create unique request ID
    const requestId = `simplify_${++this.requestCounter}_${Date.now()}`
    
    const request: SimplificationRequest = {
      id: requestId,
      type: 'simplify',
      points,
      tolerance,
      preserveShape
    }

    // Create promise for response
    const responsePromise = new Promise<SimplificationResponse>((resolve, reject) => {
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        startTime: performance.now()
      })

      // Set timeout for request
      setTimeout(() => {
        const pending = this.pendingRequests.get(requestId)
        if (pending) {
          this.pendingRequests.delete(requestId)
          reject(new Error('Polygon simplification timeout'))
        }
      }, 10000) // 10 second timeout
    })

    // Send request to worker
    this.worker!.postMessage(request)

    return responsePromise
  }

  /**
   * Handle messages from worker
   */
  private handleWorkerMessage(data: WorkerResponse | { type: string, message: string }): void {
    if (data.type === 'ready') {
      return // Handled in initialization
    }

    if (!('id' in data)) {
      console.warn('🔧 Received worker message without ID:', data)
      return
    }

    const pending = this.pendingRequests.get(data.id)
    if (!pending) {
      console.warn('🔧 Received response for unknown request:', data.id)
      return
    }

    this.pendingRequests.delete(data.id)

    if (data.type === 'simplified') {
      const response = data as SimplificationResponse
      const totalTime = performance.now() - pending.startTime
      
      console.log(`🔧 Polygon simplified: ${response.originalPoints} → ${(response.simplifiedPoints.length/2)} points (${response.compressionRatio.toFixed(1)}%) in ${totalTime.toFixed(1)}ms`)
      
      pending.resolve(response)
    } else if (data.type === 'error') {
      const errorResponse = data as ErrorResponse
      pending.reject(new Error(errorResponse.message))
    } else {
      pending.reject(new Error(`Unknown response type: ${(data as any).type}`))
    }
  }

  /**
   * Reject all pending requests
   */
  private rejectAllPending(error: Error): void {
    this.pendingRequests.forEach(pending => {
      pending.reject(error)
    })
    this.pendingRequests.clear()
  }

  /**
   * Get worker status
   */
  getStatus() {
    return {
      isInitialized: this.worker !== null,
      isReady: this.isWorkerReady,
      pendingRequests: this.pendingRequests.size
    }
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    if (this.worker) {
      this.rejectAllPending(new Error('Worker terminated'))
      this.worker.terminate()
      this.worker = null
      this.isWorkerReady = false
      console.log('🔧 Polygon simplification worker terminated')
    }
  }

  /**
   * Batch simplify multiple polygons
   */
  async simplifyMultiplePolygons(
    polygons: { points: number[], tolerance?: number, preserveShape?: boolean }[]
  ): Promise<SimplificationResponse[]> {
    const promises = polygons.map(polygon => 
      this.simplifyPolygon(
        polygon.points, 
        polygon.tolerance || 2.0, 
        polygon.preserveShape !== undefined ? polygon.preserveShape : true
      )
    )

    return Promise.all(promises)
  }
}

// Global instance
/**
 * Singleton instance of the PolygonWorkerManager for global use
 */
export const workerManager = new PolygonSimplificationWorkerManager()

// Types for external use
export type { SimplificationResponse, ErrorResponse }
