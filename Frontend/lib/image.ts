export type RGB = {
  r: number
  g: number
  b: number
}

/**
 * Extracts the dominant (average) color from a loaded HTMLImageElement
 * by drawing it onto a temporary canvas and sampling pixel data.
 */
export function getDominantColor(img: HTMLImageElement): RGB {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")

  if (!ctx) {
    return { r: 100, g: 100, b: 100 }
  }

  // Downscale for performance — we don't need full resolution for color sampling
  const size = 50
  canvas.width = size
  canvas.height = size
  ctx.drawImage(img, 0, 0, size, size)

  const data = ctx.getImageData(0, 0, size, size).data
  let r = 0
  let g = 0
  let b = 0
  let count = 0

  for (let i = 0; i < data.length; i += 4) {
    // Skip fully-transparent pixels
    if (data[i + 3] < 128) continue
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
    count++
  }

  if (count === 0) return { r: 100, g: 100, b: 100 }

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  }
}
