/**
 * Test Runner for PNG Export System
 *
 * This utility provides comprehensive testing tools that can be used
 * in the browser console to diagnose and test the PNG export system.
 */

import { canvasExportSystem } from './canvasExportSystem.js'
import logger from './logger.js'

// Diagnostic utilities
const diagnostics = {
    /**
     * Analyze canvas reference
     */
    analyzeCanvas: (canvasInput) => {
        logger.info('🔍 Analyzing canvas reference...')

        const analysis = {
            inputType: typeof canvasInput,
            constructor: canvasInput?.constructor?.name || 'unknown',
            properties: [],
            methods: [],
            canvasResolution: null,
            validationResult: null
        }

        // Analyze properties
        if (canvasInput && typeof canvasInput === 'object') {
            analysis.properties = Object.getOwnPropertyNames(canvasInput).slice(0, 20)
            analysis.methods = analysis.properties.filter(prop => {
                try {
                    return typeof canvasInput[prop] === 'function'
                } catch {
                    return false
                }
            })
        }

        // Test canvas resolution
        try {
            const resolved = canvasExportSystem.resolveCanvasWithValidation(canvasInput)
            analysis.canvasResolution = {
                success: true,
                canvasType: resolved?.constructor?.name,
                dimensions: resolved ? `${resolved.width}x${resolved.height}` : 'unknown'
            }
        } catch (error) {
            analysis.canvasResolution = {
                success: false,
                error: error.message
            }
        }

        logger.info('📋 Canvas Analysis Results:', analysis)
        return analysis
    },

    /**
     * Test PNG export capability
     */
    testExport: async (canvasInput) => {
        logger.info('🧪 Testing PNG export...')

        try {
            const startTime = performance.now()
            const result = await canvasExportSystem.exportPNG(canvasInput, { quality: 1.0 })
            const duration = performance.now() - startTime

            const testResult = {
                success: true,
                format: result.format,
                size: result.blob.size,
                duration: `${duration.toFixed(2)}ms`,
                blobType: result.blob.type
            }

            logger.info(`✅ PNG export test successful:`, testResult)
            return testResult

        } catch (error) {
            const testResult = {
                success: false,
                error: error.message
            }

            logger.error(`❌ PNG export test failed:`, testResult)
            return testResult
        }
    },

    /**
     * Get system statistics
     */
    getStats: () => {
        const stats = canvasExportSystem.getExportStats()
        logger.info('📊 Export System Statistics:', stats)
        return stats
    },

    /**
     * Create test canvas
     */
    createTestCanvas: () => {
        logger.info('🎨 Creating test canvas...')

        const canvas = document.createElement('canvas')
        canvas.width = 400
        canvas.height = 300

        const ctx = canvas.getContext('2d')

        // Draw test pattern
        const gradient = ctx.createLinearGradient(0, 0, 400, 300)
        gradient.addColorStop(0, '#ff6b6b')
        gradient.addColorStop(0.5, '#4ecdc4')
        gradient.addColorStop(1, '#45b7d1')

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, 400, 300)

        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 24px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('TEST CANVAS', 200, 150)

        ctx.font = '16px Arial'
        ctx.fillText(new Date().toLocaleTimeString(), 200, 180)

        logger.info('✨ Test canvas created successfully')
        return canvas
    },

    /**
     * Quick PNG export test with generated canvas
     */
    quickTest: async () => {
        logger.info('🚀 Running quick PNG export test...')

        const testCanvas = diagnostics.createTestCanvas()
        const result = await diagnostics.testExport(testCanvas)

        // Cleanup
        testCanvas.width = 1
        testCanvas.height = 1

        return result
    },

    /**
     * Run comprehensive PNG export tests
     */
    runFullTests: async () => {
        logger.info('🧪 Running comprehensive PNG export system tests...')

        const results = {
            canvasCreation: null,
            canvasAnalysis: null,
            pngExport: null,
            systemStats: null
        }

        try {
            // Test 1: Canvas creation
            logger.info('Test 1: Canvas creation')
            const testCanvas = diagnostics.createTestCanvas()
            results.canvasCreation = { success: true, dimensions: `${testCanvas.width}x${testCanvas.height}` }

            // Test 2: Canvas analysis
            logger.info('Test 2: Canvas analysis')
            results.canvasAnalysis = diagnostics.analyzeCanvas(testCanvas)

            // Test 3: PNG export
            logger.info('Test 3: PNG export')
            results.pngExport = await diagnostics.testExport(testCanvas)

            // Test 4: System statistics
            logger.info('Test 4: System statistics')
            results.systemStats = diagnostics.getStats()

            // Cleanup
            testCanvas.width = 1
            testCanvas.height = 1

            logger.info('✅ All tests completed successfully!')
            logger.info('📋 Test Results Summary:', results)

        } catch (error) {
            logger.error('❌ Test suite failed:', error)
            results.error = error.message
        }

        return results
    }
}

// Make test functions available globally for console access
if (typeof window !== 'undefined') {
    window.namelistica = window.namelistica || {}
    window.namelistica.debug = {
        // Main test runner
        runFullTests: diagnostics.runFullTests,

        // Diagnostic tools
        analyzeCanvas: diagnostics.analyzeCanvas,
        testExport: diagnostics.testExport,
        getStats: diagnostics.getStats,
        createTestCanvas: diagnostics.createTestCanvas,
        quickTest: diagnostics.quickTest,

        // Direct access to export system
        exportSystem: canvasExportSystem,

        // Logger
        logger,

        // Helper functions
        help: () => {
            logger.info('🔧 Namelistica Debug Tools Help:')
            logger.info('================================')
            logger.info('🧪 runFullTests() - Run comprehensive PNG export system tests')
            logger.info('🔍 analyzeCanvas(canvas) - Analyze canvas reference structure')
            logger.info('📤 testExport(canvas) - Test PNG export')
            logger.info('📊 getStats() - Get export system statistics')
            logger.info('🎨 createTestCanvas() - Create a test canvas')
            logger.info('⚡ quickTest() - Quick PNG test with generated canvas')
            logger.info('💡 help() - Show this help message')
            logger.info('')
            logger.info('Example usage:')
            logger.info('  window.namelistica.debug.runFullTests()')
            logger.info('  window.namelistica.debug.quickTest()')
            logger.info('  window.namelistica.debug.analyzeCanvas(yourCanvas)')
        }
    }

    logger.info('🔧 Namelistica debug tools loaded!')
    logger.info('💡 Type window.namelistica.debug.help() for usage instructions')
}

export { diagnostics }