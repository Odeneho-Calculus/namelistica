import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Download, FileImage, Loader } from 'lucide-react'

const ExportPanel = ({
  onClose,
  onExportPNG,
  isExporting,
  exportProgress
}) => {
  const [selectedFormat, setSelectedFormat] = useState('png')
  const [resolution, setResolution] = useState('1080p')

  const formats = [
    {
      id: 'png',
      name: 'PNG Image',
      icon: FileImage,
      description: 'High quality static image',
      sizes: ['720p', '1080p', '4K'],
      action: onExportPNG
    }
  ]

  const resolutions = {
    '480p': { width: 854, height: 480 },
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
    '4K': { width: 3840, height: 2160 }
  }

  const handleExport = () => {
    const selectedFormatData = formats.find(f => f.id === selectedFormat)
    const res = resolutions[resolution]

    if (selectedFormatData) {
      selectedFormatData.action({
        resolution: res,
        format: selectedFormat
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Export Animation</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Format Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">Export Format</label>
        <div className="grid grid-cols-1 gap-3">
          {formats.map((format) => {
            const Icon = format.icon
            return (
              <motion.button
                key={format.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedFormat(format.id)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                  selectedFormat === format.id
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Icon className="w-6 h-6 text-purple-400 mt-1" />
                  <div className="flex-1">
                    <div className="font-medium text-white">{format.name}</div>
                    <div className="text-sm text-gray-400">{format.description}</div>
                  </div>
                  {selectedFormat === format.id && (
                    <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Resolution Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">Resolution</label>
        <div className="grid grid-cols-2 gap-2">
          {formats.find(f => f.id === selectedFormat)?.sizes.map((size) => (
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
            <span>Export {formats.find(f => f.id === selectedFormat)?.name}</span>
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