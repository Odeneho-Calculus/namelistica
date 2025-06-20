/**
 * Advanced Logging System with Context-Aware Output Management
 *
 * This module provides sophisticated logging capabilities with environment detection,
 * performance monitoring, error tracking, and production-safe output management.
 */

import { environmentDetector } from './environmentDetector.js'

class Logger {
  constructor() {
    this.isProduction = this.detectEnvironment()
    this.logLevel = this.determineLogLevel()
    this.logBuffer = []
    this.maxBufferSize = 1000
    this.sessionId = this.generateSessionId()
    this.startTime = performance.now()
    this.metrics = {
      errors: 0,
      warnings: 0,
      info: 0,
      debug: 0,
      performance: []
    }

    this.initializeErrorTracking()
  }

  /**
   * Detect current environment with multiple fallback methods
   */
  detectEnvironment() {
    // Method 1: Check for common production indicators
    if (typeof window !== 'undefined') {
      // Check for minified code indicators
      if (window.location.hostname !== 'localhost' &&
          window.location.hostname !== '127.0.0.1' &&
          !window.location.hostname.includes('dev')) {
        return true
      }
    }

    // Method 2: Check for build-time environment variables (Vite)
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env.PROD || import.meta.env.MODE === 'production'
    }

    // Method 3: Check for Node.js process (for SSR or build scripts)
    if (typeof globalThis !== 'undefined' && globalThis.process) {
      return globalThis.process.env?.NODE_ENV === 'production'
    }

    // Method 4: Feature detection for development tools
    const devToolsOpen = () => {
      const threshold = 160
      return window.outerHeight - window.innerHeight > threshold ||
             window.outerWidth - window.innerWidth > threshold
    }

    // Default to development if dev tools are detected
    return !devToolsOpen()
  }

  /**
   * Determine appropriate log level based on environment and capabilities
   */
  determineLogLevel() {
    if (this.isProduction) {
      return 'error' // Only log errors in production
    }

    // Development environment - check for debug preferences
    const urlParams = new URLSearchParams(window.location.search)
    const debugLevel = urlParams.get('debug') || localStorage.getItem('namelistica-debug-level')

    return debugLevel || 'info'
  }

  /**
   * Generate unique session identifier for log correlation
   */
  generateSessionId() {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substr(2, 9)
    return `${timestamp}-${random}`
  }

  /**
   * Initialize global error tracking
   */
  initializeErrorTracking() {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.error('Global Error:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error?.stack
        })
      })

      window.addEventListener('unhandledrejection', (event) => {
        this.error('Unhandled Promise Rejection:', {
          reason: event.reason,
          promise: event.promise
        })
      })
    }
  }

  /**
   * Check if log level should be output
   */
  shouldLog(level) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 }
    const currentLevel = levels[this.logLevel] || 1
    const messageLevel = levels[level] || 1

    return messageLevel >= currentLevel
  }

  /**
   * Create structured log entry
   */
  createLogEntry(level, message, data = null, context = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      level,
      message,
      data,
      context: {
        url: window.location?.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        memory: environmentDetector.performanceMetrics.memoryUsage,
        ...context
      },
      performance: {
        timeFromStart: performance.now() - this.startTime,
        memoryUsage: this.getMemoryUsage()
      }
    }

    // Add to buffer
    this.logBuffer.push(entry)
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift()
    }

    // Update metrics
    this.metrics[level] = (this.metrics[level] || 0) + 1

    return entry
  }

  /**
   * Get current memory usage if available
   */
  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
      }
    }
    return null
  }

  /**
   * Safe console output with fallback
   */
  safeConsoleOutput(level, entry) {
    if (this.isProduction && level !== 'error') {
      return // Suppress non-error logs in production
    }

    const consoleMethod = console[level] || console.log
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`

    try {
      if (entry.data) {
        consoleMethod(prefix, entry.message, entry.data)
      } else {
        consoleMethod(prefix, entry.message)
      }
    } catch (consoleError) {
      // Fallback if console is not available or throws
      try {
        console.log(`${prefix} ${entry.message}`)
      } catch {
        // Silent fallback - store in buffer only
      }
    }
  }

  /**
   * Debug level logging
   */
  debug(message, data = null, context = {}) {
    if (!this.shouldLog('debug')) return

    const entry = this.createLogEntry('debug', message, data, context)
    this.safeConsoleOutput('debug', entry)
    return entry
  }

  /**
   * Info level logging
   */
  info(message, data = null, context = {}) {
    if (!this.shouldLog('info')) return

    const entry = this.createLogEntry('info', message, data, context)
    this.safeConsoleOutput('info', entry)
    return entry
  }

  /**
   * Warning level logging
   */
  warn(message, data = null, context = {}) {
    if (!this.shouldLog('warn')) return

    const entry = this.createLogEntry('warn', message, data, context)
    this.safeConsoleOutput('warn', entry)
    return entry
  }

  /**
   * Error level logging
   */
  error(message, data = null, context = {}) {
    const entry = this.createLogEntry('error', message, data, context)
    this.safeConsoleOutput('error', entry)

    // Always track errors for analytics
    this.trackError(entry)
    return entry
  }

  /**
   * Performance logging with timing
   */
  performance(label, operation, data = null) {
    const startTime = performance.now()

    return {
      end: () => {
        const duration = performance.now() - startTime
        const entry = this.createLogEntry('info', `Performance: ${label}`, {
          duration: `${duration.toFixed(2)}ms`,
          operation,
          data
        })

        this.metrics.performance.push({
          label,
          duration,
          timestamp: entry.timestamp
        })

        this.safeConsoleOutput('info', entry)
        return duration
      }
    }
  }

  /**
   * Track errors for analytics (production-safe)
   */
  trackError(entry) {
    // In a real application, this would send to analytics service
    // For now, we'll store locally for debugging
    try {
      const errorLog = JSON.parse(localStorage.getItem('namelistica-errors') || '[]')
      errorLog.push({
        timestamp: entry.timestamp,
        message: entry.message,
        data: entry.data,
        sessionId: entry.sessionId
      })

      // Keep only last 50 errors
      if (errorLog.length > 50) {
        errorLog.splice(0, errorLog.length - 50)
      }

      localStorage.setItem('namelistica-errors', JSON.stringify(errorLog))
    } catch {
      // Silent fail if localStorage is not available
    }
  }

  /**
   * Export logs for debugging
   */
  exportLogs() {
    return {
      session: this.sessionId,
      environment: {
        isProduction: this.isProduction,
        logLevel: this.logLevel,
        browser: environmentDetector.browserInfo,
        features: environmentDetector.runtimeFeatures
      },
      metrics: this.metrics,
      logs: this.logBuffer,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Clear log buffer
   */
  clearLogs() {
    this.logBuffer = []
    this.metrics = {
      errors: 0,
      warnings: 0,
      info: 0,
      debug: 0,
      performance: []
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const perfMetrics = this.metrics.performance
    if (perfMetrics.length === 0) return null

    const durations = perfMetrics.map(m => m.duration)
    return {
      count: perfMetrics.length,
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      recent: perfMetrics.slice(-10)
    }
  }
}

// Create singleton instance
const logger = new Logger()

// Export both the class and instance
export { Logger, logger }
export default logger