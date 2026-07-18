# Graph Report - .  (2026-07-18)

## Corpus Check
- 187 files · ~68,097 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1346 nodes · 3430 edges · 119 communities (58 shown, 61 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 73
- Community 74
- App Bootstrap & Exception Filter
- Nest CLI Config
- Package Manifest
- npm Scripts
- Lint-Staged Config
- Runtime Dependencies
- Community 78
- Community 80
- Community 81
- Community 82
- Community 84
- Community 86
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 64
- Community 71
- Community 76
- Community 83
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Dev Dependencies
- Community 67
- Community 68
- Community 79
- Community 85
- Community 87
- Community 100
- Community 101
- Community 108
- Community 109
- Community 110
- Community 111
- Community 62
- Community 63
- Community 65
- Community 66
- Community 69
- Community 70
- Community 72
- Community 75
- Community 77
- Community 96
- Community 97
- Community 98
- Community 99
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 112
- Community 113
- Jest Config
- Path Alias Mapping
- JWT Key Apply Script
- JWT Key Generation Script
- Community 114
- App Controller
- Nest Module Wiring
- Auth Token Service
- Auth Guards & Token Types
- Auth/Owner Guards
- Session DTOs & CurrentUser
- JWT Refresh Strategy
- Dashboard Controller
- Assignment Lifecycle Tests
- Preference Scorer & Core Tests
- Weight Adaptation & Value Objects
- Scorers & Greedy Engine Internals
- Eligibility Filter
- Greedy Assignment Engine
- Composite Scorer & Weights
- Evaluation Harness
- Auth Service & Onboarding DTOs
- Database Module & Tables
- Drizzle Schema & Enums
- Matchmaking Repository
- Feed DTOs
- Messages DTOs
- Notifications Repository
- Users Repository & Records
- Schedule Slot DTOs
- Sessions Repository
- Auth Controller & Swagger
- Onboarding Availability DTOs
- Matchmaking-Test Module
- Matchmaking DTOs & Pagination
- Matchmaking Service
- Notifications Controller
- Student Profile DTOs
- User Preference Update DTOs
- Users Controller
- Community 115
- pg Type Declarations
- TS Build Config
- TypeScript Compiler Config
- Architecture Guide (agent-docs)
- Database Guidance (agent-docs)
- Exception Handling Guide (docs)
- Core Matchmaking Roadmap (docs)
- Scheduling & API Docs
- Optimization Report
- Database Model & Feedback (docs)

## God Nodes (most connected - your core abstractions)
1. `AuthenticatedUser` - 78 edges
2. `AppDatabase` - 78 edges
3. `Tutor` - 69 edges
4. `Student` - 60 edges
5. `CurrentUser` - 44 edges
6. `scripts` - 37 edges
7. `Assignment` - 27 edges
8. `compilerOptions` - 27 edges
9. `AlgorithmWeights` - 22 edges
10. `AvailabilitySlot` - 21 edges

## Surprising Connections (you probably didn't know these)
- `Project Structure (agent-docs)` --semantically_similar_to--> `Project Structure Documentation (docs)`  [INFERRED] [semantically similar]
  agent-docs/project-structure.md → docs/project-structure.md
- `NestJS + Drizzle + PostgreSQL Stack` --conceptually_related_to--> `Agent Operating Guide`  [INFERRED]
  README.md → AGENTS.md
- `Database Guidance (agent-docs)` --conceptually_related_to--> `Database Model (docs)`  [INFERRED]
  agent-docs/database.md → docs/database.md
- `Assignments as Sessions` --conceptually_related_to--> `assignments Table`  [INFERRED]
  agent-docs/lessons.md → docs/database.md
- `Framework-Free Matchmaking Core` --conceptually_related_to--> `Core Matchmaking Roadmap and API Plan`  [INFERRED]
  agent-docs/project-structure.md → docs/core-roadmap-api-plan.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Matchmaking Pipeline: Filter → Score → Assign → Feedback** — docs_core_roadmap_eligibility_filtering, docs_core_roadmap_criterion_scorers, docs_optimization_report_lazy_greedy_engine, docs_api_ema_feedback_loop, docs_core_roadmap_weight_adaptation [INFERRED 0.85]
- **Greedy Engine Optimizations** — docs_optimization_report_scoring_cache_weight_hoisting, docs_optimization_report_top_k_truncation, docs_optimization_report_subject_indexed_pruning, docs_optimization_report_min_cost_max_flow_baseline [EXTRACTED 1.00]
- **Logging + Exception Handling Stack** — agent_docs_exceptions_common_exception_filter, agent_docs_exceptions_http_logging_interceptor, agent_docs_exceptions_app_logger_service, agent_docs_exceptions_common_module [EXTRACTED 1.00]

## Communities (119 total, 61 thin omitted)

### Community 0 - "App Bootstrap & Exception Filter"
Cohesion: 0.07
Nodes (40): AppModule, Module, ErrorResponseBody, AuthenticatedRequest, CommonExceptionFilter, Catch, HttpLoggingInterceptor, Injectable (+32 more)

### Community 50 - "Nest CLI Config"
Cohesion: 0.29
Nodes (6): $schema, collection, sourceRoot, compilerOptions, deleteOutDir, builder

### Community 51 - "Package Manifest"
Cohesion: 0.29
Nodes (6): name, version, description, author, private, license

### Community 12 - "npm Scripts"
Cohesion: 0.05
Nodes (37): scripts, preinstall, prepare, prebuild, clean, build, build:dev, build:minified (+29 more)

### Community 52 - "Lint-Staged Config"
Cohesion: 0.40
Nodes (6): src/**/*.{ts,js,json}, eslint --fix, prettier --write, test/**/*.{ts,js}, docs/**/*.md, README.md

### Community 44 - "Runtime Dependencies"
Cohesion: 0.80
Nodes (5): dependencies, bcrypt, bytes, class-transformer, crypto-js

### Community 39 - "Dev Dependencies"
Cohesion: 0.67
Nodes (6): devDependencies, @commitlint/cli, @commitlint/config-conventional, @swc/cli, @types/passport-jwt, @types/supertest

### Community 36 - "Jest Config"
Cohesion: 0.08
Nodes (12): moduleFileExtensions, js, json, ts, rootDir, testRegex, transform, ^.+\\.(t|j)s$ (+4 more)

### Community 45 - "Path Alias Mapping"
Cohesion: 0.22
Nodes (9): moduleNameMapper, ^@app/(.*)$, ^@common/(.*)$, ^@config$, ^@configs/(.*)$, ^@database$, ^@modules/(.*)$, ^@types/(.*)$ (+1 more)

### Community 38 - "JWT Key Apply Script"
Cohesion: 0.17
Nodes (10): { generateKeyPairSync }, fs, path, access, refresh, envPath, examplePath, envMap (+2 more)

### Community 53 - "JWT Key Generation Script"
Cohesion: 0.33
Nodes (4): { generateKeyPairSync }, access, refresh, out

### Community 34 - "App Controller"
Cohesion: 0.21
Nodes (8): AppController, Controller, ApiTags, Get, ApiOperation, ApiResponse, AppService, Injectable

### Community 10 - "Nest Module Wiring"
Cohesion: 0.12
Nodes (23): CommonModule, Module, DatabaseModule, Global, Module, AuthModule, Module, DashboardModule (+15 more)

### Community 28 - "Auth Token Service"
Cohesion: 0.20
Nodes (7): AuthTokenService, Injectable, TokenUse, AuthTokenClaims, AuthTokenPair, JwtAccessStrategy, Injectable

### Community 15 - "Auth Guards & Token Types"
Cohesion: 0.15
Nodes (14): AuthenticatedRequest, AccountRole, AuthenticatedUser, AuthenticatedRequest, AuthenticatedRequest, RefreshAuthGuard, Injectable, AuthenticatedRequest (+6 more)

### Community 46 - "Auth/Owner Guards"
Cohesion: 0.22
Nodes (4): AuthGuard, Injectable, OwnerOrAdminGuard, Injectable

### Community 11 - "Session DTOs & CurrentUser"
Cohesion: 0.16
Nodes (28): CurrentUser, BookSessionDto, ApiProperty, IsUUID, ApiPropertyOptional, IsOptional, IsString, IsISO8601 (+20 more)

### Community 54 - "JWT Refresh Strategy"
Cohesion: 0.40
Nodes (3): fromRefreshTokenBody(), JwtRefreshStrategy, Injectable

### Community 7 - "Dashboard Controller"
Cohesion: 0.10
Nodes (21): Roles(), DashboardController, Controller, ApiTags, ApiBearerAuth, UseGuards, Get, ApiOperation (+13 more)

### Community 14 - "Assignment Lifecycle Tests"
Cohesion: 0.10
Nodes (10): slot(), student(), tutor(), AssignmentLifecycle, AssignmentRunResult, FeedbackUpdater, MatchingEngine, Assignment (+2 more)

### Community 9 - "Preference Scorer & Core Tests"
Cohesion: 0.13
Nodes (11): defaultWeights, PreferenceScorer, dot(), magnitude(), cosineSimilarity(), oneHot(), AvailabilitySlot, DeliveryMode (+3 more)

### Community 24 - "Weight Adaptation & Value Objects"
Cohesion: 0.17
Nodes (7): AdaptiveWeightKey, WeightAdaptation, AlgorithmWeightsInput, CriterionWeightsInput, CriterionWeights, MatchScoreBreakdown, MatchSubBreakdown

### Community 20 - "Scorers & Greedy Engine Internals"
Cohesion: 0.17
Nodes (10): CancellationResult, AssignmentStats, AssignBatchOptions, AcademicScore, FairnessScorer, PreferenceScore, ScheduleScorer, HeapItem (+2 more)

### Community 8 - "Eligibility Filter"
Cohesion: 0.12
Nodes (11): CandidatePair, EligibilityResult, EligibilityFilter, RankedTutor, TopKRanker, AcademicScorer, MatchScore, Student (+3 more)

### Community 23 - "Composite Scorer & Weights"
Cohesion: 0.18
Nodes (7): CompositeScorer, AlgorithmWeights, greedyStaticTotal(), Edge, MinCostMaxFlow, OptimalResult, computeOptimal()

### Community 25 - "Evaluation Harness"
Cohesion: 0.19
Nodes (17): CapacityStrategy, EvaluationConfig, EvaluationRow, median(), SUBJECTS, capacityForIndex(), makeSlot(), generateStudents() (+9 more)

### Community 31 - "Auth Service & Onboarding DTOs"
Cohesion: 0.30
Nodes (7): ExamType, OnboardUserDto, IsEnum, ValidateIf, UserRole, AvailabilitySlotDto, IMPORTANT: default capacity to 5 so new tutors are always eligible in matchmakin

### Community 32 - "Database Module & Tables"
Cohesion: 0.34
Nodes (6): DATABASE, users, studentProfiles, tutorProfiles, scheduleSlots, sessions

### Community 13 - "Drizzle Schema & Enums"
Cohesion: 0.06
Nodes (34): userRoleEnum, userStatusEnum, assignmentStatusEnum, deliveryModeEnum, formatPreferenceEnum, learningStyleEnum, teachingStyleEnum, scheduleSlotStatusEnum (+26 more)

### Community 19 - "Matchmaking Repository"
Cohesion: 0.13
Nodes (6): AppDatabase, MatchmakingRepository, Injectable, Inject, Inject, Inject

### Community 2 - "Feed DTOs"
Cohesion: 0.07
Nodes (38): posts, CreatePostDto, ApiProperty, IsString, ApiPropertyOptional, IsOptional, IsArray, IsBoolean (+30 more)

### Community 5 - "Messages DTOs"
Cohesion: 0.07
Nodes (28): messages, SendMessageDto, ApiProperty, IsUUID, IsString, MaxLength, GetConversationDto, MessageResponseDto (+20 more)

### Community 18 - "Notifications Repository"
Cohesion: 0.13
Nodes (9): notifications, NotificationRecord, NewNotificationRecord, NotificationsRepository, Injectable, Inject, NotificationType, NotificationsService (+1 more)

### Community 16 - "Users Repository & Records"
Cohesion: 0.17
Nodes (11): UserRecord, StudentProfileRecord, TutorProfileRecord, UsersRepository, Injectable, UsersService, Injectable, PublicUserRecord (+3 more)

### Community 4 - "Schedule Slot DTOs"
Cohesion: 0.07
Nodes (34): ScheduleSlotRecord, ScheduleSlotStatus, CreateScheduleSlotDto, ApiProperty, IsUUID, IsString, ApiPropertyOptional, IsOptional (+26 more)

### Community 17 - "Sessions Repository"
Cohesion: 0.18
Nodes (7): SessionRecord, SessionStatus, SessionsRepository, Injectable, SessionsService, Injectable, SessionWithParticipants

### Community 1 - "Auth Controller & Swagger"
Cohesion: 0.08
Nodes (36): AuthController, Controller, ApiTags, Post, ApiOperation, ApiBody, ApiResponse, Body (+28 more)

### Community 35 - "Onboarding Availability DTOs"
Cohesion: 0.26
Nodes (14): AvailabilitySlotDto, ApiProperty, IsString, OnboardStudentDto, IsArray, ArrayNotEmpty, IsInt, Min (+6 more)

### Community 21 - "Matchmaking-Test Module"
Cohesion: 0.13
Nodes (13): MatchmakingTestResponseDto, ApiProperty, ApiPropertyOptional, MatchmakingDatabaseDemoResponseDto, MatchmakingTestController, Controller, ApiTags, Inject (+5 more)

### Community 3 - "Matchmaking DTOs & Pagination"
Cohesion: 0.09
Nodes (40): PaginationQueryDto, ApiPropertyOptional, IsOptional, Type, IsInt, Min, Max, SelectTutorDto (+32 more)

### Community 37 - "Matchmaking Service"
Cohesion: 0.38
Nodes (4): StudentRow, TutorRow, MatchmakingService, Injectable

### Community 30 - "Notifications Controller"
Cohesion: 0.19
Nodes (11): NotificationsController, Controller, ApiTags, ApiBearerAuth, UseGuards, Get, ApiOperation, ApiResponse (+3 more)

### Community 22 - "Student Profile DTOs"
Cohesion: 0.19
Nodes (22): ApiProperty, IsString, PreferenceWeightsDto, ApiPropertyOptional, IsOptional, IsNumber, CreateStudentProfileDto, IsInt (+14 more)

### Community 33 - "User Preference Update DTOs"
Cohesion: 0.22
Nodes (15): NotificationPrefsDto, ApiPropertyOptional, IsOptional, IsBoolean, UpdateUserDto, IsString, ValidateNested, Type (+7 more)

### Community 26 - "Users Controller"
Cohesion: 0.25
Nodes (14): UsersController, Controller, ApiTags, Post, UseGuards, ApiBearerAuth, ApiOperation, ApiBody (+6 more)

### Community 55 - "pg Type Declarations"
Cohesion: 0.33
Nodes (3): pg, PoolConfig, Pool

### Community 48 - "TS Build Config"
Cohesion: 0.25
Nodes (7): extends, ./tsconfig.json, exclude, node_modules, test, dist, **/*spec.ts

### Community 6 - "TypeScript Compiler Config"
Cohesion: 0.04
Nodes (45): compilerOptions, module, moduleResolution, esModuleInterop, isolatedModules, declaration, removeComments, emitDecoratorMetadata (+37 more)

### Community 41 - "Architecture Guide (agent-docs)"
Cohesion: 0.24
Nodes (10): Agent Operating Guide, Controller-Service-Repository Layering, Feature Module Structure, TypeScript Path Aliases, docs vs agent-docs Ownership Split, Matchmaking Backend Overview, NestJS + Drizzle + PostgreSQL Stack, Project Structure (agent-docs) (+2 more)

### Community 40 - "Database Guidance (agent-docs)"
Cohesion: 0.20
Nodes (10): Database Guidance (agent-docs), schema.ts as Source of Truth, Joined Reads to Avoid N+1, Availability/Preferences as Typed JSON, Users Module, Matchmaking-Test Module, Users Endpoints, Matchmaking Test Endpoints (+2 more)

### Community 29 - "Exception Handling Guide (docs)"
Cohesion: 0.17
Nodes (16): Exception Handling Guide, CommonExceptionFilter, No-Stack-Trace-In-Response Rule, IncompleteProfileException, HttpLoggingInterceptor, AppLoggerService, CommonModule, Lessons Learned (+8 more)

### Community 47 - "Core Matchmaking Roadmap (docs)"
Cohesion: 0.25
Nodes (8): NoEligibleTutorsException, Core Matchmaking Roadmap and API Plan, Eligibility Filtering, Weight Adaptation, Gender/Region Criteria Exclusion, Lazy vs Static One-Time Greedy Sorting, Score Breakdown JSON Persistence, subjects Table

### Community 42 - "Scheduling & API Docs"
Cohesion: 0.20
Nodes (10): Scheduling Module, Top-k Truncation with Fallback Pass, API Documentation, Auth Endpoints, GET /matchmaking/candidates, POST /matchmaking/select, POST /matchmaking/assignments/:id/feedback, Schedules Endpoints (+2 more)

### Community 43 - "Optimization Report"
Cohesion: 0.27
Nodes (10): Optimization Report — Greedy Engine, Lazy-Greedy Matching Engine, Scoring Cache + Weight Hoisting, Subject-Indexed Pruning, Jain's Fairness Index, Min-Cost Max-Flow Optimal Baseline, CompositeScorer, Evaluation Harness (+2 more)

### Community 49 - "Database Model & Feedback (docs)"
Cohesion: 0.57
Nodes (7): EMA Tutor Quality Feedback Loop, Database Model (docs), users Table, student_profiles Table, tutor_profiles Table, assignments Table, tutor_feedback Table

## Knowledge Gaps
- **169 isolated node(s):** `$schema`, `collection`, `sourceRoot`, `deleteOutDir`, `builder` (+164 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **61 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AuthenticatedUser` connect `Auth Guards & Token Types` to `App Bootstrap & Exception Filter`, `Auth Controller & Swagger`, `Feed DTOs`, `Matchmaking DTOs & Pagination`, `Schedule Slot DTOs`, `Matchmaking Service`, `Messages DTOs`, `Dashboard Controller`, `Preference Scorer & Core Tests`, `Session DTOs & CurrentUser`, `Auth/Owner Guards`, `JWT Refresh Strategy`, `Users Controller`, `Auth Token Service`, `Notifications Controller`, `Auth Service & Onboarding DTOs`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Why does `AppDatabase` connect `Matchmaking Repository` to `Database Module & Tables`, `Feed DTOs`, `Schedule Slot DTOs`, `Messages DTOs`, `Dashboard Controller`, `Preference Scorer & Core Tests`, `Drizzle Schema & Enums`, `Users Repository & Records`, `Sessions Repository`, `Notifications Repository`, `Matchmaking-Test Module`, `Auth Service & Onboarding DTOs`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `Tutor` connect `Eligibility Filter` to `Matchmaking Service`, `Preference Scorer & Core Tests`, `Assignment Lifecycle Tests`, `Scorers & Greedy Engine Internals`, `Matchmaking-Test Module`, `Composite Scorer & Weights`, `Weight Adaptation & Value Objects`, `Evaluation Harness`, `Greedy Assignment Engine`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _169 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Bootstrap & Exception Filter` be split into smaller, more focused modules?**
  _Cohesion score 0.07281772953414745 - nodes in this community are weakly interconnected._
- **Should `npm Scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
- **Should `Jest Config` be split into smaller, more focused modules?**
  _Cohesion score 0.07575757575757576 - nodes in this community are weakly interconnected._