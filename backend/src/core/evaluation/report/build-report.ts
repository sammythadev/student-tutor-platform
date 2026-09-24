/**
 * Builds the presentable benchmark report from the eval CSVs.
 *
 *   pnpm run eval:report
 *
 * Reads every CSV the eval suites write into `docs/benchmarks/`, renders the
 * figures defined in `figures.ts`, and writes:
 *
 *   docs/benchmarks/figures/<id>.svg   vector, diffable, committed
 *   docs/benchmarks/figures/<id>.png   2× raster for slides, via headless chrome
 *   docs/benchmarks/index.html         self-contained gallery (SVG inlined)
 *   docs/benchmarks/FIGURES.md         captions + source file per figure
 *
 * PNGs are best-effort: no chrome on PATH means the SVGs are still written and
 * the failure is reported, never fatal.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { runCli } from '../cli-output';
import { buildFigures, type Row, type Figure } from './figures';

const BACKEND_ROOT = resolve(__dirname, '../../../..');
const BENCH_DIR = join(BACKEND_ROOT, 'docs', 'benchmarks');
const FIGURES_DIR = join(BENCH_DIR, 'figures');

const REPO_ROOT = resolve(BACKEND_ROOT, '..');

/** Minimal RFC-4180 CSV reader — no dependency, no dialect guessing. */
export function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let field = '';
  let record: string[] = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      record.push(field);
      field = '';
    } else if (char === '\n') {
      record.push(field);
      rows.push(record);
      record = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field !== '' || record.length > 0) {
    record.push(field);
    rows.push(record);
  }
  if (rows.length === 0) {
    return [];
  }

  const [header, ...body] = rows;
  const columns = header.map((name) => name.trim());
  return body
    .filter((cells) => cells.some((cell) => cell.trim() !== ''))
    .map((cells) => {
      const row: Row = {};
      columns.forEach((column, columnIndex) => {
        row[column] = (cells[columnIndex] ?? '').trim();
      });
      return row;
    });
}

function readCsv(fileName: string): Row[] | undefined {
  const path = join(BENCH_DIR, fileName);
  if (!existsSync(path)) {
    return undefined;
  }
  return parseCsv(readFileSync(path, 'utf8'));
}

function svgSize(svg: string): { width: number; height: number } {
  const width = Number(/<svg[^>]*\swidth="(\d+(?:\.\d+)?)"/.exec(svg)?.[1] ?? 960);
  const height = Number(/<svg[^>]*\sheight="(\d+(?:\.\d+)?)"/.exec(svg)?.[1] ?? 460);
  return { width, height };
}

/** Rasterizes one figure with headless chrome. Returns null when unavailable. */
function rasterize(figure: Figure, pngPath: string): string | null {
  const { width, height } = svgSize(figure.svg);
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;background:#fff}
    svg{display:block}
  </style></head><body>${figure.svg}</body></html>`;

  const wrapper = join(FIGURES_DIR, `.${figure.id}.png.html`);
  writeFileSync(wrapper, html, 'utf8');
  try {
    execFileSync(
      'google-chrome',
      [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        '--force-device-scale-factor=2',
        `--window-size=${Math.ceil(width)},${Math.ceil(height)}`,
        `--user-data-dir=${join(FIGURES_DIR, '.chrome-profile')}`,
        `--screenshot=${pngPath}`,
        `file://${wrapper}`,
      ],
      { stdio: 'ignore' },
    );
    return existsSync(pngPath) ? null : 'chrome exited without writing the png';
  } catch (error) {
    return error instanceof Error ? error.message.split('\n')[0] : String(error);
  } finally {
    rmSync(wrapper, { force: true });
  }
}

function renderGallery(figures: Figure[], skipped: string[]): string {
  const cards = figures
    .map(
      (figure) => `
    <figure id="${figure.id}">
      <figcaption>
        <span class="fid">${figure.id}</span>
        <strong>${figure.title.replace(/^F\d+ · /, '')}</strong>
      </figcaption>
      ${figure.svg}
      <p class="caption">${figure.caption}</p>
      <p class="source">source: <code>${figure.sourceFile}</code> · <a href="figures/${figure.id}.png">png</a> · <a href="figures/${figure.id}.svg">svg</a></p>
    </figure>`,
    )
    .join('\n');

  const notes =
    skipped.length === 0
      ? ''
      : `<section class="skipped"><h2>Skipped figures</h2><ul>${skipped
          .map((item) => `<li>${item}</li>`)
          .join('')}</ul></section>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tutorly — matchmaking evaluation figures</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; padding: 48px 24px; background: #fafafa; color: #111827;
         font: 15px/1.55 'Inter', 'Helvetica Neue', Arial, sans-serif; }
  main { max-width: 1024px; margin: 0 auto; }
  h1 { font-size: 26px; margin: 0 0 6px; }
  .lede { color: #4b5563; margin: 0 0 40px; }
  figure { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
           padding: 20px; margin: 0 0 32px; }
  figcaption { display: flex; gap: 10px; align-items: baseline; margin-bottom: 14px; }
  .fid { font: 600 12px/1 ui-monospace, SFMono-Regular, monospace; color: #2563eb;
         background: #eff6ff; border-radius: 4px; padding: 4px 6px; }
  svg { width: 100%; height: auto; }
  .caption { color: #374151; margin: 14px 0 6px; }
  .source { color: #9ca3af; font-size: 13px; margin: 0; }
  code { background: #f3f4f6; border-radius: 4px; padding: 2px 5px; }
  .skipped { background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px 20px; }
  .skipped h2 { font-size: 15px; margin: 0 0 8px; }
  .skipped ul { margin: 0; padding-left: 20px; }
</style>
</head>
<body>
<main>
  <h1>Matchmaking evaluation figures</h1>
  <p class="lede">Generated by <code>pnpm run eval:report</code> from the CSVs in this directory.
  Regenerate with <code>pnpm run eval:all</code>.</p>
${cards}
${notes}
</main>
</body>
</html>
`;
}

function renderMarkdown(figures: Figure[], skipped: string[]): string {
  const body = figures
    .map(
      (figure) =>
        `### ${figure.title}\n\n` +
        `![${figure.title}](figures/${figure.id}.svg)\n\n` +
        `${figure.caption}\n\n` +
        `Source: \`docs/benchmarks/${figure.sourceFile}\` · ` +
        `[\`${figure.id}.svg\`](figures/${figure.id}.svg) · ` +
        `[\`${figure.id}.png\`](figures/${figure.id}.png)\n`,
    )
    .join('\n');

  const notes =
    skipped.length === 0
      ? ''
      : `## Not generated\n\n${skipped.map((item) => `- ${item}`).join('\n')}\n`;

  return `# Evaluation figures

Generated by \`pnpm run eval:report\` from the CSVs in \`docs/benchmarks/\`.
Regenerate everything with \`pnpm run eval:all\`.

${body}
${notes}
`;
}

runCli(() => {
  const data = {
    statistics: readCsv('baseline-statistics-results.csv'),
    baselines: readCsv('baseline-comparison-results.csv'),
    optimality: readCsv('optimality-gap-results.csv'),
    topk: readCsv('topk-sweep-results.csv'),
  };

  const { figures: built, skipped } = buildFigures(data);
  // Report order: F1…F9 by the leading number of the stable id — `buildFigures`
  // groups by dataset, so the line variants of the statistics figures would
  // otherwise land between F4 and F5 in FIGURES.md and index.html.
  const figures = [...built].sort(
    (a, b) => Number(a.id.slice(1, a.id.indexOf('-'))) - Number(b.id.slice(1, b.id.indexOf('-'))),
  );
  if (figures.length === 0) {
    throw new Error(
      `No figures could be built from ${BENCH_DIR}. Run the eval suites first (pnpm run eval:all).`,
    );
  }

  mkdirSync(FIGURES_DIR, { recursive: true });

  const pngFailures: string[] = [];
  for (const figure of figures) {
    writeFileSync(join(FIGURES_DIR, `${figure.id}.svg`), figure.svg, 'utf8');
    const failure = rasterize(figure, join(FIGURES_DIR, `${figure.id}.png`));
    if (failure) {
      pngFailures.push(`${figure.id}: ${failure}`);
    }
  }

  rmSync(join(FIGURES_DIR, '.chrome-profile'), { recursive: true, force: true });

  writeFileSync(join(BENCH_DIR, 'index.html'), renderGallery(figures, skipped), 'utf8');
  writeFileSync(join(BENCH_DIR, 'FIGURES.md'), renderMarkdown(figures, skipped), 'utf8');

  const svgCount = figures.length;
  const pngCount = svgCount - pngFailures.length;
  console.error(
    `\nWrote ${svgCount} figure(s) to ${join('docs', 'benchmarks', 'figures')}: ` +
      `${svgCount} svg, ${pngCount} png.\n` +
      `  index.html · FIGURES.md\n  repo root: ${REPO_ROOT}`,
  );
  if (skipped.length > 0) {
    console.error(`\nSkipped:\n${skipped.map((item) => `  · ${item}`).join('\n')}`);
  }
  if (pngFailures.length > 0) {
    console.error(
      `\nPNG rasterization failed (is google-chrome installed?):\n` +
        pngFailures.map((item) => `  · ${item}`).join('\n'),
    );
  }
});
