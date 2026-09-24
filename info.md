# Matching Core: Fairness, Quality & the ½ Bound — Analysis and Improvement Plan

Status: analysis only, no code changed. All claims below are grounded in the
current codebase (`backend/src/core/`); file:line references included.

Context: multi-seed randomness (`--seeds`) was added to the harness. Early
5-seed smoke results humbled the old single-population numbers (e.g. Jain
±0.09; worst student 0.355 vs mean 0.57; engine-vs-DA deltas inside the noise
band). Objective: an algorithm + technique for fairness and matching that
improves the numbers and survives the negative findings.

## 1. The ½ worst-case bound does not hold for the deployed engine

`EVALUATION_FINDINGS.md:137` ("far exceeds the proven 1/2 worst-case bound")
is not formally true of the shipped `GreedyAssignmentEngine`. The classical
greedy ½-approximation for max-weight matching needs three conditions, and the
engine violates all three:

1. **Greedy must order by the true objective.** The engine orders by
   `priority = staticScore + δ·F(t) + loadTieBreak + hashTieBreak`
   (`greedy-assignment.engine.ts:307-317`), while the oracle
   (`optimal-baseline.ts`) optimizes the **static** score (academic +
   preference + schedule, fairness excluded). The charging argument behind the
   ½ proof (each OPT edge is blocked by a greedy edge of ≥ weight) breaks the
   moment a fairness boost lets a statically-worse edge win a seat.
2. **No edge truncation.** `topK` drops eligible pairs before the heap sees
   them (`:122-123`). The theorem assumes every edge participates.
3. **Consistent cardinality handling.** The oracle maximizes placements
   *first*, then weight (`optimal-baseline.ts:12-16`). The engine maximizes
   priority, not placements — the measured 59-vs-64 gap at n=100 is this
   failure mode in the open.

Verified sound: the lazy re-push (`:152-157`) is correct — fairness and the
load tie-break are monotone non-increasing as tutors fill, so a stale heap
entry can never wrongly win.

**Thesis-safe replacement:** rescope ½ to the static-only variant (δ=0,
topK=∞, no hash ties) — that variant genuinely satisfies the theorem.
The deployed variant is three named deviations from it: fairness term,
truncation, hash ties. Report measured ratios (0.94–1.0) as "empirically far
above the bound in tested sizes." Do NOT invent a new fairness-augmented
½ theorem — a dynamic load-dependent objective has no such clean guarantee,
and reviewers spot hand-waved ones immediately.


## 2. Is something better than greedy? The real tradeoff map

No method dominates on quality, speed, stability, fairness, and determinism
simultaneously. Capacitated bipartite assignment (students degree ≤1, tutors
degree ≤ cap):

| Method | Quality | Latency at our scale | Stability | Deterministic | Verdict |
|---|---|---|---|---|---|
| Exact min-cost max-flow (already the oracle) | Optimal | ~10ms at n=100; tens of seconds at 5000×500 as written (SPFA; Dijkstra+potentials would help) | No | Yes | Best quality. Right for nightly batch, wrong for the hot path. Keep as oracle. |
| Current greedy | 94–100% of oracle | ~1.5s at 5000×500 | No | Yes | Right speed tier, but leaks placements (59/64) and has no tail protection. |
| Deferred acceptance | Within 0.001 of greedy (measured, Table 4.7) | Comparable | Yes (blocking pairs ≈ 0 by construction) | Yes | Better only if stability is the objective — not a quality upgrade; our own data proves that. |
| Hungarian | Optimal for 1:1 | Explodes when padded for capacities | No | Yes | Wrong tool for capacitated matching. Don't. |
| Local search / annealing | Good | Unbounded, nondeterministic | No | Yes | Destroys the reproducibility story. Don't. |
| Greedy + bounded repair | ~oracle below saturation | Greedy + small bounded overhead | Optional pass | Yes | **The answer.** Fixes the placement leak, keeps the speed tier and determinism. |

Conclusion: don't replace greedy — **complete** it. The missing piece was never
a better first pass; it's the absence of a second pass. The engine assigns and
walks away; the optimum re-routes. Bounded repair closes that gap with
standard, citable matching technique (augmenting paths for cardinality,
alternating swaps for weight).

## 3. The technique: scarce-aware greedy with bounded repair and priced fairness

A named pipeline. Each stage earns its place by a measured delta; order matters.

**P0 — Eligibility filter (unchanged).** Hard gates stay hard — the one part of
the spec nobody disputes (`eligibility.filter.ts:8-35`).

**P1 — Global greedy (unchanged core).** Keep it, including the monotone lazy
re-evaluation. One change only: **skip the per-student sort when `topK` is
infinite** (`greedy-assignment.engine.ts:122-123`) — sorting a list you then
push in full is pure waste; cheapest latency win in the codebase. Bounded
selection for finite k.

**P2 — Bounded augmenting repair (the new core contribution).** Two move
types, both bounded, both deterministic:
- *Cardinality moves:* for each unassigned student, bounded-depth augmenting
  paths (unassigned student → full eligible tutor → displace one assigned
  student → their alternate tutor with spare capacity). Accept iff placements
  increase. Takes 59 toward 64 — attacks the measured failure directly.
- *Weight moves:* bounded alternating swaps among assigned students that raise
  static total. Accept only on strict increase.
Acceptance order is load-bearing: **cardinality first, then weight.**
Termination is trivially guaranteed (placements strictly increase, then total
strictly increases, both bounded above). Cost bounded by depth × neighborhood
caps; only affected pairs are re-scored. Report per-phase deltas:
`Δplacements`, `Δstatic-total`, repair time.

**P3 — Fairness-constrained rebalance (the fairness technique).** Deliberately
NOT "a bigger δ" — our data proved δ dies under contention. Instead:
- Freeze the P2 total as Σ\*. Maximize the **minimum student outcome** subject
  to **Σ ≥ (1−ε)·Σ\*** — the classical *price of fairness* construction,
  implemented greedily: process assigned students in ascending outcome order,
  attempt improving reassignments, accept iff the (1−ε) floor holds.
- **Floor rule:** refuse any assignment below threshold θ when an eligible
  alternative exists; count overrides as `floorOverrides`. Fixes the measured
  0.355 worst student.
- **Scarce-first protection** (opportunity fairness, distinct from outcome
  fairness): prioritize students with few eligible options at repair/rebalance
  time. Placed OUTSIDE the main heap on purpose — baking scarcity into the main
  priority would be a fourth deviation from the ½-variant and muddy the story.
  Keep P1 pure; protect the vulnerable in P2/P3.

**P4 — Optional stability sweep.** Bounded blocking-pair elimination, capped
iterations, measured residual. Runs AFTER fairness so the interaction is
reported (fairness vs stability is genuine thesis material: they conflict, and
the tradeoff curve with CIs is a result, not a failure).

**P5 — Audit.** Per run, assert and emit: eligibility of every pair, capacity
respected, no double assignment — plus the **unassigned-cause taxonomy** the
engine's own reason strings already half-provide (`:183-192`): (a) no eligible
tutor, (b) eligible but full, (c) truncated by top-k, (d) below floor θ,
(e) no physical seat. Turns "75% unassigned at 10:1" from an embarrassment
into a decomposed, explained number — and shows exactly how much headroom each
future improvement has.


## 4. Why this survives the negative findings

- **59/64 placements → P2 cardinality moves.** Falsifiable: the oracle row must
  show 100% coverage below saturation. If it doesn't, P2 is wrong and visible.
- **Min student 0.355 → P3 floor + max-min rebalance.** Falsifiable: report
  min/p05 with CIs; they must rise while Σ stays within ε.
- **ΔJain = 0 under contention → expected and explained**, not hidden: full
  tutors mean no assignment rule changes the load vector. The fairness claim
  moves from "δ raises Jain" (false under contention) to "P3 raises the tail
  at bounded total cost" (true by construction, measured per seed).
- **Engine vs DA within noise → the sign test decides**, and P2/P3 give the
  engine something real to win on: coverage and tail outcomes, where DA has no
  competing mechanism. The F9 "negative result" figure becomes a
  before/after-repair figure — a redemption arc, the strongest defense slide.
- **581-second timing outlier → percentiles + the sort fix**, reported as-is.
  Never hide an outlier again.
- **The ½ bound → rescoped to the static-only variant** (§1). Nothing else in
  the chapter depends on it once oracle rows carry CIs and repair deltas are
  tabulated.

## 5. What would change this answer

- If the latency budget allows ~seconds at 1000×100 on the hot path, the
  honest recommendation flips: **run exact min-cost flow with
  Dijkstra+potentials in production**, greedy as fallback. Measure first; don't
  decide by aesthetics.
- If stability (no blocking pairs) matters more to the product than total
  score, DA with real two-sided preferences becomes the core and greedy the
  baseline. A product decision, not a math one.
- If held-out seeds show P3's ε cost above ~2–3% of total for meaningful tail
  gains, the price-of-fairness curve IS the finding — publish the curve, don't
  force the mechanism.

## 6. Execution order (no code yet)

1. Unassigned-cause taxonomy + coverage-vs-oracle columns. Diagnostic, no
   behavior change — shows the headroom.
2. P2 repair (cardinality paths, then weight swaps) with per-phase deltas. The
   biggest number-mover.
3. P3 fairness rebalance + floor, with the ε curve.
4. P4 stability sweep as an explicitly optional, separately-measured stage.
5. Sort/selection fixes + byte-level memory (latency hygiene).
6. Locked 30-seed confirmation: exploratory vs held-out seeds, prespecified
   hypotheses per stage (P2 raises coverage; P3 raises min at ≤ε cost; P4
   lowers blocking pairs), guardrails that must not regress (top-choice share,
   mean rank, p50/p95 latency). Any stage failing its hypothesis ships OFF,
   with the negative result documented — that discipline is what makes the
   final core hold.

