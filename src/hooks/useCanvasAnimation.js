import { useState, useEffect, useCallback, useRef } from 'react'
import logger from '../utils/logger'

export const useCanvasAnimation = (canvasRef, text, config) => {
  const [isCanvasReady, setIsCanvasReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const animationIdRef = useRef(null)
  const startTimeRef = useRef(null)
  const particlesRef = useRef([])
  const recordingCallbackRef = useRef(null)
  const lastConfigRef = useRef(null)

  // Initialize canvas and setup
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      logger.error('Failed to get 2D context from canvas')
      return
    }

    // Setup canvas with proper sizing
    const setupCanvas = () => {
      const container = canvas.parentElement
      if (!container) return

      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1

      // Set actual size
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr

      // Scale back down using CSS
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'

      // Scale the drawing context so everything draws at the correct size
      ctx.scale(dpr, dpr)

      logger.debug(`Canvas initialized: ${rect.width}x${rect.height} (DPR: ${dpr})`)
    }

    setupCanvas()

    // Initialize particles
    const initParticles = () => {
      const rect = canvas.getBoundingClientRect()
      particlesRef.current = Array.from({ length: 30 }, () => ({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.4 + 0.1,
        life: Math.random() * 200 + 100,
        maxLife: 200
      }))
    }

    initParticles()
    setIsCanvasReady(true)

    // Handle resize
    const handleResize = () => {
      setupCanvas()
      initParticles()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [canvasRef])

  // Main animation loop
  const animate = useCallback((timestamp) => {
    if (!canvasRef.current || !isCanvasReady) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()

    if (!startTimeRef.current) {
      startTimeRef.current = timestamp
    }

    const elapsed = (timestamp - startTimeRef.current) * (config?.animation?.speed || 1)

    // Clear canvas with proper alpha
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Draw background
    if (config?.colors?.background) {
      const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height)
      gradient.addColorStop(0, config.colors.background)
      gradient.addColorStop(1, config.colors.secondary || config.colors.background)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, rect.width, rect.height)
    } else {
      // Default dark background
      const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height)
      gradient.addColorStop(0, '#1e293b')
      gradient.addColorStop(1, '#0f172a')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, rect.width, rect.height)
    }

    // Draw particles if enabled
    if (config?.effects?.particles && particlesRef.current.length > 0) {
      particlesRef.current.forEach((particle, index) => {
        // Update particle
        particle.x += particle.vx
        particle.y += particle.vy
        particle.life -= 1

        // Wrap around screen
        if (particle.x < 0) particle.x = rect.width
        if (particle.x > rect.width) particle.x = 0
        if (particle.y < 0) particle.y = rect.height
        if (particle.y > rect.height) particle.y = 0

        // Reset particle if life is over
        if (particle.life <= 0) {
          particle.life = particle.maxLife
          particle.x = Math.random() * rect.width
          particle.y = Math.random() * rect.height
          particle.opacity = Math.random() * 0.4 + 0.1
        }

        // Draw particle
        ctx.save()
        const lifeRatio = particle.life / particle.maxLife
        const pulseOpacity = 0.5 + 0.5 * Math.sin(elapsed * 0.005 + index * 0.5)
        ctx.globalAlpha = particle.opacity * lifeRatio * pulseOpacity
        ctx.fillStyle = config?.colors?.accent || '#8b5cf6'
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })
    }

    // Draw text
    if (text && text.trim()) {
      const fontSize = Math.min(rect.width / text.length * 1.2, rect.height * 0.25, 80)
      ctx.font = `bold ${fontSize}px ${config?.font?.family || 'Inter'}, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const centerX = rect.width / 2
      const centerY = rect.height / 2

      // Apply text effects based on animation type
      const characters = text.split('')
      const totalWidth = ctx.measureText(text).width
      const startX = centerX - totalWidth / 2

      characters.forEach((char, index) => {
        if (!char.trim()) return // Skip spaces

        ctx.save()

        let offsetX = 0
        let offsetY = 0
        let rotation = 0
        let scale = 1
        let opacity = 1

        const charDelay = index * 150
        const charTime = Math.max(0, elapsed - charDelay)

        // Apply animation effects
        switch (config?.animation?.type) {
          case 'bounce':
            offsetY = Math.sin(charTime * 0.008) * 15
            break
          case 'wave':
            offsetY = Math.sin(charTime * 0.006 + index * 0.8) * 12
            break
          case 'rotate':
            rotation = Math.sin(charTime * 0.005) * 0.3
            break
          case 'scale':
            scale = 1 + Math.sin(charTime * 0.007) * 0.2
            break
          case 'fade':
            opacity = 0.6 + Math.sin(charTime * 0.004) * 0.4
            break
          case 'slide':
            offsetX = Math.sin(charTime * 0.003 + index * 0.5) * 8
            break
          case 'glitch':
            if (Math.random() > 0.97) {
              offsetX = (Math.random() - 0.5) * 6
              offsetY = (Math.random() - 0.5) * 6
            }
            break
          case 'elastic':
            const elasticScale = 1 + Math.sin(charTime * 0.008 + index * 0.3) * 0.15
            scale = elasticScale
            break
          default:
            // Default gentle pulse
            scale = 1 + Math.sin(charTime * 0.003 + index * 0.2) * 0.05
        }

        // Calculate character position
        const charWidth = ctx.measureText(char).width
        const charX = startX + ctx.measureText(text.substring(0, index)).width + charWidth / 2

        ctx.translate(charX + offsetX, centerY + offsetY)
        ctx.rotate(rotation)
        ctx.scale(scale, scale)
        ctx.globalAlpha = opacity

        // Apply glow effect
        if (config?.effects?.glow) {
          ctx.shadowColor = config?.colors?.primary || '#8b5cf6'
          ctx.shadowBlur = 15
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 0
        }

        // Apply gradient text
        if (config?.effects?.gradient && config?.colors?.primary && config?.colors?.secondary) {
          const textGradient = ctx.createLinearGradient(-charWidth / 2, -fontSize / 2, charWidth / 2, fontSize / 2)
          textGradient.addColorStop(0, config.colors.primary)
          textGradient.addColorStop(1, config.colors.secondary)
          ctx.fillStyle = textGradient
        } else {
          ctx.fillStyle = config?.colors?.primary || '#ffffff'
        }

        // Draw the character
        ctx.fillText(char, 0, 0)
        ctx.restore()
      })
    }

    // Call recording callback if recording
    if (isRecording && recordingCallbackRef.current) {
      recordingCallbackRef.current(canvas, elapsed)
    }

    // Continue animation if playing
    if (isPlaying) {
      animationIdRef.current = requestAnimationFrame(animate)
    }
  }, [canvasRef, isCanvasReady, text, config, isPlaying, isRecording])

  // Draw static frame when not playing
  const drawStaticFrame = useCallback(() => {
    if (!canvasRef.current || !isCanvasReady) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Draw background
    if (config?.colors?.background) {
      const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height)
      gradient.addColorStop(0, config.colors.background)
      gradient.addColorStop(1, config.colors.secondary || config.colors.background)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, rect.width, rect.height)
    } else {
      // Default dark background
      const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height)
      gradient.addColorStop(0, '#1e293b')
      gradient.addColorStop(1, '#0f172a')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, rect.width, rect.height)
    }

    // Draw static text
    if (text && text.trim()) {
      const fontSize = Math.min(rect.width / text.length * 1.2, rect.height * 0.25, 80)
      ctx.font = `bold ${fontSize}px ${config?.font?.family || 'Inter'}, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const centerX = rect.width / 2
      const centerY = rect.height / 2

      // Apply glow effect
      if (config?.effects?.glow) {
        ctx.shadowColor = config?.colors?.primary || '#8b5cf6'
        ctx.shadowBlur = 15
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
      }

      // Apply gradient text
      if (config?.effects?.gradient && config?.colors?.primary && config?.colors?.secondary) {
        const textGradient = ctx.createLinearGradient(-ctx.measureText(text).width / 2, -fontSize / 2, ctx.measureText(text).width / 2, fontSize / 2)
        textGradient.addColorStop(0, config.colors.primary)
        textGradient.addColorStop(1, config.colors.secondary)
        ctx.fillStyle = textGradient
      } else {
        ctx.fillStyle = config?.colors?.primary || '#ffffff'
      }

      ctx.fillText(text, centerX, centerY)
    }
  }, [canvasRef, isCanvasReady, text, config])

  // Redraw when config or text changes
  useEffect(() => {
    if (!isPlaying && isCanvasReady) {
      drawStaticFrame()
    }
  }, [text, config, isCanvasReady, isPlaying, drawStaticFrame])

  const startCanvasAnimation = useCallback(() => {
    if (!isCanvasReady) return
    setIsPlaying(true)
    startTimeRef.current = null
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current)
    }
    animationIdRef.current = requestAnimationFrame(animate)
    logger.debug('Canvas animation started')
  }, [isCanvasReady, animate])

  const stopCanvasAnimation = useCallback(() => {
    setIsPlaying(false)
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current)
      animationIdRef.current = null
    }
    // Draw static frame when stopped
    setTimeout(drawStaticFrame, 50)
    logger.debug('Canvas animation stopped')
  }, [drawStaticFrame])

  const resetCanvasAnimation = useCallback(() => {
    stopCanvasAnimation()
    startTimeRef.current = null

    // Reset particles
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      particlesRef.current = Array.from({ length: 30 }, () => ({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.4 + 0.1,
        life: Math.random() * 200 + 100,
        maxLife: 200
      }))
    }

    // Draw static frame after reset
    setTimeout(drawStaticFrame, 100)
    logger.debug('Canvas animation reset')
  }, [stopCanvasAnimation, canvasRef, drawStaticFrame])

  const updateCanvasConfig = useCallback((newConfig) => {
    lastConfigRef.current = newConfig
    // Redraw if not playing
    if (!isPlaying && isCanvasReady) {
      setTimeout(drawStaticFrame, 50)
    }
  }, [isPlaying, isCanvasReady, drawStaticFrame])

  const getCanvasImageData = useCallback(() => {
    if (!canvasRef.current) return null
    try {
      return canvasRef.current.toDataURL('image/png', 1.0)
    } catch (error) {
      logger.error('Failed to get canvas image data:', error)
      return null
    }
  }, [canvasRef])

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
    }
  }, [])

  const startRecording = useCallback((callback) => {
    setIsRecording(true)
    recordingCallbackRef.current = callback
    logger.debug('Canvas recording started')
  }, [])

  const stopRecording = useCallback(() => {
    setIsRecording(false)
    recordingCallbackRef.current = null
    logger.debug('Canvas recording stopped')
  }, [])

  return {
    startCanvasAnimation,
    stopCanvasAnimation,
    resetCanvasAnimation,
    updateCanvasConfig,
    getCanvasImageData,
    isCanvasReady,
    startRecording,
    stopRecording,
    isRecording
  }
}