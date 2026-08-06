'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

interface StarRatingProps {
  rating?: number | string | null
  count?: number
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
  interactive?: boolean
  onRate?: (rating: number) => void
  /**
   * Scale of `rating`. Matchmaking candidates and dashboard metrics arrive
   * pre-scaled to 0-5; the raw tutor_profiles EMA is 0-1. Passing the wrong one
   * renders every tutor as five full stars.
   */
  scale?: '0-5' | '0-1'
}

const sizeMap = { sm: 12, md: 16, lg: 20 }
const starCount = 5

export function StarRating({ rating, count, size = 'sm', showCount = true, interactive = false, onRate, scale = '0-5' }: StarRatingProps) {
  const [hovered, setHovered] = useState(0)
  const [selected, setSelected] = useState(0)
  const px = sizeMap[size]

  const numericRating = rating != null ? Number(rating) * (scale === '0-1' ? 5 : 1) : 0

  const getFill = (i: number) => {
    if (interactive) {
      const display = hovered || selected
      if (display > 0) return i < display ? 'full' : 'none'
    }
    const fullStars = Math.floor(numericRating)
    if (i < fullStars) return 'full'
    const hasHalf = numericRating - fullStars >= 0.25 && numericRating - fullStars < 0.75
    if (i === fullStars && hasHalf) return 'half'
    return 'none'
  }

  const handleClick = (i: number) => {
    setSelected(i)
    onRate?.(i)
  }

  const starColor = 'var(--accent-sun-fg)'
  const starDim = 'color-mix(in srgb, var(--accent-sun-fg), transparent 60%)'

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="flex items-center gap-0.5" style={{ color: starColor }}>
        {Array.from({ length: starCount }).map((_, i) => {
          const fill = getFill(i)
          const isActive = fill === 'full' || fill === 'half'
          return interactive ? (
            <button
              key={i}
              type="button"
              onClick={() => handleClick(i + 1)}
              onMouseEnter={() => setHovered(i + 1)}
              onMouseLeave={() => setHovered(0)}
              className="cursor-pointer transition-transform hover:scale-110"
            >
              <Star size={px} fill={isActive ? starColor : 'none'} stroke={isActive ? starColor : starDim} strokeWidth={1.5} />
            </button>
          ) : (
            <span key={i} className="relative inline-flex">
              <Star size={px} fill={isActive ? starColor : 'none'} stroke={isActive ? starColor : starDim} strokeWidth={1.5} />
            </span>
          )
        })}
      </div>
      {showCount && count != null && count > 0 && (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({count})</span>
      )}
    </div>
  )
}
