/**
 * Figure definitions for the benchmark report.
 *
 * Every figure is derived from a CSV the eval suites write into
 * `docs/benchmarks/`. Nothing here invents data: if a column is missing (an
 * older sweep, or a suite that hasn't been run yet) the figure is skipped and
 * reported, rather than silently plotting zeros.
 *
 * The captions carry the caveat that matters: which sample the number came from
 * — one deterministic population (`baseline-comparison-results.csv`) or `seeds`
 * independent ones with a paired significance test
 * (`baseline-statistics-results.csv`).
 */

import { groupedBarChart, lineChart, type LineSeries, type Series } from './charts';

export type Row = Record<string, string>;

export interface Dataset {
  /** baseline-statistics-results.csv — multi-population, with CIs. */
  statistics?: Row[];
  /** baseline-comparison-results.csv — the original single-population run. */
  baselines?: Row[];
  /** optimality-gap-results.csv — engine vs the min-cost-max-flow oracle. */
  optimality?: Row[];
  /** topk-sweep-results.csv — aggregate rows keyed by topK. */
  topk?: Row[];
}

export interface Figure {
  /** Stable file stem, e.g. `f2-delta-vs-engine`. */
  id: string;
  title: string;
  caption: string;
  sourceFile: string;
  svg: string;
}

const num = (row: Row, column: string): number | null => {
  const raw = row[column];
  if (raw === undefined || raw === '') {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

const isAggregate = (row: Row): boolean => (row.run ?? '') === '';

/**
 * Like `num`, but keeps `Infinity` — the top-K sweep's unbounded row is written
 * as `Infinity` and is the most informative point in the sweep, so it must not
 * be filtered out as a non-finite value.
 */
const numOrInfinity = (row: Row, column: string): number | null => {
  const raw = row[column];
  if (raw === undefined || raw === '') {
    return null;
  }
  if (raw === 'Infinity' || raw === 'inf' || raw === '∞') {
    return Infinity;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

/**
 * Top-K is ordinal, not linear: `Infinity` has no place on a numeric axis, and
 * `log` of it is still infinite. So the axis is evenly spaced positions
 * (10, 20, 50, ∞) and the tick formatter maps a position back to its label.
 */
function ordinalTopK(points: { scenario: string; topK: number; value: number }[]): {
  series: { name: string; points: { x: number; y: number }[] }[];
  labels: string[];
} {
  const ordered = [...new Set(points.map((point) => point.topK))].sort((a, b) => {
    if (a === b) {
      return 0;
    }
    if (a === Infinity) {
      return 1;
    }
    if (b === Infinity) {
      return -1;
    }
    return a - b;
  });
  const indexOf = new Map(ordered.map((value, index) => [value, index]));
  const scenarios = [...new Set(points.map((point) => point.scenario))];
  return {
    labels: ordered.map((value) => (value === Infinity ? '∞' : String(value))),
    series: scenarios.map((scenario) => ({
      name: scenario,
      points: points
        .filter((point) => point.scenario === scenario)
        .sort((a, b) => (indexOf.get(a.topK) ?? 0) - (indexOf.get(b.topK) ?? 0))
        .map((point) => ({ x: indexOf.get(point.topK) ?? 0, y: point.value })),
    })),
  };
}

const categoryLabel =
  (labels: string[]) =>
  (value: number): string =>
    labels[Math.round(value)] ?? String(value);

/**
 * Significance check that understands the `<0.0001` format `formatPValue`
 * writes — `Number('<0.0001')` is NaN, which used to silently read as
 * "not significant" in the F2 caption.
 */
function isSignificant(row: Row): boolean {
  const raw = (row.pValueVsEngine ?? '').trim();
  if (raw.startsWith('<')) {
    const bound = Number(raw.slice(1));
    return Number.isFinite(bound) && bound < 0.05;
  }
  const value = Number(raw);
  return raw !== '' && Number.isFinite(value) && value < 0.05;
}

/** One sentence for the F2/F9 captions on how many comparisons separate. */
function significanceVerdict(rows: Row[]): string {
  const significant = rows.filter((row) => isSignificant(row));
  return significant.length === 0
    ? 'No strategy separates from the engine at p < 0.05.'
    : `${significant.length} comparison(s) are significant at p < 0.05.`;
}

/**
 * Turns the bar-chart pivot (one value per category) into line points on an
 * ordinal x axis: scenarios sit at evenly spaced positions, and missing
 * scenario values become gaps rather than zeros.
 */
function ordinalScenarioLines(
  scenarios: string[],
  series: Series[],
): { series: LineSeries[]; labels: string[] } {
  return {
    labels: scenarios,
    series: series.map((item) => {
      const points: { x: number; y: number }[] = [];
      const errors: (number | null)[] = [];
      item.values.forEach((value, index) => {
        if (value === null || !Number.isFinite(value)) {
          return;
        }
        points.push({ x: index, y: value });
        errors.push(item.errors?.[index] ?? null);
      });
      return { name: item.name, points, errors };
    }),
  };
}

/** Aggregates the per-scenario rows of one strategy, in first-seen order. */
function pivotByStrategy(
  rows: Row[],
  valueColumn: string,
  errorColumn?: string,
): { scenarios: string[]; series: Series[] } {
  const scenarios = [...new Set(rows.map((row) => row.scenario))].filter(Boolean);
  const strategies = [...new Set(rows.map((row) => row.strategy))].filter(Boolean);

  const series = strategies
    .map((strategy): Series => {
      const byScenario = new Map(
        rows.filter((row) => row.strategy === strategy).map((row) => [row.scenario, row]),
      );
      const values = scenarios.map((scenario) => {
        const row = byScenario.get(scenario);
        return row ? num(row, valueColumn) : null;
      });
      const errors = errorColumn
        ? scenarios.map((scenario) => {
            const row = byScenario.get(scenario);
            return row ? num(row, errorColumn) : null;
          })
        : undefined;
      return { name: strategy, values, errors };
    })
    .filter((item) => item.values.some((value) => value !== null));

  return { scenarios, series };
}

const fix = (value: number): string => value.toFixed(3);

/**
 * F1 — mean assignment quality per strategy, per scenario.
 *
 * The headline claim of the audit: the engine's advantage over deferred
 * acceptance is inside the confidence interval, not outside it.
 */
function qualityFigure(statistics: Row[]): Figure | null {
  const { scenarios, series } = pivotByStrategy(statistics, 'averageScore', 'averageScoreCi95');
  if (series.length === 0) {
    return null;
  }
  const seeds = num(statistics[0], 'seeds') ?? 0;
  return {
    id: 'f1-quality-by-strategy',
    title: 'F1 · Assignment quality by strategy',
    caption:
      `Mean match score per scenario across ${seeds} independent populations; ` +
      'whiskers are 95% confidence intervals. Overlapping intervals mean the ' +
      'strategies are not distinguishable on this metric.',
    sourceFile: 'baseline-statistics-results.csv',
    svg: groupedBarChart({
      title: 'Assignment quality by strategy',
      subtitle: `mean match score ± 95% CI over ${seeds} independent populations — higher is better`,
      categories: scenarios,
      series,
      yLabel: 'mean match score',
      valueFormat: fix,
    }),
  };
}

/**
 * F2 — how much better or worse each baseline is than the engine.
 *
 * Diverging around zero: bars to the right mean the baseline beat the engine.
 */
function deltaFigure(statistics: Row[]): Figure | null {
  const rows = statistics.filter((row) => row.strategy !== 'greedy-engine');
  if (rows.length === 0) {
    return null;
  }
  const { scenarios, series } = pivotByStrategy(rows, 'meanDeltaVsEngine');
  if (series.length === 0) {
    return null;
  }
  const verdict = significanceVerdict(rows);
  return {
    id: 'f2-delta-vs-engine',
    title: 'F2 · Each baseline against the engine',
    caption:
      'Mean per-population difference (strategy − engine). Bars right of zero mean ' +
      `that strategy scored higher than the engine. ${verdict}`,
    sourceFile: 'baseline-statistics-results.csv',
    svg: groupedBarChart({
      title: 'Baseline minus engine (paired, per population)',
      subtitle: 'mean delta in match score · bars right of zero beat the engine',
      categories: scenarios,
      series,
      yLabel: 'mean delta vs engine',
      valueFormat: (value) => value.toFixed(4),
      baselineLabel: 'engine (0)',
    }),
  };
}

/** F3 — fairness by Jain's index, which is what the fairness term targets. */
function fairnessFigure(statistics: Row[]): Figure | null {
  const { scenarios, series } = pivotByStrategy(statistics, 'jainFairnessIndex', 'jainCi95');
  if (series.length === 0) {
    return null;
  }
  return {
    id: 'f3-fairness-jain',
    title: "F3 · Fairness (Jain's index)",
    caption:
      "Jain's fairness index over tutor loads; 1.0 is perfectly even. Whiskers are " +
      '95% confidence intervals across populations.',
    sourceFile: 'baseline-statistics-results.csv',
    svg: groupedBarChart({
      title: "Fairness of tutor load distribution (Jain's index)",
      subtitle: 'mean ± 95% CI — 1.0 is perfectly even, higher is better',
      categories: scenarios,
      series,
      yLabel: "Jain's fairness index",
      valueFormat: fix,
    }),
  };
}

/**
 * F4 — the quality floor and coverage.
 *
 * `averageScore` is a mean, so it hides lost students. These two columns are the
 * ones that expose them: coverage is the share of students placed at all, and
 * worstStudentScore is the weakest match in the population.
 */
function floorFigure(statistics: Row[]): Figure | null {
  const { scenarios, series } = pivotByStrategy(statistics, 'coverage');
  if (series.length === 0) {
    return null;
  }
  return {
    id: 'f4-coverage',
    title: 'F4 · Coverage (share of students placed)',
    caption:
      'Mean share of students that received a placement. Reported alongside F1 ' +
      'because a higher mean score can coexist with more unplaced students.',
    sourceFile: 'baseline-statistics-results.csv',
    svg: groupedBarChart({
      title: 'Share of students placed',
      subtitle: 'mean over independent populations — higher is better',
      categories: scenarios,
      series,
      yLabel: 'coverage',
      valueFormat: fix,
    }),
  };
}

/** F5 — engine against the optimum, i.e. how much headroom is left. */
function optimalityFigure(optimality: Row[]): Figure | null {
  const rows = optimality
    .map((row) => ({
      students: num(row, 'students') ?? num(row, 'size'),
      ratio: num(row, 'scoreRatio'),
    }))
    .filter(
      (point): point is { students: number; ratio: number } =>
        point.students !== null && point.ratio !== null,
    )
    .sort((a, b) => a.students - b.students);
  if (rows.length === 0) {
    return null;
  }
  const worst = rows.reduce((lowest, point) => Math.min(lowest, point.ratio), 1);
  return {
    id: 'f5-optimality-gap',
    title: 'F5 · Engine versus the optimal assignment',
    caption:
      'Share of the min-cost-max-flow optimum the greedy engine achieves, by ' +
      `problem size. Worst observed ratio: ${(worst * 100).toFixed(2)}%.`,
    sourceFile: 'optimality-gap-results.csv',
    svg: lineChart({
      title: 'Engine score as a share of the optimum',
      subtitle: 'higher is better; 1.0 would match the exact solver',
      series: [
        {
          name: 'greedy-engine',
          points: rows.map((point) => ({ x: point.students, y: point.ratio })),
        },
      ],
      xLabel: 'students in the scenario',
      yLabel: 'share of optimum',
      valueFormat: (value) => value.toFixed(3),
      labelPoints: true,
      xFormat: (value) => String(value),
    }),
  };
}

/** F6 — the top-K sweep: quality against the candidate-list size. */
function topKFigure(topk: Row[]): Figure | null {
  const rows = topk
    .filter(isAggregate)
    .map((row) => ({
      topK: numOrInfinity(row, 'topK'),
      score: num(row, 'averageScore'),
      scenario: row.scenario,
    }))
    .filter(
      (point): point is { topK: number; score: number; scenario: string } =>
        point.topK !== null && point.score !== null,
    );
  if (rows.length === 0) {
    return null;
  }
  const { series, labels } = ordinalTopK(
    rows.map((row) => ({ scenario: row.scenario, topK: row.topK, value: row.score })),
  );
  return {
    id: 'f6-topk-quality',
    title: 'F6 · Quality against candidate-list size (top-K)',
    caption:
      'Mean match score as the candidate list grows. The plateau is the point: ' +
      'raising top-K past it buys nothing but scoring cost.',
    sourceFile: 'topk-sweep-results.csv',
    svg: lineChart({
      title: 'Effect of top-K on assignment quality',
      subtitle: 'aggregate rows (run column empty) — higher is better',
      series,
      xLabel: 'top-K candidates per student',
      yLabel: 'mean match score',
      valueFormat: (value) => value.toFixed(3),
      labelPoints: true,
      xFormat: categoryLabel(labels),
    }),
  };
}

/** F7 — the cost side of the top-K sweep. */
function topKCostFigure(topk: Row[]): Figure | null {
  const rows = topk
    .filter(isAggregate)
    .map((row) => ({
      topK: numOrInfinity(row, 'topK'),
      elapsed: num(row, 'elapsedMeanMs') ?? num(row, 'elapsedMaxMs') ?? num(row, 'elapsedP95Ms'),
      scenario: row.scenario,
    }))
    .filter(
      (point): point is { topK: number; elapsed: number; scenario: string } =>
        point.topK !== null && point.elapsed !== null,
    );
  if (rows.length === 0) {
    return null;
  }
  const { series, labels } = ordinalTopK(
    rows.map((row) => ({ scenario: row.scenario, topK: row.topK, value: row.elapsed })),
  );
  return {
    id: 'f7-topk-cost',
    title: 'F7 · Scoring cost against top-K',
    caption:
      'Mean elapsed milliseconds per run as the candidate list grows. Read with ' +
      'F6: this is what the flat part of the quality curve costs.',
    sourceFile: 'topk-sweep-results.csv',
    svg: lineChart({
      title: 'Effect of top-K on runtime',
      subtitle: 'mean elapsed ms per run (aggregate rows) — lower is better',
      series,
      xLabel: 'top-K candidates per student',
      yLabel: 'mean elapsed (ms)',
      valueFormat: (value) => value.toFixed(1),
      labelPoints: true,
      xFormat: categoryLabel(labels),
    }),
  };
}

/**
 * F8 — the F1 data as lines: one line per strategy across scenarios.
 *
 * Lines make the *shape* readable — which strategies track each other as
 * contention rises, and where they fan apart — while the same 95% CI whiskers
 * carry the caveat: overlapping intervals mean not distinguishable.
 */
function qualityLinesFigure(statistics: Row[]): Figure | null {
  const { scenarios, series } = pivotByStrategy(statistics, 'averageScore', 'averageScoreCi95');
  if (series.length === 0) {
    return null;
  }
  const seeds = num(statistics[0], 'seeds') ?? 0;
  const { series: lines, labels } = ordinalScenarioLines(scenarios, series);
  return {
    id: 'f8-quality-lines',
    title: 'F8 · Assignment quality by strategy (lines)',
    caption:
      `Mean match score per scenario across ${seeds} independent populations, one line per ` +
      'strategy; whiskers are 95% confidence intervals. Overlapping intervals mean the ' +
      'strategies are not distinguishable at that scenario.',
    sourceFile: 'baseline-statistics-results.csv',
    svg: lineChart({
      title: 'Assignment quality by strategy',
      subtitle: `mean match score ± 95% CI over ${seeds} independent populations — higher is better`,
      series: lines,
      xLabel: 'scenario',
      yLabel: 'mean match score',
      valueFormat: fix,
      xFormat: categoryLabel(labels),
    }),
  };
}

/**
 * F9 — the F2 data as lines: each baseline's delta against the engine.
 *
 * The zero line is the engine itself, so a strategy whose line hugs zero is
 * indistinguishable from it, while one pinned below zero loses consistently.
 */
function deltaLinesFigure(statistics: Row[]): Figure | null {
  const rows = statistics.filter((row) => row.strategy !== 'greedy-engine');
  if (rows.length === 0) {
    return null;
  }
  const { scenarios, series } = pivotByStrategy(rows, 'meanDeltaVsEngine');
  if (series.length === 0) {
    return null;
  }
  const { series: lines, labels } = ordinalScenarioLines(scenarios, series);
  return {
    id: 'f9-delta-lines',
    title: 'F9 · Each baseline against the engine (lines)',
    caption:
      'Mean per-population difference (strategy − engine) per scenario. The zero line is ' +
      `the engine: lines hugging it are ties. ${significanceVerdict(rows)}`,
    sourceFile: 'baseline-statistics-results.csv',
    svg: lineChart({
      title: 'Baseline minus engine (paired, per population)',
      subtitle: 'mean delta in match score · above zero beats the engine',
      series: lines,
      xLabel: 'scenario',
      yLabel: 'mean delta vs engine',
      valueFormat: (value) => value.toFixed(4),
      xFormat: categoryLabel(labels),
      yReference: { value: 0, label: 'engine (0)' },
      labelPoints: true,
    }),
  };
}
/**
 * Strategy rows that are aggregates or diagnostics rather than strategies, and
 * so must never be drawn as a baseline curve:
 *   • `oracle-exact` — scenario-level oracle aggregates; its score, Jain and
 *     delta columns are structural zeroes, so plotting it would put an empty
 *     series (and a fake “Jain = 0”) on F1/F3/F4;
 *   • `greedy-engine-static` — the stage-1 δ=0 arm, reported as a table row
 *     rather than a fifth baseline.
 * `greedy-engine` is deliberately NOT here: it is the reference series F1/F3/
 * F4/F8 show, and the delta figures drop it themselves.
 */
const NON_STRATEGY_ROWS = new Set(['oracle-exact', 'greedy-engine-static']);

const comparisonArms = (rows: Row[]): Row[] =>
  rows.filter((row) => !NON_STRATEGY_ROWS.has(row.strategy));

export function buildFigures(data: Dataset): { figures: Figure[]; skipped: string[] } {
  const skipped: string[] = [];
  const figures: Figure[] = [];

  const attempt = (label: string, figure: Figure | null): void => {
    if (figure) {
      figures.push(figure);
    } else {
      skipped.push(label);
    }
  };

  if (data.statistics && data.statistics.length > 0) {
    const arms = comparisonArms(data.statistics);
    attempt('F1 quality (statistics)', qualityFigure(arms));
    attempt('F2 delta vs engine (statistics)', deltaFigure(arms));
    attempt('F3 fairness (statistics)', fairnessFigure(arms));
    attempt('F4 coverage (statistics)', floorFigure(arms));
    attempt('F8 quality lines (statistics)', qualityLinesFigure(arms));
    attempt('F9 delta lines (statistics)', deltaLinesFigure(arms));
  } else {
    skipped.push(
      'F1–F4, F8–F9 · baseline-statistics-results.csv not found — run `pnpm eval:statistics`',
    );
  }

  if (data.optimality && data.optimality.length > 0) {
    attempt('F5 optimality gap', optimalityFigure(data.optimality));
  } else {
    skipped.push('F5 · optimality-gap-results.csv not found — run `pnpm eval:gap`');
  }

  if (data.topk && data.topk.length > 0) {
    attempt('F6 top-K quality', topKFigure(data.topk));
    attempt('F7 top-K cost', topKCostFigure(data.topk));
  } else {
    skipped.push('F6–F7 · topk-sweep-results.csv not found — run `pnpm eval:topk`');
  }

  return { figures, skipped };
}
