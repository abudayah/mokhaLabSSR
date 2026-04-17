"use client"

import { useState, useEffect } from "react"

function useScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    function update() {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0)
    }
    window.addEventListener("scroll", update, { passive: true })
    return () => window.removeEventListener("scroll", update)
  }, [])

  return progress
}

export function ReadingProgressBar() {
  const progress = useScrollProgress()

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
      className="fixed top-0 left-0 h-[3px] z-[60] bg-[var(--blog-accent)] transition-[width] duration-75"
      style={{ width: `${progress}%` }}
    />
  )
}
