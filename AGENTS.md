<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:drakvalvet-collaboration-rules -->

# Drakvalvet collaboration rules

- Use one branch per task or feature.
- Do not modify another agent's branch unless Björn explicitly asks for it.
- Review each other's pull requests and suggest changes there; the branch owner makes the code changes.
- Merge all work into `main` through pull requests.
- Björn decides what is merged into `main`.
- For shared areas such as combat balance or progression, agree on task ownership first and use a separate branch.
- Run `npm test` and `npm run typecheck` before push/merge when the environment allows it.
- Do not claim tests or typechecks passed unless they were actually executed and verified.
- Record validation status clearly in the pull request description.

<!-- END:drakvalvet-collaboration-rules -->
