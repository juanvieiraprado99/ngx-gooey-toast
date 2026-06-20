# ngx-gooey-toast — recipes

All snippets assume `private readonly toast = inject(GooeyToastService)`.

## Description + action

```ts
this.toast.error('Upload failed', {
  description: 'The file was too large.',
  action: { label: 'Retry', onClick: () => this.upload() },
})
```

`action.successLabel` (optional) morphs the button to a success pill after click.

## Promise lifecycle (one call)

Loading → success/error in the same toast. `success`/`error` may be a string or a
function of the resolved value/error.

```ts
this.toast.promise(this.api.save(form), {
  loading: 'Saving…',
  success: (res) => `Saved as ${res.name}`,
  error: (err) => `Failed: ${err}`,
})
```

`promise()` toasts never coalesce. The settled toast auto-closes on the default
(or `timing.displayDuration`) duration.

## Loading → resolve yourself (multi-step)

When you drive the lifecycle across several steps, use `loading()` (sticky spinner,
no auto-close) then `update()`:

```ts
const id = this.toast.loading('Uploading…')
// later…
this.toast.update(id, { type: 'success', title: 'Uploaded', duration: 4000 })
```

Prefer `promise()` for a one-call flow; reach for `loading()` only when you resolve
the toast manually.

## Update in place

`duration` is mutable — updating it re-arms the auto-dismiss timer from now. For any
toast you keep the id of and update later, create it with **`coalesce: false`** so
two identical-looking toasts don't merge before your `update()` lands.

```ts
const id = this.toast.info('Connecting…', { coalesce: false })
// later…
this.toast.update(id, { title: 'Connected', type: 'success', duration: 4000 })
```

`update()` is a no-op if the id isn't found. `type` updates re-announce to screen
readers; `cancel: null` / `icon: null` clear those slots.

## Confirm / undo with a cancel button

Keep it open (`duration: Infinity`), wire an action + a secondary cancel button.
Clicking cancel dismisses the toast (`onClick` optional, runs first).

```ts
this.toast.warning('Delete file?', {
  duration: Infinity,
  action: { label: 'Delete', onClick: () => this.remove() },
  cancel: { label: 'Cancel' },
})
```

## Dismiss

```ts
this.toast.dismiss(id)                          // one toast by id
this.toast.dismiss({ type: 'error' })           // all of a type
this.toast.dismiss({ type: ['error', 'warning'] }) // multiple types
this.toast.dismiss()                            // everything (visible + queued)
```

## Coalescing duplicates

Enable globally with `<gooey-toaster coalesceDuplicates />`, or per-toast via the
`coalesce` option. Matching toasts (same type + title + string description) collapse
into one with a count badge + pulse instead of stacking. Opt a specific toast out
with `coalesce: false` (required for `update()` flows — see above).

## History + replay

Dismissed toasts are kept for replay (`historyLimit`, default 20; `0` disables).

```ts
const newId = this.toast.replay(record.id) // re-fire a dismissed toast
this.toast.clearHistory()                   // wipe dismissed history
```

`record` comes from the service's `history` signal (`GooeyHistoryRecord[]`, newest
first): `{ id, title, type, description?, createdAt, dismissedAt }`.

## Lifecycle callbacks

```ts
this.toast.success('Saved!', {
  onAutoClose: (id) => console.log('timed out', id), // only on auto-dismiss
  onDismiss:   (id) => console.log('gone', id),       // any removal
})
```

## Rich / custom content (always sanitized)

`description` (and `icon`) accept a `TemplateRef`, `{ html }`, or `{ markdown }`.
The library **always** routes rich content through Angular's `DomSanitizer`;
`markdown` is a light subset (`code`, **bold**, *italic*, links — http/https/mailto
only). Scripts and event handlers are stripped.

```ts
this.toast.show('Release notes', { description: { markdown: 'See **v0.3.0** `CHANGELOG`' } })
this.toast.show('Custom body', { description: this.myTemplate }) // <ng-template #myTemplate>…
```

**Never** use `bypassSecurityTrust*` to push richer markup — it defeats the
sanitizer and opens an XSS hole.

## Accessibility (built in)

- Dual `aria-live` regions: `polite` for `info`/`success`, `assertive` for
  `warning`/`error`. `announce(message, politeness?)` pushes an SR message with no
  visible toast.
- Auto-dismiss timers pause on hover **and** keyboard focus (WCAG 2.2.1).
- Light-theme phase colors meet **WCAG AA** (≥ 4.5:1 on white).
- `prefers-reduced-motion` is respected (animations and haptics back off).
