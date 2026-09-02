# Releasing

Unbindall uses Semantic Versioning, annotated `vMAJOR.MINOR.PATCH` tags, a curated changelog, and GitHub Releases. The version in `package.json`, the changelog heading, the Git tag, and the GitHub Release must always agree.

## Prepare a release

1. Choose the next version according to Semantic Versioning.
2. Move the relevant entries from `Unreleased` into a dated `## [x.y.z] - YYYY-MM-DD` section in `CHANGELOG.md`.
3. Update `package.json` to the same version. The pnpm lockfile does not record the root package version.
4. Update the comparison links at the bottom of `CHANGELOG.md`.
5. Run the complete quality suite:

   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm build
   ```

6. Merge the release-preparation pull request into `main` using a Conventional Commit subject.

## Publish a release

From the repository's **Actions → Release → Run workflow** page, enter the version without the `v` prefix. The workflow only runs from `main`. It validates the version and changelog, reruns the quality suite, creates an annotated `vMAJOR.MINOR.PATCH` tag, pushes it, and publishes a GitHub Release using that version's changelog section.

Do not create or move version tags manually. If the workflow fails before pushing a tag, fix the release-preparation pull request and rerun it. If it fails after pushing a tag, investigate before changing any published Git history; published tags are treated as immutable.

## Release contents

Every user-visible change belongs in `CHANGELOG.md`. Use the headings `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, and `Security` as needed. Dependency-only pull requests may be grouped into one concise entry unless they change runtime behavior or address a vulnerability.

Database migrations must be backward-compatible with the deployment sequence described in the README. Mention required operator actions prominently in both the changelog and release notes.
