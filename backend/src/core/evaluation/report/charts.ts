/**
 * Dependency-free SVG chart primitives for the benchmark report.
 *
 * WHY SVG: the report has to be presentable (README, docs, a slide) without
 * adding a plotting dependency to the backend, and without a browser to render
 * it. SVG is text, so the figures are diffable, reviewable and regenerable, and
 * a PNG is one headless-chrome call away (see `build-report.ts`).
 *
 * Everything here is pure: data in, SVG string out. No I/O, no globals.
 */

export interface Series {
  name: string;
  /** One entry per category; `null` renders as a gap, not a zero. */
  values: (number | null)[];
  /** Optional CI half-widths, same shape as `values`. */
  errors?: (number | null)[];
}

export interface ChartOptions {
  title: string;
  /** Small print under the title (axes meaning, sample size, caveats). */
  subtitle?: string;
  categories: string[];
  series: Series[];
  yLabel: string;
  yMin?: number;
  yMax?: number;
  /** Formats axis ticks and value labels. Defaults to 3 decimal places. */
  valueFormat?: (value: number) => string;
  width?: number;
  height?: number;
  /** Bars grow from here. Use a non-zero value for diverging charts. */
  baseline?: number;
  /** Draws `baseline` as a labelled reference line (needed when it isn't 0). */
  baselineLabel?: string;
}

const INK = '#111827';
const MUTED = '#6b7280';
const GRID = '#e5e7eb';
const AXIS = '#9ca3af';
const FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif";

/** Stable strategy colours — the engine is always the dark reference series. */
export const PALETTE: Record<string, string> = {
  'fcfs-filter': '#94a3b8',
  'fcfs-best': '#60a5fa',
  'da-stable': '#f59e0b',
  'greedy-engine': '#111827',
};

const FALLBACK = ['#2563eb', '#dc2626', '#059669', '#7c3aed', '#db2777'];

export const colorFor = (name: string, index: number): string =>
  PALETTE[name] ?? FALLBACK[index % FALLBACK.length];

export const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const defaultFormat = (value: number): string =>
  Math.abs(value) >= 1000 ? value.toFixed(0) : value.toFixed(3);

/** Round tick step (1/2/5 × 10ⁿ) so axis labels read as human numbers. */
function tickStep(span: number, target: number): number {
  const rough = span / Math.max(1, target);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function niceTicks(min: number, max: number, target = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [0, 1];
  }
  if (min === max) {
    return [min];
  }
  const step = tickStep(max - min, target);
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= end + step / 2; value += step) {
    ticks.push(Number(value.toFixed(10)));
  }
  return ticks;
}

/** Bounds that always include the baseline and leave headroom for value labels. */
function resolveDomain(options: ChartOptions): { min: number; max: number } {
  const baseline = options.baseline ?? 0;
  const values: number[] = [baseline];
  for (const series of options.series) {
    series.values.forEach((value, index) => {
      if (value === null || !Number.isFinite(value)) {
        return;
      }
      const error = series.errors?.[index] ?? 0;
      values.push(value + error, value - error);
    });
  }
  const rawMin = options.yMin ?? Math.min(...values);
  const rawMax = options.yMax ?? Math.max(...values);
  if (rawMin === rawMax) {
    return { min: rawMin - 0.5, max: rawMax + 0.5 };
  }
  return { min: rawMin, max: rawMax };
}

function text(
  x: number,
  y: number,
  content: string,
  opts: { size?: number; fill?: string; anchor?: string; weight?: number } = {},
): string {
  const { size = 11, fill = MUTED, anchor = 'middle', weight = 400 } = opts;
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${escapeXml(
    content,
  )}</text>`;
}

function frame(width: number, height: number, title: string, subtitle?: string): string {
  const parts = [`<rect width="${width}" height="${height}" fill="#ffffff"/>`];
  parts.push(
    `<text x="24" y="30" font-family="${FONT}" font-size="16" font-weight="600" fill="${INK}">${escapeXml(
      title,
    )}</text>`,
  );
  if (subtitle) {
    parts.push(
      `<text x="24" y="50" font-family="${FONT}" font-size="11.5" fill="${MUTED}">${escapeXml(
        subtitle,
      )}</text>`,
    );
  }
  return parts.join('');
}

interface Plot {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Value label above each bar, skipped when the bar is too narrow to label. */
function barLabel(
  x: number,
  y: number,
  value: number | null,
  format: (value: number) => string,
  slot: number,
): string {
  if (value === null || slot < 34) {
    return '';
  }
  return text(x, y, format(value), { size: 10, fill: INK, weight: 500 });
}

function legend(items: { name: string; color: string }[], x: number, y: number): string {
  let cursor = x;
  const parts: string[] = [];
  for (const item of items) {
    parts.push(
      `<rect x="${cursor}" y="${y - 8}" width="10" height="10" rx="2" fill="${item.color}"/>`,
    );
    parts.push(text(cursor + 15, y, item.name, { size: 11, fill: MUTED, anchor: 'start' }));
    cursor += 15 + item.name.length * 6.4 + 20;
  }
  return parts.join('');
}

/**
 * Grouped bars, optionally with 95% CI whiskers, growing from `baseline`.
 *
 * Used for both the means (baseline 0) and the engine deltas (baseline 0 with
 * negative bars), so a single primitive covers every bar figure.
 */
export function groupedBarChart(options: ChartOptions): string {
  const width = options.width ?? 960;
  const height = options.height ?? 460;
  const format = options.valueFormat ?? defaultFormat;
  const baseline = options.baseline ?? 0;
  const { min, max } = resolveDomain(options);
  const ticks = niceTicks(min, max);
  const domainMin = Math.min(...ticks, min);
  const domainMax = Math.max(...ticks, max);

  const legendItems = options.series.map((series, index) => ({
    name: series.name,
    color: colorFor(series.name, index),
  }));

  const plot: Plot = { left: 64, top: 96, width: width - 64 - 28, height: height - 96 - 56 };
  const yOf = (value: number): number =>
    plot.top + plot.height - ((value - domainMin) / (domainMax - domainMin)) * plot.height;

  const parts: string[] = [frame(width, height, options.title, options.subtitle)];
  parts.push(legend(legendItems, 24, 72));

  // Gridlines + y ticks
  for (const tick of ticks) {
    const y = yOf(tick);
    parts.push(
      `<line x1="${plot.left}" y1="${y.toFixed(1)}" x2="${plot.left + plot.width}" y2="${y.toFixed(
        1,
      )}" stroke="${tick === baseline ? AXIS : GRID}" stroke-width="1"/>`,
    );
    parts.push(text(plot.left - 10, y + 4, format(tick), { size: 10, anchor: 'end' }));
  }

  const zeroY = yOf(baseline);
  const groupWidth = plot.width / options.categories.length;
  const barGap = 2;
  const seriesCount = options.series.length;
  const barWidth = Math.max(2, (groupWidth * 0.72 - barGap * (seriesCount - 1)) / seriesCount);

  options.categories.forEach((category, groupIndex) => {
    const groupStart = plot.left + groupIndex * groupWidth;
    const offset = (groupWidth - (barWidth * seriesCount + barGap * (seriesCount - 1))) / 2;

    options.series.forEach((series, seriesIndex) => {
      const value = series.values[groupIndex] ?? null;
      if (value === null || !Number.isFinite(value)) {
        return;
      }
      const color = colorFor(series.name, seriesIndex);
      const x = groupStart + offset + seriesIndex * (barWidth + barGap);
      const valueY = yOf(value);
      const top = Math.min(valueY, zeroY);
      const barHeight = Math.max(1, Math.abs(valueY - zeroY));
      parts.push(
        `<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${barWidth.toFixed(
          1,
        )}" height="${barHeight.toFixed(1)}" fill="${color}"/>`,
      );

      const error = series.errors?.[groupIndex] ?? null;
      if (error !== null && error > 0) {
        const highY = yOf(value + error);
        const lowY = yOf(value - error);
        const centre = x + barWidth / 2;
        parts.push(
          `<line x1="${centre.toFixed(1)}" y1="${highY.toFixed(1)}" x2="${centre.toFixed(
            1,
          )}" y2="${lowY.toFixed(1)}" stroke="${INK}" stroke-width="1"/>` +
            `<line x1="${(centre - 3).toFixed(1)}" y1="${highY.toFixed(1)}" x2="${(
              centre + 3
            ).toFixed(1)}" y2="${highY.toFixed(1)}" stroke="${INK}" stroke-width="1"/>` +
            `<line x1="${(centre - 3).toFixed(1)}" y1="${lowY.toFixed(1)}" x2="${(
              centre + 3
            ).toFixed(1)}" y2="${lowY.toFixed(1)}" stroke="${INK}" stroke-width="1"/>`,
        );
      }

      const labelY = value >= baseline ? top - 5 : top + barHeight + 12;
      parts.push(barLabel(x + barWidth / 2, labelY, value, format, barWidth));
    });

    parts.push(
      text(groupStart + groupWidth / 2, plot.top + plot.height + 20, category, {
        size: 11,
        fill: INK,
      }),
    );
  });

  parts.push(
    `<line x1="${plot.left}" y1="${plot.top + plot.height}" x2="${plot.left + plot.width}" y2="${
      plot.top + plot.height
    }" stroke="${AXIS}" stroke-width="1"/>`,
  );

  if (options.baselineLabel && baseline !== 0) {
    parts.push(
      text(plot.left + plot.width, zeroY - 6, options.baselineLabel, {
        size: 10,
        anchor: 'end',
        fill: MUTED,
      }),
    );
  }

  parts.push(
    text(24, plot.top + plot.height / 2, options.yLabel, {
      size: 11,
      fill: MUTED,
      anchor: 'middle',
    }).replace('<text ', `<text transform="rotate(-90 24 ${plot.top + plot.height / 2})" `),
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(
    options.title,
  )}">${parts.join('')}</svg>`;
}

export interface LineSeries {
  name: string;
  points: { x: number; y: number }[];
  /** Optional CI half-widths, aligned with `points` by index. */
  errors?: (number | null)[];
}

export interface LineChartOptions {
  title: string;
  subtitle?: string;
  series: LineSeries[];
  xLabel: string;
  yLabel: string;
  xFormat?: (value: number) => string;
  valueFormat?: (value: number) => string;
  width?: number;
  height?: number;
  /** Markers are labelled with their y value when true. */
  labelPoints?: boolean;
  /** Horizontal reference line, e.g. the engine's 0 on a delta chart. */
  yReference?: { value: number; label?: string };
}

/** Multi-series line chart with a shared linear y axis. */
export function lineChart(options: LineChartOptions): string {
  const width = options.width ?? 960;
  const height = options.height ?? 420;
  const format = options.valueFormat ?? defaultFormat;
  const xFormat = options.xFormat ?? ((value: number) => String(value));

  const allPoints = options.series.flatMap((series) => series.points);
  if (allPoints.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"></svg>`;
  }
  const xs = allPoints.map((point) => point.x);
  const reference = options.yReference?.value;
  const ys = allPoints
    .flatMap((point) => (Number.isFinite(reference) ? [point.y, reference as number] : [point.y]))
    .concat(
      options.series.flatMap((series) =>
        series.points.flatMap((point, index) => {
          const error = series.errors?.[index];
          return error && Number.isFinite(error) ? [point.y + error, point.y - error] : [];
        }),
      ),
    );
  const ticks = niceTicks(Math.min(...ys), Math.max(...ys));
  const domainMin = Math.min(...ticks);
  const domainMax = Math.max(...ticks);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);

  const plot: Plot = { left: 72, top: 96, width: width - 72 - 28, height: height - 96 - 64 };
  const xOf = (value: number): number =>
    xMax === xMin
      ? plot.left + plot.width / 2
      : plot.left + ((value - xMin) / (xMax - xMin)) * plot.width;
  const yOf = (value: number): number =>
    plot.top + plot.height - ((value - domainMin) / (domainMax - domainMin)) * plot.height;

  const parts: string[] = [frame(width, height, options.title, options.subtitle)];
  parts.push(
    legend(
      options.series.map((series, index) => ({
        name: series.name,
        color: colorFor(series.name, index),
      })),
      24,
      72,
    ),
  );

  for (const tick of ticks) {
    const y = yOf(tick);
    parts.push(
      `<line x1="${plot.left}" y1="${y.toFixed(1)}" x2="${plot.left + plot.width}" y2="${y.toFixed(
        1,
      )}" stroke="${tick === reference ? AXIS : GRID}" stroke-width="1"/>`,
    );
    parts.push(text(plot.left - 10, y + 4, format(tick), { size: 10, anchor: 'end' }));
  }

  if (options.yReference) {
    const y = yOf(options.yReference.value);
    // The label is drawn even when the reference sits on a tick — only the
    // line itself is skipped, since the tick already drew it in AXIS colour.
    if (options.yReference.label) {
      parts.push(
        text(plot.left + plot.width, y - 6, options.yReference.label, {
          size: 10,
          anchor: 'end',
          fill: MUTED,
        }),
      );
    }
    if (!ticks.includes(options.yReference.value)) {
      parts.push(
        `<line x1="${plot.left}" y1="${y.toFixed(1)}" x2="${plot.left + plot.width}" y2="${y.toFixed(
          1,
        )}" stroke="${AXIS}" stroke-width="1" stroke-dasharray="4 4"/>`,
      );
    }
  }

  const uniqueXs = [...new Set(xs)].sort((a, b) => a - b);
  for (const x of uniqueXs) {
    parts.push(text(xOf(x), plot.top + plot.height + 20, xFormat(x), { size: 10, fill: INK }));
  }

  options.series.forEach((series, index) => {
    const color = colorFor(series.name, index);
    const sorted = [...series.points].sort((a, b) => a.x - b.x);
    const path = sorted
      .map(
        (point, pointIndex) =>
          `${pointIndex === 0 ? 'M' : 'L'}${xOf(point.x).toFixed(1)},${yOf(point.y).toFixed(1)}`,
      )
      .join(' ');
    parts.push(`<path d="${path}" fill="none" stroke="${color}" stroke-width="2"/>`);
    sorted.forEach((point, pointIndex) => {
      const error = series.errors?.[pointIndex];
      if (error === null || error === undefined || !Number.isFinite(error) || error <= 0) {
        return;
      }
      const highY = yOf(point.y + error);
      const lowY = yOf(point.y - error);
      const centre = xOf(point.x);
      parts.push(
        `<line x1="${centre.toFixed(1)}" y1="${highY.toFixed(1)}" x2="${centre.toFixed(
          1,
        )}" y2="${lowY.toFixed(1)}" stroke="${INK}" stroke-width="1"/>` +
          `<line x1="${(centre - 3).toFixed(1)}" y1="${highY.toFixed(1)}" x2="${(
            centre + 3
          ).toFixed(1)}" y2="${highY.toFixed(1)}" stroke="${INK}" stroke-width="1"/>` +
          `<line x1="${(centre - 3).toFixed(1)}" y1="${lowY.toFixed(1)}" x2="${(centre + 3).toFixed(
            1,
          )}" y2="${lowY.toFixed(1)}" stroke="${INK}" stroke-width="1"/>`,
      );
    });
    for (const point of sorted) {
      parts.push(
        `<circle cx="${xOf(point.x).toFixed(1)}" cy="${yOf(point.y).toFixed(1)}" r="3.5" fill="${color}"/>`,
      );
      if (options.labelPoints) {
        parts.push(
          text(xOf(point.x), yOf(point.y) - 10, format(point.y), {
            size: 9.5,
            fill: INK,
            weight: 500,
          }),
        );
      }
    }
  });

  parts.push(
    `<line x1="${plot.left}" y1="${plot.top + plot.height}" x2="${plot.left + plot.width}" y2="${
      plot.top + plot.height
    }" stroke="${AXIS}" stroke-width="1"/>`,
  );
  parts.push(
    text(plot.left + plot.width / 2, plot.top + plot.height + 44, options.xLabel, {
      size: 11,
      fill: MUTED,
    }),
  );
  parts.push(
    text(24, plot.top + plot.height / 2, options.yLabel, {
      size: 11,
      fill: MUTED,
    }).replace('<text ', `<text transform="rotate(-90 24 ${plot.top + plot.height / 2})" `),
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(
    options.title,
  )}">${parts.join('')}</svg>`;
}
