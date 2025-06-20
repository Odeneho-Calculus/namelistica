import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Download, FileImage, Loader } from 'lucide-react'

const ExportPanel = ({
  onClose,
  onExportPNG,
  isExporting,
  exportProgress
}) => {
  const [resolution, setResolution] = useState('1080p')

  const resolutions = {
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
    '4K': { width: 3840, height: 2160 }
  }

  const availableResolutions = ['720p', '1080p', '4K']

  const handleExport = () => {
    const res = resolutions[resolution]
    onExportPNG({
      resolution: res,
      format: 'png'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Export PNG Image</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Format Info */}
      <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
        <div className="flex items-start space-x-3">
          <FileImage className="w-6 h-6 text-purple-400 mt-1" />
          <div className="flex-1">
            <div className="font-medium text-white">PNG Image</div>
            <div className="text-sm text-gray-400">High quality lossless static image</div>
          </div>
        </div>
      </div>

      {/* Resolution Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">Resolution</label>
        <div className="grid grid-cols-3 gap-2">
          {availableResolutions.map((size) => (
            <button
              key={size}
              onClick={() => setResolution(size)}
              className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                resolution === size
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700/50 text-gray-300 hover:bg-slate-600/50'
              }`}
            >
              {size}
              <div className="text-xs opacity-75">
                {resolutions[size].width}×{resolutions[size].height}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Export Progress */}
      {isExporting && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Loader className="w-4 h-4 text-purple-400 animate-spin" />
            <span className="text-sm text-gray-300">Exporting... {exportProgress}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
              style={{ width: `${exportProgress}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${exportProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Export Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleExport}
        disabled={isExporting}
        className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
          isExporting
            ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
        }`}
      >
        {isExporting ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            <span>Exporting...</span>
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            <span>Export PNG Image</span>
          </>
        )}
      </motion.button>

      {/* File Size Estimate */}
      <div className="bg-slate-800/30 rounded-lg p-3 text-xs text-gray-400">
        <p className="font-medium mb-1">📁 Estimated file size:</p>
        <p>
          ~{Math.round(resolutions[resolution].width * resolutions[resolution].height * 0.000003)}MB
        </p>
      </div>
    </div>
  )
}

export default ExportPanel