/**
 * Advanced Canvas Context Manager
 *
 * This module provides sophisticated canvas context management with automatic cleanup,
 * performance optimization, memory management, and cross-browser compatibility.
 */

import logger from './logger.js'
import { environmentDetector } from './environmentDetector.js'

class CanvasContextManager {
  constructor() {
    this.contexts = new Map()
    this.canvasPool = new Map()
    this.activeCanvases = new Set()
    this.memoryThreshold = 100 * 1024 * 1024 // 100MB
    this.maxPoolSize = 10
    this.cleanupInterval = null

    this.initializeMemoryManagement()
  }

  /**
   * Initialize memory management and cleanup
   */
  initializeMemoryManagement() {
    // Periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.performCleanup()
    }, 30000) // Every 30 seconds

    // Memory pressure handling
    if ('memory' in performance) {
      setInterval(() => {
        this.checkMemoryPressure()
      }, 5000) // Every 5 seconds
    }

    // Page visibility cleanup
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.performAggressiveCleanup()
        }
      })
    }
  }

  /**
   * Create or retrieve canvas with specified dimensions and options
   */
  createCanvas(width, height, options = {}) {
    const {
      contextType = '2d',
      alpha = true,
      desynchronized = false,
      colorSpace = 'srgb',
      willReadFrequently = false,
      reuseExisting = true
    } = options

    // Generate cache key
    const cacheKey = `${width}x${height}-${contextType}-${JSON.stringify({
      alpha, desynchronized, colorSpace, willReadFrequently
    })}`

    // Try to reuse existing canvas from pool
    if (reuseExisting && this.canvasPool.has(cacheKey)) {
      const pooledCanvas = this.canvasPool.get(cacheKey)
      if (pooledCanvas && !this.activeCanvases.has(pooledCanvas)) {
        this.activeCanvases.add(pooledCanvas)
        logger.debug(`Reusing pooled canvas: ${cacheKey}`)
        return pooledCanvas
      }
    }

    // Create new canvas
    const canvas = this.createNewCanvas(width, height, contextType, {
      alpha, desynchronized, colorSpace, willReadFrequently
    })

    if (!canvas) {
      logger.error('Failed to create canvas')
      return null
    }

    // Store in active set
    this.activeCanvases.add(canvas)

    // Add metadata
    canvas._namelistica = {
      created: Date.now(),
      width,
      height,
      contextType,
      cacheKey,
      options
    }

    logger.debug(`Created new canvas: ${cacheKey}`)
    return canvas
  }

  /**
   * Create new canvas element with proper context
   */
  createNewCanvas(width, height, contextType, contextOptions) {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      // Get context with options
      const context = canvas.getContext(contextType, contextOptions)

      if (!context) {
        logger.error(`Failed to get ${contextType} context`)
        return null
      }

      // Store context reference
      this.contexts.set(canvas, context)

      // Set up context-specific optimizations
      this.optimizeContext(context, contextType)

      return canvas
    } catch (error) {
      logger.error('Error creating canvas:', error)
      return null
    }
  }

  /**
   * Optimize context based on type and capabilities
   */
  optimizeContext(context, contextType) {
    if (contextType === '2d') {
      // 2D context optimizations
      if (environmentDetector.isSupported('canvas2d')) {
        // Enable image smoothing for better quality
        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = 'high'

        // Set text rendering optimizations
        context.textBaseline = 'top'
        context.textAlign = 'left'
      }
    } else if (contextType === 'webgl' || contextType === 'webgl2') {
      // WebGL context optimizations
      if (context.getExtension) {
        // Enable useful extensions
        const extensions = [
          'OES_texture_float',
          'OES_texture_half_float',
          'WEBGL_lose_context',
          'WEBGL_debug_renderer_info'
        ]

        extensions.forEach(ext => {
          try {
            context.getExtension(ext)
          } catch (error) {
            logger.debug(`Extension ${ext} not available`)
          }
        })
      }
    }
  }

  /**
   * Get context for existing canvas
   */
  getContext(canvas) {
    return this.contexts.get(canvas)
  }

  /**
   * Release canvas back to pool or dispose
   */
  releaseCanvas(canvas) {
    if (!canvas || !this.activeCanvases.has(canvas)) {
      return false
    }

    this.activeCanvases.delete(canvas)

    const metadata = canvas._namelistica
    if (!metadata) {
      this.disposeCanvas(canvas)
      return true
    }

    // Check if we should pool this canvas
    if (this.shouldPoolCanvas(canvas)) {
      this.addToPool(canvas)
      logger.debug(`Canvas returned to pool: ${metadata.cacheKey}`)
    } else {
      this.disposeCanvas(canvas)
      logger.debug(`Canvas disposed: ${metadata.cacheKey}`)
    }

    return true
  }

  /**
   * Check if canvas should be pooled
   */
  shouldPoolCanvas(canvas) {
    const metadata = canvas._namelistica
    if (!metadata) return false

    // Don't pool if pool is full
    if (this.canvasPool.size >= this.maxPoolSize) {
      return false
    }

    // Don't pool very large canvases
    const size = metadata.width * metadata.height * 4 // RGBA
    if (size > 4 * 1024 * 1024) { // 4MB
      return false
    }

    // Don't pool old canvases
    const age = Date.now() - metadata.created
    if (age > 300000) { // 5 minutes
      return false
    }

    return true
  }

  /**
   * Add canvas to pool
   */
  addToPool(canvas) {
    const metadata = canvas._namelistica
    if (!metadata) return

    // Clear canvas content
    this.clearCanvas(canvas)

    // Add to pool
    this.canvasPool.set(metadata.cacheKey, canvas)
  }

  /**
   * Clear canvas content
   */
  clearCanvas(canvas) {
    const context = this.contexts.get(canvas)
    if (!context) return

    const metadata = canvas._namelistica
    if (metadata?.contextType === '2d') {
      context.clearRect(0, 0, canvas.width, canvas.height)
    } else if (metadata?.contextType.startsWith('webgl')) {
      context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT)
    }
  }

  /**
   * Dispose canvas completely
   */
  disposeCanvas(canvas) {
    if (!canvas) return

    // Remove from all tracking
    this.activeCanvases.delete(canvas)
    this.contexts.delete(canvas)

    const metadata = canvas._namelistica
    if (metadata) {
      this.canvasPool.delete(metadata.cacheKey)
    }

    // Lose WebGL context if applicable
    const context = canvas.getContext('webgl') || canvas.getContext('webgl2')
    if (context && context.getExtension) {
      const loseContext = context.getExtension('WEBGL_lose_context')
      if (loseContext) {
        loseContext.loseContext()
      }
    }

    // Clear canvas
    canvas.width = 1
    canvas.height = 1

    // Remove metadata
    delete canvas._namelistica
  }

  /**
   * Create offscreen canvas if supported
   */
  createOffscreenCanvas(width, height, options = {}) {
    if (typeof OffscreenCanvas !== 'undefined') {
      try {
        const canvas = new OffscreenCanvas(width, height)
        const contextType = options.contextType || '2d'
        const context = canvas.getContext(contextType, options)

        if (context) {
          this.contexts.set(canvas, context)
          this.optimizeContext(context, contextType)

          canvas._namelistica = {
            created: Date.now(),
            width,
            height,
            contextType,
            isOffscreen: true,
            options
          }

          logger.debug(`Created offscreen canvas: ${width}x${height}`)
          return canvas
        }
      } catch (error) {
        logger.warn('OffscreenCanvas creation failed:', error)
      }
    }

    // Fallback to regular canvas
    return this.createCanvas(width, height, options)
  }

  /**
   * Check memory pressure and trigger cleanup if needed
   */
  checkMemoryPressure() {
    if (!performance.memory) return

    const memoryUsage = performance.memory.usedJSHeapSize
    const memoryLimit = performance.memory.jsHeapSizeLimit
    const memoryPressure = memoryUsage / memoryLimit

    if (memoryPressure > 0.8) {
      logger.warn(`High memory pressure detected: ${(memoryPressure * 100).toFixed(1)}%`)
      this.performAggressiveCleanup()
    } else if (memoryPressure > 0.6) {
      logger.info(`Moderate memory pressure: ${(memoryPressure * 100).toFixed(1)}%`)
      this.performCleanup()
    }
  }

  /**
   * Perform regular cleanup
   */
  performCleanup() {
    const startTime = performance.now()
    let cleaned = 0

    // Clean old pooled canvases
    for (const [key, canvas] of this.canvasPool.entries()) {
      const metadata = canvas._namelistica
      if (metadata && Date.now() - metadata.created > 300000) { // 5 minutes
        this.disposeCanvas(canvas)
        this.canvasPool.delete(key)
        cleaned++
      }
    }

    // Limit pool size
    if (this.canvasPool.size > this.maxPoolSize) {
      const excess = this.canvasPool.size - this.maxPoolSize
      const entries = Array.from(this.canvasPool.entries())

      // Remove oldest entries
      entries.sort((a, b) => {
        const aTime = a[1]._namelistica?.created || 0
        const bTime = b[1]._namelistica?.created || 0
        return aTime - bTime
      })

      for (let i = 0; i < excess; i++) {
        const [key, canvas] = entries[i]
        this.disposeCanvas(canvas)
        this.canvasPool.delete(key)
        cleaned++
      }
    }

    const duration = performance.now() - startTime
    if (cleaned > 0) {
      logger.debug(`Cleanup completed: ${cleaned} canvases cleaned in ${duration.toFixed(2)}ms`)
    }
  }

  /**
   * Perform aggressive cleanup under memory pressure
   */
  performAggressiveCleanup() {
    logger.info('Performing aggressive cleanup')

    // Clear entire pool
    for (const [key, canvas] of this.canvasPool.entries()) {
      this.disposeCanvas(canvas)
    }
    this.canvasPool.clear()

    // Force garbage collection if available
    if (typeof gc === 'function') {
      try {
        gc()
      } catch (error) {
        // Ignore gc errors
      }
    }
  }

  /**
   * Get manager statistics
   */
  getStatistics() {
    const memoryUsage = performance.memory ? {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    } : null

    return {
      activeCanvases: this.activeCanvases.size,
      pooledCanvases: this.canvasPool.size,
      totalContexts: this.contexts.size,
      memoryUsage,
      poolKeys: Array.from(this.canvasPool.keys()),
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Dispose all resources
   */
  dispose() {
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    // Dispose all canvases
    for (const canvas of this.activeCanvases) {
      this.disposeCanvas(canvas)
    }

    for (const [, canvas] of this.canvasPool) {
      this.disposeCanvas(canvas)
    }

    // Clear all collections
    this.activeCanvases.clear()
    this.canvasPool.clear()
    this.contexts.clear()

    logger.info('Canvas context manager disposed')
  }
}

// Create singleton instance
const canvasContextManager = new CanvasContextManager()

// Export safe canvas creation functions
export const createCanvas = (width, height, options) =>
  canvasContextManager.createCanvas(width, height, options)

export const createOffscreenCanvas = (width, height, options) =>
  canvasContextManager.createOffscreenCanvas(width, height, options)

export const releaseCanvas = (canvas) =>
  canvasContextManager.releaseCanvas(canvas)

export const getCanvasContext = (canvas) =>
  canvasContextManager.getContext(canvas)

export { CanvasContextManager, canvasContextManager }
export default canvasContextManager