'use client'

export interface SummaryItem {
  label: string
  value: string | null
}

/** A quiet answer reference, not a second completion tracker. */
export function OnboardSummary({ items, heading }: { items: SummaryItem[]; heading: string }) {
  return (
    <aside aria-label="Your selections so far" className="hidden min-w-0 lg:block">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">{heading}</h2>
        <dl className="mt-5 space-y-4">
          {items.map(item => (
            <div key={item.label}>
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="mt-1 break-words text-sm font-medium text-foreground">{item.value ?? 'Not set yet'}</dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  )
}
