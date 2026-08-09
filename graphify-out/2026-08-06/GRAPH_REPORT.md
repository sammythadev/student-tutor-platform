# Graph Report - project  (2026-08-06)

## Corpus Check
- 380 files · ~313,339 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1906 nodes · 3494 edges · 180 communities (108 shown, 72 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.53)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `60eb2b96`
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
- AppLoggerService
- Agent Skill: Principal UI/UX Architect & Motion Choreographer (Awwwards-Tier)
- scroll-world
- page.tsx
- CORE DIRECTIVE: AWWWARDS-LEVEL IMAGE ART DIRECTION
- NotificationsController
- AuthTokenClaims
- auth.service.ts
- UpdateStudentPreferencesDto
- StudentList.tsx
- 2. THE COMBINATORIAL VARIATION ENGINE
- BookSessionDto
- 4. DESIGN ENGINEERING DIRECTIVES (Bias Correction)
- AppShell.tsx
- Pipeline: copy-paste scripts (bash 3.2 safe)
- 10. REFERENCE VOCABULARY (Pattern Names the Agent Should Know)
- tasteskill: Anti-Slop Frontend Skill
- CORE DIRECTIVE: AWWWARDS-LEVEL DESIGN ENGINEERING
- 22. STYLE VARIATION ENGINE
- Prompt templates & intake
- 11. COMPONENT EXECUTION GUIDELINES
- 18. EXTRA CREATIVITY & IMPLEMENTATION EDGE
- CalendarGrid.tsx
- 9. AI TELLS (Forbidden Patterns)
- 8. ANTI-AI-SLOP RULES
- BookSessionModal.tsx
- 11. REDESIGN PROTOCOL
- 3. DEFAULT ARCHITECTURE & CONVENTIONS
- 6. PERFORMANCE & ACCESSIBILITY GUARDRAILS
- Full-Output Enforcement
- 33. CATEGORY-SPECIFIC BIAS
- 13. COLOR & MATERIAL RULES
- 4. HERO MINIMALISM RULES
- package.json
- PinoLikeLogger
- 5. IMAGE COUNT & PAGE SLICING
- scripts
- 0. BRIEF INFERENCE (Read the Room Before Anything Else)
- 12. THE BLOCK LIBRARY (Contract - Implementations Land Here Iteratively)
- 5. CONTEXT-AWARE PROACTIVITY
- 8. DARK MODE PROTOCOL
- 21. MOBILE ANTI-AI-TELLS RULE
- RefreshTokenDto
- 7. DIAL DEFINITIONS (Technical Reference)
- 2. PLATFORM MODE RULE
- 37. EXAMPLE INTERPRETATIONS
- 15. DEFAULT SITE PACKS
- 20. EXAMPLE INTERPRETATIONS
- scrub-engine.js
- knockout.py
- lenis
- text-type.d.ts
- pg
- swagger-ui-express
- @commitlint/cli
- @nestjs/schematics
- @types/jest
- @types/jsonwebtoken
- @dnd-kit/core
- @dnd-kit/sortable
- @dnd-kit/utilities
- next.config.mjs
- gsap
- next
- react-dom
- three
- @types/three
- @vercel/analytics
- zustand

## God Nodes (most connected - your core abstractions)
1. `AppDatabase` - 80 edges
2. `AuthenticatedUser` - 78 edges
3. `CurrentUser` - 44 edges
4. `CORE DIRECTIVE: PREMIUM MOBILE APP IMAGE DIRECTION` - 39 edges
5. `scripts` - 39 edges
6. `apiErrorText()` - 26 edges
7. `CORE DIRECTIVE: AWWWARDS-LEVEL IMAGE ART DIRECTION` - 22 edges
8. `MatchmakingService` - 22 edges
9. `MatchmakingRepository` - 21 edges
10. `accentFg()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `bootstrap()` --indirect_call--> `AppLoggerService`  [INFERRED]
  backend/src/main.ts → backend/src/common/logger/app-logger.service.ts
- `MetricCard` --references--> `Accent`  [EXTRACTED]
  frontend/app/(app)/admin/page.tsx → frontend/lib/ui.ts
- `WeeklyHoursChart()` --calls--> `accentFg()`  [EXTRACTED]
  frontend/app/(app)/dashboard/StudentDashboard.tsx → frontend/lib/ui.ts
- `CapacityPanel()` --calls--> `accentFg()`  [EXTRACTED]
  frontend/app/(app)/dashboard/TutorDashboard.tsx → frontend/lib/ui.ts
- `ProfilePage()` --calls--> `getMe()`  [EXTRACTED]
  frontend/app/(app)/profile/page.tsx → frontend/lib/api/users.ts

## Import Cycles
- None detected.

## Communities (180 total, 72 thin omitted)

### Community 0 - "scripts"
Cohesion: 0.05
Nodes (39): scripts, build, build:dev, build:minified, clean, commitlint, db:generate, db:migrate (+31 more)

### Community 1 - "jest"
Cohesion: 0.15
Nodes (13): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment, testRegex, transform (+5 more)

### Community 2 - "evaluation-harness.ts"
Cohesion: 0.17
Nodes (18): jain(), runBaselineComparison(), evaluate(), EvaluationConfig, EvaluationRow, HEADER, mean(), runEvaluation() (+10 more)

### Community 3 - "package.json"
Cohesion: 0.29
Nodes (6): author, description, license, name, private, version

### Community 4 - "devDependencies"
Cohesion: 0.67
Nodes (3): typescript, typescript, typescript

### Community 5 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, bcrypt, body-parser, cookie-parser, crypto-js, bcrypt, body-parser, cookie-parser (+1 more)

### Community 6 - "axios"
Cohesion: 0.67
Nodes (3): axios, axios, axios

### Community 7 - "body-parser"
Cohesion: 0.15
Nodes (11): StudentProfileRecord, TutorProfileRecord, UserRecord, Inject, Injectable, UsersRepository, Injectable, UsersService (+3 more)

### Community 12 - "cookie-parser"
Cohesion: 0.08
Nodes (50): AdminPage(), EASE, ACCENTS, EASE, formatSessionTime(), KPI_FALLBACK_ACCENT, KPI_ICON, KpiCard() (+42 more)

### Community 14 - "crypto-js"
Cohesion: 0.08
Nodes (34): ProfilePage(), ProfileResponse, notificationRows, SettingsPage(), EASE, FindTutors(), matchReasons(), sizeMap (+26 more)

### Community 28 - "swagger-ui-express"
Cohesion: 0.08
Nodes (44): AssignmentPageDto, AssignmentResponseDto, AssignmentUpdateStatus, BatchMatchmakingResponseDto, CandidatePageDto, CandidateStudentDto, CandidateStudentPageDto, CandidateTutorDto (+36 more)

### Community 36 - "globals"
Cohesion: 0.11
Nodes (19): devDependencies, @commitlint/config-conventional, globals, @nestjs/cli, @swc/core, ts-loader, ts-prune, tsconfig-paths (+11 more)

### Community 40 - "@nestjs/cli"
Cohesion: 0.06
Nodes (34): 10. DEVICE MOCKUP FRAME RULE, 11. ONBOARDING FLOW RULE, 12. FIRST SCREEN CLEANLINESS RULE, 13. SAFE AREA AND SYSTEM REGION RULE, 14. NAVIGATION RULE, 15. CLEAN LAYOUT RULE, 16. CREATIVE IMAGE DIRECTION RULE, 17. BACKGROUND TEXTURE AND SURFACE RULE (+26 more)

### Community 41 - "@nestjs/schematics"
Cohesion: 0.12
Nodes (17): AuthenticatedRequest, AuthGuard, Injectable, AuthTokenService, Injectable, AccountRole, AuthenticatedUser, AuthenticatedRequest (+9 more)

### Community 48 - "@swc/core"
Cohesion: 0.10
Nodes (26): OnboardingPage(), OnboardingStep, EASE, MATCH_CRITERIA, SignupPage(), Input(), inputErrorStyle, inputFocusStyle (+18 more)

### Community 51 - "ts-loader"
Cohesion: 0.11
Nodes (24): AC, ACCENT_COLORS, AccentKey, addDays(), CalView, chipColor(), DAYS_FULL, DAYS_SHORT (+16 more)

### Community 53 - "ts-prune"
Cohesion: 0.13
Nodes (19): FeedPage(), TAG_COLORS, timeAgo(), SigninPage(), formatTime(), NotificationCard(), NotificationDetail(), NotificationsPanel() (+11 more)

### Community 55 - "tsconfig-paths"
Cohesion: 0.19
Nodes (22): AvailabilitySlotDto, CreateStudentProfileDto, CreateTutorProfileDto, CreateUserDto, PreferenceWeightsDto, StudentProfileResponseDto, ApiProperty, ApiPropertyOptional (+14 more)

### Community 57 - "@types/jsonwebtoken"
Cohesion: 0.23
Nodes (19): CurrentUser, SessionParamDto, SessionResponseDto, TransferSessionDto, IsUUID, SessionsController, ApiBearerAuth, ApiBody (+11 more)

### Community 60 - "typescript"
Cohesion: 0.13
Nodes (31): AuthTokenPair, NEST_TO_WINSTON, PinoFactory, stringifyMeta(), AppEnvironment, ENVIRONMENT_FILES, getAdminSignupCode(), getAppEnvironment() (+23 more)

### Community 61 - "typescript-eslint"
Cohesion: 0.19
Nodes (16): IsUUID, UserIdParamDto, ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags (+8 more)

### Community 62 - "AuthService"
Cohesion: 0.07
Nodes (35): CommonModule, Module, AuthController, ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags (+27 more)

### Community 63 - "FeedQueryDto"
Cohesion: 0.08
Nodes (33): ActiveTutorDto, CreatePostDto, FeedQueryDto, FeedResponseDto, PostAttachment, PostParamDto, PostResponseDto, TrendingTopicDto (+25 more)

### Community 64 - ".getTutorSlots"
Cohesion: 0.09
Nodes (24): ScheduleSlotRecord, SchedulingController, ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse (+16 more)

### Community 65 - "GreedyAssignmentEngine"
Cohesion: 0.09
Nodes (8): AssignmentLifecycle, CancellationResult, GreedyAssignmentEngine, AlgorithmWeights, AlgorithmWeightsInput, CriterionWeights, CriterionWeightsInput, Student

### Community 66 - "Roles"
Cohesion: 0.18
Nodes (5): DashboardRepository, Inject, Injectable, DashboardService, Injectable

### Community 67 - "algorithm.md — Authoritative Matchmaking Algorithm Spec"
Cohesion: 0.06
Nodes (30): 0. Notation, 10. Corrections Log — what was fixed and why, 1.1 Subject Eligibility — **[correction: hard filter, not weighted term]**, 1.2 Subject Depth (optional, replaces the old Sub weight), 1.3 Level Compatibility — **[correction: unbounded without clamping]**, 1.4 Experience & Quality — **[correction: same unbounded issue, plus missing cold start]**, 1.5 Combined Academic Score, 1. Algorithm 1 — Academic Compatibility (+22 more)

### Community 68 - "MessagesController"
Cohesion: 0.10
Nodes (22): GetConversationDto, MessageResponseDto, SendMessageDto, ApiProperty, ApiPropertyOptional, IsString, IsUUID, MessagesController (+14 more)

### Community 69 - "index.ts"
Cohesion: 0.13
Nodes (9): NewNotificationRecord, NotificationRecord, notifications, NotificationsRepository, Inject, Injectable, NotificationsService, NotificationType (+1 more)

### Community 70 - "schema.ts"
Cohesion: 0.07
Nodes (26): assignments, assignmentStatusEnum, deliveryModeEnum, formatPreferenceEnum, learningStyleEnum, MessageRecord, NewMessageRecord, NewPostRecord (+18 more)

### Community 71 - "AppDatabase"
Cohesion: 0.12
Nodes (9): AppDatabase, AppTransaction, messages, MatchmakingRepository, Inject, Injectable, MessagesRepository, Inject (+1 more)

### Community 72 - "Student Tutor Matchmaking Platform"
Cohesion: 0.09
Nodes (21): API Endpoints, Architecture Flow, Assignment Algorithm (Lazy Greedy), Baseline comparison (`eval:baselines`), CLI: Evaluation Scripts, Commands, Component Architecture, Core Matchmaking Engine (+13 more)

### Community 73 - "optimal-baseline.ts"
Cohesion: 0.10
Nodes (23): BaselineRow, bestEligible(), HEADER, Picker, SCENARIOS, selectScenarios(), selectStrategies(), STRATEGIES (+15 more)

### Community 74 - "OnboardStudentDto"
Cohesion: 0.22
Nodes (18): AvailabilitySlotDto, OnboardStudentDto, OnboardTutorDto, OnboardUserDto, ApiProperty, ApiPropertyOptional, ArrayNotEmpty, IsArray (+10 more)

### Community 75 - "MatchmakingTestController"
Cohesion: 0.22
Nodes (7): MatchmakingTestController, ApiOperation, ApiResponse, ApiTags, Controller, Get, Inject

### Community 76 - "SessionsRepository"
Cohesion: 0.15
Nodes (5): SessionsRepository, Inject, Injectable, SessionsService, Injectable

### Community 77 - "matchmaking.repository.ts"
Cohesion: 0.33
Nodes (6): scheduleSlots, sessions, studentProfiles, tutorProfiles, users, BatchPersistResult

### Community 78 - "greedy-assignment.engine.ts"
Cohesion: 0.19
Nodes (7): AssignBatchOptions, AssignmentRunResult, AssignmentStats, CandidatePair, EligibilityResult, RankedTutor, TopKRanker

### Community 79 - "CompositeScorer"
Cohesion: 0.27
Nodes (4): CompositeScorer, computeOptimal(), greedyStaticTotal(), MinCostMaxFlow

### Community 80 - "feed.repository.ts"
Cohesion: 0.22
Nodes (4): posts, FeedRepository, Inject, Injectable

### Community 81 - "apply-jwt-keys.js"
Cohesion: 0.17
Nodes (10): access, envMap, envPath, exampleKeys, examplePath, fs, { generateKeyPairSync }, newEnv (+2 more)

### Community 82 - "composite.scorer.ts"
Cohesion: 0.26
Nodes (3): AcademicScore, AcademicScorer, ScheduleScorer

### Community 83 - "baseline-comparison.ts"
Cohesion: 0.09
Nodes (21): APPENDICES - Real Source-Backed Reference Material, Appendix A - Install Commands per Design System, Appendix B - Canonical Sources (read these before reinventing), Appendix C - Apple Liquid Glass: Honest Web Approximation, Apple Liquid Glass (Apple platforms only), Atlassian, Bootstrap, Carbon (+13 more)

### Community 84 - "index.ts"
Cohesion: 0.24
Nodes (5): IncompleteProfileException, TutorCapacityExceededException, slot(), student(), tutor()

### Community 86 - "MessagesRepository"
Cohesion: 0.10
Nodes (19): Code Quality, Color and Surfaces, Component Patterns, Content, Design Audit, Fix Priority, How This Works, Iconography (+11 more)

### Community 87 - "nigerian-secondary.seed.ts"
Cohesion: 0.24
Nodes (10): getDatabaseUrl(), subjects, tutorSubjects, FIRST_NAMES, LAST_NAMES, pickSpecializations(), REGIONS, SECONDARY_SUBJECTS (+2 more)

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

### Community 100 - "@commitlint/config-conventional"
Cohesion: 0.11
Nodes (19): @base-ui/react, class-variance-authority, clsx, dependencies, @base-ui/react, class-variance-authority, clsx, lucide-react (+11 more)

### Community 102 - "@types/node"
Cohesion: 0.11
Nodes (18): @types/node, dotenv-cli, devDependencies, dotenv-cli, postcss, shadcn, tailwindcss, @tailwindcss/postcss (+10 more)

### Community 103 - "@types/pg"
Cohesion: 0.17
Nodes (11): Roles(), RolesGuard, Injectable, DashboardController, ApiBearerAuth, ApiOperation, ApiResponse, ApiTags (+3 more)

### Community 110 - "AppLoggerService"
Cohesion: 0.16
Nodes (6): CommonExceptionFilter, HttpLoggingInterceptor, Injectable, AppLoggerService, Injectable, Catch

### Community 111 - "Agent Skill: Principal UI/UX Architect & Motion Choreographer (Awwwards-Tier)"
Cohesion: 0.11
Nodes (17): 1. Meta Information & Core Directive, 2. THE "ABSOLUTE ZERO" DIRECTIVE (STRICT ANTI-PATTERNS), 3. THE CREATIVE VARIANCE ENGINE, 4. HAPTIC MICRO-AESTHETICS (COMPONENT MASTERY), 5. MOTION CHOREOGRAPHY (FLUID DYNAMICS), 6. PERFORMANCE GUARDRAILS, 7. EXECUTION PROTOCOL, 8. PRE-OUTPUT CHECKLIST (+9 more)

### Community 112 - "scroll-world"
Cohesion: 0.11
Nodes (17): A) Continuous forward take — RECOMMENDED for grounded / realistic / walkthrough, B) Dive-in + aerial connector — only for diorama / miniature / god's-eye worlds, Camera grammar — the move should fit the concept (A is NOT "forward only"), Gotchas (hard-won), Monid backend — the DEFAULT chain biller (qualified 2026-07-25), References, scroll-world, Step 0 — Bootstrap (+9 more)

### Community 113 - "page.tsx"
Cohesion: 0.11
Nodes (3): HOW_STEPS, MATCH_STEPS, STATS

### Community 114 - "CORE DIRECTIVE: AWWWARDS-LEVEL IMAGE ART DIRECTION"
Cohesion: 0.12
Nodes (16): 10. SECTION RHYTHM RULE, 12. DENSITY & SPACING DISCIPLINE, 14. IMAGE / MEDIA DIRECTION, 16. MULTI-IMAGE CONSISTENCY RULE, 17. CLARITY CHECK, 19. RESPONSE BEHAVIOR, 1. ACTIVE BASELINE CONFIGURATION, 21. FINAL GOAL (+8 more)

### Community 115 - "NotificationsController"
Cohesion: 0.19
Nodes (11): NotificationsController, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags, Controller, Get (+3 more)

### Community 116 - "AuthTokenClaims"
Cohesion: 0.16
Nodes (7): AuthTokenClaims, TokenUse, JwtAccessStrategy, Injectable, fromRefreshTokenBody(), JwtRefreshStrategy, Injectable

### Community 117 - "auth.service.ts"
Cohesion: 0.28
Nodes (8): LearningStylePreference, _roleParity, UserRole, IMPORTANT: default capacity to 5 so new tutors are always eligible in matchmakin, StudentProfileUpdate, TutorProfileUpdate, UserUpdate, toPublicUserWithProfiles()

### Community 118 - "UpdateStudentPreferencesDto"
Cohesion: 0.22
Nodes (15): NotificationPrefsDto, ApiPropertyOptional, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional (+7 more)

### Community 119 - "StudentList.tsx"
Cohesion: 0.19
Nodes (11): EASE, StudentList(), studentReasons(), EASE, MatchRing(), MatchRingProps, MessageModal(), MessageModalProps (+3 more)

### Community 120 - "2. THE COMBINATORIAL VARIATION ENGINE"
Cohesion: 0.14
Nodes (14): 2. THE COMBINATORIAL VARIATION ENGINE, Background Character, Background Mode (per-section), Composition Anchor (per-section), CTA Variation, Hero Architecture, Hero Scale (per-page), Motion-Implied Language (+6 more)

### Community 121 - "BookSessionDto"
Cohesion: 0.27
Nodes (10): BookSessionDto, ProposeSessionDto, SessionStatus, ApiProperty, ApiPropertyOptional, IsEnum, IsOptional, IsString (+2 more)

### Community 122 - "4. DESIGN ENGINEERING DIRECTIVES (Bias Correction)"
Cohesion: 0.17
Nodes (12): 4.10 Quotes & Testimonials, 4.11 Page Theme Lock (Light / Dark Mode Consistency), 4.1 Typography, 4.2 Color Calibration, 4.3 Layout Diversification, 4.4 Materiality, Shadows, Cards, 4.5 Interactive UI States, 4.6 Data & Form Patterns (+4 more)

### Community 123 - "AppShell.tsx"
Cohesion: 0.20
Nodes (10): ACCENT_COLORS, applyTheme(), AppShell(), AppShellProps, NAV_ITEMS, SPRING_DRAWER, SPRING_NAV, SPRING_PAGE (+2 more)

### Community 124 - "Pipeline: copy-paste scripts (bash 3.2 safe)"
Cohesion: 0.18
Nodes (10): 1. Scene stills (Step 2), 2. Dive-in clips (Step 4), 3. Extract boundary frames — the seam handoff (Step 5), 4. Connector clips (Step 5), 5. Encode everything for scrubbing (Step 6), 6. Centre-crop mobile encodes — FALLBACK ONLY, not the mobile version, 6b. Native 9:16 portrait chain — THE mobile version (Step 1.6 opt-in), 7. Monid backend — Seedance 2.0 pay-per-clip (the DEFAULT; qualified 2026-07-25) (+2 more)

### Community 125 - "10. REFERENCE VOCABULARY (Pattern Names the Agent Should Know)"
Cohesion: 0.20
Nodes (10): 10. REFERENCE VOCABULARY (Pattern Names the Agent Should Know), Animation Library Choice, Cards & Containers, Galleries & Media, Hero Paradigms, Layout & Grids, Micro-Interactions & Effects, Navigation & Menus (+2 more)

### Community 126 - "tasteskill: Anti-Slop Frontend Skill"
Cohesion: 0.20
Nodes (10): 13. OUT OF SCOPE, 14. FINAL PRE-FLIGHT CHECK, 1.A Dial Inference (design read → dial values), 1.B Use-Case Presets, 1.C How the Dials Drive Output, 1. THE THREE DIALS (Core Configuration), 2.A When to reach for a real design system (use official packages), 2.B When the brief is an aesthetic, not a system (+2 more)

### Community 127 - "CORE DIRECTIVE: AWWWARDS-LEVEL DESIGN ENGINEERING"
Cohesion: 0.20
Nodes (9): 1. PYTHON-DRIVEN TRUE RANDOMIZATION (BREAKING THE LOOP), 2. AIDA STRUCTURE & SPACING, 3. HERO ARCHITECTURE & THE 2-LINE IRON RULE, 4. THE GAPLESS BENTO GRID, 5. ADVANCED GSAP MOTION & HOVER PHYSICS, 6. COMPONENT ARSENAL & CREATIVITY, 7. CONTENT, ASSETS & STRICT BANS, 8. MANDATORY PRE-FLIGHT <design_plan> (+1 more)

### Community 128 - "22. STYLE VARIATION ENGINE"
Cohesion: 0.20
Nodes (10): 22. STYLE VARIATION ENGINE, Decorative Asset Set, Image Art Direction Bias, Motion-Implied Language, Palette Logic, Signature Component Set, Structure Bias, Texture / Surface Treatment (+2 more)

### Community 129 - "Prompt templates & intake"
Cohesion: 0.20
Nodes (9): Connector clip prompt (Step 5), Copy per section (for the engine config), Dive-in clip prompt (Step 4), Intake checklist (Step 1), Leg prompt — architecture A, continuous forward take (Step 4), Mid-leg move library (pick by concept; omit for a plain glide), Prompt templates & intake, Scene still prompt (Step 2) (+1 more)

### Community 130 - "11. COMPONENT EXECUTION GUIDELINES"
Cohesion: 0.22
Nodes (9): 11. COMPONENT EXECUTION GUIDELINES, 3D Cascading Card Deck, Diagonal Staggered Square Masonry, Hover-Accordion Slice Layout, Off-Grid Editorial Layout, Pristine Gapless Bento Grid, Product UI Panel Stack, Turning Polaroid Arc (+1 more)

### Community 131 - "18. EXTRA CREATIVITY & IMPLEMENTATION EDGE"
Cohesion: 0.22
Nodes (9): 18. EXTRA CREATIVITY & IMPLEMENTATION EDGE, Composition variety check, Conversion focus, Cross-section contrast, CTA specificity, Cultural / tonal alignment, Data-viz restraint, Image variety inside one comp (+1 more)

### Community 132 - "CalendarGrid.tsx"
Cohesion: 0.28
Nodes (8): MetricCard, ACCENT_COLORS, CalendarEvent, CalendarGrid(), CalendarGridProps, DAYS, TIMES, Accent

### Community 133 - "9. AI TELLS (Forbidden Patterns)"
Cohesion: 0.25
Nodes (8): 9.A Visual & CSS, 9. AI TELLS (Forbidden Patterns), 9.B Typography, 9.C Layout & Spacing, 9.D Content & Data ("Jane Doe" Effect), 9.E External Resources & Components, 9.F Production-Test Tells (banned outright), 9.G EM-DASH BAN (the single most-violated Tell)

### Community 134 - "8. ANTI-AI-SLOP RULES"
Cohesion: 0.25
Nodes (8): 8. ANTI-AI-SLOP RULES, Carousel / marquee slop (layout), Content slop, Data / KPI slop, Density slop, Layout slop, Typography slop, Visual slop

### Community 135 - "BookSessionModal.tsx"
Cohesion: 0.32
Nodes (6): BookSessionModal(), BookSessionModalProps, TIME_OPTIONS, TimeSlot, todayString(), selectTutor()

### Community 136 - "11. REDESIGN PROTOCOL"
Cohesion: 0.29
Nodes (7): 11.A Detect the Mode (first action), 11.B Audit Before Touching, 11.C Preservation Rules, 11.D Modernisation Levers (priority order), 11.E Decision Tree: Targeted Evolution vs Full Redesign, 11.F What Never Changes Silently, 11. REDESIGN PROTOCOL

### Community 137 - "3. DEFAULT ARCHITECTURE & CONVENTIONS"
Cohesion: 0.29
Nodes (7): 3.A Stack, 3.B State, 3.C Icons, 3.D Emoji Policy, 3. DEFAULT ARCHITECTURE & CONVENTIONS, 3.E Responsiveness & Layout Mechanics, 3.F Dependency Verification (mandatory)

### Community 138 - "6. PERFORMANCE & ACCESSIBILITY GUARDRAILS"
Cohesion: 0.29
Nodes (7): 6.A Hardware Acceleration, 6.B Reduced Motion (mandatory), 6.C Dark Mode (mandatory for any consumer-facing page), 6.D Core Web Vitals Targets, 6.E DOM Cost, 6.F Z-Index Restraint, 6. PERFORMANCE & ACCESSIBILITY GUARDRAILS

### Community 139 - "Full-Output Enforcement"
Cohesion: 0.29
Nodes (6): Banned Output Patterns, Baseline, Execution Process, Full-Output Enforcement, Handling Long Outputs, Quick Check

### Community 140 - "33. CATEGORY-SPECIFIC BIAS"
Cohesion: 0.29
Nodes (7): 33. CATEGORY-SPECIFIC BIAS, Commerce, Fintech, Health / Fitness, Productivity, Social, Wellness / Lifestyle

### Community 141 - "13. COLOR & MATERIAL RULES"
Cohesion: 0.29
Nodes (7): 13. COLOR & MATERIAL RULES, Background Confidence Rule, Background-image harmony, Gradient Discipline, Materiality, Palette Discipline, Strong guidance

### Community 142 - "4. HERO MINIMALISM RULES"
Cohesion: 0.29
Nodes (7): 4. HERO MINIMALISM RULES, Absolute Hero Rules, Graphic Restraint, Headline Rule, Hero Composition Bias, Pre-output check, Typography Execution

### Community 143 - "package.json"
Cohesion: 0.29
Nodes (6): name, hono, pnpm, overrides, private, version

### Community 145 - "5. IMAGE COUNT & PAGE SLICING"
Cohesion: 0.33
Nodes (6): 5. IMAGE COUNT & PAGE SLICING, Continuity Rule, Counting rule, Format, Section size variety, THIS IS THE PRIMARY OUTPUT RULE

### Community 146 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, typecheck

### Community 147 - "0. BRIEF INFERENCE (Read the Room Before Anything Else)"
Cohesion: 0.40
Nodes (5): 0.A Read these signals first, 0.B Output a one-line "Design Read" before generating, 0. BRIEF INFERENCE (Read the Room Before Anything Else), 0.C If the brief is ambiguous, ask one question, do not guess, 0.D Anti-Default Discipline

### Community 148 - "12. THE BLOCK LIBRARY (Contract - Implementations Land Here Iteratively)"
Cohesion: 0.40
Nodes (5): 12.A File Location, 12.B Required Frontmatter, 12.C Required Body Sections, 12.D Block-Library Discipline, 12. THE BLOCK LIBRARY (Contract - Implementations Land Here Iteratively)

### Community 149 - "5. CONTEXT-AWARE PROACTIVITY"
Cohesion: 0.40
Nodes (5): 5.A Sticky-Stack - Canonical Skeleton, 5.B Horizontal-Pan - Canonical Skeleton, 5.C Scroll-Reveal Stagger - Canonical Skeleton (lighter alternative), 5. CONTEXT-AWARE PROACTIVITY, 5.D Forbidden Animation Patterns

### Community 150 - "8. DARK MODE PROTOCOL"
Cohesion: 0.40
Nodes (5): 8.A Token Strategy (pick one, stick to it), 8.B Do Not Prescribe Specific Colors Here, 8.C Default Mode, 8.D Test in Both Modes Before Finishing, 8. DARK MODE PROTOCOL

### Community 151 - "21. MOBILE ANTI-AI-TELLS RULE"
Cohesion: 0.40
Nodes (5): 21. MOBILE ANTI-AI-TELLS RULE, Copy AI tells, Layout AI tells, UI clutter tells, Visual AI tells

### Community 152 - "RefreshTokenDto"
Cohesion: 0.50
Nodes (3): RefreshTokenDto, ApiProperty, IsJWT

### Community 153 - "7. DIAL DEFINITIONS (Technical Reference)"
Cohesion: 0.50
Nodes (4): 7. DIAL DEFINITIONS (Technical Reference), DESIGN_VARIANCE (Level 1-10), MOTION_INTENSITY (Level 1-10), VISUAL_DENSITY (Level 1-10)

### Community 154 - "2. PLATFORM MODE RULE"
Cohesion: 0.50
Nodes (4): 2. PLATFORM MODE RULE, Android-native premium, Cross-platform premium neutral, iOS-native premium

### Community 155 - "37. EXAMPLE INTERPRETATIONS"
Cohesion: 0.50
Nodes (4): 37. EXAMPLE INTERPRETATIONS, Example 1, Example 2, Example 3

### Community 156 - "15. DEFAULT SITE PACKS"
Cohesion: 0.50
Nodes (4): 12-section pack, 15. DEFAULT SITE PACKS, 4-section pack, 8-section pack

### Community 157 - "20. EXAMPLE INTERPRETATIONS"
Cohesion: 0.50
Nodes (4): 20. EXAMPLE INTERPRETATIONS, Example 1, Example 2, Example 3

### Community 158 - "scrub-engine.js"
Cohesion: 0.83
Nodes (3): injectCSS(), mountScrollWorld(), seedParticles()

### Community 160 - "lenis"
Cohesion: 0.67
Nodes (3): useSmoothScroll(), lenis, lenis

## Knowledge Gaps
- **670 isolated node(s):** `0.A Read these signals first`, `0.B Output a one-line "Design Read" before generating`, `0.C If the brief is ambiguous, ask one question, do not guess`, `0.D Anti-Default Discipline`, `1.A Dial Inference (design read → dial values)` (+665 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **72 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AuthenticatedUser` connect `@nestjs/schematics` to `.getTutorSlots`, `MessagesController`, `@types/pg`, `swagger-ui-express`, `NotificationsController`, `AuthTokenClaims`, `auth.service.ts`, `@types/jsonwebtoken`, `typescript`, `typescript-eslint`, `AuthService`, `FeedQueryDto`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `AppDatabase` connect `AppDatabase` to `.getTutorSlots`, `Roles`, `index.ts`, `body-parser`, `MatchmakingTestController`, `SessionsRepository`, `matchmaking.repository.ts`, `feed.repository.ts`, `auth.service.ts`, `swagger-ui-express`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `CurrentUser` connect `@types/jsonwebtoken` to `.getTutorSlots`, `MessagesController`, `@types/pg`, `@nestjs/schematics`, `NotificationsController`, `swagger-ui-express`, `typescript-eslint`, `AuthService`, `FeedQueryDto`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `0.A Read these signals first`, `0.B Output a one-line "Design Read" before generating`, `0.C If the brief is ambiguous, ask one question, do not guess` to the rest of the system?**
  _670 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `body-parser` be split into smaller, more focused modules?**
  _Cohesion score 0.1477832512315271 - nodes in this community are weakly interconnected._
- **Should `cookie-parser` be split into smaller, more focused modules?**
  _Cohesion score 0.08361581920903954 - nodes in this community are weakly interconnected._