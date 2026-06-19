# Lessons

- Prefer surgical schema changes: model only tables required by the current use case, and keep extensibility in JSON/value fields until query requirements justify new tables.
- Drizzle config should follow the current `defineConfig` pattern with `dialect`, `schema`, `out`, and `dbCredentials`; inspect generated SQL before migrating.
- Add bare path aliases when importing folder barrels such as `@database`; wildcard aliases like `@database/*` do not cover the bare import.
- Avoid N+1 reads in Nest modules by loading role-specific user profiles with one repository query and explicit joins.
- For seed scripts run through `ts-node`, explicitly reference local ambient declarations when third-party packages lack bundled types.
- Use Drizzle helpers such as `inArray` instead of hand-built `ANY(...)` SQL for parameter arrays; the generated SQL is safer and avoids PostgreSQL scalar-array mistakes.
