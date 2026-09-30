'use client'

import { motion, useReducedMotion } from 'motion/react'
import { type LucideIcon } from 'lucide-react'

export interface RailStep {
  title: string
  icon: LucideIcon
  /** Live readout of what the user has picked on this step. null = nothing set yet. */
  value: string | null
  optional?: boolean
}

interface StepRailProps {
  steps: RailStep[]
  current: number
  onStepChange: (index: number) => void
  disabled?: boolean
}

/**
 * The rail is both the progress tracker and the answer summary — one list, one job.
 *
 * Motivation: the page previously shipped two progress surfaces (a 1-5 box row above the
 * form plus a separate "preview" card in the left column) whose vocabularies disagreed,
 * so the same step name appeared three times per screen and the left column rendered
 * "Not set yet" four times. Collapsing them removes the duplication by construction.
 *
 * Structure adapts from react-bits/Stepper: the `inactive | active | complete` status
 * machine, the `pathLength` check draw-on, and the scaling connector. The connector here
 * runs vertically and uses `scaleY` so progress is continuous rather than per-box.
 */
export function StepRail({ steps, current, onStepChange, disabled }: StepRailProps) {
  return (
    <nav aria-label="Setup progress" className="hidden min-w-0 lg:block">
      <h2 className="mb-4 px-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        Setup progress
      </h2>
      <ol className="min-w-0">
        {steps.map((step, index) => (
          <RailRow
            key={step.title}
            step={step}
            index={index}
            isLast={index === steps.length - 1}
            state={index < current ? 'complete' : index === current ? 'active' : 'inactive'}
            disabled={disabled}
            onSelect={() => onStepChange(index)}
          />
        ))}
      </ol>
    </nav>
  )
}

type RailState = 'inactive' | 'active' | 'complete'

function RailRow({
  step,
  index,
  isLast,
  state,
  disabled,
  onSelect,
}: {
  step: RailStep
  index: number
  isLast: boolean
  state: RailState
  disabled?: boolean
  onSelect: () => void
}) {
  // A connector between steps i and i+1 is filled once the user is past step i.
  const reduce = useReducedMotion()
  const active = state === 'active'
  const complete = state === 'complete'
  const reachable = state !== 'inactive' && !disabled
  const Icon = step.icon

  return (
    <li className="flex min-w-0 gap-3">
      {/* Marker column. The connector lives here so it always threads marker-to-marker
          regardless of how tall the row's text block becomes. */}
      <div className="flex shrink-0 flex-col items-center">
        <span
          className={[
            'relative flex size-6 shrink-0 items-center justify-center rounded-full',
            'bg-[var(--canvas)] text-[11px] font-semibold tabular-nums transition-colors',
            complete
              ? 'bg-[var(--primary)] text-[var(--primary-fg)]'
              : active
                ? 'border-2 border-[var(--primary)] text-[var(--primary)]'
                : 'border border-[var(--border-strong)] text-[var(--text-muted)]',
          ].join(' ')}
        >
          {complete ? (
            <CheckMark reduce={!!reduce} />
          ) : active ? (
            <ActiveDot reduce={!!reduce} />
          ) : (
            <span aria-hidden="true">{index + 1}</span>
          )}
        </span>

        {!isLast && (
          <span aria-hidden="true" className="relative w-px flex-1 overflow-hidden bg-[var(--border-strong)]">
            <motion.span
              className="absolute inset-0 origin-top bg-[var(--primary)]"
              initial={false}
              animate={{ scaleY: state === 'complete' ? 1 : 0 }}
              transition={reduce ? { duration: 0 } : { duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            />
          </span>
        )}
      </div>

      <button
        type="button"
        disabled={!reachable}
        onClick={onSelect}
        aria-current={active ? 'step' : undefined}
        aria-label={
          complete
            ? `${step.title}, completed, go back and edit`
            : active
              ? `${step.title}, current step`
              : `${step.title}, upcoming step`
        }
        className={[
          'min-w-0 flex-1 rounded-xl p-2 pb-4 text-left',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)]',
          'disabled:cursor-default',
          active ? 'bg-[var(--surface-2)]' : 'enabled:hover:bg-[var(--surface-2)]',
        ].join(' ')}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Icon
            aria-hidden="true"
            strokeWidth={1.75}
            className={[
              'size-4 shrink-0',
              active ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]',
            ].join(' ')}
          />
          <span
            className={[
              'min-w-0 truncate text-sm',
              active
                ? 'font-semibold text-[var(--text-primary)]'
                : complete
                  ? 'text-[var(--text-secondary)]'
                  : 'text-[var(--text-muted)]',
            ].join(' ')}
          >
            {step.title}
          </span>
          {step.optional && (
            <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              Optional
            </span>
          )}
        </span>

        {/* No "Not set yet" placeholder. An unanswered step shows nothing, which keeps
            the rail quiet instead of repeating empty state down the column. */}
        {step.value && (
          <span
            className={[
              'mt-1 block break-words pl-6 text-xs',
              active ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]',
            ].join(' ')}
          >
            {step.value}
          </span>
        )}
      </button>
    </li>
  )
}

/** react-bits/Stepper `CheckIcon`: the stroke draws itself in. */
function CheckMark({ reduce }: { reduce: boolean }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      viewBox="0 0 24 24"
      className="size-3.5"
    >
      <motion.path
        d="M5 13l4 4L19 7"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={reduce ? { duration: 0 } : { delay: 0.1, type: 'tween', ease: 'easeOut', duration: 0.3 }}
      />
    </svg>
  )
}

/** react-bits/Stepper active state: a solid dot inside a ring, breathing once per second. */
function ActiveDot({ reduce }: { reduce: boolean }) {
  return (
    <motion.span
      aria-hidden="true"
      className="size-2 rounded-full bg-[var(--primary)]"
      animate={reduce ? undefined : { scale: [1, 1.15, 1] }}
      transition={reduce ? undefined : { duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}
