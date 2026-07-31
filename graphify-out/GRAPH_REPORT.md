# Graph Report - project  (2026-07-31)

## Corpus Check
- 364 files · ~258,290 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1220 nodes · 2551 edges · 110 communities (45 shown, 65 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.56)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3f06a46d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- scripts
- jest
- evaluation-harness.ts
- package.json
- devDependencies
- dependencies
- axios
- body-parser
- bytes
- class-transformer
- class-validator
- compression
- cookie-parser
- cors
- crypto-js
- drizzle-orm
- helmet
- jsonwebtoken
- @nestjs/axios
- @nestjs/common
- @nestjs/core
- @nestjs/passport
- nestjs-pino
- @nestjs/platform-express
- @nestjs/swagger
- passport
- passport-jwt
- reflect-metadata
- swagger-ui-express
- winston
- cross-env
- drizzle-kit
- eslint
- eslint-config-prettier
- @eslint/eslintrc
- eslint-plugin-prettier
- globals
- husky
- jest
- lint-staged
- @nestjs/cli
- @nestjs/schematics
- @nestjs/testing
- prettier
- rimraf
- source-map-support
- supertest
- @swc/cli
- @swc/core
- @swc/jest
- ts-jest
- ts-loader
- ts-node
- ts-prune
- tsc-alias
- tsconfig-paths
- @types/express
- @types/jsonwebtoken
- @types/passport-jwt
- @types/supertest
- typescript
- typescript-eslint
- AuthService
- FeedQueryDto
- .getTutorSlots
- GreedyAssignmentEngine
- Roles
- algorithm.md — Authoritative Matchmaking Algorithm Spec
- MessagesController
- index.ts
- schema.ts
- AppDatabase
- Student Tutor Matchmaking Platform
- optimal-baseline.ts
- OnboardStudentDto
- MatchmakingTestController
- SessionsRepository
- matchmaking.repository.ts
- greedy-assignment.engine.ts
- CompositeScorer
- feed.repository.ts
- apply-jwt-keys.js
- composite.scorer.ts
- baseline-comparison.ts
- index.ts
- PreferenceScorer
- MessagesRepository
- nigerian-secondary.seed.ts
- Exception Handling
- moduleNameMapper
- EligibilityFilter
- CLAUDE.md
- lint-staged
- MatchingEngine
- match-score.vo.ts
- weight-adaptation.ts
- core-units.spec.ts
- docx
- passport-oauth
- rxjs
- @commitlint/config-conventional
- @eslint/js
- @types/node
- @types/pg
- new.ts
- tutor.entity.ts

## God Nodes (most connected - your core abstractions)
1. `AppDatabase` - 80 edges
2. `AuthenticatedUser` - 78 edges
3. `CurrentUser` - 44 edges
4. `scripts` - 39 edges
5. `MatchmakingService` - 22 edges
6. `MatchmakingRepository` - 21 edges
7. `UserWithProfiles` - 19 edges
8. `AuthService` - 17 edges
9. `OnboardUserDto` - 16 edges
10. `SessionsRepository` - 16 edges

## Surprising Connections (you probably didn't know these)
- `AuthenticatedRequest` --references--> `AuthenticatedUser`  [EXTRACTED]
  backend/src/common/auth/auth.guard.ts → backend/src/common/auth/auth.types.ts
- `AuthenticatedRequest` --references--> `AuthenticatedUser`  [EXTRACTED]
  backend/src/common/auth/current-user.decorator.ts → backend/src/common/auth/auth.types.ts
- `AuthenticatedRequest` --references--> `AuthenticatedUser`  [EXTRACTED]
  backend/src/common/auth/owner-or-admin.guard.ts → backend/src/common/auth/auth.types.ts
- `AuthenticatedRequest` --references--> `AuthenticatedUser`  [EXTRACTED]
  backend/src/common/auth/roles.guard.ts → backend/src/common/auth/auth.types.ts
- `AuthenticatedRequest` --references--> `AuthenticatedUser`  [EXTRACTED]
  backend/src/common/filters/http-exception.filter.ts → backend/src/common/auth/auth.types.ts

## Import Cycles
- None detected.

## Communities (110 total, 65 thin omitted)

### Community 0 - "scripts"
Cohesion: 0.05
Nodes (39): scripts, build, build:dev, build:minified, clean, commitlint, db:generate, db:migrate (+31 more)

### Community 1 - "jest"
Cohesion: 0.15
Nodes (13): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment, testRegex, transform (+5 more)

### Community 2 - "evaluation-harness.ts"
Cohesion: 0.18
Nodes (17): runBaselineComparison(), evaluate(), EvaluationConfig, EvaluationRow, HEADER, mean(), runEvaluation(), runModerateEvaluation() (+9 more)

### Community 3 - "package.json"
Cohesion: 0.29
Nodes (6): author, description, license, name, private, version

### Community 4 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, @commitlint/cli, @nestjs/schematics, @types/jest, @types/jsonwebtoken, typescript, @commitlint/cli, @nestjs/schematics (+3 more)

### Community 5 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, bcrypt, body-parser, pg, swagger-ui-express, bcrypt, body-parser, pg (+1 more)

### Community 7 - "body-parser"
Cohesion: 0.05
Nodes (73): StudentProfileRecord, TutorProfileRecord, UserRecord, LearningStylePreference, OnboardUserDto, AvailabilitySlotDto, CreateStudentProfileDto, CreateTutorProfileDto (+65 more)

### Community 28 - "swagger-ui-express"
Cohesion: 0.08
Nodes (44): AssignmentPageDto, AssignmentResponseDto, AssignmentUpdateStatus, BatchMatchmakingResponseDto, CandidatePageDto, CandidateStudentDto, CandidateStudentPageDto, CandidateTutorDto (+36 more)

### Community 41 - "@nestjs/schematics"
Cohesion: 0.07
Nodes (30): AuthenticatedRequest, AuthGuard, Injectable, AuthTokenService, Injectable, AccountRole, AuthenticatedUser, AuthTokenClaims (+22 more)

### Community 57 - "@types/jsonwebtoken"
Cohesion: 0.08
Nodes (42): CurrentUser, NotificationsController, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags, Controller (+34 more)

### Community 60 - "typescript"
Cohesion: 0.07
Nodes (38): CommonExceptionFilter, HttpLoggingInterceptor, Injectable, AppLoggerService, NEST_TO_WINSTON, PinoFactory, PinoLikeLogger, stringifyMeta() (+30 more)

### Community 62 - "AuthService"
Cohesion: 0.07
Nodes (35): CommonModule, Module, AuthController, ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags (+27 more)

### Community 63 - "FeedQueryDto"
Cohesion: 0.09
Nodes (33): ActiveTutorDto, CreatePostDto, FeedQueryDto, FeedResponseDto, PostAttachment, PostParamDto, PostResponseDto, TrendingTopicDto (+25 more)

### Community 64 - ".getTutorSlots"
Cohesion: 0.09
Nodes (24): ScheduleSlotRecord, SchedulingController, ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse (+16 more)

### Community 65 - "GreedyAssignmentEngine"
Cohesion: 0.09
Nodes (8): AssignmentLifecycle, CancellationResult, GreedyAssignmentEngine, AlgorithmWeights, AlgorithmWeightsInput, CriterionWeights, CriterionWeightsInput, Student

### Community 66 - "Roles"
Cohesion: 0.11
Nodes (14): Roles(), DashboardController, ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, Controller, Get (+6 more)

### Community 67 - "algorithm.md — Authoritative Matchmaking Algorithm Spec"
Cohesion: 0.06
Nodes (30): 0. Notation, 10. Corrections Log — what was fixed and why, 1.1 Subject Eligibility — **[correction: hard filter, not weighted term]**, 1.2 Subject Depth (optional, replaces the old Sub weight), 1.3 Level Compatibility — **[correction: unbounded without clamping]**, 1.4 Experience & Quality — **[correction: same unbounded issue, plus missing cold start]**, 1.5 Combined Academic Score, 1. Algorithm 1 — Academic Compatibility (+22 more)

### Community 68 - "MessagesController"
Cohesion: 0.10
Nodes (22): GetConversationDto, MessageResponseDto, SendMessageDto, ApiProperty, ApiPropertyOptional, IsString, IsUUID, MessagesController (+14 more)

### Community 69 - "index.ts"
Cohesion: 0.12
Nodes (9): NewNotificationRecord, NotificationRecord, notifications, NotificationsRepository, Inject, Injectable, NotificationsService, NotificationType (+1 more)

### Community 70 - "schema.ts"
Cohesion: 0.08
Nodes (23): assignmentStatusEnum, deliveryModeEnum, formatPreferenceEnum, learningStyleEnum, MessageRecord, NewMessageRecord, NewPostRecord, NewScheduleSlotRecord (+15 more)

### Community 71 - "AppDatabase"
Cohesion: 0.17
Nodes (6): AppDatabase, AppTransaction, MatchmakingRepository, Inject, Injectable, Inject

### Community 72 - "Student Tutor Matchmaking Platform"
Cohesion: 0.09
Nodes (21): API Endpoints, Architecture Flow, Assignment Algorithm (Lazy Greedy), Baseline comparison (`eval:baselines`), CLI: Evaluation Scripts, Commands, Component Architecture, Core Matchmaking Engine (+13 more)

### Community 73 - "optimal-baseline.ts"
Cohesion: 0.15
Nodes (17): selectScenarios(), selectStrategies(), DEFAULT_OUTPUT_DIR, EmitOptions, emitResults(), formatTable(), getFlagValue(), resolveOutputPath() (+9 more)

### Community 74 - "OnboardStudentDto"
Cohesion: 0.23
Nodes (16): AvailabilitySlotDto, OnboardStudentDto, OnboardTutorDto, ApiProperty, ApiPropertyOptional, ArrayNotEmpty, IsArray, IsEnum (+8 more)

### Community 75 - "MatchmakingTestController"
Cohesion: 0.22
Nodes (7): MatchmakingTestController, ApiOperation, ApiResponse, ApiTags, Controller, Get, Inject

### Community 76 - "SessionsRepository"
Cohesion: 0.22
Nodes (3): SessionsRepository, Inject, Injectable

### Community 77 - "matchmaking.repository.ts"
Cohesion: 0.25
Nodes (8): assignments, scheduleSlots, sessions, studentProfiles, tutorFeedback, tutorProfiles, users, BatchPersistResult

### Community 78 - "greedy-assignment.engine.ts"
Cohesion: 0.19
Nodes (7): AssignBatchOptions, AssignmentRunResult, AssignmentStats, CandidatePair, EligibilityResult, RankedTutor, TopKRanker

### Community 79 - "CompositeScorer"
Cohesion: 0.27
Nodes (4): CompositeScorer, computeOptimal(), greedyStaticTotal(), MinCostMaxFlow

### Community 80 - "feed.repository.ts"
Cohesion: 0.19
Nodes (5): postLikes, posts, FeedRepository, Inject, Injectable

### Community 81 - "apply-jwt-keys.js"
Cohesion: 0.17
Nodes (10): access, envMap, envPath, exampleKeys, examplePath, fs, { generateKeyPairSync }, newEnv (+2 more)

### Community 82 - "composite.scorer.ts"
Cohesion: 0.26
Nodes (3): AcademicScore, AcademicScorer, ScheduleScorer

### Community 83 - "baseline-comparison.ts"
Cohesion: 0.17
Nodes (8): BaselineRow, bestEligible(), HEADER, jain(), Picker, runFcfs(), SCENARIOS, STRATEGIES

### Community 84 - "index.ts"
Cohesion: 0.24
Nodes (5): IncompleteProfileException, TutorCapacityExceededException, slot(), student(), tutor()

### Community 86 - "MessagesRepository"
Cohesion: 0.24
Nodes (4): messages, MessagesRepository, Inject, Injectable

### Community 87 - "nigerian-secondary.seed.ts"
Cohesion: 0.24
Nodes (9): subjects, tutorSubjects, FIRST_NAMES, LAST_NAMES, pickSpecializations(), REGIONS, SECONDARY_SUBJECTS, seed() (+1 more)

### Community 88 - "Exception Handling"
Cohesion: 0.22
Nodes (8): Adding a New Domain Exception, Behaviour, Exception Handling, Global Filter — `CommonExceptionFilter`, Hierarchy, HTTP Logging Interceptor — `HttpLoggingInterceptor`, Logger Service — `AppLoggerService`, No-Stack-Trace Rule

### Community 89 - "moduleNameMapper"
Cohesion: 0.22
Nodes (9): moduleNameMapper, ^@app/(.*)$, ^@common/(.*)$, ^@config$, ^@configs/(.*)$, ^@core/(.*)$, ^@database$, ^@modules/(.*)$ (+1 more)

### Community 91 - "CLAUDE.md"
Cohesion: 0.25
Nodes (6): Architecture, Backend: framework-free core + Nest modules, Commands, Conventions, Frontend, Overview

### Community 92 - "lint-staged"
Cohesion: 0.48
Nodes (7): lint-staged, docs/**/*.md, README.md, src/**/*.{ts,js,json}, test/**/*.{ts,js}, eslint --fix, prettier --write

### Community 94 - "match-score.vo.ts"
Cohesion: 0.38
Nodes (4): Assignment, MatchScore, MatchScoreBreakdown, MatchSubBreakdown

## Knowledge Gaps
- **260 isolated node(s):** `0. Notation`, `1.1 Subject Eligibility — **[correction: hard filter, not weighted term]**`, `1.2 Subject Depth (optional, replaces the old Sub weight)`, `1.3 Level Compatibility — **[correction: unbounded without clamping]**`, `1.4 Experience & Quality — **[correction: same unbounded issue, plus missing cold start]**` (+255 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **65 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AuthenticatedUser` connect `@nestjs/schematics` to `.getTutorSlots`, `Roles`, `MessagesController`, `body-parser`, `swagger-ui-express`, `@types/jsonwebtoken`, `typescript`, `AuthService`, `FeedQueryDto`?**
  _High betweenness centrality (0.161) - this node is a cross-community bridge._
- **Why does `AppDatabase` connect `AppDatabase` to `.getTutorSlots`, `Roles`, `index.ts`, `body-parser`, `MatchmakingTestController`, `SessionsRepository`, `matchmaking.repository.ts`, `feed.repository.ts`, `MessagesRepository`, `@types/jsonwebtoken`, `swagger-ui-express`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `CurrentUser` connect `@types/jsonwebtoken` to `.getTutorSlots`, `Roles`, `MessagesController`, `body-parser`, `@nestjs/schematics`, `swagger-ui-express`, `AuthService`, `FeedQueryDto`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `0. Notation`, `1.1 Subject Eligibility — **[correction: hard filter, not weighted term]**`, `1.2 Subject Depth (optional, replaces the old Sub weight)` to the rest of the system?**
  _260 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `body-parser` be split into smaller, more focused modules?**
  _Cohesion score 0.05414488424197162 - nodes in this community are weakly interconnected._
- **Should `swagger-ui-express` be split into smaller, more focused modules?**
  _Cohesion score 0.07711711711711712 - nodes in this community are weakly interconnected._