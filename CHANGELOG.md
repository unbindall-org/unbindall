# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Community health files and the Contributor Covenant Code of Conduct.
- Automated weekly dependency updates for pnpm, GitHub Actions, and Docker.
- A checked, manual workflow that creates an annotated version tag and GitHub release.
- Conventional Commit validation for all new pull-request commits.

### Changed

- Translated repository documentation and contribution templates to English.
- Restored Next.js production-build type checking for direct `next build` calls.
- Marked the repository as a pre-launch alpha and documented `unbindall.com` as the planned domain.
- Added repository metadata and a visible CI status badge for public sharing.
- Classified the shadcn CLI as a development dependency.
- Updated vulnerable transitive development dependencies and aligned Vite's esbuild peer dependency.

### Fixed

- Updated the authentication browser flow for the workspace start page.
- Stopped tracking Next.js' generated `next-env.d.ts` file so browser tests no longer dirty the worktree.
