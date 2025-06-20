// Advanced animation utilities and effects

export const easeInOut = (t) => {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

export const easeIn = (t) => {
  return t * t
}

export const easeOut = (t) => {
  return t * (2 - t)
}

export const elastic = (t) => {
  return Math.sin(-13 * (t + 1) * Math.PI / 2) * Math.pow(2, -10 * t) + 1
}

export const bounce = (t) => {
  if (t < 1 / 2.75) {
    return 7.5625 * t * t
  } else if (t < 2 / 2.75) {
    return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75
  } else if (t < 2.5 / 2.75) {
    return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375
  } else {
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375
  }
}

export const createWaveAnimation = (time, index, amplitude = 20, frequency = 0.005) => {
  return {
    y: Math.sin(time * frequency + index * 0.5) * amplitude
  }
}

export const createBounceAnimation = (time, index, amplitude = 30, speed = 0.01) => {
  const t = (time * speed + index * 100) % 1000 / 1000
  return {
    y: -Math.abs(Math.sin(t * Math.PI)) * amplitude,
    scale: 1 + Math.sin(t * Math.PI) * 0.1
  }
}

export const createRotateAnimation = (time, index, speed = 0.01) => {
  return {
    rotation: time * speed + index * 0.2
  }
}

export const createScaleAnimation = (time, index, baseScale = 1, amplitude = 0.3, speed = 0.008) => {
  return {
    scale: baseScale + Math.sin(time * speed + index * 0.3) * amplitude
  }
}

export const createFadeAnimation = (time, index, speed = 0.005) => {
  return {
    opacity: 0.5 + Math.sin(time * speed + index * 0.4) * 0.5
  }
}

export const createSlideAnimation = (time, index, amplitude = 10, speed = 0.003) => {
  return {
    x: Math.sin(time * speed + index * 0.2) * amplitude
  }
}

export const createGlitchAnimation = (time, index) => {
  // Random glitch effect with low probability
  if (Math.random() > 0.95) {
    return {
      x: (Math.random() - 0.5) * 10,
      y: (Math.random() - 0.5) * 10,
      opacity: 0.5 + Math.random() * 0.5
    }
  }
  return { x: 0, y: 0, opacity: 1 }
}

export const createElasticAnimation = (time, index, amplitude = 0.2, speed = 0.01) => {
  const t = (time * speed + index * 100) % 2000 / 2000
  const elasticValue = elastic(t)
  return {
    scale: 1 + elasticValue * amplitude,
    y: elasticValue * -10
  }
}

export const createSpiralAnimation = (time, index, radius = 50, speed = 0.005) => {
  const angle = time * speed + index * (Math.PI / 4)
  const spiralRadius = radius * (0.5 + 0.5 * Math.sin(time * 0.002))
  return {
    x: Math.cos(angle) * spiralRadius,
    y: Math.sin(angle) * spiralRadius
  }
}

export const createPulseAnimation = (time, index, speed = 0.008) => {
  const pulse = Math.sin(time * speed + index * 0.5)
  return {
    scale: 1 + pulse * 0.2,
    opacity: 0.8 + pulse * 0.2
  }
}

export const applyAnimation = (animationType, time, index, config = {}) => {
  switch (animationType) {
    case 'wave':
      return createWaveAnimation(time, index, config.amplitude, config.frequency)
    case 'bounce':
      return createBounceAnimation(time, index, config.amplitude, config.speed)
    case 'rotate':
      return createRotateAnimation(time, index, config.speed)
    case 'scale':
      return createScaleAnimation(time, index, config.baseScale, config.amplitude, config.speed)
    case 'fade':
      return createFadeAnimation(time, index, config.speed)
    case 'slide':
      return createSlideAnimation(time, index, config.amplitude, config.speed)
    case 'glitch':
      return createGlitchAnimation(time, index)
    case 'elastic':
      return createElasticAnimation(time, index, config.amplitude, config.speed)
    case 'spiral':
      return createSpiralAnimation(time, index, config.radius, config.speed)
    case 'pulse':
      return createPulseAnimation(time, index, config.speed)
    default:
      return { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 }
  }
}

export const createParticle = (canvasWidth, canvasHeight) => {
  return {
    x: Math.random() * canvasWidth,
    y: Math.random() * canvasHeight,
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
    size: Math.random() * 3 + 1,
    opacity: Math.random() * 0.8 + 0.2,
    life: Math.random() * 300 + 100,
    maxLife: 300,
    color: `hsl(${Math.random() * 360}, 70%, 60%)`
  }
}

export const updateParticle = (particle, canvasWidth, canvasHeight) => {
  particle.x += particle.vx
  particle.y += particle.vy
  particle.life -= 1

  // Wrap around edges
  if (particle.x < 0) particle.x = canvasWidth
  if (particle.x > canvasWidth) particle.x = 0
  if (particle.y < 0) particle.y = canvasHeight
  if (particle.y > canvasHeight) particle.y = 0

  // Update opacity based on life
  particle.opacity = (particle.life / particle.maxLife) * 0.8

  return particle.life > 0
}

export const drawParticle = (ctx, particle) => {
  ctx.save()
  ctx.globalAlpha = particle.opacity
  ctx.fillStyle = particle.color
  ctx.beginPath()
  ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export const createGlowEffect = (ctx, text, x, y, color, intensity = 20) => {
  ctx.save()
  ctx.shadowColor = color
  ctx.shadowBlur = intensity
  ctx.fillText(text, x, y)
  ctx.restore()
}

export const createGradientText = (ctx, text, x, y, width, height, colors) => {
  const gradient = ctx.createLinearGradient(x - width/2, y - height/2, x + width/2, y + height/2)
  colors.forEach((color, index) => {
    gradient.addColorStop(index / (colors.length - 1), color)
  })
  ctx.fillStyle = gradient
  ctx.fillText(text, x, y)
}

export const createTextShadow = (ctx, text, x, y, shadowColor, offsetX = 2, offsetY = 2, blur = 4) => {
  ctx.save()
  ctx.shadowColor = shadowColor
  ctx.shadowOffsetX = offsetX
  ctx.shadowOffsetY = offsetY
  ctx.shadowBlur = blur
  ctx.fillText(text, x, y)
  ctx.restore()
}