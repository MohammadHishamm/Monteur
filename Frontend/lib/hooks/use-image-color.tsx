import { useEffect, useState } from "react"
import { getDominantColor, type RGB } from "~/lib/image"

type ImageAnalysis = {
  rgb: RGB
  isDark: boolean
}

export function useImageColor(imageUrl: string) {
  const [color, setColor] = useState<ImageAnalysis | null>(null)
  const [isPending, setIsPending] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = "Anonymous"

    img.onload = () => {
      try {
        const rgb = getDominantColor(img)
        // How we humain see rgb colors
        // Red contributes 30%
        // Green contributes 59%
        // Blue contributes 11%
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000
        const isDark = brightness < 128

        // Reduce brightness by 40%
        const darkenFactor = isDark ? 1.35 : 1.1

        rgb.r = Math.round(rgb.r * darkenFactor)
        rgb.g = Math.round(rgb.g * darkenFactor)
        rgb.b = Math.round(rgb.b * darkenFactor)

        setColor({ rgb, isDark })
        setIsPending(false)
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to process image"))
        setIsPending(false)
      }
    }

    img.onerror = (err) => {
      setError(new Error("Failed to load image"))
      setIsPending(false)
    }

    img.src = imageUrl

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [imageUrl])

  return { color, isPending, error }
}
