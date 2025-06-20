/**
 * Advanced Process Environment Handler
 *
 * This module provides cross-platform process handling with environment detection,
 * graceful exit strategies, and runtime context management for both browser and Node.js environments.
 */

import logger from './logger.js'

class ProcessHandler {
  constructor() {
    this.environment = this.detectEnvironment()
    this.exitHandlers = new Set()
    this.isExiting = false
    this.exitCode = 0
    this.processInfo = this.gatherProcessInfo()

    this.initializeExitHandling()
  }

  /**
   * Detect the current runtime environment
   */
  detectEnvironment() {
    // Check for Node.js environment
    if (typeof globalThis !== 'undefined' &&
        globalThis.process &&
        globalThis.process.versions &&
        globalThis.process.versions.node) {
      return {
        type: 'node',
        version: globalThis.process.versions.node,
        platform: globalThis.process.platform,
        arch: globalThis.process.arch,
        pid: globalThis.process.pid,
        ppid: globalThis.process.ppid,
        cwd: globalThis.process.cwd?.(),
        env: globalThis.process.env
      }
    }

    // Check for browser environment
    if (typeof window !== 'undefined') {
      return {
        type: 'browser',
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        url: window.location.href,
        origin: window.location.origin
      }
    }

    // Check for Web Worker environment
    if (typeof self !== 'undefined' && typeof importScripts === 'function') {
      return {
        type: 'webworker',
        userAgent: navigator?.userAgent || 'Unknown',
        location: self.location?.href || 'Unknown'
      }
    }

    // Check for Service Worker environment
    if (typeof self !== 'undefined' && 'serviceWorker' in self) {
      return {
        type: 'serviceworker',
        scope: self.registration?.scope || 'Unknown'
      }
    }

    return {
      type: 'unknown',
      context: 'Unable to determine runtime environment'
    }
  }

  /**
   * Gather comprehensive process information
   */
  gatherProcessInfo() {
    const info = {
      startTime: Date.now(),
      environment: this.environment,
      runtime: {
        memoryUsage: this.getMemoryUsage(),
        uptime: this.getUptime(),
        performance: this.getPerformanceInfo()
      }
    }

    // Add Node.js specific information
    if (this.environment.type === 'node' && globalThis.process) {
      info.node = {
        argv: globalThis.process.argv,
        execPath: globalThis.process.execPath,
        version: globalThis.process.version,
        versions: globalThis.process.versions,
        features: globalThis.process.features,
        config: globalThis.process.config
      }
    }

    // Add browser specific information
    if (this.environment.type === 'browser') {
      info.browser = {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        screen: {
          width: screen.width,
          height: screen.height,
          colorDepth: screen.colorDepth
        },
        connection: this.getConnectionInfo(),
        storage: this.getStorageInfo()
      }
    }

    return info
  }

  /**
   * Get memory usage information
   */
  getMemoryUsage() {
    // Node.js memory usage
    if (this.environment.type === 'node' && globalThis.process?.memoryUsage) {
      const usage = globalThis.process.memoryUsage()
      return {
        rss: usage.rss,
        heapTotal: usage.heapTotal,
        heapUsed: usage.heapUsed,
        external: usage.external,
        arrayBuffers: usage.arrayBuffers
      }
    }

    // Browser memory usage
    if (typeof performance !== 'undefined' && performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      }
    }

    return null
  }

  /**
   * Get process uptime
   */
  getUptime() {
    if (this.environment.type === 'node' && globalThis.process?.uptime) {
      return globalThis.process.uptime() * 1000 // Convert to milliseconds
    }

    return Date.now() - this.processInfo?.startTime || 0
  }

  /**
   * Get performance information
   */
  getPerformanceInfo() {
    if (typeof performance !== 'undefined') {
      return {
        timeOrigin: performance.timeOrigin,
        now: performance.now(),
        timing: performance.timing ? {
          navigationStart: performance.timing.navigationStart,
          loadEventEnd: performance.timing.loadEventEnd,
          domContentLoadedEventEnd: performance.timing.domContentLoadedEventEnd
        } : null
      }
    }

    return null
  }

  /**
   * Get network connection information
   */
  getConnectionInfo() {
    if (typeof navigator !== 'undefined' && navigator.connection) {
      return {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData
      }
    }

    return null
  }

  /**
   * Get storage information
   */
  getStorageInfo() {
    const storage = {}

    try {
      storage.localStorage = {
        available: typeof localStorage !== 'undefined',
        length: localStorage?.length || 0
      }
    } catch {
      storage.localStorage = { available: false }
    }

    try {
      storage.sessionStorage = {
        available: typeof sessionStorage !== 'undefined',
        length: sessionStorage?.length || 0
      }
    } catch {
      storage.sessionStorage = { available: false }
    }

    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        storage.quota = estimate
      }).catch(() => {
        storage.quota = { available: false }
      })
    }

    return storage
  }

  /**
   * Initialize exit handling for different environments
   */
  initializeExitHandling() {
    if (this.environment.type === 'node' && globalThis.process) {
      // Node.js exit handling
      const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT', 'SIGHUP']

      signals.forEach(signal => {
        globalThis.process.on(signal, () => {
          logger.info(`Received ${signal}, initiating graceful shutdown`)
          this.gracefulExit(0)
        })
      })

      globalThis.process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception:', error)
        this.gracefulExit(1)
      })

      globalThis.process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection:', { reason, promise })
        this.gracefulExit(1)
      })
    }

    if (this.environment.type === 'browser') {
      // Browser exit handling
      window.addEventListener('beforeunload', (event) => {
        if (this.exitHandlers.size > 0) {
          event.preventDefault()
          event.returnValue = 'Are you sure you want to leave? Some operations may be in progress.'
          return event.returnValue
        }
      })

      window.addEventListener('unload', () => {
        this.gracefulExit(0)
      })

      // Handle page visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          logger.info('Page hidden, preparing for potential exit')
          this.prepareForExit()
        }
      })
    }
  }

  /**
   * Add exit handler
   */
  addExitHandler(handler, priority = 0) {
    if (typeof handler !== 'function') {
      throw new Error('Exit handler must be a function')
    }

    const wrappedHandler = {
      handler,
      priority,
      id: Math.random().toString(36).substr(2, 9)
    }

    this.exitHandlers.add(wrappedHandler)
    return wrappedHandler.id
  }

  /**
   * Remove exit handler
   */
  removeExitHandler(handlerId) {
    for (const handler of this.exitHandlers) {
      if (handler.id === handlerId) {
        this.exitHandlers.delete(handler)
        return true
      }
    }
    return false
  }

  /**
   * Prepare for potential exit (cleanup non-critical resources)
   */
  prepareForExit() {
    logger.info('Preparing for potential exit')

    // Cancel non-critical operations
    if (typeof cancelIdleCallback !== 'undefined') {
      // Cancel any pending idle callbacks
    }

    // Clear non-essential timers
    // Note: This would need to be implemented based on specific application needs
  }

  /**
   * Graceful exit with cleanup
   */
  async gracefulExit(code = 0) {
    if (this.isExiting) {
      logger.warn('Exit already in progress')
      return
    }

    this.isExiting = true
    this.exitCode = code

    logger.info(`Initiating graceful exit with code ${code}`)

    try {
      // Sort handlers by priority (higher priority first)
      const sortedHandlers = Array.from(this.exitHandlers)
        .sort((a, b) => b.priority - a.priority)

      // Execute exit handlers
      for (const { handler, id } of sortedHandlers) {
        try {
          logger.debug(`Executing exit handler ${id}`)
          await Promise.resolve(handler())
        } catch (error) {
          logger.error(`Exit handler ${id} failed:`, error)
        }
      }

      logger.info('All exit handlers completed')

    } catch (error) {
      logger.error('Error during graceful exit:', error)
    } finally {
      this.performFinalExit(code)
    }
  }

  /**
   * Perform the actual exit
   */
  performFinalExit(code) {
    logger.info(`Final exit with code ${code}`)

    if (this.environment.type === 'node' && globalThis.process?.exit) {
      globalThis.process.exit(code)
    } else if (this.environment.type === 'browser') {
      // In browser, we can't actually exit, but we can clean up
      logger.info('Browser environment - cleanup completed')
    }
  }

  /**
   * Force exit (bypass graceful shutdown)
   */
  forceExit(code = 1) {
    logger.warn(`Force exit with code ${code}`)

    if (this.environment.type === 'node' && globalThis.process?.exit) {
      globalThis.process.exit(code)
    }
  }

  /**
   * Get current process status
   */
  getStatus() {
    return {
      isExiting: this.isExiting,
      exitCode: this.exitCode,
      uptime: this.getUptime(),
      memoryUsage: this.getMemoryUsage(),
      exitHandlers: this.exitHandlers.size,
      environment: this.environment
    }
  }

  /**
   * Generate process report
   */
  generateReport() {
    return {
      processInfo: this.processInfo,
      currentStatus: this.getStatus(),
      timestamp: new Date().toISOString()
    }
  }
}

// Create singleton instance
const processHandler = new ProcessHandler()

// Export safe process object for cross-platform compatibility
export const safeProcess = {
  env: processHandler.environment.env || {},
  platform: processHandler.environment.platform || 'unknown',
  exit: (code) => processHandler.gracefulExit(code),
  addExitHandler: (handler, priority) => processHandler.addExitHandler(handler, priority),
  removeExitHandler: (id) => processHandler.removeExitHandler(id),
  getStatus: () => processHandler.getStatus(),
  generateReport: () => processHandler.generateReport()
}

export { ProcessHandler, processHandler }
export default processHandler