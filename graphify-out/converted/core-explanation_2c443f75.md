<!-- converted from core-explanation.docx -->


The Core Folder Explained
For People Who Have Never Written Code
(a.k.a. the "Explain It to a Caveman" Edition)
Student-Tutor Matchmaking Platform
Backend Core — NestJS + Drizzle + PostgreSQL

# Table of Contents
What Is the Core Folder?
Part 1: The Building Blocks (Entities, Enums, Exceptions, Constants)
Part 2: The Algorithms (The Brain)
— Filters: The Bouncer
— Scorers: The Judge
— Ranking: The Sorter
— Assignment: The Matchmaker
— Feedback: The Learner
— Adaptation: The Tuner
— Utils: The Toolkit
Part 3: The Engine (The Conductor)
Part 4: The Evaluation Lab (The Testing Arena)
Part 5: The Contracts (Interfaces)
Part 6: How It All Fits Together
Part 7: How To Use It (Quick Start)

# What Is the Core Folder?
The core/ folder is the beating heart of the platform. It contains all the business logic — the rules, calculations, and decisions that make the platform work. Think of it as the brain while everything else (the database, the web server, the user interface) is just the body.
The core folder has ZERO dependencies on NestJS, the database, or HTTP. It could be ripped out and used in any Node.js project. That is intentional — it means the matching logic is pure, testable, and not tangled up with infrastructure.
## Folder Map

# Part 1: The Building Blocks
Before the matching engine can do anything smart, it needs to know what a "student" is, what a "tutor" is, and what rules exist. That is what entities, enums, exceptions, and constants are for.
## Entities (•core/entities/) — The Dictionary
Entities are the nouns of the platform. They describe what things look like.
## Enums (•core/enums/) — The Checkbox List
Enums are fixed lists of allowed values. They prevent typos and keep data clean.
## Exceptions (•core/exceptions/) — The Alarm Bells
- NoEligibleTutorsException — Thrown when ZERO tutors can help a student. Carries the student ID and subject so you can tell the user why.
- IncompleteProfileException — Thrown when a student or tutor is missing important data (like a tutor with zero availability slots).
## Constants (•core/constants/) — The Rulebook Numbers
Tuning numbers that control how the algorithm behaves. Like the dials on a sound mixer.

# Part 2: The Algorithms — The Brain
This is where the magic happens. The algorithms/ folder contains seven sub-systems that work together to find the best tutor for every student.
## 2a. Eligibility Filter — The Bouncer
File: core/algorithms/filters/eligibility.filter.ts
Before we even bother scoring a tutor, we check four hard requirements. If any fails, the tutor is out. No second chances.
## 2b. Scorers — The Judge
Folder: core/algorithms/scorers/
Each scorer produces a number from 0 to 1 measuring one dimension of compatibility. The Composite Scorer then combines all four into a final match score.
### Academic Scorer
File: academic.scorer.ts
- Subject Depth: Does the tutor specialize in the student\'s subject? 1 = yes, 0.7 = teaches it but not specialty, 0 = does not teach it.
- Grade Level Fit: How close are their grade ranges? Same grade = 1, far apart = lower.
- Experience Quality: Blends years of tutoring + average rating into one score. New tutors start at 0.5.
- Exam Type Fit: If tutor supports the student\'s exam type, full score. If not, halved.
### Preference Scorer
File: preference.scorer.ts
- Style Similarity: Converts teaching/learning styles into mathematical vectors and uses cosine similarity (an angle math formula) to measure how aligned they are.
- Budget Fit: Is the tutor\'s rate within the student\'s budget? If yes = 1, if over budget = partial penalty.
- Region Match: For in-person tutoring, do they live near each other? For online, always 1.
### Schedule Scorer
File: schedule.scorer.ts
Measures time overlap: what fraction of the student\'s requested time slots are covered by the tutor\'s available slots? 100% overlap = 1, zero overlap = 0. Each student slot must be covered by a single continuous tutor slot (no stitching fragments together).
### Fairness Scorer
File: fairness.scorer.ts
Ensures tutors are not overloaded. A tutor with 0 current assignments gets a small boost. A full tutor gets 0. The score is calculated as (remaining capacity / total capacity)^1.15 so it slightly favors less-loaded tutors.
### Composite Scorer
File: composite.scorer.ts
The orchestra conductor. It runs all four scorers, multiplies each by its weight, and sums them up: Total = (alpha x academic) + (beta x preference) + (gamma x schedule) + (delta x fairness). It also provides utilities to compute a "static score" (without fairness) and to refresh only fairness after a tutor gets assigned a student.
## 2c. Top-K Ranker — The Sorter
File: core/algorithms/ranking/top-k-ranker.ts
After scoring, this takes a student and all eligible tutors and returns the top K best matches, sorted from best to worst. Eligible tutors are always listed before ineligible ones. Ties are broken by lighter tutor load first, then by ID.
## 2d. Greedy Assignment Engine — The Matchmaker
File: core/algorithms/assignment/greedy-assignment.engine.ts
This is the heavy lifter. It processes a whole batch of students at once using a priority queue:
### How It Works (Step by Step)
- Eligibility check: For every student-tutor pair, the bouncer (EligibilityFilter) checks if they are compatible.
- Score: Every eligible pair gets scored by the CompositeScorer.
- Build the heap: All pairs are thrown into a MaxHeap (priority queue) ordered by score. Best matches on top.
- Pop the best: Take the highest-scoring pair. If the tutor still has room, assign the student. Increment tutor\'s load.
- Repeat: Keep popping until no pairs remain or all students are assigned.
- Waitlist: Students who could not be matched are returned separately for waitlisting.
Optimizations include subject-indexed candidate pruning (skip tutors who don't teach the subject) and top-k truncation (cap how many candidates per student to save memory).
### Assignment Lifecycle
File: core/algorithms/assignment/assignment-lifecycle.ts
After a match is made, things happen:
- Complete: Marks assignment as COMPLETED, frees up the tutor\'s slot.
- Cancel: Marks as CANCELLED, frees the slot, then checks the waitlist to see if anyone can be promoted.
- Recheck Waitlist: Runs a mini batch-assignment on waitlisted students when a slot opens up.
## 2e. Feedback Updater — The Learner
File: core/algorithms/feedback/feedback-updater.ts
When a student rates a tutor (1-5 stars), this updates the tutor\'s quality score using an exponential moving average. Formula: newScore = 0.7 x oldScore + 0.3 x (newRating / 5). This means recent feedback matters more but old scores don't get wiped out.
## 2f. Weight Adaptation — The Tuner
File: core/algorithms/adaptation/weight-adaptation.ts
Allows the system to dynamically increase the importance of one scoring dimension while reducing others (total always stays 1.0). Used for A/B testing or adaptive tuning. The schedule weight is capped at 60% to prevent it from dominating.
## 2g. Utilities — The Toolkit
### Vector Math
File: core/algorithms/utils/vector-math.ts
A mini math library for vector operations. Used by the Preference Scorer to compare styles. Provides: dot product, magnitude, cosine similarity, and one-hot encoding (converts categories like "visual" into binary number arrays).
### Max Heap
File: core/algorithms/utils/max-heap.ts
A priority queue data structure. The item with the highest priority (best match score) is always at the top. Fast push and pop operations. Used by the Greedy Assignment Engine to process matches in optimal order.

# Part 3: The Engine — The Conductor
File: core/engine/matching-engine.ts
The MatchingEngine is the public front door. It wraps the GreedyAssignmentEngine and AssignmentLifecycle into four simple methods the rest of the application can call:
Use matchBatch when you have a bunch of students waiting. Use matchOne when a student signs up and wants a tutor immediately.

# Part 4: The Evaluation Lab — The Testing Arena
Folder: core/evaluation/
This is the research lab where the matching engine gets stress-tested, measured, and compared against alternatives. Not used in production — it is purely for research papers and tuning.
## Fixtures (fixtures.ts) — The Fake Data Factory
Generates synthetic students and tutors for testing. Each gets random but realistic attributes: subjects, schedules, budgets, experience levels. Used by all evaluation scripts.
## Evaluation Harness (evaluation-harness.ts) — The Performance Lab
Runs the greedy engine on various dataset sizes (50, 200, 1000, 5000 students) and measures:
- Average match quality score
- Percentage of students left unassigned
- Jain fairness index (how evenly tutors are loaded)
- Runtime performance (min/mean/max)
## Optimal Baseline (optimal-baseline.ts) — The Perfection Benchmark
Computes the mathematically perfect match using min-cost max-flow (a complex optimization algorithm). This is slow but gives the absolute best possible result. Used to measure the "optimality gap" — how close the greedy engine gets to perfect (spoiler: typically 95%+).
## Baseline Comparison (baseline-comparison.ts) — The Reality Check
Compares the greedy engine against simpler strategies that real tutoring platforms actually use:
- First Eligible: Just grab the first tutor that passes the filters. No scoring. (fcfs-filter)
- Best Eligible: Let each student individually pick their favorite tutor. No global optimization. (fcfs-best)
- Full Greedy: The fancy priority-queue batch assignment. (greedy-engine)
This answers: "Is all this complexity worth it?" (Spoiler: yes, the greedy engine produces higher total satisfaction and better fairness.)
## CLI Output (cli-output.ts) — The Reporter
Shared helpers for all evaluation scripts: flag parsing (--name, --csv), table printing, CSV file writing to docs/benchmarks/. Makes every evaluation script behave consistently.

# Part 5: The Contracts (Interfaces)
Folder: core/interfaces/
Interfaces are promises. They say: "Any database layer must have these methods." The core defines three contracts so it never needs to know about PostgreSQL, Drizzle, or any specific database.
If you want to swap PostgreSQL for MongoDB, you only need to implement these three interfaces. The core stays untouched.

# Part 6: How It All Fits Together
Here is the full flow, from start to finish, in plain English:
### Scenario: A batch of students needs tutors
- Someone (a controller, a cron job, etc.) calls MatchingEngine.matchBatch(students, tutors).
- matchBatch delegates to GreedyAssignmentEngine.assignBatch().
- For every student, the engine finds candidate tutors using a subject index (skip anyone who does not teach the subject).
- EligibilityFilter checks each pair: right subject? right grade? right exam? has capacity?
- CompositeScorer scores each eligible pair: academic fit + preference fit + schedule fit + fairness.
- All scored pairs are pushed into a MaxHeap priority queue. Best match on top.
- Pop the best pair. If the tutor has room, assign the student. Tutor\'s load goes up by 1.
- Fairness score for that tutor is recalculated (they are now less attractive to remaining students).
- Repeat until no pairs left or all students assigned.
- Return the list of assignments + list of waitlisted students.
### Scenario: A rating comes in
- FeedbackUpdater.updateQuality(oldQuality, rating) computes a new quality score using exponential moving average.
- The new quality score affects future match scores (tutors with better ratings rank higher).
### Scenario: A session is cancelled
- MatchingEngine.cancel(assignment, tutors, waitlistedStudents) marks it CANCELLED and frees the tutor slot.
- It checks the waitlist. If a student is now assignable, a new assignment is created automatically.

# Part 7: How To Use It (Quick Start)
If you want to use the core in your code, here is the simplest path:
## 1. Instantiate the Engine
javascript
const matchingEngine = new MatchingEngine();
## 2. Match a Batch of Students
javascript
const result = matchingEngine.matchBatch(students, tutors);
result.assignments.forEach(a => { console.log(`Student ${a.studentId} -> Tutor ${a.tutorId} (score: ${a.score.total})`); });
console.log(`Unmatched: ${result.waitlisted.length} students`);
## 3. Match One Student
javascript
const assignment = matchingEngine.matchOne(student, tutors);
## 4. Complete / Cancel
javascript
matchingEngine.complete(assignment, tutors);
const result = matchingEngine.cancel(assignment, tutors, waitlistedStudents);
## 5. Run Evaluation
bash
npx ts-node src/core/evaluation/evaluation-harness.ts
npx ts-node src/core/evaluation/optimal-baseline.ts
npx ts-node src/core/evaluation/baseline-comparison.ts

--- End of Document ---
| Folder | It Is Like... | Contains |
| --- | --- | --- |
| entities/ | The dictionary | Data shapes: Student, Tutor, Assignment, scores, weights |
| enums/ | The checkbox list | Fixed options: teaching style, exam type, delivery mode |
| exceptions/ | The alarm bells | Custom errors for when stuff goes wrong |
| constants/ | The rulebook numbers | Tuning knobs: max experience years, penalty values |
| algorithms/ | The decision engine | All the math & logic for matching |
| engine/ | The front door | The one class you call to make matching happen |
| evaluation/ | The laboratory | Tests, benchmarks, comparisons against perfect matches |
| interfaces/ | The contracts | Promises between core and the database layer |
| Entity | Caveman Explainer |
| --- | --- |
| Student | A person looking for a tutor. Has subjects, grade level, budget, availability, learning style preferences. |
| Tutor | A person offering tutoring. Has subjects, rates, availability, teaching style, experience, capacity. |
| Assignment | A record of one student being matched to one tutor. Tracks status: active / completed / cancelled / waitlisted. |
| MatchScore | A compatibility score from 0 (terrible) to 1 (perfect). Shows breakdowns for academics, preferences, schedule, fairness. |
| CriterionWeights | A student's personal priorities: "subject fit matters most, schedule matters less." Always adds up to 100%. |
| AlgorithmWeights | The nerdy version of CriterionWeights that the math engine actually uses. Greek letters and sub-scores. |
| AvailabilitySlot | A block of time: "I am free Tuesday 3pm-5pm." Can check overlap with other slots. |
| Enum | Options |
| --- | --- |
| TeachingStyle | INTERACTIVE (discussion) or LECTURE (presentation) |
| LearningStyle | VISUAL (see), AUDITORY (hear), KINESTHETIC (do) |
| FormatPreference | ONE_ON_ONE or GROUP |
| ExamType | WAEC, NECO, or JAMB (Nigerian exams) |
| DeliveryMode | ONLINE or IN_PERSON |
| AssignmentStatus | ACTIVE, COMPLETED, CANCELLED, WAITLISTED |
| Constant | Value | Caveman Meaning |
| --- | --- | --- |
| COLD_START_QUALITY | 0.5 | New tutor with no ratings starts at 50% quality |
| LEVEL_MAX | 12 | Biggest possible grade gap between student and tutor |
| EXPERIENCE_THETA | 0.4 | How much years-of-experience vs rating matters (40% years, 60% rating) |
| EXPERIENCE_YEARS_MAX | 20 | 20+ years experience is treated as 20 (diminishing returns) |
| EXAM_TYPE_MISMATCH_PENALTY | 0.5 | If tutor does not support student\'s exam, subject score is halved |
| FEEDBACK_LAMBDA | 0.3 | How fast tutor quality updates with new feedback (30% new, 70% old) |
| GAMMA_MAX | 0.6 | Schedule fit can never be more than 60% of the total score |
| MAX_RATING | 5 | Maximum feedback rating (5 stars) |
| WEIGHT_EPSILON | 0.001 | Tiny tolerance to avoid floating-point rounding errors |
| Check | Caveman Meaning |
| --- | --- |
| hasSubject | Does this tutor even teach the subject the student needs? |
| supportsGradeLevel | Can this tutor handle the student\'s grade? |
| supportsExamType | Does the tutor support the exam the student is preparing for? |
| hasCapacity | Does the tutor have a spare slot, or are they full? |
| Method | Caveman Meaning |
| --- | --- |
| matchBatch | Give me all the students and all the tutors. I will match everyone at once and return assignments + waitlist. |
| matchOne | I have one student. Find the best tutor for them right now. |
| complete | Mark an assignment as done. Free up the tutor\'s slot. |
| cancel | Cancel an assignment. Free the slot, then check if a waitlisted student can take it. |
| Interface | Required Methods |
| --- | --- |
| ITutorRepository | findById, findEligibleBySubject, findAll, updateAssignedCount |
| IStudentRepository | findById, findPendingForBatch, findByIds |
| IAssignmentRepository | save, findByStudentId, findByTutorId, findWaitlisted, updateStatus |