'use client'

import React, {
  type CSSProperties,
  useEffect,
  useRef,
  useState,
  useMemo,
  type PropsWithChildren,
} from 'react'

type GradualBlurProps = PropsWithChildren<{
  position?: 'top' | 'bottom' | 'left' | 'right'
  strength?: number
  height?: string
  width?: string
  divCount?: number
  exponential?: boolean
  zIndex?: number
  animated?: boolean | 'scroll'
  duration?: string
  easing?: string
  opacity?: number
  curve?: 'linear' | 'bezier' | 'ease-in' | 'ease-out' | 'ease-in-out'
  responsive?: boolean
  mobileHeight?: string
  tabletHeight?: string
  desktopHeight?: string
  mobileWidth?: string
  tabletWidth?: string
  desktopWidth?: string
  preset?:
    | 'top' | 'bottom' | 'left' | 'right'
    | 'subtle' | 'intense' | 'smooth' | 'sharp'
    | 'header' | 'footer' | 'sidebar'
    | 'page-header' | 'page-footer'
  gpuOptimized?: boolean
  hoverIntensity?: number
  target?: 'parent' | 'page'
  onAnimationComplete?: () => void
  className?: string
  style?: CSSProperties
}>

const DEFAULT_CONFIG: Partial<GradualBlurProps> = {
  position: 'bottom',
  strength: 2,
  height: '6rem',
  divCount: 5,
  exponential: false,
  zIndex: 1000,
  animated: false,
  duration: '0.3s',
  easing: 'ease-out',
  opacity: 1,
  curve: 'linear',
  responsive: false,
  target: 'parent',
  className: '',
  style: {},
}

const PRESETS: Record<string, Partial<GradualBlurProps>> = {
  top: { position: 'top', height: '6rem' },
  bottom: { position: 'bottom', height: '6rem' },
  left: { position: 'left', height: '6rem' },
  right: { position: 'right', height: '6rem' },

  subtle: { height: '4rem', strength: 1, opacity: 0.8, divCount: 3 },
  intense: { height: '10rem', strength: 4, divCount: 8, exponential: true },

  smooth: { height: '8rem', curve: 'bezier', divCount: 10 },
  sharp: { height: '5rem', curve: 'linear', divCount: 4 },

  header: { position: 'top', height: '8rem', curve: 'ease-out' },
  footer: { position: 'bottom', height: '8rem', curve: 'ease-out' },
  sidebar: { position: 'left', height: '6rem', strength: 2.5 },

  'page-header': { position: 'top', height: '10rem', target: 'page', strength: 3 },
  'page-footer': { position: 'bottom', height: '10rem', target: 'page', strength: 3 },
}

const CURVE_FUNCTIONS: Record<string, (p: number) => number> = {
  linear: p => p,
  bezier: p => p * p * (3 - 2 * p),
  'ease-in': p => p * p,
  'ease-out': p => 1 - Math.pow(1 - p, 2),
  'ease-in-out': p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
}

const mergeConfigs = (...configs: Partial<GradualBlurProps>[]): Partial<GradualBlurProps> =>
  configs.reduce((acc, config) => ({ ...acc, ...config }), {})

const getGradientDirection = (position: string): string =>
  ({ top: 'to top', bottom: 'to bottom', left: 'to left', right: 'to right' })[position] ?? 'to bottom'

const debounce = <T extends (...a: never[]) => void>(fn: T, wait: number) => {
  let t: ReturnType<typeof setTimeout>
  return (...a: Parameters<T>) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...a), wait)
  }
}

const useResponsiveDimension = (
  responsive: boolean | undefined,
  config: Partial<GradualBlurProps>,
  key: keyof GradualBlurProps,
) => {
  const [val, setVal] = useState<unknown>(config[key])
  useEffect(() => {
    if (!responsive) return
    const bag = config as Record<string, unknown>
    const calc = () => {
      const w = window.innerWidth
      let v: unknown = bag[key as string]
      const k = (key as string).charAt(0).toUpperCase() + (key as string).slice(1)
      if (w <= 480 && bag['mobile' + k]) v = bag['mobile' + k]
      else if (w <= 768 && bag['tablet' + k]) v = bag['tablet' + k]
      else if (w <= 1024 && bag['desktop' + k]) v = bag['desktop' + k]
      setVal(v)
    }
    const deb = debounce(calc, 100)
    calc()
    window.addEventListener('resize', deb)
    return () => window.removeEventListener('resize', deb)
  }, [responsive, config, key])
  return (responsive ? val : (config as Record<string, unknown>)[key as string]) as string | undefined
}

const useIntersectionObserver = (
  ref: React.RefObject<HTMLDivElement | null>,
  shouldObserve = false,
) => {
  const [isVisible, setIsVisible] = useState(!shouldObserve)

  useEffect(() => {
    if (!shouldObserve || !ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 },
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref, shouldObserve])

  return isVisible
}

const GradualBlur: React.FC<GradualBlurProps> = props => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const config = useMemo(() => {
    const presetConfig = props.preset && PRESETS[props.preset] ? PRESETS[props.preset] : {}
    return mergeConfigs(DEFAULT_CONFIG, presetConfig, props) as Required<GradualBlurProps>
  }, [props])

  const responsiveHeight = useResponsiveDimension(config.responsive, config, 'height')
  const responsiveWidth = useResponsiveDimension(config.responsive, config, 'width')

  const isVisible = useIntersectionObserver(containerRef, config.animated === 'scroll')

  const blurDivs = useMemo(() => {
    const divs: React.ReactNode[] = []
    const increment = 100 / config.divCount
    const currentStrength =
      isHovered && config.hoverIntensity ? config.strength * config.hoverIntensity : config.strength

    const curveFunc = CURVE_FUNCTIONS[config.curve] || CURVE_FUNCTIONS.linear

    for (let i = 1; i <= config.divCount; i++) {
      const progress = curveFunc(i / config.divCount)

      const blurValue = config.exponential
        ? Math.pow(2, progress * 4) * 0.0625 * currentStrength
        : 0.0625 * (progress * config.divCount + 1) * currentStrength

      const p1 = Math.round((increment * i - increment) * 10) / 10
      const p2 = Math.round(increment * i * 10) / 10
      const p3 = Math.round((increment * i + increment) * 10) / 10
      const p4 = Math.round((increment * i + increment * 2) * 10) / 10

      let gradient = `transparent ${p1}%, black ${p2}%`
      if (p3 <= 100) gradient += `, black ${p3}%`
      if (p4 <= 100) gradient += `, transparent ${p4}%`

      const direction = getGradientDirection(config.position)

      divs.push(
        <div
          key={i}
          className="absolute inset-0"
          style={{
            maskImage: `linear-gradient(${direction}, ${gradient})`,
            WebkitMaskImage: `linear-gradient(${direction}, ${gradient})`,
            backdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
            opacity: config.opacity,
            transition:
              config.animated && config.animated !== 'scroll'
                ? `backdrop-filter ${config.duration} ${config.easing}`
                : undefined,
          }}
        />,
      )
    }

    return divs
  }, [config, isHovered])

  const containerStyle: CSSProperties = useMemo(() => {
    const isVertical = ['top', 'bottom'].includes(config.position)
    const isHorizontal = ['left', 'right'].includes(config.position)
    const isPageTarget = config.target === 'page'

    const baseStyle: CSSProperties = {
      position: isPageTarget ? 'fixed' : 'absolute',
      pointerEvents: config.hoverIntensity ? 'auto' : 'none',
      opacity: isVisible ? 1 : 0,
      transition: config.animated ? `opacity ${config.duration} ${config.easing}` : undefined,
      zIndex: isPageTarget ? config.zIndex + 100 : config.zIndex,
      ...config.style,
    }

    if (isVertical) {
      baseStyle.height = responsiveHeight
      baseStyle.width = responsiveWidth || '100%'
      baseStyle[config.position as 'top' | 'bottom'] = 0
      baseStyle.left = 0
      baseStyle.right = 0
    } else if (isHorizontal) {
      baseStyle.width = responsiveWidth || responsiveHeight
      baseStyle.height = '100%'
      baseStyle[config.position as 'left' | 'right'] = 0
      baseStyle.top = 0
      baseStyle.bottom = 0
    }

    return baseStyle
  }, [config, responsiveHeight, responsiveWidth, isVisible])

  const { hoverIntensity, animated, onAnimationComplete, duration } = config
  useEffect(() => {
    if (isVisible && animated === 'scroll' && onAnimationComplete) {
      const t = setTimeout(() => onAnimationComplete(), parseFloat(duration) * 1000)
      return () => clearTimeout(t)
    }
  }, [isVisible, animated, onAnimationComplete, duration])

  return (
    <div
      ref={containerRef}
      className={`gradual-blur relative isolate ${
        config.target === 'page' ? 'gradual-blur-page' : 'gradual-blur-parent'
      } ${config.className}`}
      style={containerStyle}
      onMouseEnter={hoverIntensity ? () => setIsHovered(true) : undefined}
      onMouseLeave={hoverIntensity ? () => setIsHovered(false) : undefined}
    >
      <div className="relative h-full w-full">{blurDivs}</div>
      {props.children && <div className="relative">{props.children}</div>}
    </div>
  )
}

const GradualBlurMemo = React.memo(GradualBlur)
GradualBlurMemo.displayName = 'GradualBlur'
export default GradualBlurMemo
