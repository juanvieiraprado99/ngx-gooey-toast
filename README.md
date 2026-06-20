# ngx-gooey-toast — demo playground

This repo is the **workspace and demo playground** for
[`ngx-gooey-toast`](./projects/ngx-gooey-toast): a morphing **pill → blob** toast
for Angular, an Angular port of the React
[`goey-toast`](https://goey-toast.vercel.app/). The library has **zero runtime
dependencies** — the spring engine is hand-rolled on `requestAnimationFrame`
(no framer-motion).

`npm start` serves the interactive demo (hero, live examples, and a toast
builder). The publishable package lives in `projects/ngx-gooey-toast/` and ships
its own README with the full install/usage/API docs.

## AI / Agent Skill

The library ships an [Agent Skill](https://www.skills.sh/) (`SKILL.md` +
`references/`). Install it so an AI coding agent (Claude Code, Cursor, …) knows the
full API and patterns and writes correct toast code without you pasting docs:

```bash
npx skills add juanvieiraprado99/ngx-gooey-toast
```

## The library (`projects/ngx-gooey-toast`)

Two public exports:

- **`GooeyToasterComponent`** (`<gooey-toaster>`) — render once near the app
  root. Inputs mirror the React `GooeyToasterProps`: `position`, `theme`, `gap`,
  `offset`, `visibleToasts`, `preset`, `spring`, `bounce`, `showProgress`,
  `closeButton`, `expand`, …
- **`GooeyToastService`** (root singleton) — the imperative API:
  `success/error/info/warning/show`, in-place `update`, `promise` lifecycle
  (loading → success/error), `dismiss` (by id, by filter, or all), plus
  history/replay.

```ts
const toast = inject(GooeyToastService)
toast.success('Saved!')
toast.promise(upload(), { loading: 'Uploading…', success: 'Done', error: 'Failed' })
```

Internals: the "gooey" shape is a parametric SVG path (`gooey-morph.ts`, `t` 0→1
= pill→blob), animated by a hand-rolled spring/tween engine (`spring-animate.ts`).
Styling is component-scoped CSS (no Tailwind required by the library), tuned to
WCAG AA. **For full usage and API docs, see
[`projects/ngx-gooey-toast/`](./projects/ngx-gooey-toast).**

## The demo page (`npm start`)

A single playground page (`src/app/home.component.ts`) plus a `/changelog` route:

- **Hero** — logo, intro, and an "Inspired by React goey-toast" link.
- **Examples** — categorized buttons that fire live toasts:
  - **Toast Types** — default, success, error, warning, info.
  - **With Description** / **With Action Button** (incl. an action that morphs to
    a success pill).
  - **Custom Component Body** — any Angular `TemplateRef` as the description.
  - **Rich Description (sanitized)** — Markdown, HTML, and an XSS attempt showing
    scripts/handlers are stripped.
  - **No Spring** — eased morph without overshoot.
  - **Promise** — loading → success/error, in pill and expanded forms.
  - **Update Toast** — `info` updated in place to success/error.
  - **Progress Bar**, **History & Replay**, **Callbacks** (`onDismiss`/`onAutoClose`).
- **Toast builder** — an interactive panel (position, type, title, description,
  action, fill color / border, duration, animation preset, spring + bounce,
  theme, and toggles like progress / close button / coalesce / merge / haptics)
  that **generates the matching code in real time**. "Fire ×3" demonstrates
  duplicate coalescing; drag a toast away to dismiss it.
- **Documentation** — install tabs plus tables of `<gooey-toaster>` props and
  `GooeyToastService` methods.
- **`/changelog`** — rendered from the generated `CHANGELOG.md`.

## Commands

```bash
npm start                          # demo playground (serves the "demo" project)
npm test                           # unit tests (morph, spring, service)
npm run build:lib                  # build the publishable package → dist/ngx-gooey-toast
npm publish ./dist/ngx-gooey-toast # publish to npm
```

## Repo layout

- `projects/ngx-gooey-toast/` — the **library** (ng-packagr). Source under
  `src/lib/`, public surface in `src/public-api.ts`. **Edit here.**
- `src/` — the **demo** playground. Imports the library live from source via the
  `ngx-gooey-toast` path alias in `tsconfig.json`, so changes show up in
  `npm start` without rebuilding the lib.
