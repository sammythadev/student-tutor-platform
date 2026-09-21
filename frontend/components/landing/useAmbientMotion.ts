'use client'

import { useSyncExternalStore, type RefObject } from 'react'
import { useInView, useReducedMotion } from 'motion/react'

function subscribeVisibility(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

const getVisibility = () => document.visibilityState === 'visible'
const getServerVisibility = () => false

/** Automatic demos only run while visible, on screen, and motion is permitted. */
export function useAmbientMotion(ref: RefObject<HTMLElement | null>) {
  const visible = useSyncExternalStore(subscribeVisibility, getVisibility, getServerVisibility)
  const inView = useInView(ref, { amount: 0.15 })
  const reduced = useReducedMotion()

  return { active: visible && inView && reduced === false, reduced }
}
