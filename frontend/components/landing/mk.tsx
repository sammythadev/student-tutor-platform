import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* ──────────────────────────────────────────────────────────
   The layout spine, measured rather than chosen.

   Container is max-width 1280 with a 40px inline gutter, so the content box is
   exactly 1200 — and inside it a 12-column grid on a 28px gutter puts each
   column at 74.33px. Two placements recur across every body section and are the
   reason the page reads as one system:

     · the intro block  — column 4, capped at 576px
     · the body block   — columns 3–10, which lands at 790.67px

   Nothing here invents a value. The gutter steps down 40 → 20 → 16 and the
   section rhythm runs 32/48/64/96/128/196/280, both straight off the target.
────────────────────────────────────────────────────────── */

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('mx-auto w-full max-w-[1280px] px-4 md:px-5 lg:px-mk-outer', className)}>
      {children}
    </div>
  )
}

/* Vertical rhythm between body sections. `2xl` (280px) is the default gap the
   target uses between all five middle sections; margin rather than padding, so
   adjacent sections collapse into one gap instead of stacking two. */
export function Section({
  id,
  rhythm = '2xl',
  className,
  children,
  labelledBy,
}: {
  id?: string
  rhythm?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
  children: ReactNode
  labelledBy?: string
}) {
  const rhythms = {
    xs: 'my-mk-xs',
    sm: 'my-mk-sm',
    md: 'my-mk-md',
    lg: 'my-mk-lg',
    xl: 'my-mk-xl',
    '2xl': 'my-mk-2xl',
  } as const
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn(rhythms[rhythm], className)}>
      {children}
    </section>
  )
}

/* Section opener. A 20px/500 white line and a 20px/400 grey lead, in a 576px
   column that starts at column 4 — not a display heading. Getting this wrong is
   the single biggest tell in a clone of this page. */
export function Intro({
  id,
  heading,
  children,
  className,
}: {
  id?: string
  heading: string
  children?: ReactNode
  className?: string
}) {
  return (
    <Container className={className}>
      <div className="lg:pl-[calc(3*(74.33px+28px))]">
        <div className="max-w-[576px]">
          <h2 id={id} className="mk-h2-intro">
            {heading}
          </h2>
          {children ? <p className="mk-lead mt-1.5">{children}</p> : null}
        </div>
      </div>
    </Container>
  )
}

/* Columns 3–10 of the 1200px grid: 790.67px at 1440, full width below lg.
   Every card, bento and demo on the target sits in exactly this box. */
export function Body({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Container className={className}>
      <div className="lg:px-[calc(2*(74.33px+28px))]">{children}</div>
    </Container>
  )
}

/* ── Controls ──
   Primary is white-on-black at 8px radius; there is no coloured button anywhere
   on the target. The 300ms out-curve is measured, and `transition-colors` rather
   than `transition-all` keeps it off the compositor's critical path. */
export function ButtonPrimary({
  href,
  className,
  children,
  ...rest
}: { href: string; className?: string; children: ReactNode } & Omit<ComponentProps<typeof Link>, 'href'>) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex h-11 items-center justify-center rounded-lg bg-mk-inverse px-4 text-mk-small font-medium text-mk-inverse-fg',
        'transition-[color,background-color,transform] duration-160 ease-mk-out hover:bg-mk-ink-2 motion-safe:active:scale-[0.97]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-ink',
        'lg:text-base',
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  )
}

/* Secondary is a bare label with a chevron — no border, no fill. The chevron
   translating 2px on hover is the whole affordance. */
export function ButtonGhost({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-mk-small font-medium text-mk-ink',
        'transition-[color,background-color,transform] duration-160 ease-mk-out hover:bg-mk-accent-soft motion-safe:active:scale-[0.97]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-ink',
        'lg:text-base',
        className,
      )}
    >
      {children}
      <svg viewBox="0 0 16 16" aria-hidden className="size-4 opacity-60">
        <path
          d="M6 3.5 10.5 8 6 12.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-160 ease-mk-out motion-safe:group-hover:translate-x-0.5"
        />
      </svg>
    </Link>
  )
}
