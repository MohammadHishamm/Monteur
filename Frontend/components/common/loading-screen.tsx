"use client"

import { useEffect, useRef, useState } from "react"

const PRIMARY = "#10b981"

export function LoadingScreen() {
  const [progress, setProgress] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    const tick = (t: number) => {
      if (startRef.current === null) startRef.current = t
      const elapsed = t - startRef.current
      // Approaches 85% asymptotically, never completes on its own
      setProgress(85 * (1 - Math.exp(-elapsed / 600)))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <div className="fixed top-0 inset-x-0 z-[9999] h-[3px]">
      <div
        className="h-full transition-none"
        style={{
          width: `${progress}%`,
          background: `linear-gradient(90deg, #10b981, #059669)`,
          boxShadow: `0 0 10px #10b98188`,
        }}
      />
    </div>
  )
}
