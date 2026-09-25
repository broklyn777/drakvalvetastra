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
- Read the root `ROADMAP.md` before starting a new larger task, and keep it as the shared source of truth for planned work.
- Run `npm test` and `npm run typecheck` before push/merge when the environment allows it.
- Do not claim tests or typechecks passed unless they were actually executed and verified.
- Record validation status clearly in the pull request description.
- Any pull request with player-visible changes must add one or more short, player-facing lines under `## Opublicerat` in `CHANGELOG.md`. Pure test, tooling, or internal maintenance changes do not need a changelog entry.
- Every working branch must also maintain its own file at `changelog/<branch-name-with-slashes-replaced-by-dashes>.md`, for example `changelog/feature-combat-loop.md`. The branch owner updates that file with each push so agents never edit the same branch log.
- Branch changelog files use this structure: branch name as the heading; one line with owner and status; one line with the Vercel preview URL; then the sections `## För spelaren`, `## Tekniskt`, and `## Verifierat`.
- Under `## Verifierat`, list only checks that were actually executed and verified. Never infer or assume test, typecheck, build, or browser validation.
- When a branch owner asks for review, include the Vercel preview URL in the form `https://drakvalvetastra-git-<branch>-broklyn777s-projects.vercel.app`.
- Use Swedish for narrative text and general interface copy, but use official English D&D rules terminology for player-facing game mechanics whenever practical, so terms can be searched directly in the original rules.
- Prefer original D&D labels such as `Human`, `Dwarf`, `Elf`, `Halfling`; `Fighter`, `Rogue`, `Wizard`, `Cleric`, `Ranger`, `Paladin`; `STR`, `DEX`, `CON`, `INT`, `WIS`, `CHA`; `AC`, `HP`, `DC`, `Initiative`, `Advantage`, `Disadvantage`, `Ability Check`, `Saving Throw`, `Fighting Style`, and official weapon/damage terminology.
- For D&D 2024 terminology, prefer `Species` over `Race` in new player-facing UI and documentation. Existing internal identifiers may remain unchanged unless a separate migration is explicitly approved.

<!-- END:drakvalvet-collaboration-rules -->
