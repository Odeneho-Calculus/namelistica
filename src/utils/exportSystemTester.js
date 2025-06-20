/**
 * Comprehensive Export System Tester
 *
 * This utility provides thorough testing of the export system to ensure
 * all canvas reference resolution and export functionality works correctly.
 */

import logger from './logger.js'
import { canvasExportSystem } from './canvasExportSystem.js'

export class ExportSystemTester {
    constructor() {
        this.testResults = []
        this.testCanvas = null
        this.testStartTime = null
    }

    /**
     * Run comprehensive export system tests
     */
    async runAllTests() {
        logger.info('🚀 Starting comprehensive export system tests...')
        this.testStartTime = performance.now()

        const testSuite = {
            timestamp: new Date().toISOString(),
            tests: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0,
                duration: 0
            }
        }

        // Create test canvas
        await this.createTestCanvas()

        // Define test cases
        const testCases = [
            { name: 'Canvas Creation', test: () => this.testCanvasCreation() },
            { name: 'Direct Canvas Export PNG', test: () => this.testDirectCanvasPNG() },
            { name: 'Direct Canvas Export JPG', test: () => this.testDirectCanvasJPG() },
            { name: 'React Ref Simulation', test: () => this.testReactRefExport() },
            { name: 'Component Ref Simulation', test: () => this.testComponentRefExport() },
            { name: 'Nested Ref Resolution', test: () => this.testNestedRefResolution() },
            { name: 'Error Handling - Null Canvas', test: () => this.testNullCanvasError() },
            { name: 'Error Handling - Invalid Object', test: () => this.testInvalidObjectError() },
            { name: 'Canvas Validation', test: () => this.testCanvasValidation() },
            { name: 'Multiple Export Formats', test: () => this.testMultipleFormats() }
        ]

        // Run tests
        for (const testCase of testCases) {
            try {
                logger.info(`🧪 Running test: ${testCase.name}`)
                const result = await testCase.test()
                result.name = testCase.name
                testSuite.tests.push(result)
                testSuite.summary.total++

                if (result.passed) {
                    testSuite.summary.passed++
                    logger.info(`✅ ${testCase.name} - PASSED`)
                } else {
                    testSuite.summary.failed++
                    logger.error(`❌ ${testCase.name} - FAILED: ${result.error}`)
                }

                if (result.warnings && result.warnings.length > 0) {
                    testSuite.summary.warnings += result.warnings.length
                    result.warnings.forEach(warning => {
                        logger.warn(`⚠️  ${testCase.name} - WARNING: ${warning}`)
                    })
                }
            } catch (error) {
                const errorResult = {
                    name: testCase.name,
                    passed: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                }
                testSuite.tests.push(errorResult)
                testSuite.summary.total++
                testSuite.summary.failed++
                logger.error(`💥 ${testCase.name} - CRASHED: ${error.message}`)
            }
        }

        // Cleanup
        this.cleanupTestCanvas()

        // Calculate duration
        testSuite.summary.duration = performance.now() - this.testStartTime

        // Log final results
        this.logFinalResults(testSuite)

        return testSuite
    }

    /**
     * Create test canvas with content
     */
    async createTestCanvas() {
        this.testCanvas = document.createElement('canvas')
        this.testCanvas.width = 800
        this.testCanvas.height = 600

        const ctx = this.testCanvas.getContext('2d')

        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, 800, 600)
        gradient.addColorStop(0, '#667eea')
        gradient.addColorStop(1, '#764ba2')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, 800, 600)

        // Add geometric shapes
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(100, 100, 200, 150)

        ctx.fillStyle = '#ff6b6b'
        ctx.beginPath()
        ctx.arc(600, 200, 80, 0, Math.PI * 2)
        ctx.fill()

        // Add text
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 48px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('NAMELISTICA', 400, 350)

        ctx.font = '24px Arial'
        ctx.fillText('Export System Test', 400, 400)

        // Add timestamp
        ctx.fillStyle = '#cccccc'
        ctx.font = '16px Arial'
        ctx.fillText(new Date().toISOString(), 400, 450)

        logger.debug('✨ Test canvas created successfully')
    }

    /**
     * Test canvas creation
     */
    async testCanvasCreation() {
        const test = {
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
            test.details.canExportPNG = false

            // Test PNG export capability
            try {
                const dataURL = this.testCanvas.toDataURL('image/png', 0.1)
                test.details.canExportPNG = dataURL.startsWith('data:image/png')
            } catch (error) {
                test.warnings.push(`PNG export test failed: ${error.message}`)
            }

            test.passed = test.details.canvasExists &&
                test.details.hasContext &&
                test.details.hasToDataURL &&
                test.details.canExportPNG

            if (!test.passed) {
                test.error = 'Test canvas creation or validation failed'
            }

        } catch (error) {
            test.error = error.message
        }

        return test
    }

    /**
     * Test direct canvas PNG export
     */
    async testDirectCanvasPNG() {
        const test = {
            passed: false,
            details: {},
            warnings: [],
            timestamp: new Date().toISOString()
        }

        try {
            const startTime = performance.now()

            const result = await canvasExportSystem.exportPNG(this.testCanvas, {
                quality: 1.0
            })

            const endTime = performance.now()

            test.details.exportTime = `${(endTime - startTime).toFixed(2)}ms`
            test.details.blobSize = result.blob.size
            test.details.blobType = result.blob.type
            test.details.format = result.format
            test.details.exportId = result.exportId

            test.passed = result.blob &&
                result.blob.size > 0 &&
                result.blob.type.includes('png') &&
                result.format === 'png'

            if (!test.passed) {
                test.error = 'PNG export failed or produced invalid result'
            }

        } catch (error) {
            test.error = error.message
        }

        return test
    }

    /**
     * Test direct canvas JPG export
     */
    async testDirectCanvasJPG() {
        const test = {
            passed: false,
            details: {},
            warnings: [],
            timestamp: new Date().toISOString()
        }

        try {
            const startTime = performance.now()

            const result = await canvasExportSystem.exportJPG(this.testCanvas, {
                quality: 80
            })

            const endTime = performance.now()

            test.details.exportTime = `${(endTime - startTime).toFixed(2)}ms`
            test.details.blobSize = result.blob.size
            test.details.blobType = result.blob.type
            test.details.format = result.format

            test.passed = result.blob &&
                result.blob.size > 0 &&
                result.blob.type.includes('jpeg') &&
                result.format === 'jpg'

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
    async testReactRefExport() {
        const test = {
            passed: false,
            details: {},
            warnings: [],
            timestamp: new Date().toISOString()
        }

        try {
            // Simulate React ref structure
            const reactRef = { current: this.testCanvas }

            const result = await canvasExportSystem.exportPNG(reactRef, {
                quality: 0.8
            })

            test.details.blobSize = result.blob.size
            test.details.blobType = result.blob.type
            test.details.resolvedFromRef = true

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
    async testComponentRefExport() {
        const test = {
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

            const result = await canvasExportSystem.exportPNG(componentRef, {
                quality: 0.8
            })

            test.details.blobSize = result.blob.size
            test.details.blobType = result.blob.type
            test.details.resolvedFromComponent = true

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
     * Test nested ref resolution
     */
    async testNestedRefResolution() {
        const test = {
            passed: false,
            details: {},
            warnings: [],
            timestamp: new Date().toISOString()
        }

        try {
            // Create deeply nested reference structure
            const nestedRef = {
                current: {
                    canvas: {
                        current: this.testCanvas
                    }
                }
            }

            const result = await canvasExportSystem.exportPNG(nestedRef, {
                quality: 0.5
            })

            test.details.blobSize = result.blob.size
            test.details.blobType = result.blob.type
            test.details.nestedLevels = 3

            test.passed = result.blob && result.blob.size > 0

            if (!test.passed) {
                test.error = 'Nested ref resolution export failed'
            }

        } catch (error) {
            test.error = error.message
        }

        return test
    }

    /**
     * Test null canvas error handling
     */
    async testNullCanvasError() {
        const test = {
            passed: false,
            details: {},
            warnings: [],
            timestamp: new Date().toISOString()
        }

        try {
            await canvasExportSystem.exportPNG(null)
            test.error = 'Expected error for null canvas, but export succeeded'
        } catch (error) {
            test.passed = true
            test.details.errorMessage = error.message
            test.details.errorHandled = true
        }

        return test
    }

    /**
     * Test invalid object error handling
     */
    async testInvalidObjectError() {
        const test = {
            passed: false,
            details: {},
            warnings: [],
            timestamp: new Date().toISOString()
        }

        try {
            await canvasExportSystem.exportPNG({ invalid: 'object', notACanvas: true })
            test.error = 'Expected error for invalid object, but export succeeded'
        } catch (error) {
            test.passed = true
            test.details.errorMessage = error.message
            test.details.errorHandled = true
        }

        return test
    }

    /**
     * Test canvas validation
     */
    async testCanvasValidation() {
        const test = {
            passed: false,
            details: {},
            warnings: [],
            timestamp: new Date().toISOString()
        }

        try {
            // Test with valid canvas
            await canvasExportSystem.resolveCanvasWithValidation(this.testCanvas)
            test.details.validCanvasResolved = true

            // Test with invalid dimensions
            const invalidCanvas = document.createElement('canvas')
            invalidCanvas.width = 0
            invalidCanvas.height = 0

            try {
                await canvasExportSystem.resolveCanvasWithValidation(invalidCanvas)
                test.warnings.push('Invalid dimensions canvas was not rejected')
            } catch (error) {
                test.details.invalidDimensionsRejected = true
            }

            test.passed = test.details.validCanvasResolved && test.details.invalidDimensionsRejected

            if (!test.passed) {
                test.error = 'Canvas validation tests failed'
            }

        } catch (error) {
            test.error = error.message
        }

        return test
    }

    /**
     * Test multiple export formats
     */
    async testMultipleFormats() {
        const test = {
            passed: false,
            details: {},
            warnings: [],
            timestamp: new Date().toISOString()
        }

        try {
            const formats = ['PNG', 'JPG']
            const results = {}

            for (const format of formats) {
                try {
                    const exportMethod = format === 'PNG' ?
                        canvasExportSystem.exportPNG :
                        canvasExportSystem.exportJPG

                    const result = await exportMethod(this.testCanvas, {
                        quality: format === 'PNG' ? 1.0 : 80
                    })

                    results[format] = {
                        success: true,
                        size: result.blob.size,
                        type: result.blob.type,
                        format: result.format
                    }
                } catch (error) {
                    results[format] = {
                        success: false,
                        error: error.message
                    }
                    test.warnings.push(`${format} export failed: ${error.message}`)
                }
            }

            test.details.formatResults = results
            test.passed = Object.values(results).every(r => r.success)

            if (!test.passed) {
                test.error = 'One or more format exports failed'
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
        logger.debug('🧹 Test canvas cleaned up')
    }

    /**
     * Log final test results
     */
    logFinalResults(testSuite) {
        const { summary } = testSuite
        const successRate = ((summary.passed / summary.total) * 100).toFixed(1)

        logger.info('='.repeat(80))
        logger.info('🎯 EXPORT SYSTEM TEST RESULTS')
        logger.info('='.repeat(80))
        logger.info(`📊 Total Tests: ${summary.total}`)
        logger.info(`✅ Passed: ${summary.passed}`)
        logger.info(`❌ Failed: ${summary.failed}`)
        logger.info(`⚠️  Warnings: ${summary.warnings}`)
        logger.info(`⏱️  Duration: ${summary.duration.toFixed(2)}ms`)
        logger.info(`🎯 Success Rate: ${successRate}%`)

        if (summary.failed === 0) {
            logger.info('🎉 ALL TESTS PASSED! Export system is working correctly.')
        } else {
            logger.warn(`⚠️  ${summary.failed} test(s) failed. Check the details above.`)
        }

        logger.info('='.repeat(80))

        // Log detailed results for failed tests
        const failedTests = testSuite.tests.filter(t => !t.passed)
        if (failedTests.length > 0) {
            logger.info('📋 FAILED TEST DETAILS:')
            failedTests.forEach((test, index) => {
                logger.error(`${index + 1}. ${test.name}: ${test.error}`)
                if (test.details && Object.keys(test.details).length > 0) {
                    logger.debug(`   Details:`, test.details)
                }
            })
        }
    }
}

// Create singleton instance
const exportSystemTester = new ExportSystemTester()

// Export utility functions
export const runExportSystemTests = () => exportSystemTester.runAllTests()

// Make available globally for console access
if (typeof window !== 'undefined') {
    window.namelistica = window.namelistica || {}
    window.namelistica.testExportSystem = runExportSystemTests

    logger.info('🔧 Export system tester loaded. Use window.namelistica.testExportSystem() to run tests.')
}

export { exportSystemTester }
export default exportSystemTester