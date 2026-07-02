# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is the **library project** of the workspace. Workspace-wide commands, release flow, and coding standards live in the root `CLAUDE.md` / `.claude/CLAUDE.md` — this file covers the library's internals.

## Commands (run from the repo root)

```bash
npm run build:lib   # ng-packagr → dist/ngx-gooey-toast (FESM + DTS)
npm test            # Vitest — the lib's tests live in the DEMO project: src/gooey-toast-lib.spec.ts
npm start           # demo serves this lib live from source (tsconfig path alias), no rebuild needed
```

- The lib's unit tests import from `'ngx-gooey-toast'` (the path alias) plus deep imports for non-exported helpers; add new tests to `src/gooey-toast-lib.spec.ts` at the repo root's `src/`.
- This `package.json` (not the root one) is the published manifest — name, version, peerDeps. `npm run release` bumps the version **here**.

## Architecture — who owns what

Three layers, one global store:

1. **`GooeyToastService`** (root singleton) — all state: global config signals, the visible `toasts` list, the overflow `queue`, history + replay closures, aria announcements. The imperative API (`show/success/error/warning/info/promise/update/dismiss`). **Components never mutate the list directly**; a toast asks to leave via `entry.exitRequest`, plays its exit, then calls `service.remove(id, reason)`, which drains the queue.
2. **`GooeyToasterComponent`** — thin host. Pushes its inputs into the service's config signals each change (which is why **only one toaster may be rendered per app** — last writer wins). Owns stack ordering (`orderStack`), FLIP shift animation, the metaball merge layer, and the two aria-live mirrors.
3. **`GooeyToastComponent`** — one live toast. All morph/squish/swipe behavior lives here as numbered effects (`E1`–`E16` in `registerEffects()`), each a port of a React `useEffect`; tracked signal reads are the deps, the body runs inside `untracked()`.

### The animation pattern (load-bearing)

Per-frame data (`morphT`, `aDims`, controllers) lives in **plain fields, not signals**, and is written straight to the DOM (`flush()` sets the SVG path `d` + wrapper/content constraints). This deliberately bypasses change detection at 60fps. Reactive state (phase, showBody, hovered…) uses signals. Don't "fix" this by converting the per-frame fields to signals.

- `gooey-morph.ts`: the blob is a **parametric path** (`morphPath`/`morphPathCenter`, `t` 0→1 pill→blob, pill height `PH=34`), memoized per-args — not an SVG filter. The filter (`feGaussianBlur`+`feColorMatrix`) is only used by the toaster's opt-in merge layer, which clones each toast's path every rAF via `getScreenCTM()` (read-all-then-write-all to avoid layout thrash).
- `spring-animate.ts`: zero-dep `animate(from, to, opts)` clone of framer-motion's subset (analytic spring + cubic-bezier tween). Every controller must be `.stop()`ed on destroy.
- Two auto-dismiss paths in the component: **E14** (simple pill, uses `entry.duration` directly) and **E8** (expanded blob: duration minus expand delay minus collapse time, then collapse → E10 leaves). Hover **and keyboard focus** pause both (WCAG 2.2.1); `Infinity` duration arms neither.

### Contracts to keep

- `entry.duration` is the single resolved value (`timing.displayDuration ?? options.duration ?? service.defaultDuration()`); never re-read `timing`/options downstream — E8, E14, and the progress bar all consume `entry.duration`.
- Mutable per-toast state on `GooeyToastEntry` is signals (so `update()`/`promise()` re-render in place); static config is plain readonly fields.
- Rich content (`{ html }`/`{ markdown }`) is **always** routed through `DomSanitizer.sanitize(SecurityContext.HTML, …)` — `renderMarkdown` pre-escapes and whitelists (links: http/https/mailto only). Never introduce `bypassSecurityTrust*`.
- Coalescing matches type+title+string-description across visible toasts **and** the queue; toasts tracked by id for `update()` must opt out (`coalesce: false`).
- `index.ts` is the public barrel (re-exported by `src/public-api.ts`) — keep it in sync when adding public API, and mirror doc changes in the demo's `docs.component.ts` tables.
- Styling is component-scoped CSS via `styleUrl` (ng-packagr inlines it). No Tailwind here. Light-theme phase colors are tuned to WCAG AA (≥ 4.5:1 on white) — check contrast before changing any of them.
- Everything browser-global (`window`, `matchMedia`, `navigator.vibrate`, rAF) is feature-detected for SSR safety; the merge `filterId` is `APP_ID`-based (not random) to survive hydration.
- Consumer `ng-template`s (custom toasts, TemplateRef descriptions) are stamped **inside** `GooeyToastComponent`, so they receive the toast's `_ngcontent` attribute — the declaring component's emulated-scoped styles never match them. Consumers must style template content with `ViewEncapsulation.None` or global CSS (documented in the demo's "Custom toast — complete example").
