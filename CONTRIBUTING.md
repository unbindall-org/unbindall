# Contributing

Thank you for improving Unbindall. The project should remain understandable to CS2 players and easy to review for maintainers with limited time. Participation is governed by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Local setup

1. Fork the repository and create a branch from `main`.
2. Copy `.env.example` to `.env` and add your own Neon development credentials.
3. Run `pnpm install` and `pnpm db:migrate`.
4. Start development with `pnpm dev`.

## Before opening a pull request

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

All four checks must pass. Keep each pull request focused on one change and include screenshots for visible UI changes.

Changes to persistence, authentication, or container operation must also pass the relevant extended suites:

```bash
pnpm test:db:up
pnpm test:integration
pnpm test:e2e
pnpm test:db:down
pnpm test:container
```

`test:integration` migrates the test-only PostgreSQL database from an empty schema before the suite. `test:e2e` requires a one-time Chromium installation with `pnpm exec playwright install chromium`. `test:container` builds the production container, checks the database-dependent health endpoint, simulates a database outage, and runs the small sign-in, autosave, and export load test.

## New commands

- Add only commands that currently exist in CS2.
- Complete the [maintenance and verification process](docs/command-catalog-maintenance.md) through evidence level E4 and include the verification record in the pull request.
- State the build, platform, context, source, and verification date in the pull request.
- Clearly separate client, server, practice, cheat-protected, and development commands.
- Add the value range, default value, and clear descriptions in both English and German.

## New modules

A module has one unique entry in `src/features/generator/modules/registry.ts`. Module data belongs in the versioned `GeneratorDocument`, not in unrelated local-storage keys. Every new output path must use the central serializer and have at least one test.

When the persisted document format changes, increment `GENERATOR_SCHEMA_VERSION` and add a backward-compatible migration in `normalizeDocument`.

## Commits and reviews

All new pull-request commits use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```text
feat(generator): add grenade practice preset
fix(auth): reject expired Steam nonce
docs(catalog): clarify E4 verification
build(deps): update Auth.js beta
```

Use one of `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `ci`, `chore`, `perf`, or `revert`, optionally followed by a lowercase scope. Add `!` before the colon for a breaking change and explain it in the commit body. Keep the subject at 100 characters or fewer. CI validates every commit added by a pull request, so the repository's old placeholder commits do not affect new contributions.

- Prefer small, descriptive commits that each leave the project in a coherent state.
- Do not commit secrets, `.env` files, or real player information.
- Do not mix dependency updates with feature changes.
- Explain behavior and motivation in the pull request; code alone is not a product decision.
- Add user-visible changes to the `Unreleased` section of [CHANGELOG.md](CHANGELOG.md).

## Dependency updates

Dependabot opens weekly pull requests for pnpm dependencies, GitHub Actions, and Docker. Auth.js packages are grouped so the production `next-auth` beta is reviewed together with its adapter. Do not merge dependency updates on a green lockfile alone: read upstream release notes, run the normal suite, and run authentication or migration integration tests when the affected package participates in those paths.

Major updates stay separate from grouped minor and patch updates. Security updates may override the normal grouping and should be prioritized. See [docs/releasing.md](docs/releasing.md) for release preparation and tagging.
