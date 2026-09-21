'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'
import { BRAND, CTA, NAV } from './content'
import { Container } from './mk'

/* ──────────────────────────────────────────────────────────
   Header: 80px at desktop, 64px below — both measured.

   The bar is transparent over the hero and gains a hairline plus a blurred
   surface once the page moves; the target does the same and it is the only
   scroll-driven thing in the header. Links are 14px/500 in the muted ink and
   resolve to white on hover, which is the whole hover vocabulary here: no
   underline, no pill, no colour.

   The desktop row appears at lg and the menu button replaces it below, matching
   the target's own breakpoint (its nav collapses to logo + hamburger by 768).
────────────────────────────────────────────────────────── */

function Wordmark() {
  /* `py-2.5 -my-2.5` grows the tap target to 46px without moving the row: in a
     flex line the margin box is what gets centred, and the negative margin
     cancels the padding there. */
  return (
    <Link
      href="/"
      className="group -my-2.5 inline-flex items-center gap-2.5 rounded-md py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-ink"
      aria-label={`${BRAND} home`}
    >
      <span aria-hidden className="flex flex-col justify-center gap-[3px]">
        <span className="block h-[3px] w-[18px] rounded-full bg-mk-ink transition-[width] duration-300 ease-mk-out group-hover:w-[11px]" />
        <span className="block h-[3px] w-[11px] rounded-full bg-mk-ink-3 transition-[width] duration-300 ease-mk-out group-hover:w-[18px]" />
      </span>
      <span className="text-[17px] font-medium tracking-[-0.01em] text-mk-ink">{BRAND}</span>
    </Link>
  )
}

export default function Nav() {
  const [open, setOpen] = useState(false)
  const [lifted, setLifted] = useState(false)
  const panel = useRef<HTMLElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // This is a compact disclosure, not a modal: keep page scrolling and normal Tab order.
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false) }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [])

  /* Escape and outside presses dismiss the whole navbar disclosure. */
  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
        return
      }
    }

    const onOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !panel.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onOutside)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onOutside)
    }
  }, [open])

  return (
    <header
      ref={panel}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
      className={cn(
        'fixed inset-x-0 top-0 z-50 h-16 lg:h-mk-header',
        'transition-colors duration-300 ease-mk-out',
        open ? 'bg-mk-panel-sunken shadow-mk-ring-subtle' : lifted && 'bg-mk-panel-sunken/80 shadow-mk-ring-subtle backdrop-blur-xl',
      )}
    >
      <Container className="flex h-full items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Wordmark />
          <div className="flex size-11 shrink-0 items-center justify-center [&_button]:size-11">
            <ThemeToggle />
          </div>
          <nav aria-label="Main" className="hidden items-center lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-mk-small font-medium text-mk-ink-3 transition-colors duration-300 ease-mk-out hover:text-mk-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-1 lg:flex">
          <Link
            href={CTA.signIn.href}
            className="rounded-md px-3.5 py-2 text-mk-small font-medium text-mk-ink transition-colors duration-300 ease-mk-out hover:text-mk-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-ink"
          >
            {CTA.signIn.label}
          </Link>
          <Link
            href={CTA.primary.href}
            className="rounded-md bg-mk-inverse px-3.5 py-2 text-mk-small font-medium text-mk-inverse-fg transition-colors duration-300 ease-mk-out hover:bg-mk-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-ink"
          >
            {CTA.primary.label}
          </Link>
        </div>

        <button
          ref={trigger}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="-mr-2.5 grid size-11 place-items-center rounded-md text-mk-ink transition-colors duration-300 ease-mk-out hover:bg-mk-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-ink lg:hidden"
        >
          <span aria-hidden className="relative block h-[10px] w-[18px]">
            <span
              className={cn(
                'absolute inset-x-0 top-0 block h-[1.5px] rounded-full bg-current transition-transform duration-300 ease-mk-out',
                open && 'translate-y-[4.25px] rotate-45',
              )}
            />
            <span
              className={cn(
                'absolute inset-x-0 bottom-0 block h-[1.5px] rounded-full bg-current transition-transform duration-300 ease-mk-out',
                open && '-translate-y-[4.25px] -rotate-45',
              )}
            />
          </span>
        </button>
      </Container>

      {/* Content-sized disclosure shares the opaque navbar surface. */}
      <nav
        id="mobile-navigation"
        aria-label="Mobile navigation"
        hidden={!open}
        className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-mk-hairline-soft bg-mk-panel-sunken shadow-mk-ring-subtle lg:hidden"
      >
        <Container className="flex flex-col pb-3 pt-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center rounded-md text-sm font-medium text-mk-ink-3 transition-colors duration-150 hover:text-mk-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-ink"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-3 border-t border-mk-hairline-soft pt-3">
            <Link
              href={CTA.signIn.href}
              onClick={() => setOpen(false)}
              className="flex h-11 items-center justify-center rounded-lg shadow-mk-ring-subtle text-mk-small font-medium text-mk-ink"
            >
              {CTA.signIn.label}
            </Link>
            <Link
              href={CTA.primary.href}
              onClick={() => setOpen(false)}
              className="flex h-11 items-center justify-center rounded-lg bg-mk-inverse text-mk-small font-medium text-mk-inverse-fg"
            >
              {CTA.primary.label}
            </Link>
          </div>
        </Container>
      </nav>
    </header>
  )
}
