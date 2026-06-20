# ngx-gooey-toast

> Morphing **pill → blob** toasts for Angular. Built on signals and a hand-rolled spring engine — **zero runtime dependencies**.

An Angular port of `goey-toast`: a toast that morphs from a compact pill into a
gooey blob. The spring/morph engine runs on `requestAnimationFrame` (no
framer-motion), and the only dependencies are Angular peer deps.

## Features

- 🫧 **Morphing animation** — parametric SVG path (pill → blob), not a CSS filter.
- 📡 **Signals-first API** — imperative service (`success/error/info/…`) backed by Angular signals.
- 📦 **Zero runtime deps** — Angular peer deps + `tslib` only.
- 🖥️ **SSR-safe** — every browser global (`window`, `matchMedia`, `navigator.vibrate`, rAF) is feature-detected.
- ♿ **Accessible** — `aria-live` announcements, WCAG AA contrast, timers pause on hover **and** keyboard focus (WCAG 2.2.1), reduced-motion respected.
- ⏳ **Promise lifecycle** — `promise()` shows loading → success/error in place.
- 🔁 **In-place updates** — `update()` mutates a live toast (great for status flows).
- 🧲 **Coalescing** — collapse duplicate toasts into one with a count badge + pulse.
- 🕘 **History + replay** — dismissed toasts kept for replay (configurable).
- 📳 **Haptics** (opt-in), **RTL**, **6 positions**, swipe-to-dismiss.
- 🎚️ **Animation presets** — `smooth`, `bouncy`, `subtle`, `snappy`.

## Requirements

Angular `^21.0.0` (`@angular/common`, `@angular/core`, `@angular/platform-browser`).

## Install

```bash
npm install ngx-gooey-toast
# or
pnpm add ngx-gooey-toast
# or
bun add ngx-gooey-toast
```

## Setup

`GooeyToastService` is `providedIn: 'root'` — **no module or provider** to wire up.
Render exactly **one** `<gooey-toaster />` at your app root and you're done.

> ⚠️ Render only **one** `<gooey-toaster />` per app. Its inputs write into the
> root-singleton service config, so multiple instances overwrite each other.

```ts
// app.ts
import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { GooeyToasterComponent } from 'ngx-gooey-toast'

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, GooeyToasterComponent],
  template: `
    <router-outlet />
    <gooey-toaster position="top-right" theme="light" />
  `,
})
export class App {}
```

## AI / Agent Skill

Building with an AI coding agent (Claude Code, Cursor, …)? Install the
[Agent Skill](https://www.skills.sh/) so your agent knows this library's full API and
patterns and writes correct toast code without you pasting docs:

```bash
npx skills add juanvieiraprado99/ngx-gooey-toast
```

## Usage

Inject the service anywhere and fire a toast:

```ts
import { Component, inject } from '@angular/core'
import { GooeyToastService } from 'ngx-gooey-toast'

@Component({
  selector: 'app-demo',
  template: `<button (click)="save()">Save</button>`,
})
export class DemoComponent {
  private readonly toast = inject(GooeyToastService)

  save() {
    this.toast.success('Saved!')
  }
}
```

### Description + action

```ts
this.toast.error('Upload failed', {
  description: 'The file was too large.',
  action: { label: 'Retry', onClick: () => this.upload() },
})
```

### Promise lifecycle

```ts
this.toast.promise(this.api.save(form), {
  loading: 'Saving…',
  success: (res) => `Saved as ${res.name}`,
  error: (err) => `Failed: ${err}`,
})
```

### Loading → resolve

```ts
const id = this.toast.loading('Uploading…')      // sticky spinner (no auto-close)
// later…
this.toast.update(id, { type: 'success', title: 'Uploaded', duration: 4000 })
```

For a one-call flow use `promise()`; reach for `loading()` when you resolve the
toast yourself across several steps.

### Confirm with a cancel button

```ts
this.toast.warning('Delete file?', {
  duration: Infinity,
  action: { label: 'Delete', onClick: () => this.remove() },
  cancel: { label: 'Cancel' }, // dismisses on click (onClick optional)
})
```

### Update in place

```ts
// Opt out of coalescing for toasts you keep the id of and update later.
const id = this.toast.info('Connecting…', { coalesce: false })
// later… (duration is mutable too — re-arms the auto-dismiss timer)
this.toast.update(id, { title: 'Connected', type: 'success', duration: 4000 })
```

### Dismiss

```ts
this.toast.dismiss(id)                 // one toast by id
this.toast.dismiss({ type: 'error' })  // all of a type (or array of types)
this.toast.dismiss()                   // everything
```

## Toaster inputs (`<gooey-toaster>`)

| Input | Type | Default | Notes |
| --- | --- | --- | --- |
| `position` | `'top-left' \| 'top-center' \| 'top-right' \| 'bottom-left' \| 'bottom-center' \| 'bottom-right'` | `'top-right'` | Anchor corner/edge. |
| `theme` | `'light' \| 'dark'` | `'light'` | |
| `duration` | `number` | `4000` | Default auto-dismiss (ms). |
| `gap` | `number` | — | Space between stacked toasts. |
| `offset` | `number \| string` | — | Distance from the screen edge. |
| `visibleToasts` | `number` | `6` | Rest overflow into a queue. |
| `closeButton` | `boolean \| 'top-left' \| 'top-right'` | `false` | |
| `swipeToDismiss` | `boolean` | `true` | |
| `closeOnEscape` | `boolean` | `true` | |
| `dir` | `'ltr' \| 'rtl'` | `'ltr'` | |
| `preset` | `'smooth' \| 'bouncy' \| 'subtle' \| 'snappy'` | — | Animation preset. |
| `spring` | `boolean` | `true` | |
| `bounce` | `number` | — | Spring bounciness override. |
| `showProgress` | `boolean` | `false` | Progress bar for the timer. |
| `coalesceDuplicates` | `boolean` | `false` | Collapse dupes into a count badge. |
| `haptics` | `boolean` | `false` | Vibrate on arrival (mobile, opt-in). |
| `historyLimit` | `number` | `20` | Dismissed toasts kept for replay (`0` disables). |
| `maxQueue` | `number` | `Infinity` | Cap the overflow queue. |
| `queueOverflow` | `'drop-oldest' \| 'drop-newest'` | `'drop-oldest'` | When the queue is full. |
| `stackDirection` | `'newest-first' \| 'oldest-first'` | `'newest-first'` | Where new toasts enter. |
| `label` | `string` | `'Notifications'` | `aria-label` for the list. |

## Per-toast options (`GooeyToastOptions`)

| Option | Type | Notes |
| --- | --- | --- |
| `description` | `string \| TemplateRef \| { html } \| { markdown }` | Rich content is sanitized. |
| `action` | `{ label, onClick, successLabel? }` | Action button. |
| `cancel` | `{ label, onClick? }` | Secondary cancel button; dismisses on click. |
| `icon` | `GooeyContent` | Override the type icon. |
| `duration` | `number` | Auto-dismiss override (`Infinity` = stay open). |
| `id` | `string \| number` | Provide your own id (also enables `update()`). |
| `fillColor` / `borderColor` / `borderWidth` | `string` / `string` / `number` | Per-toast styling. |
| `preset` / `spring` / `bounce` | preset / `boolean` / `number` | Per-toast animation. |
| `showProgress` | `boolean` | Progress bar override. |
| `showTimestamp` | `boolean` | Show relative time. |
| `coalesce` | `boolean` | Override the global dedup behavior. |
| `onDismiss` / `onAutoClose` | `(id) => void` | Lifecycle callbacks. |

## Service API (`GooeyToastService`)

All create methods return the toast id (`string | number`).

| Method | Description |
| --- | --- |
| `show(title, options?)` | Default toast. |
| `success / error / warning / info(title, options?)` | Typed toasts. |
| `loading(title, options?)` | Sticky loading toast (resolve later with `update()`). |
| `promise(promise, data)` | Loading → success/error in place. |
| `update(id, options)` | Mutate a live toast (title, type, `duration`, `cancel`…). |
| `dismiss(id \| filter?)` | Dismiss one / by type / all. |
| `replay(id)` | Re-fire a dismissed toast. |
| `clearHistory()` | Clear the dismissed-toast history. |
| `mostRecentId()` | Id of the newest live toast. |

## Accessibility

- Announcements via dual `aria-live` regions — `polite` for info/success,
  `assertive` for warning/error.
- Auto-dismiss timers pause on hover **and** keyboard focus (WCAG 2.2.1).
- Light-theme phase colors are tuned to **WCAG AA** (≥ 4.5:1 on white).
- `prefers-reduced-motion` is respected (animations and haptics back off).

## License

[MIT](./LICENSE)

---

<details>
<summary>🇧🇷 Português</summary>

### ngx-gooey-toast

Toasts que se transformam de **pílula → blob** para Angular. Feito com signals e
um motor de mola próprio — **zero dependências em runtime** (só peer deps do
Angular).

### Requisitos

Angular `^21.0.0`.

### Instalação

```bash
npm install ngx-gooey-toast
# ou
pnpm add ngx-gooey-toast
# ou
bun add ngx-gooey-toast
```

### Configuração

O `GooeyToastService` é `providedIn: 'root'` — **sem módulo ou provider**.
Renderize **apenas um** `<gooey-toaster />` na raiz do app:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core'
import { GooeyToasterComponent } from 'ngx-gooey-toast'

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GooeyToasterComponent],
  template: `<gooey-toaster position="top-right" theme="light" />`,
})
export class App {}
```

### Skill de IA / Agente

Usando um agente de IA (Claude Code, Cursor, …)? Instale a
[Agent Skill](https://www.skills.sh/) para que o agente conheça a API completa da lib
e gere o código dos toasts corretamente, sem você colar a documentação:

```bash
npx skills add juanvieiraprado99/ngx-gooey-toast
```

### Uso

Injete o serviço e dispare um toast:

```ts
import { Component, inject } from '@angular/core'
import { GooeyToastService } from 'ngx-gooey-toast'

@Component({ /* … */ })
export class DemoComponent {
  private readonly toast = inject(GooeyToastService)

  save() {
    this.toast.success('Salvo!', {
      description: 'Suas alterações foram gravadas.',
      action: { label: 'Desfazer', onClick: () => this.undo() },
    })
  }
}
```

### Principais métodos

- `show / success / error / warning / info(title, options?)` — cria um toast (retorna o id).
- `loading(title, options?)` — toast de carregamento fixo (resolva depois com `update()`).
- `promise(promise, data)` — loading → sucesso/erro no mesmo toast.
- `update(id, options)` — altera um toast vivo (título, tipo, `duration`, `cancel`…; use `coalesce: false` ao criar).
- `dismiss(id | { type } )` — fecha um, por tipo, ou todos (`dismiss()`).

### Acessibilidade

`aria-live` (polite/assertive), contraste WCAG AA, timers pausam no hover e no
foco do teclado (WCAG 2.2.1) e `prefers-reduced-motion` é respeitado.

### Licença

MIT.

</details>
