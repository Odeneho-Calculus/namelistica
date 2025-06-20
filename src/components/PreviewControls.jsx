import React from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw, Download, Loader } from 'lucide-react'

const PreviewControls = ({
  isPlaying,
  onPlayPause,
  onReset,
  onExport,
  isAnimating
}) => {
  return (
    <div className="glass-effect rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
        <Play className="w-5 h-5 text-purple-400" />
        <span>Preview Controls</span>
      </h3>

      <div className="space-y-4">
        {/* Main Controls */}
        <div className="flex space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onPlayPause}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
              isPlaying
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>Play</span>
              </>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onReset}
            className="flex items-center justify-center p-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all duration-200"
          >
            <RotateCcw className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Export Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onExport}
          className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all duration-200"
        >
          <Download className="w-5 h-5" />
          <span>Export Animation</span>
        </motion.button>

        {/* Status Indicator */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              isAnimating ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
            }`} />
            <span className="text-gray-400">
              {isAnimating ? 'Animating' : 'Ready'}
            </span>
          </div>

          {isPlaying && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="flex items-center space-x-1 text-purple-400"
            >
              <Loader className="w-4 h-4" />
            </motion.div>
          )}
        </div>

        {/* Quick Tips */}
        <div className="bg-slate-800/30 rounded-lg p-3 text-xs text-gray-400">
          <p className="font-medium mb-2">💡 Quick Tips:</p>
          <ul className="space-y-1">
            <li>• Press Play to preview your animation</li>
            <li>• Reset to start from the beginning</li>
            <li>• Export in multiple formats (GIF, PNG, MP4)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default PreviewControls