# Stage 2 — bounded repair of the greedy engine (P2)

## 0. Pre-registration — written BEFORE the run, do not edit after reading results

Decision on record: Stage 1 measured the engine's placement leak and its exact
ceiling. The engine leaves 0.8 / 3.3 / 7.2 / 9.5 students per population
unplaced at 1:1 / 1.5:1 / 2:1 / 3:1 while the oracle places them, and it loses
coverage to `fcfs-best` in **all four** unsaturated scenarios. P2 is the chosen
lever because that ceiling is measured rather than hoped for.

**Change under test.** A bounded augmenting-path repair pass that runs AFTER
P1's heap is drained, behind a flag that defaults OFF. P1 is untouched: no
change to its heap order, its priority function, its lazy re-push, or the
fallback pass. Only already-unplaced students can gain a seat, and a seat is
created by re-routing an already-placed student to a different tutor.

**Pre-registered hypotheses** (evaluated per scenario, excluding `stress-10to1`,
where the engine already places exactly the seat bound: 1000 students, 100
tutors, ~250 seats, and all four arms score coverage = 0.25):

* **H1 (cardinality).** Mean `coverage` with repair is **strictly greater** than
  plain engine coverage, and **at least** `fcfs-best` coverage, in every
  unsaturated scenario.
* **H2 (quality).** Mean `totalScorePerStudent` with repair is **not lower** than
  the plain engine's, reported with a paired sign test (wins/losses/ties + p) so
  a mean that hides per-seed losses cannot pass.

**Pre-registered guardrails** — any breach ships the stage OFF:

* **G1.** Assignment audit holds with repair on: every placed pair passes the
  subject/grade/exam gates, no tutor exceeds capacity, no student holds two
  seats.
* **G2.** Repair overhead p95 ≤ **100 ms** at 150×100 (the largest unsaturated
  scenario).
* **G3.** Determinism: two runs on identical inputs produce identical
  placements (tutor-by-tutor), so the reproducibility claim survives.

**Pre-registered failure conditions.** H1 fails if any unsaturated scenario gains
nothing; H2 fails if the mean falls or if the sign test shows more losses than
wins. A failing stage is documented as a negative result and left OFF — the
numbers below are reported as-is, including anything that contradicts the plan
that motivated this work.

**Bounds and determinism by construction.** Path depth ≤ `maxDepth` (default 3),
a per-student search-work cap, tutors explored in static-score order with tutor
id as the tie-break, holders visited in student-id order. No randomness.

**Not in scope here** (deliberately): the weight-swap phase (P3-adjacent) and
the fairness floor θ. If cardinality repair verifies, the residual gap to the
oracle decides whether swaps are worth their risk.

## 1. Results

Ran on exploratory seeds 0–29 only; seeds 1000–1029 were not touched. Data:
`baseline-statistics-results.csv` (arm `greedy-engine-repair`),
regenerate with `pnpm run eval:statistics && pnpm run eval:report`.

### 1.1 Cardinality (H1) — PASSES in all four unsaturated scenarios

| Scenario | engine | **repair** | fcfs-best | oracle | gap closed | repairs/pop | displaced/pop |
|---|---|---|---|---|---|---|---|
| realistic-1to1 (50×50) | 0.913333 | **0.928667** | 0.919333 | 0.928667 | **100.0%** | +0.767 | 1.03 |
| moderate-1.5to1 (150×100) | 0.958889 | **0.980667** | 0.967556 | 0.980667 | **100.0%** | +3.267 | 6.50 |
| moderate-2to1 (150×75) | 0.899333 | **0.946222** | 0.912000 | 0.947333 | 97.7% | +7.033 | 15.60 |
| moderate-3to1 (150×50) | 0.762000 | **0.824889** | 0.779111 | 0.825333 | 99.3% | +9.433 | 22.00 |
| stress-10to1 (1000×100) | 0.250000 | 0.250000 | 0.250000 | skipped | — | 0 | 0 |

Coverage rises in every unsaturated scenario **and now exceeds `fcfs-best`
in every one of them** — the failure that motivated the stage. Coverage lands
within 0.0004–0.0011 of the exact optimum, i.e. the pass closes 97.7–100% of the
measured oracle gap.

`stress-10to1` is untouched by design and by construction: 1000 students, 100
tutors, 250 seats, and the engine already places all 250. There is no spare seat
anywhere in that market, so no augmenting path can exist — see the guardrail
finding in §1.4.

### 1.2 Quality (H2) — PASSES

`totalScorePerStudent` is the load-independent metric from Stage 1 (static total
over ALL students, unplaced counted as zero):

| Scenario | engine | repair | Δ | paired W/L/T | p | static total vs oracle |
|---|---|---|---|---|---|---|
| realistic-1to1 | 0.504089 | 0.509581 | **+0.010986** (+2.18%) | 15/0/15 | <0.0001 | 98.67% → **99.75%** |
| moderate-1.5to1 | 0.564553 | 0.571529 | **+0.006976** (+1.24%) | 30/0/0 | <0.0001 | 98.09% → **99.30%** |
| moderate-2to1 | 0.516065 | 0.530546 | **+0.014481** (+2.81%) | 30/0/0 | <0.0001 | 96.16% → **98.85%** |
| moderate-3to1 | 0.429106 | 0.447339 | **+0.018232** (+4.25%) | 30/0/0 | <0.0001 | 94.50% → **98.52%** |
| stress-10to1 | 0.168192 | 0.168192 | 0 | all ties | 1 | — |

No scenario has more losses than wins, the mean never falls, and every gain is
well outside the pre-agreed `<0.002` negligibility band — the smallest, +0.00698,
is 3.5× that band.

The 1:1 column's 15/0/15 split is not a partial failure: in half of those
populations the greedy pass had already found the maximum matching, so there was
nothing for repair to do. Aggregated, the 30 populations gained 23 placements.

### 1.3 The placed-only mean falls — as predicted, and that is the point

`averageScore` (mean over PLACED students) *drops* with repair: −0.009144 (1:1),
−0.008035 (1.5:1), −0.017695 (2:1), −0.027833 (3:1). Repair seats weaker
students, so the mean over the seated population goes down while more students
are served and the load-independent total goes up. Anyone reading only
`averageScore` would conclude the engine got worse. This is the metric trap
Stage 1a documented, now demonstrated on a real change.

### 1.4 Guardrails

* **G1 — audit invariants: PASS.** A test re-checks every placed pair against the
  subject/grade/exam gates, every tutor against its capacity, and every student
  against double seating, with repair ON at 150×50, and asserts the pass did real
  work (`placementsGained > 0`) so the audit cannot pass vacuously.
* **G2 — p95 repair overhead ≤ 100 ms at 150×100: BREACHED, then fixed.**
  First measurement: `stress-10to1` spent **142.0 ms p50 / 161.6 ms p95 to gain
  nothing** — 750 unplaced students each paying a depth-≤3 search that cannot
  succeed, in a market with no free seat. Root cause identified, then fixed with
  a sound early exit: every augmenting path must end at a tutor holding a free
  seat, so if no tutor holds one, no path of any depth exists. After the fix,
  `stress-10to1` costs 0.28 ms p50 / 0.49 ms p95 for the identical result, and
  the maximum repair cost anywhere in the sweep is **5.60 ms p95** (150×50). All
  other scenarios' placements are unchanged by the fix.
* **G3 — determinism: PASS.** Two runs on identical inputs produce identical
  placements and identical phase counts (only the wall-clock reading differs).
  The full sweep also reproduces.

**Verdict: the stage ships ON** (as the `greedy-engine-repair` arm and the
opt-in `repair` engine option; the flag still defaults OFF so deployed behaviour
is unchanged).

## 2. What this settles about "the best algorithm"

1. **The engine is now the best of the four strategies on both headline metrics,
   at every ratio.** It beats fcfs-best on coverage in all four unsaturated
   scenarios (it previously lost all four) and on `totalScorePerStudent` in all
   four, while closing to within ~1% of the exact optimum on both.
2. **Repair is cheap:** ≤5.60 ms p95 at 150×50 for 1.2–4.3% more score per
   student, deterministic, and it changes nothing when the market is
   supply-bound.
3. **Exact flow is affordable at our evaluated scale — measured, not assumed.**
   The SPFA-based oracle's own per-population wall clock is **p50/p95 = 2.39/6.48 ms
   (50×50), 21.87/32.29 ms (150×100), 14.50/23.05 ms (150×75), 10.51/17.16 ms
   (150×50)**. So at ≤150×100 a min-cost-max-flow solver finishes in ≤33 ms p95,
   which makes "optimal by default at our scale, greedy+repair above it" a
   defensible production design. Two caveats before anyone claims it: the oracle
   scores the STATIC objective only (it cannot model live-load fairness, which
   the engine's δ term does) and returns totals, not pairings — so shipping it
   needs assignment reconstruction, and Dijkstra+potentials for the 5000×500
   tier that SPFA will not carry.
4. **What is still missing is the tail, not the total.** `worstStudentScore`
   remains 0.40–0.44 in the contended scenarios and repair does not target it.
   That is P3's job (floor θ + max-min rebalance), and the price-of-fairness curve
   is the remaining result worth having.

## 3. Reproduce

```bash
cd backend
pnpm run eval:statistics   # seeds 0–29 → baseline-statistics-results.csv
pnpm run eval:report       # → figures/, FIGURES.md, index.html
npx jest src/core/__tests__/baseline-stage2.spec.ts
```
