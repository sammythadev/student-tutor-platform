# algorithm.md — Authoritative Matchmaking Algorithm Spec

This supersedes `algorithm-spec.md` from earlier in this thread. It's built directly
from your two working drafts (`THEALGORITHM.docx` for the formal model, `research.txt`
for the criteria glossary), with corrections where the math broke its own stated bounds.
Every correction is logged in §10 so you know exactly what's yours and what's a fix.

`research.txt`'s flat weight table (Subject 30 / Availability 25 / Experience 20 /
Language 15 / Ratings 10) is a preliminary brainstorm and is **not** used here —
`THEALGORITHM.docx`'s nested α/β/γ/δ + w1–w5 structure is the authoritative model. Don't
merge the two weighting schemes; treat `research.txt` only as the criteria/field glossary.

---

## 0. Notation

`s` = student, `t` = tutor. Top-level score:
```
M(s,t) = α·A(s,t) + β·P(s,t) + γ·S(s,t) + δ·F(t)
α + β + γ + δ = 1
```
`A` = academic, `P` = preference, `S` = schedule, `F` = fairness (depends only on `t`).

---

## 1. Algorithm 1 — Academic Compatibility

### 1.1 Subject Eligibility — **[correction: hard filter, not weighted term]**
Original draft scored `Sub(s,t)` as one of three weighted sub-terms inside `A(s,t)`.
That allows a tutor who doesn't teach the subject to still rank — other terms can
compensate for a 0 in one weighted component. A non-matching tutor must never appear at
all. Fix:
```
Eligible(s,t) requires: subject ∈ Subjects(t)
```
This is a pre-filter, applied before any scoring. It is not part of the weighted sum.

### 1.2 Subject Depth (optional, replaces the old Sub weight)
If you want the freed-up weight to do something rather than vanish, grade *how well* the
tutor covers the subject instead of just *whether*:
```
SubDepth(s,t) = 1.0  if exact subject + specialization match
              = 0.7  if subject match, no specialization match
              = 0.5  if subject match only (no further data)
```
If you'd rather not model this, drop it and renormalize w2, w3 below to sum to 1 on
their own — both are valid; pick one and state it.

### 1.3 Level Compatibility — **[correction: unbounded without clamping]**
Original: `Lvl(s,t) = 1 - |Ls - Lt| / Lmax`. The doc claims this is bounded to `[0,1]`,
but that's only true if `|Ls - Lt| ≤ Lmax`. If the level gap exceeds `Lmax`, the formula
goes negative and corrupts the weighted sum. Fix:
```
Lvl(s,t) = max(0, 1 - |Ls - Lt| / Lmax)
```

### 1.4 Experience & Quality — **[correction: same unbounded issue, plus missing cold start]**
Original: `Exp'(t) = θ·(Years_t/Years_max) + (1-θ)·Q_t`. `Years_t/Years_max` exceeds 1 for
any tutor with more experience than your chosen max, again corrupting the bound. Fix:
```
Exp'(t) = θ·min(Years_t / Years_max, 1) + (1-θ)·Q_t
```
`Q_t` (cumulative tutor rating, [0,1]) is defined later via feedback (§7) — but no
starting value exists for a tutor with zero sessions. **Cold start default:**
```
Q_t_initial = 0.5   (neutral midpoint — not 0, which would permanently bury new tutors)
```

### 1.5 Combined Academic Score
```
A(s,t) = w1·SubDepth(s,t) + w2·Lvl(s,t) + w3·Exp'(t)     [if using SubDepth]
A(s,t) = w1·Lvl(s,t) + w2·Exp'(t)                          [if dropping SubDepth]
w-terms sum to 1 in whichever variant you pick
```
Computed only for `t` where `Eligible(s,t)` is true.

---

## 2. Algorithm 2 — Preference Compatibility

### 2.1 Style Vector Encoding — **[gap: original never defines how ps, pt are built]**
`research.txt` names the categorical dimensions (online/in-person, interactive/lecture,
visual/auditory/kinesthetic). Encode each as one-hot, concatenate into a single vector:
```
ps = concat(oneHot(deliveryPref), oneHot(formatPref), oneHot(learningStylePref))
pt = concat(oneHot(deliveryStyle), oneHot(formatStyle), oneHot(teachingStylePref))
```
Both non-negative by construction, so cosine similarity lands in `[0,1]`, not `[-1,1]`.

### 2.2 Style Similarity — **[correction: zero-vector division]**
```
Style(s,t) = (ps · pt) / (||ps|| · ||pt||)
```
If either party specified no preferences at all, `||ps||` or `||pt||` is 0 — undefined
division. Fix:
```
Style(s,t) = 0.5 (neutral)   if ||ps|| = 0 OR ||pt|| = 0
```

### 2.3 Budget Compatibility — **[correction: division by zero when Bs = 0]**
```
Budget(s,t) = 1                              if Rt ≤ Bs
            = max(0, 1 - (Rt - Bs)/Bs)        if Rt > Bs and Bs > 0
            = 0                               if Bs = 0 and Rt > 0
```

### 2.4 Region/Proximity — **[gap: present in research.txt §1.4/§2.5, entirely absent from the formal model]**
Add as an optional term, scoped to in-person mode only — don't apply it for remote
sessions:
```
Region(s,t) = 1               if same region/zone
            = decay(distance) if within max radius
            = 0               if outside max radius, or session is remote (term excluded entirely)
```

### 2.5 Deliberately excluded — **[scope decision, not an oversight]**
`research.txt` §2.8 lists "gender preference" as a possible criterion. **Recommend
excluding this from v1 scoring entirely.** Encoding a protected attribute as a weighted
matching criterion is a discrimination-risk decision that deserves explicit justification
you likely don't want to take on for a seminar project. State this as a deliberate scope
exclusion in your limitations chapter, not as something you forgot.

### 2.6 Combined Preference Score
```
P(s,t) = w4·Style(s,t) + w5·Budget(s,t)                         [remote mode]
P(s,t) = w4·Style(s,t) + w5·Budget(s,t) + w6·Region(s,t)         [in-person mode, w4+w5+w6=1]
```

---

## 3. Algorithm 3 — Schedule Compatibility

```
S(s,t) = |Hs ∩ Ht| / |Hs|
```
**[correction: guard against |Hs| = 0]** — a student with no availability submitted isn't
a 0/0 scoring edge case, it's an incomplete profile. Treat it as a precondition failure:
exclude the student from matching entirely and surface "set your availability" rather
than silently producing `S=0` or crashing.

If `Hs ∩ Ht = ∅`, `S(s,t) = 0` (this part of the original was already correct).

---

## 4. Algorithm 4 — Fairness

```
LoadRatio(t) = CurrentLoad(t) / Capacity(t)
F(t) = 1 - LoadRatio(t)
F(t) = 0   if CurrentLoad(t) ≥ Capacity(t)
```
No correction needed — this one was already well-formed.

---

## 5. Algorithm 5 — Dynamic Weight Adaptation

**[correction: original breaks its own normalization constraint]** — the draft updates
only `α` and `γ` (`γ' = γ + η`, `α' = α(1-η)`) and leaves `β`, `δ` untouched, then asserts
`α'+β'+γ'+δ'=1` without showing how. That's only true by coincidence. Fix: bump the
target weight, then proportionally rescale *everything else* so the total is exactly 1.

```
ALGORITHM AdaptWeights(γ, α, β, δ, η):
    γ' ← min(γ + η, γ_max)         // cap to avoid runaway after repeated adaptation
    remaining ← 1 - γ'
    scale ← remaining / (α + β + δ)
    α' ← α · scale
    β' ← β · scale
    δ' ← δ · scale
    RETURN (α', β', γ', δ')        // sums to exactly 1, always
```
This generalizes cleanly to adapting *any* one of the four weights, not just γ — same
pattern, swap which term gets `+ η` and which three get rescaled.

---

## 6. Algorithm 6 — Conflict Resolution / Assignment

### 6.1 Formulation (unchanged from your draft — this part was correct)
```
x(s,t) ∈ {0,1}                                    decision variable
Σ_s x(s,t) ≤ Capacity(t)                          tutor capacity
Σ_t x(s,t) ≤ 1                                    one tutor per student
x(s,t) = 0  if Hs ∩ Ht = ∅                        schedule feasibility
maximize  Σ_s Σ_t M(s,t)·x(s,t)
```

### 6.2 Worth knowing: this is not NP-hard
Worth flagging for your discussion chapter: with these specific constraints (capacity on
the tutor side, ≤1 on the student side), this is a **bipartite b-matching / transportation
problem**, not the harder Generalized Assignment Problem. It's solvable to true optimality
in polynomial time via min-cost max-flow. **Recommend not implementing this for the
seminar** — it adds a flow-algorithm dependency for a few percentage points of score gain
over greedy — but it's legitimate to mention as a known optimal alternative, and it's a
strong, easy "future work" item: implement it once and benchmark greedy's gap against true
optimal on a small synthetic instance for your results chapter.

### 6.3 Corrected Greedy Algorithm — **[correction: original greedy uses a stale fairness score]**
Your draft's greedy version: sort all `(s,t)` pairs once by `M(s,t)` descending, then walk
the sorted list assigning while constraints hold. The flaw: `M(s,t)` includes `δ·F(t)`,
computed from each tutor's *starting* load — but `F(t)` should drop as that tutor
accumulates assignments during the same run. Once sorted, the list never reflects this, so
pairs near the bottom are ranked using fairness data that's already wrong by the time
you'd reach them.

Fix: **Priority-Queue Greedy with Lazy Fairness Recompute.** Standard technique from
submodular optimization — keeps the same asymptotic complexity as a plain sort, but stays
fairness-correct throughout the run.

```
ALGORITHM AssignWithLazyGreedy(students[], tutors[]):
    heap ← empty max-heap, keyed by score

    FOR EACH student s:
        FOR EACH tutor t WHERE Eligible(s,t):
            static ← α·A(s,t) + β·P(s,t) + γ·S(s,t)     // doesn't change during the run
            key ← static + δ·F(t)                          // F(t) uses CURRENT load
            heap.push((s, t, static), key)

    WHILE heap is not empty:
        (s, t, static), key ← heap.pop()                 // highest key

        IF s already assigned OR t at capacity:
            DISCARD, continue

        freshKey ← static + δ·F(t)                        // recompute with current F(t)
        IF freshKey < key:
            heap.push((s, t, static), freshKey)            // stale — re-push, don't assign yet
            continue

        // key was valid — F(t) hasn't changed since this entry was pushed
        ASSIGN s to t
        t.CurrentLoad += 1
        // F(t) is implicitly recomputed next time it's read — no global re-sort needed
```

This is correct because `F(t)` only ever decreases (load only goes up during a run), so a
stale (too-high) key is always caught on pop and corrected by re-pushing — it can never
cause an incorrect *early* assignment, only a deferred one.

### 6.4 Complexity
- Initial heap build: `O(NM)` pairs pushed
- Each pair can be re-pushed at most `Capacity(t)` times across the whole run (bounded by
  how many times that tutor's `F(t)` actually changes) — amortized total pushes stay
  `O(NM)`
- Each heap op: `O(log(NM))`
- **Total: `O(NM·log(NM))`** — same asymptotic class as a one-time sort, but fairness-correct
  throughout, unlike the static version
- This also replaces the `O(N²M)` "Iterative Best-Match-First" algorithm proposed earlier
  in this thread — that one is now obsolete, this is strictly better at the same fairness
  goal

### 6.5 Quality guarantee
Greedy matching on a weighted bipartite graph guarantees at least **1/2 of the optimal**
total score (standard exchange-argument bound for greedy weighted matching). Cite this
directly — it's real, defensible theory, not just "greedy is simple."

---

## 7. Algorithm 7 — Feedback Update

```
FB(s,t) = Feedback(s,t) / 5                    normalize a 0–5 rating to [0,1]
Q_t_new = (1-λ)·Q_t_old + λ·FB(s,t)             λ ∈ (0,1), exponential moving average
```
Cold start: `Q_t_initial = 0.5` (see §1.4 — same default, applied consistently).

---

## 8. Algorithm 8 — Ranking & Top-K Retrieval

Distinct from §6 — this is for *displaying* ranked suggestions to a student, not for
running the global assignment.
```
Rank(s) = argsort(M(s, t₁), M(s, t₂), ..., M(s, tₘ))  descending
```
For top-K display, use a size-K max-heap rather than a full sort:
```
Complexity: O(M log K)     vs.  O(M log M) for a full sort
```
Use the full sort only where you genuinely need the entire ranked list (e.g. an admin
view); use the heap for any "show top 5 tutors" student-facing feature.

---

## 9. Complexity Summary

| Operation | Complexity |
|---|---|
| Score one (s,t) pair (A, P, S, F) | O(1) — fixed number of criteria |
| Score all pairs | O(N·M) |
| Global assignment (Priority-Queue Greedy, §6) | O(N·M·log(N·M)) amortized |
| Per-student Top-K display (§8) | O(M log K) |
| Full per-student ranking | O(M log M) |
| Dynamic weight adaptation (§5) | O(1) per event |
| Feedback update (§7) | O(1) per session |
| True-optimal assignment (extension, not built) | polynomial via min-cost flow — future work |

---

## 10. Corrections Log — what was fixed and why

| Issue in original draft | Correction applied |
|---|---|
| Level compatibility goes negative if gap > Lmax | Clamped: `max(0, ...)` |
| Experience term exceeds 1 if Years_t > Years_max | Capped: `min(..., 1)` |
| No cold-start value for Q_t | Defined `Q_t_initial = 0.5` |
| Subject match was a soft weighted term — non-matching tutors could still rank | Promoted to hard eligibility filter; freed weight reused as optional graded SubDepth |
| Cosine similarity undefined for zero-norm vectors | Defined neutral fallback `Style = 0.5` |
| No defined encoding for style/learning preference vectors | Defined one-hot concatenation scheme |
| Budget formula divides by Bs with no zero guard | Explicit `Bs = 0` case defined |
| Schedule score divides by \|Hs\| with no guard | Treated as incomplete-profile precondition, not 0/0 |
| Dynamic weight adaptation breaks Σw=1 (only 2 of 4 weights updated) | Proportional renormalization of all remaining weights |
| Greedy assignment sorts once and never updates fairness mid-run | Priority-Queue Greedy with lazy fairness recompute — same complexity class, fairness-correct |
| Region/proximity named in research.txt, absent from formal model | Added as optional term, in-person mode only |
| "Other preferences" (gender) named in research.txt | Recommended explicit exclusion — flagged as a scope decision, not an omission |