'use client'

/**
 * React Bits LogoLoop — a rAF-driven marquee that measures its own sequence and
 * clones it just enough times to cover the viewport, so the loop never shows a
 * seam at any width. Ported to the project with the item union narrowed properly
 * (the upstream source reaches for `any`; strict mode here does not allow it).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type LogoNodeItem = {
  node: React.ReactNode
  href?: string
  title?: string
  ariaLabel?: string
}

type LogoImageItem = {
  src: string
  alt?: string
  href?: string
  title?: string
  srcSet?: string
  sizes?: string
  width?: number
  height?: number
}

export type LogoItem = LogoNodeItem | LogoImageItem

export interface LogoLoopProps {
  logos: LogoItem[]
  speed?: number
  direction?: 'left' | 'right' | 'up' | 'down'
  width?: number | string
  logoHeight?: number
  gap?: number
  pauseOnHover?: boolean
  hoverSpeed?: number
  fadeOut?: boolean
  fadeOutColor?: string
  scaleOnHover?: boolean
  renderItem?: (item: LogoItem, key: React.Key) => React.ReactNode
  ariaLabel?: string
  className?: string
  style?: React.CSSProperties
}

const ANIMATION_CONFIG = {
  SMOOTH_TAU: 0.25,
  MIN_COPIES: 2,
  COPY_HEADROOM: 2,
} as const

const toCssLength = (value?: number | string): string | undefined =>
  typeof value === 'number' ? `${value}px` : (value ?? undefined)

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ')

const useResizeObserver = (
  callback: () => void,
  elements: Array<React.RefObject<Element | null>>,
  dependencies: React.DependencyList,
) => {
  useEffect(() => {
    if (!window.ResizeObserver) {
      const handleResize = () => callback()
      window.addEventListener('resize', handleResize)
      callback()
      return () => window.removeEventListener('resize', handleResize)
    }

    const observers = elements.map((ref) => {
      if (!ref.current) return null
      const observer = new ResizeObserver(callback)
      observer.observe(ref.current)
      return observer
    })

    callback()

    return () => {
      observers.forEach((observer) => observer?.disconnect())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)
}

/** Holds measurement until every logo image has settled, so widths are real. */
const useImageLoader = (
  seqRef: React.RefObject<HTMLUListElement | null>,
  onLoad: () => void,
  dependencies: React.DependencyList,
) => {
  useEffect(() => {
    const images = seqRef.current?.querySelectorAll('img') ?? []

    if (images.length === 0) {
      onLoad()
      return
    }

    let remaining = images.length
    const handleImageLoad = () => {
      remaining -= 1
      if (remaining === 0) onLoad()
    }

    images.forEach((img) => {
      if (img.complete) {
        handleImageLoad()
      } else {
        img.addEventListener('load', handleImageLoad, { once: true })
        img.addEventListener('error', handleImageLoad, { once: true })
      }
    })

    return () => {
      images.forEach((img) => {
        img.removeEventListener('load', handleImageLoad)
        img.removeEventListener('error', handleImageLoad)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)
}

/**
 * Drives the track by transform only, easing velocity toward its target so a
 * hover slow-down reads as deceleration rather than a jump cut. Under
 * `prefers-reduced-motion` the track parks at the origin and no frames run.
 */
const useAnimationLoop = (
  trackRef: React.RefObject<HTMLDivElement | null>,
  targetVelocity: number,
  seqWidth: number,
  seqHeight: number,
  isHovered: boolean,
  hoverSpeed: number | undefined,
  isVertical: boolean,
) => {
  const rafRef = useRef<number | null>(null)
  const lastTimestampRef = useRef<number | null>(null)
  const offsetRef = useRef(0)
  const velocityRef = useRef(0)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const seqSize = isVertical ? seqHeight : seqWidth
    const paint = (offset: number) =>
      (track.style.transform = isVertical
        ? `translate3d(0, ${-offset}px, 0)`
        : `translate3d(${-offset}px, 0, 0)`)

    if (seqSize > 0) {
      offsetRef.current = ((offsetRef.current % seqSize) + seqSize) % seqSize
      paint(offsetRef.current)
    }

    if (prefersReduced) {
      paint(0)
      return () => {
        lastTimestampRef.current = null
      }
    }

    const animate = (timestamp: number) => {
      lastTimestampRef.current ??= timestamp
      const deltaTime = Math.max(0, timestamp - lastTimestampRef.current) / 1000
      lastTimestampRef.current = timestamp

      const target = isHovered && hoverSpeed !== undefined ? hoverSpeed : targetVelocity
      const easingFactor = 1 - Math.exp(-deltaTime / ANIMATION_CONFIG.SMOOTH_TAU)
      velocityRef.current += (target - velocityRef.current) * easingFactor

      if (seqSize > 0) {
        const next = offsetRef.current + velocityRef.current * deltaTime
        offsetRef.current = ((next % seqSize) + seqSize) % seqSize
        paint(offsetRef.current)
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      lastTimestampRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetVelocity, seqWidth, seqHeight, isHovered, hoverSpeed, isVertical])
}

export const LogoLoop = React.memo<LogoLoopProps>(function LogoLoop({
  logos,
  speed = 120,
  direction = 'left',
  width = '100%',
  logoHeight = 28,
  gap = 32,
  pauseOnHover,
  hoverSpeed,
  fadeOut = false,
  fadeOutColor,
  scaleOnHover = false,
  renderItem,
  ariaLabel = 'Partner logos',
  className,
  style,
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const seqRef = useRef<HTMLUListElement>(null)

  const [seqWidth, setSeqWidth] = useState(0)
  const [seqHeight, setSeqHeight] = useState(0)
  const [copyCount, setCopyCount] = useState<number>(ANIMATION_CONFIG.MIN_COPIES)
  const [isHovered, setIsHovered] = useState(false)

  // `hoverSpeed` wins; otherwise `pauseOnHover` picks between stop and no-op.
  const effectiveHoverSpeed = useMemo(() => {
    if (hoverSpeed !== undefined) return hoverSpeed
    if (pauseOnHover === false) return undefined
    return 0
  }, [hoverSpeed, pauseOnHover])

  const isVertical = direction === 'up' || direction === 'down'

  const targetVelocity = useMemo(() => {
    const magnitude = Math.abs(speed)
    const directionMultiplier = isVertical
      ? direction === 'up'
        ? 1
        : -1
      : direction === 'left'
        ? 1
        : -1
    return magnitude * directionMultiplier * (speed < 0 ? -1 : 1)
  }, [speed, direction, isVertical])

  const updateDimensions = useCallback(() => {
    const containerWidth = containerRef.current?.clientWidth ?? 0
    const rect = seqRef.current?.getBoundingClientRect()
    const sequenceWidth = rect?.width ?? 0
    const sequenceHeight = rect?.height ?? 0

    if (isVertical) {
      const parentHeight = containerRef.current?.parentElement?.clientHeight ?? 0
      if (containerRef.current && parentHeight > 0) {
        const targetHeight = `${Math.ceil(parentHeight)}px`
        if (containerRef.current.style.height !== targetHeight) {
          containerRef.current.style.height = targetHeight
        }
      }
      if (sequenceHeight > 0) {
        setSeqHeight(Math.ceil(sequenceHeight))
        const viewport = containerRef.current?.clientHeight || parentHeight || sequenceHeight
        const copiesNeeded = Math.ceil(viewport / sequenceHeight) + ANIMATION_CONFIG.COPY_HEADROOM
        setCopyCount(Math.max(ANIMATION_CONFIG.MIN_COPIES, copiesNeeded))
      }
      return
    }

    if (sequenceWidth > 0) {
      setSeqWidth(Math.ceil(sequenceWidth))
      const copiesNeeded = Math.ceil(containerWidth / sequenceWidth) + ANIMATION_CONFIG.COPY_HEADROOM
      setCopyCount(Math.max(ANIMATION_CONFIG.MIN_COPIES, copiesNeeded))
    }
  }, [isVertical])

  useResizeObserver(updateDimensions, [containerRef, seqRef], [logos, gap, logoHeight, isVertical])
  useImageLoader(seqRef, updateDimensions, [logos, gap, logoHeight, isVertical])
  useAnimationLoop(
    trackRef,
    targetVelocity,
    seqWidth,
    seqHeight,
    isHovered,
    effectiveHoverSpeed,
    isVertical,
  )

  const cssVariables = useMemo(
    () =>
      ({
        '--logoloop-gap': `${gap}px`,
        '--logoloop-logoHeight': `${logoHeight}px`,
        ...(fadeOutColor && { '--logoloop-fadeColor': fadeOutColor }),
      }) as React.CSSProperties,
    [gap, logoHeight, fadeOutColor],
  )

  const rootClasses = cx(
    'relative group',
    isVertical ? 'inline-block h-full overflow-hidden' : 'overflow-x-hidden',
    '[--logoloop-fadeColorAuto:#ffffff] dark:[--logoloop-fadeColorAuto:#0b0b0b]',
    scaleOnHover && 'py-[calc(var(--logoloop-logoHeight)*0.1)]',
    className,
  )

  const handleMouseEnter = useCallback(() => {
    if (effectiveHoverSpeed !== undefined) setIsHovered(true)
  }, [effectiveHoverSpeed])

  const handleMouseLeave = useCallback(() => {
    if (effectiveHoverSpeed !== undefined) setIsHovered(false)
  }, [effectiveHoverSpeed])

  const itemClasses = cx(
    'flex-none text-[length:var(--logoloop-logoHeight)] leading-none',
    isVertical ? 'mb-[var(--logoloop-gap)]' : 'mr-[var(--logoloop-gap)]',
    scaleOnHover && 'group/item overflow-visible',
  )

  const scaleClasses =
    scaleOnHover &&
    'transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover/item:scale-[1.2] motion-reduce:transition-none'

  const renderLogoItem = useCallback(
    (item: LogoItem, key: React.Key) => {
      if (renderItem) {
        return (
          <li className={itemClasses} key={key}>
            {renderItem(item, key)}
          </li>
        )
      }

      const content =
        'node' in item ? (
          <span
            className={cx('inline-flex items-center', scaleClasses)}
            aria-hidden={!!item.href && !item.ariaLabel}
          >
            {item.node}
          </span>
        ) : (
          <img
            className={cx(
              'block h-[var(--logoloop-logoHeight)] w-auto object-contain',
              'pointer-events-none [-webkit-user-drag:none]',
              scaleClasses,
            )}
            src={item.src}
            srcSet={item.srcSet}
            sizes={item.sizes}
            width={item.width}
            height={item.height}
            alt={item.alt ?? ''}
            title={item.title}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        )

      const itemAriaLabel =
        'node' in item ? (item.ariaLabel ?? item.title) : (item.alt ?? item.title)

      return (
        <li className={itemClasses} key={key}>
          {item.href ? (
            <a
              className="inline-flex items-center rounded no-underline transition-opacity duration-200 hover:opacity-80 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-current"
              href={item.href}
              aria-label={itemAriaLabel || 'logo link'}
              target="_blank"
              rel="noreferrer noopener"
            >
              {content}
            </a>
          ) : (
            content
          )}
        </li>
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [itemClasses, scaleClasses, renderItem],
  )

  const logoLists = useMemo(
    () =>
      Array.from({ length: copyCount }, (_, copyIndex) => (
        <ul
          className={cx('flex items-center', isVertical && 'flex-col')}
          key={`copy-${copyIndex}`}
          aria-hidden={copyIndex > 0}
          ref={copyIndex === 0 ? seqRef : undefined}
        >
          {logos.map((item, itemIndex) => renderLogoItem(item, `${copyIndex}-${itemIndex}`))}
        </ul>
      )),
    [copyCount, logos, renderLogoItem, isVertical],
  )

  const containerStyle = useMemo(
    (): React.CSSProperties => ({
      width: isVertical
        ? toCssLength(width) === '100%'
          ? undefined
          : toCssLength(width)
        : (toCssLength(width) ?? '100%'),
      ...cssVariables,
      ...style,
    }),
    [width, cssVariables, style, isVertical],
  )

  const fadeSide = (side: 'top' | 'bottom' | 'left' | 'right') => {
    const to = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[side]
    return (
      <div
        key={side}
        aria-hidden
        className={cx(
          'pointer-events-none absolute z-10',
          isVertical ? 'inset-x-0 h-[clamp(24px,8%,120px)]' : 'inset-y-0 w-[clamp(24px,8%,120px)]',
          side === 'top' && 'top-0',
          side === 'bottom' && 'bottom-0',
          side === 'left' && 'left-0',
          side === 'right' && 'right-0',
        )}
        style={{
          backgroundImage: `linear-gradient(to ${to}, var(--logoloop-fadeColor, var(--logoloop-fadeColorAuto)) 0%, rgba(0,0,0,0) 100%)`,
        }}
      />
    )
  }

  return (
    <div
      ref={containerRef}
      className={rootClasses}
      style={containerStyle}
      role="region"
      aria-label={ariaLabel}
    >
      {fadeOut && (isVertical ? ['top', 'bottom'] : ['left', 'right']).map((side) =>
        fadeSide(side as 'top' | 'bottom' | 'left' | 'right'),
      )}

      <div
        className={cx(
          'relative z-0 flex select-none will-change-transform motion-reduce:transform-none',
          isVertical ? 'h-max w-full flex-col' : 'w-max flex-row',
        )}
        ref={trackRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {logoLists}
      </div>
    </div>
  )
})

export default LogoLoop
