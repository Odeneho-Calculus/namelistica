/**
 * Advanced Export Manager
 *
 * This module provides comprehensive export functionality with robust error handling,
 * multiple fallback strategies, and support for various canvas types and formats.
 */

import logger from './logger.js'
import { canvasReferenceResolver } from './canvasReferenceResolver.js'
import { validateCanvas, extractImageData } from './canvasValidator.js'
import { canvasDebugger } from './canvasDebugger.js'
import { exportCanvasAsGIF } from './realGifExporter.js'
import { exportCanvasAsAdvancedGIF } from './enhancedGifExporter.js'
import { exportCanvasAsVideo, convertWebMToMP4 } from './videoRecorder.js'
import { CanvasRecorder } from './canvasRecorder.js'

export class ExportManager {
  constructor() {
    this.activeExports = new Map()
    this.exportHistory = []
    this.maxHistorySize = 50
  }

  /**
   * Export canvas as PNG with comprehensive error handling
   */
  async exportPNG(canvasInput, options = {}) {
    const exportId = this.generateExportId('png')
    const perfTimer = logger.performance('PNG Export', 'export')

    try {
      this.startExport(exportId, 'png', options)

      // Resolve and validate canvas
      const canvasResult = await this.resolveAndValidateCanvas(canvasInput)
      if (!canvasResult.success) {
        throw new Error(`Canvas resolution failed: ${canvasResult.error}`)
      }

      this.updateExportProgress(exportId, 25)

      // Extract image data with multiple fallback strategies
      const imageData = await this.extractImageDataWithFallbacks(canvasResult.canvas, {
        format: 'png',
        quality: options.quality || 1.0
      })

      this.updateExportProgress(exportId, 75)

      // Convert to blob
      const blob = await this.dataURLToBlob(imageData)

      this.updateExportProgress(exportId, 100)

      const result = {
        blob,
        format: 'png',
        size: blob.size,
        exportId
      }

      this.completeExport(exportId, result)
      perfTimer.end()

      return result

    } catch (error) {
      this.failExport(exportId, error)
      perfTimer.end()
      throw error
    }
  }

  /**
   * Export canvas as JPG with quality control
   */
  async exportJPG(canvasInput, options = {}) {
    const exportId = this.generateExportId('jpg')
    const perfTimer = logger.performance('JPG Export', 'export')

    try {
      this.startExport(exportId, 'jpg', options)

      const canvasResult = await this.resolveAndValidateCanvas(canvasInput)
      if (!canvasResult.success) {
        throw new Error(`Canvas resolution failed: ${canvasResult.error}`)
      }

      this.updateExportProgress(exportId, 25)

      const imageData = await this.extractImageDataWithFallbacks(canvasResult.canvas, {
        format: 'jpg',
        quality: (options.quality || 80) / 100
      })

      this.updateExportProgress(exportId, 75)

      const blob = await this.dataURLToBlob(imageData)

      this.updateExportProgress(exportId, 100)

      const result = {
        blob,
        format: 'jpg',
        size: blob.size,
        exportId
      }

      this.completeExport(exportId, result)
      perfTimer.end()

      return result

    } catch (error) {
      this.failExport(exportId, error)
      perfTimer.end()
      throw error
    }
  }

  /**
   * Export canvas as GIF with multiple strategies
   */
  async exportGIF(canvasInput, options = {}) {
    const exportId = this.generateExportId('gif')
    const perfTimer = logger.performance('GIF Export', 'export')

    try {
      this.startExport(exportId, 'gif', options)

      const canvasResult = await this.resolveAndValidateCanvas(canvasInput)
      if (!canvasResult.success) {
        throw new Error(`Canvas resolution failed: ${canvasResult.error}`)
      }

      this.updateExportProgress(exportId, 10)

      const gifOptions = {
        quality: options.quality || 10,
        duration: options.duration || 4000,
        fps: options.fps || 30,
        onProgress: (progress) => {
          this.updateExportProgress(exportId, 10 + (progress * 80))
        }
      }

      let blob

      // Try enhanced GIF exporter first
      try {
        logger.info('Attempting enhanced GIF export')
        blob = await exportCanvasAsAdvancedGIF(canvasResult.canvas, gifOptions)
      } catch (enhancedError) {
        logger.warn('Enhanced GIF export failed, trying standard exporter:', enhancedError)

        // Fallback to standard GIF exporter
        try {
          blob = await exportCanvasAsGIF(canvasResult.canvas, gifOptions)
        } catch (standardError) {
          logger.warn('Standard GIF export failed, trying frame capture:', standardError)

          // Fallback to frame-by-frame capture
          blob = await this.exportGIFWithFrameCapture(canvasResult.canvas, gifOptions)
        }
      }

      this.updateExportProgress(exportId, 95)

      // Final fallback to PNG if all GIF methods fail
      if (!blob) {
        logger.warn('All GIF export methods failed, falling back to PNG')
        const pngResult = await this.exportPNG(canvasInput, { quality: 1.0 })
        blob = pngResult.blob
      }

      this.updateExportProgress(exportId, 100)

      const result = {
        blob,
        format: blob.type.includes('gif') ? 'gif' : 'png',
        size: blob.size,
        exportId
      }

      this.completeExport(exportId, result)
      perfTimer.end()

      return result

    } catch (error) {
      this.failExport(exportId, error)
      perfTimer.end()
      throw error
    }
  }

  /**
   * Export canvas as MP4 video
   */
  async exportMP4(canvasInput, options = {}) {
    const exportId = this.generateExportId('mp4')
    const perfTimer = logger.performance('MP4 Export', 'export')

    try {
      this.startExport(exportId, 'mp4', options)

      const canvasResult = await this.resolveAndValidateCanvas(canvasInput)
      if (!canvasResult.success) {
        throw new Error(`Canvas resolution failed: ${canvasResult.error}`)
      }

      this.updateExportProgress(exportId, 10)

      // Check browser support
      if (!this.isVideoExportSupported()) {
        throw new Error('Video export not supported in this browser')
      }

      const videoOptions = {
        duration: options.duration || 4000,
        videoBitsPerSecond: options.quality ? options.quality * 25000 : 2500000,
        onProgress: (progress) => {
          this.updateExportProgress(exportId, 10 + (progress * 70))
        }
      }

      let blob

      // Try direct canvas video recording
      try {
        blob = await exportCanvasAsVideo(canvasResult.canvas, videoOptions.duration, videoOptions)
      } catch (directError) {
        logger.warn('Direct video export failed, trying frame-by-frame:', directError)

        // Fallback to frame-by-frame recording
        blob = await this.exportVideoWithFrameCapture(canvasResult.canvas, videoOptions)
      }

      this.updateExportProgress(exportId, 85)

      // Convert to MP4 if we got WebM
      if (blob && blob.type.includes('webm')) {
        try {
          const mp4Blob = await convertWebMToMP4(blob)
          if (mp4Blob) {
            blob = mp4Blob
          }
        } catch (conversionError) {
          logger.warn('MP4 conversion failed, keeping WebM:', conversionError)
        }
      }

      this.updateExportProgress(exportId, 95)

      // Final fallback to PNG if video export fails
      if (!blob) {
        logger.warn('All video export methods failed, falling back to PNG')
        const pngResult = await this.exportPNG(canvasInput, { quality: 1.0 })
        blob = pngResult.blob
      }

      this.updateExportProgress(exportId, 100)

      const result = {
        blob,
        format: blob.type.includes('mp4') ? 'mp4' : blob.type.includes('webm') ? 'webm' : 'png',
        size: blob.size,
        exportId
      }

      this.completeExport(exportId, result)
      perfTimer.end()

      return result

    } catch (error) {
      this.failExport(exportId, error)
      perfTimer.end()
      throw error
    }
  }

  /**
   * Resolve and validate canvas with comprehensive error handling
   */
  async resolveAndValidateCanvas(canvasInput) {
    try {
      // Perform comprehensive canvas analysis for debugging
      const analysis = canvasDebugger.analyzeCanvas(canvasInput, 'export-validation')

      // Log critical issues
      if (analysis.validation.criticalIssues.length > 0) {
        logger.error('Canvas validation critical issues:', analysis.validation.criticalIssues)
      }

      // First, resolve the canvas reference
      const resolution = canvasReferenceResolver.getValidatedCanvas(canvasInput)

      if (!resolution.success) {
        logger.error('Canvas resolution failed. Debug analysis:', {
          inputType: analysis.input.constructor,
          resolutionSteps: analysis.resolution.steps.length,
          finalCanvas: analysis.resolution.finalCanvas ? 'found' : 'not found',
          recommendations: analysis.recommendations.filter(r => r.type === 'critical')
        })

        return {
          success: false,
          error: `Canvas reference resolution failed: ${resolution.error}`,
          debugInfo: analysis
        }
      }

      // Additional validation using the canvas validator
      const validation = validateCanvas(resolution.canvas)

      if (!validation.isValid) {
        logger.error('Canvas validation failed. Debug analysis:', {
          canvasType: validation.type,
          validationError: validation.error,
          capabilities: analysis.capabilities,
          recommendations: analysis.recommendations.filter(r => r.type === 'critical')
        })

        return {
          success: false,
          error: `Canvas validation failed: ${validation.error}`,
          debugInfo: analysis
        }
      }

      logger.debug('Canvas validation successful:', {
        canvasType: validation.type,
        dimensions: `${resolution.canvas.width}x${resolution.canvas.height}`,
        formats: analysis.capabilities.formats,
        features: analysis.capabilities.features
      })

      return {
        success: true,
        canvas: validation.canvas,
        type: validation.type,
        needsConversion: validation.needsConversion,
        debugInfo: analysis
      }

    } catch (error) {
      logger.error('Canvas resolution error:', error)
      return {
        success: false,
        error: `Canvas resolution error: ${error.message}`
      }
    }
  }

  /**
   * Extract image data with multiple fallback strategies
   */
  async extractImageDataWithFallbacks(canvas, options) {
    const strategies = [
      // Strategy 1: Direct toDataURL
      () => this.extractDirectImageData(canvas, options),

      // Strategy 2: Using canvas validator
      () => extractImageData(canvas, options),

      // Strategy 3: Copy to new canvas and extract
      () => this.extractViaCopyCanvas(canvas, options),

      // Strategy 4: Pixel-by-pixel extraction
      () => this.extractViaPixelData(canvas, options)
    ]

    for (let i = 0; i < strategies.length; i++) {
      try {
        logger.debug(`Trying image extraction strategy ${i + 1}`)
        const result = await strategies[i]()
        if (result) {
          logger.debug(`Image extraction strategy ${i + 1} succeeded`)
          return result
        }
      } catch (error) {
        logger.warn(`Image extraction strategy ${i + 1} failed:`, error)
        if (i === strategies.length - 1) {
          throw new Error(`All image extraction strategies failed. Last error: ${error.message}`)
        }
      }
    }

    throw new Error('All image extraction strategies failed')
  }

  /**
   * Direct image data extraction
   */
  async extractDirectImageData(canvas, options) {
    if (typeof canvas.toDataURL !== 'function') {
      throw new Error('Canvas does not support toDataURL')
    }

    const { format = 'png', quality = 1.0 } = options
    const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png'

    return canvas.toDataURL(mimeType, quality)
  }

  /**
   * Extract via copying to new canvas
   */
  async extractViaCopyCanvas(canvas, options) {
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height

    const tempCtx = tempCanvas.getContext('2d')
    tempCtx.drawImage(canvas, 0, 0)

    return this.extractDirectImageData(tempCanvas, options)
  }

  /**
   * Extract via pixel data manipulation
   */
  async extractViaPixelData(canvas, options) {
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height

    const tempCtx = tempCanvas.getContext('2d')
    const sourceCtx = canvas.getContext('2d')

    if (!sourceCtx) {
      throw new Error('Cannot get source canvas context')
    }

    const imageData = sourceCtx.getImageData(0, 0, canvas.width, canvas.height)
    tempCtx.putImageData(imageData, 0, 0)

    return this.extractDirectImageData(tempCanvas, options)
  }

  /**
   * Export GIF using frame capture
   */
  async exportGIFWithFrameCapture(canvas, options) {
    const recorder = new CanvasRecorder()

    // Start recording
    recorder.startRecording(canvas, options.fps || 30)

    // Record for specified duration
    await new Promise(resolve => setTimeout(resolve, options.duration || 4000))

    // Stop recording and export
    recorder.stopRecording()

    return recorder.exportAsGIF({
      quality: options.quality,
      onProgress: options.onProgress
    })
  }

  /**
   * Export video using frame capture
   */
  async exportVideoWithFrameCapture(canvas, options) {
    const recorder = new CanvasRecorder()

    // Start recording
    recorder.startRecording(canvas, 30)

    // Record for specified duration
    await new Promise(resolve => setTimeout(resolve, options.duration || 4000))

    // Stop recording and export
    recorder.stopRecording()

    return recorder.exportAsVideo({
      videoBitsPerSecond: options.videoBitsPerSecond,
      onProgress: options.onProgress
    })
  }

  /**
   * Convert data URL to blob
   */
  async dataURLToBlob(dataURL) {
    const response = await fetch(dataURL)
    return response.blob()
  }

  /**
   * Check if video export is supported
   */
  isVideoExportSupported() {
    return !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream)
  }

  /**
   * Export management methods
   */
  generateExportId(format) {
    return `${format}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  startExport(exportId, format, options) {
    const exportInfo = {
      id: exportId,
      format,
      options,
      startTime: Date.now(),
      progress: 0,
      status: 'started'
    }

    this.activeExports.set(exportId, exportInfo)
    logger.info(`Export started: ${exportId} (${format})`)
  }

  updateExportProgress(exportId, progress) {
    const exportInfo = this.activeExports.get(exportId)
    if (exportInfo) {
      exportInfo.progress = progress
      exportInfo.status = 'in-progress'
    }
  }

  completeExport(exportId, result) {
    const exportInfo = this.activeExports.get(exportId)
    if (exportInfo) {
      exportInfo.status = 'completed'
      exportInfo.endTime = Date.now()
      exportInfo.duration = exportInfo.endTime - exportInfo.startTime
      exportInfo.result = result

      // Move to history
      this.addToHistory(exportInfo)
      this.activeExports.delete(exportId)

      logger.info(`Export completed: ${exportId} (${exportInfo.duration}ms, ${result.size} bytes)`)
    }
  }

  failExport(exportId, error) {
    const exportInfo = this.activeExports.get(exportId)
    if (exportInfo) {
      exportInfo.status = 'failed'
      exportInfo.endTime = Date.now()
      exportInfo.duration = exportInfo.endTime - exportInfo.startTime
      exportInfo.error = error.message

      // Move to history
      this.addToHistory(exportInfo)
      this.activeExports.delete(exportId)

      logger.error(`Export failed: ${exportId} (${exportInfo.duration}ms) - ${error.message}`)
    }
  }

  addToHistory(exportInfo) {
    this.exportHistory.unshift(exportInfo)

    // Limit history size
    if (this.exportHistory.length > this.maxHistorySize) {
      this.exportHistory = this.exportHistory.slice(0, this.maxHistorySize)
    }
  }

  /**
   * Get export statistics
   */
  getStatistics() {
    return {
      activeExports: this.activeExports.size,
      historySize: this.exportHistory.length,
      recentExports: this.exportHistory.slice(0, 10),
      timestamp: new Date().toISOString()
    }
  }
}

// Create singleton instance
const exportManager = new ExportManager()

// Export utility functions
export const exportPNG = (canvas, options) => exportManager.exportPNG(canvas, options)
export const exportJPG = (canvas, options) => exportManager.exportJPG(canvas, options)
export const exportGIF = (canvas, options) => exportManager.exportGIF(canvas, options)
export const exportMP4 = (canvas, options) => exportManager.exportMP4(canvas, options)

export { exportManager }
export default exportManager