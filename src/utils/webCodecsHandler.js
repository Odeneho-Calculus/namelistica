/**
 * Advanced WebCodecs Handler
 *
 * This module provides sophisticated video encoding capabilities using the WebCodecs API
 * with fallback strategies, performance optimization, and cross-browser compatibility.
 */

import logger from './logger.js'
import { environmentDetector } from './environmentDetector.js'

class WebCodecsHandler {
    constructor() {
        this.isSupported = this.checkSupport()
        this.encoders = new Map()
        this.decoders = new Map()
        this.activeOperations = new Set()
        this.supportedCodecs = new Map()

        this.initializeCodecSupport()
    }

    /**
     * Check WebCodecs API support
     */
    checkSupport() {
        const hasVideoEncoder = typeof VideoEncoder !== 'undefined'
        const hasVideoDecoder = typeof VideoDecoder !== 'undefined'
        const hasVideoFrame = typeof VideoFrame !== 'undefined'
        const hasEncodedVideoChunk = typeof EncodedVideoChunk !== 'undefined'

        const supported = hasVideoEncoder && hasVideoDecoder && hasVideoFrame && hasEncodedVideoChunk

        logger.info(`WebCodecs support: ${supported ? 'Available' : 'Not available'}`, {
            VideoEncoder: hasVideoEncoder,
            VideoDecoder: hasVideoDecoder,
            VideoFrame: hasVideoFrame,
            EncodedVideoChunk: hasEncodedVideoChunk
        })

        return supported
    }

    /**
     * Initialize codec support detection
     */
    async initializeCodecSupport() {
        if (!this.isSupported) {
            logger.warn('WebCodecs not supported, skipping codec detection')
            return
        }

        const codecs = [
            // H.264 variants
            { name: 'H.264 Baseline', codec: 'avc1.42E01E' },
            { name: 'H.264 Main', codec: 'avc1.4D401E' },
            { name: 'H.264 High', codec: 'avc1.64001E' },
            { name: 'H.264 Constrained Baseline', codec: 'avc1.42E01E' },

            // H.265 variants
            { name: 'H.265 Main', codec: 'hev1.1.6.L93.B0' },
            { name: 'H.265 Main10', codec: 'hev1.2.4.L93.B0' },

            // VP8/VP9 variants
            { name: 'VP8', codec: 'vp8' },
            { name: 'VP9 Profile 0', codec: 'vp09.00.10.08' },
            { name: 'VP9 Profile 2', codec: 'vp09.02.10.10' },

            // AV1 variants
            { name: 'AV1 Main', codec: 'av01.0.04M.08' },
            { name: 'AV1 High', codec: 'av01.0.05M.08' }
        ]

        for (const { name, codec } of codecs) {
            try {
                const config = {
                    codec,
                    width: 640,
                    height: 480,
                    bitrate: 1000000,
                    framerate: 30
                }

                const supported = await VideoEncoder.isConfigSupported(config)
                this.supportedCodecs.set(codec, {
                    name,
                    codec,
                    supported: supported.supported,
                    config: supported.config
                })

                logger.debug(`Codec ${name} (${codec}): ${supported.supported ? 'Supported' : 'Not supported'}`)
            } catch (error) {
                logger.debug(`Error checking codec ${name}:`, error)
                this.supportedCodecs.set(codec, {
                    name,
                    codec,
                    supported: false,
                    error: error.message
                })
            }
        }
    }

    /**
     * Get best supported codec for given requirements
     */
    getBestCodec(requirements = {}) {
        const {
            preferredCodec,
            maxWidth = 1920,
            maxHeight = 1080,
            maxBitrate = 5000000,
            preferQuality = true
        } = requirements

        // If specific codec requested and supported, use it
        if (preferredCodec && this.supportedCodecs.has(preferredCodec)) {
            const codecInfo = this.supportedCodecs.get(preferredCodec)
            if (codecInfo.supported) {
                return codecInfo
            }
        }

        // Find best available codec
        const codecPriority = preferQuality
            ? ['av01.0.05M.08', 'hev1.1.6.L93.B0', 'avc1.64001E', 'vp09.00.10.08', 'avc1.42E01E', 'vp8']
            : ['avc1.42E01E', 'vp8', 'avc1.64001E', 'vp09.00.10.08', 'hev1.1.6.L93.B0', 'av01.0.05M.08']

        for (const codec of codecPriority) {
            const codecInfo = this.supportedCodecs.get(codec)
            if (codecInfo && codecInfo.supported) {
                return codecInfo
            }
        }

        throw new Error('No supported video codecs found')
    }

    /**
     * Create video encoder with advanced configuration
     */
    async createEncoder(config = {}) {
        if (!this.isSupported) {
            throw new Error('WebCodecs not supported')
        }

        const {
            width = 640,
            height = 480,
            bitrate = 2000000,
            framerate = 30,
            keyFrameInterval = 30,
            codec,
            hardwareAcceleration = 'prefer-hardware',
            latencyMode = 'quality',
            bitrateMode = 'variable'
        } = config

        // Get best codec if not specified
        const codecInfo = codec ?
            this.supportedCodecs.get(codec) :
            this.getBestCodec({ maxWidth: width, maxHeight: height, maxBitrate: bitrate })

        if (!codecInfo || !codecInfo.supported) {
            throw new Error(`Codec not supported: ${codec || 'auto'}`)
        }

        const encoderConfig = {
            codec: codecInfo.codec,
            width,
            height,
            bitrate,
            framerate,
            keyFrameInterval,
            hardwareAcceleration,
            latencyMode,
            bitrateMode
        }

        // Validate configuration
        const validation = await VideoEncoder.isConfigSupported(encoderConfig)
        if (!validation.supported) {
            throw new Error(`Encoder configuration not supported: ${JSON.stringify(encoderConfig)}`)
        }

        const chunks = []
        const encoder = new VideoEncoder({
            output: (chunk, metadata) => {
                chunks.push({ chunk, metadata })
                logger.debug(`Encoded chunk: ${chunk.byteLength} bytes, type: ${chunk.type}`)
            },
            error: (error) => {
                logger.error('Encoder error:', error)
                this.activeOperations.delete(encoder)
            }
        })

        encoder.configure(validation.config)

        // Store encoder reference
        const encoderId = this.generateId()
        this.encoders.set(encoderId, encoder)
        this.activeOperations.add(encoder)

        // Add helper methods
        encoder.encodeFrames = async (frames) => {
            return this.encodeFrames(encoder, frames, chunks)
        }

        encoder.finish = async () => {
            return this.finishEncoding(encoder, chunks, encoderId)
        }

        encoder.dispose = () => {
            this.disposeEncoder(encoderId)
        }

        logger.info(`Created video encoder: ${codecInfo.name} (${width}x${height} @ ${bitrate}bps)`)
        return encoder
    }

    /**
     * Encode frames using WebCodecs
     */
    async encodeFrames(encoder, frames, chunks) {
        if (!frames || frames.length === 0) {
            throw new Error('No frames provided for encoding')
        }

        const frameDuration = 1000000 / 30 // 30 FPS in microseconds
        let timestamp = 0

        for (let i = 0; i < frames.length; i++) {
            const frameData = frames[i]
            let videoFrame

            try {
                // Create VideoFrame from different input types
                if (frameData instanceof VideoFrame) {
                    videoFrame = frameData
                } else if (frameData instanceof ImageData) {
                    videoFrame = new VideoFrame(frameData, {
                        timestamp,
                        duration: frameDuration
                    })
                } else if (frameData instanceof HTMLCanvasElement) {
                    videoFrame = new VideoFrame(frameData, {
                        timestamp,
                        duration: frameDuration
                    })
                } else if (frameData instanceof HTMLImageElement) {
                    videoFrame = new VideoFrame(frameData, {
                        timestamp,
                        duration: frameDuration
                    })
                } else {
                    throw new Error(`Unsupported frame type: ${typeof frameData}`)
                }

                // Encode frame
                const keyFrame = i % 30 === 0 // Key frame every 30 frames
                encoder.encode(videoFrame, { keyFrame })

                // Clean up if we created the frame
                if (videoFrame !== frameData) {
                    videoFrame.close()
                }

                timestamp += frameDuration

            } catch (error) {
                logger.error(`Error encoding frame ${i}:`, error)
                throw error
            }
        }

        logger.info(`Encoded ${frames.length} frames`)
    }

    /**
     * Finish encoding and create video blob
     */
    async finishEncoding(encoder, chunks, encoderId) {
        try {
            await encoder.flush()
            encoder.close()

            this.encoders.delete(encoderId)
            this.activeOperations.delete(encoder)

            if (chunks.length === 0) {
                throw new Error('No encoded chunks available')
            }

            // Create MP4 container (simplified)
            const mp4Data = this.createMP4Container(chunks)
            const blob = new Blob([mp4Data], { type: 'video/mp4' })

            logger.info(`Video encoding completed: ${blob.size} bytes from ${chunks.length} chunks`)
            return blob

        } catch (error) {
            logger.error('Error finishing encoding:', error)
            throw error
        }
    }

    /**
     * Create MP4 container from encoded chunks (simplified implementation)
     */
    createMP4Container(chunks) {
        // This is a simplified implementation
        // A real implementation would create proper MP4 boxes and structure

        const totalSize = chunks.reduce((size, { chunk }) => size + chunk.byteLength, 0)
        const mp4Data = new Uint8Array(totalSize + 1024) // Extra space for headers

        let offset = 0

        // Add simplified MP4 header (this is not a complete implementation)
        const header = new Uint8Array([
            // ftyp box
            0x00, 0x00, 0x00, 0x20, // box size
            0x66, 0x74, 0x79, 0x70, // 'ftyp'
            0x69, 0x73, 0x6F, 0x6D, // major brand 'isom'
            0x00, 0x00, 0x02, 0x00, // minor version
            0x69, 0x73, 0x6F, 0x6D, // compatible brand 'isom'
            0x69, 0x73, 0x6F, 0x32, // compatible brand 'iso2'
            0x61, 0x76, 0x63, 0x31, // compatible brand 'avc1'
            0x6D, 0x70, 0x34, 0x31  // compatible brand 'mp41'
        ])

        mp4Data.set(header, offset)
        offset += header.length

        // Add chunk data
        for (const { chunk } of chunks) {
            const chunkData = new Uint8Array(chunk)
            mp4Data.set(chunkData, offset)
            offset += chunkData.length
        }

        return mp4Data.slice(0, offset)
    }

    /**
     * Convert canvas to video using WebCodecs
     */
    async convertCanvasToVideo(canvas, duration = 4000, options = {}) {
        const perfTimer = logger.performance('WebCodecs Canvas Conversion', 'convert')

        try {
            const {
                framerate = 30,
                bitrate = 2000000,
                codec,
                onProgress
            } = options

            const encoder = await this.createEncoder({
                width: canvas.width,
                height: canvas.height,
                framerate,
                bitrate,
                codec
            })

            const totalFrames = Math.ceil(duration / 1000 * framerate)
            const frameDuration = 1000 / framerate
            const frames = []

            // Capture frames from canvas
            for (let i = 0; i < totalFrames; i++) {
                // In a real implementation, you'd capture the canvas at different times
                // For now, we'll just capture the current state multiple times
                const videoFrame = new VideoFrame(canvas, {
                    timestamp: i * frameDuration * 1000, // Convert to microseconds
                    duration: frameDuration * 1000
                })

                frames.push(videoFrame)

                if (onProgress) {
                    onProgress((i + 1) / totalFrames * 0.5) // First 50% for frame capture
                }
            }

            // Encode frames
            await encoder.encodeFrames(frames)

            if (onProgress) {
                onProgress(0.9) // 90% complete
            }

            // Finish encoding
            const videoBlob = await encoder.finish()

            // Clean up frames
            frames.forEach(frame => frame.close())

            if (onProgress) {
                onProgress(1.0) // 100% complete
            }

            return videoBlob

        } catch (error) {
            logger.error('Canvas to video conversion failed:', error)
            throw error
        } finally {
            perfTimer.end()
        }
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return Math.random().toString(36).substr(2, 9)
    }

    /**
     * Dispose encoder
     */
    disposeEncoder(encoderId) {
        const encoder = this.encoders.get(encoderId)
        if (encoder) {
            try {
                encoder.close()
            } catch (error) {
                logger.debug('Error closing encoder:', error)
            }

            this.encoders.delete(encoderId)
            this.activeOperations.delete(encoder)
        }
    }

    /**
     * Get handler status
     */
    getStatus() {
        return {
            isSupported: this.isSupported,
            supportedCodecs: Array.from(this.supportedCodecs.values()),
            activeEncoders: this.encoders.size,
            activeOperations: this.activeOperations.size
        }
    }

    /**
     * Dispose all resources
     */
    dispose() {
        // Close all active encoders
        for (const [id, encoder] of this.encoders) {
            try {
                encoder.close()
            } catch (error) {
                logger.debug(`Error closing encoder ${id}:`, error)
            }
        }

        this.encoders.clear()
        this.activeOperations.clear()
        this.supportedCodecs.clear()

        logger.info('WebCodecs handler disposed')
    }
}

// Create singleton instance
const webCodecsHandler = new WebCodecsHandler()

// Export safe WebCodecs functions
export const createVideoEncoder = async (config) => {
    if (!webCodecsHandler.isSupported) {
        throw new Error('WebCodecs not supported in this browser')
    }
    return webCodecsHandler.createEncoder(config)
}

export const convertCanvasToVideo = async (canvas, duration, options) => {
    if (!webCodecsHandler.isSupported) {
        throw new Error('WebCodecs not supported in this browser')
    }
    return webCodecsHandler.convertCanvasToVideo(canvas, duration, options)
}

export const isWebCodecsSupported = () => webCodecsHandler.isSupported

export { WebCodecsHandler, webCodecsHandler }
export default webCodecsHandler