import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { motion } from 'framer-motion'
import { useCanvasAnimation } from '../hooks/useCanvasAnimation'
import logger from '../utils/logger'

const AnimationCanvas = forwardRef(({ text, config, isPlaying, isAnimating }, ref) => {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  const {
    startCanvasAnimation,
    stopCanvasAnimation,
    resetCanvasAnimation,
    updateCanvasConfig,
    getCanvasImageData,
    isCanvasReady,
    startRecording,
    stopRecording,
    isRecording: isCanvasRecording
  } = useCanvasAnimation(canvasRef, text, config)

  useImperativeHandle(ref, () => ({
    getImageData: getCanvasImageData,
    canvas: canvasRef.current,
    canvasElement: canvasRef.current, // Direct canvas element access
    current: canvasRef.current, // React ref compatibility
    startAnimation: startCanvasAnimation,
    stopAnimation: stopCanvasAnimation,
    resetAnimation: resetCanvasAnimation,
    startRecording: startRecording,
    stopRecording: stopRecording,
    isRecording: isCanvasRecording,
    // Canvas validation helpers
    isValidCanvas: () => canvasRef.current instanceof HTMLCanvasElement,
    getCanvasRef: () => canvasRef,
    getContext: (type = '2d') => canvasRef.current?.getContext(type)
  }))

  // Update config when it changes
  useEffect(() => {
    updateCanvasConfig(config)
  }, [config, updateCanvasConfig])

  // Handle play/pause state
  useEffect(() => {
    if (isPlaying) {
      startCanvasAnimation()
    } else {
      stopCanvasAnimation()
    }
  }, [isPlaying, startCanvasAnimation, stopCanvasAnimation])

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        // Force a re-render by updating the config
        updateCanvasConfig(config)
      }
    }

    const resizeObserver = new ResizeObserver(handleResize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [config, updateCanvasConfig])

  // Debug logging
  useEffect(() => {
    logger.debug('AnimationCanvas props updated:', {
      text: text?.substring(0, 20) + (text?.length > 20 ? '...' : ''),
      isPlaying,
      isAnimating,
      isCanvasReady,
      configType: config?.animation?.type
    })
  }, [text, isPlaying, isAnimating, isCanvasReady, config])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden"
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          background: 'transparent',
          imageRendering: 'auto'
        }}
      />

      {/* Overlay Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Ambient Glow */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at center, ${config?.colors?.primary || '#8b5cf6'}15 0%, transparent 70%)`
          }}
        />

        {/* Particle Overlay (CSS-based for performance) */}
        {config?.effects?.particles && (
          <div className="absolute inset-0">
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white/20 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0, 0.6, 0],
                  scale: [0, 1, 0]
                }}
                transition={{
                  duration: 4 + Math.random() * 3,
                  repeat: Infinity,
                  delay: Math.random() * 3,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Loading State */}
      {!isCanvasReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/50">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"
            />
            <p className="text-sm text-gray-400">Initializing canvas...</p>
          </div>
        </div>
      )}

      {/* Canvas Ready but No Content */}
      {isCanvasReady && (!text || !text.trim()) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-4xl mb-4"
            >
              ✨
            </motion.div>
            <p className="text-lg font-medium">Enter text to see the magic!</p>
            <p className="text-sm opacity-75">Type something in the text input above</p>
          </div>
        </div>
      )}

      {/* Animation Status Indicators */}
      {isCanvasReady && text && (
        <div className="absolute top-4 right-4 flex space-x-2">
          {isAnimating && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-3 h-3 bg-green-500 rounded-full shadow-lg"
              title="Animation Active"
            />
          )}
          {isCanvasRecording && (
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="w-3 h-3 bg-red-500 rounded-full shadow-lg"
              title="Recording"
            />
          )}
          {isPlaying && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full"
              title="Playing"
            />
          )}
        </div>
      )}

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-4 text-xs text-white/30 font-mono space-y-1">
          <div>Canvas: {isCanvasReady ? 'Ready' : 'Loading'}</div>
          <div>Text: {text ? `"${text.substring(0, 10)}${text.length > 10 ? '...' : ''}"` : 'None'}</div>
          <div>Animation: {config?.animation?.type || 'None'}</div>
          <div>Playing: {isPlaying ? 'Yes' : 'No'}</div>
        </div>
      )}

      {/* Watermark */}
      <div className="absolute bottom-4 right-4 text-xs text-white/20 font-mono">
        Namelistica
      </div>
    </div>
  )
})

AnimationCanvas.displayName = 'AnimationCanvas'

export default AnimationCanvas