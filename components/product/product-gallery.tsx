"use client"

import { useState, useCallback, useEffect } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface ProductGalleryProps {
  images: string[]
  name: string
}

export function ProductGallery({ images, name }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  // Main carousel — touch/swipe + wheel enabled
  const [mainRef, mainApi] = useEmblaCarousel({
    loop: false,
    skipSnaps: false,
    dragFree: false,
  })

  // Thumbnail carousel — horizontal scroll on overflow
  const [thumbRef, thumbApi] = useEmblaCarousel({
    containScroll: "keepSnaps",
    dragFree: true,
  })

  // Sync active index from main carousel scroll
  const onSelect = useCallback(() => {
    if (!mainApi) return
    const index = mainApi.selectedScrollSnap()
    setActiveIndex(index)
    // Scroll thumbnail into view
    thumbApi?.scrollTo(index)
  }, [mainApi, thumbApi])

  useEffect(() => {
    if (!mainApi) return
    mainApi.on("select", onSelect)
    onSelect()
    return () => { mainApi.off("select", onSelect) }
  }, [mainApi, onSelect])

  // Navigate from thumbnail click
  function onThumbClick(index: number) {
    if (!mainApi) return
    mainApi.scrollTo(index)
  }

  // Arrow navigation
  const canPrev = activeIndex > 0
  const canNext = activeIndex < images.length - 1

  function scrollPrev() { mainApi?.scrollTo(activeIndex - 1) }
  function scrollNext() { mainApi?.scrollTo(activeIndex + 1) }

  // Keyboard support
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") scrollPrev()
      if (e.key === "ArrowRight") scrollNext()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, mainApi])

  return (
    <div className="flex flex-col gap-3 lg:sticky lg:top-20">
      {/* ── Main carousel ────────────────────────────────────── */}
      <div className="relative aspect-square bg-secondary overflow-hidden group">
        {/* Embla viewport */}
        <div ref={mainRef} className="overflow-hidden w-full h-full">
          <div className="flex h-full touch-pan-y">
            {images.map((src, i) => (
              <div
                key={i}
                className="flex-[0_0_100%] min-w-0 h-full flex items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`${name} — view ${i + 1}`}
                  className="object-contain w-full h-full select-none"
                  draggable={false}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Arrow buttons — visible on hover on desktop, always on touch */}
        {images.length > 1 && (
          <>
            <button
              onClick={scrollPrev}
              disabled={!canPrev}
              aria-label="Previous image"
              className={`
                absolute left-2 top-1/2 -translate-y-1/2 z-10
                w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm
                flex items-center justify-center
                border border-border shadow-sm
                transition-all duration-200
                opacity-0 group-hover:opacity-100
                focus:opacity-100
                disabled:opacity-0 disabled:pointer-events-none
                hover:bg-background active:scale-95
                md:flex
              `}
            >
              <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
            </button>

            <button
              onClick={scrollNext}
              disabled={!canNext}
              aria-label="Next image"
              className={`
                absolute right-2 top-1/2 -translate-y-1/2 z-10
                w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm
                flex items-center justify-center
                border border-border shadow-sm
                transition-all duration-200
                opacity-0 group-hover:opacity-100
                focus:opacity-100
                disabled:opacity-0 disabled:pointer-events-none
                hover:bg-background active:scale-95
                md:flex
              `}
            >
              <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
            </button>

            {/* Dot indicators — visible on mobile when arrows are hidden */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 md:hidden">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => onThumbClick(i)}
                  aria-label={`Go to image ${i + 1}`}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                    i === activeIndex
                      ? "bg-foreground scale-125"
                      : "bg-foreground/30"
                  }`}
                />
              ))}
            </div>

            {/* Image counter — top right corner */}
            <div className="absolute top-2 right-2 text-[11px] font-medium text-foreground/60 bg-background/70 backdrop-blur-sm px-2 py-0.5 rounded-full pointer-events-none">
              {activeIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* ── Thumbnails ───────────────────────────────────────── */}
      {images.length > 1 && (
        <div ref={thumbRef} className="overflow-hidden">
          <div className="flex gap-2">
            {images.map((src, i) => (
              <button
                key={i}
                onClick={() => onThumbClick(i)}
                aria-label={`View image ${i + 1} of ${images.length}`}
                className={`
                  flex-[0_0_auto] w-16 aspect-square overflow-hidden bg-secondary
                  border-2 transition-all duration-200
                  ${i === activeIndex
                    ? "border-foreground"
                    : "border-transparent hover:border-border opacity-60 hover:opacity-100"
                  }
                `}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`${name} thumbnail ${i + 1}`}
                  className="object-contain w-full h-full p-1 select-none"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
