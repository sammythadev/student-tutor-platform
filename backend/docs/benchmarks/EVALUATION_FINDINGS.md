# Evaluation Findings — Final Authoritative Run

**Date:** 13 August 2026
**Command:** `pnpm eval:all` (evaluation harness) · `pnpm test:cov` · optimality-gap tool
**Reproducibility:** the harness contains no un-seeded randomness; all match-quality and
fairness figures below are exactly reproducible from the repository. Wall-clock timings vary
with hardware.

Source data: `evaluation-results.csv`, `baseline-comparison-results.csv`,
`optimality-gap-results.csv`, `topk-sweep-results.csv` (this directory).

---

## 1. Test suite

`pnpm test` passes **102 of 102** tests:

| Suite | File | Tests |
|---|---|---|
| Core algorithm (unit) | `src/core/__tests__/core-units.spec.ts` | 55 |
| Core engine (integration-style) | `src/core/__tests__/core-engine.spec.ts` | 23 |
| Evaluation TUI | `src/core/__tests__/evaluation-tui.spec.ts` | 23 |
| App controller | `src/app/controller/app.controller.spec.ts` | 1 |

Per-class statement coverage ranges from 82.14% (EligibilityFilter) to 100%; the
GreedyAssignmentEngine sits at 83.05% statement / 76.92% branch (see Table 4.2 of the report).

## 2. Match quality and fairness (Table 4.4 of the report)

`loadFactorWeight = 0.05`, `topK = inf` (defaults):

| Scenario | Ratio | Students | Tutors | Avg compatibility | Unassigned % | Jain fairness |
|---|---|---|---|---|---|---|
| realistic-seed | 1:1 | 50 | 50 | 0.6032 | 4.00% | 0.5620 |
| moderate-1.5to1 | 1.5:1 | 150 | 100 | 0.6194 | 7.33% | 0.6335 |
| moderate-2to1 | 2:1 | 150 | 75 | 0.6208 | 12.67% | 0.6997 |
| moderate-3to1 | 3:1 | 150 | 50 | 0.6093 | 22.00% | 0.8322 |
| moderate-4to1 | 4:1 | 200 | 50 | 0.6082 | 36.00% | 0.8533 |
| stress-sweep | 10:1 | 1,000 | 100 | 0.7124 | 75.00% | 0.8333 |
| stress-sweep | 10:1 | 5,000 | 500 | 0.7806 | 75.00% | 0.8333 |

Findings:

- **Unassigned % is governed almost entirely by aggregate tutor capacity** relative to
  demand — it rises monotonically with the student:tutor ratio (4% → 75%) regardless of
  the scoring function.
- **Jain's index rises with ratio** (0.5620 → 0.8533) because more students per tutor means
  more tutors end up carrying similar, higher loads; at 10:1 it settles at 0.8333, where
  final loads are fixed by capacity itself rather than by assignment order.

## 3. Effect of the fairness weight (Table 4.5 of the report)

| Ratio | Jain (δ=0.05) | Jain (δ=0) | Δ | Avg score (δ=0.05) | Avg score (δ=0) |
|---|---|---|---|---|---|
| 1.5:1 | 0.6335 | 0.5945 | +0.0390 | 0.6194 | 0.6106 |
| 2:1 | 0.6997 | 0.6997 | +0.0000 | 0.6208 | 0.6137 |
| 3:1 | 0.8322 | 0.8322 | +0.0000 | 0.6093 | 0.6046 |
| 4:1 | 0.8533 | 0.8533 | +0.0000 | 0.6082 | 0.6042 |
| 10:1 (n=1,000) | 0.8333 | 0.8333 | +0.0000 | 0.7124 | 0.7145 |

Findings:

- At 1.5:1 the fairness weight improves Jain's index by **+0.039** with a slightly higher
  average score rather than a lower one (spreading load onto emptier tutors captures the
  cold-start boost).
- At 2:1 and beyond in the current fixtures, Jain's index is **identical** whether the
  weight is enabled or not — tutor capacity becomes the binding constraint on load
  distribution, not the scoring function.
- Average scores across the two settings are not directly comparable as quality measures,
  because the composite score itself includes the fairness term.

## 4. Performance benchmarking (Table 4.6 of the report)

| Students | Tutors | Pairs scored | Elapsed min (ms) | Elapsed mean (ms) | Elapsed max (ms) |
|---|---|---|---|---|---|
| 50 | 5 | 14 | 2 | 2.8 | 3 |
| 200 | 20 | 216 | 4 | 6.2 | 11 |
| 1,000 | 100 | 6,769 | 72 | 108.0 | 140 |
| 5,000 | 500 | 176,790 | 1,996 | 2,066.6 | 2,160 |

Findings:

- A five-fold increase in scale raises the number of pairs by a factor of roughly 26–31,
  consistent with the O(n²) pair-scoring floor; mean elapsed time grows 6.2 → 108.0 →
  2,066.6 ms, consistent with O(n² log n) (quadratic growth plus a slowly growing log
  factor).
- The smallest scale's timings are close to the resolution of the measurement (JIT
  warm-up noise) and are reported for completeness only.

## 5. Comparison with baseline assignment (Table 4.7 of the report)

Three baselines were implemented alongside the harness:

1. **filter-only FCFS** (`fcfs-filter`) — first eligible tutor by arrival order, closest to
   deployed practice;
2. **score-based self-selection** (`fcfs-best`) — each student takes their own best eligible
   tutor in arrival order, with no coordination across students;
3. **deferred acceptance** (`da-stable`) — student-proposing Gale-Shapley in its
   college-admissions form with tutor capacities; both sides rank by the same static
   composite score, so the outcome is a stable matching. Stability is a different objective
   from total score, so it is a genuine competing baseline.

| Scenario | Avg (FCFS) | Avg (self) | Avg (DA) | Avg (engine) | Jain (FCFS) | Jain (self) | Jain (DA) | Jain (engine) |
|---|---|---|---|---|---|---|---|---|
| realistic-seed (1:1) | 0.5234 | 0.6011 | 0.6027 | 0.6032 | 0.4573 | 0.5396 | 0.5236 | 0.5620 |
| moderate-1.5to1 | 0.5270 | 0.6120 | 0.6186 | 0.6194 | 0.5158 | 0.6447 | 0.6057 | 0.6335 |
| moderate-2to1 | 0.5148 | 0.6091 | 0.6200 | 0.6208 | 0.5808 | 0.6955 | 0.6997 | 0.6997 |
| moderate-3to1 | 0.5298 | 0.5859 | 0.6088 | 0.6093 | 0.7845 | 0.8505 | 0.8322 | 0.8322 |
| stress-sweep (10:1) | 0.5311 | 0.5828 | 0.7124 | 0.7124 | 0.8333 | 0.8333 | 0.8333 | 0.8333 |

Findings:

- **Filter-only FCFS costs 0.08–0.18 in average compatibility (a 13–26% relative
  reduction) at every ratio** and produces the most uneven load distribution whenever
  capacity is slack (Jain 0.46 vs 0.56 at 1:1). This is the empirical case for scoring at all.
- **Self-selection tracks the engine wherever supply is abundant** (leads within 0.002 at
  1:1, 0.007 at 1.5:1) but falls behind under contention: **0.012 at 2:1, 0.023 at 3:1,
  and 0.130 at 10:1** — early arrivals under FCFS take tutors that later students needed
  more, while the batch engine gives each remaining seat to the pairing that values it most.
- **Deferred acceptance produces essentially the same average score as the engine** (within
  0.001 at every ratio), as both optimise over the same static utilities; the engine's
  advantage shows in load distribution (Jain 0.5620 vs 0.5236 at 1:1) because it keeps
  recomputing fairness as tutors fill, whereas a stable matching fixes each pair once.

## 6. Optimality gap (Section 4.5.5 of the report)

| Size | Students | Tutors | Greedy assigned | Optimal assigned | Score ratio |
|---|---|---|---|---|---|
| 10 | 10 | 3 | 2 | 2 | 1.0000 |
| 25 | 25 | 8 | 10 | 10 | 0.9992 |
| 50 | 50 | 16 | 25 | 25 | 0.9998 |
| 100 | 100 | 33 | 59 | 64 | 0.9435 |

At the three smallest sizes the greedy engine matches the true optimum's assignment count
and reaches 99.9–100.0% of the optimal total score; at the largest tested instance it
places 59 of the 64 students the optimum could place (94.3% of optimal score). In every
case this far exceeds the proven 1/2 worst-case bound.
