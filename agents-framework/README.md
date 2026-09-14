# Universal AI Agent Framework

This folder contains a set of Universal System Prompts (Agents) designed to be loaded into any modern AI coding harness (Oh My Pi, Claude Code, Cursor, Aider, etc.). 

By separating concerns into specialized personas, you ensure surgical, high-quality code generation and review.

## The Agents

1. **`environment-tuner-agent.md`**: Run this first in any new repository. It scans the environment and generates a `PROJECT_CONTEXT.md` rulebook. It allows the AI to "self-tune" to the specific stack and conventions of the repo.
2. **`orchestrator-agent.md`**: The project manager. You give it the human prompt, and it decomposes the work, delegates it, and manages the lifecycle.
3. **`frontend-agent.md`**: An elite React/Next.js/UI specialist. Enforces Server Components, Tailwind architecture, and surgical edits. Spawnable copy: `.opencode/agents/frontend.md` + `.claude/agents/frontend.md`.
4. **`designer-agent.md`**: Staff product designer + design engineer. Owns visual direction and its implementation, all `.agents/skills` routing, and responsive QA (390px + 1440px). Spawnable copy: `.opencode/agents/designer.md` + `.claude/agents/designer.md`.
5. **`backend-agent.md`**: An elite Node/API/DB specialist. Enforces DDD, clean architecture, typed exceptions, and database safety. Spawnable copy: `.opencode/agents/backend.md` + `.claude/agents/backend.md`.
6. **`reviewer-agent.md`**: The uncompromising gatekeeper. Audits the diffs produced by the coding agents for security, performance, and maintainability before finalizing. Spawnable copy: `.opencode/agents/code-reviewer.md` + `.claude/agents/code-reviewer.md` (read-only).

## ORCA lineage

Agent format follows [kazzzper/ORCA](https://github.com/kazzzper/ORCA) (union `name`/`description` + `mode`/`permission`/`tools` frontmatter, ORCA fan-out delegation, skill routing, `opencode.json` central permissions) — generalized from Next.js-only to framework-adaptive via each agent's Phase 0 environment self-tune, and extended with a dedicated `designer` owner plus a backend track for the NestJS+Drizzle API.

## Spawnable paths (harness auto-discovery)

- OpenCode: `.opencode/agents/<frontend|designer|backend|code-reviewer>.md` (+ root `opencode.json` permissions/MCP/skills)
- Claude Code: `.claude/agents/<frontend|designer|backend|code-reviewer>.md`
- Single-threaded (Cursor/Aider): adopt the persona inline from `agents-framework/` sequentially.

## How to use them

- **In Claude Code / Aider**: You can `@` mention these files or load them as custom system prompts. 
- **In Cursor**: You can copy the contents of the relevant agent into `.cursorrules` or use them as Context in the Composer.
- **In Custom Harnesses**: Use the `Orchestrator` prompt as the main system prompt, and provide it with tools to spawn sub-agents using the other markdown files as their specific system instructions.