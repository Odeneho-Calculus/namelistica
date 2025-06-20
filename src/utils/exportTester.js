/**
 * Export System Tester
 *
 * This utility provides comprehensive testing for the export system
 * to verify that all fixes are working correctly.
 */

import logger from './logger.js'
import { canvasDebugger } from './canvasDebugger.js'
import { canvasReferenceResolver } from './canvasReferenceResolver.js'
import { exportManager } from './exportManager.js'

export class ExportTester {
  constructor() {
    this.testResults = []
    this.testCanvas = null
  }

  /**
   * Run comprehensive export system tests
   */
  async runAllTests() {
    logger.info('Starting comprehensive export system tests...')

    const testSuite = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    }

    // Create test canvas
    await this.createTestCanvas()

    // Run individual tests
    const tests = [
      () => this.testCanvasCreation(),
      () => this.testCanvasReferenceResolution(),
      () => this.testCanvasValidation(),
      () => this.testPNGExport(),
      () => this.testJPGExport(),
      () => this.testReactRefSimulation(),
      () => this.testComponentRefSimulation(),
      () => this.testErrorHandling()
    ]

    for (const test of tests) {
      try {
        const result = await test()
        testSuite.tests.push(result)
        testSuite.summary.total++

        if (result.passed) {
          testSuite.summary.passed++
        } else {
          testSuite.summary.failed++
        }

        if (result.warnings && result.warnings.length > 0) {
          testSuite.summary.warnings += result.warnings.length
        }
      } catch (error) {
        const errorResult = {
          name: 'Unknown Test',
          passed: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
        testSuite.tests.push(errorResult)
        testSuite.summary.total++
        testSuite.summary.failed++
      }
    }

    // Cleanup
    this.cleanupTestCanvas()

    // Log results
    this.logTestResults(testSuite)

    return testSuite
  }

  /**
   * Create test canvas
   */
  async createTestCanvas() {
    this.testCanvas = document.createElement('canvas')
    this.testCanvas.width = 800
    this.testCanvas.height = 600

    const ctx = this.testCanvas.getContext('2d')

    // Draw test content
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, 800, 600)

    ctx.fillStyle = '#16213e'
    ctx.fillRect(50, 50, 700, 500)

    ctx.fillStyle = '#0f3460'
    ctx.fillRect(100, 100, 600, 400)

    // Add text
    ctx.fillStyle = '#e94560'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('NAMELISTICA', 400, 250)

    ctx.fillStyle = '#f5f5f5'
    ctx.font = '24px Arial'
    ctx.fillText('Export Test Canvas', 400, 300)

    // Add timestamp
    ctx.fillStyle = '#888'
    ctx.font = '16px Arial'
    ctx.fillText(new Date().toISOString(), 400, 350)

    logger.debug('Test canvas created successfully')
  }

  /**
   * Test canvas creation
   */
  async testCanvasCreation() {
    const test = {
      name: 'Canvas Creation Test',
      passed: false,
      details: {},
      warnings: [],
      timestamp: new Date().toISOString()
    }

    try {
      test.details.canvasExists = !!this.testCanvas
      test.details.canvasType = this.testCanvas?.constructor?.name
      test.details.dimensions = `${this.testCanvas?.width}x${this.testCanvas?.height}`
      test.details.hasContext = !!this.testCanvas?.getContext('2d')
      test.details.hasToDataURL = typeof this.testCanvas?.toDataURL === 'function'

      test.passed = test.details.canvasExists &&
                   test.details.hasContext &&
                   test.details.hasToDataURL

      if (!test.passed) {
        test.error = 'Test canvas creation failed'
      }

    } catch (error) {
      test.error = error.message
    }

    return test
  }

  /**
   * Test canvas reference resolution
   */
  async testCanvasReferenceResolution() {
    const test = {
      name: 'Canvas Reference Resolution Test',
      passed: false,
      details: {},
      warnings: [],
      timestamp: new Date().toISOString()
    }

    try {
      // Test direct canvas
      const directResult = canvasReferenceResolver.getValidatedCanvas(this.testCanvas)
      test.details.directResolution = {
        success: directResult.success,
        type: directResult.type,
        error: directResult.error
      }

      // Test React ref simulation
      const reactRef = { current: this.testCanvas }
      const refResult = canvasReferenceResolver.getValidatedCanvas(reactRef)
      test.details.reactRefResolution = {
        success: refResult.success,
        type: refResult.type,
        error: refResult.error
      }

      // Test component simulation
      const component = {
        canvas: this.testCanvas,
        canvasElement: this.testCanvas,
        isValidCanvas: () => true
      }
      const componentResult = canvasReferenceResolver.getValidatedCanvas(component)
      test.details.componentResolution = {
        success: componentResult.success,
        type: componentResult.type,
        error: componentResult.error
      }

      test.passed = directResult.success && refResult.success && componentResult.success

      if (!test.passed) {
        test.error = 'One or more resolution tests failed'
      }

    } catch (error) {
      test.error = error.message
    }

    return test
  }

  /**
   * Test canvas validation
   */
  async testCanvasValidation() {
    const test = {
      name: 'Canvas Validation Test',
      passed: false,
      details: {},
      warnings: [],
      timestamp: new Date().toISOString()
    }

    try {
      // Test canvas debugger analysis
      const analysis = canvasDebugger.analyzeCanvas(this.testCanvas, 'validation-test')

      test.details.analysis = {
        inputType: analysis.input.constructor,
        resolutionSuccess: analysis.resolution.success,
        validationValid: analysis.validation.overallValid,
        criticalIssues: analysis.validation.criticalIssues.length,
        warnings: analysis.validation.warnings.length,
        supportedFormats: analysis.capabilities.formats.length,
        features: analysis.capabilities.features.length
      }

      test.passed = analysis.resolution.success &&
                   analysis.validation.overallValid &&
                   analysis.validation.criticalIssues.length === 0

      if (analysis.validation.warnings.length > 0) {
        test.warnings = analysis.validation.warnings
      }

      if (!test.passed) {
        test.error = `Validation failed: ${analysis.validation.criticalIssues.join(', ')}`
      }

    } catch (error) {
      test.error = error.message
    }

    return test
  }

  /**
   * Test PNG export
   */
  async testPNGExport() {
    const test = {
      name: 'PNG Export Test',
      passed: false,
      details: {},
      warnings: [],
      timestamp: new Date().toISOString()
    }

    try {
      const startTime = performance.now()

      const result = await exportManager.exportPNG(this.testCanvas, {
        quality: 1.0
      })

      const endTime = performance.now()

      test.details.exportTime = `${(endTime - startTime).toFixed(2)}ms`
      test.details.blobSize = result.blob.size
      test.details.blobType = result.blob.type
      test.details.format = result.format

      test.passed = result.blob &&
                   result.blob.size > 0 &&
                   result.blob.type.includes('png')

      if (!test.passed) {
        test.error = 'PNG export failed or produced invalid result'
      }

    } catch (error) {
      test.error = error.message
    }

    return test
  }

  /**
   * Test JPG export
   */
  async testJPGExport() {
    const test = {
      name: 'JPG Export Test',
      passed: false,
      details: {},
      warnings: [],
      timestamp: new Date().toISOString()
    }

    try {
      const startTime = performance.now()

      const result = await exportManager.exportJPG(this.testCanvas, {
        quality: 80
      })

      const endTime = performance.now()

      test.details.exportTime = `${(endTime - startTime).toFixed(2)}ms`
      test.details.blobSize = result.blob.size
      test.details.blobType = result.blob.type
      test.details.format = result.format

      test.passed = result.blob &&
                   result.blob.size > 0 &&
                   result.blob.type.includes('jpeg')

      if (!test.passed) {
        test.error = 'JPG export failed or produced invalid result'
      }

    } catch (error) {
      test.error = error.message
    }

    return test
  }

  /**
   * Test React ref simulation
   */
  async testReactRefSimulation() {
    const test = {
      name: 'React Ref Simulation Test',
      passed: false,
      details: {},
      warnings: [],
      timestamp: new Date().toISOString()
    }

    try {
      // Simulate React ref structure
      const reactRef = { current: this.testCanvas }

      const result = await exportManager.exportPNG(reactRef, {
        quality: 0.8
      })

      test.details.blobSize = result.blob.size
      test.details.blobType = result.blob.type

      test.passed = result.blob && result.blob.size > 0

      if (!test.passed) {
        test.error = 'React ref simulation export failed'
      }

    } catch (error) {
      test.error = error.message
    }

    return test
  }

  /**
   * Test component ref simulation
   */
  async testComponentRefSimulation() {
    const test = {
      name: 'Component Ref Simulation Test',
      passed: false,
      details: {},
      warnings: [],
      timestamp: new Date().toISOString()
    }

    try {
      // Simulate AnimationCanvas component structure
      const componentRef = {
        canvas: this.testCanvas,
        canvasElement: this.testCanvas,
        current: this.testCanvas,
        isValidCanvas: () => true,
        getCanvasRef: () => ({ current: this.testCanvas }),
        getContext: (type) => this.testCanvas.getContext(type)
      }

      const result = await exportManager.exportPNG(componentRef, {
        quality: 0.8
      })

      test.details.blobSize = result.blob.size
      test.details.blobType = result.blob.type

      test.passed = result.blob && result.blob.size > 0

      if (!test.passed) {
        test.error = 'Component ref simulation export failed'
      }

    } catch (error) {
      test.error = error.message
    }

    return test
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    const test = {
      name: 'Error Handling Test',
      passed: false,
      details: {},
      warnings: [],
      timestamp: new Date().toISOString()
    }

    try {
      const errorTests = []

      // Test null canvas
      try {
        await exportManager.exportPNG(null)
        errorTests.push({ name: 'null canvas', handled: false })
      } catch (error) {
        errorTests.push({ name: 'null canvas', handled: true, error: error.message })
      }

      // Test undefined canvas
      try {
        await exportManager.exportPNG(undefined)
        errorTests.push({ name: 'undefined canvas', handled: false })
      } catch (error) {
        errorTests.push({ name: 'undefined canvas', handled: true, error: error.message })
      }

      // Test invalid object
      try {
        await exportManager.exportPNG({ invalid: 'object' })
        errorTests.push({ name: 'invalid object', handled: false })
      } catch (error) {
        errorTests.push({ name: 'invalid object', handled: true, error: error.message })
      }

      test.details.errorTests = errorTests
      test.passed = errorTests.every(t => t.handled)

      if (!test.passed) {
        test.error = 'Some error cases were not properly handled'
      }

    } catch (error) {
      test.error = error.message
    }

    return test
  }

  /**
   * Cleanup test canvas
   */
  cleanupTestCanvas() {
    if (this.testCanvas) {
      this.testCanvas.width = 1
      this.testCanvas.height = 1
      this.testCanvas = null
    }
  }

  /**
   * Log test results
   */
  logTestResults(testSuite) {
    logger.info('='.repeat(60))
    logger.info('EXPORT SYSTEM TEST RESULTS')
    logger.info('='.repeat(60))
    logger.info(`Total Tests: ${testSuite.summary.total}`)
    logger.info(`Passed: ${testSuite.summary.passed}`)
    logger.info(`Failed: ${testSuite.summary.failed}`)
    logger.info(`Warnings: ${testSuite.summary.warnings}`)
    logger.info(`Success Rate: ${((testSuite.summary.passed / testSuite.summary.total) * 100).toFixed(1)}%`)
    logger.info('-'.repeat(60))

    testSuite.tests.forEach((test, index) => {
      const status = test.passed ? '✅ PASS' : '❌ FAIL'
      logger.info(`${index + 1}. ${status} - ${test.name}`)

      if (test.error) {
        logger.error(`   Error: ${test.error}`)
      }

      if (test.warnings && test.warnings.length > 0) {
        logger.warn(`   Warnings: ${test.warnings.join(', ')}`)
      }

      if (test.details && Object.keys(test.details).length > 0) {
        logger.debug(`   Details:`, test.details)
      }
    })

    logger.info('='.repeat(60))
  }
}

// Create singleton instance
const exportTester = new ExportTester()

// Export utility functions
export const runExportTests = () => exportTester.runAllTests()

export { exportTester }
export default exportTester