# Repository Guidelines

## Project Structure & Module Organization

- `src/` — core CLI implementation (scan, rank, bundle, explain). Entry point is `src/index.ts`.
- `rules/` — heuristic configuration (`default.rules.json`).
- `tests/` — unit tests and fixtures (`tests/fixtures/`).
- `integrations/` — wrappers for MCP, Claude Code, and Codex workflows.
- `docs-site/` — VitePress documentation site.
- `docs/` — additional documentation and examples.

## Build, Test, and Development Commands

- `npm test` — run Vitest unit tests.
- `npm run build` — compile TypeScript into `dist/`.
- `npm run smoke` — run a CLI smoke test using a fixture repo.
- `npm run test:comment-parser` — verify PR comment parser logic.
- `npm run docs:dev` — run docs site locally.
- `npm run docs:build` — build static docs site.

## Coding Style & Naming Conventions

- Indentation: 2 spaces.
- TypeScript/Node ES modules (`"type": "module"`).
- Prefer small, single-purpose functions.
- File names use `camelCase` for TS modules (e.g., `scanRepo.ts`).
- Keep config-driven values in `rules/default.rules.json` (avoid hardcoded heuristics).

## Testing Guidelines

- Framework: Vitest.
- Test files live in `tests/` and use `*.test.ts` naming.
- Run all tests with `npm test`.
- Add fixture data to `tests/fixtures/` if needed.

## Commit & Pull Request Guidelines

- Commit messages are short, imperative summaries (e.g., “Add MCP server integration”).
- PRs should include:
  - Clear description of changes and rationale.
  - Linked issue if applicable.
  - Notes on tests run (`npm test`, `npm run build`).

## Security & Configuration Tips

- Do not read or include secrets in bundles. `.env` files are ignored by default.
- Use `--out .context-pack` for consistent output location.
- For integrations, prefer the installed CLI binary, fallback to `npx -y context-pack`.
