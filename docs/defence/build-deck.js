/**
 * FUTO B.Tech defence deck — "Transformative Teal" bento system (2026).
 * System: 12-column bento grid · warm bone ground · ink tiles · deep-teal accent.
 * Type: Bahnschrift (display grotesk) + Consolas (mono labels) + Segoe UI (body).
 * Run: node docs/defence/build-deck.js
 */
const pptxgen = require('pptxgenjs');
const path = require('path');

const P = new pptxgen();
P.layout = 'LAYOUT_WIDE';                 // 13.333 x 7.5 in
P.author = 'Anumudu Udochukwu Samuel; Obi Michael Chimaobi';
P.company = 'Federal University of Technology Owerri';
P.title = 'A Multi-Criteria Student-Tutor Matchmaking System';

/* ------------------------------------------------------------ palette */
const C = {
  bone:    'F6F3EE',   // ground — warm neutral
  boneMid: 'EDE7DD',   // muted tile
  white:   'FFFFFF',   // light tile
  ink:     '101314',   // hero tile / dark ground
  inkSoft: 'AEB7B6',   // text on ink
  inkLine: '2B3132',   // hairline on ink
  teal:    '0E5F5C',   // Transformative Teal (WGSN/Coloro 2026)
  tealUp:  '2F9C93',   // teal lift, text on ink only
  tealWash:'DCE9E7',   // teal tint tile
  ochre:   'A6602F',   // earthy caveat marker
  ochreWash:'F0E2D6',
  text:    '14181A',
  textSoft:'5F6360',
  hair:    'E2DBD0',
};

/* ------------------------------------------------------------ type */
const D = 'Bahnschrift';   // display grotesk
const M = 'Consolas';      // mono labels, indices, data
const B = 'Segoe UI';      // body copy

/* ------------------------------------------------------------ grid */
const X0 = 0.5, GUT = 0.22, COL = 0.826;
const cols = (n) => n * COL + (n - 1) * GUT;       // width of n columns
const at = (i) => X0 + i * (COL + GUT);            // left edge of column i
let PAGE = 0;

const newSlide = (dark) => {
  const s = P.addSlide();
  s.background = { color: dark ? C.ink : C.bone };
  return s;
};

/* tile: flat bento surface, differentiated by background not shadow */
function tile(s, x, y, w, h, kind) {
  const fill = kind === 'dark' ? C.ink
    : kind === 'mute' ? C.boneMid
    : kind === 'wash' ? C.tealWash
    : kind === 'ochre' ? C.ochreWash
    : C.white;
  const opts = { x, y, w, h, rectRadius: 0.2, fill: { color: fill }, line: { color: fill } };
  if (kind === 'light' || !kind) opts.line = { color: C.hair, width: 1 };
  s.addShape(P.shapes.ROUNDED_RECTANGLE, opts);
}

/* type helper */
function txt(s, x, y, w, h, str, o) {
  o = o || {};
  s.addText(str, {
    x, y, w, h,
    fontFace: o.face || B,
    fontSize: o.size || 12,
    bold: !!o.bold, italic: !!o.italic,
    color: o.color || C.text,
    align: o.align || 'left',
    valign: o.valign || 'top',
    charSpacing: o.track || 0,
    lineSpacing: o.lh || Math.round((o.size || 12) * 1.34),
    margin: 0,
  });
}

/* mono micro-label — the technical signal */
const label = (s, x, y, w, str, o) => {
  o = o || {};
  txt(s, x, y, w, o.h || 0.24, String(str).toUpperCase(), {
    face: M, size: o.size || 8.5, bold: o.bold !== false,
    color: o.color || C.teal, track: 1.2, valign: 'middle',
  });
};

/* slide chrome: mono kicker + display headline + hairline */
function head(s, kicker, headline, o) {
  o = o || {};
  const dark = !!o.dark;
  label(s, X0, 0.4, cols(7), kicker, { color: dark ? C.tealUp : C.teal });
  txt(s, X0, 0.66, cols(12), 0.78, headline, {
    face: D, size: o.size || 27, color: dark ? C.bone : C.ink, lh: o.lh || 33,
  });
  s.addShape(P.shapes.LINE, {
    x: X0, y: 1.53, w: cols(12), h: 0,
    line: { color: dark ? C.inkLine : C.hair, width: 1 },
  });
}

/* footer: mono running title + index */
function foot(s, dark) {
  s.addShape(P.shapes.LINE, {
    x: X0, y: 7.04, w: cols(12), h: 0,
    line: { color: dark ? C.inkLine : C.hair, width: 1 },
  });
  txt(s, X0, 7.1, cols(8), 0.26,
    'STUDENT-TUTOR MATCHMAKING / B.TECH SOFTWARE ENGINEERING / FUTO OWERRI', {
      face: M, size: 7.5, color: dark ? '6B7372' : '9A948A', valign: 'middle', track: 0.8,
    });
  txt(s, at(11), 7.1, cols(1), 0.26, String(PAGE).padStart(2, '0'), {
    face: M, size: 9, color: dark ? C.tealUp : C.teal,
    align: 'right', valign: 'middle', bold: true,
  });
}

/* teal accent bar — the system's signal, used sparingly */
function accent(s, x, y, w, h) {
  s.addShape(P.shapes.RECTANGLE, {
    x, y, w: w || 0.06, h: h || 0.3,
    fill: { color: C.teal }, line: { color: C.teal },
  });
}

/* ============================================================ 01 COVER */
{
  const s = newSlide(true);
  s.addShape(P.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.3, h: 7.5, fill: { color: C.teal }, line: { color: C.teal },
  });

  label(s, 0.95, 0.95, cols(9), 'FEDERAL UNIVERSITY OF TECHNOLOGY OWERRI  /  DEPARTMENT OF SOFTWARE ENGINEERING',
    { color: C.tealUp, size: 9, h: 0.26 });

  txt(s, 0.95, 1.4, cols(10), 2.0,
    'Multi-Criteria\nStudent\u2013Tutor Matchmaking', {
      face: D, size: 46, color: C.bone, lh: 54,
    });

  s.addShape(P.shapes.RECTANGLE, {
    x: 0.95, y: 3.5, w: 1.9, h: 0.07, fill: { color: C.tealUp }, line: { color: C.tealUp },
  });

  txt(s, 0.95, 3.75, cols(9), 0.62,
    'Weighted scoring, hard availability and load-aware fairness \u2014 validated against an exact optimum.', {
      face: B, size: 14, color: C.inkSoft, lh: 21,
    });

  const meta = [
    ['CANDIDATE', 'Anumudu Udochukwu Samuel', 'REG 20211259202'],
    ['CANDIDATE', 'Obi Michael Chimaobi', 'REG 20211265722'],
    ['SUPERVISOR', 'Engr. Dr. A. I. Erike', 'DEPT. OF SOFTWARE ENGINEERING'],
  ];
  meta.forEach((m, i) => {
    const x = at(i * 4);
    label(s, x, 4.75, cols(3.6), m[0], { color: '6B7372', size: 8 });
    txt(s, x, 5.02, cols(3.6), 0.36, m[1], { face: D, size: 15.5, color: C.bone, lh: 20 });
    txt(s, x, 5.42, cols(3.6), 0.28, m[2], { face: M, size: 8.5, color: C.inkSoft, valign: 'middle' });
  });

  const chips = ['NESTJS', 'REACT 19', 'POSTGRESQL', 'DRIZZLE ORM', 'TYPESCRIPT'];
  chips.forEach((c, i) => {
    const w = 2.3, x = X0 + i * (w + 0.14);
    s.addShape(P.shapes.ROUNDED_RECTANGLE, {
      x, y: 6.06, w, h: 0.46, rectRadius: 0.23,
      fill: { color: C.ink }, line: { color: C.inkLine, width: 1 },
    });
    txt(s, x, 6.06, w, 0.46, c, {
      face: M, size: 8.5, color: C.inkSoft, align: 'center', valign: 'middle', track: 1.1,
    });
  });

  s.addShape(P.shapes.LINE, { x: X0, y: 6.78, w: cols(12), h: 0, line: { color: C.inkLine, width: 1 } });
  txt(s, X0, 6.86, cols(12), 0.3,
    'FINAL YEAR PROJECT DEFENCE  \u00b7  B.TECH (HONS) SOFTWARE ENGINEERING  \u00b7  JULY 2026', {
      face: M, size: 8.5, color: C.tealUp, valign: 'middle', track: 1.0,
    });
}

/* ========================================================= 02 PROBLEM */
{
  const s = newSlide(false);
  head(s, '01 / problem definition', 'Four defects break tutor matching today');

  tile(s, at(0), 1.75, cols(7), 4.1, 'dark');
  label(s, at(0) + 0.4, 2.05, cols(4), 'defect 01 \u2014 the default behaviour', { color: C.tealUp });
  txt(s, at(0) + 0.4, 2.3, cols(6.2), 0.95, '01', { face: D, size: 58, color: C.tealUp, lh: 62 });
  txt(s, at(0) + 0.4, 3.3, cols(6.2), 0.44, 'Subject-only filtering', {
    face: D, size: 23, color: C.bone, lh: 28,
  });
  txt(s, at(0) + 0.4, 3.98, cols(6.2), 1.0,
    'Platforms match on the subject line and a free time slot, then stop. Teaching style, language, budget and track record never enter the decision.', {
      size: 12.5, color: C.inkSoft, lh: 18,
    });
  s.addShape(P.shapes.LINE, { x: at(0) + 0.4, y: 5.16, w: cols(6.2), h: 0, line: { color: C.inkLine, width: 1 } });
  txt(s, at(0) + 0.4, 5.28, cols(6.2), 0.3,
    'IGNORED TODAY:  STYLE  /  LANGUAGE  /  BUDGET  /  TRACK RECORD', {
      face: M, size: 8, color: C.tealUp, track: 0.9,
    });

  const small = [
    ['defect 02', 'Recurring calendar clashes',
      'A weekly timetable with no contiguous overlap is booked anyway \u2014 the same clash returns next week.'],
    ['defect 03', 'Winner-takes-most tutors',
      'Ranking floods a few popular profiles while qualified tutors sit idle, then churn off the platform.'],
    ['defect 04', 'Matches nobody can explain',
      'A failed pairing costs a paying family real money, and neither side can see why it happened.'],
  ];
  small.forEach((d, i) => {
    const y = 1.75 + i * 1.44;
    tile(s, at(7), y, cols(5), 1.22, i === 1 ? 'mute' : 'light');
    label(s, at(7) + 0.32, y + 0.16, cols(4), d[0], { color: C.teal, size: 8 });
    txt(s, at(7) + 0.32, y + 0.4, cols(4.3), 0.34, d[1], { face: D, size: 14.5, color: C.ink, lh: 18 });
    txt(s, at(7) + 0.32, y + 0.76, cols(4.3), 0.42, d[2], { size: 10.5, color: C.textSoft, lh: 14 });
  });

  PAGE = 2; foot(s, false);
}

/* ================================================= 03 AIM & RESEARCH Qs */
{
  const s = newSlide(false);
  head(s, '02 / aim and research questions', 'One engine that scores, allocates and proves itself');

  tile(s, at(0), 1.75, cols(7), 4.1, 'mute');
  const aims = [
    ['01', 'Score', 'A composite model over academic fit, learner preference and schedule availability.'],
    ['02', 'Allocate', 'A capacity-aware engine that reacts to live tutor load instead of a frozen ranking.'],
    ['03', 'Prove', 'Validation against an exact min-cost-flow oracle and three deployed-style baselines.'],
  ];
  aims.forEach((a, i) => {
    const y = 2.02 + i * 1.24;
    txt(s, at(0) + 0.36, y, 0.72, 0.5, a[0], { face: M, size: 21, color: C.teal, bold: true, lh: 24 });
    txt(s, at(0) + 1.14, y - 0.02, cols(4), 0.34, a[1], { face: D, size: 17, color: C.ink, lh: 21 });
    txt(s, at(0) + 1.14, y + 0.34, cols(5.4), 0.6, a[2], { size: 11.5, color: C.textSoft, lh: 16 });
    if (i < 2) s.addShape(P.shapes.LINE, {
      x: at(0) + 0.36, y: y + 1.04, w: cols(6.4), h: 0, line: { color: C.hair, width: 1 },
    });
  });

  const rqs = [
    ['RQ1', 'Does composite scoring beat deployed-style baselines?'],
    ['RQ2', 'Does capacity-aware assignment win under contention?'],
    ['RQ3', 'How far is the greedy engine from the exact optimum?'],
    ['RQ4', 'What does fairness cost in match quality?'],
  ];
  rqs.forEach((r, i) => {
    const y = 1.75 + i * 1.08;
    tile(s, at(7), y, cols(5), 0.94, i === 0 ? 'wash' : 'light');
    s.addShape(P.shapes.RECTANGLE, {
      x: at(7), y: y + 0.16, w: 0.05, h: 0.62,
      fill: { color: C.teal }, line: { color: C.teal },
    });
    txt(s, at(7) + 0.32, y + 0.16, 0.7, 0.3, r[0], { face: M, size: 10, bold: true, color: C.teal, valign: 'middle' });
    txt(s, at(7) + 0.32, y + 0.46, cols(4.3), 0.36, r[1], { size: 11.5, color: C.text, lh: 15 });
  });

  PAGE = 3; foot(s, false);
}

/* ==================================================== 04 GAP / LITERATURE */
{
  const s = newSlide(false);
  head(s, '03 / literature and the research gap', 'Nothing reviewed scores, schedules and balances at once');

  tile(s, at(0), 1.75, cols(6), 3.5, 'light');
  label(s, at(0) + 0.36, 2.0, cols(5), 'what exists today', { color: C.textSoft });
  const exist = [
    ['MCDM prices trade-offs', 'Weighted multi-criteria scoring resolves conflicting criteria using explicit weights.'],
    ['Static matching only', 'Greedy bipartite matching carries a proof \u2014 for the static variant alone.'],
    ['Content, not people', 'Educational recommenders recommend resources, almost never human tutors.'],
  ];
  exist.forEach((e, i) => {
    const y = 2.38 + i * 0.94;
    txt(s, at(0) + 0.36, y, cols(5.3), 0.3, e[0], { face: D, size: 13.5, color: C.ink, lh: 17 });
    txt(s, at(0) + 0.36, y + 0.32, cols(5.3), 0.5, e[1], { size: 10.5, color: C.textSoft, lh: 14 });
    if (i < 2) s.addShape(P.shapes.LINE, {
      x: at(0) + 0.36, y: y + 0.8, w: cols(5.3), h: 0, line: { color: C.hair, width: 1 },
    });
  });

  tile(s, at(6), 1.75, cols(6), 3.5, 'dark');
  label(s, at(6) + 0.36, 2.0, cols(5), 'what this work adds', { color: C.tealUp });
  const adds = [
    ['One decision', 'Compatibility, hard availability and load balancing resolved in a single pass.'],
    ['Exact fairness', 'The fairness term stays exact at run time through lazy recomputation.'],
    ['Measured honestly', 'Every claim checked against an exact oracle and three baselines, 30 times.'],
  ];
  adds.forEach((a, i) => {
    const y = 2.38 + i * 0.94;
    txt(s, at(6) + 0.36, y, cols(5.3), 0.3, a[0], { face: D, size: 13.5, color: C.bone, lh: 17 });
    txt(s, at(6) + 0.36, y + 0.32, cols(5.3), 0.5, a[1], { size: 10.5, color: C.inkSoft, lh: 14 });
    if (i < 2) s.addShape(P.shapes.LINE, {
      x: at(6) + 0.36, y: y + 0.8, w: cols(5.3), h: 0, line: { color: C.inkLine, width: 1 },
    });
  });

  tile(s, X0, 5.48, cols(12), 0.98, 'wash');
  s.addShape(P.shapes.RECTANGLE, {
    x: X0, y: 5.66, w: 0.05, h: 0.62, fill: { color: C.teal }, line: { color: C.teal },
  });
  label(s, X0 + 0.36, 5.66, cols(2), 'the gap', { color: C.teal, h: 0.28 });
  txt(s, X0 + 1.5, 5.62, cols(10), 0.5,
    'No reviewed system combines all three objectives in one decision \u2014 and none reports what its allocation actually beat.', {
      face: D, size: 15, color: C.ink, lh: 20, valign: 'middle',
    });

  PAGE = 4; foot(s, false);
}

/* ==================================================== 05 ARCHITECTURE */
{
  const s = newSlide(false);
  head(s, '04 / system design', 'Three tiers \u2014 the algorithm sits in a pure domain layer');

  const bands = [
    {
      kind: 'light', tier: 'tier 1', name: 'Presentation',
      desc: 'React client with student, tutor and admin portals \u00b7 intake, booking and allocation oversight.',
      meta: 'REACT 19 / TAILWIND', dark: false,
    },
    {
      kind: 'dark', tier: 'tier 2 \u2014 the engine', name: 'Domain layer',
      desc: 'Composite scorer \u00b7 binary max-heap allocator \u00b7 lazy fairness recompute. Pure TypeScript with zero framework imports.',
      meta: 'PURE TYPESCRIPT / PORTABLE', dark: true,
    },
    {
      kind: 'light', tier: 'tier 3', name: 'Persistence',
      desc: 'NestJS services over Drizzle ORM and PostgreSQL \u00b7 typed schema, recurring slots, auditable placement log.',
      meta: 'NESTJS / DRIZZLE / POSTGRES', dark: false,
    },
  ];
  bands.forEach((b, i) => {
    const y = 1.75 + i * 1.37, h = 1.15;
    tile(s, X0, y, cols(12), h, b.kind);
    s.addShape(P.shapes.RECTANGLE, {
      x: X0, y: y + 0.16, w: 0.05, h: h - 0.32,
      fill: { color: b.dark ? C.tealUp : C.teal }, line: { color: b.dark ? C.tealUp : C.teal },
    });
    label(s, X0 + 0.36, y + 0.18, cols(3), b.tier, { color: b.dark ? C.tealUp : C.teal, size: 8 });
    txt(s, X0 + 0.36, y + 0.46, cols(3.4), 0.42, b.name, {
      face: D, size: 18, color: b.dark ? C.bone : C.ink, lh: 22, valign: 'middle',
    });
    txt(s, X0 + 4.1, y + 0.3, cols(5.5), 0.6, b.desc, {
      size: 11.5, color: b.dark ? C.inkSoft : C.textSoft, lh: 16, valign: 'middle',
    });
    txt(s, X0 + 9.85, y + 0.3, cols(2.1), 0.6, b.meta, {
      face: M, size: 7.5, color: b.dark ? '6B7372' : '9A948A',
      align: 'right', valign: 'middle', track: 0.4,
    });
  });

  tile(s, X0, 5.86, cols(12), 0.92, 'wash');
  label(s, X0 + 0.36, 5.98, cols(2.4), 'design decision', { color: C.teal, h: 0.26 });
  txt(s, X0 + 0.36, 6.26, cols(11.2), 0.36,
    'The engineering rules live in one importable module \u2014 the API and the offline benchmark harness run byte-identical logic.', {
      size: 11.5, color: C.ink, lh: 16,
    });

  PAGE = 5; foot(s, false);
}

/* ======================================================= 06 SCORING */
{
  const s = newSlide(false);
  head(s, '05 / methodology \u00b7 composite scoring', 'Four weighted sub-scores become one comparable number');

  tile(s, X0, 1.72, cols(12), 1.15, 'dark');
  txt(s, X0 + 0.4, 1.9, cols(8), 0.5, 'score(s,t) = \u03b1A + \u03b2P + \u03b3S + \u03b4F', {
    face: D, size: 25, color: C.bone, lh: 30, valign: 'middle',
  });
  txt(s, X0 + 0.4, 2.42, cols(8), 0.3, 'WEIGHTS SUM TO 1  \u00b7  SUB-SCORES IN [0,1]  \u00b7  DEFAULT \u03b4 = 0.05', {
    face: M, size: 8, color: C.tealUp, track: 0.8,
  });
  txt(s, X0 + 9.6, 1.9, cols(2.2), 0.82, 'per pair', {
    face: D, size: 15, color: C.inkSoft, align: 'right', valign: 'middle', lh: 18,
  });

  const dims = [
    ['A(s,t)', 'Academic fit', 5,
      'Subject and specialisation agreement, exam type and a grade-gap penalty.',
      'EXACT 1.0 / RELATED 0.7 / UNKNOWN 0.5'],
    ['P(s,t)', 'Preference fit', 4,
      'Delivery-style similarity, budget fit with decay, region or online format.',
      'WITHIN BUDGET = 1.0'],
    ['S(s,t)', 'Schedule fit', 3,
      'Contiguous weekly overlap between requested and free slots; fragments fail.',
      'NO OVERLAP = 0'],
  ];
  let cx = 0;
  dims.forEach((d) => {
    const x = at(cx), w = cols(d[2]);
    tile(s, x, 3.06, w, 2.34, d[2] === 3 || d[2] === 4 ? 'mute' : 'light');
    txt(s, x + 0.32, 3.28, w - 0.64, 0.4, d[0], {
      face: M, size: 17, bold: true, color: C.teal, lh: 20,
    });
    txt(s, x + 0.32, 3.76, w - 0.64, 0.34, d[1], { face: D, size: 16, color: C.ink, lh: 20 });
    txt(s, x + 0.32, 4.2, w - 0.64, 0.72, d[3], { size: 10.5, color: C.textSoft, lh: 14 });
    s.addShape(P.shapes.LINE, {
      x: x + 0.32, y: 4.98, w: w - 0.64, h: 0, line: { color: C.hair, width: 1 },
    });
    txt(s, x + 0.32, 5.08, w - 0.64, 0.26, d[4], {
      face: M, size: 7.5, color: '8B857B', track: 0.4,
    });
    cx += d[2];
  });

  tile(s, X0, 5.6, cols(12), 0.9, 'wash');
  txt(s, X0 + 0.36, 5.72, cols(3), 0.3, 'F(t)', {
    face: M, size: 12, bold: true, color: C.teal, valign: 'middle',
  });
  txt(s, X0 + 0.36, 6.04, cols(3.2), 0.34, '(1 \u2212 load/cap)^1.15 + 0.05', {
    face: M, size: 9.5, color: C.ink, valign: 'middle',
  });
  txt(s, X0 + 4.1, 5.72, cols(7.6), 0.66,
    'Fairness is the term that changes behaviour: a full tutor drops down the heap, an idle tutor is lifted back into circulation.', {
      size: 11.5, color: C.ink, lh: 16, valign: 'middle',
    });

  PAGE = 6; foot(s, false);
}

/* ========================================================= 07 ENGINE */
{
  const s = newSlide(false);
  head(s, '06 / methodology \u00b7 greedy engine', 'Lazy recompute keeps fairness exact as seats fill');

  tile(s, X0, 1.72, cols(12), 2.5, 'light');
  const steps = [
    ['1', 'Filter', 'Subject, level, exam type and spare capacity must all pass.'],
    ['2', 'Score', 'Eligible pairs are scored and pushed onto a max-heap.'],
    ['3', 'Pop', 'The best pair is assigned; one seat is consumed.'],
    ['4', 'Refresh', 'Only that tutor\u2019s stale pairs are rescored.'],
    ['5', 'Report', 'Unplaced students leave with a reason code.'],
  ];
  const railX = X0 + 0.4, railW = cols(12) - 0.8, cw = railW / 5;
  s.addShape(P.shapes.LINE, {
    x: railX + 0.17, y: 2.34, w: railW - cw, h: 0,
    line: { color: C.teal, width: 1.5 },
  });
  steps.forEach((st, i) => {
    const cx0 = railX + i * cw;
    s.addShape(P.shapes.OVAL, {
      x: cx0, y: 2.17, w: 0.34, h: 0.34,
      fill: { color: i === 3 ? C.teal : C.bone }, line: { color: C.teal, width: 1.25 },
    });
    txt(s, cx0, 2.17, 0.34, 0.34, st[0], {
      face: M, size: 10, bold: true, color: i === 3 ? C.bone : C.teal,
      align: 'center', valign: 'middle',
    });
    txt(s, cx0, 2.7, cw - 0.28, 0.32, st[1], { face: D, size: 14, color: C.ink, lh: 17 });
    txt(s, cx0, 3.06, cw - 0.28, 0.8, st[2], { size: 10, color: C.textSoft, lh: 13.5 });
  });

  tile(s, X0, 4.4, cols(8), 1.45, 'dark');
  label(s, X0 + 0.36, 4.56, cols(5), 'why lazy beats static sorting', { color: C.tealUp });
  txt(s, X0 + 0.36, 4.86, cols(7.2), 0.86,
    'A tutor\u2019s fairness score goes stale the moment a seat is taken. Re-sorting every candidate after each placement is wasted work \u2014 re-pushing one tutor\u2019s affected pairs keeps the term exact at a fraction of the cost.', {
      size: 11.5, color: C.inkSoft, lh: 16,
    });

  tile(s, at(8), 4.4, cols(4), 1.45, 'wash');
  txt(s, at(8) + 0.34, 4.54, cols(3.4), 0.6, '2.28 s', {
    face: D, size: 30, color: C.teal, lh: 34, valign: 'middle',
  });
  txt(s, at(8) + 0.34, 5.2, cols(3.3), 0.54,
    'Mean time to score 208,336 candidate pairs \u2014 5,000 students, 500 tutors, O(n\u00b2 log n).', {
      size: 10, color: C.ink, lh: 13.5,
    });

  PAGE = 7; foot(s, false);
}

/* ======================================================== 08 RESULTS */
{
  const s = newSlide(false);
  head(s, '07 / results \u00b7 match quality', 'Scoring lifts match quality at every contention level');

  tile(s, X0, 1.72, cols(8), 4.05, 'light');
  s.addImage({
    path: path.join(__dirname, '_media', 'image-15-1.png'),
    x: X0 + 0.32, y: 2.0, w: cols(8) - 0.64, h: 3.2,
    sizing: { type: 'contain', w: cols(8) - 0.64, h: 3.2 },
  });
  s.addShape(P.shapes.LINE, {
    x: X0 + 0.32, y: 5.36, w: cols(8) - 0.64, h: 0, line: { color: C.hair, width: 1 },
  });
  txt(s, X0 + 0.32, 5.44, cols(4.4), 0.26,
    'FIG F1 \u00b7 MEAN SCORE BY STRATEGY, 95% CI', {
      face: M, size: 7.5, color: '8B857B', track: 0.4, valign: 'middle',
    });
  txt(s, X0 + 4.9, 5.44, cols(3), 0.26,
    'SO WHAT: SCORING WINS EVERYWHERE', {
      face: M, size: 7.5, bold: true, color: C.teal, track: 0.4, align: 'right', valign: 'middle',
    });

  tile(s, at(8), 1.72, cols(4), 1.95, 'wash');
  txt(s, at(8) + 0.34, 1.86, cols(3.4), 0.66, '+0.07 to +0.18', {
    face: D, size: 26, color: C.teal, lh: 30, valign: 'middle',
  });
  txt(s, at(8) + 0.34, 2.56, cols(3.4), 0.34, 'Scoring beats filter-only matching', {
    face: D, size: 12.5, color: C.ink, lh: 16,
  });
  txt(s, at(8) + 0.34, 2.94, cols(3.4), 0.6,
    'Mean-score gain at every contention ratio, p < 0.0001 across 30 independent populations.', {
      size: 10, color: C.ink, lh: 13.5,
    });

  tile(s, at(8), 3.82, cols(4), 1.95, 'dark');
  txt(s, at(8) + 0.34, 3.96, cols(3.4), 0.66, '0.506 vs 0.391', {
    face: D, size: 26, color: C.tealUp, lh: 30, valign: 'middle',
  });
  txt(s, at(8) + 0.34, 4.66, cols(3.4), 0.34, 'Fairer loads where capacity is slack', {
    face: D, size: 12.5, color: C.bone, lh: 16,
  });
  txt(s, at(8) + 0.34, 5.04, cols(3.4), 0.6,
    'Jain\u2019s fairness index at 1:1 \u2014 sessions spread across tutors instead of stacking one profile.', {
      size: 10, color: C.inkSoft, lh: 13.5,
    });

  tile(s, X0, 5.92, cols(12), 0.85, 'mute');
  txt(s, X0 + 0.36, 5.92, cols(11.2), 0.85,
    'METHOD: 30 INDEPENDENT SYNTHETIC POPULATIONS PER SCENARIO  \u00b7  95% CONFIDENCE INTERVALS  \u00b7  PAIRED SIGN TESTS  \u00b7  EXACT MIN-COST-MAX-FLOW ORACLE AS THE REFERENCE', {
      face: M, size: 8, color: C.textSoft, valign: 'middle', track: 0.5,
    });

  PAGE = 8; foot(s, false);
}

/* =================================================== 09 OPTIMALITY */
{
  const s = newSlide(false);
  head(s, '08 / results \u00b7 optimality and runtime', 'Reaches 98.5\u201399.7% of the exact optimum \u2014 17\u00d7 faster at 5,000 students');

  tile(s, X0, 1.72, cols(7), 3.05, 'light');
  s.addImage({
    path: path.join(__dirname, '_media', 'image-18-1.png'),
    x: X0 + 0.32, y: 1.96, w: cols(7) - 0.64, h: 2.18,
    sizing: { type: 'contain', w: cols(7) - 0.64, h: 2.18 },
  });
  txt(s, X0 + 0.32, 4.34, cols(6.3), 0.28,
    'FIG F5 \u00b7 ENGINE SCORE AS A SHARE OF THE EXACT OPTIMUM, BY SIZE', {
      face: M, size: 7.5, color: '8B857B', track: 0.4, valign: 'middle',
    });

  tile(s, at(7), 1.72, cols(5), 3.05, 'dark');
  label(s, at(7) + 0.32, 1.86, cols(4), 'scale and runtime', { color: C.tealUp });
  txt(s, at(7) + 0.32, 2.12, cols(4.3), 0.32, 'Greedy engine vs exact solver', {
    face: D, size: 14, color: C.bone, lh: 18,
  });
  const cx = [at(7) + 0.32, at(7) + 2.5, at(7) + 3.5];
  s.addText('COHORT  S/T', { x: cx[0], y: 2.5, w: 2.1, h: 0.24, fontFace: M, fontSize: 7.5, color: '6B7372', margin: 0, valign: 'middle', track: 0.4 });
  s.addText('ENGINE', { x: cx[1], y: 2.5, w: 0.95, h: 0.24, fontFace: M, fontSize: 7.5, color: C.tealUp, margin: 0, valign: 'middle', align: 'right', track: 0.4 });
  s.addText('ORACLE', { x: cx[2], y: 2.5, w: 1.1, h: 0.24, fontFace: M, fontSize: 7.5, color: '6B7372', margin: 0, valign: 'middle', align: 'right', track: 0.4 });
  const rows = [['1,000 / 100', '169 ms', '266 ms'], ['2,000 / 200', '316 ms', '1,811 ms'], ['5,000 / 500', '1,619 ms', '27,228 ms']];
  rows.forEach((r, i) => {
    const ry = 2.78 + i * 0.32;
    s.addShape(P.shapes.LINE, { x: cx[0], y: ry - 0.04, w: 4.36, h: 0, line: { color: C.inkLine, width: 1 } });
    s.addText(r[0], { x: cx[0], y: ry, w: 2.1, h: 0.28, fontFace: B, fontSize: 10, color: C.inkSoft, margin: 0, valign: 'middle' });
    s.addText(r[1], { x: cx[1], y: ry, w: 0.95, h: 0.28, fontFace: M, fontSize: 10, bold: true, color: C.tealUp, margin: 0, valign: 'middle', align: 'right' });
    s.addText(r[2], { x: cx[2], y: ry, w: 1.1, h: 0.28, fontFace: B, fontSize: 10, color: '88908F', margin: 0, valign: 'middle', align: 'right' });
  });
  s.addShape(P.shapes.LINE, { x: cx[0], y: 3.76, w: 4.36, h: 0, line: { color: C.inkLine, width: 1 } });
  txt(s, at(7) + 0.32, 3.86, 1.5, 0.46, '16.8\u00d7', { face: D, size: 22, color: C.tealUp, lh: 26, valign: 'middle' });
  txt(s, at(7) + 1.9, 3.84, 2.78, 0.5,
    'FASTER AT 5,000 STUDENTS. THE ORACLE ABANDONS AT 2,000 UNDER CONTENTION.', {
      face: M, size: 7.5, color: '88908F', lh: 10.5, valign: 'middle', track: 0.3,
    });

  tile(s, X0, 4.95, cols(12), 1.0, 'ochre');
  s.addShape(P.shapes.RECTANGLE, { x: X0, y: 5.13, w: 0.05, h: 0.64, fill: { color: C.ochre }, line: { color: C.ochre } });
  label(s, X0 + 0.36, 5.1, cols(3), 'stated limit \u2014 not hidden', { color: C.ochre, h: 0.26 });
  txt(s, X0 + 0.36, 5.4, cols(11.2), 0.42,
    'The worst-served student still sits about 0.02 below the achievable floor. The defect is structural, and closing it costs \u2264 0.0003 per student.', {
      size: 11.5, color: C.ink, lh: 15,
    });

  PAGE = 9; foot(s, false);
}

/* ===================================================== 10 CONCLUSION */
{
  const s = newSlide(false);
  head(s, '09 / conclusion', 'Four questions answered \u2014 one structural limit stated openly');

  const answers = [
    ['RQ1', 'Yes, decisively', '+0.067 to +0.182 mean score over filter-only FCFS at every ratio, p < 0.0001.', false],
    ['RQ2', 'Wins under contention', 'Level at 1:1 (p = 0.86), then +0.019 at 3:1 and +0.124 at 10:1.', false],
    ['RQ3', '98.5 \u2013 99.7%', 'of the oracle\u2019s static total after repair; coverage within 0.0011 of optimal.', true],
    ['RQ4', 'Fairness is affordable', '0.012\u20130.023 mean-score cost at 2\u20133:1; the worst-student floor costs \u2264 0.0003.', false],
  ];
  answers.forEach((a, i) => {
    const x = at(i * 3), w = cols(3), dark = a[3];
    tile(s, x, 1.72, w, 2.2, dark ? 'dark' : 'light');
    s.addShape(P.shapes.RECTANGLE, {
      x, y: 1.9, w: 0.05, h: 0.3,
      fill: { color: dark ? C.tealUp : C.teal }, line: { color: dark ? C.tealUp : C.teal },
    });
    txt(s, x + 0.28, 1.9, 0.7, 0.3, a[0], {
      face: M, size: 9.5, bold: true, color: dark ? C.tealUp : C.teal, valign: 'middle',
    });
    txt(s, x + 0.28, 2.32, w - 0.56, 0.56, a[1], {
      face: D, size: 15, color: dark ? C.bone : C.ink, lh: 19,
    });
    txt(s, x + 0.28, 2.96, w - 0.56, 0.82, a[2], {
      size: 10, color: dark ? C.inkSoft : C.textSoft, lh: 13.5,
    });
  });

  tile(s, X0, 4.12, cols(7), 1.52, 'wash');
  label(s, X0 + 0.36, 4.28, cols(5), 'contribution to knowledge', { color: C.teal });
  txt(s, X0 + 0.36, 4.56, cols(6.2), 0.94,
    'A scoring-and-availability model whose fairness term stays exact at run time \u2014 plus two claims rescoped honestly when the evidence did not hold.', {
      size: 11.5, color: C.ink, lh: 16,
    });

  tile(s, at(7), 4.12, cols(5), 1.52, 'mute');
  label(s, at(7) + 0.32, 4.28, cols(4), 'what comes next', { color: C.textSoft });
  txt(s, at(7) + 0.32, 4.56, cols(4.3), 0.94,
    'A learned compatibility model with fairness kept exogenous, equity profiles per region and subject, and this protocol re-run on real assignment history.', {
      size: 11, color: C.textSoft, lh: 15,
    });

  tile(s, X0, 5.86, cols(12), 0.95, 'dark');
  txt(s, X0 + 0.4, 5.86, cols(8), 0.95, 'Thank you \u2014 we welcome your questions', {
    face: D, size: 19, color: C.bone, valign: 'middle', lh: 23,
  });
  txt(s, X0 + 8.4, 5.86, cols(3.2), 0.95, 'EVERY FIGURE REGENERATES: pnpm run eval:all', {
    face: M, size: 8, color: C.tealUp, align: 'right', valign: 'middle', track: 0.6,
  });

  PAGE = 10; foot(s, false);
}

/* ---------------------------------------------------------------- write */
const out = path.join(__dirname, 'student-tutor-matchmaking-defence.pptx');
P.writeFile({ fileName: out })
  .then(() => console.log('Deck written:', out))
  .catch(e => { console.error('Build failed:', e); process.exit(1); });




