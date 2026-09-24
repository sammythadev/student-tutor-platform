# Stage 1 report — metric definitions, oracle gap, cause breakdown

Scope: Stage 1 (1a–1e) of the matching-core plan. Diagnostic only — **no
assignment behaviour changed**. P1 (`greedy-assignment.engine.ts`) and the
oracle (`optimal-baseline.ts`) are untouched; every new column is appended at
the END of the stats header, so existing CSV readers keep working.

Data: `baseline-statistics-results.csv`, 30 independent populations per
scenario, **exploratory seeds 0–29 only** (seeds 1000–1029 remain held out).
Regenerate with `cd backend && pnpm run eval:statistics && pnpm run eval:report`.

---

## 1. Metric definitions (1a)

| Column | Definition | Where |
|---|---|---|
| `averageScore` | Mean composite score of each pair **at its moment of assignment**, averaged over **placed students only**. A strategy that places fewer students is flattered by this: `stress-10to1` reads 0.706 with 75% of students unplaced. | `baseline-comparison.ts` `runStrategyOutcome` |
| `totalScorePerStudent` | Static total ÷ **ALL** students, unplaced counting as 0. Load-independent, and the column that stops low-coverage strategies from looking good. | new in 1b |
| `coverage` | Share of students placed (`placed / students`). | `runStrategyOutcome` |
| `worstStudentScore` | The population's **minimum** placed score, then **averaged across populations** — not the minimum over all populations. It is a per-population floor, not a global one. | `runStrategyOutcome` → `mean(...)` in `statisticsForScenario` |
| `jainFairnessIndex` | Jain's index over tutor loads; 1.0 = perfectly even. | `jain()` |
| `giniLoad` | Gini over the same load vector; 0 = perfectly even. | `giniOf()` |
| `staticTotal` | Σ `CompositeScorer.staticScore` over placed pairs (δ·F excluded). | new in 1b |
| `oracleCoverage`, `oracleStaticTotal` | Exact min-cost-max-flow optimum on the **same population** (`computeOptimal`), skipped above `MAX_ORACLE_STUDENTS = 200` so `stress-10to1` has no oracle row. | new in 1c |
| `engineCoverageGap` | `oracleCoverage − engineCoverage` (0 when the oracle is skipped). Scenario-level: repeated on every row. | new in 1c |
| `staticTotalRatioVsOracle` (+ `Ci95`) | Per-population `engineStaticTotal / oracleStaticTotal`, meaned across populations. | new in 1c |
| `engineUnplacedA…E` (+ shares) | Cause buckets, engine row only (0 elsewhere) — see §3. | new in 1d |
| `engineUnplacedReasonMismatches` | Unplaced students whose engine reason string contradicts the gate re-check. | new in 1d |
| `greedy-engine-static` row | The engine with the fairness weight switched off (see §4). | new in 1e |

`oracle-exact` rows carry aggregates only: their score / Jain / delta columns are
structural zeroes, so they are excluded from both the human significance summary
and the comparison figures (F1–F9), as is `greedy-engine-static`.

## 2. Engine vs baselines vs oracle (30 populations)

| Scenario | Strategy | coverage | totalScorePerStudent | worstStudentScore |
|---|---|---|---|---|
| realistic-1to1 (50×50) | fcfs-best | 0.9193 | 0.504993 | 0.443865 |
| | da-stable | 0.9107 | 0.503285 | 0.438842 |
| | **greedy-engine** | 0.9133 | 0.504089 | 0.438184 |
| | greedy-engine-static | 0.9107 | 0.529814 | 0.423215 |
| | oracle-exact | 0.9287 | 0.510878 | — |
| moderate-1.5to1 (150×100) | fcfs-best | 0.9676 | 0.561810 | 0.413019 |
| | da-stable | 0.9564 | 0.563346 | 0.420404 |
| | **greedy-engine** | 0.9589 | 0.564553 | 0.416648 |
| | greedy-engine-static | 0.9567 | 0.593119 | 0.413230 |
| | oracle-exact | 0.9807 | 0.575534 | — |
| moderate-2to1 (150×75) | fcfs-best | 0.9120 | 0.511916 | 0.409999 |
| | da-stable | 0.8953 | 0.513924 | 0.407621 |
| | **greedy-engine** | 0.8993 | 0.516065 | 0.402800 |
| | greedy-engine-static | 0.8964 | 0.541395 | 0.400261 |
| | oracle-exact | 0.9473 | 0.536701 | — |
| moderate-3to1 (150×50) | fcfs-best | 0.7791 | 0.420440 | 0.396159 |
| | da-stable | 0.7587 | 0.427511 | 0.411258 |
| | **greedy-engine** | 0.7620 | 0.429106 | 0.400704 |
| | greedy-engine-static | 0.7584 | 0.449903 | 0.404907 |
| | oracle-exact | 0.8253 | 0.454086 | — |
| stress-10to1 (1000×100) | fcfs-best | 0.2500 | 0.137145 | 0.377380 |
| | da-stable | 0.2500 | 0.168097 | 0.481895 |
| | **greedy-engine** | 0.2500 | 0.168192 | 0.482572 |
| | greedy-engine-static | 0.2500 | 0.176957 | 0.494303 |
| | oracle-exact | skipped (students > 200) | | |

Static-total ratio to the optimum: 0.9867 (1:1), 0.9809 (1.5:1), 0.9616 (2:1),
0.9450 (3:1) — the engine keeps 94–99% of the oracle's static total while
leaving 1.5–9.5 students per population unplaced.

## 3. Cause breakdown of the engine's unplaced students (1d)

Buckets, verified to sum to the engine's unplaced count in every one of the 150
populations (the suite throws if they do not):

* **(a)** no tutor passes the subject/grade/exam gates — unrecoverable;
* **(b)** a gate-passer exists but every gate-passer is full at run end;
* **(c)** dropped by the top-k cap — **0 by construction**, these runs use `topK = ∞`;
* **(d)** refused by a fairness floor θ — **0, no floor is implemented**;
* **(e)** a gate-passer still had a spare seat at run end — **0 by construction**
  with `topK = ∞`: every eligible pair is pushed, the heap is drained, and
  `assignedCount` never falls, so a seat free at the end was free when that
  student's pairs were popped.

| Scenario | unplaced % | A | B | share A | share B | reason mismatches |
|---|---|---|---|---|---|---|
| realistic-1to1 | 8.67% | 3.00 | 1.33 | 0.662 | 0.338 | 0 |
| moderate-1.5to1 | 4.11% | 1.33 | 4.83 | 0.166 | 0.834 | 0 |
| moderate-2to1 | 10.07% | 4.07 | 11.03 | 0.249 | 0.751 | 0 |
| moderate-3to1 | 23.80% | 10.07 | 25.63 | 0.281 | 0.719 | 0 |
| stress-10to1 | 75.00% | 11.27 | 738.73 | 0.015 | 0.985 | 0 |

**Reason strings hold up in these fixtures:** 0 mismatches across all 150
populations, so `'All eligible tutors reached capacity'` vs the
`NoEligibleTutorsException` text agree with an independent gate re-check. The
taxonomy still checks rather than trusts them, and a unit test pins the
disagreement that *does* exist in principle: a **capacity-0** tutor passes
subject/grade/exam but is excluded from candidate generation, so the engine
blames eligibility where the gates say a qualifying tutor exists
(`baseline-stage1.spec.ts`).

### Answer (1) — how much of the gap is (b)/(c), the repair-recoverable share?

(c) is 0: `topK = ∞` everywhere in this suite, so truncation recovers nothing
here. Bucket (b) is 34%–98% of the engine's unplaced students, but **(b) is not
the repair budget** — the oracle proves how much of it is actually recoverable:

| Scenario | (b) count | oracle coverage gap | gap in students | gap ÷ engine unplaced |
|---|---|---|---|---|
| realistic-1to1 | 1.33 | 0.015333 | 0.77 | 17.7% |
| moderate-1.5to1 | 4.83 | 0.021778 | 3.27 | 53.0% |
| moderate-2to1 | 11.03 | 0.048000 | 7.20 | 47.7% |
| moderate-3to1 | 25.63 | 0.063333 | 9.50 | 26.6% |

So bucket (b) is an **upper bound**, and the oracle gap is the realistic ceiling
for P2: exact re-routing recovers ~0.8 / 3.3 / 7.2 / 9.5 students per population
(the rest of (b) is market scarcity — tutors the student can legitimately use
are taken by other students, and the oracle cannot create seats either).

### Answer (2) — does the engine's edge over fcfs-best survive `totalScorePerStudent`?

| Scenario | Δ(fcfs-best − engine) on `totalScorePerStudent` | p | survives? | Δ on `averageScore` (old metric) |
|---|---|---|---|---|
| realistic-1to1 | **+0.000905** | 0.5847 | **no** | −0.003125, p<0.0001 |
| moderate-1.5to1 | −0.002742 | 0.0987 | **no** | −0.008431, p<0.0001 |
| moderate-2to1 | −0.004149 | 0.0003 | yes | −0.012782, p<0.0001 |
| moderate-3to1 | −0.008666 | <0.0001 | yes | −0.023837, p<0.0001 |
| stress-10to1 | −0.031047 | <0.0001 | yes | −0.124187, p<0.0001 |

**The edge is not robust.** Held to the load-independent metric, fcfs-best is
*not distinguishable* from the engine in both unsaturated scenarios (1:1 and
1.5:1) — and it places more students there (0.9193 vs 0.9133; 0.9676 vs
0.9589). The engine only separates from fcfs-best once contention makes
score-aware ordering pay (2:1 and above). This is the same conclusion the
`averageScore` columns implied, but stated in a metric that cannot be gamed by
leaving students unplaced.

Also unchanged from Stage 0: da-stable is within 0.0001–0.002 of the engine
everywhere (p < 0.05 in 4/5 scenarios by a hair; indistinguishable at 3:1,
p = 0.36). Coverage favors fcfs-best over both in every unsaturated scenario.

## 4. The δ=0 arm is NOT a pure ½-variant (1e)

`greedy-engine-static` runs the engine on `loadFactorWeight = 0` populations of
the **same seeds** (fixtures derive every attribute from
`role:count:seedOffset`, never from the weight, so the population is
byte-identical). It is labeled honestly for one reason: with δ = 0 the criterion
weights no longer sum to 1, so `CriterionWeights.normalize` **rescales α/β/γ by
1/0.95 (+5.26%)**, and the engine's hash tie-break has no off switch. A true
static-only ½ variant would need an engine edit, which this stage deliberately
did not make.

That rescaling is the whole headline, and it is a trap if read naively:

| Scenario | engine `totalScorePerStudent` | δ=0 arm | naive gain | arm ÷ (engine ÷ 0.95) | Δcoverage |
|---|---|---|---|---|---|
| realistic-1to1 | 0.504089 | 0.529814 | +5.1% | **0.9985** | −0.0027 |
| moderate-1.5to1 | 0.564553 | 0.593119 | +5.1% | **0.9981** | −0.0022 |
| moderate-2to1 | 0.516065 | 0.541395 | +4.9% | **0.9966** | −0.0029 |
| moderate-3to1 | 0.429106 | 0.449903 | +4.8% | **0.9960** | −0.0036 |
| stress-10to1 | 0.168192 | 0.176957 | +5.2% | **0.9995** | 0.0000 |

Once the normalization factor is divided out, dropping the fairness term is
worth **−0.05% to −0.4% of total score and −0.2 to −0.4pp of coverage**: the
fairness term is not buying score, but it is not costing any either. The
apparent "+5% for free" is an artifact of the weight rescaling, not a result.
(The arm's `averageScore` advantage at 10:1, +0.001397, is also inside the
agreed <0.002 "practically negligible" band.) Conclusion: **do not cite this arm
as evidence that δ hurts**, and do not build the ½-bound story on it.

## 5. Doc-vs-code mismatches (1e, second half)

From re-reading `info.md` against the code (read-only):

1. **Path drift.** `info.md` writes `greedy-assignment.engine.ts:307-317`,
   `eligibility.filter.ts:8-35`, `optimal-baseline.ts:12-16`. Real paths:
   `backend/src/core/algorithms/assignment/greedy-assignment.engine.ts`,
   `backend/src/core/algorithms/filters/eligibility.filter.ts`,
   `backend/src/core/evaluation/optimal-baseline.ts`. Line references are close
   (priority formula at :307, topK slice at :122-123, reason strings at :183-190,
   gate checks at :10-33).
2. **Wrong inference 1 — five taxonomy categories from the engine.** The plan
   implied `:183-192` provides all five causes. That range emits exactly **two**
   surfaces: `'All eligible tutors reached capacity'` vs the
   `NoEligibleTutorsException` text. There is no reason string for top-k
   truncation (the fallback pass at :202 silently repairs it), and floor-θ /
   no-physical-seat do not exist in the engine at all. Hence the taxonomy in §3
   is computed independently of the reason strings, and (c)/(d)/(e) are asserted
   zero rather than inferred.
3. **Wrong inference 2 — Hungarian complexity.** The tradeoff table cites
   Hungarian algorithm complexity figures; there is no Hungarian implementation
   anywhere in `backend/src`.
4. The ½-bound sentence at `backend/docs/benchmarks/EVALUATION_FINDINGS.md:137`
   still needs the §1 rescoping: the deployed engine deviates from the theorem
   (fairness term, top-k truncation, hash ties), so the claim should be limited
   to the static-only variant, with 0.94–1.0 reported as empirical.

## 6. What this unlocks, and the stop point

> **Realised (24 September 2026) — see `STAGE2_REPAIR.md`.** The repair pass was
> built and measured against the ceiling stated below: it closed 97.7–100% of the
> oracle coverage gap (gaining 0.77 / 3.27 / 7.03 / 9.43 students per population
> at 1:1 / 1.5:1 / 2:1 / 3:1), lifted `totalScorePerStudent` by +1.2…+4.3% with
> zero losses, and left `stress-10to1` untouched because that market has no free
> seat. The engine is now ahead of fcfs-best on coverage in all four unsaturated
> scenarios.

* **P2's ceiling is now measured, not assumed:** at most ~0.8–9.5 students per
  population (17%–53% of the engine's unplaced count) are recoverable by
  augmenting-path repair, decaying to nothing at 1:1 where the oracle gap is
  0.77 students. A P2 result outside that envelope is a bug, not a win.
* **The tail is protected by nothing:** `worstStudentScore` is 0.40–0.44 at 1:1
  through 3:1, and no arm is meaningfully better — the δ term neither raises the
  tail nor (per §4) costs score, which is exactly the setup for P3's floor θ.
* **The quality story is weaker than it looked:** against fcfs-best, the engine
  wins on `totalScorePerStudent` only from 2:1 up.

**Stage 1 stops here.** Stage 2 (P2 cardinality repair: bounded-depth augmenting
paths, accept only on a strict placement increase) needs explicit approval, and
proposes p50/p95 latency guardrails, before any run.
