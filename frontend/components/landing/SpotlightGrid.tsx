'use client'

import { useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'

/* ──────────────────────────────────────────────────────────
   The pointer-tracked spotlight, on one listener.

   Every bento cell wants to know where the cursor is inside it, and the naive way
   to arrange that is an onPointerMove per cell -- which makes each cell a client
   component and puts eight listeners on a grid. Instead this wraps the grid, takes
   one pointermove, walks up to whichever direct child the event landed in, and
   writes --mx/--my on that child alone.

   Only one cell carries the custom properties at a time: the previous one is
   cleared on the way out, so an unhovered cell has no inline style left behind to
   confuse a later read. Writes are batched into a rAF because pointermove fires
   far faster than the compositor can use.

   The children stay server-rendered markup passed straight through -- nothing here
   needs to know what a cell contains.
────────────────────────────────────────────────────────── */

export default function SpotlightGrid({
  className,
  children,
  as: As = 'div',
}: {
  className?: string
  children: React.ReactNode
  as?: 'div' | 'ul' | 'ol'
}) {
  const root = useRef<HTMLElement>(null)
  const hot = useRef<HTMLElement | null>(null)
  const frame = useRef(0)

  const clear = useCallback(() => {
    const el = hot.current
    if (!el) return
    el.removeAttribute('data-hot')
    el.style.removeProperty('--mx')
    el.style.removeProperty('--my')
    hot.current = null
  }, [])

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const grid = root.current
      if (!grid) return
      const target = e.target as Node

      /* The direct child the pointer is inside. Cells are always children of the
         grid, so this is a walk of at most a dozen nodes, not a DOM query. */
      let cell: HTMLElement | null = null
      for (const child of Array.from(grid.children)) {
        if (child === target || child.contains(target)) {
          cell = child as HTMLElement
          break
        }
      }

      if (cell !== hot.current) clear()
      if (!cell) return

      const { clientX, clientY } = e
      hot.current = cell
      cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(() => {
        const box = cell.getBoundingClientRect()
        cell.dataset.hot = ''
        cell.style.setProperty('--mx', `${clientX - box.left}px`)
        cell.style.setProperty('--my', `${clientY - box.top}px`)
      })
    },
    [clear],
  )

  const onLeave = useCallback(() => {
    cancelAnimationFrame(frame.current)
    clear()
  }, [clear])

  return (
    <As
      ref={root as React.Ref<never>}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn('mk-spot', className)}
    >
      {children}
    </As>
  )
}
