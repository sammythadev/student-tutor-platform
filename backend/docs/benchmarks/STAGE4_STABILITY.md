# Stage 4 — stability: bounded blocking-pair elimination (P4)

## 0. Pre-registration — written BEFORE the run, do not edit after reading results

Decision on record: Stage 2 closed the placement leak and Stage 3 bounded the
fairness tail. Both left the objective untouched — every arm scores
`staticScore + δ·F(t) + tie-breaks`, and none of them asks whether the matching
it produces is one the two sides would accept. `info.md` §5 states the product
tradeoff plainly: *"If stability (no blocking pairs) matters more to the product
than total score, DA with real two-sided preferences becomes the core and greedy
the baseline. A product decision, not a math one."* This stage measures that
tradeoff instead of asserting either side of it.

**Change under test.** An opt-in engine pass, not a new algorithm:

* `countBlockingPairs(students, tutors, assignments)` — the definition, computed
  from a matching and the tutors' end state. A gate-passing pair `(s, t)` with a
  seat (`capacity > 0`) **blocks** when both sides prefer each other: `s` is
  unplaced or prefers `t` to the tutor it holds, and `t` either has a spare seat
  or scores its weakest current holder below `σ(s, t)`. Preferences on both sides
  are the **static** composite score (`staticScoreFromMatch`), which is
  load-independent, so the fairness term cannot leak into a preference and two
  runs that differ only in assignment order rank identically. A matching with no
  blocking pair is a stable matching in the usual sense, which is why
  `da-stable` must report zero — that is the anchor that keeps this metric
  meaningful rather than self-serving.
* `GreedyAssignmentEngine.assignBatch(..., { stability: true })` — the bounded
  pass. It runs **after** repair (so the arm is the deployed pipeline plus one
  pass, not a different pipeline) and resolves blocking pairs one at a time:
  a free-seat move when the tutor has room, otherwise a swap with the tutor's
  weakest **displaceable** holder (the holder that both scores below the incoming
  student and can take the seat that student vacates). A resolution is applied
  only when the blocking count **strictly falls**; every trial is evaluated on a
  clone first, at most `maxMoves = 64` resolutions are accepted, and the residual
  count is reported either way. An unplaced student facing a full tutor is left
  alone: seating them would mean dropping someone, which is repair's job, not
  this pass's.
* New arm `greedy-engine-stable` in the statistics sweep, next to the deployed
  `greedy-engine`, and `blockingPairs` is now reported for **every** arm — FCFS,
  self-selection, DA, the engine, the ablation, the floor arm and the stability
  arm — so the comparison is like-for-like rather than one arm with a special
  metric.

**Pre-registered hypotheses** (per scenario, exploratory seeds 0–29):

* **H1 (the engine is not stable, and the pass removes some of what it leaves).**
  The stable arm's mean blocking-pair count is **strictly lower** than the
  deployed engine's in **every** unsaturated scenario, by a paired sign test over
  populations (`blockingPairsWinsVsEngine > blockingPairsLossesVsEngine`,
  p < 0.05). A pass that moves nothing, or that trades one blocker for another,
  is a negative result and is reported as one — the definition and the residual
  are the deliverable either way. `stress-10to1` is excluded from H1 (a
  supply-bound market: every arm is pinned at the 0.25 seat bound) but is still
  reported.
* **H2 (the cost is a score trade, measured not assumed).** The pass optimizes
  stability, not total, so `averageScore` and `totalScorePerStudent` may fall.
  Registered: no fall in `totalScorePerStudent` beyond the **0.002**
  negligibility band in any scenario, and **no coverage loss in any population**.
  The fairness interaction (Jain, Gini, worst-student score) is reported
  regardless of sign, because "stability versus fairness" is the interesting part
  and a trade in either direction is a result.
* **H3 (the definition is the standard one).** `da-stable` reports **zero**
  blocking pairs on every population. This is the definitional check: if DA ever
  reports a blocker, the metric is measuring something else and no other number
  in the stage is quotable.

**Pre-registered guardrails** — a breach means the number is not quotable:

* **G1.** The stable arm holds the audit: every matched pair clears the
  subject/grade/exam gates, no tutor exceeds capacity, no student holds two
  seats, and the placed set is a superset of the deployed engine's on the same
  population (the pass must never trade a placement away).
* **G2.** Pass p95 ≤ **250 ms** at 150×100 (the largest unsaturated scenario).
  The pass is offline-only in this stage, so this is a cost record, not a
  production budget.
* **G3.** Determinism: re-running the sweep reproduces the CSV byte-for-byte
  (timing columns excluded), and two engine runs produce the same matching.
* **G4.** The pass is **opt-in**: omitting `stability` and passing
  `stability: false` produce identical assignments and no stability report, so
  the deployed default, P1 and the repair pass are untouched by this stage. The
  ablation's numbers and every pre-existing column must be unchanged.

**Defined in advance as "practically negligible":** |Δ| < 0.002 on a score in
[0, 1], the band stages 1–3 used.

**Pre-registered decision rule.** Production wiring is **not** part of this
stage. Stability-versus-quality is a product decision (`info.md` §5), so the
pass stays OFF in `MatchmakingService` whatever the numbers say; the deliverable
is the measured tradeoff and a stated recommendation. If H1 fails or H2's total
guardrail breaks anywhere, the recommendation is to leave the pass out of the
request path entirely and the negative is recorded with the curve that produced
it. If H1 holds and the pass's cost stays inside G2, the recommendation is that
the pass is available as an explicit opt-in for a deployment that values
stability over some static total — with the measured per-scenario price attached.

**Seeds.** Exploratory seeds 0–29 only. Held-out seeds 1000–1029 are reserved and
untouched by this stage.

## 1. What was measured

`pnpm run eval:statistics` on exploratory seeds 0–29, five built-in scenarios,
9 rows per scenario (7 arms + the δ=0 static arm + the oracle row), 64 columns.
`blockingPairs*` and `stability*` are the new columns; every pre-existing metric
cell is byte-identical to the pre-stage-4 sweep (only wall-clock columns moved).

**Blocking pairs per population, by arm** (mean over 30 populations; 0 = a
stable matching):

| Scenario | fcfs-filter | fcfs-best | da-stable | greedy-engine | greedy-engine-stable | greedy-engine-norepair | floor-exact | greedy-engine-static |
|---|---|---|---|---|---|---|---|---|
| realistic-1to1 | 66.43 | 4.90 | **0.00** | 4.93 | 1.63 | 3.93 | 1.97 | 1.40 |
| moderate-1.5to1 | 425.57 | 38.83 | **0.00** | 25.43 | 11.13 | 15.00 | 19.17 | 13.07 |
| moderate-2to1 | 296.83 | 45.67 | **0.00** | 33.53 | 20.20 | 10.20 | 24.70 | 26.67 |
| moderate-3to1 | 193.87 | 59.57 | **0.00** | 42.03 | 28.17 | 5.33 | 27.87 | 40.67 |
| stress-10to1 | 3931.10 | 2280.10 | **0.00** | 3.33 | 3.00 | 3.33 | 18.27 | 0.00 |

The cost of the pass (mean accepted resolutions, wall-clock p50/p95 in ms):
1:1 2.97 moves 1.71/3.84 · 1.5:1 10.27 moves 12.76/19.25 · 2:1 9.57 moves
11.50/18.36 · 3:1 8.30 moves 9.50/16.89 · 10:1 0.30 moves 78.10/104.05.

## 2. Hypotheses, as registered

* **H1 HOLDS.** The stable arm's blocking-pair count is strictly lower than the
  engine's in every unsaturated scenario, by paired sign test over populations:
  reduction **+3.30 (30/30, p<0.0001)** at 1:1, **+14.30 (30/30, p<0.0001)** at
  1.5:1, **+13.33 (30/30, p<0.0001)** at 2:1, **+13.87 (30/30, p<0.0001)** at 3:1.
  The excluded supply-bound scenario also improves, +1.43 (7/7 decided, p=0.0156,
  the other 23 populations are ties at 3 blockers).
* **H2 HOLDS, and not in the registered direction.** The pass was expected to
  buy stability with static total. It does not: `totalScorePerStudent` *rises* by
  **+0.000534 (27/30)**, **+0.000999 (29/30)**, **+0.001716 (28/30)** and
  **+0.002219 (29/30)**, and falls 0.000006 at 10:1 — no fall anywhere, so the
  0.002 negligibility band is never approached. Coverage is **identical in all
  five scenarios** (+0.000000): the pass never trades a placement away. What it
  does trade is *load fairness and the tail*, which the pre-registration
  required to be reported:

  | Scenario | Δ totalScorePerStudent | Δ coverage | Δ Jain | Δ Gini(load) | Δ worstStudentScore | Δ averageScore |
  |---|---|---|---|---|---|---|
  | realistic-1to1 | +0.000534 | 0.000000 | −0.032094 | +0.033641 | −0.006660 | −0.002006 |
  | moderate-1.5to1 | +0.000999 | 0.000000 | −0.034923 | +0.034679 | −0.005159 | −0.001501 |
  | moderate-2to1 | +0.001716 | 0.000000 | −0.018344 | +0.018016 | −0.006621 | −0.000116 |
  | moderate-3to1 | +0.002219 | 0.000000 | −0.007133 | +0.006404 | −0.009678 | +0.001303 |
  | stress-10to1 | −0.000006 | 0.000000 | +0.000000 | +0.000000 | +0.000000 | −0.000095 |

  So the honest statement of the tradeoff is three-way, not two-way: the
  bounded pass buys stability (and, incidentally, a slightly better static
  total) by pushing seats onto *emptier* tutors, which is precisely what
  `staticScore + δ·F(t)` was already steering away from. The δ term is
  load-dependent, so the swaps that remove blockers are the same swaps that
  flatten the load vector.
* **H3 HOLDS — and this is the load-bearing check.** `da-stable` reports
  **exactly 0.00 blocking pairs in all five scenarios**, over 150 populations.
  Gale-Shapley only terminates when no pair would rather be matched, so the
  metric reproduces a known-zero ground truth by construction. That is what
  makes the engine's 4.93–42.03 a real gap and not a counting artefact.

## 3. Guardrails

* **G1 PASS.** Every matched pair clears the subject/grade/exam gates, no tutor
  exceeds capacity, no student holds two seats, and the placed set is never
  smaller than the deployed engine's — pinned in
  `src/core/__tests__/baseline-stage4.spec.ts`, and coverage in the table above
  is identical to six decimals in every scenario.
* **G2 PASS.** Pass p95 is **19.25 ms** at 150×100 against the 250 ms budget
  (78/104 ms at 1000×100, where the pass is not needed for correctness either).
* **G3 PASS.** Two independent sweeps of the same 44 rows × 64 columns differ in
  **0** non-timing cells; two engine runs return the same matching, the same
  move count and the same residual.
* **G4 PASS.** The pass is opt-in: omitting `stability` and passing
  `stability: false` produce identical assignments and no report. No
  pre-existing metric cell in the sweep changed — 74 changed cells, all of them
  `repairMsP*`/`oracleMsP*` wall-clock, which the added pair scoring shifted.
  Figures F1–F9 regenerate **byte-identical**; the stability arm is excluded from
  the quality figures and appears in F10 alone.

## 4. What this stage changes about the story

1. **The engine is measurably not stable, and the deployed arm is the one that
   trades it away.** `greedy-engine` leaves 25–42 blockers per population at
   1.5:1–3:1 where the stable reference is 0.
2. **The repair pass costs stability.** `greedy-engine-norepair` leaves 15.00 /
   10.20 / 5.33 blockers at 1.5:1 / 2:1 / 3:1 against the repaired engine's
   25.43 / 33.53 / 42.03. Seating a student by displacing a seated one is
   exactly how a blocking pair is created, so stage 2's coverage gain and
   stability are in direct conflict. The stability pass recovers part of that
   (20.20 at 2:1) but not all of it — a stable matching that also maximises
   coverage is a different algorithm, and deferred acceptance is not it either
   (it places 0.895 vs the engine's 0.946 at 2:1).
3. **The exact optimum is not stable either.** `floor-exact` leaves 18.27
   blockers at 10:1 and 19–28 in the unsaturated scenarios, and the oracle row
   does not measure stability at all (the exact solve emits totals, not
   pairings). Stability and optimality are separate objectives, which is the
   point `info.md` §5 makes.
4. **FCFS is the stability disaster**: 194–3931 blockers per population. Any
   stability requirement rules out arrival-order assignment outright.

**Recommendation, as pre-registered.** H1 holds and the cost is far inside G2,
so the pass is worth *having* — but it stays OFF in `MatchmakingService`. The
measured reason is specific rather than cautious: it moves 0.007–0.035 of Jain
and 0.005–0.010 off the worst placed student, and stage 3 spent its whole
budget buying that tail back. Take it only where a deployment is told to prefer
stability over both, in which case the price is the table in §2, not an unknown.

## 5. Not measured here

* Two-sided preferences: the definition ranks tutors by the *same* static score
  the student ranking uses. A tutor with a genuine preference list would move
  the blocking counts, and DA's zero would still be zero only under symmetric
  utilities.
* The pass's residual blockers are not characterised individually — the counts
  are per population, not per cause. A scenario-level decomposition of the
  residual (as stage 1 did for unplaced students) is untaken.
* No size above 1000×100 was run with the pass on; at 5000×500 the pair scoring
  the pass needs would be the dominant cost and nothing here suggests it fits a
  request path.
* Held-out seeds 1000–1029 remain reserved and untouched.
