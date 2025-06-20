/**
 * Canvas Reference Resolver
 *
 * This utility provides comprehensive canvas reference resolution for complex
 * React component hierarchies and various canvas types.
 */

import logger from './logger.js'

export class CanvasReferenceResolver {
  constructor() {
    this.resolverCache = new Map()
    this.maxCacheSize = 50
  }

  /**
   * Resolve canvas reference to actual HTMLCanvasElement
   */
  resolveCanvasReference(canvasInput) {
    if (!canvasInput) {
      return {
        success: false,
        canvas: null,
        error: 'Canvas input is null or undefined'
      }
    }

    // Generate cache key for performance
    const cacheKey = this.generateCacheKey(canvasInput)

    // Check cache first
    if (this.resolverCache.has(cacheKey)) {
      const cached = this.resolverCache.get(cacheKey)
      if (this.isCacheValid(cached)) {
        return cached.result
      } else {
        this.resolverCache.delete(cacheKey)
      }
    }

    const result = this.performResolution(canvasInput)

    // Cache successful results
    if (result.success) {
      this.cacheResult(cacheKey, result)
    }

    return result
  }

  /**
   * Perform the actual canvas resolution
   */
  performResolution(canvasInput) {
    try {
      // Direct HTMLCanvasElement
      if (canvasInput instanceof HTMLCanvasElement) {
        return {
          success: true,
          canvas: canvasInput,
          type: 'html-canvas',
          error: null
        }
      }

      // OffscreenCanvas
      if (typeof OffscreenCanvas !== 'undefined' && canvasInput instanceof OffscreenCanvas) {
        return {
          success: true,
          canvas: canvasInput,
          type: 'offscreen-canvas',
          error: null
        }
      }

      // React ref object with current property
      if (this.isReactRef(canvasInput)) {
        return this.resolveReactRef(canvasInput)
      }

      // Component with canvas property
      if (canvasInput.canvas) {
        return this.resolveCanvasReference(canvasInput.canvas)
      }

      // Component with canvasElement property
      if (canvasInput.canvasElement) {
        return this.resolveCanvasReference(canvasInput.canvasElement)
      }

      // Component with current property (React ref-like)
      if (canvasInput.current) {
        return this.resolveCanvasReference(canvasInput.current)
      }

      // Three.js renderer
      if (this.isThreeJSRenderer(canvasInput)) {
        return {
          success: true,
          canvas: canvasInput.domElement,
          type: 'three-renderer',
          error: null
        }
      }

      // WebGL or 2D context
      if (this.isCanvasContext(canvasInput)) {
        return {
          success: true,
          canvas: canvasInput.canvas,
          type: 'canvas-context',
          error: null
        }
      }

      // Component with getCanvasRef method
      if (typeof canvasInput.getCanvasRef === 'function') {
        const canvasRef = canvasInput.getCanvasRef()
        if (canvasRef && canvasRef.current) {
          return this.resolveCanvasReference(canvasRef.current)
        }
      }

      // Component with isValidCanvas method (our AnimationCanvas)
      if (typeof canvasInput.isValidCanvas === 'function') {
        if (canvasInput.isValidCanvas()) {
          return this.resolveCanvasReference(canvasInput.canvas || canvasInput.canvasElement)
        }
      }

      // DOM element with canvas child
      if (canvasInput.querySelector) {
        const canvasElement = canvasInput.querySelector('canvas')
        if (canvasElement) {
          return {
            success: true,
            canvas: canvasElement,
            type: 'dom-child-canvas',
            error: null
          }
        }
      }

      // Array-like object (check first element)
      if (canvasInput.length && canvasInput[0]) {
        return this.resolveCanvasReference(canvasInput[0])
      }

      return {
        success: false,
        canvas: null,
        type: 'unknown',
        error: `Unsupported canvas reference type: ${typeof canvasInput}`
      }

    } catch (error) {
      logger.error('Canvas reference resolution failed:', error)
      return {
        success: false,
        canvas: null,
        type: 'error',
        error: `Resolution error: ${error.message}`
      }
    }
  }

  /**
   * Resolve React ref object
   */
  resolveReactRef(refObject) {
    if (!refObject.current) {
      return {
        success: false,
        canvas: null,
        type: 'react-ref-null',
        error: 'React ref current is null'
      }
    }

    // If current is already a canvas
    if (refObject.current instanceof HTMLCanvasElement) {
      return {
        success: true,
        canvas: refObject.current,
        type: 'react-ref-canvas',
        error: null
      }
    }

    // If current is a component, recursively resolve
    return this.resolveCanvasReference(refObject.current)
  }

  /**
   * Type detection methods
   */
  isReactRef(obj) {
    return obj &&
           typeof obj === 'object' &&
           'current' in obj &&
           !obj.canvas && // Distinguish from our component refs
           !obj.canvasElement
  }

  isThreeJSRenderer(obj) {
    return obj &&
           typeof obj === 'object' &&
           obj.domElement &&
           obj.domElement instanceof HTMLCanvasElement &&
           (obj.constructor.name === 'WebGLRenderer' || obj.isWebGLRenderer)
  }

  isCanvasContext(obj) {
    return obj &&
           typeof obj === 'object' &&
           obj.canvas &&
           (this.isWebGLContext(obj) || this.is2DContext(obj))
  }

  isWebGLContext(obj) {
    return obj instanceof WebGLRenderingContext ||
           obj instanceof WebGL2RenderingContext ||
           (typeof obj === 'object' && obj.canvas && (obj.drawArrays || obj.drawElements))
  }

  is2DContext(obj) {
    return obj &&
           typeof obj === 'object' &&
           obj.canvas &&
           typeof obj.fillRect === 'function'
  }

  /**
   * Cache management
   */
  generateCacheKey(canvasInput) {
    if (!canvasInput) return 'null'

    // Use object identity for caching when possible
    if (typeof canvasInput === 'object') {
      // Try to generate a stable key
      const keys = []

      if (canvasInput.constructor) {
        keys.push(canvasInput.constructor.name)
      }

      if (canvasInput instanceof HTMLCanvasElement) {
        keys.push(`canvas-${canvasInput.width}x${canvasInput.height}`)
      }

      if (canvasInput.current) {
        keys.push('has-current')
      }

      if (canvasInput.canvas) {
        keys.push('has-canvas')
      }

      return keys.join('-') + '-' + Date.now()
    }

    return String(canvasInput)
  }

  cacheResult(key, result) {
    // Limit cache size
    if (this.resolverCache.size >= this.maxCacheSize) {
      const firstKey = this.resolverCache.keys().next().value
      this.resolverCache.delete(firstKey)
    }

    this.resolverCache.set(key, {
      result,
      timestamp: Date.now()
    })
  }

  isCacheValid(cached) {
    const maxAge = 5000 // 5 seconds
    return Date.now() - cached.timestamp < maxAge
  }

  /**
   * Validate resolved canvas
   */
  validateResolvedCanvas(canvas) {
    if (!canvas) {
      return {
        isValid: false,
        error: 'Canvas is null'
      }
    }

    if (!(canvas instanceof HTMLCanvasElement) &&
        !(typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas)) {
      return {
        isValid: false,
        error: 'Not a valid canvas element'
      }
    }

    if (canvas.width <= 0 || canvas.height <= 0) {
      return {
        isValid: false,
        error: 'Canvas has invalid dimensions'
      }
    }

    // Test if canvas can be used for export
    try {
      if (typeof canvas.toDataURL === 'function') {
        // Test toDataURL (will throw if canvas is tainted)
        canvas.toDataURL('image/png', 0.1)
      } else if (typeof canvas.convertToBlob === 'function') {
        // OffscreenCanvas alternative
        // Note: convertToBlob is async, but we can't test it here
      } else {
        return {
          isValid: false,
          error: 'Canvas does not support export methods'
        }
      }
    } catch (error) {
      return {
        isValid: false,
        error: `Canvas export test failed: ${error.message}`
      }
    }

    return {
      isValid: true,
      error: null
    }
  }

  /**
   * Get canvas with full validation
   */
  getValidatedCanvas(canvasInput) {
    const resolution = this.resolveCanvasReference(canvasInput)

    if (!resolution.success) {
      return {
        success: false,
        canvas: null,
        error: resolution.error
      }
    }

    const validation = this.validateResolvedCanvas(resolution.canvas)

    if (!validation.isValid) {
      return {
        success: false,
        canvas: null,
        error: validation.error
      }
    }

    return {
      success: true,
      canvas: resolution.canvas,
      type: resolution.type,
      error: null
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.resolverCache.clear()
  }

  /**
   * Get resolver statistics
   */
  getStatistics() {
    return {
      cacheSize: this.resolverCache.size,
      maxCacheSize: this.maxCacheSize,
      cacheKeys: Array.from(this.resolverCache.keys()),
      timestamp: new Date().toISOString()
    }
  }
}

// Create singleton instance
const canvasReferenceResolver = new CanvasReferenceResolver()

// Export utility functions
export const resolveCanvasReference = (canvasInput) =>
  canvasReferenceResolver.resolveCanvasReference(canvasInput)

export const getValidatedCanvas = (canvasInput) =>
  canvasReferenceResolver.getValidatedCanvas(canvasInput)

export { canvasReferenceResolver }
export default canvasReferenceResolver