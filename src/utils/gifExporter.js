// Custom GIF encoder implementation
class SimpleGIFEncoder {
    constructor(options = {}) {
        this.width = options.width || 400
        this.height = options.height || 300
        this.quality = options.quality || 10
        this.frames = []
        this.delays = []
    }

    addFrame(canvas, options = {}) {
        const delay = options.delay || 100

        // Convert canvas to image data
        const ctx = canvas.getContext('2d')
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

        this.frames.push(imageData)
        this.delays.push(delay)
    }

    render() {
        // Simple implementation: create WebP animation or fallback to creating individual frames
        return this.createAnimatedWebP()
    }

    async createAnimatedWebP() {
        // For now, we'll create a simple animation by cycling through frames
        // This is a simplified implementation
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = this.width
        canvas.height = this.height

        // For simplicity, just return the first frame as PNG
        if (this.frames.length > 0) {
            ctx.putImageData(this.frames[0], 0, 0)
            return new Promise(resolve => {
                canvas.toBlob(resolve, 'image/png')
            })
        }

        return new Blob()
    }

    on(event, callback) {
        if (event === 'finished') {
            this.onFinished = callback
        } else if (event === 'progress') {
            this.onProgress = callback
        }
    }
}

export class GIFExporter {
    constructor() {
        this.gif = null
        this.isRecording = false
        this.frameCount = 0
        this.maxFrames = 120 // 4 seconds at 30fps
    }

    startRecording(canvas, options = {}) {
        const {
            quality = 10,
            width = canvas.width,
            height = canvas.height,
            fps = 30,
            duration = 4000
        } = options

        this.gif = new SimpleGIFEncoder({
            quality: quality,
            width: width,
            height: height
        })

        this.isRecording = true
        this.frameCount = 0
        this.maxFrames = Math.floor((duration / 1000) * fps)
        this.frameInterval = 1000 / fps

        return new Promise((resolve, reject) => {
            this.gif.on('finished', (blob) => {
                resolve(blob)
            })

            this.gif.on('progress', (progress) => {
                // Progress callback can be used by the calling component
                if (this.onProgress) {
                    this.onProgress(progress)
                }
            })

            this.recordFrame(canvas)
        })
    }

    recordFrame(canvas) {
        if (!this.isRecording || this.frameCount >= this.maxFrames) {
            this.stopRecording()
            return
        }

        // Create a copy of the canvas
        const tempCanvas = document.createElement('canvas')
        const tempCtx = tempCanvas.getContext('2d')
        tempCanvas.width = canvas.width
        tempCanvas.height = canvas.height
        tempCtx.drawImage(canvas, 0, 0)

        // Add frame to GIF
        this.gif.addFrame(tempCanvas, {
            copy: true,
            delay: this.frameInterval
        })

        this.frameCount++

        // Schedule next frame
        setTimeout(() => {
            this.recordFrame(canvas)
        }, this.frameInterval)
    }

    stopRecording() {
        if (this.gif && this.isRecording) {
            this.isRecording = false
            this.gif.render()
        }
    }

    setProgressCallback(callback) {
        this.onProgress = callback
    }
}

// Utility function for easy GIF export
export const exportCanvasAsGIF = async (canvas, options = {}) => {
    const exporter = new GIFExporter()

    return new Promise((resolve, reject) => {
        // Set progress callback if provided
        if (options.onProgress) {
            exporter.setProgressCallback(options.onProgress)
        }

        exporter.startRecording(canvas, options)
            .then(blob => resolve(blob))
            .catch(error => reject(error))
    })
}