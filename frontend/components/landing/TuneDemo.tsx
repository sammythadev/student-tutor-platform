'use client'

import { useState } from 'react'
import { Tabs } from 'radix-ui'
import { cn } from '@/lib/utils'
import { TUNE_INTRO, TUNE_SNIPPETS } from './content'
import { Body, ButtonGhost, Intro, Section } from './mk'
import CursorPlayground from './CursorPlayground'
import WeightSliders from './WeightSliders'

/* ──────────────────────────────────────────────────────────
   The interactive section: a live demo above, tab-switched code below.

   This is the target's shape exactly — a split demo pane in the 8-column card,
   then a row of language tabs where the active one is a filled panel rather than
   an underline, then a monospace block with line numbers. The demo is the one
   thing on the page the reader drives, which is why it earns the space.

   Colours in the code block are the target's measured syntax palette rather than
   a generic theme: keyword violet #9f8dfc, class cyan #00c1d6, string mint
   #70e1c8, number amber #ffc266, comment #edecee at 40%.
────────────────────────────────────────────────────────── */

const SYNTAX = {
  keyword: '#9f8dfc',
  klass: '#00c1d6',
  string: '#70e1c8',
  number: '#ffc266',
  comment: 'rgb(237 236 238 / 0.4)',
  punct: '#bf7af0',
  text: '#edecee',
} as const

/* A deliberately small tokeniser: enough for JSON and a few JS lines, and it
   never runs on anything but the literals in content.ts. Ordered so that
   comments and strings win before identifiers get a chance to match inside them. */
function highlight(line: string) {
  const parts: { text: string; color: string }[] = []
  const re =
    /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*")|\b(POST|GET|function|return|const|let|score|if)\b|\b(\d+\.?\d*)\b|([{}[\],:;=+*])/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(line))) {
    if (m.index > last) parts.push({ text: line.slice(last, m.index), color: SYNTAX.text })
    const color = m[1]
      ? SYNTAX.comment
      : m[2]
        ? SYNTAX.string
        : m[3]
          ? SYNTAX.keyword
          : m[4]
            ? SYNTAX.number
            : SYNTAX.punct
    parts.push({ text: m[0], color })
    last = m.index + m[0].length
  }
  if (last < line.length) parts.push({ text: line.slice(last), color: SYNTAX.text })
  return parts
}

function CodeBlock({ code }: { code: string }) {
  const lines = code.split('\n')
  return (
    <pre className="overflow-x-auto px-4 py-4 font-mono text-[13px] leading-[1.43] lg:px-5 lg:text-sm">
      <code>
        {lines.map((line, i) => (
          <span key={i} className="grid grid-cols-[2ch_1fr] gap-4">
            <span className="select-none text-right text-mk-ink-4">{i + 1}</span>
            <span>
              {highlight(line).map((part, j) => (
                <span key={j} style={{ color: part.color }}>
                  {part.text}
                </span>
              ))}
            </span>
          </span>
        ))}
      </code>
    </pre>
  )
}

export default function TuneDemo() {
  const [active, setActive] = useState(TUNE_SNIPPETS[0].key)

  return (
    <Section id="tune" rhythm="2xl" labelledBy="tune-title">
      <Intro id="tune-title" heading={TUNE_INTRO.heading}>
        <span dangerouslySetInnerHTML={{ __html: TUNE_INTRO.lead }} />
      </Intro>

      <Body className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <ButtonGhost href="/tutors">Browse tutors</ButtonGhost>
          <ButtonGhost href="#fair">Read the criteria</ButtonGhost>
        </div>
      </Body>

      <Body className="mt-mk-md">
        <div className="overflow-hidden rounded-xl bg-mk-panel-sunken shadow-mk-ring-subtle">
          <CursorPlayground />
          <WeightSliders />

          {/* Radix owns the tab semantics here rather than a hand-rolled
              role="tablist". The hand-rolled version had the roles but none of
              the behaviour they promise — no arrow-key navigation, no roving
              tabindex, no tabpanel association — so a keyboard reader could see
              four tabs and reach only the first. */}
          <Tabs.Root
            value={active}
            onValueChange={setActive}
            className="border-t border-mk-hairline-opaque"
          >
            <Tabs.List aria-label="Code sample" className="flex items-center gap-1 px-3 py-2">
              {TUNE_SNIPPETS.map((s) => (
                <Tabs.Trigger
                  key={s.key}
                  value={s.key}
                  className={cn(
                    'inline-flex min-h-9 items-center justify-center rounded-md px-3 py-1.5 text-mk-small font-medium',
                    'transition-colors duration-300 ease-mk-out lg:min-h-0',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-ink',
                    active === s.key
                      ? 'bg-mk-panel text-mk-ink shadow-mk-ring-subtle'
                      : 'text-mk-ink-3 hover:text-mk-ink',
                  )}
                >
                  {s.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            {TUNE_SNIPPETS.map((s) => (
              <Tabs.Content key={s.key} value={s.key}>
                <CodeBlock code={s.code} />
              </Tabs.Content>
            ))}
          </Tabs.Root>
        </div>
      </Body>
    </Section>
  )
}
