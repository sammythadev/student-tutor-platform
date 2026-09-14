import type { TileKind } from './content'

/* ──────────────────────────────────────────────────────────
   The miniature inside each carousel tile.

   Ten tiles all drawing the same five-row mockup is what made the moving row read
   as empty: it moved, but nothing in it changed, so there was nothing to look at.
   The reference gives every tile a recognisably different interface fragment, and
   that difference -- not the motion -- is what makes the band worth watching.

   So each tile gets the surface it names, drawn in this product's own vocabulary:
   scored rows, weight sliders, an overlap grid, a day of real slots. All of it is
   generated markup keyed to the tile's hue, so nothing is imported, nothing is a
   screenshot that will rot, and the colour is the one thing the black page is
   short of.

   Everything here is decorative -- the tile's heading already says what it is, so
   the art is aria-hidden at the call site and never announced twice.
────────────────────────────────────────────────────────── */

/* Shared primitives. `hue` arrives as a hex string and is composited with
   colour-mix so one accent can carry a whole tile at several strengths without
   ten more props. */
const tint = (hue: string, pct: number) => `color-mix(in oklab, ${hue} ${pct}%, transparent)`
const INK = 'rgb(20 23 22 / 0.09)'

function Line({ w, h = 8 }: { w: string; h?: number }) {
  return <span className="block rounded-full" style={{ width: w, height: h, background: INK }} />
}

/* ── Shortlist: ranked names, each with the score that produced the rank. ── */
function Shortlist({ hue }: { hue: string }) {
  return (
    <div className="flex flex-col gap-2.5">
      {[97, 91, 86, 78, 64].map((score, i) => (
        <div key={score} className="flex items-center gap-2.5">
          <span className="w-2.5 shrink-0 text-[9px] font-medium tabular-nums" style={{ color: 'rgb(20 23 22 / 0.35)' }}>
            {i + 1}
          </span>
          <span className="size-6 shrink-0 rounded-full" style={{ background: tint(hue, 88 - i * 13) }} />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Line w={`${72 - i * 7}%`} h={7} />
            <span className="block h-1.5 overflow-hidden rounded-full" style={{ background: INK }}>
              <span className="block h-full rounded-full" style={{ width: `${score}%`, background: tint(hue, 80) }} />
            </span>
          </div>
          <span
            className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
            style={{ background: tint(hue, 14), color: `color-mix(in oklab, ${hue} 72%, #14100e)` }}
          >
            {score}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ── Weights: four tracks, four knobs, one of them mid-drag. ── */
function Weights({ hue }: { hue: string }) {
  return (
    <div className="flex flex-col gap-4 pt-1">
      {[0.62, 0.34, 0.48, 0.22].map((v, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Line w={`${38 - i * 4}%`} h={6} />
            <span className="text-[9px] font-medium tabular-nums" style={{ color: 'rgb(20 23 22 / 0.42)' }}>
              {v.toFixed(2)}
            </span>
          </div>
          <span className="relative block h-1.5 rounded-full" style={{ background: INK }}>
            <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${v * 100}%`, background: tint(hue, 82) }} />
            <span
              className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
              style={{ left: `${v * 100}%`, background: hue, boxShadow: '0 1px 3px rgb(20 23 22 / 0.28)' }}
            />
          </span>
        </div>
      ))}
    </div>
  )
}

/* ── Overlap: two calendars laid over each other; only the intersection counts. ── */
function Overlap({ hue }: { hue: string }) {
  const yours = new Set([2, 3, 7, 8, 12, 16, 17, 21])
  const theirs = new Set([3, 4, 8, 9, 12, 13, 17, 22])
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex gap-1.5">
        {['M', 'T', 'W', 'T', 'F'].map((d, i) => (
          <span key={i} className="flex-1 text-center text-[9px] font-medium" style={{ color: 'rgb(20 23 22 / 0.35)' }}>
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: 25 }, (_, i) => {
          const both = yours.has(i) && theirs.has(i)
          return (
            <span
              key={i}
              className="block rounded"
              style={{
                aspectRatio: '1 / 1.15',
                background: both ? tint(hue, 85) : yours.has(i) || theirs.has(i) ? tint(hue, 20) : INK,
                boxShadow: both ? `0 0 0 1.5px ${tint(hue, 95)}` : undefined,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

/* ── Booking: a day of real slots, the taken ones struck out. ── */
function Booking({ hue }: { hue: string }) {
  const slots = [
    { t: '09:00', state: 'gone' }, { t: '11:00', state: 'open' },
    { t: '13:00', state: 'gone' }, { t: '16:00', state: 'picked' },
    { t: '18:00', state: 'open' },
  ] as const
  return (
    <div className="flex flex-col gap-2">
      {slots.map((s) => (
        <div
          key={s.t}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2"
          style={{
            background: s.state === 'picked' ? tint(hue, 13) : 'rgb(20 23 22 / 0.035)',
            boxShadow: s.state === 'picked' ? `0 0 0 1.5px ${tint(hue, 55)}` : undefined,
            opacity: s.state === 'gone' ? 0.45 : 1,
          }}
        >
          <span
            className="text-[10px] font-medium tabular-nums"
            style={{
              color: s.state === 'gone' ? 'rgb(20 23 22 / 0.4)' : 'rgb(20 23 22 / 0.72)',
              textDecoration: s.state === 'gone' ? 'line-through' : undefined,
            }}
          >
            {s.t}
          </span>
          <Line w="42%" h={6} />
          {s.state === 'picked' && (
            <svg viewBox="0 0 16 16" className="ml-auto size-3.5" fill="none" stroke={hue} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8.5 6.5 12 13 4.5" />
            </svg>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── Waitlist: a position, not a rejection. ── */
function Waitlist({ hue }: { hue: string }) {
  return (
    <div className="flex h-full flex-col">
      <div
        className="flex items-center gap-3 rounded-xl px-3 py-3"
        style={{ background: tint(hue, 12), boxShadow: `0 0 0 1.5px ${tint(hue, 40)}` }}
      >
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full text-[12px] font-semibold"
          style={{ background: hue, color: '#fff' }}
        >
          3
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Line w="58%" h={7} />
          <Line w="38%" h={5} />
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2" style={{ background: 'rgb(20 23 22 / 0.035)' }}>
            <span className="size-5 shrink-0 rounded-full" style={{ background: INK }} />
            <Line w={`${52 - i * 8}%`} h={6} />
          </div>
        ))}
      </div>
      <p className="mt-auto pt-2 text-[9.5px] leading-snug" style={{ color: 'rgb(20 23 22 / 0.42)' }}>
        Allocated when a verified tutor opens up
      </p>
    </div>
  )
}

/* ── Both sides: the same arithmetic, run the other way. ── */
function BothSides({ hue }: { hue: string }) {
  return (
    <div className="flex h-full items-stretch gap-2">
      {[0, 1].map((col) => (
        <div key={col} className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-1.5 pb-0.5">
            <span className="size-4 rounded" style={{ background: tint(hue, col ? 40 : 85) }} />
            <Line w="52%" h={5} />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: 'rgb(20 23 22 / 0.035)' }}>
              <span className="size-4 shrink-0 rounded-full" style={{ background: tint(hue, 70 - i * 14) }} />
              <Line w={`${62 - i * 9}%`} h={5} />
            </div>
          ))}
        </div>
      ))}
      {/* The pair of arrows that says it runs in both directions. */}
      <svg viewBox="0 0 16 40" className="w-3 shrink-0 self-center" fill="none" stroke={tint(hue, 70)} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 13h11M9.5 9.5 13 13l-3.5 3.5" />
        <path d="M14 27H3M6.5 23.5 3 27l3.5 3.5" />
      </svg>
    </div>
  )
}

/* ── Messages: the thread a match opens. ── */
function Messages({ hue }: { hue: string }) {
  const thread = [
    { me: false, w: '76%' }, { me: true, w: '58%' },
    { me: false, w: '48%' }, { me: true, w: '68%' },
  ]
  return (
    <div className="flex h-full flex-col gap-2.5">
      {thread.map((m, i) => (
        <div key={i} className={m.me ? 'flex justify-end' : 'flex items-end gap-2'}>
          {!m.me && <span className="size-6 shrink-0 rounded-full" style={{ background: tint(hue, 55) }} />}
          <span
            className="flex flex-col gap-1.5 rounded-2xl px-3 py-2.5"
            style={{
              width: m.w,
              background: m.me ? tint(hue, 88) : 'rgb(20 23 22 / 0.05)',
              borderBottomRightRadius: m.me ? 6 : undefined,
              borderBottomLeftRadius: m.me ? undefined : 6,
            }}
          >
            <span className="block h-1.5 rounded-full" style={{ width: '90%', background: m.me ? 'rgb(255 255 255 / 0.75)' : INK }} />
            <span className="block h-1.5 rounded-full" style={{ width: '62%', background: m.me ? 'rgb(255 255 255 / 0.5)' : INK }} />
          </span>
        </div>
      ))}
      <div className="mt-auto flex items-center gap-2 rounded-full px-3 py-2" style={{ background: 'rgb(20 23 22 / 0.045)' }}>
        <Line w="46%" h={6} />
        <span className="ml-auto grid size-6 shrink-0 place-items-center rounded-full" style={{ background: hue }}>
          <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" />
          </svg>
        </span>
      </div>
    </div>
  )
}

/* ── Sessions: one agenda, both sides on it. ── */
function Sessions({ hue }: { hue: string }) {
  const days = [
    { d: 'Tue', t: '16:00', now: true }, { d: 'Thu', t: '16:00', now: false },
    { d: 'Sat', t: '10:00', now: false }, { d: 'Tue', t: '16:00', now: false },
  ]
  return (
    <div className="flex h-full flex-col gap-2">
      {days.map((s, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5"
          style={{
            background: s.now ? tint(hue, 12) : 'rgb(20 23 22 / 0.035)',
            boxShadow: s.now ? `0 0 0 1.5px ${tint(hue, 45)}` : undefined,
          }}
        >
          <span className="flex w-8 shrink-0 flex-col items-center">
            <span className="text-[9px] font-medium uppercase" style={{ color: 'rgb(20 23 22 / 0.4)' }}>{s.d}</span>
            <span className="text-[11px] font-semibold tabular-nums" style={{ color: 'rgb(20 23 22 / 0.75)' }}>{s.t}</span>
          </span>
          <span className="h-7 w-1 shrink-0 rounded-full" style={{ background: tint(hue, s.now ? 90 : 35) }} />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Line w={`${66 - i * 6}%`} h={6} />
            <Line w={`${42 - i * 5}%`} h={5} />
          </div>
          {s.now && (
            <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ background: hue, color: '#fff' }}>
              Join
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── Feedback: what a rating moves. ── */
function Feedback({ hue }: { hue: string }) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <svg key={i} viewBox="0 0 20 20" className="size-5" fill={i < 4 ? hue : 'rgb(20 23 22 / 0.1)'}>
            <path d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L1.6 7.7l5.8-.8z" />
          </svg>
        ))}
        <span className="ml-1.5 text-[11px] font-semibold tabular-nums" style={{ color: 'rgb(20 23 22 / 0.72)' }}>4.0</span>
      </div>
      <div className="flex flex-col gap-2">
        {[0.9, 0.72, 0.55].map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <Line w="26%" h={5} />
            <span className="block h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: INK }}>
              <span className="block h-full rounded-full" style={{ width: `${v * 100}%`, background: tint(hue, 78) }} />
            </span>
          </div>
        ))}
      </div>
      {/* The delta: a rating is only interesting if it moves the next score. */}
      <div className="mt-auto flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: tint(hue, 11) }}>
        <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke={hue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 13V3M4.5 6.5 8 3l3.5 3.5" />
        </svg>
        <Line w="52%" h={6} />
        <span className="ml-auto text-[10px] font-semibold tabular-nums" style={{ color: `color-mix(in oklab, ${hue} 72%, #14100e)` }}>
          +0.04
        </span>
      </div>
    </div>
  )
}

/* ── Fairness: the load levelling out, nobody buried and nobody idle. ── */
function Fairness({ hue }: { hue: string }) {
  const before = [0.95, 0.72, 0.28, 0.12, 0.5]
  const after = [0.6, 0.56, 0.52, 0.5, 0.54]
  return (
    <div className="flex h-full flex-col gap-3">
      {[
        { rows: before, label: 'Greedy alone', strong: false },
        { rows: after, label: 'With fairness', strong: true },
      ].map((group) => (
        <div key={group.label} className="flex flex-col gap-2">
          <span className="text-[9px] font-medium uppercase tracking-wide" style={{ color: 'rgb(20 23 22 / 0.38)' }}>
            {group.label}
          </span>
          <div className="flex items-end gap-1.5" style={{ height: 56 }}>
            {group.rows.map((v, i) => (
              <span
                key={i}
                className="flex-1 rounded-t"
                style={{ height: `${v * 100}%`, background: group.strong ? tint(hue, 82) : INK }}
              />
            ))}
          </div>
        </div>
      ))}
      {/* The cap line the second group sits under. */}
      <p className="mt-auto text-[9.5px] leading-snug" style={{ color: 'rgb(20 23 22 / 0.42)' }}>
        Same total score, spread across five tutors
      </p>
    </div>
  )
}

const ART: Record<TileKind, (p: { hue: string }) => React.ReactElement> = {
  shortlist: Shortlist,
  weights: Weights,
  overlap: Overlap,
  booking: Booking,
  waitlist: Waitlist,
  bothSides: BothSides,
  messages: Messages,
  sessions: Sessions,
  feedback: Feedback,
  fairness: Fairness,
}

export default function TileArt({ kind, hue }: { kind: TileKind; hue: string }) {
  const Art = ART[kind]
  return <Art hue={hue} />
}
