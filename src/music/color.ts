// 复刻自 sfkm.me/src/utils/color.ts （删去无关部分）

export function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : null
}

export function rgbToHsl(r: number, g: number, b: number) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }
  return [h * 360, s, l] as const
}

export function hslToHex(h: number, s: number, l: number) {
  l = Math.max(0, Math.min(1, l))
  s = Math.max(0, Math.min(1, s))
  h = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]

  const toHex = (v: number) => {
    const hh = Math.round((v + m) * 255).toString(16)
    return hh.length === 1 ? `0${hh}` : hh
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function deriveLyricThemeColors(themeColor: string) {
  // 默认灰色
  let r = 107
  let g = 114
  let b = 128

  if (themeColor.startsWith('rgb')) {
    const arr = themeColor.match(/\d+/g)
    if (arr && arr.length >= 3) {
      r = +arr[0]
      g = +arr[1]
      b = +arr[2]
    }
  } else if (themeColor.startsWith('#')) {
    const rgb = hexToRgb(themeColor)
    if (rgb) {
      r = rgb.r
      g = rgb.g
      b = rgb.b
    }
  }

  const [h, s, l] = rgbToHsl(r, g, b)

  const dayText = hslToHex(h, Math.min(1, s * 1.5), 0.28)
  const dayOtherText = hslToHex(h, Math.min(0.6, s * 0.3), 0.9)
  const dayBg = `${hslToHex(h, s * 0.15, 0.4)}80`
  const dayProgress = hslToHex(h, Math.min(0.8, s * 0.8), Math.max(0.6, l * 0.6))

  const nightText = hslToHex(h, Math.min(1, s * 1.3), 0.8)
  const nightOtherText = hslToHex(h, Math.min(0.6, s * 0.3), 0.65)
  const nightBg = `${hslToHex(h, s * 0.18, 0.4)}50`
  const nightProgress = hslToHex(h, Math.min(1, s * 0.6), 0.65)

  return {
    dayText,
    dayBg,
    nightText,
    nightBg,
    dayOtherText,
    nightOtherText,
    dayProgress,
    nightProgress,
  }
}

export function getLyricColor(themeColor: string) {
  // 默认灰色
  let r = 107
  let g = 114
  let b = 128

  if (themeColor.startsWith('rgb')) {
    const arr = themeColor.match(/\d+/g)
    if (arr && arr.length >= 3) {
      r = +arr[0]
      g = +arr[1]
      b = +arr[2]
    }
  } else if (themeColor.startsWith('#')) {
    const rgb = hexToRgb(themeColor)
    if (rgb) {
      r = rgb.r
      g = rgb.g
      b = rgb.b
    }
  }

  const [h, s, l] = rgbToHsl(r, g, b)

  const dayPlayedText = hslToHex(h, Math.min(1, s * 1.5), 0.3)
  const nightPlayedText = hslToHex(h, Math.min(1, s * 1.3), 0.8)

  const dayUnplayedText = hslToHex(h, Math.min(0.6, s * 0.5), 0.50)
  const nightUnplayedText = hslToHex(h, Math.min(0.6, s * 0.4), 0.55)

  const dayProgress = hslToHex(h, Math.min(0.8, s * 0.8), Math.max(0.6, l * 0.6))
  const nightProgress = hslToHex(h, Math.min(1, s * 0.6), 0.65)

  return {
    dayPlayedText,
    nightPlayedText,
    dayUnplayedText,
    nightUnplayedText,
    dayProgress,
    nightProgress,
  }
}

const DEFAULT_COVER_COLOR = 'rgb(100, 100, 100)'

export async function getAlbumCoverColor(cover: string): Promise<string> {
  if (!cover) return DEFAULT_COVER_COLOR

  try {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = cover || ''
    })

    const size = 32
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return DEFAULT_COVER_COLOR

    ctx.drawImage(img, 0, 0, size, size)

    for (let i = 0; i < 3; i++) {
      ctx.filter = 'blur(2px)'
      ctx.drawImage(canvas, 0, 0)
    }
    ctx.filter = 'none'

    const finalSize = 1
    const smallCanvas = document.createElement('canvas')
    smallCanvas.width = finalSize
    smallCanvas.height = finalSize
    const smallCtx = smallCanvas.getContext('2d')
    if (!smallCtx) return DEFAULT_COVER_COLOR

    smallCtx.drawImage(canvas, 0, 0, size, size, 0, 0, finalSize, finalSize)

    const pixel = smallCtx.getImageData(0, 0, 1, 1).data
    const r = pixel[0]
    const g = pixel[1]
    const b = pixel[2]

    const avgLuminance = (r + g + b) / 3
    if (avgLuminance < 40) {
      const factor = 40 / avgLuminance
      return `rgb(${Math.min(255, Math.round(r * factor))}, ${Math.min(255, Math.round(g * factor))}, ${Math.min(255, Math.round(b * factor))})`
    } else if (avgLuminance > 220) {
      const factor = 220 / avgLuminance
      return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`
    }

    return `rgb(${r}, ${g}, ${b})`
  } catch (error) {
    console.error('Failed to get album cover color:', error)
    return DEFAULT_COVER_COLOR
  }
}
