export class CanvasRecorder {
  constructor() {
    this.frames = []
    this.isRecording = false
    this.frameRate = 30
    this.recordingStartTime = 0
    this.animationId = null
  }

  startRecording(canvas, frameRate = 30) {
    this.frames = []
    this.isRecording = true
    this.frameRate = frameRate
    this.recordingStartTime = performance.now()

    this.captureFrame(canvas)
  }

  captureFrame(canvas) {
    if (!this.isRecording) return

    try {
      // Validate canvas before capture
      if (!canvas || typeof canvas.toDataURL !== 'function') {
        throw new Error('Invalid canvas for frame capture')
      }

      // Capture current frame
      const frameData = canvas.toDataURL('image/png')
      const timestamp = performance.now() - this.recordingStartTime

      this.frames.push({
        data: frameData,
        timestamp: timestamp
      })

      // Schedule next frame
      this.animationId = setTimeout(() => {
        this.captureFrame(canvas)
      }, 1000 / this.frameRate)

    } catch (error) {
      console.error('Frame capture failed:', error)
      this.stopRecording()
    }
  }

  stopRecording() {
    this.isRecording = false
    if (this.animationId) {
      clearTimeout(this.animationId)
      this.animationId = null
    }
    return this.frames
  }

  getFrames() {
    return this.frames
  }

  async exportAsGIF(options = {}) {
    const { GIFExporter } = await import('./gifExporter.js')
    const exporter = new GIFExporter()

    // Create temporary canvas for frame processing
    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')

    return new Promise((resolve, reject) => {
      let processedFrames = 0
      const totalFrames = this.frames.length

      if (totalFrames === 0) {
        reject(new Error('No frames to export'))
        return
      }

      // Set canvas size based on first frame
      const img = new Image()
      img.onload = () => {
        tempCanvas.width = img.width
        tempCanvas.height = img.height

        // Initialize GIF
        const gif = new GIF({
          workers: 2,
          quality: options.quality || 10,
          width: img.width,
          height: img.height
        })

        gif.on('finished', resolve)
        gif.on('progress', (progress) => {
          if (options.onProgress) {
            options.onProgress(progress)
          }
        })

        // Process each frame
        this.frames.forEach((frame, index) => {
          const frameImg = new Image()
          frameImg.onload = () => {
            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height)
            tempCtx.drawImage(frameImg, 0, 0)

            const delay = index < this.frames.length - 1
              ? this.frames[index + 1].timestamp - frame.timestamp
              : 1000 / this.frameRate

            gif.addFrame(tempCanvas, {
              copy: true,
              delay: Math.max(delay, 1000 / this.frameRate)
            })

            processedFrames++
            if (processedFrames === totalFrames) {
              gif.render()
            }
          }
          frameImg.src = frame.data
        })
      }
      img.src = this.frames[0].data
    })
  }

  async exportAsVideo(options = {}) {
    const { VideoRecorder } = await import('./videoRecorder.js')

    // Create a temporary canvas to replay the frames
    const replayCanvas = document.createElement('canvas')
    const replayCtx = replayCanvas.getContext('2d')

    if (this.frames.length === 0) {
      throw new Error('No frames to export')
    }

    // Set canvas size
    const img = new Image()
    await new Promise((resolve) => {
      img.onload = resolve
      img.src = this.frames[0].data
    })

    replayCanvas.width = img.width
    replayCanvas.height = img.height

    const recorder = new VideoRecorder()
    const recordingPromise = recorder.startRecording(replayCanvas, options)

    // Replay frames
    let frameIndex = 0
    const playFrame = () => {
      if (frameIndex >= this.frames.length) {
        recorder.stopRecording()
        return
      }

      const frame = this.frames[frameIndex]
      const frameImg = new Image()
      frameImg.onload = () => {
        replayCtx.clearRect(0, 0, replayCanvas.width, replayCanvas.height)
        replayCtx.drawImage(frameImg, 0, 0)

        frameIndex++
        const delay = frameIndex < this.frames.length
          ? this.frames[frameIndex].timestamp - frame.timestamp
          : 1000 / this.frameRate

        setTimeout(playFrame, delay)
      }
      frameImg.src = frame.data
    }

    playFrame()
    return recordingPromise
  }
}

export const createCanvasRecorder = () => new CanvasRecorder()