// Animation configuration generator and utilities

const fonts = [
  'Poppins', 'Montserrat', 'Roboto', 'Open Sans', 'Lato',
  'Oswald', 'Raleway', 'Nunito', 'Playfair Display', 'Source Sans Pro'
]

const animationTypes = [
  'bounce', 'wave', 'rotate', 'scale', 'fade', 'slide', 'glitch', 'elastic'
]

const colorPalettes = [
  {
    name: 'Sunset',
    primary: '#ff6b6b',
    secondary: '#4ecdc4',
    accent: '#45b7d1',
    background: 'rgba(255, 107, 107, 0.1)'
  },
  {
    name: 'Ocean',
    primary: '#0066cc',
    secondary: '#0099ff',
    accent: '#00ccff',
    background: 'rgba(0, 102, 204, 0.1)'
  },
  {
    name: 'Forest',
    primary: '#27ae60',
    secondary: '#2ecc71',
    accent: '#58d68d',
    background: 'rgba(39, 174, 96, 0.1)'
  },
  {
    name: 'Neon',
    primary: '#ff0080',
    secondary: '#00ff80',
    accent: '#8000ff',
    background: 'rgba(255, 0, 128, 0.1)'
  },
  {
    name: 'Fire',
    primary: '#ff4500',
    secondary: '#ff6347',
    accent: '#ffa500',
    background: 'rgba(255, 69, 0, 0.1)'
  },
  {
    name: 'Purple',
    primary: '#8b5cf6',
    secondary: '#a855f7',
    accent: '#c084fc',
    background: 'rgba(139, 92, 246, 0.1)'
  },
  {
    name: 'Cyberpunk',
    primary: '#00ff9f',
    secondary: '#ff0080',
    accent: '#ffff00',
    background: 'rgba(0, 255, 159, 0.1)'
  },
  {
    name: 'Pastel',
    primary: '#ffb3ba',
    secondary: '#bae1ff',
    accent: '#ffffba',
    background: 'rgba(255, 179, 186, 0.1)'
  }
]

const getRandomElement = (array) => {
  return array[Math.floor(Math.random() * array.length)]
}

const getRandomFloat = (min, max) => {
  return Math.random() * (max - min) + min
}

const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export const generateRandomConfig = () => {
  const palette = getRandomElement(colorPalettes)

  return {
    font: {
      family: getRandomElement(fonts),
      size: getRandomInt(32, 128),
      weight: getRandomElement(['400', '500', '600', '700', '800', '900'])
    },
    animation: {
      type: getRandomElement(animationTypes),
      speed: getRandomFloat(0.5, 2.0),
      duration: getRandomInt(2000, 8000),
      delay: getRandomInt(0, 500),
      easing: getRandomElement(['ease-in', 'ease-out', 'ease-in-out', 'linear'])
    },
    colors: {
      primary: palette.primary,
      secondary: palette.secondary,
      accent: palette.accent,
      background: palette.background
    },
    effects: {
      particles: Math.random() > 0.5,
      glow: Math.random() > 0.3,
      shadow: Math.random() > 0.4,
      gradient: Math.random() > 0.6,
      blur: Math.random() > 0.8,
      distortion: Math.random() > 0.9
    },
    layout: {
      alignment: getRandomElement(['left', 'center', 'right']),
      spacing: getRandomFloat(0.8, 2.0),
      lineHeight: getRandomFloat(1.0, 1.8)
    },
    timing: {
      stagger: getRandomInt(50, 200),
      overlap: getRandomFloat(0.2, 0.8)
    }
  }
}

export const generateColorPalette = () => {
  return getRandomElement(colorPalettes)
}

export const generateRandomFont = () => {
  return getRandomElement(fonts)
}

export const generateRandomAnimation = () => {
  return getRandomElement(animationTypes)
}

export const validateConfig = (config) => {
  const requiredKeys = ['font', 'animation', 'colors', 'effects']
  return requiredKeys.every(key => config && config[key])
}

export const mergeConfigs = (baseConfig, overrides) => {
  return {
    ...baseConfig,
    font: { ...baseConfig.font, ...overrides.font },
    animation: { ...baseConfig.animation, ...overrides.animation },
    colors: { ...baseConfig.colors, ...overrides.colors },
    effects: { ...baseConfig.effects, ...overrides.effects },
    layout: { ...baseConfig.layout, ...overrides.layout },
    timing: { ...baseConfig.timing, ...overrides.timing }
  }
}

export const getAnimationDuration = (text, config) => {
  const baseTime = config.animation?.duration || 3000
  const textLength = text.length
  const stagger = config.timing?.stagger || 100

  return baseTime + (textLength * stagger)
}

export const getOptimalFontSize = (text, canvasWidth, canvasHeight) => {
  const textLength = text.length
  const maxWidth = canvasWidth * 0.9
  const maxHeight = canvasHeight * 0.3

  // Estimate font size based on text length and canvas dimensions
  const estimatedSize = Math.min(
    maxWidth / (textLength * 0.6),
    maxHeight
  )

  return Math.max(16, Math.min(estimatedSize, 200))
}

export const generateParticleConfig = (effects) => {
  if (!effects.particles) return null

  return {
    count: getRandomInt(20, 100),
    size: getRandomFloat(1, 5),
    speed: getRandomFloat(0.5, 3),
    opacity: getRandomFloat(0.3, 0.8),
    colors: [
      'rgba(255, 255, 255, 0.8)',
      'rgba(139, 92, 246, 0.6)',
      'rgba(236, 72, 153, 0.6)',
      'rgba(59, 130, 246, 0.6)'
    ]
  }
}

export { fonts, animationTypes, colorPalettes }