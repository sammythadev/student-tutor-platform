# Graph Report - project  (2026-07-19)

## Corpus Check
- 366 files · ~252,611 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 226 nodes · 242 edges · 62 communities (6 shown, 56 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8735cdcd`
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

## God Nodes (most connected - your core abstractions)
1. `scripts` - 38 edges
2. `jest` - 9 edges
3. `moduleNameMapper` - 9 edges
4. `evaluate()` - 8 edges
5. `lint-staged` - 5 edges
6. `generateTutors()` - 5 edges
7. `prettier --write` - 4 edges
8. `moduleFileExtensions` - 4 edges
9. `generateStudents()` - 4 edges
10. `runOptimalityGap()` - 4 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (62 total, 56 thin omitted)

### Community 0 - "scripts"
Cohesion: 0.05
Nodes (38): scripts, build, build:dev, build:minified, clean, commitlint, db:generate, db:migrate (+30 more)

### Community 1 - "jest"
Cohesion: 0.09
Nodes (22): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, moduleNameMapper, rootDir, testEnvironment, testRegex (+14 more)

### Community 2 - "evaluation-harness.ts"
Cohesion: 0.17
Nodes (19): capacityForIndex(), CapacityStrategy, evaluate(), EvaluationConfig, EvaluationRow, formatTable(), generateStudents(), generateTutors() (+11 more)

### Community 3 - "package.json"
Cohesion: 0.19
Nodes (13): author, description, license, lint-staged, docs/**/*.md, README.md, src/**/*.{ts,js,json}, test/**/*.{ts,js} (+5 more)

### Community 4 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, @commitlint/cli, @commitlint/config-conventional, @eslint/js, @types/jest, @types/node, @commitlint/cli, @commitlint/config-conventional (+3 more)

### Community 5 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, bcrypt, passport-oauth, pg, rxjs, bcrypt, passport-oauth, pg (+1 more)

## Knowledge Gaps
- **130 isolated node(s):** `name`, `version`, `description`, `author`, `private` (+125 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **56 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `package.json`, `cross-env`, `drizzle-kit`, `eslint`, `eslint-config-prettier`, `@eslint/eslintrc`, `eslint-plugin-prettier`, `globals`, `husky`, `jest`, `lint-staged`, `@nestjs/cli`, `@nestjs/schematics`, `@nestjs/testing`, `prettier`, `rimraf`, `source-map-support`, `supertest`, `@swc/cli`, `@swc/core`, `@swc/jest`, `ts-jest`, `ts-loader`, `ts-node`, `ts-prune`, `tsc-alias`, `tsconfig-paths`, `@types/express`, `@types/jsonwebtoken`, `@types/passport-jwt`, `@types/supertest`, `typescript`, `typescript-eslint`?**
  _High betweenness centrality (0.490) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`, `axios`, `body-parser`, `bytes`, `class-transformer`, `class-validator`, `compression`, `cookie-parser`, `cors`, `crypto-js`, `drizzle-orm`, `helmet`, `jsonwebtoken`, `@nestjs/axios`, `@nestjs/common`, `@nestjs/core`, `@nestjs/passport`, `nestjs-pino`, `@nestjs/platform-express`, `@nestjs/swagger`, `passport`, `passport-jwt`, `reflect-metadata`, `swagger-ui-express`, `winston`?**
  _High betweenness centrality (0.391) - this node is a cross-community bridge._
- **Why does `scripts` connect `scripts` to `package.json`?**
  _High betweenness centrality (0.273) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _130 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `jest` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._