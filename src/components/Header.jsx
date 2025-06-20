import React from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Palette, Zap } from 'lucide-react'

const Header = () => {
  return (
    <header className="border-b border-white/10 bg-black/20 backdrop-blur-md">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center space-x-3"
          >
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">Namelistica</h1>
              <p className="text-sm text-gray-400">Dynamic Text Animation Studio</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="hidden md:flex items-center space-x-6 text-sm text-gray-300"
          >
            <div className="flex items-center space-x-2">
              <Palette className="w-4 h-4 text-purple-400" />
              <span>AI-Powered Design</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-blue-400" />
              <span>Real-time Preview</span>
            </div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-pink-400" />
              <span>Multi-format Export</span>
            </div>
          </motion.div>
        </div>
      </div>
    </header>
  )
}

export default Header