// Real GIF export implementation using canvas frame capture
export class RealGIFExporter {
  constructor() {
    this.frames = []
    this.isRecording = false
    this.frameCount = 0
    this.maxFrames = 120
    this.frameInterval = 1000 / 30 // 30 FPS
  }

  async startRecording(canvas, options = {}) {
    const {
      quality = 10,
      width = canvas.width,
      height = canvas.height,
      fps = 30,
      duration = 4000
    } = options

    this.isRecording = true
    this.frameCount = 0
    this.maxFrames = Math.floor((duration / 1000) * fps)
    this.frameInterval = 1000 / fps
    this.frames = []

    // Start capturing frames
    return new Promise((resolve, reject) => {
      this.captureFrames(canvas, resolve, reject)
    })
  }

  captureFrames(canvas, resolve, reject) {
    if (!this.isRecording || this.frameCount >= this.maxFrames) {
      this.createGIF(resolve, reject)
      return
    }

    // Capture current frame
    const frameData = canvas.toDataURL('image/png')
    this.frames.push(frameData)
    this.frameCount++

    // Update progress
    if (this.onProgress) {
      this.onProgress(this.frameCount / this.maxFrames)
    }

    // Schedule next frame
    setTimeout(() => {
      this.captureFrames(canvas, resolve, reject)
    }, this.frameInterval)
  }

  async createGIF(resolve, reject) {
    try {
      // Create animated WebP or fallback to PNG sequence
      const blob = await this.createAnimatedImage()
      resolve(blob)
    } catch (error) {
      reject(error)
    }
  }

  async createAnimatedImage() {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    // Set canvas size based on first frame
    const firstImg = new Image()
    await new Promise(resolve => {
      firstImg.onload = resolve
      firstImg.src = this.frames[0]
    })

    canvas.width = firstImg.width
    canvas.height = firstImg.height

    return this.createRealGIF(canvas, ctx)
  }

  async createAnimatedPNG(canvas, ctx) {
    // Create a composite image showing the animation sequence
    const frameWidth = canvas.width / 4 // Show 4 frames per row
    const frameHeight = canvas.height / Math.ceil(this.frames.length / 4)

    canvas.width = frameWidth * 4
    canvas.height = frameHeight * Math.ceil(this.frames.length / 4)

    for (let i = 0; i < Math.min(this.frames.length, 16); i++) {
      const img = new Image()
      await new Promise(resolve => {
        img.onload = resolve
        img.src = this.frames[i]
      })

      const x = (i % 4) * frameWidth
      const y = Math.floor(i / 4) * frameHeight

      ctx.drawImage(img, x, y, frameWidth, frameHeight)
    }

    return new Promise(resolve => {
      canvas.toBlob(resolve, 'image/png')
    })
  }

  async createRealGIF(canvas, ctx) {
    const { GIFEncoder } = await import('./gifEncoder.js')
    const encoder = new GIFEncoder(canvas.width, canvas.height, { quality: this.quality })

    // Add each frame to the GIF
    for (let i = 0; i < this.frames.length; i++) {
      const frameImg = new Image()
      await new Promise(resolve => {
        frameImg.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(frameImg, 0, 0)
          encoder.addFrame(canvas, this.frameInterval)
          resolve()
        }
        frameImg.src = this.frames[i]
      })

      if (this.onProgress) {
        this.onProgress((i + 1) / this.frames.length)
      }
    }

    return encoder.createBlob()
  }

  stopRecording() {
    this.isRecording = false
  }

  setProgressCallback(callback) {
    this.onProgress = callback
  }
}

// Alternative implementation using modern APIs
export class ModernGIFExporter {
  constructor() {
    this.mediaRecorder = null
    this.recordedChunks = []
  }

  async startRecording(canvas, options = {}) {
    const {
      duration = 4000,
      fps = 30,
      quality = 0.8
    } = options

    // Use canvas.captureStream for modern browsers
    if (canvas.captureStream) {
      const stream = canvas.captureStream(fps)

      const mimeType = this.getSupportedMimeType()
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000
      })

      this.recordedChunks = []

      return new Promise((resolve, reject) => {
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.recordedChunks.push(event.data)
          }
        }

        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.recordedChunks, { type: mimeType })
          resolve(blob)
        }

        this.mediaRecorder.onerror = reject

        this.mediaRecorder.start()

        // Stop recording after duration
        setTimeout(() => {
          this.mediaRecorder.stop()
          stream.getTracks().forEach(track => track.stop())
        }, duration)
      })
    } else {
      const fallbackExporter = new RealGIFExporter()
      return fallbackExporter.startRecording(canvas, options)
    }
  }

  getSupportedMimeType() {
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4'
    ]

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }

    return 'video/webm'
  }
}

// Main export function that chooses the best available method
export const exportCanvasAsGIF = async (canvas, options = {}) => {
  // Try modern approach first
  if (window.MediaRecorder && canvas.captureStream) {
    const modernExporter = new ModernGIFExporter()
    try {
      return await modernExporter.startRecording(canvas, options)
    } catch (error) {
      console.warn('Modern GIF export failed, falling back to frame capture:', error)
    }
  }

  // Fallback to frame capture
  const frameExporter = new RealGIFExporter()
  if (options.onProgress) {
    frameExporter.setProgressCallback(options.onProgress)
  }

  return frameExporter.startRecording(canvas, options)
}