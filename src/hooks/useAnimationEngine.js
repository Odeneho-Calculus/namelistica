import { useState, useCallback, useRef } from 'react'
import { generateRandomConfig } from '../utils/animationConfig'

export const useAnimationEngine = () => {
  const [config, setConfig] = useState(() => generateRandomConfig())
  const [isAnimating, setIsAnimating] = useState(false)
  const animationIdRef = useRef(null)

  const updateConfig = useCallback((newConfig) => {
    setConfig(newConfig)
  }, [])

  const regenerateConfig = useCallback(() => {
    const newConfig = generateRandomConfig()
    setConfig(newConfig)
  }, [])

  const startAnimation = useCallback(() => {
    setIsAnimating(true)
  }, [])

  const stopAnimation = useCallback(() => {
    setIsAnimating(false)
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current)
      animationIdRef.current = null
    }
  }, [])

  const resetAnimation = useCallback(() => {
    stopAnimation()
    setIsAnimating(false)
  }, [stopAnimation])

  return {
    config,
    updateConfig,
    regenerateConfig,
    isAnimating,
    startAnimation,
    stopAnimation,
    resetAnimation
  }
}