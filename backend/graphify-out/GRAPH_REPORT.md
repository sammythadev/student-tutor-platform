# Graph Report - C:\Users\USER\Desktop\Final Year Research\project\backend  (2026-07-18)

## Corpus Check
- 3 files · ~68,194 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1413 nodes · 3410 edges · 116 communities (54 shown, 62 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Matchmaking DTOs & Auth Types
- Core Entities & Availability
- Exception Filter & App Config
- Sessions Module & DTOs
- Feed Module & DTOs
- Scheduling Module & DTOs
- Messages Module & DTOs
- TS Path References
- App Controller & Bootstrap
- Dashboard Module
- npm Scripts
- Assignment Engine Types & Ranking
- Eligibility Filter
- User Records & Repository
- Weight Adaptation & Preference Scorer
- Drizzle Schema & Enums
- Assignment Lifecycle
- Auth Module & DTOs
- Feedback Updater & Schedule Scorer
- Auth Service
- Users Controller Decorators
- Composite Scorer & Weights
- Evaluation Harness
- Greedy Assignment Engine
- Notifications Module
- Auth Controller
- Onboarding DTOs
- Exception Handling Docs
- Auth Guard & Token Service
- Notifications Controller
- Jest Config
- Auth Types & Decorators
- Auth Guards
- JWT Key Apply Script
- Dev Dependencies & Commitlint
- Database Guidance Docs
- Architecture Docs
- API Docs
- Optimization Report Docs
- JWT Access Strategy & Env
- Runtime Dependencies
- Database Module
- Path Alias Mapping
- Matchmaking Roadmap Docs
- TS Build Config
- Notification Records & Service
- Admin Signup DTO
- Database Model Docs
- Nest CLI Config
- Package Manifest
- Lint-Staged Config
- JWT Key Generation Script
- JWT Refresh Strategy
- Dep: bcrypt
- Dep: body-parser
- Dep: class-validator
- Dep: compression
- Dep: cookie-parser
- Dep: cors
- Dep: cross-env
- Dep: drizzle-kit
- Dep: drizzle-orm
- Dep: eslint
- Dep: eslint-config-prettier
- Dep: eslint-eslintrc
- Dep: eslint-js
- Dep: eslint-plugin-prettier
- Dep: globals
- Dep: helmet
- Dep: husky
- Husky Commit-Msg Hook
- Husky Pre-Commit Hook
- Dep: jest
- Dep: jsonwebtoken
- Dep: lint-staged
- Dep: nestjs-axios
- Dep: nestjs-cli
- Dep: nestjs-common
- Dep: nestjs-core
- Dep: nestjs-passport
- Dep: nestjs-pino
- Dep: nestjs-platform-express
- Dep: nestjs-schematics
- Dep: nestjs-swagger
- Dep: nestjs-testing
- Dep: passport
- Dep: passport-jwt
- Dep: passport-oauth
- Dep: pg
- Dep: reflect-metadata
- Dep: rxjs
- Dep: swagger-ui-express
- Dep: winston
- Dep: prettier
- Dep: rimraf
- Dep: source-map-support
- Dep: supertest
- Dep: swc-core
- Dep: swc-jest
- Dep: ts-jest
- Dep: ts-loader
- Dep: ts-node
- Dep: ts-prune
- Dep: tsc-alias
- Dep: tsconfig-paths
- Dep: types-express
- Dep: types-jest
- Dep: types-jsonwebtoken
- Dep: types-node
- Dep: typescript
- Dep: typescript-eslint
- New User Script
- bcrypt Type Declarations

## God Nodes (most connected - your core abstractions)
1. `AuthenticatedUser` - 78 edges
2. `AppDatabase` - 78 edges
3. `Tutor` - 68 edges
4. `Student` - 59 edges
5. `CurrentUser` - 44 edges
6. `scripts` - 38 edges
7. `Assignment` - 27 edges
8. `compilerOptions` - 27 edges
9. `AlgorithmWeights` - 22 edges
10. `MatchmakingService` - 21 edges

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

## Communities (116 total, 62 thin omitted)

### Community 0 - "Matchmaking DTOs & Auth Types"
Cohesion: 0.06
Nodes (50): AuthenticatedUser, Roles(), AppDatabase, AssignmentPageDto, AssignmentResponseDto, AssignmentUpdateStatus, BatchMatchmakingResponseDto, CandidatePageDto (+42 more)

### Community 1 - "Core Entities & Availability"
Cohesion: 0.06
Nodes (59): AvailabilitySlot, DeliveryMode, ExamType, FormatPreference, LearningStyle, TeachingStyle, studentProfiles, tutorProfiles (+51 more)

### Community 2 - "Exception Filter & App Config"
Cohesion: 0.06
Nodes (46): Catch, AuthenticatedRequest, CommonExceptionFilter, ErrorResponseBody, AuthenticatedRequest, HttpLoggingInterceptor, Injectable, AppLoggerService (+38 more)

### Community 3 - "Sessions Module & DTOs"
Cohesion: 0.09
Nodes (37): IsISO8601, CurrentUser, SessionRecord, sessions, BookSessionDto, ProposeSessionDto, SessionParamDto, SessionResponseDto (+29 more)

### Community 4 - "Feed Module & DTOs"
Cohesion: 0.07
Nodes (38): posts, ActiveTutorDto, CreatePostDto, FeedQueryDto, FeedResponseDto, PostParamDto, PostResponseDto, TrendingTopicDto (+30 more)

### Community 5 - "Scheduling Module & DTOs"
Cohesion: 0.07
Nodes (37): ScheduleSlotRecord, scheduleSlots, CreateScheduleSlotDto, ScheduleSlotResponseDto, ScheduleSlotStatus, ApiProperty, ApiPropertyOptional, IsEnum (+29 more)

### Community 6 - "Messages Module & DTOs"
Cohesion: 0.07
Nodes (28): MaxLength, messages, GetConversationDto, MessageResponseDto, SendMessageDto, ApiProperty, ApiPropertyOptional, IsString (+20 more)

### Community 7 - "TS Path References"
Cohesion: 0.04
Nodes (45): ES2023, src/app/*, src/common/*, src/configs/*, src/configs/index.ts, src/core/*, src/database/*, src/database/index.ts (+37 more)

### Community 8 - "App Controller & Bootstrap"
Cohesion: 0.07
Nodes (30): AppController, ApiOperation, ApiResponse, ApiTags, Controller, Get, AppModule, Module (+22 more)

### Community 9 - "Dashboard Module"
Cohesion: 0.10
Nodes (20): DashboardController, ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, Controller, Get, UseGuards (+12 more)

### Community 10 - "npm Scripts"
Cohesion: 0.05
Nodes (38): scripts, build, build:dev, build:minified, clean, commitlint, db:generate, db:migrate (+30 more)

### Community 11 - "Assignment Engine Types & Ranking"
Cohesion: 0.12
Nodes (13): AssignBatchOptions, AssignmentStats, CandidatePair, EligibilityResult, RankedTutor, TopKRanker, FairnessScorer, AlgorithmWeightsInput (+5 more)

### Community 12 - "Eligibility Filter"
Cohesion: 0.17
Nodes (7): EligibilityFilter, AcademicScore, AcademicScorer, Student, Tutor, IStudentRepository, ITutorRepository

### Community 13 - "User Records & Repository"
Cohesion: 0.14
Nodes (10): StudentProfileRecord, TutorProfileRecord, UserRecord, Inject, Injectable, UsersRepository, Injectable, UsersService (+2 more)

### Community 14 - "Weight Adaptation & Preference Scorer"
Cohesion: 0.16
Nodes (10): AdaptiveWeightKey, WeightAdaptation, PreferenceScore, PreferenceScorer, HeapItem, cosineSimilarity(), dot(), magnitude() (+2 more)

### Community 15 - "Drizzle Schema & Enums"
Cohesion: 0.08
Nodes (25): assignments, assignmentStatusEnum, deliveryModeEnum, formatPreferenceEnum, learningStyleEnum, MessageRecord, NewMessageRecord, NewPostRecord (+17 more)

### Community 16 - "Assignment Lifecycle"
Cohesion: 0.16
Nodes (7): AssignmentLifecycle, CancellationResult, AssignmentRunResult, MatchingEngine, Assignment, AssignmentStatus, IAssignmentRepository

### Community 17 - "Auth Module & DTOs"
Cohesion: 0.16
Nodes (15): IsJWT, AuthTokenPair, AuthVerifyResponseDto, OnboardUsersResponseDto, ApiProperty, AuthSignupDto, ApiProperty, IsEmail (+7 more)

### Community 18 - "Feedback Updater & Schedule Scorer"
Cohesion: 0.14
Nodes (7): FeedbackUpdater, ScheduleScorer, IncompleteProfileException, NoEligibleTutorsException, slot(), student(), tutor()

### Community 19 - "Auth Service"
Cohesion: 0.20
Nodes (9): AuthService, Injectable, AuthLoginDto, ApiProperty, IsEmail, IsString, MinLength, AuthSessionResponseDto (+1 more)

### Community 20 - "Users Controller Decorators"
Cohesion: 0.23
Nodes (15): ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags, Body, Controller (+7 more)

### Community 21 - "Composite Scorer & Weights"
Cohesion: 0.18
Nodes (6): CompositeScorer, AlgorithmWeights, computeOptimal(), Edge, MinCostMaxFlow, OptimalResult

### Community 22 - "Evaluation Harness"
Cohesion: 0.17
Nodes (19): capacityForIndex(), CapacityStrategy, evaluate(), EvaluationConfig, EvaluationRow, formatTable(), generateStudents(), generateTutors() (+11 more)

### Community 24 - "Notifications Module"
Cohesion: 0.16
Nodes (7): notifications, NotificationsRepository, Inject, Injectable, NotificationsService, NotificationType, Injectable

### Community 25 - "Auth Controller"
Cohesion: 0.30
Nodes (11): AuthController, ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags, Body, Controller (+3 more)

### Community 26 - "Onboarding DTOs"
Cohesion: 0.22
Nodes (17): AvailabilitySlotDto, OnboardStudentDto, OnboardTutorDto, OnboardUserDto, ApiProperty, ApiPropertyOptional, ArrayNotEmpty, IsArray (+9 more)

### Community 27 - "Exception Handling Docs"
Cohesion: 0.17
Nodes (16): AppLoggerService, CommonExceptionFilter, CommonModule, Exception Handling Guide, HttpLoggingInterceptor, IncompleteProfileException, No-Stack-Trace-In-Response Rule, Lessons Learned (+8 more)

### Community 28 - "Auth Guard & Token Service"
Cohesion: 0.23
Nodes (6): AuthGuard, Injectable, AuthTokenService, Injectable, AuthTokenClaims, TokenUse

### Community 29 - "Notifications Controller"
Cohesion: 0.19
Nodes (11): NotificationsController, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags, Controller, Get (+3 more)

### Community 30 - "Jest Config"
Cohesion: 0.15
Nodes (13): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment, testRegex, transform (+5 more)

### Community 31 - "Auth Types & Decorators"
Cohesion: 0.32
Nodes (4): AuthenticatedRequest, AccountRole, AuthenticatedRequest, AuthenticatedRequest

### Community 32 - "Auth Guards"
Cohesion: 0.18
Nodes (7): AuthenticatedRequest, OwnerOrAdminGuard, Injectable, RefreshAuthGuard, Injectable, RolesGuard, Injectable

### Community 33 - "JWT Key Apply Script"
Cohesion: 0.17
Nodes (10): access, envMap, envPath, exampleKeys, examplePath, fs, { generateKeyPairSync }, newEnv (+2 more)

### Community 34 - "Dev Dependencies & Commitlint"
Cohesion: 0.18
Nodes (11): @commitlint/cli, @commitlint/config-conventional, devDependencies, @commitlint/cli, @commitlint/config-conventional, @swc/cli, @types/passport-jwt, @types/supertest (+3 more)

### Community 35 - "Database Guidance Docs"
Cohesion: 0.20
Nodes (10): Database Guidance (agent-docs), Joined Reads to Avoid N+1, Availability/Preferences as Typed JSON, schema.ts as Source of Truth, Matchmaking-Test Module, Users Module, Matchmaking Test Endpoints, Users Endpoints (+2 more)

### Community 36 - "Architecture Docs"
Cohesion: 0.24
Nodes (10): Project Structure (agent-docs), Framework-Free Matchmaking Core, Agent Operating Guide, Controller-Service-Repository Layering, docs vs agent-docs Ownership Split, Feature Module Structure, TypeScript Path Aliases, Project Structure Documentation (docs) (+2 more)

### Community 37 - "API Docs"
Cohesion: 0.20
Nodes (10): Scheduling Module, API Documentation, Auth Endpoints, GET /matchmaking/candidates, POST /matchmaking/assignments/:id/feedback, POST /matchmaking/select, Schedules Endpoints, Environment Documentation (+2 more)

### Community 38 - "Optimization Report Docs"
Cohesion: 0.27
Nodes (10): POST /matchmaking/batch, Academic/Preference/Schedule/Fairness Scorers, Optimization Report — Greedy Engine, CompositeScorer, Evaluation Harness, Jain's Fairness Index, Lazy-Greedy Matching Engine, Min-Cost Max-Flow Optimal Baseline (+2 more)

### Community 39 - "JWT Access Strategy & Env"
Cohesion: 0.27
Nodes (7): JwtAccessStrategy, Injectable, getJwtAccessTokenPrivateKey(), getJwtAccessTokenPublicKey(), getJwtRefreshTokenPrivateKey(), getJwtRefreshTokenPublicKey(), normalizeJwtKey()

### Community 40 - "Runtime Dependencies"
Cohesion: 0.22
Nodes (9): axios, bytes, class-transformer, crypto-js, dependencies, axios, bytes, class-transformer (+1 more)

### Community 41 - "Database Module"
Cohesion: 0.36
Nodes (4): Global, DATABASE, DatabaseModule, Module

### Community 42 - "Path Alias Mapping"
Cohesion: 0.22
Nodes (9): moduleNameMapper, ^@app/(.*)$, ^@common/(.*)$, ^@config$, ^@configs/(.*)$, ^@core/(.*)$, ^@database$, ^@modules/(.*)$ (+1 more)

### Community 43 - "Matchmaking Roadmap Docs"
Cohesion: 0.25
Nodes (8): NoEligibleTutorsException, Core Matchmaking Roadmap and API Plan, Eligibility Filtering, Gender/Region Criteria Exclusion, Lazy vs Static One-Time Greedy Sorting, Score Breakdown JSON Persistence, Weight Adaptation, subjects Table

### Community 44 - "TS Build Config"
Cohesion: 0.25
Nodes (7): dist, node_modules, **/*spec.ts, test, ./tsconfig.json, exclude, extends

### Community 46 - "Admin Signup DTO"
Cohesion: 0.25
Nodes (7): AdminSignupDto, ApiProperty, ApiPropertyOptional, IsEmail, IsOptional, IsString, MinLength

### Community 47 - "Database Model Docs"
Cohesion: 0.57
Nodes (7): EMA Tutor Quality Feedback Loop, assignments Table, Database Model (docs), student_profiles Table, tutor_feedback Table, tutor_profiles Table, users Table

### Community 48 - "Nest CLI Config"
Cohesion: 0.29
Nodes (6): collection, compilerOptions, builder, deleteOutDir, $schema, sourceRoot

### Community 49 - "Package Manifest"
Cohesion: 0.29
Nodes (6): author, description, license, name, private, version

### Community 50 - "Lint-Staged Config"
Cohesion: 0.48
Nodes (7): lint-staged, docs/**/*.md, README.md, src/**/*.{ts,js,json}, test/**/*.{ts,js}, eslint --fix, prettier --write

### Community 51 - "JWT Key Generation Script"
Cohesion: 0.33
Nodes (4): access, { generateKeyPairSync }, out, refresh

### Community 52 - "JWT Refresh Strategy"
Cohesion: 0.40
Nodes (3): fromRefreshTokenBody(), JwtRefreshStrategy, Injectable

## Knowledge Gaps
- **235 isolated node(s):** `$schema`, `collection`, `sourceRoot`, `deleteOutDir`, `builder` (+230 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **62 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AuthenticatedUser` connect `Matchmaking DTOs & Auth Types` to `Auth Guards`, `Core Entities & Availability`, `Exception Filter & App Config`, `Sessions Module & DTOs`, `Feed Module & DTOs`, `Scheduling Module & DTOs`, `Messages Module & DTOs`, `JWT Access Strategy & Env`, `Dashboard Module`, `Auth Module & DTOs`, `Auth Service`, `JWT Refresh Strategy`, `Users Controller Decorators`, `Notifications Module`, `Auth Controller`, `Auth Guard & Token Service`, `Notifications Controller`, `Auth Types & Decorators`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Why does `AppDatabase` connect `Matchmaking DTOs & Auth Types` to `Core Entities & Availability`, `Sessions Module & DTOs`, `Feed Module & DTOs`, `Scheduling Module & DTOs`, `Messages Module & DTOs`, `Database Module`, `Dashboard Module`, `Notification Records & Service`, `User Records & Repository`, `Notifications Module`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `CurrentUser` connect `Sessions Module & DTOs` to `Matchmaking DTOs & Auth Types`, `Core Entities & Availability`, `Feed Module & DTOs`, `Scheduling Module & DTOs`, `Messages Module & DTOs`, `Dashboard Module`, `Auth Module & DTOs`, `Users Controller Decorators`, `Notifications Module`, `Auth Controller`, `Notifications Controller`, `Auth Types & Decorators`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _235 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Matchmaking DTOs & Auth Types` be split into smaller, more focused modules?**
  _Cohesion score 0.06337222603523221 - nodes in this community are weakly interconnected._
- **Should `Core Entities & Availability` be split into smaller, more focused modules?**
  _Cohesion score 0.05543071161048689 - nodes in this community are weakly interconnected._
- **Should `Exception Filter & App Config` be split into smaller, more focused modules?**
  _Cohesion score 0.05824561403508772 - nodes in this community are weakly interconnected._