// Real video conversion using modern browser APIs
export class VideoConverter {
  constructor() {
    this.isWebCodecsSupported = this.checkWebCodecsSupport()
  }

  checkWebCodecsSupport() {
    return typeof VideoEncoder !== 'undefined' &&
           typeof VideoDecoder !== 'undefined' &&
           typeof EncodedVideoChunk !== 'undefined'
  }

  async convertWebMToMP4(webmBlob) {
    if (this.isWebCodecsSupported) {
      return this.convertUsingWebCodecs(webmBlob)
    } else {
      return this.convertUsingMediaRecorder(webmBlob)
    }
  }

  async convertUsingWebCodecs(webmBlob) {
    try {
      const video = document.createElement('video')
      const videoURL = URL.createObjectURL(webmBlob)
      video.src = videoURL
      video.muted = true

      await new Promise((resolve, reject) => {
        video.onloadeddata = resolve
        video.onerror = reject
      })

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const frames = []
      const frameDuration = 1000000 / 30 // 30 FPS in microseconds

      // Extract frames
      video.currentTime = 0
      while (video.currentTime < video.duration) {
        ctx.drawImage(video, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        frames.push(imageData)

        video.currentTime += 1/30 // 30 FPS
        await new Promise(resolve => {
          video.onseeked = resolve
        })
      }

      // Encode to MP4
      const chunks = []
      const encoder = new VideoEncoder({
        output: (chunk) => {
          chunks.push(chunk)
        },
        error: (error) => {
          console.error('Encoding error:', error)
        }
      })

      const config = {
        codec: 'avc1.420034', // H.264 baseline
        width: canvas.width,
        height: canvas.height,
        bitrate: 2000000,
        framerate: 30
      }

      encoder.configure(config)

      // Encode frames
      for (let i = 0; i < frames.length; i++) {
        const frame = new VideoFrame(frames[i], {
          timestamp: i * frameDuration,
          duration: frameDuration
        })
        encoder.encode(frame)
        frame.close()
      }

      await encoder.flush()
      encoder.close()

      // Create MP4 blob from chunks
      const mp4Data = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.byteLength, 0))
      let offset = 0
      for (const chunk of chunks) {
        mp4Data.set(new Uint8Array(chunk), offset)
        offset += chunk.byteLength
      }

      URL.revokeObjectURL(videoURL)
      return new Blob([mp4Data], { type: 'video/mp4' })

    } catch (error) {
      console.error('WebCodecs conversion failed:', error)
      return this.convertUsingMediaRecorder(webmBlob)
    }
  }

  async convertUsingMediaRecorder(webmBlob) {
    try {
      const video = document.createElement('video')
      const videoURL = URL.createObjectURL(webmBlob)
      video.src = videoURL
      video.muted = true

      await new Promise((resolve, reject) => {
        video.onloadeddata = resolve
        video.onerror = reject
      })

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Try MP4 recording
      const stream = canvas.captureStream(30)
      const mp4MimeTypes = [
        'video/mp4;codecs=h264',
        'video/mp4;codecs=avc1.420034',
        'video/mp4'
      ]

      let supportedMimeType = null
      for (const mimeType of mp4MimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          supportedMimeType = mimeType
          break
        }
      }

      if (supportedMimeType) {
        const recorder = new MediaRecorder(stream, {
          mimeType: supportedMimeType,
          videoBitsPerSecond: 2500000
        })
        const chunks = []

        recorder.ondataavailable = (e) => chunks.push(e.data)

        return new Promise((resolve) => {
          recorder.onstop = () => {
            const mp4Blob = new Blob(chunks, { type: supportedMimeType })
            stream.getTracks().forEach(track => track.stop())
            URL.revokeObjectURL(videoURL)
            resolve(mp4Blob)
          }

          recorder.start()

          // Play video and render to canvas
          video.play()
          const renderFrame = () => {
            if (!video.ended && !video.paused) {
              ctx.drawImage(video, 0, 0)
              requestAnimationFrame(renderFrame)
            } else {
              recorder.stop()
            }
          }
          renderFrame()
        })
      } else {
        // No MP4 support, return original WebM
        URL.revokeObjectURL(videoURL)
        return webmBlob
      }

    } catch (error) {
      console.error('MediaRecorder conversion failed:', error)
      return webmBlob
    }
  }

  // Convert any video format to WebM
  async convertToWebM(videoBlob) {
    try {
      const video = document.createElement('video')
      const videoURL = URL.createObjectURL(videoBlob)
      video.src = videoURL
      video.muted = true

      await new Promise((resolve, reject) => {
        video.onloadeddata = resolve
        video.onerror = reject
      })

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const stream = canvas.captureStream(30)
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000
      })

      const chunks = []
      recorder.ondataavailable = (e) => chunks.push(e.data)

      return new Promise((resolve) => {
        recorder.onstop = () => {
          const webmBlob = new Blob(chunks, { type: 'video/webm' })
          stream.getTracks().forEach(track => track.stop())
          URL.revokeObjectURL(videoURL)
          resolve(webmBlob)
        }

        recorder.start()

        video.play()
        const renderFrame = () => {
          if (!video.ended && !video.paused) {
            ctx.drawImage(video, 0, 0)
            requestAnimationFrame(renderFrame)
          } else {
            recorder.stop()
          }
        }
        renderFrame()
      })

    } catch (error) {
      console.error('WebM conversion failed:', error)
      return videoBlob
    }
  }

  // Get optimal video format for the browser
  getOptimalFormat() {
    const formats = [
      { mime: 'video/mp4;codecs=h264', ext: 'mp4' },
      { mime: 'video/mp4;codecs=avc1.420034', ext: 'mp4' },
      { mime: 'video/mp4', ext: 'mp4' },
      { mime: 'video/webm;codecs=vp9', ext: 'webm' },
      { mime: 'video/webm;codecs=vp8', ext: 'webm' },
      { mime: 'video/webm', ext: 'webm' }
    ]

    for (const format of formats) {
      if (MediaRecorder.isTypeSupported(format.mime)) {
        return format
      }
    }

    return { mime: 'video/webm', ext: 'webm' } // fallback
  }
}

// Export utilities
export const convertWebMToMP4 = async (webmBlob) => {
  const converter = new VideoConverter()
  return converter.convertWebMToMP4(webmBlob)
}

export const convertToOptimalFormat = async (videoBlob) => {
  const converter = new VideoConverter()
  const optimalFormat = converter.getOptimalFormat()

  if (optimalFormat.ext === 'mp4') {
    return converter.convertWebMToMP4(videoBlob)
  } else {
    return converter.convertToWebM(videoBlob)
  }
}