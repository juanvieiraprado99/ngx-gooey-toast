# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Angular/TypeScript coding standards live in `.claude/CLAUDE.md` and are loaded automatically — this file covers architecture and commands instead. Library internals (effect system, animation pattern, API contracts) are documented in `projects/ngx-gooey-toast/CLAUDE.md`.

## What this is

`ngx-gooey-toast` is an Angular port of the React `goey-toast`: a morphing **pill → blob** toast. Distributed as a **standard installable npm package** built with ng-packagr — consumers `npm install ngx-gooey-toast` and import `GooeyToasterComponent`/`GooeyToastService`. **Zero runtime dependencies** (peer deps only); the spring engine is hand-rolled on `requestAnimationFrame` (no framer-motion).

## Commands

```bash
npm start                          # demo playground (serves the "demo" app project)
npm test                           # unit tests (Vitest via @angular/build:unit-test)
npm run build:lib                  # build the package → dist/ngx-gooey-toast
npm publish ./dist/ngx-gooey-toast # publish to npm
```

- Single test: filter by `describe`/`it` name with Vitest's `.only`, or pass `-t <name>` through the test builder.

## Changelog & releases (Conventional Commits)

Commits MUST follow [Conventional Commits](https://www.conventionalcommits.org/)
(`feat:`, `fix:`, `perf:`, `refactor:`, `chore:`, …). A `commit-msg` Husky hook runs
`commitlint` to enforce this — the commit message **is** the changelog source.

```bash
npm run release        # commit-and-tag-version: bumps the LIB version (projects/.../package.json),
                       # regenerates CHANGELOG.md from commits, commits, and tags vX.Y.Z
git push --follow-tags origin main
```

- `CHANGELOG.md` (repo root) is **generated** by `commit-and-tag-version` (config in `.versionrc.json`) — do not hand-edit.
- `scripts/changelog-to-ts.mjs` parses `CHANGELOG.md` → `src/app/changelog.data.ts` (committed). Wired into `prestart`/`prebuild` (`npm run changelog:build`) so the `/changelog` page always matches the file.
- Pushing a `v*` tag triggers `.github/workflows/release.yml`, which builds the lib and creates the GitHub Release from the matching changelog section (`scripts/extract-release-notes.mjs`). The npm-publish step is scaffolded but commented out (needs an `NPM_TOKEN` secret).
- First-time setup after clone: `npm install` runs the `prepare` script (installs Husky hooks).

## Architecture — library + demo workspace

Angular workspace with **two projects** (`angular.json`):

- `projects/ngx-gooey-toast/` — the **library** (`projectType: library`, builder `@angular/build:ng-packagr`). Source in `src/lib/`, public surface in `src/public-api.ts` (re-exports `src/lib/index.ts`). The publishable `package.json` (name, version, peerDeps) lives here, not at the repo root. **Edit here.**
- `demo` (root `src/`) — the demo playground (`projectType: application`). It imports the library **live from source** via the `ngx-gooey-toast` → `projects/ngx-gooey-toast/src/public-api.ts` path alias in `tsconfig.json`, so changes show up in `npm start` without rebuilding the lib.

`npm run build:lib` runs ng-packagr → emits FESM/DTS to `dist/ngx-gooey-toast`. Component CSS uses `styleUrl` (separate `.css`), which ng-packagr inlines. The root `package.json` stays `private: true` (workspace only).

## Component internals (`projects/ngx-gooey-toast/src/lib/`)

- `gooey-morph.ts` — the "gooey" shape is a **parametric SVG path** (`morphPath`, param `t` 0→1 = pill→blob; pill height `PH=34`), not a filter. `memoizePath` caches.
- `spring-animate.ts` — hand-rolled spring/tween engine driving the morph (`animate`, `squishSpring`). Returns an `AnimationController`.
- `gooey-toast.service.ts` — `GooeyToastService` (root singleton): `success/error/info/warning/show`, in-place `update`, `promise` lifecycle, `dismiss` (by id, by filter, or all). Returns toast ids.
- `gooey-toaster.component.ts` / `gooey-toast.component.ts` — the `<gooey-toaster>` host and individual toast. Inputs mirror React `GooeyToasterProps`.
- `index.ts` — the public barrel (re-exported by `src/public-api.ts`); keep exports in sync when adding public API.
- Styling is **component-scoped CSS** (no Tailwind required by the library). Stacking uses plain flexbox flow — none of the Sonner height-sync machinery the React version needed. Tailwind is only used by the demo page chrome.
