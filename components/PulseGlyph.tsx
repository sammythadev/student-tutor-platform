export function PulseGlyph({ size = 24 }: { size?: number }) {
  return (
    <div className="inline-flex items-center justify-center gap-1" style={{ height: size, width: size }}>
      <div className="w-0.5 bg-ink-900 rounded-sm pulse-glyph-bar pulse-glyph-bar-1"></div>
      <div className="w-0.5 bg-ink-900 rounded-sm pulse-glyph-bar pulse-glyph-bar-2"></div>
      <div className="w-0.5 bg-ink-900 rounded-sm pulse-glyph-bar pulse-glyph-bar-3"></div>
    </div>
  )
}

export function PulseGlyphLoading() {
  return (
    <div className="flex items-center justify-center h-screen bg-canvas">
      <div className="flex flex-col items-center gap-4">
        <PulseGlyph size={40} />
        <p className="text-ink-400 text-sm">Loading...</p>
      </div>
    </div>
  )
}
