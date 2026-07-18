# Optimization Report — Greedy Matchmaking Engine

Date: 2026-07-18
Scope: `backend/src/core/` (engine, scorers, evaluation harness). No DB/module-layer changes.
Test suite: **75/75 passing** (70 pre-existing + 5 new), `pnpm typecheck` clean.

---

## 1. Time complexity

### Formal

| | Before | After |
|---|---|---|
| Pair generation | O(S·T·C) — full scan, weights rebuilt **per pair**, full composite score at push AND at pop | O(S·T·C) worst case, but **one** scoring pass per pair; weights built **once per student**; with subject index O(S·T_s·C) where T_s = tutors teaching the student's subjects |
| Heap operations | O(P·log P), P = eligible pairs | O(P'·log P'), P' = min(P, S·k) with top-k |
| Assignment pop | O(A·C) — **full rescore** per assignment | O(A) — cached score reused, only fairness term recomputed |

C = cost of one composite score (academic + preference + schedule + fairness scorers).

### Measured (median of 5 runs, `stress-sweep`, loadFactorWeight = 0.05)

| Size (S×T) | Baseline | After scoring-cache (Task 2) | After +top-k=10 | Speedup |
|---|---|---|---|---|
| 50×5 | 1 ms | 1 ms | ~1 ms | — |
| 200×20 | 10 ms | 5 ms | ~5 ms | 2× |
| 1000×100 | 124 ms | 86 ms | 88 ms | 1.4× |
| 5000×500 | 3227 ms | 2281 ms | **1185 ms** | **2.7×** |

Sources: `docs/benchmarks/baseline.csv`, `after-task2.csv`, `topk-sweep.csv`.

Key mechanism: the baseline scored every assigned pair **twice** (full `score()` at push
inside `staticScore()`, then again at pop) and rebuilt `CriterionWeights`/`AlgorithmWeights`
for every pair. Now: one scoring pass per eligible pair, weights hoisted per student, and the
pop step reuses the cached sub-scores, recomputing only the load-dependent fairness term
(`CompositeScorer.withFreshFairness`) — semantics verified identical (all quality metrics
byte-for-byte equal to baseline at every size).

### Verified non-bug

The suspected `staticScore()` "double-weighting" was investigated and **disproved**:
`MatchScore.breakdown` stores *unweighted* sub-scores, so re-applying α/β/γ is correct.
The hand-verified academic-score test (0.898182) passes unchanged.

## 2. Space complexity

| | Before | After (top-k) |
|---|---|---|
| Heap entries | O(S·T) eligible pairs | **O(S·k)** |
| Measured @ 5000×500 | 208,336 entries | k=10: **50,000** (−76%) · k=20: 100,000 (−52%) |

Each heap entry now also carries the cached `MatchScore` + weights reference (slightly
larger per-entry), but the top-k cap dominates: net memory is far lower at scale.

### Top-k sweep (5000×500)

| k | avgScore | unassigned% | Jain | elapsedMs | peakHeapEntries |
|---|---|---|---|---|---|
| 10 | 0.804864 | 75.00 | 0.833333 | 1185 | 50,000 |
| 20 | 0.804864 | 75.00 | 0.833333 | 1374 | 100,000 |
| 50 | 0.804864 | 75.00 | 0.833333 | 1735 | 208,336 |
| ∞ | 0.804864 | 75.00 | 0.833333 | 2562 | 208,336 |

**Zero quality loss at any k** on this workload: the 75% unassigned rate is pure capacity
scarcity (~1,250 seats for 5,000 students), not truncation. A **fallback pass** guarantees
correctness anyway: any student whose top-k candidates all filled up is re-scanned against
the full tutor set before being waitlisted (covered by dedicated tests, including a
constructed case where top-1 truncation would otherwise strand a student).

## 3. Jain's fairness index

| Scenario | Size | loadFactor | Baseline Jain | After Jain |
|---|---|---|---|---|
| realistic-seed | 50×50 | 0.05 | 1.000000 | 1.000000 |
| realistic-seed | 50×50 | 0 | 1.000000 | 1.000000 |
| stress-sweep | 50×5 | both | 0.780645 | 0.780645 |
| stress-sweep | 200×20 → 5000×500 | both | 0.833333 | 0.833333 |

**Fairness is unchanged at every size and every k** — expected, because all optimizations
are computation-order/caching changes that preserve the exact priority function
(staticScore + fairness·loadFactor + load tie-break + FNV-1a hash tie-break) and the lazy
fairness re-evaluation loop. Determinism (same inputs → same assignments) is preserved and
covered by the existing hash-tie-break test.

## 4. Optimality gap (greedy vs. exact)

Exact solver: min-cost max-flow (successive shortest paths, SPFA), same `CompositeScorer`
scores, compared on the static-score basis both methods can evaluate identically
(`src/core/evaluation/optimal-baseline.ts`; run with `--optimality-gap`).

| Size | Greedy assigned | Optimal assigned | Greedy score | Optimal score | **Ratio** |
|---|---|---|---|---|---|
| 10×3 | 3 | 3 | 2.2200 | 2.2200 | **1.0000** |
| 25×8 | 14 | 14 | 9.0030 | 9.0030 | **1.0000** |
| 50×16 | 38 | 38 | 23.5330 | 23.5330 | **1.0000** |
| 100×33 | 81 | 81 | 56.0965 | 56.1465 | **0.9991** |

Greedy on a global max-heap is a known ½-approximation for weighted matching in the worst
case; measured, it achieves **100% of optimal** up to 50 students and **99.91%** at 100,
while scaling near-linearly to 5,000×500 in ~1.2 s where exact methods become impractical
(the flow solver is O(V·E·maxflow)). This is the headline greedy-vs-optimal contrast:
*within 0.1% of optimal, with orders-of-magnitude better scaling.*

## 5. What was implemented

1. **Instrumentation** (`AssignmentStats`: `pairsScored`, `peakHeapEntries`, `eligiblePairs`)
   + median-of-5 benchmark timing + CSV artifacts under `docs/benchmarks/`.
2. **Scoring cache + weight hoisting** — one composite pass per pair, weights per student,
   fairness-only refresh at assignment (`withFreshFairness`). ~29% faster alone, exact-identical results.
3. **Subject-indexed pruning** — implemented, **opt-in** (`useSubjectIndex`). On this
   synthetic workload (4 subjects, dense overlap) the Map/Set overhead exceeded the savings
   (measured 4.7× slower at 5000×500), so it defaults **off**; it wins only with high subject
   cardinality and sparse overlap. Recorded honestly rather than shipped as a regression.
4. **Top-k truncation** (`topK` option, default off/∞) with a full-scan **fallback pass** so
   truncation can never strand an assignable student. −76% heap memory, −54% wall-clock at k=10.
5. **Optimal baseline** — dependency-free min-cost max-flow for gap measurement.

## 6. Deliberately skipped

- **Making subject-index the default** — measured net-negative on the current workload (see §5.3).
- **Gale-Shapley / Hungarian** — G-S solves stability (different objective); Hungarian is
  subsumed by the flow model, which handles capacities natively.
- **`process.memoryUsage()` deltas** — heap-entry counts are the direct, GC-noise-free
  measure of the O(S·T)→O(S·k) claim.

## Reproduce

```bash
cd backend
pnpm test                 # 75/75
npx ts-node -r tsconfig-paths/register src/core/evaluation/evaluation-harness.ts                  # main sweep
npx ts-node -r tsconfig-paths/register src/core/evaluation/evaluation-harness.ts --topk-sweep     # k sweep
npx ts-node -r tsconfig-paths/register src/core/evaluation/evaluation-harness.ts --optimality-gap # gap
```
