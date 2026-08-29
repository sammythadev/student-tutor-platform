<!-- converted from PROJECT REPORT1.docx -->

A MULTI-CRITERIA STUDENT-TUTOR MATCHMAKING SYSTEM USING WEIGHTED SCORING AND AVAILABILITY OPTIMIZATION
A Final Year Project Presented by
ANUMUDU UDOCHUKWU SAMUEL
20211259202
AND
OBI MICHAEL CHIMAOBI
20211265722
Submitted to
THE DEPARTMENT OF SOFTWARE ENGINEERING
SCHOOL OF INFORMATION AND COMMUNICATION TECHNOLOGY
FEDERAL UNIVERSITY OF TECHNOLOGY OWERRI
Supervised By
Engr. Dr. A. I. Erike
IN PARTIAL FULFILLMENT OF THE REQUIREMENTS FOR THE AWARD OF
BACHELOR OF TECHNOLOGY (B. TECH) IN SOFTWARE ENGINEERING
JULY 2026
# ABSTRACT
Student-to-tutor matching is a multi-criteria decision-making problem, but most tutoring platforms base their matches on subject and availability only. This paper designed, implemented and tested a multi-criteria student-tutor matchmaking system in the context of secondary school tutoring environments. Compatibility is determined using a composite scoring function with four bounded sub-score functions – academic, preference, scheduling, and fairness – aggregated using weights chosen by students, while the matchmaking is performed using a greedy algorithm with lazy fairness recompute using a priority queue, implemented as a framework-agnostic TypeScript domain layer in a NestJS/PostgreSQL web application. The time complexity of the algorithm is O(n² log n), demonstrated empirically by quadratic growth of the number of pairs scored when scaling up five times, as well as by achieving 94.3-100% of the optimal total score, compared to a min-cost max-flow baseline, which is proved to be a 1/2 approximation to the optimal solution. Adding a fairness weighting term improved Jain’s fairness index by 0.039 at a 1.5:1 student:tutor ratio, with no measurable change at higher ratios once tutor capacity bounds the load distribution, and without lowering average match quality in the moderate band.
Keywords: student–tutor matching; multi-criteria decision-making; weighted scoring; greedy assignment; fairness; explainability
# CHAPTER ONE
INTRODUCTION
## 1.1 Background to the Study
Online learning has now become mainstream. The online tutoring services market alone, for instance, was estimated at USD 10.4 billion in 2024 and is forecast to almost double, to reach USD 23.7 billion in 2030 (Grand View Research, 2025), with students at the primary and secondary levels contributing over half of that demand. The increased popularity of learning services is due to the rising adoption of a broader trend in learning personalization – learning tailored to the unique needs and learning styles of each individual learner. This trend has been widely recognized in studies of educational recommender systems and is directly correlated with higher levels of engagement and better educational outcomes (Deschenes, 2020; da Silva et al., 2023; Spivakovsky et al., 2025).
The need for quality additional tutoring can be seen in the context of the West African secondary schools where the current research project is set up. According to WASSCE results of 2024, out of 1.8 million candidates, 72.12 percent scored credit passes in at least five subjects, including English Language and Mathematics, but this is a drop of 7.69 percentage points compared to the 2023 results (Vanguard, 2024). As a result, roughly half a million candidates failed to pass at least 5 core subjects with credit level. Many others are trying to improve their grades for competitive admission into universities. Thus, for many candidates, the hiring of private tutors for WAEC and NECO exams became a standard solution. However, this process is still largely informal, with most people relying on recommendations from others and online sources.
Even where tutoring websites are available, the process of matching students with tutors is done using very primitive techniques such as manual assignment, keyword filtering, or even rules based on subject and availability only (Taveekarn et al., 2014; Ramesh, 2020). While this may be easy to implement, it does not consider various aspects that make up the suitability of a match, which includes subject expertise and proficiency level, tutor experience, language, schedule fit, teaching style compatibility, cost, and history of the tutor. Unsuccessful matches end up wasting hours of contact and even money for the paying family.
Besides this, there are issues of imbalances that occur within the platform since most of the tutors who are highly ranked have too many students to teach while the new tutors have none at all due to the ranking effect (Pitoura et al., 2022), and there are also clashes in schedules. Multi-criteria decision-making and combinatorial optimization provide an elegant solution to the two issues since they use the weighted scoring models to evaluate and solve conflicting constraints and even fairness constraints (Wang et al., 2023; Hien et al., 2025). This paper will use this approach to tackle the issue of matching of tutors and students in a system implemented using NestJS, React and PostgreSQL.
## 1.2 Statement of Problem
Even in the light of how big the market of online tutoring is, the main allocation problem of assigning tutors to students remains unsolved using methods empirically proven as insufficient. Tutor-finder tools rely on just the matching based on subjects and time slots only (Taveekarn et al., 2014); there are tutor allocation algorithms which consider style but ignore time and fairness aspects (Ramesh, 2020); and reviews of educational recommender systems point out the rare use of direct tutor allocation as well (da Silva et al., 2023). The particular challenges resulting from this situation are:
Limited matching criteria: Current systems ignore important factors such as teaching style, language compatibility, pricing, and historical performance.
Scheduling inefficiencies: Conflicts arise when tutors and students have overlapping or incompatible time slots, especially in recurring sessions.
Uneven tutor workload: Popular tutors tend to receive excessive requests, while others are underutilized, leading to imbalance in the system.
Static preference handling: Most systems do not adapt to individual student priorities such as cost sensitivity or preference for experience.
Poor conflict handling: Situations such as cancellations, reassignments, or competing bookings are not handled efficiently.
These limitations have practical consequences for everyone involved. Students may spend valuable time searching for a suitable tutor, especially when preparing for important examinations. Families may incur additional costs when an unsuitable tutor has to be replaced, while tutors may receive fewer opportunities because students are distributed unevenly. For tutoring platforms, the lack of transparency in the matching process can reduce user’s confidence in the recommendations provided. Furthermore, the literature reviewed in Chapter Two did not identify any study that integrates multi-criteria decision-making, schedule feasibility, workload balancing, and explainable matching within a single student–tutor allocation framework. This gap highlights the need for a more comprehensive allocation approach, which this project aims to develop.
## 1.3 Objectives of the Study
General Objective
To design, implement, and evaluate a multi-criteria student–tutor matchmaking algorithm that optimizes compatibility, fairness, and scheduling efficiency in digital tutoring environments.
Specific Objectives
The study aimed to:
To develop a weighted composite scoring model that evaluates student–tutor compatibility over subject expertise, grade level, experience, teaching style, pricing, and region, with every sub-score bounded to [0,1].
To design a dynamic preference mechanism that lets each student adjust the relative importance of the matching criteria, with automatic renormalization of the weights.
To develop a conflict-resolution mechanism for competing tutor requests and overlapping schedules, including deterministic tie-breaking and waitlisting.
To implement a fairness and load-balancing mechanism that distributes students equitably across tutors, and to identify the operating conditions under which it is effective.
To evaluate the algorithm’s computational efficiency and scalability through formal complexity analysis and empirical benchmarking, and its match quality against an exact optimal baseline.
To integrate the algorithm into a full-stack web application demonstrating the end-to-end matchmaking workflow.
## 1.4 Research Questions
## 1.5 Scope of the Study
The current study considers the design, implementation and evaluation of a multi-criteria matchmaking system for secondary school tutoring that uses weighted compatibility scores, schedule matching and subject, grade level and examination type (WAEC, NECO etc.) preferences filtering. Examination type is not used as a background notion but is implemented in the system explicitly. It is stored as an attribute of students and tutors (Section 4.3.1), taken into consideration at the eligibility filtering stage (Section 4.6) and affects the calculation of the academic compatibility score (Section 4.5.1). Evaluation of the system also involves realistic secondary school data from Nigeria (Section 4.10.1). The system also implements workload balancing and explains every match.
Technically, the study considers the implementation of the weighted scoring model, scheduling constraints handling, student-tutor conflict handling, and system evaluation for fairness, scalability and performance. The implementation of the system uses the three-tier architecture with the Next.js React frontend, NestJS backend where matchmaking algorithm is implemented in the domain layer of the system and PostgreSQL database managed via Drizzle ORM.
## 1.6 Limitations of the Study
The system was analyzed using simulated data sets instead of actual large-scale data from the platform.
Behavioral aspects of humans such as personality compatibility and emotional interaction are missing in the model.
The performance analysis depends upon the nature of the feedback data, which may be biased or incomplete.
The methods for ensuring fairness are formulated using pre-defined mathematical models, which may not always address real-life perceptions of fairness.
The algorithm for allocation is guaranteed to obtain at least half of the optimum score but not necessarily the global optimum score.
## 1.7 Significance of the Study
The significance of the research is that it combines technical optimality with practical educational needs. By making personalized matching efficient, it produces accurate, need-oriented matches while keeping tutor loads balanced and their evaluation objective.
The study also contributes to the theory of multi-criteria optimization and explainable recommendation. Its complexity analysis, together with the discovery of the load regime in which the fairness weight is actually effective, speaks to matchmaking mechanisms in general, particularly those built on greedy queue-priority assignment and lazy fairness recompute.

## 1.8 Definition of Terms
# CHAPTER TWO
LITERATURE REVIEW
## 2.1 Conceptual Framework
The process of tutor matching has gone through three major phases through history. Initially, tutoring was done manually by the administrator or agency depending on the subject and availability. With the evolution of tutoring software, the process of matching became more sophisticated in the form of simple rules where matching was based only on subject and time slot (Taveekarn et al., 2014). The more recent developments have included additional parameters like teaching method, budget and experience of the tutor, with some weighting but still without any unified mathematical formula and fairness system (Ramesh, 2020). The conceptual model used in this study takes the third phase into account as the pipeline consisting of four interrelated stages of matching, depicted in Figure 2.1.
Figure 2.1: Conceptual framework of the matchmaking pipeline
The pipeline’s input, scoring, and assignment stages feed forward, with a feedback loop returning updated tutor quality to the scoring stage for future matches.
The input stage gathers information about students and tutors, namely subject required, academic level, availability, language, tutoring approach, expected payment, and past ratings. It turns out from prior works on tutor matching that such profile variables are both feasible and significant (Taveekarn et al., 2014; Ramesh, 2020).
During the scoring stage, every possible combination of student and tutor gets transformed into the normalized compatibility number based on four composable sub-scorers: AcademicScorer, PreferenceScorer, ScheduleScorer, and FairnessScorer. Each sub-scorer evaluates the pair and returns the value from [0, 1], and then the CompositeScorer combines these values using the four main weights: alpha, beta, gamma, and delta.
In the assignment stage, GreedyAssignmentEngine processes possible matches from high to low score using a max-heap priority queue and lazy re-computing the fairness score, which ensures that this score takes into account the actual tutor load. During the feedback stage, the exponential moving average(ema) with lambda = 0.3 updates the average rating for every tutor after the session.
## 2.2 Theoretical Framework
Tutor-student assignment is an example of a multi-criteria decision-making problem because the process entails more than one criterion. One can be a better tutor compared to another in terms of subject knowledge but less effective regarding schedule and availability. Multi-criteria decision-making provides a framework for comparing different alternatives through normalization, weighting, and ranking (Wang et al., 2023; Hien et al., 2025). As a result, it is important to apply a weighted compatibility score to make decisions in this situation rather than use a rule-based filtering approach.
Recommender systems research is also applied in the paper. Traditional literature suggests that recommendations become better in case a coherent framework is built based on user preferences, item properties and ranking algorithms (Adomavicius & Tuzhilin, 2005; Burke, 2002). More recent surveys and handbooks confirm that the recommender systems research field has shifted from algorithm development to user-centered context-aware frameworks (Konstan & Riedl, 2012; Ricci et al., 2022). Here, students are the users and tutors are the items.
Moreover, the problem becomes even more complex due to the relation between the quality of the recommendation itself and the effectiveness of the learning process. As is shown by the studies of Tarus et al. (2018), Deschenes (2020), and da Silva et al. (2023), the educational recommendation systems are applied to learning materials, peer recommendations, and learning activities; however, they do not take into account the recommendation of a personal tutor. Karaci (2019) also reveals the importance of the structured approach to learner modeling and feedback in intelligent tutoring systems, thereby confirming the necessity of adaptive algorithms.
Finally, any recommendation should be feasible. In scheduling problems, time overlap, capacity, and ordering of allocation matter most (Leung, 2004; Pinedo, 2022). Feasibility, however, is only part of the problem: modern systems are also expected to be fair and transparent. Pitoura et al. (2022) demonstrate how the ranking systems could result in biased visibility, whereas according to Zhang and Chen (2020), explanation leads to improved trust among users. Coppolillo et al. (2024) also find that the effects of the recommendation could become outdated over time.
The greedy algorithm for the problem studied in this paper relies on bipartite matching theory. It is known that for any weighted bipartite graph, the application of a greedy algorithm on such a graph yields at least half of the optimal value of the total score in virtue of an obvious exchange argument (Korte & Vygen, 2018; Preis, 1999).
## 2.3 Empirical Framework
Empirical studies related to this topic come from three main directions: educational recommender systems, direct tutor-matching applications, and algorithmic personalization studies. The most relevant studies are summarized in Table 2.1.
Table 2.1: Summary of closely related studies
### Research Gap
Notwithstanding the advancement of knowledge in this area of research, there is still a gap in the literature. Many research papers on educational recommenders target recommendations for learning materials, peer discovery or personalization but not tutor assignment for a particular student. Studies in direct tutor-matching do exist but they mostly rely on limited filters or matching logic without paying due regard to issues of fairness, scheduling conflicts and explainability.
The current paper fills this gap by providing a solution where the weighted scoring with four composable sub-scorers (academic, preference, schedule, fairness) is coupled with a priority queue greedy assignment algorithm with lazy fairness recompute, and feedback-based EMA update in one single implemented framework. The current project has been developed into a full stack application where the algorithm runs as a domain layer.
## 2.4 Summary of Literature Review
This chapter has shown how student-tutor matching sits at the intersection of three well-established fields of research (multi-criteria decision making, recommender systems, and scheduling), where explainability and fairness are now treated as first-class considerations in system design. Recommender systems have advanced significantly for educational content and peer recommendation in the past few years, but the problem of student-tutor recommendation is yet largely unexplored and the recommendation engines used for that purpose usually depend on simple filters instead of a more general framework of multiple criteria weighting. A sound mathematical basis for our design in the form of the proven 1/2-approximation for greedy bipartite matching is provided by this literature, and we will use it directly without merely referencing it as theoretical background.
# CHAPTER THREE
RESEARCH METHODOLOGY
Several methodologies are commonly used for software development projects of this kind, including the Structured Systems Analysis and Design Methodology (SSADM), the Object-Oriented Analysis and Design Methodology (OOADM), Prototyping, and Agile development. Each was considered before a final choice was made for this study.
SSADM is a stage-gated methodology that produces extensive documentation before any code is written; it suits projects with fixed, well-understood requirements but adapts poorly when a project’s design changes as implementation reveals new information, as happened repeatedly in this project (Appendix B documents eighteen such changes between the seminar proposal and the final system). OOADM organizes a system around interacting objects and is well suited to systems with rich domain entities, but on its own it does not prescribe how algorithmic components should be revised iteratively once discrepancies are found during coding. Prototyping allows early user feedback on interface mock-ups but does not, by itself, provide a disciplined way to verify that an algorithm’s mathematical properties (such as its approximation guarantee or its complexity bound) hold in the implemented code.
This study adopted a design science approach (Hevner et al., 2004), executed through short, Agile-style iterations, because its central output is an artifact — a matchmaking algorithm and the system that runs it — rather than an observation about an existing system. Design science is appropriate specifically when a study aims to solve a practical problem through the construction of a purposeful solution, which matches this study’s aim of producing both an algorithm and a working implementation of it. Agile iteration was layered on top of the design science process because it allowed each part of the algorithm specification (scoring, assignment, fairness, feedback) to be designed, implemented, tested, and corrected in a short cycle before moving to the next part, rather than committing to a single upfront design that could not be revised once its flaws surfaced during coding.
The overall research process, following the logic proposed by Peffers et al. (2007) for design science research and the staged analysis-design- implementation practice recommended by Sommerville (2016), proceeded in six stages:
Problem identification and requirements gathering, drawing on the limitations of existing tutor-matching approaches identified in Chapter Two.
Selection of matching criteria and baseline weights for the composite scoring model.
System architecture and database design.
Algorithm specification, expressed as explicit equations with bounded output ranges (Section 4.5), so that each formula could be unit-tested independently.
Iterative implementation, in which each algorithm component was built, tested against the specification, and corrected when the implementation exposed a gap in the original design — for example, an undefined edge case or an unbounded formula. A running corrections log was kept throughout this stage (summarised in Appendix B) so that every design change could be traced back to the reason it was made.
Evaluation, comprising unit testing, edge-case verification, and empirical benchmarking of the implemented algorithm (Chapter Four).
This combination — a design science frame for the overall research logic, with Agile iteration governing how the algorithm itself was refined — was chosen over a single-pass methodology such as SSADM because it tolerates design correction without discarding prior work, and over pure Prototyping because it keeps the algorithm’s formal properties (bounds, complexity, approximation guarantee) as first-class, testable requirements rather than an afterthought to the interface.
## 3.1 Requirements Gathering
The first stage of the process established what the system had to do and the constraints under which it had to do it. Requirements were gathered through the channels actually available to the study — online sources, asking questions, and manual examination of existing practice — supported throughout by document analysis of the research literature (Sommerville, 2016; Nuseibeh & Easterbrook, 2000). Online sources were the starting point: the websites, product documentation and market reports reviewed in Chapters One and Two, including the FindMyTutor app (Taveekarn et al., 2014), Ramesh’s (2020) tutor-matching method, the market sizing of Grand View Research (2025) and the WASSCE statistics (Vanguard, 2024), were examined to see which criteria deployed platforms actually use to match students with tutors and where they fall short. Asking questions supplied what the written sources could not: the supervisor was consulted during the seminar proposal review of February 2026, and the feedback from that review fixed the intended scope, the matching criteria and the weighting scheme the study set out to formalise; informal questions were also put to fellow students who had arranged private tutoring, which clarified how families actually choose tutors. Manual examination completed the picture — the authors traced by hand how the traditional manual process (an administrator or agency matching students with tutors on subject and availability, as described in Sections 1.1 and 2.1) would assign a small group of students, and that exercise is where the fairness and scheduling problems in Section 1.2 first surfaced. Together these channels defined the problems the system had to address; the research gap distilled from the literature (Section 2.4) then turned them into a concrete specification.
From these sources a set of functional requirements was distilled. The system must exclude tutors who cannot teach a student’s subject before any ranking is performed; score every remaining student–tutor pair on several weighted criteria rather than on subject and availability alone; respect each student’s own preference weights; treat timetable feasibility as a hard constraint; spread students across tutors so that highly rated tutors are not saturated while newer tutors sit idle; fold post-session feedback into a tutor’s standing; and expose the reason for every match rather than returning an opaque ranking.
A parallel set of non-functional requirements followed from the academic aims of the study. Every sub-score had to be bounded to a known range so that the composite could be reasoned about and unit tested; the assignment had to run fast enough to be practical at platform scale, with a complexity bound that could be stated and checked; results had to be reproducible from a fixed random seed so that reported figures could be regenerated; and the matching logic had to be isolated from the web framework so that it could be tested independently of any HTTP or database concern. Table 3.1 collects the requirements gathered at this stage.


Table 3.1: Requirements gathered and their sources
The elicitation also fixed the data the system would consume and the data the evaluation would need. Because no live dataset of sufficient scale existed (Section 1.6), a domain profile was compiled from the Nigerian secondary-school context the platform targets: the subjects taught at that level, the grade levels, the WAEC and NECO examination types, representative tutor experience and pricing, and weekly availability patterns. This profile is the input to the deterministic data generator used throughout the evaluation; its design is described in Section 4.10.1, and the datasets it produces are analysed in Sections 4.10.2–4.10.4. Fixing these fields at the requirements stage is what allowed the scoring criteria to be defined against real attributes rather than placeholders.
## 3.2 Developing an Algorithm to Match Students with Tutors Based on Established Criteria
With the requirements fixed, the second stage turned the matching problem into an explicit, computable model. The established criteria — the attributes on which a student and a tutor are judged compatible — were grouped into four buckets, each yielding a sub-score bounded to [0,1]: academic fit, preference fit, schedule fit, and fairness. Every student–tutor pair receives a single composite score as the weighted sum of the four, with the weights summing to one. The full equations for each criterion and for the composite are set out in Section 4.5.
Academic fit combines subject depth — graded only after subject eligibility has already been enforced as a hard filter — with grade-level proximity and the tutor’s experience and accumulated rating. Preference fit combines teaching-style similarity, budget compatibility, and, for in-person sessions, regional proximity. Schedule fit is the proportion of a student’s requested time slots that a single tutor slot can cover. Fairness depends only on the tutor, favouring those carrying a lighter load so that assignment is spread rather than concentrated. The baseline weights were set from the relative importance the criteria were given during requirements gathering; a student may override them, after which the weights are re-normalised to sum to one. Table 3.2 lists the baseline criterion weights and the four-bucket weights they aggregate into.



Table 3.2: Baseline criterion weights and the composite buckets they form
The model was developed one component at a time, each expressed as an equation with an explicit output range so that it could be unit tested against hand-computed values before integration. Assignment across all students was then formulated as a bipartite b-matching problem and solved with a priority-queue greedy algorithm that recomputes each tutor’s fairness lazily as load accumulates during a run, so the fairness term never goes stale mid-batch. A tutor’s rating is updated after each session by an exponential moving average, closing the loop between feedback and later matches. The detailed pseudocode and the complexity analysis appear in Section 4.5; the listing below states the same procedure at the level of design.
Algorithm 3.1: Criteria-based student–tutor matching (design overview)
- For each student, filter out ineligible tutors on subject, grade level, exam type, and spare capacity.
- Score each surviving pair on the four bounded criteria and combine them with the student’s weights.
- Push every eligible pair onto a max-heap keyed by its composite score.
- Repeatedly take the best pair; if it is still valid, assign it and increment the tutor’s load; if its fairness score has gone stale, re-push it with a fresh score instead of assigning.
- Waitlist any student left unmatched, recording an explicit reason.
- After a session completes, update the tutor’s rating and use it when scoring future matches.
Figure 3.1 condenses Algorithm 3.1 into its main flow: eligible pairs are scored on the four bounded criteria, pushed onto a max-heap, and assigned from the highest score downward, with each accepted pair incrementing the tutor's load before the next is considered. It is the design-level view of the procedure; the full implementation detail, including lazy fairness recomputation, is presented in Section 4.5.2.

Figure 3.1: Simplified flowchart of the criteria-based matching procedure (design overview)
In parallel with the greedy engine, the study also formalised a stability-based alternative for comparison. Deferred acceptance, the student-proposing Gale-Shapley algorithm (Gale & Shapley, 1962; Roth, 2008) in its college-admissions form extended with tutor capacities, produces a stable matching in which no student–tutor pair would both prefer each other over their assigned partners. Stability is a different objective from total score, so it serves as a genuine competing baseline rather than a tuning variant of the greedy engine. Both strategies run on identical fixtures and are compared in Section 4.10.5, together with the first-come-first-served strategies that deployed platforms typically use.
## 3.3 Implementation Plan
The third stage planned how the model would be built, in what order, and how it would be verified. The guiding decision was to implement the matching logic as a framework-independent TypeScript layer first, with no dependency on the web framework or the database, and only then to wrap it in the surrounding application. This ordering let the algorithm be tested against its specification before any HTTP or persistence code existed.
Implementation was planned in six phases:
- Build the core domain layer — entities, the four scorers, the eligibility filter, the greedy assignment engine, and the feedback updater — each with unit tests asserting exact outputs.
- Build a standalone evaluation harness with a seeded synthetic data generator based on the domain profile compiled in Section 3.1.
- Wrap the core in NestJS feature modules (controllers, services, repositories) that expose it over a REST API.
- Persist state in PostgreSQL through Drizzle ORM, with migrations generated from the schema.
- Build a Next.js client to exercise the workflow end to end.
- Run the evaluation across the planned scenarios and record the results.
The stack was chosen to serve this ordering: NestJS for the modular application layer, TypeScript in strict mode for the typed core, Drizzle ORM over PostgreSQL for schema-first persistence, Jest for unit and integration testing, and a pnpm-managed monorepo holding the backend and the client as separate packages. The full, version-pinned stack is listed in Section 4.1.1.
The plan also fixed how the implemented algorithm would be judged. Five metrics were selected, each tied to a research question from Section 1.4: the average compatibility score of accepted matches (match quality; RQ1, RQ5); the percentage of students left unassigned (allocation effectiveness; RQ3); Jain’s fairness index over tutor loads (load balance; RQ4); wall-clock execution time across dataset scales (scalability; RQ6); and the ratio of the greedy algorithm’s total score to the exact optimum from a min-cost max-flow solver (solution quality; RQ6). Benchmarks report the minimum, mean, and maximum over five runs per scenario, and the engine is compared against three baselines on identical fixtures (Section 4.10.5): filter-only first-come-first-served matching, score-based self-selection, and deferred-acceptance stable matching (Gale-Shapley).
The datasets themselves are produced by the deterministic generator inside the evaluation harness, seeded so that every figure reported in Chapter Four is reproducible from the repository. Three scenario families were planned: a realistic 1:1 scenario mirroring the seed data, a moderate-load band (1.5:1 to 4:1 student:tutor ratios) that probes the fairness mechanism where slack capacity exists, and a 10:1 stress sweep at four scales to validate scaling behaviour.
# CHAPTER FOUR
SYSTEM DESIGN AND IMPLEMENTATION
## 4.1 Analysis of Data Collection
The data analysed in this chapter come from the requirements stage (Section 3.1). Because no live platform dataset of sufficient scale existed (Section 1.6), the study worked with two kinds of data. The first is the domain profile of the target setting: the subjects offered in Nigerian secondary schools, the grade levels, the WAEC and NECO examination types, representative tutor experience, pricing and capacity, and weekly availability patterns, assembled from the literature surveyed in Chapter Two and from the seminar proposal. This profile fixes the attributes on which every student and tutor in the evaluation is generated, so the results in Section 4.10 speak to the population the system is designed for rather than to generic random inputs.
The second is the dataset that exercises the system: a deterministic 50-student, 50-tutor seed corpus drawn from that profile (the realistic-seed scenario), together with the synthetic scenario families generated from the same distribution — moderate student:tutor ratios of 1.5:1 to 4:1, and a 10:1 stress sweep at four scales. Section 4.10.1 describes the generator and each family; Sections 4.10.2 to 4.10.5 report the analysis of the data collected at this stage.
### 4.1.1 Hardware and Software Stack
Table 4.1: Implementation technology stack (algorithm- and backend-relevant components)
A browser-based client was also built to exercise the system end-to-end, but its implementation is outside the algorithmic scope stated in the study title and is therefore not treated as a subject of analysis here; only the parts of the workflow needed to demonstrate the matchmaking process (Section 4.2) are described.
## 4.2 System Architecture
Figure 4.1 shows the use case diagram: the actors who interact with the system (student, tutor, and administrator) and the principal functions each performs, from onboarding and requesting a match through to assignment and post-session feedback. The rest of this section describes how those use cases are realised.

Figure 4.1: Use case diagram of the matchmaking system
### 4.2.1 Three-Tier Architecture
The system follows a three-tier architecture with strict separation of concerns:
Presentation Tier: Next.js React single-page application. Students, tutors, and administrators each have role-specific views including dashboards, tutor discovery, session management, and profile editing. Communication with the backend occurs exclusively through RESTful HTTP endpoints using Axios with automatic JWT token refresh.
Application Tier: NestJS server with modular decomposition into ten domain modules: auth, users, matchmaking, scheduling, sessions, messages, notifications, feed, dashboard, and a standalone core algorithm layer. The core module is framework-independent and contains all domain entities, value objects, scoring algorithms, and the assignment engine. The matchmaking module bridges the core algorithms with NestJS controllers and repository persistence.
Data Tier: PostgreSQL database with eight core tables. Drizzle ORM provides type-safe queries with compile-time validation. Migrations are auto-generated from schema definitions.
### 4.2.2 Core Algorithm Architecture (Domain Layer)
The core algorithm is isolated as a framework-independent domain layer under src/core/. This design ensures the algorithm logic has zero coupling to NestJS, Express, database, or HTTP concerns, making it independently testable and reusable. The architecture follows a clean architecture with dependency inversion at the repository boundary.
architecture pattern, illustrated in Figure 4.2 below.
Figure 4.2: Core UML package diagram
Each package is described briefly below
core/entities/ : holds the domain model — Student, Tutor, Assignment, and related value objects — along with their validation invariants.
core/algorithms/: contains all scoring, filtering, ranking, and assignment logic, including the scorers, filters, ranker, assignment engine, feedback updater, and supporting data structures (MaxHeap, vector math).
core/engine/: exposes the MatchingEngine facade, giving the application layer a single, unified entry point into the algorithms.
core/constants/: centralizes tunable algorithm parameters (e.g. COLD_START_QUALITY, FEEDBACK_LAMBDA, LEVEL_MAX), each traceable back to the design specification.
core/enums/: defines shared domain enumerations (AssignmentStatus, DeliveryMode, LearningStyle, etc.) used consistently across all layers.
core/interfaces/: defines the repository interfaces (IStudentRepository, ITutorRepository, IAssignmentRepository) that the outer layer implements — the mechanism behind the dependency inversion shown in Figure 4.3.
core/evaluation/: provides a standalone harness, including a synthetic data generator, for benchmarking and scalability measurement independent of the production database.
core/exceptions/: defines domain-specific exceptions (IncompleteProfileException, NoEligibleTutorsException) with explicit, descriptive messages.

Where Figure 4.2 groups the domain into packages, Figure 4.3 gives the class-level design of the core: the principal entities (Student, Tutor, Assignment), the four scorers, the eligibility filter, the greedy assignment engine, and the feedback updater, together with the repository interfaces through which the outer layer supplies data — the relationship that realises the dependency inversion described above.

Figure 4.3: Class diagram of the core domain
## 4.3 Database Design
### 4.3.1 Schema Design
The database schema follows a normalized design with eight core tables organized around the user entity. The schema is defined in src/database/schema.ts using Drizzle ORM's schema definition syntax. Figure 4.4 shows the entity-relationship diagram for the seven tables that participate in the matching workflow; an eighth (notifications) supports the surrounding application only and is omitted from this discussion.

Figure 4.4: CrowsFoot ERD
As shown in Figure 4.4, users sits at the center of the schema, with student_profiles and tutor_profiles each extending it in a one-to-one relationship — a table-per-role pattern that keeps authentication concerns (email, passwordHash, role, status) separate from role-specific matching data. schedule_slots links back to users to record weekly availability for both students and tutors. assignments is the central match record, referencing users twice — once as the student, once as the (nullable) tutor — and carries the full audit trail of a match, including its computed matchScore and scoreBreakdown. sessions and tutor_feedback both branch off assignments: a completed assignment can produce many scheduled sessions and, separately, feedback records that feed back into a tutor's exponential moving average rating.
## 4.4 Module Design
### 4.4.1 Backend Module Architecture
The NestJS backend comprises ten feature modules, each following the controller–service–repository pattern. Figure 4.5 shows the five modules that participate in the matchmaking workflow and their dependencies on one another and on the core domain layer; the remaining modules (messaging, notifications, dashboard analytics, and the social feed) provide standard platform functionality with no bearing on the algorithm and are not analysed further, consistent with the scope set in Section 1.5.
Figure 4.5: UML component diagram
As shown in Figure 4.5, each module exposes its functionality through a provided interface and depends only on the interfaces it needs, rather than on other modules' internal implementations. MatchmakingModule sits at the center of the workflow: it depends on UsersModule to fetch student and tutor profiles, on SchedulingModule to fetch availability slots, and on the core/ domain layer described in Section 4.2.2 to build domain entities and invoke the ranking algorithm. SessionsModule depends on SchedulingModule to check availability before confirming a booking, and UsersModule depends on AuthModule for the authenticated identity behind any profile request. This dependency structure keeps the algorithm-facing logic concentrated in MatchmakingModule and core/, while the remaining modules handle authentication, profile management, and scheduling as supporting services.
### 4.4.2 Consumption of the Matching Endpoint
The client communicates with the matching engine through a single read endpoint, `GET /matchmaking/candidates`. On request, the matchmaking service loads the requesting student’s profile, all active tutor profiles, and their schedule slots; constructs the corresponding domain entities described in Section 4.2.2; and passes them to the TopKRanker. The response returns the ranked candidates with each tutor’s match score, eligibility status, and score breakdown, which the client renders as a percentage with a per-criterion explanation (Section 4.10.6). This is the only interaction relevant to the matching algorithm; general client concerns (authentication, routing, state management) are standard web-engineering practice and are not analysed further, as they fall outside the scope defined in Section 1.5.
## 4.5 Algorithm Design and Complexity Analysis
### 4.5.1 Composite Scoring Model
The core of the matchmaking system is a composite scoring function that computes a compatibility score for each student-tutor pair. The scoring function follows the four-bucket architecture:
Equation 4.1: Top-Level Compatibility Score

Where alpha + beta + gamma + delta = 1, and each sub-score is bounded to [0,1].
Equation 4.2: Academic Score A

Where  for an exact subject-plus-specialization match, 0.7 for a subject match whose stated specializations do not align, and 0.5 for a subject match when specialization data is absent.  when the student’s target exam type (e.g. WAEC or NECO) is supported by the tutor or when either side leaves it unspecified, and 0.5 on an explicit mismatch, so an exam-type mismatch attenuates subject depth without disqualifying an otherwise capable tutor. where g is the gap between the student’s grade level and the nearest grade level the tutor supports, and .
Equation 4.3: Preference Score P

Style uses cosine similarity on one-hot encoded vectors representing delivery mode, format preference, and learning style. Budget returns 1 if the tutor's hourly rate is within the student's budget, with a linear decay for excesses. Region returns 1 for online sessions (where location is irrelevant) and for in-person matches in the same region, 0 for an in-person region mismatch, and a 0.5 neutral default when region data is missing.
Equation 4.4: Schedule Score S

Where Hs and Ht are the student's requested and tutor's available time slots. The score requires that each requested slot be covered by a single contiguous tutor slot; split fragments across multiple tutor slots do not satisfy the contiguous class requirement. Students with zero availability slots are rejected as incomplete profiles.


Equation 4.5: Fairness Score F(t)


The exponent 1.15 penalizes highly utilized tutors slightly more than linearly (Appendix B), and b(t) is a cold-start boost of 0.05 applied only when a tutor has zero assigned students, to nudge unused tutors into circulation. The load factor weight delta defaults to 0.05.
### 4.5.2 Priority-Queue Greedy Assignment Algorithm
The assignment algorithm uses a max-heap priority queue with lazy fairness recomputation. This corrects a known flaw in static sorting approaches where fairness scores become stale after assignments are made. Eligibility (Eligible in Algorithm 4.1) is a hard pre-filter: the tutor must teach one of the student’s subjects, support the student’s grade level and exam type where these are specified, and have spare capacity; ineligible pairs are never scored or pushed onto the heap.
Algorithm 4.1: Priority-Queue Greedy with Lazy Fairness Recompute
Input: Students list S, Tutors list T
Output: Assignments A, Unassignable list U
1. Initialize empty max-heap H
2. For each student s in S:




3. While H is not empty:





4. Students not assigned are marked unassignable with reason
Figure 4.6 traces the same assignment loop at full detail, showing the lazy fairness recomputation that re-pushes a stale pair with a fresh score; the simplified overview of the procedure was introduced earlier as Figure 3.1 in the methodology chapter. The numbered steps of Algorithm 4.1 map onto the boxes of the figure.

Figure 4.6: Detailed flowchart of the priority-queue greedy assignment
### 4.5.3 Time Complexity Analysis
Let S = number of students, T = number of tutors, E = number of eligible (student, tutor) pairs after filtering (E <= S x T), C = tutor capacity, k = the top-K truncation cap, and P = the cost of one CompositeScorer.score() call. P is dominated by subject-set intersection and slot-overlap checks; with realistic profile sizes (at most 5 subjects, at most 10 availability slots per profile) P is a small constant, which is why the engine’s asymptotics below are expressed in S and T alone.
This bound was independently verified against the running system: at five-fold increases in scale (200 to 1,000 to 5,000 students), the number of pairs actually scored grew 216 to 6,769 to 176,790 (a 31-fold and then a 26-fold increase at each step, close to the quadratic prediction), and mean elapsed time grew by roughly 17-fold and then 19-fold across the same steps \u2014 quadratic growth with a slowly growing log factor on top, consistent with the O(n^2 log n) claim (Section 4.10.4).
Two implementation-level optimizations reduce the constant factor on this bound without changing its asymptotic class:
Top-K truncation (topK: k) caps heap memory at O(S x k) instead of O(S x T), with a fallback pass of O(U x T x P) over any truncation-stranded students (U = the unassigned tail), so no student is silently dropped by the truncation itself.
Subject indexing (useSubjectIndex) replaces T with T_subject (the number of tutors teaching a given student’s subject) in the scoring phase, which only pays off when subject overlap is sparse relative to the full tutor pool.
Neither optimization changes the O(n^2) pair-scoring floor; only candidate pruning at the eligibility stage can do that.
A single-student call (assignIncremental) runs the same assignBatch routine with S = 1, giving O(T x P + T log T) for that one request. This is a convenience for matching one newly registered student against the current tutor pool without re-running the full batch – it is not a separate streaming algorithm, and it does not carry the same 1/2-approximation guarantee as a full batch run, since that guarantee depends on a global greedy choice across all students simultaneously.
### 4.5.4 Space Complexity Analysis
### 4.5.5 Empirical Validation Against the True Optimum
The greedy algorithm’s proven worst-case guarantee is at least 1/2 of the optimal total score, via the classical exchange argument for greedy weighted bipartite matching (Preis, 1999; Korte & Vygen, 2018). This bound holds regardless of the input data and does not depend on any experiment.
Separately, and more informative in practice, the implementation was checked against a true optimal baseline computed by a min-cost max-flow solver (optimal-baseline.ts), run only at small sizes (up to 100 students) because its own worst-case cost is approximately O(S^3 x T):
At the three smallest tested sizes the greedy algorithm assigned exactly as many students as the true optimum and matched 99.9–100.0% of the optimal total score; at the largest tested instance (100 students, 33 tutors) it assigned 59 of the 64 students the optimum could place and reached 94.3% of the optimal total score — in every case far exceeding its proven 1/2 worst-case bound. This is the empirical justification for using the greedy algorithm rather than paying the flow solver’s cubic cost at production scale: the measured gap to optimal is small at the tested scales, and the proven bound guarantees it can never fall below half of optimal even on adversarial inputs the evaluation harness did not happen to generate.
## 4.6 Key Edge Cases and Their Handling
Twelve edge cases were identified during design and implementation (their origins are traced in the corrections log, Appendix B). Each is handled explicitly with a documented strategy:
## 4.7 Implementation
The system was implemented using a pnpm monorepo structure with two packages: `backend/` (NestJS) and `frontend/` (Next.js). The core algorithm layer lives entirely within the backend package but is fully decoupled from framework concerns.
### 4.7.1 Core Algorithm Implementation
The core algorithm is implemented as a TypeScript domain layer under `backend/src/core/`. Key implementation details:

Scoring Service (Composite Scorer):
The Composite Scorer coordinates four independent sub-scorers. Each implements a single scoring method. The Academic Scorer handles three sub-criteria (subject depth, level compatibility, experience quality). The Preference Scorer uses cosine similarity on one-hot encoded style vectors. The Schedule Scorer computes availability overlap with contiguous slot requirement. The Fairness Scorer computes load ratio with a cold start boost.
Assignment Engine (Greedy Assignment Engine):
The engine implements the priority-queue greedy algorithm using a custom MaxHeap data structure. The priority function combines the static score (alpha * A + beta * P + gamma * S) with the dynamic fairness score (delta * F(t)). A deterministic tiebreak using FNV-1a hashing ensures reproducible output. Lazy fairness recomputation catches stale heap entries on pop.
Four representative excerpts (Section 4.7.2) illustrate these components directly; the full source code is available in the project repository referenced in Appendix A.
### 4.7.2 Key Code Snippets
Snippet 4.1: CompositeScorer.score()

Snippet 4.2: GreedyAssignmentEngine.assignBatch()
Snippet 4.3: FairnessScorer.score()

Snippet 4.4: FeedbackUpdater.updateQuality()

## 4.8 Module Implementation
### 4.8.1 Matchmaking Flow (End-to-End)
The end-to-end matchmaking flow executes as follows:
Figure 4.7 shows the same flow as a sequence diagram, tracing a single request from the student through the controller, service, core algorithm, and repository layers and back; the numbered steps below describe the same sequence in words.

Figure 4.7: Sequence diagram of the end-to-end matchmaking flow
- Student registers and onboard using `POST /auth/onboard`, supplying the subject, grade level, availability, budget, and preference weights.
- Student calls `GET /matchmaking/candidates` to find tutor candidates. The backend will read the student profile, all tutor profiles, and schedule slots.
- TopKRanker ranks all possible student-tutor pairs based on the CompositeScorer, giving the ranking of tutors and score per criteria.
- The front end will present the ranking of tutors and score percentages (0-100), eligibility, and tier badges for the top matches.
- Afterward, the student chooses one tutor by `POST /matchmaking/select` or by the admin calling `POST /matchmaking/batch`.
- Then, GreedyAssignmentEngine makes the assignment, increments the assignedCount, and saves the match with score per criteria.
- Finally, after the session, the student calls `POST /matchmaking/assignments/:id/feedback`, and the FeedbackUpdater will apply EMA to update the tutor's avgRating.
Figure 4.8 shows the same flow as an activity diagram, making the decision points explicit: profile completeness, the presence of eligible tutors, and seat availability during assignment.

Figure 4.8: Activity diagram of the end-to-end matchmaking flow
## 4.9 Testing Strategy
### 4.9.1 Unit Testing Approach
Unit tests target the core algorithm layer in isolation, using Jest 30, across two files: core-engine.spec.ts (23 integration-style tests against the assignment engine as a whole, including top-K truncation behaviour) and core-units.spec.ts (55 focused tests per class, added specifically to close the coverage gaps identified during evaluation). Both run independently of the NestJS application, consistent with the framework-independent design described in Section 4.2.2.
Table 4.2: Unit Test Coverage by Class (pnpm test:cov, 13 August 2026)


At the final full pnpm test:cov run (13 August 2026), all 78 core algorithm tests passed — 23 in core-engine.spec.ts and 55 in core-units.spec.ts — and the full backend suite, including the application-level health-check assertion in app.controller.spec.ts that had failed in an earlier captured run, passed 102 of 102. Table 4.2 transcribes the per-class coverage from that run.
### 4.9.2 Edge Case Verification
All twelve edge cases identified during design (Section 4.6) were directly confirmed via named tests in core-engine.spec.ts and core-units.spec.ts:
Table 4.3: Edge Case Verification
Beyond these named verifications, a randomized stress test (25 generated fixtures of 5 tutors and 20 students each) confirms that assigned counts remain within tutor capacity in every run, guarding the capacity invariant under arbitrary inputs rather than hand-picked cases.
### 4.9.3 Test Execution
The suite is run with pnpm run test:cov from the backend package. The figures in Tables 4.2 and 4.3 were transcribed from the final authoritative run of 13 August 2026, in which all 78 core algorithm tests, the 23 evaluation-TUI tests, and the application-level health check passed (102 of 102).
## 4.10 Results and Evaluation
### 4.10.1 Evaluation Harness
The datasets analysed in this section are not arbitrary: they instantiate the domain profile compiled during requirements gathering (Section 3.1) — the subjects, grade levels, WAEC and NECO examination types, weekly availability patterns, and tutor experience and capacity ranges of the Nigerian secondary-school setting the platform targets. Analysing the algorithm on data drawn from that profile, rather than on generic random inputs, lets the results below speak to the problem the requirements described.
An evaluation harness (core/evaluation/evaluation-harness.ts) generates synthetic student and tutor datasets of configurable size and student:tutor ratio, so that match quality, fairness, and scalability can be measured without requiring live production data — consistent with the limitation noted in Section 1.6. Three families of scenario were run: realistic-seed (mirrors the platform’s actual 50-student, 50-tutor Nigerian secondary-school seed data and capacity distribution), moderate-* (student:tutor ratios of 1.5:1 through 4:1, added specifically to probe the fairness mechanism in a regime with some but not unlimited slack), and stress-sweep (a deliberate 10:1 oversubscription stress test at four scales, used to validate the Big-O scaling behaviour in Section 4.10.4 and as the contention case in the baseline comparison of Section 4.10.5).
### 4.10.2 Match Quality and Fairness
Match quality and load fairness were measured using the average compatibility score, the percentage of students left unassigned, and Jain’s fairness index (Jain et al., 1984) over tutor loads:

where  is tutor i’s assigned load and n is the number of tutors. A value of 1 indicates perfectly even load distribution.
Table 4.4: Match Quality and Fairness by Scenario (loadFactorWeight = 0.05)
Table 4.4 reports the stress-sweep family only at its two largest scales. The two smallest stress runs (50 students with 5 tutors, and 200 students with 20 tutors) are included in the timing measurements of Table 4.6, but their quality and fairness statistics are dominated by the very small tutor pool (at the smallest scale, 78% of students go unassigned and the average score drops to 0.53) and are therefore omitted here rather than presented as comparable rows.
Two effects are visible in this table, and they should not be conflated. Unassigned% rises with ratio because it is governed almost entirely by aggregate tutor capacity relative to demand. The Jain index rises too, from 0.5620 at 1:1 to 0.8533 at 4:1, but for a different reason: with more students per tutor, more tutors end up carrying similar, higher loads. At 10:1 it settles at 0.8333, where final loads are fixed by capacity itself rather than by assignment order.
### 4.10.3 Effect of the Fairness Weight
The fairness weight’s effect was isolated by re-running every scenario above with the load factor weight (delta) at 0 as well as its designed value of 0.05:
Table 4.5: Effect of the Fairness Weight by Ratio
This is the central finding of the fairness evaluation: the mechanism has a measurable, positive effect on load distribution only within a specific regime. At 1.5:1, enabling the fairness weight improves Jain’s index from 0.5945 to 0.6335 (+0.039), and the average score is, if anything, slightly higher rather than lower, because spreading load onto emptier tutors captures the cold-start boost. At 2:1 and beyond in the current fixtures, Jain’s index is identical whether the weight is enabled or not: tutor capacity becomes the binding constraint, nearly every eligible tutor fills to its own fixed capacity regardless of assignment order, and no score-based reordering can change the final load distribution. The average-score column should be read with a caveat. Because the composite score itself includes the fairness term, average scores across the two weight settings are not directly comparable as quality measures. Within the moderate band the fairness-aware runs report slightly higher averages (0.6194 against 0.6106 at 1.5:1, 0.6208 against 0.6137 at 2:1, 0.6093 against 0.6046 at 3:1, and 0.6082 against 0.6042 at 4:1); at 10:1 the position reverses slightly (0.7124 against 0.7145). In a deployment that persistently operates under severe oversubscription, the load-factor weight is therefore largely inert; where it does act, it buys a measurably fairer load distribution at no clear quality penalty in the moderate band.
A focused unit test isolates the mechanism from this aggregate, capacity-driven effect directly: given two otherwise identical tutors, one nearly full (2/3 capacity) and one empty (0/3), a single student’s total match score favoured the empty tutor by 0.0359 when loadFactorWeight = 0.05, and the two tutors scored identically to six decimal places when loadFactorWeight = 0. This confirms the fairness term functions correctly at the level of an individual comparison; its aggregate effect in Table 4.5 is real but bounded by how much slack capacity actually exists in the system.
### 4.10.4 Performance Benchmarking
To validate the O(n2 log n) theoretical bound from Section 4.5.3, wall-clock execution time was measured on the stress-sweep scenario at four scales, each run 5 times:
Table 4.6: Execution Time by Scale (stress-sweep, loadFactorWeight = 0.05; five runs per scale, 13 August 2026)
Pairs scored grow 216 to 6,769 to 176,790 across the three size steps. A five-fold increase in scale raises the number of pairs by a factor of roughly 26 to 31, consistent with the O(n²) pair-scoring floor. Mean elapsed time grows from 6.2 ms at 200 students to 108.0 ms at 1,000 and 2,066.6 ms at 5,000, consistent with quadratic growth plus a slowly growing log factor, matching the O(n2 log n) bound derived in Section 4.5.3. The smallest scale’s timings (low single-digit milliseconds) are close to the resolution of the measurement and are dominated by JIT warm-up noise rather than algorithmic cost; they are reported for completeness but should not be read as precise.
### 4.10.5 Comparison with Baseline Assignment Strategies
RQ6 asks how the proposed algorithm compares with the matching methods tutoring platforms traditionally use. Three baselines were implemented alongside the harness (baseline-comparison.ts) and run on the same generated fixtures, the same eligibility filter, and the same composite scorer as the engine, so that any difference reflects the assignment strategy alone. The first baseline, filter-only first-come-first-served (FCFS), assigns each student in arrival order to the first eligible tutor with spare capacity and performs no scoring — mirroring the subject-and-availability filtering of deployed tutor-finding applications (Taveekarn et al., 2014). The second, self-selection FCFS, lets each student in arrival order take their own highest-scoring eligible tutor — mirroring a student browsing a ranked list and booking the top result: per-student optimal, but with no coordination across students.
The third, deferred acceptance (da-stable), is the student-proposing Gale-Shapley algorithm (Gale & Shapley, 1962; Roth, 2008) in its college-admissions form with tutor capacities: both sides rank by the same static composite score, and the outcome is a stable matching in which no student–tutor pair would both prefer each other over their final matches. Stability is a different objective from total score, so it is a genuine competing alternative rather than a tuning variant of the engine.
Table 4.7: Baseline Comparison by Scenario (identical fixtures and scorer per scenario; 13 August 2026)
The four strategies differ slightly in the percentage of students they leave unassigned: the filter-only baseline places every student onto the first eligible tutor and therefore leaves the fewest unassigned, while the score-based strategies hold out for the best remaining seat. The differences are small (at most 3.3 percentage points at 1.5:1) and bounded by aggregate tutor capacity in every scenario, so the comparison focuses on match quality and load distribution. Filter-only FCFS, the strategy closest to deployed practice, costs between 0.08 and 0.18 in average compatibility (a 13–26% relative reduction) at every ratio, and produces the most uneven load distribution whenever capacity is slack (Jain’s index 0.46 at 1:1 against 0.56 for the engine, and 0.52 at 1.5:1 against 0.63), because arrival order funnels students onto the first-listed tutors. This is the empirical case for scoring at all.
The self-selection baseline is the more revealing comparison. It tracks the engine closely wherever supply is abundant: at 1:1 the engine leads by 0.002 in average score, and at 1.5:1 by 0.007, because when every student can still obtain a near-best tutor, global coordination has little to add. Under contention the gap widens. The engine’s globally score-ordered assignment beats self-selection by 0.012 at 2:1, 0.023 at 3:1, and 0.130 at 10:1, because early arrivals under FCFS take tutors that later students needed more, while the batch engine gives each remaining seat to the pairing that values it most, regardless of arrival order. The deferred-acceptance baseline produces essentially the same average score as the engine at every ratio (within 0.001), as both optimise over the same static utilities; the engine’s advantage shows up in load distribution instead: Jain’s index is 0.5620 against 0.5236 at 1:1 and 0.6335 against 0.6057 at 1.5:1, because the greedy engine keeps recomputing fairness as tutors fill, whereas a stable matching fixes each pair once. The practical reading for RQ6 is that the algorithm’s advantage over simpler methods is concentrated exactly where a real platform hurts, when demand presses against tutor capacity; it offers no false promise of improvement when supply is abundant.
### 4.10.6 Explainability
The system’s per-match score breakdown provides one concrete artifact that does not require a benchmark run — every assignment returns a JSON structure decomposing the total score into its four components and their sub-components:
Sample Score Breakdown (structure)
The client renders this breakdown as a percentage alongside a per-criterion explanation, making the algorithm’s decision inspectable rather than a black box — directly addressing RQ7.
## 4.11 Discussion
The evaluation supports three separate, evidence-graded claims, and they should not be flattened into one.
Proven, not measured: the greedy algorithm’s 1/2-approximation guarantee (Section 4.5.5) is a mathematical property, established by the standard exchange argument (Preis, 1999; Korte & Vygen, 2018). It holds regardless of the input data and required no experiment to establish.
Measured and strong: against a true optimal baseline computed by an exact min-cost max-flow solver at small scales, the greedy algorithm matched 94.3-100% of the optimal total score (Section 4.5.5) — far exceeding its own proven worst-case bound. This is the empirical justification for using the fast greedy algorithm in production rather than an exact solver whose worst-case cost is cubic in system size. The same fixtures also situate the engine against the strategies platforms actually deploy: filter-only FCFS assignment loses 13–26% of average compatibility at every ratio, and uncoordinated score-based self-selection — indistinguishable from the engine when capacity is slack — falls behind by up to 0.130 once demand presses against capacity (Section 4.10.5).
Measured and regime-dependent: the fairness mechanism was shown to measurably improve load distribution (Jain’s index +0.039 at a 1.5:1 student:tutor ratio, with no measurable change at 2:1 or beyond in the current fixtures (Table 4.5) — the fairness-aware runs report slightly higher average scores in the moderate band, though the comparison is confounded by the fairness term being part of the composite — because tutor capacity becomes the binding constraint on load distribution, not the scoring function. This is not a flaw in the fairness scorer – a dedicated unit test confirms it functions exactly as designed at the level of an individual student-tutor comparison (Section 4.10.3) – it is a property of the regime being tested. The honest conclusion is that load-factor weighting is most valuable when the tutor pool has moderate slack; under severe oversubscription, no scoring mechanism can substitute for having enough tutor capacity in the first place. In that regime the load-factor weight is best disabled outright: it buys no redistribution and carries a small compatibility cost.
The priority-queue greedy assignment with lazy fairness recompute addresses a specific flaw in static-sorting approaches: a tutor’s fairness score changes as students are assigned to them during a batch run, so sorting once at the start uses stale information. Lazy recomputation corrects this while keeping the same asymptotic complexity class as a single sort (Section 4.5.3), rather than paying for a full re-sort after every assignment.
# CHAPTER FIVE
SUMMARY, CONCLUSION AND RECOMMENDATIONS
## 5.1 Summary of Findings
This project addressed the problem of matching students with suitable tutors in digital learning environments. The literature review confirmed that existing tutor-matching systems rely on limited filtering criteria and fail to integrate weighted compatibility, scheduling feasibility, fairness, and explainability in one coherent framework.
To address this gap, a multi-criteria student-tutor matchmaking system was designed, implemented, and evaluated. The system uses a composite scoring model with four sub-scorers (academic, preference, schedule, fairness), a priority-queue greedy assignment algorithm with lazy fairness recompute, and an EMA-based feedback update mechanism.
The system was implemented as a full-stack web application using NestJS 11 for the backend, with the core algorithm isolated in a framework-independent domain layer, and PostgreSQL with Drizzle ORM for data persistence. At the final full test run (13 August 2026), all 78 core algorithm unit tests passed across two Jest test files, with per-class statement coverage ranging from 82.14% to 100% (Section 4.9.1); all 12 identified edge cases were individually confirmed by named tests (Section 4.9.2).
The algorithm’s time complexity was analyzed as O(n^2 log n), with the n^2 term arising from exhaustive pair scoring and the log factor from the heap/sort machinery (Section 4.5.3). This bound was independently confirmed empirically: pairs scored grew by roughly the square of the scale factor at each five-fold increase, and mean execution time grew consistently with the predicted quadratic-times-log shape (Section 4.10.4). A 1/2-approximation guarantee was established through the standard exchange argument for greedy weighted bipartite matching (Preis, 1999; Korte & Vygen, 2018), and separately, an exact min-cost max-flow baseline computed at small scales showed the implemented algorithm achieving 94.3-100% of the true optimal score in practice — far exceeding its own proven worst-case bound (Section 4.5.5). Compared with baseline strategies on identical fixtures, the engine delivered 13–26% higher average compatibility than filter-only first-come-first-served assignment at every ratio, and outperformed uncoordinated score-based self-selection by up to 0.130 under capacity contention (Section 4.10.5).
An evaluation harness (Section 4.10) measured match quality, Jain’s fairness index, and execution time across three scenario families: a realistic scenario mirroring the platform’s actual 1:1 student:tutor seed data, a moderate-load band (1.5:1 to 4:1) added specifically to probe the fairness mechanism, and a 10:1 stress-sweep used to validate scaling behaviour. The fairness weight was found to measurably improve load distribution (Jain’s index +0.039 at a 1.5:1 ratio, Table 4.5), with no measurable change at 2:1 or beyond, where tutor capacity itself becomes the binding constraint on load distribution; the fairness-aware runs reported slightly higher average scores in the moderate band, so the weight is recommended mainly for moderate-load deployments (Section 4.10.3). A dedicated unit test confirmed the mechanism functions correctly at the level of an individual student-tutor comparison, independent of this capacity-driven aggregate effect.
## 5.2 Conclusions
The study concludes that student-tutor matching is best treated as a multi-criteria decision problem rather than a simple filtering task. The implemented system demonstrates that a composite scoring model with four sub-scorers, combined with priority-queue greedy assignment and load balancing, produces matches that are fast, close to optimal, explainable, and fair under realistic capacity conditions.
The research questions were addressed as follows:
RQ1: A multi-criteria weighted model with four sub-scorers (M(s,t) = alphaA + betaP + gammaS + deltaF) was designed and implemented, with all sub-scores bounded to [0,1] and confirmed by unit tests covering 96.3-100% of each scorer’s statements.
RQ2: Student preferences are dynamically incorporated through CriterionWeights, which auto-normalize to sum to 1 and map to the four-bucket AlgorithmWeights.
RQ3: Scheduling conflicts are resolved by the ScheduleScorer’s hard availability check before scoring, ensuring only feasible pairs are evaluated. Students with zero availability are rejected as incomplete profiles.
RQ4: Fairness and load balancing are achieved through the FairnessScorer F(t) = min(1, (1 - LoadRatio(t))^1.15 + b(t)), with a cold-start boost for unused tutors. The mechanism measurably improves Jain’s fairness index at a 1.5:1 student:tutor ratio (by 0.039, Table 4.5), with no measurable change once tutor capacity binds; at higher ratios in the moderate band it neither improves load distribution nor lowers match quality, and under severe oversubscription it carries a small compatibility cost, so the weight is best disabled there (Section 4.10.3).
RQ5: Historical performance is integrated through the EMA-based FeedbackUpdater with lambda = 0.3, creating a closed-loop improvement system. New tutors default to COLD_START_QUALITY = 0.5.
RQ6: The algorithm scales as O(n^2 log n), confirmed empirically: pairs scored grow by roughly the square of the system size. It carries a proven 1/2-approximation guarantee (Preis, 1999) and was measured at 94.3-100% of true optimal score against an exact baseline at small scales. Against traditional matching methods run on identical fixtures, it delivered 13–26% higher average compatibility than filter-only FCFS assignment at every ratio and outperformed score-based self-selection by up to 0.130 under capacity contention (Section 4.10.5).
RQ7: Explainability is provided through per-criteria score breakdowns at both the four-bucket level and the sub-criteria level, returned in every assignment result.
Of the six specific objectives in Section 1.3, the first five are addressed directly by the algorithmic design, analysis, and evaluation above (the scoring model, dynamic preference weighting, scheduling and conflict handling, the fairness mechanism, and the complexity and scalability evaluation respectively). Objective 6 — a full-stack web application demonstrating the end-to-end workflow — was delivered as the NestJS, Next.js, and PostgreSQL system described in Sections 4.2–4.4 and 4.8, but, consistent with the scope set in Sections 1.5 and 4.1.1, the client application itself was deliberately excluded from analytical evaluation, which concentrates on the algorithmic core named in the study title.
## 5.3 Recommendations
The system should be deployed with real tutor and student data from a tutorial centre or school platform to validate the simulated results against actual user behavior.
The default weights should be validated with domain experts and adjusted based on observed usage patterns and A/B testing.
The load-factor weight (delta) should be enabled only while the platform’s student:tutor ratio remains at or below roughly 2:1; the evaluation shows that above this ratio the weight no longer improves load distribution but still slightly reduces average compatibility (Section 4.10.3).
An administrator dashboard should be enhanced to monitor tutor load, failed matches, and overall match outcomes over time.
## 5.4 Contribution to Knowledge
This study makes the following contributions to knowledge:
A composite scoring architecture with four independently testable sub-scorers and a priority-queue greedy assignment engine with lazy fairness recompute, achieving O(n² log n) time complexity with a proven 1/2-approximation guarantee.
Empirical validation of the greedy algorithm against an exact min-cost max-flow baseline, showing 94.3-100% of optimal score achieved in practice — substantially tighter than the algorithm’s own proven worst-case bound, and an empirical basis for preferring the fast greedy approach over an exact solver at production scale — complemented by a comparison against the filter-based and self-selection strategies deployed platforms actually use (Section 4.10.5).
An evaluation methodology that identifies the specific student:tutor ratio regime (moderate load, roughly 1.5:1 in this system) in which a fairness weighting term measurably improves load distribution without lowering match quality, and shows that the same term stops changing the outcome once tutor capacity itself becomes the binding constraint — a distinction not typically made explicit in prior tutor-matching literature reviewed in Chapter Two.
An open-source implementation of the full-stack system with the core algorithm isolated as a framework-independent domain layer, following clean architecture principles with dependency inversion at the repository boundary.
## 5.5 Future Work
Later versions can implement the full min-cost max-flow formulation (a polynomial-time optimal solver) and benchmark the greedy approximation gap on real datasets.
Future work should add transactional integrity guarantees at the persistence layer to handle concurrent match requests without phantom-write conflicts during peak load.
The platform should include bias monitoring, cancellation handling, and stronger moderation of user ratings to prevent gaming of the feedback system.
Longitudinal studies could evaluate the impact of the matchmaking system on actual student learning outcomes over an academic term.
The algorithm could be extended to incorporate additional criteria such as personality compatibility, learning-pace matching, and real-time availability updates.
For scaling beyond 10,000 users, database-level pre-filtering (pushing hard constraint checks to SQL) and parallel processing strategies should be implemented.
# REFERENCES
Adomavicius, G., & Tuzhilin, A. (2005). Toward the next generation of recommender systems: A survey of the state-of-the-art and possible extensions. IEEE Transactions on Knowledge and Data Engineering, 17(6), 734–749. https://doi.org/10.1109/TKDE.2005.99
Burke, R. (2002). Hybrid recommender systems: Survey and experiments. User Modeling and User-Adapted Interaction, 12(4), 331–370. https://doi.org/10.1023/A:1021240730564
Coppolillo, E., Mungari, S., Ritacco, E., Fabbri, F., Minici, M., Bonchi, F., & Manco, G. (2024). Algorithmic drift: A simulation framework to study the effects of recommender systems on user preferences. arXiv preprint arXiv:2409.16478. https://arxiv.org/abs/2409.16478
da Silva, F. L., Slodkowski, B. K., da Silva, K. K. A., & Cazella, S. C. (2023). A systematic literature review on educational recommender systems for teaching and learning. Education and Information Technologies, 28(3), 3289–3328. https://doi.org/10.1007/s10639-022-11341-9
Deschenes, M. (2020). Recommender systems to support learners' agency in a learning context: A systematic review. International Journal of Educational Technology in Higher Education, 17, Article 50. https://doi.org/10.1186/s41239-020-00219-w
Gale, D., & Shapley, L. S. (1962). College admissions and the stability of marriage. The American Mathematical Monthly, 69(1), 9–15. https://doi.org/10.1080/00029890.1962.11989827
Grand View Research. (2025). Online tutoring services market size & share report, 2024–2030. https://www.grandviewresearch.com/industry-analysis/online-tutoring-services-market
Hevner, A. R., March, S. T., Park, J., & Ram, S. (2004). Design science in information systems research. MIS Quarterly, 28(1), 75–105. https://doi.org/10.2307/25148625
Hien, N. T. T., Quynh, P. H., & Minh, V. Q. (2025). A comparative analysis of multi-criteria decision-making methods. Engineering, Technology and Applied Science Research, 15(5), 26369–26375. https://doi.org/10.48084/etasr.12782
Jain, R., Chiu, D., & Hawe, W. (1984). A quantitative measure of fairness and discrimination for resource allocation in shared computer systems (DEC Research Report TR-301). Digital Equipment Corporation. https://arxiv.org/abs/cs/9809099
Karaci, A. (2019). Intelligent tutoring system model based on fuzzy logic and constraint-based student model. Neural Computing and Applications, 31(8), 3619–3628. https://doi.org/10.1007/s00521-017-3311-2
Kester, L., van Rosmalen, P., Sloep, P., Brouns, F., Kone, M., & Koper, R. (2007). Matchmaking in learning networks: Bringing learners together for knowledge sharing. Interactive Learning Environments, 15(2), 117–126. https://doi.org/10.1080/10494820701332663
Konstan, J. A., & Riedl, J. (2012). Recommender systems: From algorithms to user experience. User Modeling and User-Adapted Interaction, 22(1–2), 101–123. https://doi.org/10.1007/s11257-011-9112-x
Korte, B., & Vygen, J. (2018). Combinatorial Optimization: Theory and Algorithms (6th ed.). Springer. https://doi.org/10.1007/978-3-662-56039-6
Lechuga, C. G., & Doroudi, S. (2023). Three algorithms for grouping students: A bridge between personalized tutoring system data and classroom pedagogy. International Journal of Artificial Intelligence in Education, 33(4), 843–884. https://doi.org/10.1007/s40593-022-00309-y
Leung, J. Y. T. (2004). Handbook of Scheduling: Algorithms, Models, and Performance Analysis. Chapman and Hall/CRC. https://doi.org/10.1201/9780203489802
Lotfian, E., & Kabgani, A. (2026). HiMARS: Hybrid multi-objective algorithms for recommender systems. arXiv preprint arXiv:2604.07572. https://arxiv.org/abs/2604.07572
Nuseibeh, B., & Easterbrook, S. (2000). Requirements engineering: A roadmap. In Proceedings of the Conference on the Future of Software Engineering (pp. 35–46). ACM. https://doi.org/10.1145/336512.336523
Peffers, K., Tuunanen, T., Rothenberger, M. A., & Chatterjee, S. (2007). A design science research methodology for information systems research. Journal of Management Information Systems, 24(3), 45–77. https://doi.org/10.2753/MIS0742-1222240302
Pinedo, M. L. (2022). Scheduling: Theory, Algorithms, and Systems (6th ed.). Springer. https://doi.org/10.1007/978-3-031-05921-6
Pitoura, E., Stefanidis, K., & Koutrika, G. (2022). Fairness in rankings and recommendations: An overview. The VLDB Journal, 31(3), 431–458. https://doi.org/10.1007/s00778-021-00697-y
Preis, R. (1999). Linear time 1/2-approximation algorithm for maximum weighted matching in general graphs. In C. Meinel & S. Tison (Eds.), STACS 99 (Lecture Notes in Computer Science, Vol. 1563, pp. 259–269). Springer. https://doi.org/10.1007/3-540-49116-3_24
Ramesh, V. (2020). Developing an accurate method and algorithm to identify and match tutors with their respective students, according to intellectual level and teaching style. 2020 Intern Reports, 20. Illinois Mathematics and Science Academy. https://digitalcommons.imsa.edu/intern_reports_2020/20/
Ricci, F., Rokach, L., & Shapira, B. (Eds.). (2022). Recommender Systems Handbook (3rd ed.). Springer. https://doi.org/10.1007/978-1-0716-2197-4
Roth, A. E. (2008). Deferred acceptance algorithms: History, theory, practice, and open questions. International Journal of Game Theory, 36(3–4), 537–569. https://doi.org/10.1007/s00182-008-0117-6
Sommerville, I. (2016). Software Engineering (10th ed.). Pearson. https://www.pearson.com/en-us/subject-catalog/p/software-engineering/P200000003258/9780137503148
Spivakovsky, A., Poltoratskyi, M., Lemeshchuk, O., Denysenko, V., Karpov, I., & Revenko, Y. (2025). Algorithms for using online tutoring as a tool for personalization of learning. In ICT in Education, Research, and Industrial Applications (CCIS 2359, pp. 178–193). Springer. https://doi.org/10.1007/978-3-031-81372-6
Tarus, J. K., Niu, Z., & Mustafa, G. (2018). Knowledge-based recommendation: A review of ontology-based recommender systems for e-learning. Artificial Intelligence Review, 50(1), 21–48. https://doi.org/10.1007/s10462-017-9539-5
Taveekarn, W., Latthitham, R., Kittichareonjit, N., & Visoottiviseth, V. (2014). FindMyTutor: An Android application for matching students and private tutors. In Proceedings of the 2014 3rd ICT International Senior Project Conference (pp. 5–8). IEEE. https://murex.mahidol.ac.th/en/publications/findmytutor-an-android-application-for-matching-students-and-priv/
Vanguard. (2024, August 12). WAEC releases 2024 WASSCE results. Vanguard Nigeria. https://www.vanguardngr.com/2024/08/breaking-waec-releases-2024-wassce-results/
Wang, Z., Nabavi, S. R., & Rangaiah, G. P. (2023). Selected multi-criteria decision-making methods and their applications to product and system design. In A. J. Kulkarni (Ed.), Optimization Methods for Product and System Design (pp. 107–138). Springer. https://doi.org/10.1007/978-981-99-1521-7_7
Zhang, Y., & Chen, X. (2020). Explainable recommendation: A survey and new perspectives. Foundations and Trends in Information Retrieval, 14(1), 1–101. https://doi.org/10.1561/1500000066
# APPENDIX
## Appendix A: Source Code
The full source code for the backend, the core algorithm layer, and the client application exceeds the length appropriate for inclusion in this document and is therefore maintained in the project’s version-controlled repository rather than reproduced here in full. The repository contains:
backend/src/core/ — the framework-independent domain layer described in Section 4.2.2 (AcademicScorer, PreferenceScorer, ScheduleScorer, FairnessScorer, CompositeScorer, GreedyAssignmentEngine, MaxHeap, FeedbackUpdater, EligibilityFilter).
backend/src/modules/ — the NestJS application layer (controllers, services, guards, DTOs) that exposes the domain layer over HTTP.
backend/drizzle/ — database schema and migration files corresponding to Section 4.3.1.
core/evaluation/ — the evaluation harness described in Section 4.10.
backend/test/ — the Jest test suite described in Section 4.9.
https://github.com/sammythadev/student-tutor-platform
The four representative excerpts in Section 4.7.2 (CompositeScorer, GreedyAssignmentEngine, FairnessScorer, FeedbackUpdater) illustrate the core logic referenced throughout Chapter Four and are reproduced there rather than here, to keep them next to their explanation.
## Appendix B: Corrections Log — Seminar Proposal to Implemented System
The following section documents the specific changes and improvements made from the original seminar proposal (February 2026) to the final implemented system. These changes were guided by the Algorithm.md specification and its corrections log (section 10), which systematically addressed issues found during implementation.
Table B.1: Changes from the Seminar Proposal to the Implemented System
These 18 changes represent the evolution from a theoretical seminar proposal to a production-ready implementation. Each change was motivated by either a correctness issue discovered during implementation (e.g., unbounded formulas, missing edge cases), a performance consideration (e.g., heap-based ranking), or an architectural decision (e.g., core domain isolation). The Algorithm.md specification served as the authoritative reference throughout this process, with its corrections log providing full traceability for every modification.
## Appendix C: Provenance of the Test Suite and Evaluation Figures
The test and evaluation figures in Section 4.9 and Section 4.10 were produced in two steps, recorded here for transparency. First, the following prompt was used with an AI coding assistant, given access to the actual repository, to generate the real Jest test suite and the real evaluation harness, so that the figures reported would reflect tests that were actually written and actually executed rather than invented numbers.
I need a real Jest test suite for the core matchmaking algorithm in backend/src/core/, to report honest results in an academic project report — do not fabricate pass/fail numbers or invent test counts; only describe tests that actually exist and actually pass when run.
Write unit tests for: AcademicScorer, PreferenceScorer, ScheduleScorer, FairnessScorer, CompositeScorer, GreedyAssignmentEngine, and FeedbackUpdater. For each, assert exact expected output values for known fixed inputs (not just “does not throw”), derived from the actual formulas in the code (e.g. verify the composite score equals alpha*A + beta*P + gamma*S + delta*F for a specific student/tutor pair I give you).
Also write one dedicated test per edge case: zero eligible tutors after filtering, tutor at zero/full capacity, preference weights not summing to 1, student with zero availability slots, tied match scores, oversubscription, new tutor with null rating, tutor filled mid-batch, incremental request at capacity, and assignment cancellation — each asserting the specific documented behavior, not just “no crash.”
After writing the tests, run pnpm test --coverage and give me back the actual terminal output (test counts, pass/fail, coverage %) verbatim, so I can transcribe the real numbers into Table 4.2 and Table 4.3 — do not summarize or round them.
Separately, extend core/evaluation/ to run the greedy engine at (50,5), (200,20), (1000,100), and (5000,500) student/tutor scales, recording: average compatibility score, % unassigned, Jain’s fairness index, and wall-clock time. Run it once with the fairness weight (delta) at its designed value and once at delta = 0, and give me the raw numbers for both runs.
Second, the generated suite and harness were executed against the repository and their output transcribed into Tables 4.2 through 4.7. The final authoritative run was performed on 13 August 2026: pnpm test:cov (78 of 78 core tests passing; per-class coverage in Table 4.2), the evaluation harness scenarios including the three-strategy baseline comparison (Tables 4.4, 4.5, and 4.7), and the optimal-baseline comparison (Section 4.5.5). The harness contains no un-seeded randomness, so the match-quality and fairness figures in Tables 4.4, 4.5, and 4.7 are exactly reproducible from the repository; the wall-clock timings in Table 4.6 vary with hardware and were therefore excluded from the reproducibility claim.
Project Coordinator

| No. | Research Question |
| --- | --- |
| RQ1 | How can a multi-criteria weighted model be designed for student–tutor matching? |
| RQ2 | How can student preferences be dynamically incorporated into the matching process? |
| RQ3 | How can scheduling constraints and availability conflicts be resolved efficiently? |
| RQ4 | How can fairness and tutor load balancing be implemented in the system? |
| RQ5 | How can historical performance metrics improve match quality? |
| RQ6 | How scalable is the proposed algorithm compared to traditional matching methods? |
| RQ7 | How can explainability be integrated into the matchmaking process? |
| Term | Definition |
| --- | --- |
| Student-Tutor Matchmaking System | An algorithmic system that assigns tutors to students based on multiple criteria. |
| Multi-Criteria Decision-Making (MCDM) | A method of evaluating options using multiple weighted factors. |
| Priority-Queue Greedy Assignment | An algorithm that processes the highest-scoring student-tutor pair first using a max-heap, with lazy fairness recomputation to catch stale scores. |
| Dynamic Weighting | Adjusting the importance of criteria based on user preferences. |
| Compatibility Score | A numerical value representing the suitability of a tutor for a student. |
| Hard Constraints | Conditions that must be strictly satisfied (e.g., subject match, grade-level and exam-type support, capacity check). |
| Soft Constraints | Flexible conditions that influence ranking but are not mandatory. |
| Load Balancing | Distribution of students among tutors to avoid overloading. |
| Fairness Score | A load-based score that decreases as a tutor approaches capacity, implemented as min(1, (1 - LoadRatio(t))^1.15 + cold-start boost) (Section 4.5.1). |
| EMA (Exponential Moving Average) | A weighted average that gives more importance to recent feedback, used for tutor rating updates. |
| Cold Start | The problem of scoring new tutors with no historical feedback; handled by a neutral default quality of 0.5. |
| Big-O Notation | A mathematical notation describing the upper bound of an algorithm's time or space complexity. |
| Study | Focus | Strength | Limitation |
| --- | --- | --- | --- |
| Kester et al. (2007) | Learner matchmaking for knowledge sharing | Combines competence, eligibility, and availability | Focuses on learner communities, not tutor allocation |
| Taveekarn et al. (2014) | Mobile tutor-finding application | Implements direct student-tutor matching | Limited criteria, no fairness or adaptive scoring |
| Ramesh (2020) | Tutor matching by learning and teaching style | Includes style and level in tutor selection | Narrow scope, no scheduling optimization |
| Lechuga & Doroudi (2023) | Algorithmic grouping from tutoring data | Uses richer student data for grouping | Addresses peer support, not live tutor assignment |
| Spivakovsky et al. (2025) | Online tutoring for learning personalization | Confirms individualized support logic | No compact weighted scoring framework |
| Lotfian & Kabgani (2026) | Multi-objective recommender optimization | Balances multiple objectives simultaneously | Not designed for educational scheduling |
| ID | Requirement | Type | Source |
| --- | --- | --- | --- |
| FR1 | Exclude tutors who do not teach the student’s subject, or support the grade level or exam type, before scoring | Functional | Ch. 2 gap; existing systems |
| FR2 | Score each eligible pair on academic, preference, schedule, and fairness criteria | Functional | Ch. 2 gap |
| FR3 | Apply each student’s own preference weights to the criteria | Functional | Seminar proposal |
| FR4 | Treat schedule overlap as a hard feasibility constraint | Functional | Existing systems |
| FR5 | Balance tutor load so that no tutor is saturated while others are idle | Functional | Ch. 2 gap |
| FR6 | Update a tutor’s rating from post-session feedback | Functional | Seminar proposal |
| FR7 | Return an explanation (per-criterion breakdown) for every match | Functional | Ch. 2 gap |
| NFR1 | Bound every sub-score to [0,1] so the composite is testable | Non-functional | Study aim |
| NFR2 | Provide a stated, checkable time-complexity bound | Non-functional | Study aim |
| NFR3 | Make evaluation reproducible from a fixed seed | Non-functional | Study aim |
| NFR4 | Isolate the algorithm from the web framework for independent testing | Non-functional | Study aim |
| NFR5 | Authenticate users and separate roles (student, tutor, admin) | Non-functional | Existing systems |
| Criterion (student-facing) | Weight | Composite bucket |
| --- | --- | --- |
| Subject fit | 0.30 | Academic (α) |
| Experience | 0.15 | Academic (α) |
| Feedback / rating | 0.10 | Academic (α) |
| Language / style fit | 0.15 | Preference (β) |
| Availability | 0.25 | Schedule (γ) |
| Load factor | 0.05 | Fairness (δ) |
| Aggregated | α = 0.55, β = 0.15, γ = 0.25, δ = 0.05 | Sum = 1.00 |
| Layer | Technology | Version | Purpose |
| --- | --- | --- | --- |
| Backend framework | NestJS | 11.x | Modular Node.js framework with decorator-based routing, dependency injection, and guards |
| Language | TypeScript | 5.7 | Strict-mode typed superset of JavaScript used for the backend and the core algorithm layer |
| ORM | Drizzle ORM | 0.45 | Type-safe SQL-first ORM with schema generation and migrations |
| Database | PostgreSQL | 14+ | ACID-compliant relational database |
| Authentication | Passport + JWT | — | Stateless authentication with access and refresh tokens |
| Testing | Jest | 30.x | Unit and integration testing for the core algorithm layer |
| Deployment | Render | — | Cloud platform-as-a-service with auto-deploy from GitHub |
| Table | Key Columns | Purpose |
| --- | --- | --- |
| users | id (uuid), email, passwordHash, role, status, firstName, lastName, region | Authentication and base identity |
| Student profiles | userId (FK), subjects[], requiredSubject, gradeLevel, examType, budget, languages[], deliveryPreference, formatPreference, learningStylePreference, region, preferenceWeights (JSON) | Student-specific profile and matching preferences |
| Tutor profiles | userId (FK), subjectsTaught[], gradeLevelsSupported[], examTypesSupported[], experienceYears, languages[], teachingStyle, deliveryStyle, formatStyle, avgRating (0-1 EMA), ratingCount, capacity, assignedCount, hourlyRate, specializations[], region | Tutor qualifications, availability, and load tracking |
| Schedule slots | id, userId (FK), startAt, endAt, status, dayOfWeek | Weekly availability schedules for students and tutors |
| assignments | id, studentId (FK), tutorId (FK, nullable), matchScore, scoreBreakdown (JSON), status, reason, assignedAt, completedAt, cancelledAt | Match records with full audit trail |
| sessions | id, assignmentId (FK), subject, startAt, endAt, status, meetingUrl, notes | Scheduled tutoring sessions |
| Tutor feedback | id, assignmentId (FK), tutorId (FK), studentId (FK), rating (1-5), comment | Per-session feedback for EMA rating updates |
| Module | Controller Endpoints | Responsibilities |
| --- | --- | --- |
| Auth Module | /auth/signup, /auth/login, /auth/onboard, /auth/verify, /auth/logout, /auth/refresh | Registration, JWT issuance, role-based onboarding, token refresh |
| Users Module | /users/:id, /users/me, /users/me/student-preferences, /users/me/tutor-preferences | Profile CRUD and preference management |
| Matchmaking Module | /matchmaking/candidates, /matchmaking/candidates/students, /matchmaking/select, /matchmaking/batch, /matchmaking/assignments/me, /matchmaking/assignments/:id/status, /matchmaking/assignments/:id/feedback | Scoring, ranking, assignment, feedback ingestion (bridges to core algorithms) |
| Scheduling Module | /schedules/tutors/:tutorId/slots, /schedules/tutors/:tutorId/sessions | Availability management and time slot queries |
| Sessions Module | /sessions, /sessions/me, /sessions/:id/accept, /sessions/:id/decline, /sessions/:id/propose | Session booking, lifecycle, and time proposal |
| Component | Complexity | Notes |
| --- | --- | --- |
| Scoring phase (eligibility + score) | O(S x T x P) | Every (student, tutor) pair is checked and scored once; this is the empirically dominant term |
| Per-student truncation sort | O(S x T log T) | Sorts each student’s candidate tutors before applying the top-K cap |
| Heap phase | O(E x C x log E) | E pushes and pops at O(log E) each; the lazy fairness recompute re-pushes a pair at most once per assignment made to its tutor (bounded by tutor capacity C, not by a “criteria count”) |
| Total (batch) | O(n^2 log n) | For S proportional to T proportional to n, with bounded profile sizes and bounded tutor capacity; the n^2 term comes from exhaustive pair scoring, the log factor from the sort/heap machinery |
| Top-K ranking (per student, TopKRanker) | O(T x P + T log T) | Full sort then slice; adequate at current platform scale |
| Feedback update | O(1) | Single EMA computation per feedback submission |
| Weight adaptation | O(1) | Fixed 4 keys, proportional renormalization |
| Data Structure | Space | Notes |
| --- | --- | --- |
| Max-heap (batch mode) | O(S x T) or O(S x k) | Full mode holds one entry per eligible pair; top-K mode caps this at O(S x k) |
| Assigned student set | O(S) | Tracks which students have been assigned |
| Tutor capacity map | O(T) | In-place mutation of tutor objects |
| Score breakdowns | O(S) | Per-assignment score breakdown for explainability |
| Single-student request (assignIncremental) | O(T) | Holds only that one student’s candidate set in memory, not the full S x T structure |
| Size | Greedy Assigned | Optimal Assigned | Score Ratio |
| --- | --- | --- | --- |
| 10 | 2 | 2 | 1.0000 |
| 25 | 10 | 10 | 0.9992 |
| 50 | 25 | 25 | 0.9998 |
| 100 | 59 | 64 | 0.9435 |
| Approach | Time Complexity | Optimality | Trade-off |
| --- | --- | --- | --- |
| Greedy (this study) | O(n^2 log n) | Proven >= 1/2; measured 94.3-100% of optimal at tested scales | Fast, simple, explainable; used in production |
| Min-cost max-flow (evaluation only) | O(S^3 x T) | Global optimum (exact) | Used only as an offline evaluation baseline, not in the production path |
| Hungarian Algorithm | O(n^3) | Global optimum | Impractical for large n; batch-only |
| Genetic Algorithm | O(n x g x p) | Approximate global | Non-deterministic; conflicts with explainability |
| Edge Case | Handling Strategy |
| --- | --- |
| Zero eligible tutors after hard filter | Returns explicit NoEligibleTutorsException with student ID and subject; student gets waitlisted assignment with reason |
| Tutor at full capacity (assignedCount = capacity) | EligibilityFilter.hasCapacity() returns false; tutor is excluded upfront and cannot be selected |
| Tutor with capacity set to zero | Caught by the same capacity gate; the tutor is removed before scoring and can never be selected |
| Student preference weights don't sum to 1 | Auto-normalization: divides each weight by the sum of all weights (preserves relative priorities) |
| Student submitted zero availability slots | IncompleteProfileException thrown; student excluded from matching until availability is set |
| Availability request split across non-contiguous tutor slots | ScheduleScorer grants credit only when a requested slot is covered by a single contiguous tutor slot; fragmented coverage earns partial credit, never full |
| Tie in MatchScore between two or more tutors | Tiebreaker: lower assignedCount first, then lower tutor id, then a deterministic FNV-1a hash for reproducible output |
| New tutor with avgRating = null | Cold start default of 0.5 applied; prevents permanent burying of new tutors |
| Tutor slot filled mid-batch | Capacity is rechecked when a pair is popped from the heap; stale entries are skipped or re-pushed with a fresh key (lazy fairness recompute) |
| Incremental request arrives for tutor at capacity | Student is waitlisted rather than receiving an error or being silently dropped |
| Assignment is cancelled | Tutor's assignedCount is decremented; waitlist is rechecked for potential promotion of a waitlisted student |
| Oversubscription (demand exceeds aggregate capacity) | Students beyond aggregate capacity are returned as unassignable, each with an explicit reason |
| score(student, tutor) {
    const weights = AlgorithmWeights.from(
        CriterionWeights.from(student.preferenceWeights)
    );
 
    const academic = this.academicScorer.score(student, tutor, weights);
    const preference = this.preferenceScorer.score(student, tutor, weights);
    const schedule = this.scheduleScorer.score(student, tutor);
    const fairness = this.fairnessScorer.score(tutor);
 
    const total =
        weights.alpha * academic.total +
        weights.beta * preference.total +
        weights.gamma * schedule +
        weights.delta * fairness;
 
    return new MatchScore(total, breakdown, subBreakdown);
} |
| --- |
| assignBatch(students, tutors) {
    const heap = new MaxHeap();
 
    for (const student of students) {
        for (const tutor of tutors) {
            if (!this.eligibilityFilter.isEligible(student, tutor)) continue;
 
            const score = this.compositeScorer.staticScore(student, tutor);
            heap.push({ student, tutor, score }, this.priority(score, tutor));
        }
    }
 
    while (heap.size > 0) {
        const item = heap.pop();
 
        if (this.canAssign(item.student, item.tutor)) {
            assignments.push(item);
            item.tutor.assignedCount++;
        }
    }
 
    return { assignments, unassignable };
} |
| --- |
| score(tutor) {
    if (tutor.assignedCount >= tutor.capacity) {
        return 0;
    }
 
    const ratio = 1 - tutor.assignedCount / tutor.capacity;
    const boost = tutor.assignedCount === 0 ? 0.05 : 0;
 
    return Math.min(1, Math.pow(ratio, 1.15) + boost);
} |
| --- |
| updateQuality(currentQuality, rating) {
    const oldQuality = currentQuality ?? COLD_START_QUALITY;
    const feedback = rating / MAX_RATING;
 
    return (
        (1 - FEEDBACK_LAMBDA) * oldQuality +
        FEEDBACK_LAMBDA * feedback
    );
} |
| --- |
| Class | Statement Coverage | Branch Coverage | Key Coverage |
| --- | --- | --- | --- |
| CompositeScorer | 100.00% | 100.00% | Weight normalization, score range |
| FairnessScorer | 100.00% | 100.00% | Load ratio, cold-start boost, capacity |
| MaxHeap | 100.00% | 100.00% | Push/pop ordering, tie-breaking |
| VectorMath | 100.00% | 87.50% | Cosine similarity edge cases |
| GreedyAssignmentEngine | 83.05% | 76.92% | Batch, incremental, lazy recompute, top-K truncation |
| PreferenceScorer | 96.55% | 81.81% | Style similarity, budget, region |
| ScheduleScorer | 100.00% | 100.00% | Slot overlap, contiguous requirement |
| AcademicScorer | 96.29% | 88.88% | Subject depth, exam-type fit, level clamping, cold start |
| FeedbackUpdater | 85.71% | 85.71% | EMA update, cold start |
| EligibilityFilter | 82.14% | 83.33% | Subject, grade-level and exam-type gating, capacity |
| WeightAdaptation | 100.00% | 50.00% | Proportional renormalization after a weight bump |
| AssignmentLifecycle | 85.71% | 77.77% | Waitlist release on completion or cancellation |
| Edge Case | Test Result | Verification |
| --- | --- | --- |
| Zero eligible tutors after filter | PASS | Filtered into an explicit waitlist result with reason |
| Tutor at full capacity (assignedCount = capacity) | PASS | EligibilityFilter excludes the tutor; verified by named capacity tests |
| Tutor with capacity set to zero | PASS | Zero-capacity tutors are filtered into explicit waitlist results; FairnessScorer returns 0 |
| Preference weights don’t sum to 1 | PASS | CriterionWeights.from() normalizes before scoring |
| Student with zero availability slots | PASS | Rejected as an incomplete profile before scoring |
| Availability request split across non-contiguous tutor slots | PASS | Split tutor slots are not treated as full coverage for one contiguous request |
| Tie in match score between tutors | PASS | Deterministic hash-based tie-break |
| New tutor with null average rating | PASS | Cold-start quality default applied without error |
| Tutor slot filled mid-batch | PASS | Capacity rechecked during the same batch |
| Incremental request at full capacity | PASS | Waitlisted rather than erroring |
| Assignment cancelled | PASS | Cancellation frees capacity and promotes a waitlisted student |
| Oversubscription (demand exceeds aggregate capacity) | PASS | Excess students are returned as unassignable, each with an explicit reason |
| Scenario | Ratio | Students | Tutors | Avg Compatibility Score | Unassigned % | Jain Fairness Index |
| --- | --- | --- | --- | --- | --- | --- |
| realistic-seed | 1:1 | 50 | 50 | 0.6032 | 4.00% | 0.5620 |
| moderate-1.5to1 | 1.5:1 | 150 | 100 | 0.6194 | 7.33% | 0.6335 |
| moderate-2to1 | 2:1 | 150 | 75 | 0.6208 | 12.67% | 0.6997 |
| moderate-3to1 | 3:1 | 150 | 50 | 0.6093 | 22.00% | 0.8322 |
| moderate-4to1 | 4:1 | 200 | 50 | 0.6082 | 36.00% | 0.8533 |
| stress-sweep | 10:1 | 1,000 | 100 | 0.7124 | 75.00% | 0.8333 |
| stress-sweep | 10:1 | 5,000 | 500 | 0.7806 | 75.00% | 0.8333 |
| Ratio | Jain Index (delta=0.05) | Jain Index (delta=0) | Difference | Avg Score (delta=0.05) | Avg Score (delta=0) |
| --- | --- | --- | --- | --- | --- |
| 1.5:1 | 0.6335 | 0.5945 | +0.0390 | 0.6194 | 0.6106 |
| 2:1 | 0.6997 | 0.6997 | +0.0000 | 0.6208 | 0.6137 |
| 3:1 | 0.8322 | 0.8322 | +0.0000 | 0.6093 | 0.6046 |
| 4:1 | 0.8533 | 0.8533 | +0.0000 | 0.6082 | 0.6042 |
| 10:1 (n=1,000) | 0.8333 | 0.8333 | +0.0000 | 0.7124 | 0.7145 |
| Students (S) | Tutors (T) | Pairs Scored | Elapsed Min (ms) | Elapsed Mean (ms) | Elapsed Max (ms) |
| --- | --- | --- | --- | --- | --- |
| 50 | 5 | 14 | 2 | 2.8 | 3 |
| 200 | 20 | 216 | 4 | 6.2 | 11 |
| 1,000 | 100 | 6,769 | 72 | 108.0 | 140 |
| 5,000 | 500 | 176,790 | 1,996 | 2,066.6 | 2,160 |
| Scenario | Avg (filter FCFS) | Avg (self-select) | Avg (deferred acceptance) | Avg (this engine) | Jain (filter FCFS) | Jain (self-select) | Jain (deferred acceptance) | Jain (this engine) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| realistic-seed (1:1) | 0.5234 | 0.6011 | 0.6027 | 0.6032 | 0.4573 | 0.5396 | 0.5236 | 0.5620 |
| moderate-1.5to1 | 0.5270 | 0.6120 | 0.6186 | 0.6194 | 0.5158 | 0.6447 | 0.6057 | 0.6335 |
| moderate-2to1 | 0.5148 | 0.6091 | 0.6200 | 0.6208 | 0.5808 | 0.6955 | 0.6997 | 0.6997 |
| moderate-3to1 | 0.5298 | 0.5859 | 0.6088 | 0.6093 | 0.7845 | 0.8505 | 0.8322 | 0.8322 |
| stress-sweep (10:1) | 0.5311 | 0.5828 | 0.7124 | 0.7124 | 0.8333 | 0.8333 | 0.8333 | 0.8333 |
| {
  "total": 0.0,
  "breakdown": {
    "academic": 0.0,
    "preference": 0.0,
    "schedule": 0.0,
    "fairness": 0.0
  },
  "subBreakdown": {
    "subjectDepth": 0.0,
    "level": 0.0,
    "experience": 0.0,
    "style": 0.0,
    "budget": 0.0,
    "region": 0.0
  }
} |
| --- |
| Area | Seminar Proposal | Implemented System | Rationale |
| --- | --- | --- | --- |
| Scoring Model Architecture | Flat six-criteria weighted sum (subject, availability, experience, language/style, feedback, load) | Hierarchical four-bucket composite: M(s,t) = alpha*A + beta*P + gamma*S + delta*F, with sub-weights inside each bucket | The four-bucket model separates concerns, allows independent sub-scorer testing, and maps to Algorithm.md |
| Subject Eligibility | Weighted term (0.30 weight) in flat sum; non-matching tutors could still rank via other terms | Hard eligibility filter; subject match checked before scoring; non-matching tutors excluded entirely | A tutor who cannot teach the subject should never appear as a candidate |
| Level Compatibility | Not explicitly defined | Lvl(s,t) = max(0, 1 - |Ls - Lt| / Lmax) with Lmax = 12; clamping prevents negative scores | Added to capture grade-level appropriateness; clamping prevents score corruption |
| Experience Scoring | Mentioned as criterion but no formula | Exp'(t) = theta*min(Years/20, 1) + (1-theta)*Q_t with theta = 0.4, cold start Q_t = 0.5 | Years cap prevents unbounded scores; cold start prevents burying new tutors |
| Style Matching | Mentioned but no scoring method | Cosine similarity on one-hot encoded vectors; zero-norm vectors default to 0.5 | One-hot encoding is standard for categorical data; zero-norm fallback handles unspecified preferences |
| Budget Matching | Pricing mentioned but no formula | Budget(s,t) = 1 if rate <= budget; max(0, 1 - (rate-budget)/budget) if over; zero-division guard | Zero-division guard prevents crashes when student sets no budget |
| Region Matching | Not in formal model (only in research notes) | Added as optional term for in-person mode; returns 1 for same region, 0.5 neutral when missing | Missing from seminar's formal model; added for physical tutoring scenarios |
| Schedule Scoring | Simple overlap ratio as weighted term | S(s,t) = |Hs intersect Ht| / |Hs| with contiguous coverage; zero-availability students rejected as incomplete | Contiguous coverage ensures one tutor slot covers each request; incomplete profiles rejected explicitly |
| Fairness / Load Balancing | Flat load factor weight (0.05) in sum | F(t) = 1 - LoadRatio(t) with power 1.15 scaling and +0.05 cold-start boost | Non-linear scaling penalizes high utilization more; boost nudges unused tutors into circulation |
| Assignment Algorithm | Simple greedy: sort once by score, assign in order | Priority-Queue Greedy with Lazy Fairness Recompute using MaxHeap | Static sort uses fairness data that becomes stale mid-run; lazy recompute keeps correctness at same complexity |
| Weight Adaptation | Not specified | Proportional renormalization: target weight bumped by eta, others proportionally rescaled to keep sum = 1 | Seminar's original approach broke normalization; proportional rescaling guarantees sum w = 1 always |
| Feedback Update | Described as updating 'tutor reliability' but no mechanism | EMA: Q_t_new = (1-lambda)*Q_t_old + lambda*FB(s,t) with lambda = 0.3, FB = rating/5 | EMA weights recent feedback more while retaining history; lambda = 0.3 balances responsiveness to recent sessions with stability of the accumulated rating |
| Top-K Ranking | Not addressed | Top-K ranking layer for student-facing display (full sort then truncate, O(T log T) per request), plus per-student top-K truncation inside the batch engine | Bounds the response to the top 5–10 tutors and caps batch heap memory at O(S × k) (Section 4.5.3) |
| Deterministic Tiebreaking | Not addressed | Multi-tier: lower assignedCount then lower tutor ID then FNV-1a hash | Ensures reproducible output across runs for testing and debugging |
| Edge Case Handling | Not addressed | 12 explicitly handled edge cases with documented strategies and unit tests | Seminar proposed a theoretical system; implementation required concrete handling of real-world edge cases |
| Core Architecture | Standard NestJS structure | Framework-independent domain layer (src/core/) isolated from NestJS with dependency inversion | Core algorithm independently testable without NestJS; reusable in other contexts |
| Evaluation and Benchmarks | Not addressed | Standalone evaluation harness with synthetic datasets, Jain's fairness index, and wall-clock benchmarking | Provides empirical evidence for theoretical complexity claims |
| Optimality Guarantee | Not addressed | Greedy guarantees at least 1/2 of optimal total score (exchange argument for weighted bipartite matching) | Defensible lower bound on match quality; min-cost max-flow noted as future work |