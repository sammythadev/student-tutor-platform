# Project Structure Documentation

## Overview

This backend is the NestJS application for a student tutor matchmaking
platform. The current codebase is still small, but the intended structure is a
modular backend that stays SOLID, keeps concerns isolated, and grows through
feature-owned domains under `src/modules/`.

## Table of Contents

- [Overview](#overview)
- [Structure](#structure)
- [App Module](#app-module)
- [Common Module](#common-module)
- [Configs](#configs)
- [Languages](#languages)
- [Migration](#migration)
- [Queues](#queues)
- [Router](#router)
- [Instrument](#instrument)
- [Migration File](#migration-file)
- [Modules](#modules)
- [Other Modules](#other-modules)

## Structure

```text
src
  ├── app
  ├── common
  ├── configs
  ├── languages
  ├── migration
  ├── modules
  ├── router
  ├── queues
  ├── instrument.ts
  ├── main.ts
  ├── migration.ts
  └── swagger.ts
docs
  ├── environment.md
  └── project-structure.md
test
```

Each folder serves a specific purpose, supporting modularity and maintainability.

## App Module

**Location:** `src/app/module/app.module.ts`

The App Module is the root module and entry point for the backend. It currently
orchestrates the core app shell by importing the shared common module and
registering the starter controller and service.

## Common Module

**Location:** `src/common/common.module.ts`

The Common Module is the shared backend layer for utilities and cross-cutting
behavior. Keep shared concerns here instead of mixing them into feature
modules.

## Configs

**Location:** `src/configs/`

The configs folder contains runtime helpers for environment loading and app
metadata, including:

- environment file loading
- logger level selection by environment
- app name, version, and Swagger path helpers

The `index.ts` file aggregates and exports config helpers for shared use.

## Languages

**Location:** `src/languages/`

The languages folder will hold internationalization resources when localization
is introduced.

## Migration

**Location:** `src/migration/`

The migration folder will hold database migration orchestration and seed logic
when the persistence layer is introduced.

## Queues

**Location:** `src/queues/`

The queues folder will hold background job processing once asynchronous work is
added.

## Router

**Location:** `src/router/`

The router folder will define route grouping and access-level organization when
the API expands beyond the starter shell.

## Instrument

**Location:** `src/instrument.ts`

The instrument file will eventually configure observability and monitoring.
This project currently uses `src/swagger.ts` for API documentation bootstrap.

## Migration File

**Location:** `src/migration.ts`

The migration file will act as the CLI entry point for migration and seeding
work when database tooling is added.

## Modules

**Location:** `src/modules/`

The modules folder contains all feature modules, each representing a distinct
domain or functionality in the application. Every module is self-contained and
follows the repository design pattern, ensuring clear separation of concerns
and scalability.

```text
module
  ├── bases
  ├── constants
  ├── controllers
  ├── decorators
  ├── docs
  ├── dtos
  ├── entities
  ├── enums
  ├── exceptions
  ├── factories
  ├── filters
  ├── guards
  ├── interceptors
  ├── interfaces
  ├── middlewares
  ├── pipes
  ├── processors
  ├── repositories
  ├── services
  ├── templates
  ├── utils
  └── validations
```

This structure ensures each feature is isolated, testable, and easy to
maintain.

Below are explanations for each section in a typical module:

- **Bases**: abstract base classes for shared functionality.
- **Constants**: static values and configuration constants.
- **Controllers**: API endpoint handlers that delegate to services.
- **Decorators**: custom metadata decorators.
- **Docs**: Swagger/OpenAPI decorators and documentation helpers.
- **DTOs**: request and response DTOs with validation.
- **Entities**: database entity types or row representations.
- **Enums**: type-safe enumerations.
- **Exceptions**: custom error classes.
- **Factories**: object creation helpers.
- **Filters**: exception and validation filters.
- **Guards**: authorization and access control logic.
- **Interfaces**: TypeScript contracts between module parts.
- **Interceptors**: request and response transformation.
- **Middlewares**: request preprocessing.
- **Pipes**: data transformation and validation.
- **Processors**: background job handlers.
- **Repositories**: data access layer only.
- **Services**: business logic and orchestration.
- **Templates**: reusable email or document templates.
- **Utils**: helper utilities specific to the module.
- **Validations**: custom validators and validation helpers.

## Other Modules

Below are explanations for the root folders and files outside `src/`:

### Folders

- **docs/**: backend documentation for contributors and maintainers.
- **test/**: test configuration and e2e coverage.

### Files

- **.commitlintrc**: commit message lint configuration.
- **.env.example**: sample environment variables for local setup.
- **.prettierignore**: files that should not be formatted by Prettier.
- **.prettierrc**: Prettier formatting rules.
- **.swcrc**: SWC compiler configuration for NestJS builds.
- **eslint.config.mjs**: ESLint flat configuration.
- **nest-cli.json**: Nest CLI build configuration.
- **package.json**: scripts and dependency manifest.
- **tsconfig.json**: TypeScript compiler configuration.
