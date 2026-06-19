# Database Guidance

- Source of truth: `src/database/schema.ts`.
- Migration output: `drizzle/`.
- Workflow: update schema, run `pnpm run db:generate`, inspect generated SQL, then run `pnpm run db:migrate` against the intended database.
- Keep role-specific profile data in `student_profiles` and `tutor_profiles`; keep base identity and auth fields in `users`.
- Use joined repository reads for users plus profiles to avoid N+1 queries.
- Store availability and preference weights as typed JSON until the product needs independent querying over individual slots or weight fields.
