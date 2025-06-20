/**
 * GIF Encoder with Comprehensive Canvas Support
 *
 * This module provides robust GIF encoding with multiple fallback strategies
 * and comprehensive canvas type support.
 */

import logger from './logger.js'

export class GIFEncoder {
    constructor(options = {}) {
        this.options = {
            quality: 10,
            maxColors: 256,
            transparencyThreshold: 128,
            frameRate: 30,
            ...options
        }

        this.frames = []
        this.delays = []
        this.width = 0
        this.height = 0
    }

    /**
     * Add frame from canvas with comprehensive support
     */
    async addFrameFromCanvas(canvas, options = {}) {
        const { delay = 100 } = options

        try {
            // Resolve canvas reference
            const resolvedCanvas = this.resolveCanvas(canvas)
            if (!resolvedCanvas) {
                throw new Error('Invalid canvas reference')
            }

            // Extract image data
            const imageData = await this.extractImageData(resolvedCanvas)

            if (this.frames.length === 0) {
                this.width = imageData.width
                this.height = imageData.height
            }

            // Validate dimensions
            if (imageData.width !== this.width || imageData.height !== this.height) {
                throw new Error(`Frame dimensions mismatch: expected ${this.width}x${this.height}, got ${imageData.width}x${imageData.height}`)
            }

            // Process and add frame
            const processedFrame = this.processFrame(imageData)
            this.frames.push(processedFrame)
            this.delays.push(delay)

            logger.debug(`Added GIF frame ${this.frames.length}: ${this.width}x${this.height}`)

        } catch (error) {
            logger.error('Failed to add frame from canvas:', error)
            throw error
        }
    }

    /**
     * Resolve canvas reference with multiple strategies
     */
    resolveCanvas(canvasInput) {
        if (!canvasInput) return null

        // Direct canvas element
        if (canvasInput instanceof HTMLCanvasElement) {
            return canvasInput
        }

        // OffscreenCanvas
        if (typeof OffscreenCanvas !== 'undefined' && canvasInput instanceof OffscreenCanvas) {
            return canvasInput
        }

        // React ref
        if (canvasInput.current) {
            return this.resolveCanvas(canvasInput.current)
        }

        // Component with canvas property
        if (canvasInput.canvas) {
            return this.resolveCanvas(canvasInput.canvas)
        }

        // Component with canvasElement property
        if (canvasInput.canvasElement) {
            return this.resolveCanvas(canvasInput.canvasElement)
        }

        return null
    }

    /**
     * Extract image data with fallback strategies
     */
    async extractImageData(canvas) {
        const strategies = [
            () => this.extractViaContext(canvas),
            () => this.extractViaDataURL(canvas),
            () => this.extractViaCopy(canvas)
        ]

        for (const strategy of strategies) {
            try {
                const result = await strategy()
                if (result) return result
            } catch (error) {
                logger.warn('Image data extraction strategy failed:', error)
            }
        }

        throw new Error('All image data extraction strategies failed')
    }

    /**
     * Extract via 2D context
     */
    extractViaContext(canvas) {
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Cannot get 2D context')

        return ctx.getImageData(0, 0, canvas.width, canvas.height)
    }

    /**
     * Extract via data URL conversion
     */
    async extractViaDataURL(canvas) {
        if (typeof canvas.toDataURL !== 'function') {
            throw new Error('Canvas does not support toDataURL')
        }

        const dataURL = canvas.toDataURL('image/png')
        return this.loadImageDataFromDataURL(dataURL, canvas.width, canvas.height)
    }

    /**
     * Extract via canvas copy
     */
    extractViaCopy(canvas) {
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = canvas.width
        tempCanvas.height = canvas.height

        const tempCtx = tempCanvas.getContext('2d')
        tempCtx.drawImage(canvas, 0, 0)

        return tempCtx.getImageData(0, 0, canvas.width, canvas.height)
    }

    /**
     * Load image data from data URL
     */
    async loadImageDataFromDataURL(dataURL, width, height) {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => {
                const tempCanvas = document.createElement('canvas')
                tempCanvas.width = width
                tempCanvas.height = height

                const ctx = tempCanvas.getContext('2d')
                ctx.drawImage(img, 0, 0)

                resolve(ctx.getImageData(0, 0, width, height))
            }
            img.onerror = reject
            img.src = dataURL
        })
    }

    /**
     * Process frame with color quantization
     */
    processFrame(imageData) {
        const data = new Uint8Array(imageData.data)
        return this.quantizeColors(data)
    }

    /**
     * Simple color quantization
     */
    quantizeColors(pixelData) {
        const indexedData = new Uint8Array(this.width * this.height)

        for (let i = 0; i < pixelData.length; i += 4) {
            const r = pixelData[i]
            const g = pixelData[i + 1]
            const b = pixelData[i + 2]
            const a = pixelData[i + 3]

            if (a < this.options.transparencyThreshold) {
                indexedData[i / 4] = 0 // Transparent
            } else {
                // Simple 6-6-6 color cube quantization
                const rIndex = Math.floor(r / 51)
                const gIndex = Math.floor(g / 51)
                const bIndex = Math.floor(b / 51)
                indexedData[i / 4] = rIndex * 36 + gIndex * 6 + bIndex + 1
            }
        }

        return indexedData
    }

    /**
     * Generate GIF binary data
     */
    generateGIF() {
        if (this.frames.length === 0) {
            throw new Error('No frames to encode')
        }

        try {
            // Create GIF header
            const gifData = []

            // GIF signature and version
            gifData.push(...this.stringToBytes('GIF89a'))

            // Logical screen descriptor
            gifData.push(...this.uint16ToBytes(this.width))
            gifData.push(...this.uint16ToBytes(this.height))

            // Global color table info
            gifData.push(0xF7) // Global color table flag, color resolution, sort flag, global color table size
            gifData.push(0x00) // Background color index
            gifData.push(0x00) // Pixel aspect ratio

            // Global color table (216 web-safe colors)
            gifData.push(...this.generateWebSafeColorTable())

            // Application extension for looping
            gifData.push(0x21, 0xFF, 0x0B) // Extension introducer, application extension label, block size
            gifData.push(...this.stringToBytes('NETSCAPE2.0'))
            gifData.push(0x03, 0x01) // Sub-block size, loop indicator
            gifData.push(0x00, 0x00) // Loop count (0 = infinite)
            gifData.push(0x00) // Block terminator

            // Add frames
            for (let i = 0; i < this.frames.length; i++) {
                gifData.push(...this.encodeFrame(this.frames[i], this.delays[i]))
            }

            // GIF trailer
            gifData.push(0x3B)

            return new Uint8Array(gifData)

        } catch (error) {
            logger.error('GIF generation failed:', error)
            throw error
        }
    }

    /**
     * Encode single frame
     */
    encodeFrame(frameData, delay) {
        const frameBytes = []

        // Graphic control extension
        frameBytes.push(0x21, 0xF9, 0x04) // Extension introducer, graphic control label, block size
        frameBytes.push(0x04) // Disposal method, user input flag, transparent color flag
        frameBytes.push(...this.uint16ToBytes(Math.floor(delay / 10))) // Delay time in centiseconds
        frameBytes.push(0x00) // Transparent color index
        frameBytes.push(0x00) // Block terminator

        // Image descriptor
        frameBytes.push(0x2C) // Image separator
        frameBytes.push(...this.uint16ToBytes(0)) // Left position
        frameBytes.push(...this.uint16ToBytes(0)) // Top position
        frameBytes.push(...this.uint16ToBytes(this.width)) // Width
        frameBytes.push(...this.uint16ToBytes(this.height)) // Height
        frameBytes.push(0x00) // Local color table flag, interlace flag, sort flag, local color table size

        // LZW compressed image data
        frameBytes.push(0x08) // LZW minimum code size
        frameBytes.push(...this.lzwCompress(frameData))
        frameBytes.push(0x00) // Block terminator

        return frameBytes
    }

    /**
     * Simple LZW compression
     */
    lzwCompress(data) {
        // Simplified LZW compression for demonstration
        // In a real implementation, this would be much more complex
        const compressed = []
        const chunkSize = 255

        for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize)
            compressed.push(chunk.length)
            compressed.push(...chunk)
        }

        return compressed
    }

    /**
     * Generate web-safe color table
     */
    generateWebSafeColorTable() {
        const colors = []

        // Add transparent color
        colors.push(0, 0, 0)

        // Generate 6x6x6 color cube
        for (let r = 0; r < 6; r++) {
            for (let g = 0; g < 6; g++) {
                for (let b = 0; b < 6; b++) {
                    colors.push(r * 51, g * 51, b * 51)
                }
            }
        }

        // Pad to 256 colors
        while (colors.length < 768) {
            colors.push(0, 0, 0)
        }

        return colors
    }

    /**
     * Utility functions
     */
    stringToBytes(str) {
        return Array.from(str).map(char => char.charCodeAt(0))
    }

    uint16ToBytes(value) {
        return [value & 0xFF, (value >> 8) & 0xFF]
    }

    /**
     * Export as blob
     */
    async exportAsBlob() {
        const gifData = this.generateGIF()
        return new Blob([gifData], { type: 'image/gif' })
    }
}

export default GIFEncoder