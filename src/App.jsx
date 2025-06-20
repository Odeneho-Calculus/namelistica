import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from './components/Header'
import TextInput from './components/TextInput'
import AnimationCanvas from './components/AnimationCanvas'
import ControlPanel from './components/ControlPanel'
import ExportPanel from './components/ExportPanel'
import PreviewControls from './components/PreviewControls'
import { useAnimationEngine } from './hooks/useAnimationEngine'
import { useExport } from './hooks/useExport'
import { generateRandomConfig } from './utils/animationConfig'
import './utils/testRunner' // Load debug tools

function App() {
  const [text, setText] = useState('Namelistica')
  const [isPlaying, setIsPlaying] = useState(false)
  const [showExportPanel, setShowExportPanel] = useState(false)
  const canvasRef = useRef(null)

  const {
    config,
    updateConfig,
    regenerateConfig,
    isAnimating,
    startAnimation,
    stopAnimation,
    resetAnimation
  } = useAnimationEngine()

  const {
    exportGIF,
    exportPNG,
    exportJPG,
    exportMP4,
    isExporting,
    exportProgress
  } = useExport(canvasRef)

  const handleTextChange = useCallback((newText) => {
    setText(newText)
    if (isPlaying) {
      resetAnimation()
      setTimeout(() => startAnimation(), 100)
    }
  }, [isPlaying, resetAnimation, startAnimation])

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      stopAnimation()
    } else {
      startAnimation()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying, startAnimation, stopAnimation])

  const handleRandomize = useCallback(() => {
    const newConfig = generateRandomConfig()
    updateConfig(newConfig)
    if (isPlaying) {
      resetAnimation()
      setTimeout(() => startAnimation(), 100)
    }
  }, [updateConfig, isPlaying, resetAnimation, startAnimation])

  const handleReset = useCallback(() => {
    resetAnimation()
    setIsPlaying(false)
  }, [resetAnimation])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        <Header />

        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* Left Panel - Controls */}
            <div className="xl:col-span-4 space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <TextInput
                  text={text}
                  onChange={handleTextChange}
                  placeholder="Enter your text to animate..."
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <ControlPanel
                  config={config}
                  onConfigChange={updateConfig}
                  onRandomize={handleRandomize}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <PreviewControls
                  isPlaying={isPlaying}
                  onPlayPause={handlePlayPause}
                  onReset={handleReset}
                  onExport={() => setShowExportPanel(true)}
                  isAnimating={isAnimating}
                />
              </motion.div>
            </div>

            {/* Right Panel - Animation Canvas */}
            <div className="xl:col-span-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="glass-effect rounded-2xl p-6 h-[600px]"
              >
                <AnimationCanvas
                  ref={canvasRef}
                  text={text}
                  config={config}
                  isPlaying={isPlaying}
                  isAnimating={isAnimating}
                />
              </motion.div>
            </div>
          </div>
        </main>
      </div>

      {/* Export Panel Modal */}
      <AnimatePresence>
        {showExportPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowExportPanel(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <ExportPanel
                onClose={() => setShowExportPanel(false)}
                onExportGIF={exportGIF}
                onExportPNG={exportPNG}
                onExportJPG={exportJPG}
                onExportMP4={exportMP4}
                isExporting={isExporting}
                exportProgress={exportProgress}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App