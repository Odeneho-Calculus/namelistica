/**
 * Advanced Canvas Validation and Conversion Utilities
 *
 * This module provides comprehensive canvas validation, type detection,
 * and conversion utilities to ensure proper canvas handling across different
 * rendering contexts (2D, WebGL, Three.js, OffscreenCanvas).
 */

import logger from './logger.js'
import { environmentDetector } from './environmentDetector.js'
import { createCanvas, createOffscreenCanvas } from './canvasContextManager.js'
import { canvasReferenceResolver } from './canvasReferenceResolver.js'

export class CanvasValidator {
  constructor() {
    this.supportedTypes = new Set(['HTMLCanvasElement', 'OffscreenCanvas'])
    this.conversionCache = new Map()
    this.maxCacheSize = 5
  }

  /**
   * Validate and normalize canvas input using advanced reference resolver
   */
  validateCanvas(canvasInput) {
    const validation = {
      isValid: false,
      type: null,
      canvas: null,
      context: null,
      needsConversion: false,
      error: null
    }

    try {
      // Use the advanced canvas reference resolver
      const resolution = canvasReferenceResolver.getValidatedCanvas(canvasInput)

      if (!resolution.success) {
        validation.error = resolution.error
        return validation
      }

      const canvas = resolution.canvas
      validation.canvas = canvas
      validation.type = resolution.type
      validation.isValid = true

      // Get context
      validation.context = this.getCanvasContext(canvas)

      // Determine if conversion is needed
      validation.needsConversion = this.needsConversion(canvas, resolution.type)

      logger.debug(`Canvas validated successfully: ${resolution.type}`)
      return validation

    } catch (error) {
      validation.error = `Canvas validation failed: ${error.message}`
      logger.error('Canvas validation error:', error)
      return validation
    }
  }

  /**
   * Determine if canvas needs conversion for export
   */
  needsConversion(canvas, type) {
    switch (type) {
      case 'html-canvas':
        return false // Direct export supported
      case 'offscreen-canvas':
        return true // Needs conversion to regular canvas
      case 'three-renderer':
        return false // Three.js canvas should support toDataURL
      case 'webgl-context':
      case '2d-context':
        return false // Context canvas should support export
      case 'react-ref-canvas':
        return false // React ref to canvas should work directly
      default:
        return true // Unknown types need conversion
    }
  }

  /**
   * Convert canvas to exportable format
   */
  async convertToExportableCanvas(canvasInput, options = {}) {
    const {
      width,
      height,
      preserveAspectRatio = true,
      quality = 1.0,
      format = 'png'
    } = options

    const validation = this.validateCanvas(canvasInput)

    if (!validation.isValid) {
      throw new Error(`Cannot convert invalid canvas: ${validation.error}`)
    }

    // If already exportable and no conversion needed
    if (!validation.needsConversion && validation.canvas instanceof HTMLCanvasElement) {
      return validation.canvas
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(validation, options)

    // Check cache
    if (this.conversionCache.has(cacheKey)) {
      const cached = this.conversionCache.get(cacheKey)
      if (this.isCacheValid(cached)) {
        logger.debug('Using cached converted canvas')
        return cached.canvas
      } else {
        this.conversionCache.delete(cacheKey)
      }
    }

    let convertedCanvas

    try {
      switch (validation.type) {
        case 'three-renderer':
          convertedCanvas = await this.convertThreeJSRenderer(validation.canvas, options)
          break

        case 'offscreen-canvas':
          convertedCanvas = await this.convertOffscreenCanvas(validation.canvas, options)
          break

        case 'webgl-context':
          convertedCanvas = await this.convertWebGLCanvas(validation.canvas, validation.context, options)
          break

        default:
          convertedCanvas = validation.canvas
      }

      // Cache the result
      this.cacheConversion(cacheKey, convertedCanvas)

      return convertedCanvas

    } catch (error) {
      logger.error('Canvas conversion failed:', error)
      throw new Error(`Canvas conversion failed: ${error.message}`)
    }
  }

  /**
   * Extract image data from any canvas type
   */
  async extractImageData(canvasInput, options = {}) {
    const convertedCanvas = await this.convertToExportableCanvas(canvasInput, options)

    if (!convertedCanvas || typeof convertedCanvas.toDataURL !== 'function') {
      throw new Error('Converted canvas does not support toDataURL')
    }

    const { format = 'png', quality = 1.0 } = options
    const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png'

    return convertedCanvas.toDataURL(mimeType, quality)
  }

  /**
   * Convert Three.js renderer to exportable canvas
   */
  async convertThreeJSRenderer(rendererCanvas, options = {}) {
    if (!rendererCanvas) {
      throw new Error('Three.js renderer canvas is null')
    }

    // Three.js canvas should already be exportable
    if (typeof rendererCanvas.toDataURL === 'function') {
      return rendererCanvas
    }

    // Fallback: create new canvas and copy content
    return this.copyCanvasContent(rendererCanvas, options)
  }

  /**
   * Convert OffscreenCanvas to regular canvas
   */
  async convertOffscreenCanvas(offscreenCanvas, options = {}) {
    try {
      // Try using convertToBlob if available
      if (typeof offscreenCanvas.convertToBlob === 'function') {
        const blob = await offscreenCanvas.convertToBlob({
          type: 'image/png',
          quality: options.quality || 1.0
        })

        return this.createCanvasFromBlob(blob, options)
      }

      // Fallback: transfer to regular canvas
      return this.transferOffscreenToCanvas(offscreenCanvas, options)

    } catch (error) {
      logger.error('OffscreenCanvas conversion failed:', error)
      throw error
    }
  }

  /**
   * Convert WebGL canvas to 2D canvas
   */
  async convertWebGLCanvas(canvas, context, options = {}) {
    try {
      // Ensure WebGL content is rendered
      if (context.finish) {
        context.finish()
      }

      // WebGL canvas should support toDataURL
      if (typeof canvas.toDataURL === 'function') {
        return canvas
      }

      // Fallback: copy to new canvas
      return this.copyCanvasContent(canvas, options)

    } catch (error) {
      logger.error('WebGL canvas conversion failed:', error)
      throw error
    }
  }

  /**
   * Copy canvas content to new exportable canvas
   */
  async copyCanvasContent(sourceCanvas, options = {}) {
    const {
      width = sourceCanvas.width,
      height = sourceCanvas.height
    } = options

    const targetCanvas = createCanvas(width, height, {
      contextType: '2d',
      willReadFrequently: true
    })

    if (!targetCanvas) {
      throw new Error('Failed to create target canvas')
    }

    const ctx = targetCanvas.getContext('2d')

    try {
      // Try direct drawImage
      ctx.drawImage(sourceCanvas, 0, 0, width, height)
      return targetCanvas
    } catch (error) {
      // Fallback: pixel-by-pixel copy
      return this.pixelCopyCanvas(sourceCanvas, targetCanvas, options)
    }
  }

  /**
   * Pixel-by-pixel canvas copy (last resort)
   */
  async pixelCopyCanvas(sourceCanvas, targetCanvas, options = {}) {
    const sourceCtx = sourceCanvas.getContext('2d') || sourceCanvas.getContext('webgl')
    const targetCtx = targetCanvas.getContext('2d')

    if (!sourceCtx || !targetCtx) {
      throw new Error('Cannot get canvas contexts for pixel copy')
    }

    try {
      // For 2D canvas
      if (sourceCtx.getImageData) {
        const imageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
        targetCtx.putImageData(imageData, 0, 0)
        return targetCanvas
      }

      // For WebGL canvas
      if (sourceCtx.readPixels) {
        const pixels = new Uint8Array(sourceCanvas.width * sourceCanvas.height * 4)
        sourceCtx.readPixels(0, 0, sourceCanvas.width, sourceCanvas.height, sourceCtx.RGBA, sourceCtx.UNSIGNED_BYTE, pixels)

        const imageData = new ImageData(new Uint8ClampedArray(pixels), sourceCanvas.width, sourceCanvas.height)
        targetCtx.putImageData(imageData, 0, 0)
        return targetCanvas
      }

      throw new Error('No suitable pixel copy method available')

    } catch (error) {
      logger.error('Pixel copy failed:', error)
      throw error
    }
  }

  /**
   * Create canvas from blob
   */
  async createCanvasFromBlob(blob, options = {}) {
    return new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = () => {
        const canvas = createCanvas(img.width, img.height, { contextType: '2d' })
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(img.src)
        resolve(canvas)
      }

      img.onerror = () => {
        URL.revokeObjectURL(img.src)
        reject(new Error('Failed to load image from blob'))
      }

      img.src = URL.createObjectURL(blob)
    })
  }

  /**
   * Transfer OffscreenCanvas to regular canvas
   */
  transferOffscreenToCanvas(offscreenCanvas, options = {}) {
    const canvas = createCanvas(offscreenCanvas.width, offscreenCanvas.height, { contextType: '2d' })
    const ctx = canvas.getContext('2d')

    // This is a simplified approach - in practice, you'd need to transfer the actual content
    // which might require using ImageBitmap or other transfer mechanisms
    try {
      ctx.drawImage(offscreenCanvas, 0, 0)
      return canvas
    } catch (error) {
      throw new Error('Cannot transfer OffscreenCanvas content')
    }
  }

  /**
   * Type detection methods
   */
  isThreeJSRenderer(obj) {
    return obj &&
           typeof obj === 'object' &&
           obj.domElement &&
           obj.domElement instanceof HTMLCanvasElement &&
           (obj.constructor.name === 'WebGLRenderer' || obj.isWebGLRenderer)
  }

  isReactRef(obj) {
    return obj && typeof obj === 'object' && 'current' in obj
  }

  isWebGLContext(obj) {
    return obj && (
      obj instanceof WebGLRenderingContext ||
      obj instanceof WebGL2RenderingContext ||
      (typeof obj === 'object' && obj.canvas && (obj.drawArrays || obj.drawElements))
    )
  }

  is2DContext(obj) {
    return obj &&
           typeof obj === 'object' &&
           obj.canvas &&
           typeof obj.fillRect === 'function'
  }

  getCanvasContext(canvas) {
    if (!canvas) return null

    // Try to get existing context
    return canvas.getContext('2d') ||
           canvas.getContext('webgl') ||
           canvas.getContext('webgl2') ||
           null
  }

  /**
   * Cache management
   */
  generateCacheKey(validation, options) {
    const canvas = validation.canvas
    const keyData = {
      type: validation.type,
      width: canvas?.width || 0,
      height: canvas?.height || 0,
      options: JSON.stringify(options)
    }
    return JSON.stringify(keyData)
  }

  cacheConversion(key, canvas) {
    // Limit cache size
    if (this.conversionCache.size >= this.maxCacheSize) {
      const firstKey = this.conversionCache.keys().next().value
      this.conversionCache.delete(firstKey)
    }

    this.conversionCache.set(key, {
      canvas,
      timestamp: Date.now()
    })
  }

  isCacheValid(cached) {
    const maxAge = 30000 // 30 seconds
    return Date.now() - cached.timestamp < maxAge
  }

  /**
   * Cleanup cache
   */
  clearCache() {
    this.conversionCache.clear()
  }

  dispose() {
    this.clearCache()
  }
}

// Singleton instance
const canvasValidator = new CanvasValidator()

// Export utility functions
export const validateCanvas = (canvas) => canvasValidator.validateCanvas(canvas)
export const convertToExportableCanvas = (canvas, options) => canvasValidator.convertToExportableCanvas(canvas, options)
export const extractImageData = (canvas, options) => canvasValidator.extractImageData(canvas, options)

export { canvasValidator }
export default canvasValidator