export class VideoRecorder {
  constructor() {
    this.mediaRecorder = null
    this.recordedChunks = []
    this.isRecording = false
    this.stream = null
  }

  async startRecording(canvas, options = {}) {
    const {
      videoBitsPerSecond = 2500000, // 2.5 Mbps
      audioBitsPerSecond = 128000,  // 128 kbps
      mimeType = 'video/webm;codecs=vp9'
    } = options

    try {
      // Get stream from canvas
      this.stream = canvas.captureStream(30) // 30 FPS

      // Check if the browser supports the requested mime type
      const supportedMimeType = this.getSupportedMimeType(mimeType)

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: supportedMimeType,
        videoBitsPerSecond,
        audioBitsPerSecond
      })

      this.recordedChunks = []

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data)
        }
      }

      return new Promise((resolve, reject) => {
        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.recordedChunks, {
            type: supportedMimeType
          })
          resolve(blob)
        }

        this.mediaRecorder.onerror = (error) => {
          reject(error)
        }

        this.mediaRecorder.start(100) // Collect data every 100ms
        this.isRecording = true
      })
    } catch (error) {
      throw new Error(`Failed to start video recording: ${error.message}`)
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop()
      this.isRecording = false

      // Stop all tracks to release the stream
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop())
        this.stream = null
      }
    }
  }

  getSupportedMimeType(preferredType) {
    const types = [
      preferredType,
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4;codecs=h264',
      'video/mp4'
    ]

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }

    throw new Error('No supported video mime type found')
  }

  isSupported() {
    return !!(navigator.mediaDevices &&
             navigator.mediaDevices.getUserMedia &&
             window.MediaRecorder &&
             HTMLCanvasElement.prototype.captureStream)
  }
}

// Utility function for easy video export
export const exportCanvasAsVideo = async (canvas, duration = 4000, options = {}) => {
  const recorder = new VideoRecorder()

  if (!recorder.isSupported()) {
    throw new Error('Video recording is not supported in this browser')
  }

  const recordingPromise = recorder.startRecording(canvas, options)

  // Stop recording after specified duration
  setTimeout(() => {
    recorder.stopRecording()
  }, duration)

  return recordingPromise
}

export { convertWebMToMP4, convertToOptimalFormat } from './videoConverter.js'