/**
 * Canvas Debugger Utility
 *
 * This utility provides comprehensive debugging and diagnostic tools
 * for canvas-related issues in the export system.
 */

import logger from './logger.js'

export class CanvasDebugger {
  constructor() {
    this.debugHistory = []
    this.maxHistorySize = 100
  }

  /**
   * Comprehensive canvas analysis
   */
  analyzeCanvas(canvasInput, context = 'unknown') {
    const analysis = {
      timestamp: new Date().toISOString(),
      context,
      input: this.analyzeInput(canvasInput),
      resolution: this.analyzeResolution(canvasInput),
      validation: this.analyzeValidation(canvasInput),
      capabilities: this.analyzeCapabilities(canvasInput),
      recommendations: []
    }

    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis)

    // Add to history
    this.addToHistory(analysis)

    // Log summary
    this.logAnalysisSummary(analysis)

    return analysis
  }

  /**
   * Analyze input type and structure
   */
  analyzeInput(canvasInput) {
    const input = {
      type: typeof canvasInput,
      constructor: canvasInput?.constructor?.name || 'unknown',
      isNull: canvasInput === null,
      isUndefined: canvasInput === undefined,
      properties: [],
      methods: []
    }

    if (canvasInput && typeof canvasInput === 'object') {
      // Analyze properties
      const props = Object.getOwnPropertyNames(canvasInput)
      input.properties = props.slice(0, 20) // Limit to first 20 properties

      // Analyze methods
      const methods = props.filter(prop => {
        try {
          return typeof canvasInput[prop] === 'function'
        } catch {
          return false
        }
      })
      input.methods = methods.slice(0, 20) // Limit to first 20 methods

      // Check for common canvas-related properties
      input.hasCanvas = 'canvas' in canvasInput
      input.hasCanvasElement = 'canvasElement' in canvasInput
      input.hasCurrent = 'current' in canvasInput
      input.hasGetContext = 'getContext' in canvasInput
      input.hasToDataURL = 'toDataURL' in canvasInput
      input.hasWidth = 'width' in canvasInput
      input.hasHeight = 'height' in canvasInput

      // Check for React ref pattern
      input.isReactRef = 'current' in canvasInput && Object.keys(canvasInput).length <= 2

      // Check for component pattern
      input.isComponent = input.methods.length > 5 && input.hasCanvas
    }

    return input
  }

  /**
   * Analyze canvas resolution chain
   */
  analyzeResolution(canvasInput) {
    const resolution = {
      steps: [],
      finalCanvas: null,
      success: false,
      error: null
    }

    try {
      let current = canvasInput
      let step = 0
      const maxSteps = 10 // Prevent infinite loops

      while (current && step < maxSteps) {
        const stepInfo = {
          step: step + 1,
          type: typeof current,
          constructor: current?.constructor?.name || 'unknown',
          isCanvas: current instanceof HTMLCanvasElement,
          isOffscreenCanvas: typeof OffscreenCanvas !== 'undefined' && current instanceof OffscreenCanvas,
          hasToDataURL: typeof current?.toDataURL === 'function',
          properties: current && typeof current === 'object' ? Object.keys(current).slice(0, 10) : []
        }

        resolution.steps.push(stepInfo)

        // Check if we found a canvas
        if (current instanceof HTMLCanvasElement ||
            (typeof OffscreenCanvas !== 'undefined' && current instanceof OffscreenCanvas)) {
          resolution.finalCanvas = current
          resolution.success = true
          break
        }

        // Try to resolve further
        let next = null
        if (current?.current) {
          next = current.current
        } else if (current?.canvas) {
          next = current.canvas
        } else if (current?.canvasElement) {
          next = current.canvasElement
        } else if (current?.domElement) {
          next = current.domElement
        }

        if (next === current) {
          // Prevent infinite loops
          break
        }

        current = next
        step++
      }

      if (!resolution.success && step >= maxSteps) {
        resolution.error = 'Resolution chain too deep (possible circular reference)'
      } else if (!resolution.success) {
        resolution.error = 'No valid canvas found in resolution chain'
      }

    } catch (error) {
      resolution.error = `Resolution failed: ${error.message}`
    }

    return resolution
  }

  /**
   * Analyze canvas validation
   */
  analyzeValidation(canvasInput) {
    const validation = {
      tests: [],
      overallValid: false,
      criticalIssues: [],
      warnings: []
    }

    // Test 1: Basic existence
    const existenceTest = {
      name: 'Existence Check',
      passed: canvasInput != null,
      details: canvasInput == null ? 'Input is null or undefined' : 'Input exists'
    }
    validation.tests.push(existenceTest)

    if (!existenceTest.passed) {
      validation.criticalIssues.push('Canvas input is null or undefined')
      return validation
    }

    // Test 2: Canvas element type
    const typeTest = {
      name: 'Canvas Type Check',
      passed: canvasInput instanceof HTMLCanvasElement ||
              (typeof OffscreenCanvas !== 'undefined' && canvasInput instanceof OffscreenCanvas),
      details: `Input type: ${canvasInput.constructor?.name || typeof canvasInput}`
    }
    validation.tests.push(typeTest)

    // Test 3: Canvas dimensions
    let canvas = canvasInput
    if (!typeTest.passed) {
      // Try to resolve canvas
      const resolution = this.analyzeResolution(canvasInput)
      canvas = resolution.finalCanvas
    }

    if (canvas) {
      const dimensionsTest = {
        name: 'Dimensions Check',
        passed: canvas.width > 0 && canvas.height > 0,
        details: `Dimensions: ${canvas.width}x${canvas.height}`
      }
      validation.tests.push(dimensionsTest)

      if (!dimensionsTest.passed) {
        validation.criticalIssues.push('Canvas has invalid dimensions')
      }

      // Test 4: Export capability
      const exportTest = {
        name: 'Export Capability',
        passed: typeof canvas.toDataURL === 'function' || typeof canvas.convertToBlob === 'function',
        details: `toDataURL: ${typeof canvas.toDataURL}, convertToBlob: ${typeof canvas.convertToBlob}`
      }
      validation.tests.push(exportTest)

      if (!exportTest.passed) {
        validation.criticalIssues.push('Canvas does not support export methods')
      }

      // Test 5: Context availability
      try {
        const context = canvas.getContext('2d')
        const contextTest = {
          name: 'Context Check',
          passed: context != null,
          details: context ? 'Context available' : 'Context not available'
        }
        validation.tests.push(contextTest)

        if (!contextTest.passed) {
          validation.warnings.push('Canvas context not available')
        }
      } catch (error) {
        validation.tests.push({
          name: 'Context Check',
          passed: false,
          details: `Context error: ${error.message}`
        })
        validation.warnings.push('Canvas context check failed')
      }

      // Test 6: Taint check (if possible)
      try {
        if (typeof canvas.toDataURL === 'function') {
          canvas.toDataURL('image/png', 0.1) // Low quality test
          validation.tests.push({
            name: 'Taint Check',
            passed: true,
            details: 'Canvas is not tainted'
          })
        }
      } catch (error) {
        validation.tests.push({
          name: 'Taint Check',
          passed: false,
          details: `Taint error: ${error.message}`
        })
        validation.criticalIssues.push('Canvas is tainted and cannot be exported')
      }
    }

    validation.overallValid = validation.criticalIssues.length === 0
    return validation
  }

  /**
   * Analyze canvas capabilities
   */
  analyzeCapabilities(canvasInput) {
    const capabilities = {
      formats: [],
      features: [],
      limitations: []
    }

    // Try to resolve canvas
    const resolution = this.analyzeResolution(canvasInput)
    const canvas = resolution.finalCanvas

    if (!canvas) {
      capabilities.limitations.push('No canvas found')
      return capabilities
    }

    // Test format support
    const formats = ['image/png', 'image/jpeg', 'image/webp']
    formats.forEach(format => {
      try {
        if (typeof canvas.toDataURL === 'function') {
          const dataURL = canvas.toDataURL(format, 0.1)
          if (dataURL.startsWith(`data:${format}`)) {
            capabilities.formats.push(format)
          }
        }
      } catch (error) {
        // Format not supported
      }
    })

    // Test features
    const features = [
      { name: 'toDataURL', test: () => typeof canvas.toDataURL === 'function' },
      { name: 'convertToBlob', test: () => typeof canvas.convertToBlob === 'function' },
      { name: 'getContext', test: () => typeof canvas.getContext === 'function' },
      { name: 'captureStream', test: () => typeof canvas.captureStream === 'function' },
      { name: '2D Context', test: () => canvas.getContext('2d') != null },
      { name: 'WebGL Context', test: () => canvas.getContext('webgl') != null || canvas.getContext('webgl2') != null }
    ]

    features.forEach(feature => {
      try {
        if (feature.test()) {
          capabilities.features.push(feature.name)
        }
      } catch (error) {
        capabilities.limitations.push(`${feature.name} test failed: ${error.message}`)
      }
    })

    return capabilities
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(analysis) {
    const recommendations = []

    // Input-based recommendations
    if (analysis.input.isNull || analysis.input.isUndefined) {
      recommendations.push({
        type: 'critical',
        message: 'Ensure canvas reference is properly initialized before export',
        action: 'Check component mounting and ref assignment'
      })
    }

    if (analysis.input.isReactRef && !analysis.input.hasCurrent) {
      recommendations.push({
        type: 'critical',
        message: 'React ref current is null',
        action: 'Ensure component is mounted and canvas is rendered'
      })
    }

    // Resolution-based recommendations
    if (!analysis.resolution.success) {
      recommendations.push({
        type: 'critical',
        message: 'Canvas resolution failed',
        action: 'Check canvas reference chain and ensure proper component structure'
      })
    }

    if (analysis.resolution.steps.length > 5) {
      recommendations.push({
        type: 'warning',
        message: 'Complex resolution chain detected',
        action: 'Consider simplifying canvas reference structure'
      })
    }

    // Validation-based recommendations
    analysis.validation.criticalIssues.forEach(issue => {
      recommendations.push({
        type: 'critical',
        message: issue,
        action: 'Fix critical canvas issue before attempting export'
      })
    })

    analysis.validation.warnings.forEach(warning => {
      recommendations.push({
        type: 'warning',
        message: warning,
        action: 'Consider addressing canvas warning'
      })
    })

    // Capability-based recommendations
    if (analysis.capabilities.formats.length === 0) {
      recommendations.push({
        type: 'critical',
        message: 'No export formats supported',
        action: 'Ensure canvas supports toDataURL or convertToBlob'
      })
    }

    if (!analysis.capabilities.features.includes('toDataURL')) {
      recommendations.push({
        type: 'warning',
        message: 'toDataURL not available',
        action: 'Consider using convertToBlob for OffscreenCanvas'
      })
    }

    return recommendations
  }

  /**
   * Log analysis summary
   */
  logAnalysisSummary(analysis) {
    const { context, input, resolution, validation, capabilities, recommendations } = analysis

    logger.info(`Canvas Analysis (${context}):`)
    logger.info(`  Input: ${input.constructor} (${input.type})`)
    logger.info(`  Resolution: ${resolution.success ? 'SUCCESS' : 'FAILED'}`)
    logger.info(`  Validation: ${validation.overallValid ? 'VALID' : 'INVALID'}`)
    logger.info(`  Formats: ${capabilities.formats.join(', ') || 'none'}`)
    logger.info(`  Features: ${capabilities.features.join(', ') || 'none'}`)

    if (recommendations.length > 0) {
      logger.warn(`  Recommendations (${recommendations.length}):`)
      recommendations.forEach((rec, index) => {
        logger.warn(`    ${index + 1}. [${rec.type.toUpperCase()}] ${rec.message}`)
      })
    }
  }

  /**
   * Add analysis to history
   */
  addToHistory(analysis) {
    this.debugHistory.unshift(analysis)

    if (this.debugHistory.length > this.maxHistorySize) {
      this.debugHistory = this.debugHistory.slice(0, this.maxHistorySize)
    }
  }

  /**
   * Get debug statistics
   */
  getStatistics() {
    const stats = {
      totalAnalyses: this.debugHistory.length,
      recentAnalyses: this.debugHistory.slice(0, 10),
      commonIssues: this.getCommonIssues(),
      timestamp: new Date().toISOString()
    }

    return stats
  }

  /**
   * Get common issues from history
   */
  getCommonIssues() {
    const issues = {}

    this.debugHistory.forEach(analysis => {
      analysis.validation.criticalIssues.forEach(issue => {
        issues[issue] = (issues[issue] || 0) + 1
      })

      analysis.validation.warnings.forEach(warning => {
        issues[warning] = (issues[warning] || 0) + 1
      })
    })

    return Object.entries(issues)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([issue, count]) => ({ issue, count }))
  }

  /**
   * Clear debug history
   */
  clearHistory() {
    this.debugHistory = []
  }
}

// Create singleton instance
const canvasDebugger = new CanvasDebugger()

// Export utility functions
export const analyzeCanvas = (canvas, context) => canvasDebugger.analyzeCanvas(canvas, context)
export const getDebugStatistics = () => canvasDebugger.getStatistics()

export { canvasDebugger }
export default canvasDebugger