/**
 * Simplified Canvas Export System - PNG Only
 *
 * This system provides robust PNG export functionality with comprehensive
 * error handling and support for various canvas types.
 */

import logger from './logger.js'

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

        const { quality = 1.0 } = options
        return canvas.toDataURL('image/png', quality)
    }

    /**
     * Extract via convertToBlob (OffscreenCanvas)
     */
    async extractViaConvertToBlob(canvas, options) {
        if (typeof canvas.convertToBlob !== 'function') {
            throw new Error('Canvas does not support convertToBlob')
        }

        const { quality = 1.0 } = options
        const blob = await canvas.convertToBlob({ type: 'image/png', quality })
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
     * Convert data URL to blob
     */
    async dataURLToBlob(dataURL) {
        return new Promise((resolve, reject) => {
            try {
                const arr = dataURL.split(',')
                const mime = arr[0].match(/:(.*?);/)[1]
                const bstr = atob(arr[1])
                let n = bstr.length
                const u8arr = new Uint8Array(n)

                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n)
                }

                resolve(new Blob([u8arr], { type: mime }))
            } catch (error) {
                reject(error)
            }
        })
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
     * Generate unique export ID
     */
    generateExportId(format) {
        return `${format}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * Start export tracking
     */
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

    /**
     * Complete export tracking
     */
    completeExport(exportId, result) {
        const exportInfo = this.activeExports.get(exportId)
        if (exportInfo) {
            exportInfo.status = 'completed'
            exportInfo.endTime = Date.now()
            exportInfo.result = result

            this.exportHistory.push(exportInfo)
            this.activeExports.delete(exportId)

            // Maintain history size
            if (this.exportHistory.length > this.maxHistorySize) {
                this.exportHistory.shift()
            }

            logger.info(`Export completed: ${exportId}`)
        }
    }

    /**
     * Fail export tracking
     */
    failExport(exportId, error) {
        const exportInfo = this.activeExports.get(exportId)
        if (exportInfo) {
            exportInfo.status = 'failed'
            exportInfo.endTime = Date.now()
            exportInfo.error = error

            this.exportHistory.push(exportInfo)
            this.activeExports.delete(exportId)

            logger.error(`Export failed: ${exportId}`, error)
        }
    }

    /**
     * Get export statistics
     */
    getExportStats() {
        return {
            activeExports: this.activeExports.size,
            totalExports: this.exportHistory.length,
            successfulExports: this.exportHistory.filter(e => e.status === 'completed').length,
            failedExports: this.exportHistory.filter(e => e.status === 'failed').length
        }
    }
}

// Create singleton instance
export const canvasExportSystem = new CanvasExportSystem()
export default canvasExportSystem