'use client'

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

interface StageHeightProps {
  /** Changing this (e.g. the step index) cross-fades and re-measures the content. */
  stepKey: string
  direction: number
  children: ReactNode
}

/**
 * Keeps the card from resizing between steps.
 *
 * Steps here range from ~120px (Exam board alone) to ~640px (subjects + custom subject),
 * so without this the Continue button jumps a few hundred pixels on every advance.
 * Structure follows react-bits/Stepper `StepContentWrapper`: the outgoing child is taken
 * out of flow with `position: absolute` and the wrapper animates to the measured height.
 *
 * One deliberate deviation from that source: it measures with `useLayoutEffect` on
 * `[children]`, which goes stale the moment stage content resizes after mount — expanding
 * "Show all subjects", or an error alert appearing. This uses a `ResizeObserver` instead.
 */
export function StageHeight({ stepKey, direction, children }: StageHeightProps) {
  const reduce = useReducedMotion()
  const [height, setHeight] = useState<number | 'auto'>('auto')
  const contentRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const node = contentRef.current
    if (!node) return
    setHeight(node.offsetHeight)
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) setHeight(entry.contentRect.height)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [stepKey])

  return (
    <motion.div
      className="relative overflow-hidden"
      initial={false}
      animate={{ height: height === 'auto' ? 'auto' : height }}
      transition={{ type: 'spring', stiffness: 260, damping: 30, mass: 0.6 }}
    >
      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <motion.div
          key={stepKey}
          ref={contentRef}
          custom={direction}
          variants={{
            enter: (d: number) => ({ x: d >= 0 ? '-6%' : '6%', opacity: 0 }),
            center: { x: '0%', opacity: 1 },
            exit: (d: number) => ({ x: d >= 0 ? '4%' : '-4%', opacity: 0 }),
          }}
          initial={reduce ? 'center' : 'enter'}
          animate="center"
          exit="exit"
          transition={reduce ? { duration: 0 } : { duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="min-w-0"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
