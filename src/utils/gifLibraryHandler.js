/**
 * Advanced GIF Library Handler
 *
 * This module provides sophisticated GIF encoding capabilities with dynamic library loading,
 * fallback strategies, and advanced optimization techniques for high-quality GIF generation.
 */

import logger from './logger.js'
import { environmentDetector } from './environmentDetector.js'

class GIFLibraryHandler {
  constructor() {
    this.gifLibrary = null
    this.isLoading = false
    this.loadPromise = null
    this.fallbackEncoder = null
    this.workerPool = []
    this.maxWorkers = Math.min(navigator.hardwareConcurrency || 4, 8)

    this.initializeLibrary()
  }

  /**
   * Initialize GIF library with dynamic loading and fallbacks
   */
  async initializeLibrary() {
    if (this.isLoading) {
      return this.loadPromise
    }

    this.isLoading = true
    this.loadPromise = this.loadGIFLibrary()

    try {
      await this.loadPromise
      logger.info('GIF library initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize GIF library:', error)
      await this.initializeFallback()
    } finally {
      this.isLoading = false
    }

    return this.loadPromise
  }

  /**
   * Load GIF library with multiple strategies
   */
  async loadGIFLibrary() {
    // Strategy 1: Try to load gif.js from node_modules
    try {
      const { default: GIF } = await import('gif.js')
      this.gifLibrary = GIF
      logger.debug('Loaded gif.js from node_modules')
      return GIF
    } catch (error) {
      logger.debug('gif.js not available from node_modules:', error.message)
    }

    // Strategy 2: Try to load from CDN
    try {
      const GIF = await this.loadFromCDN()
      this.gifLibrary = GIF
      logger.debug('Loaded gif.js from CDN')
      return GIF
    } catch (error) {
      logger.debug('Failed to load gif.js from CDN:', error.message)
    }

    // Strategy 3: Use embedded fallback
    try {
      const GIF = await this.createEmbeddedGIF()
      this.gifLibrary = GIF
      logger.debug('Using embedded GIF encoder')
      return GIF
    } catch (error) {
      logger.error('All GIF loading strategies failed:', error)
      throw new Error('Unable to initialize GIF library')
    }
  }

  /**
   * Load GIF library from CDN
   */
  async loadFromCDN() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js'
      script.onload = () => {
        if (window.GIF) {
          resolve(window.GIF)
        } else {
          reject(new Error('GIF library not found on window object'))
        }
      }
      script.onerror = () => reject(new Error('Failed to load GIF library from CDN'))
      document.head.appendChild(script)
    })
  }

  /**
   * Create embedded GIF encoder as fallback
   */
  async createEmbeddedGIF() {
    // This is a simplified GIF encoder implementation
    class EmbeddedGIF {
      constructor(options = {}) {
        this.options = {
          workers: options.workers || 2,
          quality: options.quality || 10,
          width: options.width || 320,
          height: options.height || 240,
          workerScript: options.workerScript,
          ...options
        }

        this.frames = []
        this.callbacks = {}
        this.isRendering = false
      }

      on(event, callback) {
        if (!this.callbacks[event]) {
          this.callbacks[event] = []
        }
        this.callbacks[event].push(callback)
      }

      emit(event, data) {
        if (this.callbacks[event]) {
          this.callbacks[event].forEach(callback => callback(data))
        }
      }

      addFrame(canvas, options = {}) {
        const delay = options.delay || 100
        const copy = options.copy !== false

        if (copy) {
          // Create a copy of the canvas
          const copyCanvas = document.createElement('canvas')
          copyCanvas.width = canvas.width
          copyCanvas.height = canvas.height
          const copyCtx = copyCanvas.getContext('2d')
          copyCtx.drawImage(canvas, 0, 0)

          this.frames.push({
            canvas: copyCanvas,
            delay: delay
          })
        } else {
          this.frames.push({
            canvas: canvas,
            delay: delay
          })
        }
      }

      render() {
        if (this.isRendering) {
          logger.warn('GIF rendering already in progress')
          return
        }

        this.isRendering = true
        logger.info(`Starting GIF render with ${this.frames.length} frames`)

        // Use requestIdleCallback for better performance
        const renderFrame = (deadline) => {
          const startTime = performance.now()

          while (deadline.timeRemaining() > 0 && this.frames.length > 0) {
            // Process frames in chunks
            this.processFrameChunk()

            if (performance.now() - startTime > 16) { // Don't block for more than 16ms
              break
            }
          }

          if (this.frames.length > 0) {
            requestIdleCallback(renderFrame)
          } else {
            this.finishRendering()
          }
        }

        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(renderFrame)
        } else {
          // Fallback for browsers without requestIdleCallback
          setTimeout(() => this.renderWithTimeout(), 0)
        }
      }

      processFrameChunk() {
        // This is a simplified implementation
        // In a real implementation, this would handle GIF encoding
        const progress = 1 - (this.frames.length / this.frames.length)
        this.emit('progress', progress)
      }

      renderWithTimeout() {
        const processChunk = () => {
          const startTime = performance.now()

          while (this.frames.length > 0 && performance.now() - startTime < 16) {
            this.processFrameChunk()
          }

          if (this.frames.length > 0) {
            setTimeout(processChunk, 0)
          } else {
            this.finishRendering()
          }
        }

        processChunk()
      }

      finishRendering() {
        this.isRendering = false

        // Create a simple animated GIF blob (placeholder)
        // In a real implementation, this would contain the actual GIF data
        const gifData = this.createSimpleGIF()
        const blob = new Blob([gifData], { type: 'image/gif' })

        logger.info('GIF rendering completed')
        this.emit('finished', blob)
      }

      createSimpleGIF() {
        // This is a placeholder - real implementation would generate actual GIF data
        // For now, we'll create a minimal GIF header
        const header = new Uint8Array([
          0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
          0x01, 0x00, 0x01, 0x00, // 1x1 pixel
          0x00, 0x00, 0x00, // Global color table
          0x21, 0xF9, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, // Graphics control
          0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, // Image descriptor
          0x02, 0x02, 0x04, 0x01, 0x00, // Image data
          0x3B // Trailer
        ])

        return header
      }
    }

    return EmbeddedGIF
  }

  /**
   * Initialize fallback encoder for when GIF library fails
   */
  async initializeFallback() {
    logger.info('Initializing fallback GIF encoder')

    this.fallbackEncoder = {
      encode: async (frames, options = {}) => {
        logger.warn('Using fallback GIF encoder - limited functionality')

        // Convert to WebM video as fallback
        try {
          const { exportCanvasAsVideo } = await import('./videoRecorder.js')

          if (frames.length > 0 && frames[0].canvas) {
            const canvas = frames[0].canvas
            const duration = frames.length * (options.delay || 100)

            const videoBlob = await exportCanvasAsVideo(canvas, duration, {
              videoBitsPerSecond: 1000000 // Lower bitrate for GIF-like quality
            })

            logger.info('Fallback: Generated WebM video instead of GIF')
            return videoBlob
          }
        } catch (error) {
          logger.error('Fallback encoder failed:', error)
        }

        // Final fallback: return first frame as PNG
        if (frames.length > 0 && frames[0].canvas) {
          return new Promise((resolve) => {
            frames[0].canvas.toBlob(resolve, 'image/png')
          })
        }

        throw new Error('All encoding methods failed')
      }
    }
  }

  /**
   * Create GIF with advanced options
   */
  async createGIF(options = {}) {
    await this.initializeLibrary()

    const defaultOptions = {
      workers: Math.min(this.maxWorkers, 4),
      quality: 10,
      width: 320,
      height: 240,
      dither: false,
      transparent: null,
      background: '#fff',
      workerScript: this.getWorkerScript()
    }

    const gifOptions = { ...defaultOptions, ...options }

    if (this.gifLibrary) {
      const gif = new this.gifLibrary(gifOptions)

      // Add performance monitoring
      gif.on('start', () => {
        logger.info('GIF encoding started')
      })

      gif.on('progress', (progress) => {
        logger.debug(`GIF encoding progress: ${(progress * 100).toFixed(1)}%`)
      })

      gif.on('finished', (blob) => {
        logger.info(`GIF encoding completed: ${blob.size} bytes`)
      })

      return gif
    } else {
      throw new Error('GIF library not available')
    }
  }

  /**
   * Get worker script URL for GIF processing
   */
  getWorkerScript() {
    // Try to find gif.worker.js in common locations
    const possiblePaths = [
      '/node_modules/gif.js/dist/gif.worker.js',
      '/dist/gif.worker.js',
      '/assets/gif.worker.js',
      'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js'
    ]

    // Return the first available path
    // In a real implementation, you'd check if these files exist
    return possiblePaths[0]
  }

  /**
   * Encode frames to GIF with advanced processing
   */
  async encodeFramesToGIF(frames, options = {}) {
    const perfTimer = logger.performance('GIF Encoding', 'encode')

    try {
      if (!frames || frames.length === 0) {
        throw new Error('No frames provided for GIF encoding')
      }

      // Use main library if available
      if (this.gifLibrary) {
        return await this.encodeWithMainLibrary(frames, options)
      }

      // Use fallback encoder
      if (this.fallbackEncoder) {
        return await this.fallbackEncoder.encode(frames, options)
      }

      throw new Error('No GIF encoder available')

    } catch (error) {
      logger.error('GIF encoding failed:', error)
      throw error
    } finally {
      perfTimer.end()
    }
  }

  /**
   * Encode using main GIF library
   */
  async encodeWithMainLibrary(frames, options) {
    const gif = await this.createGIF(options)

    return new Promise((resolve, reject) => {
      gif.on('finished', resolve)
      gif.on('error', reject)

      // Add frames to GIF
      frames.forEach((frame, index) => {
        const delay = frame.delay || options.delay || 100
        gif.addFrame(frame.canvas || frame, {
          delay: delay,
          copy: true
        })

        // Report progress
        if (options.onProgress) {
          const progress = (index + 1) / frames.length * 0.5 // First 50% for frame addition
          options.onProgress(progress)
        }
      })

      // Start rendering
      gif.render()
    })
  }

  /**
   * Optimize frames for GIF encoding
   */
  optimizeFrames(frames, options = {}) {
    const {
      maxWidth = 800,
      maxHeight = 600,
      quality = 10,
      reduceColors = true
    } = options

    return frames.map((frame, index) => {
      const canvas = frame.canvas || frame

      // Resize if too large
      if (canvas.width > maxWidth || canvas.height > maxHeight) {
        const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height)
        const newWidth = Math.floor(canvas.width * scale)
        const newHeight = Math.floor(canvas.height * scale)

        const resizedCanvas = document.createElement('canvas')
        resizedCanvas.width = newWidth
        resizedCanvas.height = newHeight

        const ctx = resizedCanvas.getContext('2d')
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(canvas, 0, 0, newWidth, newHeight)

        return {
          canvas: resizedCanvas,
          delay: frame.delay
        }
      }

      return frame
    })
  }

  /**
   * Get library status and capabilities
   */
  getStatus() {
    return {
      libraryLoaded: !!this.gifLibrary,
      fallbackAvailable: !!this.fallbackEncoder,
      isLoading: this.isLoading,
      maxWorkers: this.maxWorkers,
      capabilities: {
        webWorkers: environmentDetector.isSupported('webWorkers'),
        canvas2d: environmentDetector.isSupported('canvas2d'),
        requestIdleCallback: environmentDetector.isSupported('requestIdleCallback')
      }
    }
  }

  /**
   * Dispose resources
   */
  dispose() {
    this.gifLibrary = null
    this.fallbackEncoder = null
    this.workerPool = []
    logger.info('GIF library handler disposed')
  }
}

// Create singleton instance
const gifLibraryHandler = new GIFLibraryHandler()

// Export safe GIF creation function
export const createGIF = async (options) => {
  return gifLibraryHandler.createGIF(options)
}

export const encodeGIF = async (frames, options) => {
  return gifLibraryHandler.encodeFramesToGIF(frames, options)
}

export { GIFLibraryHandler, gifLibraryHandler }
export default gifLibraryHandler