# ngx-gooey-toast — API reference

Source of truth: `projects/ngx-gooey-toast/README.md` and the typed surface in
`gooey-toast.types.ts` / `gooey-toast.service.ts`. Current at lib **v0.3.0**.

## Toaster inputs (`<gooey-toaster>`)

Render exactly one instance at the app root; its inputs configure the
root-singleton service.

| Input | Type | Default | Notes |
| --- | --- | --- | --- |
| `position` | `'top-left' \| 'top-center' \| 'top-right' \| 'bottom-left' \| 'bottom-center' \| 'bottom-right'` | `'top-right'` | Anchor corner/edge. |
| `theme` | `'light' \| 'dark'` | `'light'` | |
| `duration` | `number` | `4000` | Default auto-dismiss (ms) for toasts that don't set their own. |
| `gap` | `number` | — | Space between stacked toasts. |
| `offset` | `number \| string` | — | Distance from the screen edge. |
| `visibleToasts` | `number` | `6` | Rest overflow into a queue. |
| `closeButton` | `boolean \| 'top-left' \| 'top-right'` | `false` | |
| `swipeToDismiss` | `boolean` | `true` | |
| `closeOnEscape` | `boolean` | `true` | |
| `dir` | `'ltr' \| 'rtl'` | `'ltr'` | |
| `preset` | `'smooth' \| 'bouncy' \| 'subtle' \| 'snappy'` | — | Animation preset (see below). |
| `spring` | `boolean` | `true` | |
| `bounce` | `number` | — | Spring bounciness override. |
| `showProgress` | `boolean` | `false` | Progress bar for the auto-dismiss timer. |
| `coalesceDuplicates` | `boolean` | `false` | Collapse dupes into a count badge + pulse. |
| `haptics` | `boolean` | `false` | Vibrate on arrival (mobile, opt-in). |
| `historyLimit` | `number` | `20` | Dismissed toasts kept for replay (`0` disables). |
| `maxQueue` | `number` | `Infinity` | Cap the overflow queue. |
| `queueOverflow` | `'drop-oldest' \| 'drop-newest'` | `'drop-oldest'` | When the queue is full. |
| `stackDirection` | `'newest-first' \| 'oldest-first'` | `'newest-first'` | Where new toasts enter the stack. |
| `label` | `string` | `'Notifications'` | `aria-label` for the toast list. |

## Per-toast options (`GooeyToastOptions`)

Second argument to `show` / `success` / `error` / `warning` / `info` / `loading`.

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
| `coalesce` | `boolean` | Override the global dedup behavior for this toast. |
| `onDismiss` / `onAutoClose` | `(id) => void` | Lifecycle callbacks. |

`GooeyContent = string | TemplateRef<unknown> | { html: string } | { markdown: string }`.

## Service API (`GooeyToastService`)

`@Injectable({ providedIn: 'root' })` — `inject(GooeyToastService)`. All create
methods return the toast id (`string | number`).

| Method | Description |
| --- | --- |
| `show(title, options?)` | Default (neutral) toast. |
| `success / error / warning / info(title, options?)` | Typed toasts (color + SR politeness). |
| `loading(title, options?)` | Sticky loading toast (`duration: Infinity`, `coalesce: false` by default); resolve later with `update()`. |
| `promise(promise, data)` | Tracks a promise in one toast: loading → success/error in place. |
| `update(id, options)` | Mutate a live toast (`title`, `description`, `type`, `action`, `cancel`, `icon`, `duration`…). |
| `dismiss(idOrFilter?)` | Dismiss one (`id`), by type (`{ type }` or `{ type: [...] }`), or all (no arg). |
| `replay(id)` | Re-fire a dismissed toast from history. Returns the new id, or `undefined`. |
| `clearHistory()` | Clear the dismissed-toast history. |
| `mostRecentId()` | Id of the newest live toast, or `undefined`. |
| `announce(message, politeness?)` | Push a screen-reader message without showing a toast. |

`promise()` data shape (`GooeyPromiseData<T>`):

```ts
{
  loading: string,
  success: string | ((data: T) => string),
  error: string | ((error: unknown) => string),
  description?: { loading?, success?, error? },  // string | fn → GooeyContent
  action?: { success?: GooeyToastAction, error?: GooeyToastAction },
  // plus optional styling/animation/timing/callbacks (same keys as GooeyToastOptions)
}
```

## Animation presets

`preset` accepts `'smooth' | 'bouncy' | 'subtle' | 'snappy'`. Each sets `bounce`,
`spring`, and an internal `durationScale`:

| Preset | bounce | spring | feel |
| --- | --- | --- | --- |
| `smooth` | 0.18 | true | default morph |
| `bouncy` | 0.4 | true | overshoot, playful |
| `subtle` | 0 | true | gentle, no overshoot |
| `snappy` | 0.4 | false | fast, eased (no spring) |
