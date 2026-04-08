# Agent Instructions

This file defines repository-wide coding conventions for any AI coding agent.

## Scope

- Apply these rules to all generated or modified code in this repository.
- Prefer minimal, context-aware code changes; avoid unrelated refactors.

## Architecture and modules

- Organize backend code by feature module under `src/modules/<module-name>/`.
- Keep module boundaries clear with files such as:
  - `*.router.ts`
  - `*.controller.ts`
  - `*.service.ts`
  - request/schema/middleware files when needed
- Register new module routers from the central router entry with consistent names (`authRouter`, `userRouter`, etc.).

## Controller conventions

- Keep controllers thin: parse request, call service, return response.
- Prefer `wrapAsync(...)` for async controller handlers.
- `wrapAsync` is optional for intentionally synchronous handlers or when another centralized error strategy is used.
- Do not place business logic or database access directly in controllers.

## Route declaration comments

- Every new route must include a JSDoc-style comment block immediately above the route declaration.
- Use this format:

```ts
/**
 * @desc Login user with email and password
 * @route POST /auth/login
 * @access public
 */
router.post('/login', wrapAsync(authController.login))
```

## Service conventions

- Put business logic in service files.
- Throw typed errors (`ErrorWithStatus`, `EntityError`) from services instead of sending responses there.
- Add concise comments for non-obvious logic (business rules, edge cases).
- Do not add comments that only restate obvious code.

## Validation and error flow

- Validate input with shared validation utilities.
- Keep a single error flow through `error.middlewares.ts`.
- Use status constants from `constants/httpStatus.ts`.

## Imports

- Use internal alias imports with `~/`.
- Group imports as: external packages first, internal aliases after.

## Output constraints

- Do not create extra docs/notes files (`*.md`, `docs/*`, ADR, etc.) unless explicitly requested.
- Generate only code needed for the current task; avoid unrelated scaffolding.
