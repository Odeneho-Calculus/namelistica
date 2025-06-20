/**
 * Comprehensive Canvas Export System
 *
 * This system provides robust canvas export functionality with multiple
 * fallback strategies, comprehensive error handling, and support for
 * various canvas types and export formats.
 */

import logger from './logger.js'
import { GIFEncoder } from './gifEncoder.js'

export class CanvasExportSystem {
    constructor() {
        this.exportHistory = []
        this.activeExports = new Map()
        this.maxHistorySize = 100
    }

    /**
     * Export canvas as PNG with comprehensive error handling
     */
    async exportPNG(canvasInput, options = {}) {
        const exportId = this.generateExportId('png')
        const startTime = performance.now()

        try {
            this.startExport(exportId, 'png', options)

            // Resolve canvas with multiple strategies
            const canvas = await this.resolveCanvasWithValidation(canvasInput)

            // Extract image data with fallbacks
            const imageData = await this.extractImageDataWithFallbacks(canvas, {
                format: 'png',
                quality: options.quality || 1.0
            })

            // Convert to blob
            const blob = await this.dataURLToBlob(imageData)

            const result = {
                blob,
                format: 'png',
                size: blob.size,
                exportId,
                duration: performance.now() - startTime
            }

            this.completeExport(exportId, result)
            return result

        } catch (error) {
            this.failExport(exportId, error)
            throw new Error(`PNG export failed: ${error.message}`)
        }
    }

    /**
     * Export canvas as JPG with quality control
     */
    async exportJPG(canvasInput, options = {}) {
        const exportId = this.generateExportId('jpg')
        const startTime = performance.now()

        try {
            this.startExport(exportId, 'jpg', options)

            const canvas = await this.resolveCanvasWithValidation(canvasInput)

            const imageData = await this.extractImageDataWithFallbacks(canvas, {
                format: 'jpg',
                quality: (options.quality || 80) / 100
            })

            const blob = await this.dataURLToBlob(imageData)

            const result = {
                blob,
                format: 'jpg',
                size: blob.size,
                exportId,
                duration: performance.now() - startTime
            }

            this.completeExport(exportId, result)
            return result

        } catch (error) {
            this.failExport(exportId, error)
            throw new Error(`JPG export failed: ${error.message}`)
        }
    }

    /**
     * Export canvas as GIF with animation support
     */
    async exportGIF(canvasInput, options = {}) {
        const exportId = this.generateExportId('gif')
        const startTime = performance.now()

        try {
            this.startExport(exportId, 'gif', options)

            const canvas = await this.resolveCanvasWithValidation(canvasInput)

            const gifOptions = {
                quality: options.quality || 10,
                duration: options.duration || 4000,
                frameRate: options.fps || 30,
                onProgress: options.onProgress
            }

            // Create GIF encoder
            const encoder = new GIFEncoder(gifOptions)

            // Capture frames
            const frameCount = Math.ceil((gifOptions.duration / 1000) * gifOptions.frameRate)
            const frameDelay = 1000 / gifOptions.frameRate

            for (let i = 0; i < frameCount; i++) {
                await encoder.addFrameFromCanvas(canvas, { delay: frameDelay })

                if (gifOptions.onProgress) {
                    gifOptions.onProgress((i + 1) / frameCount * 100)
                }

                // Wait for next frame
                if (i < frameCount - 1) {
                    await new Promise(resolve => setTimeout(resolve, frameDelay))
                }
            }

            // Generate GIF blob
            const blob = await encoder.exportAsBlob()

            const result = {
                blob,
                format: 'gif',
                size: blob.size,
                exportId,
                duration: performance.now() - startTime,
                frameCount
            }

            this.completeExport(exportId, result)
            return result

        } catch (error) {
            this.failExport(exportId, error)

            // Fallback to PNG if GIF fails
            logger.warn('GIF export failed, falling back to PNG:', error)
            try {
                const pngResult = await this.exportPNG(canvasInput, { quality: 1.0 })
                return {
                    ...pngResult,
                    format: 'png',
                    fallback: true,
                    originalError: error.message
                }
            } catch (fallbackError) {
                throw new Error(`GIF export failed and PNG fallback also failed: ${error.message}`)
            }
        }
    }

    /**
     * Export canvas as MP4 video
     */
    async exportMP4(canvasInput, options = {}) {
        const exportId = this.generateExportId('mp4')
        const startTime = performance.now()

        try {
            this.startExport(exportId, 'mp4', options)

            const canvas = await this.resolveCanvasWithValidation(canvasInput)

            // Check if video recording is supported
            if (!this.isVideoRecordingSupported()) {
                throw new Error('Video recording not supported in this browser')
            }

            const videoOptions = {
                duration: options.duration || 4000,
                videoBitsPerSecond: options.quality ? options.quality * 25000 : 2500000,
                onProgress: options.onProgress
            }

            // Record video
            const blob = await this.recordCanvasVideo(canvas, videoOptions)

            const result = {
                blob,
                format: blob.type.includes('mp4') ? 'mp4' : 'webm',
                size: blob.size,
                exportId,
                duration: performance.now() - startTime
            }

            this.completeExport(exportId, result)
            return result

        } catch (error) {
            this.failExport(exportId, error)

            // Fallback to PNG if video fails
            logger.warn('MP4 export failed, falling back to PNG:', error)
            try {
                const pngResult = await this.exportPNG(canvasInput, { quality: 1.0 })
                return {
                    ...pngResult,
                    format: 'png',
                    fallback: true,
                    originalError: error.message
                }
            } catch (fallbackError) {
                throw new Error(`MP4 export failed and PNG fallback also failed: ${error.message}`)
            }
        }
    }

    /**
     * Resolve canvas with comprehensive validation
     */
    async resolveCanvasWithValidation(canvasInput) {
        // Strategy 1: Direct canvas element
        if (canvasInput instanceof HTMLCanvasElement) {
            this.validateCanvas(canvasInput)
            return canvasInput
        }

        // Strategy 2: OffscreenCanvas
        if (typeof OffscreenCanvas !== 'undefined' && canvasInput instanceof OffscreenCanvas) {
            this.validateCanvas(canvasInput)
            return canvasInput
        }

        // Strategy 3: React ref
        if (canvasInput && typeof canvasInput === 'object' && canvasInput.current) {
            return this.resolveCanvasWithValidation(canvasInput.current)
        }

        // Strategy 4: Component with canvas property
        if (canvasInput && typeof canvasInput === 'object' && canvasInput.canvas) {
            return this.resolveCanvasWithValidation(canvasInput.canvas)
        }

        // Strategy 5: Component with canvasElement property
        if (canvasInput && typeof canvasInput === 'object' && canvasInput.canvasElement) {
            return this.resolveCanvasWithValidation(canvasInput.canvasElement)
        }

        // Strategy 6: Component with validation method
        if (canvasInput && typeof canvasInput.isValidCanvas === 'function') {
            if (canvasInput.isValidCanvas()) {
                const canvas = canvasInput.canvas || canvasInput.canvasElement
                if (canvas) {
                    return this.resolveCanvasWithValidation(canvas)
                }
            }
        }

        // Strategy 7: Three.js renderer
        if (canvasInput && canvasInput.domElement) {
            return this.resolveCanvasWithValidation(canvasInput.domElement)
        }

        // Strategy 8: Canvas context
        if (canvasInput && canvasInput.canvas) {
            return this.resolveCanvasWithValidation(canvasInput.canvas)
        }

        throw new Error(`Unable to resolve canvas from input: ${typeof canvasInput}`)
    }

    /**
     * Validate canvas element
     */
    validateCanvas(canvas) {
        if (!canvas) {
            throw new Error('Canvas is null or undefined')
        }

        if (!(canvas instanceof HTMLCanvasElement) &&
            !(typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas)) {
            throw new Error(`Invalid canvas type: ${canvas.constructor?.name}`)
        }

        if (canvas.width <= 0 || canvas.height <= 0) {
            throw new Error(`Invalid canvas dimensions: ${canvas.width}x${canvas.height}`)
        }

        // Test if canvas can be exported
        try {
            if (typeof canvas.toDataURL === 'function') {
                canvas.toDataURL('image/png', 0.1) // Test with low quality
            } else if (typeof canvas.convertToBlob === 'function') {
                // OffscreenCanvas - we can't test synchronously
            } else {
                throw new Error('Canvas does not support export methods')
            }
        } catch (error) {
            if (error.name === 'SecurityError') {
                throw new Error('Canvas is tainted and cannot be exported')
            }
            throw error
        }
    }

    /**
     * Extract image data with multiple fallback strategies
     */
    async extractImageDataWithFallbacks(canvas, options) {
        const strategies = [
            () => this.extractViaToDataURL(canvas, options),
            () => this.extractViaConvertToBlob(canvas, options),
            () => this.extractViaCopyCanvas(canvas, options),
            () => this.extractViaContext(canvas, options)
        ]

        let lastError = null

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
                lastError = error
            }
        }

        throw new Error(`All image extraction strategies failed. Last error: ${lastError?.message}`)
    }

    /**
     * Extract via toDataURL
     */
    async extractViaToDataURL(canvas, options) {
        if (typeof canvas.toDataURL !== 'function') {
            throw new Error('Canvas does not support toDataURL')
        }

        const { format = 'png', quality = 1.0 } = options
        const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png'

        return canvas.toDataURL(mimeType, quality)
    }

    /**
     * Extract via convertToBlob (OffscreenCanvas)
     */
    async extractViaConvertToBlob(canvas, options) {
        if (typeof canvas.convertToBlob !== 'function') {
            throw new Error('Canvas does not support convertToBlob')
        }

        const { format = 'png', quality = 1.0 } = options
        const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png'

        const blob = await canvas.convertToBlob({ type: mimeType, quality })
        return this.blobToDataURL(blob)
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

        return this.extractViaToDataURL(tempCanvas, options)
    }

    /**
     * Extract via context getImageData
     */
    async extractViaContext(canvas, options) {
        const ctx = canvas.getContext('2d')
        if (!ctx) {
            throw new Error('Cannot get 2D context')
        }

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

        // Create temporary canvas to convert ImageData to data URL
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = canvas.width
        tempCanvas.height = canvas.height

        const tempCtx = tempCanvas.getContext('2d')
        tempCtx.putImageData(imageData, 0, 0)

        return this.extractViaToDataURL(tempCanvas, options)
    }

    /**
     * Record canvas as video
     */
    async recordCanvasVideo(canvas, options) {
        const { duration, videoBitsPerSecond, onProgress } = options

        // Get media stream from canvas
        const stream = canvas.captureStream(30) // 30 FPS

        // Set up MediaRecorder
        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond
        })

        const chunks = []

        return new Promise((resolve, reject) => {
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data)
                }
            }

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' })
                resolve(blob)
            }

            mediaRecorder.onerror = reject

            // Start recording
            mediaRecorder.start()

            // Progress tracking
            if (onProgress) {
                const progressInterval = setInterval(() => {
                    const elapsed = Date.now() - startTime
                    const progress = Math.min((elapsed / duration) * 100, 100)
                    onProgress(progress)
                }, 100)

                setTimeout(() => {
                    clearInterval(progressInterval)
                }, duration)
            }

            // Stop recording after duration
            const startTime = Date.now()
            setTimeout(() => {
                mediaRecorder.stop()
                stream.getTracks().forEach(track => track.stop())
            }, duration)
        })
    }

    /**
     * Check if video recording is supported
     */
    isVideoRecordingSupported() {
        return !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream)
    }

    /**
     * Convert data URL to blob
     */
    async dataURLToBlob(dataURL) {
        const response = await fetch(dataURL)
        return response.blob()
    }

    /**
     * Convert blob to data URL
     */
    async blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(blob)
        })
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
            status: 'started'
        }

        this.activeExports.set(exportId, exportInfo)
        logger.info(`Export started: ${exportId} (${format})`)
    }

    completeExport(exportId, result) {
        const exportInfo = this.activeExports.get(exportId)
        if (exportInfo) {
            exportInfo.status = 'completed'
            exportInfo.endTime = Date.now()
            exportInfo.duration = exportInfo.endTime - exportInfo.startTime
            exportInfo.result = result

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

            this.addToHistory(exportInfo)
            this.activeExports.delete(exportId)

            logger.error(`Export failed: ${exportId} (${exportInfo.duration}ms) - ${error.message}`)
        }
    }

    addToHistory(exportInfo) {
        this.exportHistory.unshift(exportInfo)

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
const canvasExportSystem = new CanvasExportSystem()

// Export utility functions
export const exportPNG = (canvas, options) => canvasExportSystem.exportPNG(canvas, options)
export const exportJPG = (canvas, options) => canvasExportSystem.exportJPG(canvas, options)
export const exportGIF = (canvas, options) => canvasExportSystem.exportGIF(canvas, options)
export const exportMP4 = (canvas, options) => canvasExportSystem.exportMP4(canvas, options)

export { canvasExportSystem }
export default canvasExportSystem