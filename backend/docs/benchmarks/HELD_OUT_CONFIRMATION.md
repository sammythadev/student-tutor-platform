# Held-out confirmation — seeds 1000–1029

## 0. Pre-registration — committed BEFORE the run, do not edit after reading results

This is the confirmation `info.md` §6.6 reserves: every stage so far chose its
hypotheses, guardrails and acceptance rules, then measured them on the
**exploratory** seeds 0–29. Those seeds are now part of the record — they chose
the design, so they cannot also confirm it. Seeds **1000–1029** have never been
run and are spent here, once, whatever they say.

**Scope.** One sweep: `pnpm run eval:statistics -- --seeds 30 --base-seed 1000`,
written to `heldout-statistics-results.csv`. That CSV carries every claim the
four stages are judged on — coverage, `averageScore`, `totalScorePerStudent`,
`worstStudentScore` / `worstStudentStaticScore`, the oracle ratio, the
unplaced-cause buckets, the stability pass and `blockingPairs`. The floor
frontier and the scale benchmark are **not** re-run: their claims are exact per
population or measured at sizes no confirmation sample would change, and
re-running them would spend effort without testing a claim that is at risk.

**Pre-registered questions** (each is a replication question, not a new one):

* **C1 — direction.** Every headline comparison keeps its sign on the held-out
  seeds. The claims, each of which must hold in the same direction on
  seeds 1000–1029 as it did on 0–29:
  1. the deployed engine beats `fcfs-best` on coverage in every unsaturated
     scenario;
  2. the deployed engine beats `fcfs-filter` on coverage in every scenario;
  3. repair raises coverage: `greedy-engine` ≥ `greedy-engine-norepair` in every
     unsaturated scenario, and strictly in at least one;
  4. `floor-exact` raises `worstStudentStaticScore` and never lowers
     `totalScorePerStudent`;
  5. the stability pass lowers `blockingPairs` in every unsaturated scenario and
     never lowers coverage;
  6. the deployed engine stays below the exact oracle's static total
     (`staticTotalRatioVsOracle < 1`).
* **C2 — magnitude.** For every claim in C1, the held-out mean delta lies within
  **±50%** of the exploratory one, or within the 0.002 negligibility band if
  both are inside it. A claim that reproduces in direction but not magnitude is
  reported as *reproduced with a different effect size*, not as a pass.
* **C3 — no regression.** Nothing in the shipped code differs between the two
  runs, so every quantity that does not depend on the seed must be identical:
  the `seeds` column, the arm set, and (within timing noise) the pass cost. A
  metric that moves between identical code paths is a bug, not a finding.
* **C4 — the definitional anchor still holds.** `da-stable` reports **0**
  blocking pairs on all 150 held-out populations, and the unplaced-cause buckets
  still sum to the engine's unplaced count with 0 reason mismatches. These are
  invariants rather than effect sizes, and they are the check that a held-out
  result can be read at all.

**Pre-registered reporting rule.** The result is published whatever it is,
including a claim that fails to reproduce, and the failing claim is not
re-tuned, re-run on different seeds, or dropped. If a claim fails, the
exploratory set becomes the reported result for that claim and the held-out run
is reported as the check that it did not hold up.

**Known limit, stated in advance.** Thirty populations give the sign test real
power at the effect sizes stages 2–4 measured (which reached 30/30), but the
held-out set is 30% smaller than a 100-seed design would be. A p-value between
0.05 and 0.2 on a claim registered here is reported as *underpowered*, not as
refuted. Seeds 1000–1029 are spent by this run: any further confirmation would
need a fresh range, registered before it is used.
