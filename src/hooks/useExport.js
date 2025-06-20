import { useState, useCallback, useRef } from 'react'
import { canvasExportSystem } from '../utils/canvasExportSystem'
import logger from '../utils/logger'

export const useExport = (canvasRef) => {
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const exportSessionRef = useRef(null)

  const downloadFile = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const createProgressHandler = (format) => {
    return (progress) => {
      setExportProgress(Math.min(Math.max(progress, 0), 100))
    }
  }

  const handleExportError = (error, format) => {
    logger.error(`${format.toUpperCase()} export failed:`, error)
    setIsExporting(false)
    setExportProgress(0)
    throw error
  }

  const exportPNG = useCallback(async (options = {}) => {
    if (!canvasRef.current) {
      logger.error('Canvas reference is null')
      return
    }

    const sessionId = Math.random().toString(36).substr(2, 9)
    exportSessionRef.current = sessionId

    setIsExporting(true)
    setExportProgress(0)

    try {
      logger.info(`Starting PNG export (session: ${sessionId})`)

      const progressHandler = createProgressHandler('png')
      progressHandler(10)

      const result = await canvasExportSystem.exportPNG(canvasRef.current, {
        quality: options.quality || 1.0,
        ...options
      })

      progressHandler(100)

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `namelistica-${timestamp}.png`
      downloadFile(result.blob, filename)

      logger.info(`PNG export completed: ${filename} (${result.size} bytes, ${result.duration.toFixed(2)}ms)`)

    } catch (error) {
      handleExportError(error, 'png')
    } finally {
      setIsExporting(false)
      setExportProgress(0)
      exportSessionRef.current = null
    }
  }, [canvasRef])

  const exportJPG = useCallback(async (options = {}) => {
    if (!canvasRef.current) {
      logger.error('Canvas reference is null')
      return
    }

    setIsExporting(true)
    setExportProgress(0)

    try {
      logger.info('Starting JPG export')

      const progressHandler = createProgressHandler('jpg')
      progressHandler(10)

      const result = await canvasExportSystem.exportJPG(canvasRef.current, {
        quality: options.quality || 80,
        ...options
      })

      progressHandler(100)

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `namelistica-${timestamp}.jpg`
      downloadFile(result.blob, filename)

      logger.info(`JPG export completed: ${filename} (${result.size} bytes, ${result.duration.toFixed(2)}ms)`)

    } catch (error) {
      handleExportError(error, 'jpg')
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }, [canvasRef])

  const exportGIF = useCallback(async (options = {}) => {
    if (!canvasRef.current) {
      logger.error('Canvas reference is null')
      return
    }

    setIsExporting(true)
    setExportProgress(0)

    try {
      logger.info('Starting GIF export')

      const progressHandler = createProgressHandler('gif')

      const result = await canvasExportSystem.exportGIF(canvasRef.current, {
        quality: options.quality || 10,
        duration: options.duration || 4000,
        fps: 30,
        onProgress: progressHandler,
        ...options
      })

      progressHandler(100)

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const extension = result.format === 'gif' ? 'gif' : 'png'
      const filename = `namelistica-${timestamp}.${extension}`
      downloadFile(result.blob, filename)

      if (result.fallback) {
        logger.warn(`GIF export fell back to ${result.format.toUpperCase()}: ${result.originalError}`)
      }

      logger.info(`GIF export completed: ${filename} (${result.size} bytes, ${result.duration.toFixed(2)}ms)`)

    } catch (error) {
      handleExportError(error, 'gif')
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }, [canvasRef])

  const exportMP4 = useCallback(async (options = {}) => {
    if (!canvasRef.current) {
      logger.error('Canvas reference is null')
      return
    }

    setIsExporting(true)
    setExportProgress(0)

    try {
      logger.info('Starting MP4 export')

      const progressHandler = createProgressHandler('mp4')

      const result = await canvasExportSystem.exportMP4(canvasRef.current, {
        quality: options.quality || 80,
        duration: options.duration || 4000,
        onProgress: progressHandler,
        ...options
      })

      progressHandler(100)

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const extension = result.format === 'mp4' ? 'mp4' : result.format === 'webm' ? 'webm' : 'png'
      const filename = `namelistica-${timestamp}.${extension}`
      downloadFile(result.blob, filename)

      if (result.fallback) {
        logger.warn(`MP4 export fell back to ${result.format.toUpperCase()}: ${result.originalError}`)
      }

      logger.info(`MP4 export completed: ${filename} (${result.size} bytes, ${result.duration.toFixed(2)}ms)`)

    } catch (error) {
      handleExportError(error, 'mp4')
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }, [canvasRef])

  return {
    exportGIF,
    exportPNG,
    exportJPG,
    exportMP4,
    isExporting,
    exportProgress
  }
}