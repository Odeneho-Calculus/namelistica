/**
 * Enhanced GIF Export System with Advanced Canvas Handling
 *
 * This module provides a robust GIF export system that handles various canvas types,
 * implements multiple encoding strategies, and provides comprehensive error handling
 * with intelligent fallback mechanisms.
 */

import logger from './logger.js'
import { environmentDetector } from './environmentDetector.js'
import { canvasValidator, extractImageData } from './canvasValidator.js'
import { createCanvas, createOffscreenCanvas } from './canvasContextManager.js'

export class EnhancedGIFExporter {
  constructor(options = {}) {
    this.options = {
      quality: 10,
      fps: 30,
      duration: 4000,
      maxFrames: 120,
      compressionLevel: 'medium',
      colorReduction: 'adaptive',
      ditherType: 'floyd-steinberg',
      optimizeTransparency: true,
      ...options
    }

    this.frames = []
    this.frameTimestamps = []
    this.isRecording = false
    this.recordingStartTime = 0
    this.frameCount = 0
    this.progressCallback = null
    this.abortController = new AbortController()
  }

  /**
   * Start recording frames from canvas
   */
  async startRecording(canvasInput, options = {}) {
    const recordingOptions = { ...this.options, ...options }

    try {
      // Validate and prepare canvas
      const validation = canvasValidator.validateCanvas(canvasInput)
      if (!validation.isValid) {
        throw new Error(`Invalid canvas for recording: ${validation.error}`)
      }

      logger.info('Starting enhanced GIF recording', {
        canvasType: validation.type,
        options: recordingOptions
      })

      // Initialize recording state
      this.resetRecording()
      this.isRecording = true
      this.recordingStartTime = performance.now()
      this.progressCallback = recordingOptions.onProgress

      // Choose recording strategy based on canvas type and capabilities
      const strategy = this.selectRecordingStrategy(validation, recordingOptions)

      return await this.executeRecordingStrategy(strategy, canvasInput, recordingOptions)

    } catch (error) {
      logger.error('GIF recording failed:', error)
      this.stopRecording()
      throw error
    }
  }

  /**
   * Select optimal recording strategy
   */
  selectRecordingStrategy(validation, options) {
    const strategies = []

    // Modern browser with MediaRecorder support
    if (environmentDetector.isSupported('mediaRecorder') &&
        environmentDetector.isSupported('captureStream') &&
        validation.type === 'html-canvas') {
      strategies.push('media-recorder')
    }

    // WebCodecs API for advanced encoding
    if (environmentDetector.isSupported('webCodecs') &&
        environmentDetector.isSupported('videoEncoder')) {
      strategies.push('web-codecs')
    }

    // Frame-by-frame capture (most compatible)
    strategies.push('frame-capture')

    // Canvas-specific optimizations
    if (validation.type === 'webgl-context') {
      strategies.unshift('webgl-optimized')
    }

    logger.debug('Available recording strategies:', strategies)
    return strategies[0] || 'frame-capture'
  }

  /**
   * Execute selected recording strategy
   */
  async executeRecordingStrategy(strategy, canvasInput, options) {
    switch (strategy) {
      case 'media-recorder':
        return this.recordWithMediaRecorder(canvasInput, options)

      case 'web-codecs':
        return this.recordWithWebCodecs(canvasInput, options)

      case 'webgl-optimized':
        return this.recordWebGLOptimized(canvasInput, options)

      case 'frame-capture':
      default:
        return this.recordWithFrameCapture(canvasInput, options)
    }
  }

  /**
   * Record using MediaRecorder API
   */
  async recordWithMediaRecorder(canvasInput, options) {
    const canvas = await canvasValidator.convertToExportableCanvas(canvasInput)

    if (!canvas.captureStream) {
      throw new Error('Canvas does not support captureStream')
    }

    const stream = canvas.captureStream(options.fps)
    const mimeType = this.selectOptimalMimeType()

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: this.calculateBitrate(options)
    })

    const chunks = []

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        mediaRecorder.stop()
        stream.getTracks().forEach(track => track.stop())
      }, options.duration)

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        clearTimeout(timeout)
        try {
          const videoBlob = new Blob(chunks, { type: mimeType })
          const gifBlob = await this.convertVideoToGIF(videoBlob, options)
          resolve(gifBlob)
        } catch (error) {
          reject(error)
        }
      }

      mediaRecorder.onerror = reject
      mediaRecorder.start()
    })
  }

  /**
   * Record using WebCodecs API
   */
  async recordWithWebCodecs(canvasInput, options) {
    if (!environmentDetector.isSupported('webCodecs')) {
      throw new Error('WebCodecs not supported')
    }

    const canvas = await canvasValidator.convertToExportableCanvas(canvasInput)
    const encoder = new VideoEncoder({
      output: (chunk, metadata) => {
        this.processEncodedChunk(chunk, metadata)
      },
      error: (error) => {
        logger.error('WebCodecs encoding error:', error)
      }
    })

    const config = {
      codec: 'vp9',
      width: canvas.width,
      height: canvas.height,
      bitrate: this.calculateBitrate(options),
      framerate: options.fps
    }

    encoder.configure(config)

    // Capture frames and encode
    return this.captureFramesForWebCodecs(canvas, encoder, options)
  }

  /**
   * Record with WebGL optimizations
   */
  async recordWebGLOptimized(canvasInput, options) {
    const validation = canvasValidator.validateCanvas(canvasInput)
    const canvas = validation.canvas
    const context = validation.context

    // Ensure WebGL context is properly flushed
    if (context.finish) {
      context.finish()
    }

    // Use optimized frame capture for WebGL
    return this.recordWithFrameCapture(canvas, {
      ...options,
      webglOptimized: true,
      preserveDrawingBuffer: true
    })
  }

  /**
   * Record using frame-by-frame capture
   */
  async recordWithFrameCapture(canvasInput, options) {
    const frameInterval = 1000 / options.fps
    const maxFrames = Math.min(
      Math.floor(options.duration / frameInterval),
      options.maxFrames || 120
    )

    logger.info(`Starting frame capture: ${maxFrames} frames at ${options.fps}fps`)

    // Capture frames
    for (let i = 0; i < maxFrames && this.isRecording; i++) {
      try {
        await this.captureFrame(canvasInput, options)

        // Update progress
        if (this.progressCallback) {
          this.progressCallback((i + 1) / maxFrames * 0.8) // 80% for capture
        }

        // Wait for next frame
        if (i < maxFrames - 1) {
          await this.waitForNextFrame(frameInterval)
        }

      } catch (error) {
        logger.error(`Frame capture failed at frame ${i}:`, error)
        // Continue with next frame
      }
    }

    // Generate GIF from captured frames
    if (this.progressCallback) {
      this.progressCallback(0.8) // Start encoding phase
    }

    return this.generateGIFFromFrames(options)
  }

  /**
   * Capture single frame
   */
  async captureFrame(canvasInput, options) {
    try {
      const imageData = await extractImageData(canvasInput, {
        format: 'png',
        quality: 1.0
      })

      this.frames.push(imageData)
      this.frameTimestamps.push(performance.now() - this.recordingStartTime)
      this.frameCount++

      logger.debug(`Captured frame ${this.frameCount}`)

    } catch (error) {
      logger.error('Frame capture error:', error)
      throw error
    }
  }

  /**
   * Wait for next frame with precise timing
   */
  async waitForNextFrame(interval) {
    return new Promise(resolve => {
      if (this.abortController.signal.aborted) {
        resolve()
        return
      }

      // Use requestAnimationFrame for better timing
      requestAnimationFrame(() => {
        setTimeout(resolve, Math.max(0, interval - 16)) // Account for RAF delay
      })
    })
  }

  /**
   * Generate GIF from captured frames
   */
  async generateGIFFromFrames(options) {
    if (this.frames.length === 0) {
      throw new Error('No frames captured for GIF generation')
    }

    logger.info(`Generating GIF from ${this.frames.length} frames`)

    try {
      // Use advanced GIF encoder
      const gifBlob = await this.encodeAdvancedGIF(this.frames, options)

      if (this.progressCallback) {
        this.progressCallback(1.0)
      }

      return gifBlob

    } catch (error) {
      logger.error('GIF generation failed:', error)

      // Fallback to simple encoding
      logger.info('Attempting fallback GIF encoding')
      return this.encodeFallbackGIF(this.frames, options)
    }
  }

  /**
   * Advanced GIF encoding with optimization
   */
  async encodeAdvancedGIF(frames, options) {
    const { AdvancedGIFEncoder } = await import('./advancedGifEncoder.js')

    const encoder = new AdvancedGIFEncoder({
      quality: options.quality,
      compressionLevel: options.compressionLevel,
      colorReduction: options.colorReduction,
      ditherType: options.ditherType,
      optimizeTransparency: options.optimizeTransparency
    })

    // Process frames with optimization
    for (let i = 0; i < frames.length; i++) {
      await encoder.addFrameFromDataURL(frames[i], {
        delay: 1000 / options.fps,
        disposal: 'background'
      })

      if (this.progressCallback) {
        const progress = 0.8 + (i / frames.length) * 0.2
        this.progressCallback(progress)
      }
    }

    return encoder.encode()
  }

  /**
   * Fallback GIF encoding
   */
  async encodeFallbackGIF(frames, options) {
    const { GIFEncoder } = await import('./gifEncoder.js')

    // Create temporary canvas for frame processing
    const tempCanvas = createCanvas(800, 600) // Default size
    const tempCtx = tempCanvas.getContext('2d')

    const encoder = new GIFEncoder(tempCanvas.width, tempCanvas.height, {
      quality: options.quality
    })

    for (let i = 0; i < frames.length; i++) {
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = () => {
          tempCanvas.width = img.width
          tempCanvas.height = img.height
          tempCtx.clearRect(0, 0, img.width, img.height)
          tempCtx.drawImage(img, 0, 0)
          encoder.addFrame(tempCanvas, 1000 / options.fps)
          resolve()
        }
        img.onerror = reject
        img.src = frames[i]
      })

      if (this.progressCallback) {
        const progress = 0.8 + (i / frames.length) * 0.2
        this.progressCallback(progress)
      }
    }

    return encoder.createBlob()
  }

  /**
   * Utility methods
   */
  selectOptimalMimeType() {
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4;codecs=h264'
    ]

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }

    return 'video/webm'
  }

  calculateBitrate(options) {
    const baseRate = 2500000 // 2.5 Mbps
    const qualityMultiplier = (options.quality || 80) / 100
    return Math.floor(baseRate * qualityMultiplier)
  }

  async convertVideoToGIF(videoBlob, options) {
    // This would require a video-to-GIF conversion library
    // For now, return the video blob (browser will handle it)
    logger.warn('Video to GIF conversion not implemented, returning video')
    return videoBlob
  }

  processEncodedChunk(chunk, metadata) {
    // Process WebCodecs encoded chunks
    logger.debug('Processed encoded chunk:', chunk.byteLength, 'bytes')
  }

  async captureFramesForWebCodecs(canvas, encoder, options) {
    // Implementation for WebCodecs frame capture
    throw new Error('WebCodecs frame capture not fully implemented')
  }

  /**
   * Control methods
   */
  stopRecording() {
    this.isRecording = false
    this.abortController.abort()
  }

  resetRecording() {
    this.frames = []
    this.frameTimestamps = []
    this.frameCount = 0
    this.recordingStartTime = 0
    this.abortController = new AbortController()
  }

  setProgressCallback(callback) {
    this.progressCallback = callback
  }

  /**
   * Cleanup
   */
  dispose() {
    this.stopRecording()
    this.resetRecording()
    this.progressCallback = null
  }
}

/**
 * Main export function with intelligent fallback
 */
export const exportCanvasAsAdvancedGIF = async (canvasInput, options = {}) => {
  const exporter = new EnhancedGIFExporter(options)

  try {
    return await exporter.startRecording(canvasInput, options)
  } catch (error) {
    logger.error('Enhanced GIF export failed:', error)

    // Fallback to original implementation
    const { exportCanvasAsGIF } = await import('./realGifExporter.js')
    logger.info('Falling back to original GIF exporter')

    return exportCanvasAsGIF(canvasInput, options)
  } finally {
    exporter.dispose()
  }
}

export default EnhancedGIFExporter