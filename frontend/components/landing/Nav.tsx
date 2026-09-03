'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { useTheme } from '@/lib/theme-context'
import { cn } from '@/lib/utils'
import { BRAND, CTA, NAV } from './content'

/* ──────────────────────────────────────────────────────────
   One bar at every width: wordmark, primary action, menu.

   The old page carried a full desktop link row and a separate mobile sheet, and
   the two drifted. A single menu is one code path, and it is where the
   appearance control belongs — a theme toggle in the header is a control most
   visitors use once, sitting in the space reserved for things they use always.

   Every glyph here is drawn rather than imported. The mark is two bars of
   unequal length, which is what the product does; the menu button is two rules
   that rotate into a cross.
────────────────────────────────────────────────────────── */

function Wordmark() {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none"
      aria-label={`${BRAND} home`}
    >
      <span aria-hidden className="flex flex-col justify-center gap-[3px]">
        <span className="block h-[3px] w-[18px] rounded-full bg-mk-accent transition-[width] duration-300 ease-out group-hover:w-[11px]" />
        <span className="block h-[3px] w-[11px] rounded-full bg-mk-ink-3 transition-[width] duration-300 ease-out group-hover:w-[18px]" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-mk-ink">{BRAND}</span>
    </Link>
  )
}

export default function Nav() {
  const [open, setOpen] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  /* Escape closes, focus goes back where it came from, and the page underneath
     cannot be scrolled while a full-height panel covers it. */
  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); trigger.current?.focus(); return }
      if (e.key !== 'Tab') return

      const focusables = panel.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      )
      if (!focusables?.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    }

    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    panel.current?.querySelector<HTMLElement>('a[href], button')?.focus()

    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useGSAP(() => {
    if (!open || !panel.current) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    gsap.from('[data-menu-item]', {
      y: 14,
      opacity: 0,
      duration: 0.34,
      stagger: 0.045,
      ease: 'power2.out',
      clearProps: 'transform,opacity',
    })
  }, { dependencies: [open], scope: panel })

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-mk-hairline',
        open
          ? 'bg-mk-panel-sunken'
          : 'bg-[var(--mk-panel-sunken)]/85 backdrop-blur-xl',
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 md:px-8">
        <Wordmark />

        <div className="flex items-center gap-2">
          <Link
            href={CTA.primary.href}
            className="hidden h-9 items-center rounded-md bg-mk-ink px-4 text-[13px] font-medium text-mk-panel transition-[background-color,transform] duration-150 ease-out hover:bg-mk-ink-2 active:scale-[0.98] sm:inline-flex"
          >
            {CTA.primary.label}
          </Link>

          <button
            ref={trigger}
            type="button"
            onClick={() => setOpen(v => !v)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="relative inline-flex size-11 items-center justify-center rounded-md border border-mk-hairline text-mk-ink transition-colors duration-150 hover:bg-mk-panel-hover"
          >
            <span
              aria-hidden
              className={cn(
                'absolute h-[1.5px] w-[17px] rounded-full bg-current transition-transform duration-200 ease-out',
                open ? 'rotate-45' : '-translate-y-[4px]',
              )}
            />
            <span
              aria-hidden
              className={cn(
                'absolute h-[1.5px] w-[17px] rounded-full bg-current transition-transform duration-200 ease-out',
                open ? '-rotate-45' : 'translate-y-[4px]',
              )}
            />
          </button>
        </div>
      </div>

      {open && (
        <>
          {/* A scrim, so the page behind the panel reads as out of reach. Scroll is
              already locked; this makes that visible. Keyboard users have Escape
              and the toggle, so it stays out of the tab order. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-x-0 bottom-0 top-16 z-0 cursor-default bg-black/45 backdrop-blur-[2px]"
          />
          <MenuPanel ref={panel} onClose={() => setOpen(false)} />
        </>
      )}
    </header>
  )
}

/* ──────────────────────────────────────────────────────────
   The panel. Links, then the account action, then appearance — in the order
   someone reaches for them.
────────────────────────────────────────────────────────── */

function MenuPanel({ ref, onClose }: { ref: React.Ref<HTMLDivElement>; onClose: () => void }) {
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="absolute inset-x-0 top-full z-10 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-mk-hairline bg-mk-panel shadow-[0_24px_48px_-24px_rgba(0,0,0,0.45)]"
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-4 md:px-8">
        <nav aria-label="Primary">
          <ul className="flex flex-col">
            {NAV.map(({ label, href }) => (
              <li key={label} data-menu-item>
                <Link
                  href={href}
                  onClick={onClose}
                  className="flex items-center justify-between rounded-lg px-3 py-3.5 text-[17px] font-medium text-mk-ink transition-colors duration-150 hover:bg-mk-panel-hover sm:text-[15px]"
                >
                  {label}
                  <span aria-hidden className="text-mk-ink-3">&rarr;</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mk-rule my-3" />

        <div data-menu-item className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={CTA.signIn.href}
            onClick={onClose}
            className="rounded-lg px-3 py-3 text-[15px] font-medium text-mk-ink-2 transition-colors duration-150 hover:bg-mk-panel-hover hover:text-mk-ink"
          >
            {CTA.signIn.label}
          </Link>
          <Link
            href={CTA.primary.href}
            onClick={onClose}
            className="inline-flex h-12 items-center justify-center rounded-[10px] bg-mk-ink px-5 text-[15px] font-medium text-mk-panel transition-[background-color,transform] duration-150 ease-out hover:bg-mk-ink-2 active:scale-[0.98] sm:hidden"
          >
            {CTA.primary.label}
          </Link>
        </div>

        <div className="mk-rule my-3" />

        <div data-menu-item className="flex items-center justify-between gap-4 px-3 py-2">
          <span className="text-[13px] font-medium text-mk-ink-2">Appearance</span>
          <ThemeSwitch />
        </div>
      </div>
    </div>
  )
}

/* A two-option segmented control rather than a cycling icon button: it says
   which mode is active, which a single sun-or-moon glyph never does. */
function ThemeSwitch() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const options: { value: 'dark' | 'light'; label: string }[] = [
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
  ]

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="inline-flex rounded-lg border border-mk-hairline bg-mk-panel-sunken p-0.5"
    >
      {options.map(opt => {
        /* Before hydration next-themes cannot know the resolved mode, so no
           option is marked active. Guessing here is what causes the flash of
           the wrong pressed state. */
        const active = mounted && theme === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(opt.value)}
            className={cn(
              'rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors duration-150',
              active ? 'bg-mk-panel text-mk-ink shadow-[0_1px_2px_rgba(0,0,0,0.10)]' : 'text-mk-ink-3 hover:text-mk-ink-2',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
