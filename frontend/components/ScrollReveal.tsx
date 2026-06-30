'use client'

import React, { useEffect, useRef, useMemo, ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface ScrollRevealProps {
  children: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span'
  className?: string
  enableBlur?: boolean
  baseOpacity?: number
  blurStrength?: number
  stagger?: number
  start?: string
  end?: string
  scrub?: boolean | number
}

const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  as: Tag = 'h2',
  className = '',
  enableBlur = true,
  baseOpacity = 0.08,
  blurStrength = 6,
  stagger = 0.05,
  start = 'top bottom-=20%',
  end = 'bottom bottom',
  scrub = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const words = useMemo(() => children.split(/(\s+)/), [children])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const wordElements = el.querySelectorAll<HTMLElement>('.word')

    if (wordElements.length === 0) return

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start,
        end,
        scrub,
      },
    })

    tl.fromTo(
      wordElements,
      { opacity: baseOpacity },
      { opacity: 1, stagger, ease: 'none' }
    )

    if (enableBlur) {
      tl.fromTo(
        wordElements,
        { filter: `blur(${blurStrength}px)` },
        { filter: 'blur(0px)', stagger, ease: 'none' },
        0
      )
    }

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill())
    }
  }, [enableBlur, baseOpacity, blurStrength, stagger, start, end, scrub])

  return (
    <div ref={containerRef}>
      <Tag className={className}>
        {words.map((word, i) =>
          word.match(/^\s+$/) ? (
            word
          ) : (
            <span key={i} className="inline-block word">
              {word}
            </span>
          )
        )}
      </Tag>
    </div>
  )
}

export default ScrollReveal
