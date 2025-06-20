/**
 * Advanced Environment Detection and Runtime Capability Assessment
 *
 * This module provides comprehensive environment detection for browser capabilities,
 * API availability, and runtime feature support with fallback strategies.
 */

class EnvironmentDetector {
  constructor() {
    this.capabilities = new Map()
    this.browserInfo = this.detectBrowser()
    this.runtimeFeatures = this.assessRuntimeFeatures()
    this.performanceMetrics = this.initializePerformanceMetrics()
  }

  /**
   * Detect browser type and version with advanced user agent parsing
   */
  detectBrowser() {
    const userAgent = navigator.userAgent
    const browsers = {
      chrome: /Chrome\/(\d+)/,
      firefox: /Firefox\/(\d+)/,
      safari: /Safari\/(\d+)/,
      edge: /Edg\/(\d+)/,
      opera: /Opera\/(\d+)/
    }

    for (const [name, regex] of Object.entries(browsers)) {
      const match = userAgent.match(regex)
      if (match) {
        return {
          name,
          version: parseInt(match[1]),
          userAgent,
          isModern: this.isModernBrowser(name, parseInt(match[1]))
        }
      }
    }

    return {
      name: 'unknown',
      version: 0,
      userAgent,
      isModern: false
    }
  }

  /**
   * Determine if browser version supports modern web APIs
   */
  isModernBrowser(name, version) {
    const modernVersions = {
      chrome: 88,
      firefox: 85,
      safari: 14,
      edge: 88,
      opera: 74
    }

    return version >= (modernVersions[name] || 999)
  }

  /**
   * Comprehensive runtime feature assessment
   */
  assessRuntimeFeatures() {
    const features = {
      // Canvas and Media APIs
      canvas2d: this.checkCanvasSupport(),
      webgl: this.checkWebGLSupport(),
      mediaRecorder: this.checkMediaRecorderSupport(),
      captureStream: this.checkCaptureStreamSupport(),

      // Modern Video APIs
      webCodecs: this.checkWebCodecsSupport(),
      videoEncoder: this.checkVideoEncoderSupport(),
      videoFrame: this.checkVideoFrameSupport(),

      // File and Blob APIs
      fileSystem: this.checkFileSystemSupport(),
      blobConstructor: this.checkBlobSupport(),
      urlCreateObjectURL: this.checkURLSupport(),

      // Performance APIs
      performanceObserver: this.checkPerformanceObserverSupport(),
      requestIdleCallback: this.checkRequestIdleCallbackSupport(),

      // Worker APIs
      webWorkers: this.checkWebWorkerSupport(),
      sharedArrayBuffer: this.checkSharedArrayBufferSupport(),

      // Codec Support
      h264Support: this.checkH264Support(),
      vp9Support: this.checkVP9Support(),
      av1Support: this.checkAV1Support()
    }

    // Cache results
    for (const [feature, supported] of Object.entries(features)) {
      this.capabilities.set(feature, supported)
    }

    return features
  }

  checkCanvasSupport() {
    try {
      const canvas = document.createElement('canvas')
      return !!(canvas.getContext && canvas.getContext('2d'))
    } catch {
      return false
    }
  }

  checkWebGLSupport() {
    try {
      const canvas = document.createElement('canvas')
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    } catch {
      return false
    }
  }

  checkMediaRecorderSupport() {
    return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported
  }

  checkCaptureStreamSupport() {
    try {
      const canvas = document.createElement('canvas')
      return typeof canvas.captureStream === 'function'
    } catch {
      return false
    }
  }

  checkWebCodecsSupport() {
    return typeof VideoEncoder !== 'undefined' &&
           typeof VideoDecoder !== 'undefined' &&
           typeof EncodedVideoChunk !== 'undefined'
  }

  checkVideoEncoderSupport() {
    return typeof VideoEncoder !== 'undefined'
  }

  checkVideoFrameSupport() {
    return typeof VideoFrame !== 'undefined'
  }

  checkFileSystemSupport() {
    return 'showSaveFilePicker' in window
  }

  checkBlobSupport() {
    return typeof Blob !== 'undefined'
  }

  checkURLSupport() {
    return typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
  }

  checkPerformanceObserverSupport() {
    return typeof PerformanceObserver !== 'undefined'
  }

  checkRequestIdleCallbackSupport() {
    return typeof requestIdleCallback !== 'undefined'
  }

  checkWebWorkerSupport() {
    return typeof Worker !== 'undefined'
  }

  checkSharedArrayBufferSupport() {
    return typeof SharedArrayBuffer !== 'undefined'
  }

  checkH264Support() {
    if (!this.checkMediaRecorderSupport()) return false
    return MediaRecorder.isTypeSupported('video/mp4;codecs=h264') ||
           MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.420034')
  }

  checkVP9Support() {
    if (!this.checkMediaRecorderSupport()) return false
    return MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
  }

  checkAV1Support() {
    if (!this.checkMediaRecorderSupport()) return false
    return MediaRecorder.isTypeSupported('video/webm;codecs=av01')
  }

  /**
   * Initialize performance monitoring
   */
  initializePerformanceMetrics() {
    const metrics = {
      memoryUsage: this.getMemoryUsage(),
      connectionType: this.getConnectionType(),
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      devicePixelRatio: window.devicePixelRatio || 1
    }

    return metrics
  }

  getMemoryUsage() {
    if ('memory' in performance) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      }
    }
    return null
  }

  getConnectionType() {
    if ('connection' in navigator) {
      return {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      }
    }
    return null
  }

  /**
   * Get optimal export configuration based on environment
   */
  getOptimalExportConfig() {
    const config = {
      preferredVideoFormat: 'webm',
      maxResolution: { width: 1920, height: 1080 },
      maxDuration: 30000,
      preferredFrameRate: 30,
      qualityPresets: {
        low: { bitrate: 1000000, quality: 0.7 },
        medium: { bitrate: 2500000, quality: 0.8 },
        high: { bitrate: 5000000, quality: 0.9 }
      }
    }

    // Adjust based on capabilities
    if (this.capabilities.get('h264Support')) {
      config.preferredVideoFormat = 'mp4'
    }

    if (this.capabilities.get('webCodecs')) {
      config.maxResolution = { width: 3840, height: 2160 }
      config.maxDuration = 60000
    }

    // Adjust based on performance
    const memory = this.performanceMetrics.memoryUsage
    if (memory && memory.used / memory.total > 0.8) {
      config.maxResolution = { width: 1280, height: 720 }
      config.preferredFrameRate = 24
    }

    return config
  }

  /**
   * Check if specific feature is supported
   */
  isSupported(feature) {
    return this.capabilities.get(feature) || false
  }

  /**
   * Get fallback strategy for unsupported features
   */
  getFallbackStrategy(feature) {
    const fallbacks = {
      webCodecs: ['mediaRecorder', 'canvasRecording'],
      videoEncoder: ['mediaRecorder'],
      h264Support: ['vp9Support', 'webmFallback'],
      captureStream: ['frameByFrame']
    }

    return fallbacks[feature] || []
  }

  /**
   * Generate comprehensive environment report
   */
  generateReport() {
    return {
      browser: this.browserInfo,
      features: Object.fromEntries(this.capabilities),
      performance: this.performanceMetrics,
      recommendations: this.getOptimalExportConfig(),
      timestamp: new Date().toISOString()
    }
  }
}

// Singleton instance
const environmentDetector = new EnvironmentDetector()

export { environmentDetector }
export default EnvironmentDetector