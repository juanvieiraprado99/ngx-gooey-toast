import { ChangeDetectionStrategy, Component } from '@angular/core'
import { CodeBlockComponent } from './code-block.component'
import { InstallTabsComponent } from './install-tabs.component'

interface DocRow {
  title: string
  blurb: string
  code: string
}

interface PropRow {
  name: string
  type: string
  default: string
  description: string
}

interface MethodRow {
  signature: string
  returns: string
  description: string
}

@Component({
  selector: 'app-docs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CodeBlockComponent, InstallTabsComponent],
  template: `
    <div class="border-t border-neutral-200 pt-12">
      <h2 class="text-xl font-bold tracking-tight sm:text-2xl">Documentation</h2>
      <p class="mt-2 max-w-2xl text-neutral-500">
        Everything you need to drop morphing pill → blob toasts into an Angular app.
        Installed from npm as a regular package — zero runtime dependencies.
      </p>

      <section
        class="grid gap-4 border-b border-neutral-200 py-8 md:grid-cols-[16rem_1fr] md:gap-10"
      >
        <div>
          <h3 class="font-semibold">Installation</h3>
          <p class="mt-1 text-sm text-neutral-500">
            A standard npm package. Angular is the only peer dependency — nothing else is added.
          </p>
        </div>
        <app-install-tabs />
      </section>

      @for (row of rows; track row.title) {
        <section
          class="grid gap-4 border-b border-neutral-200 py-8 md:grid-cols-[16rem_1fr] md:gap-10"
        >
          <div>
            <h3 class="font-semibold">{{ row.title }}</h3>
            <p class="mt-1 text-sm text-neutral-500">{{ row.blurb }}</p>
          </div>
          <app-code-block [code]="row.code" />
        </section>
      }

      <!-- Toaster props -->
      <section class="grid gap-4 border-b border-neutral-200 py-8 md:grid-cols-[16rem_1fr] md:gap-10">
        <div>
          <h3 class="font-semibold">&lt;gooey-toaster&gt; inputs</h3>
          <p class="mt-1 text-sm text-neutral-500">
            Global defaults for every toast. Set once on the toaster element.
          </p>
        </div>
        <div class="overflow-x-auto min-w-0">
          <table class="prop-table">
            <thead>
              <tr>
                <th scope="col">Input</th>
                <th scope="col">Type</th>
                <th scope="col">Default</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              @for (p of toasterProps; track p.name) {
                <tr>
                  <td><code class="kbd">{{ p.name }}</code></td>
                  <td><code class="kbd">{{ p.type }}</code></td>
                  <td><code class="kbd">{{ p.default }}</code></td>
                  <td>{{ p.description }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <!-- Toast options -->
      <section class="grid gap-4 border-b border-neutral-200 py-8 md:grid-cols-[16rem_1fr] md:gap-10">
        <div>
          <h3 class="font-semibold">GooeyToastOptions</h3>
          <p class="mt-1 text-sm text-neutral-500">
            Per-toast options — the second argument to <code class="kbd">show/success/…</code>.
          </p>
        </div>
        <div class="overflow-x-auto min-w-0">
          <table class="prop-table">
            <thead>
              <tr>
                <th scope="col">Option</th>
                <th scope="col">Type</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              @for (o of toastOptions; track o.name) {
                <tr>
                  <td><code class="kbd">{{ o.name }}</code></td>
                  <td><code class="kbd">{{ o.type }}</code></td>
                  <td>{{ o.description }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <!-- Service methods -->
      <section class="grid gap-4 border-b border-neutral-200 py-8 md:grid-cols-[16rem_1fr] md:gap-10">
        <div>
          <h3 class="font-semibold">GooeyToastService</h3>
          <p class="mt-1 text-sm text-neutral-500">
            Injectable singleton (<code class="kbd">inject(GooeyToastService)</code>) — the
            imperative API.
          </p>
        </div>
        <div class="overflow-x-auto min-w-0">
          <table class="prop-table">
            <thead>
              <tr>
                <th scope="col">Method</th>
                <th scope="col">Returns</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              @for (m of methods; track m.signature) {
                <tr>
                  <td><code class="kbd">{{ m.signature }}</code></td>
                  <td><code class="kbd">{{ m.returns }}</code></td>
                  <td>{{ m.description }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <footer class="mt-10 text-sm text-neutral-500">
        An Angular port of the React
        <a
          class="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-500"
          href="https://goey-toast.vercel.app/"
          target="_blank"
          rel="noreferrer"
        >goey-toast</a>. Same morphing toast, rebuilt for Angular with signals and a
        hand-rolled spring engine — zero runtime dependencies.
      </footer>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .kbd {
      border-radius: 0.35rem;
      background: rgb(240 240 240);
      padding: 0.1rem 0.35rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.82em;
      white-space: nowrap;
    }
    .prop-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    .prop-table th {
      text-align: left;
      font-weight: 600;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid rgb(212 212 212);
    }
    .prop-table td {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid rgb(238 238 238);
      vertical-align: top;
      color: rgb(82 82 82);
    }
  `,
})
export class DocsComponent {
  protected readonly rows: DocRow[] = [
    {
      title: 'Setup',
      blurb: 'Render the toaster once near your app root, then inject the service anywhere.',
      code: `import { Component, inject } from '@angular/core'
import { GooeyToasterComponent, GooeyToastService } from 'ngx-gooey-toast'

@Component({
  selector: 'app-root',
  imports: [GooeyToasterComponent],
  template: \`
    <gooey-toaster position="bottom-right" [closeButton]="true" />
    <button (click)="toast.success('Saved!')">Save</button>
  \`,
})
export class App {
  protected readonly toast = inject(GooeyToastService)
}`,
    },
    {
      title: 'Basic toast',
      blurb: 'A plain pill with no type styling.',
      code: `toast.show('Just a plain toast')`,
    },
    {
      title: 'Toast types',
      blurb: 'Typed toasts colour the pill and set the right aria-live politeness.',
      code: `toast.success('Saved')
toast.error('Something went wrong')
toast.warning('Careful')
toast.info('Heads up')`,
    },
    {
      title: 'With description',
      blurb: 'A body line morphs the pill into a blob to fit the extra text.',
      code: `toast.success('Profile updated', {
  description: 'Your changes are now live.',
})`,
    },
    {
      title: 'Rich description',
      blurb:
        'Pass { markdown } or { html } for a formatted body. Both are sanitized (DomSanitizer) — scripts and event handlers are stripped, so untrusted input is safe.',
      code: `toast.info('Release v2.1', {
  description: {
    markdown: '**Bold**, \`code\`, and a [link](https://angular.dev).',
  },
})

toast.success('Synced', {
  description: { html: 'Saved to <strong>3 devices</strong>.' },
})`,
    },
    {
      title: 'With action',
      blurb: 'An action button that morphs into a success label on click.',
      code: `toast.show('File ready', {
  action: {
    label: 'Copy link',
    successLabel: 'Copied!',
    onClick: () => copyLink(),
  },
})`,
    },
    {
      title: 'Action + cancel',
      blurb: 'A secondary cancel button sits beside the action and dismisses on click.',
      code: `toast.warning('Delete file?', {
  duration: Infinity,
  action: { label: 'Delete', onClick: () => remove() },
  cancel: { label: 'Cancel' },
})`,
    },
    {
      title: 'Loading → resolve',
      blurb: 'A sticky spinner you resolve yourself; give it a finite duration to auto-close.',
      code: `const id = toast.loading('Uploading…')
// later…
toast.update(id, {
  type: 'success',
  title: 'Uploaded',
  duration: 4000,
})`,
    },
    {
      title: 'Promise',
      blurb: 'Loading → success/error, resolved in place from a promise.',
      code: `toast.promise(uploadFile(), {
  loading: 'Uploading…',
  success: (res) => \`Uploaded \${res.name}\`,
  error: 'Upload failed',
})`,
    },
    {
      title: 'Update in place',
      blurb: 'Mutate a live toast by the id returned from any create call.',
      code: `const id = toast.info('Connecting…')
toast.update(id, { title: 'Connected', type: 'success' })`,
    },
    {
      title: 'Dismiss',
      blurb: 'Dismiss by id, by type filter, or clear everything.',
      code: `toast.dismiss(id)                 // by id
toast.dismiss({ type: 'error' })  // by type
toast.dismiss()                   // all`,
    },
    {
      title: 'History & replay',
      blurb:
        'Dismissed toasts are kept in memory; replay re-fires them faithfully (callbacks, colors, rich content). Cleared on reload.',
      code: `const id = toast.error('Upload failed', {
  action: { label: 'Retry', onClick: () => retry() },
})
// …user dismisses it…

const past = toast.history()  // [{ id, title, type, dismissedAt, … }]
toast.replay(past[0].id)      // re-shows it, action intact
toast.clearHistory()`,
    },
    {
      title: 'Position & theme',
      blurb: 'Six stacking positions and a light/dark theme on the toaster.',
      code: `<gooey-toaster position="top-center" theme="dark" />`,
    },
    {
      title: 'Custom colors',
      blurb: 'Override the fill and border per toast for branded notifications.',
      code: `toast.show('Branded toast', {
  fillColor: '#0f172a',
  borderColor: '#6366f1',
  borderWidth: 2,
})`,
    },
    {
      title: 'Animation presets',
      blurb: 'Pick a preset, or tune the spring directly with spring + bounce.',
      code: `// presets: 'smooth' | 'bouncy' | 'subtle' | 'snappy'
toast.success('Boing!', { preset: 'bouncy' })

// or tune manually
toast.info('Custom spring', { spring: true, bounce: 0.5 })`,
    },
  ]

  protected readonly toasterProps: PropRow[] = [
    { name: 'position', type: 'GooeyPosition', default: "'top-right'", description: 'Stacking corner/edge for the toaster.' },
    { name: 'duration', type: 'number', default: '4000', description: 'Default auto-dismiss time (ms) for toasts that don’t set their own.' },
    { name: 'gap', type: 'number', default: '14', description: 'Vertical gap between stacked toasts (px).' },
    { name: 'offset', type: 'number | string', default: "'24px'", description: 'Distance from the viewport edge.' },
    { name: 'theme', type: "'light' | 'dark'", default: "'light'", description: 'Colour theme for the stack.' },
    { name: 'label', type: 'string', default: "'Notifications'", description: 'Accessible name (aria-label) for the toast list.' },
    { name: 'closeButton', type: "boolean | 'top-left' | 'top-right'", default: 'false', description: 'Show a close button, optionally pinned to a corner.' },
    { name: 'visibleToasts', type: 'number', default: '6', description: 'Max toasts on screen before queuing.' },
    { name: 'dir', type: "'ltr' | 'rtl'", default: "'ltr'", description: 'Text direction.' },
    { name: 'preset', type: 'AnimationPresetName', default: '—', description: 'Default animation preset for all toasts.' },
    { name: 'spring', type: 'boolean', default: 'true', description: 'Use the spring engine (vs. a plain tween).' },
    { name: 'bounce', type: 'number', default: '—', description: 'Spring bounciness (0–1).' },
    { name: 'swipeToDismiss', type: 'boolean', default: 'true', description: 'Allow dragging a toast away to dismiss.' },
    { name: 'closeOnEscape', type: 'boolean', default: 'true', description: 'Dismiss the latest toast on Escape.' },
    { name: 'maxQueue', type: 'number', default: 'Infinity', description: 'Cap on queued (off-screen) toasts.' },
    { name: 'queueOverflow', type: "'drop-oldest' | 'drop-newest'", default: "'drop-oldest'", description: 'Which queued toast to drop when full.' },
    { name: 'showProgress', type: 'boolean', default: 'false', description: 'Show a progress bar counting down to auto-dismiss.' },
    { name: 'stackDirection', type: "'newest-first' | 'oldest-first'", default: "'newest-first'", description: 'Where new toasts enter: nearest the anchored edge (default) or pushed to the far end.' },
    { name: 'haptics', type: 'boolean', default: 'false', description: 'Vibrate on toast arrival (mobile, opt-in). Per-type pattern; respects reduced-motion. No sound.' },
    { name: 'historyLimit', type: 'number', default: '20', description: 'Max dismissed toasts kept for replay via the service (0 disables).' },
  ]

  protected readonly toastOptions: PropRow[] = [
    { name: 'description', type: 'string | TemplateRef | { html } | { markdown }', default: '', description: 'Body below the title. Plain string = text; { html } / { markdown } render sanitized rich content (scripts & handlers stripped); TemplateRef for full Angular content.' },
    { name: 'action', type: 'GooeyToastAction', default: '', description: '{ label, onClick, successLabel? } action button.' },
    { name: 'cancel', type: 'GooeyToastCancel', default: '', description: '{ label, onClick? } secondary cancel button; dismisses the toast on click.' },
    { name: 'icon', type: 'string | TemplateRef', default: '', description: 'Custom leading icon.' },
    { name: 'duration', type: 'number', default: '', description: 'Override auto-dismiss time (ms) for this toast.' },
    { name: 'id', type: 'string | number', default: '', description: 'Provide a stable id (e.g. to update later).' },
    { name: 'fillColor', type: 'string', default: '', description: 'Background fill colour.' },
    { name: 'borderColor', type: 'string', default: '', description: 'Border colour.' },
    { name: 'borderWidth', type: 'number', default: '', description: 'Border width (px).' },
    { name: 'preset', type: 'AnimationPresetName', default: '', description: "Per-toast preset: 'smooth' | 'bouncy' | 'subtle' | 'snappy'." },
    { name: 'spring', type: 'boolean', default: '', description: 'Use the spring engine for this toast.' },
    { name: 'bounce', type: 'number', default: '', description: 'Spring bounciness (0–1) for this toast.' },
    { name: 'showProgress', type: 'boolean', default: '', description: 'Show the countdown progress bar.' },
    { name: 'showTimestamp', type: 'boolean', default: 'true', description: 'Show a relative timestamp.' },
    { name: 'onDismiss', type: '(id) => void', default: '', description: 'Fires when the toast is removed (auto or manual).' },
    { name: 'onAutoClose', type: '(id) => void', default: '', description: 'Fires only when the toast auto-closes.' },
  ]

  protected readonly methods: MethodRow[] = [
    { signature: 'show(title, options?)', returns: 'string | number', description: 'Show a default toast. Returns its id.' },
    { signature: 'success(title, options?)', returns: 'string | number', description: 'Success toast.' },
    { signature: 'error(title, options?)', returns: 'string | number', description: 'Error toast (assertive, shakes on entry).' },
    { signature: 'warning(title, options?)', returns: 'string | number', description: 'Warning toast (assertive).' },
    { signature: 'info(title, options?)', returns: 'string | number', description: 'Info toast.' },
    { signature: 'loading(title, options?)', returns: 'string | number', description: 'Sticky loading toast (Infinity duration by default); resolve later with update().' },
    { signature: 'promise(promise, data)', returns: 'string | number', description: 'Loading → success/error from a promise.' },
    { signature: 'update(id, options)', returns: 'void', description: 'Mutate a live toast in place (title, type, duration, cancel, icon…).' },
    { signature: 'dismiss(idOrFilter?)', returns: 'void', description: 'Dismiss by id, by { type } filter, or all.' },
    { signature: 'history()', returns: 'GooeyHistoryRecord[]', description: 'Dismissed toasts kept for replay (newest first; in-memory).' },
    { signature: 'replay(id)', returns: 'string | number | undefined', description: 'Re-fire a dismissed toast as a fresh one. Faithful (callbacks/colors/rich preserved).' },
    { signature: 'clearHistory()', returns: 'void', description: 'Clear the replay history.' },
  ]
}
