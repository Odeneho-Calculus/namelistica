import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Type, Sparkles } from 'lucide-react'

const TextInput = ({ text, onChange, placeholder }) => {
  const [localText, setLocalText] = useState(text)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    setLocalText(text)
  }, [text])

  const handleChange = (e) => {
    const newText = e.target.value
    setLocalText(newText)
    onChange(newText)
  }

  const handleSuggestionClick = (suggestion) => {
    setLocalText(suggestion)
    onChange(suggestion)
  }

  const suggestions = [
    'Hello World',
    'Welcome',
    'Amazing',
    'Creative',
    'Fantastic',
    'Brilliant',
    'Stunning',
    'Magical'
  ]

  return (
    <div className="glass-effect rounded-xl p-6 space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <Type className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">Text Input</h3>
      </div>

      <div className="relative">
        <motion.div
          animate={{
            scale: isFocused ? 1.02 : 1,
            boxShadow: isFocused
              ? '0 0 0 2px rgba(168, 85, 247, 0.4)'
              : '0 0 0 1px rgba(255, 255, 255, 0.1)'
          }}
          transition={{ duration: 0.2 }}
          className="relative rounded-lg overflow-hidden"
        >
          <input
            type="text"
            value={localText}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="w-full px-4 py-3 bg-slate-800/80 text-white placeholder-gray-400 border-0 outline-none text-lg font-medium"
            maxLength={50}
          />
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 opacity-0 transition-opacity duration-300 group-focus-within:opacity-100"></div>
          </div>
        </motion.div>

        {localText && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <span className="text-sm text-gray-400">{localText.length}/50</span>
          </div>
        )}
      </div>

      {/* Quick Suggestions */}
      <div className="space-y-2">
        <p className="text-sm text-gray-400 flex items-center space-x-1">
          <Sparkles className="w-4 h-4" />
          <span>Quick suggestions:</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <motion.button
              key={suggestion}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-3 py-1 text-sm bg-slate-700/50 hover:bg-slate-600/50 text-gray-300 hover:text-white rounded-full transition-colors"
            >
              {suggestion}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Character Guidelines */}
      <div className="text-xs text-gray-500 bg-slate-800/30 rounded-lg p-3">
        <p className="font-medium mb-1">💡 Pro Tips:</p>
        <ul className="space-y-1">
          <li>• Keep text concise for best animation effects</li>
          <li>• Single words work great for dynamic animations</li>
          <li>• Special characters and emojis are supported</li>
        </ul>
      </div>
    </div>
  )
}

export default TextInput