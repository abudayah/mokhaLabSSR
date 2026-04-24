import { useMemo } from "react"

interface ProductRatingProps {
  rating?: number
  reviewCount?: number
}

export function ProductRating({ rating = 4.7, reviewCount }: ProductRatingProps) {
  const fullStars = Math.floor(rating)
  const partial = Math.round((rating - fullStars) * 10) / 10
  const emptyStars = 5 - fullStars - (partial > 0 ? 1 : 0)

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
        {Array.from({ length: fullStars }).map((_, i) => (
          <StarIcon key={`full-${i}`} fill={1} index={i} />
        ))}
        {partial > 0 && <StarIcon key="partial" fill={partial} index={fullStars} />}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <StarIcon key={`empty-${i}`} fill={0} index={fullStars + (partial > 0 ? 1 : 0) + i} />
        ))}
      </div>
      <span className="text-[14px] font-medium text-foreground">{rating.toFixed(1)}</span>
      {reviewCount !== undefined && (
        <span className="text-[13px] text-muted-foreground">({reviewCount.toLocaleString()})</span>
      )}
    </div>
  )
}

function StarIcon({ fill, index }: { fill: number; index: number }) {
  // Stable ID based on position and fill — no random, no hydration mismatch
  const gradientId = `star-grad-${index}`

  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {fill > 0 && fill < 1 && (
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
            <stop offset={`${fill * 100}%`} stopColor="currentColor" />
            <stop offset={`${fill * 100}%`} stopColor="currentColor" stopOpacity="0.2" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M8 1.5l1.545 3.13 3.455.502-2.5 2.437.59 3.44L8 9.25l-3.09 1.759.59-3.44L3 5.132l3.455-.502L8 1.5z"
        fill={fill > 0 && fill < 1 ? `url(#${gradientId})` : "currentColor"}
        fillOpacity={fill === 0 ? 0.2 : 1}
      />
    </svg>
  )
}
