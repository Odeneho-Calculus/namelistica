import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, Shuffle, Palette, Zap, Layers, Timer } from 'lucide-react'

const ControlPanel = ({ config, onConfigChange, onRandomize }) => {
  const [activeTab, setActiveTab] = useState('animation')

  const handleFontChange = (font) => {
    onConfigChange({
      ...config,
      font: {
        ...config.font,
        family: font
      }
    })
  }

  const handleAnimationChange = (type) => {
    onConfigChange({
      ...config,
      animation: {
        ...config.animation,
        type
      }
    })
  }

  const handleColorChange = (colorType, color) => {
    onConfigChange({
      ...config,
      colors: {
        ...config.colors,
        [colorType]: color
      }
    })
  }

  const handleEffectToggle = (effect) => {
    onConfigChange({
      ...config,
      effects: {
        ...config.effects,
        [effect]: !config.effects[effect]
      }
    })
  }

  const handleSpeedChange = (speed) => {
    onConfigChange({
      ...config,
      animation: {
        ...config.animation,
        speed
      }
    })
  }

  const fonts = [
    'Poppins', 'Montserrat', 'Roboto', 'Open Sans', 'Lato',
    'Oswald', 'Raleway', 'Nunito', 'Playfair Display', 'Source Sans Pro'
  ]

  const animationTypes = [
    { id: 'bounce', name: 'Bounce', icon: '⚡' },
    { id: 'wave', name: 'Wave', icon: '🌊' },
    { id: 'rotate', name: 'Rotate', icon: '🔄' },
    { id: 'scale', name: 'Scale', icon: '📏' },
    { id: 'fade', name: 'Fade', icon: '✨' },
    { id: 'slide', name: 'Slide', icon: '➡️' },
    { id: 'glitch', name: 'Glitch', icon: '📺' },
    { id: 'elastic', name: 'Elastic', icon: '🎈' }
  ]

  const colorPresets = [
    { name: 'Sunset', primary: '#ff6b6b', secondary: '#4ecdc4', accent: '#45b7d1' },
    { name: 'Ocean', primary: '#0066cc', secondary: '#0099ff', accent: '#00ccff' },
    { name: 'Forest', primary: '#27ae60', secondary: '#2ecc71', accent: '#58d68d' },
    { name: 'Neon', primary: '#ff0080', secondary: '#00ff80', accent: '#8000ff' },
    { name: 'Fire', primary: '#ff4500', secondary: '#ff6347', accent: '#ffa500' },
    { name: 'Purple', primary: '#8b5cf6', secondary: '#a855f7', accent: '#c084fc' }
  ]

  const tabs = [
    { id: 'animation', name: 'Animation', icon: Zap },
    { id: 'typography', name: 'Typography', icon: Settings },
    { id: 'colors', name: 'Colors', icon: Palette },
    { id: 'effects', name: 'Effects', icon: Layers }
  ]

  return (
    <div className="glass-effect rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <Settings className="w-5 h-5 text-purple-400" />
          <span>Animation Controls</span>
        </h3>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRandomize}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-200"
        >
          <Shuffle className="w-4 h-4" />
          <span>Randomize</span>
        </motion.button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-slate-800/50 rounded-lg p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.name}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'animation' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Animation Type</label>
              <div className="grid grid-cols-2 gap-2">
                {animationTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleAnimationChange(type.id)}
                    className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      config.animation?.type === type.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700/50 text-gray-300 hover:bg-slate-600/50'
                    }`}
                  >
                    <div className="text-lg mb-1">{type.icon}</div>
                    <div>{type.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                <Timer className="w-4 h-4" />
                <span>Speed: {config.animation?.speed || 1}x</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={config.animation?.speed || 1}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </motion.div>
        )}

        {activeTab === 'typography' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Font Family</label>
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                {fonts.map((font) => (
                  <button
                    key={font}
                    onClick={() => handleFontChange(font)}
                    className={`p-2 text-left rounded-lg text-sm transition-all duration-200 ${
                      config.font?.family === font
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700/50 text-gray-300 hover:bg-slate-600/50'
                    }`}
                    style={{ fontFamily: font }}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'colors' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Color Presets</label>
              <div className="grid grid-cols-2 gap-2">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handleColorChange('primary', preset.primary)}
                    className="p-3 rounded-lg text-sm font-medium bg-slate-700/50 hover:bg-slate-600/50 text-gray-300 transition-all duration-200"
                  >
                    <div className="flex space-x-1 mb-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.primary }}></div>
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.secondary }}></div>
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.accent }}></div>
                    </div>
                    <div>{preset.name}</div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'effects' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="space-y-3">
              {[
                { id: 'particles', name: 'Particles', desc: 'Floating sparkles and dots' },
                { id: 'glow', name: 'Glow Effect', desc: 'Soft radial glow around text' },
                { id: 'shadow', name: 'Drop Shadow', desc: 'Dynamic shadow effects' },
                { id: 'gradient', name: 'Gradient Fill', desc: 'Animated color gradients' }
              ].map((effect) => (
                <div
                  key={effect.id}
                  className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-white">{effect.name}</div>
                    <div className="text-xs text-gray-400">{effect.desc}</div>
                  </div>
                  <button
                    onClick={() => handleEffectToggle(effect.id)}
                    className={`w-12 h-6 rounded-full transition-all duration-200 ${
                      config.effects?.[effect.id]
                        ? 'bg-purple-600'
                        : 'bg-slate-600'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                        config.effects?.[effect.id]
                          ? 'transform translate-x-7'
                          : 'transform translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default ControlPanel