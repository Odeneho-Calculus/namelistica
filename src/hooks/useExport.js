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

  return {
    exportPNG,
    isExporting,
    exportProgress
  }
}