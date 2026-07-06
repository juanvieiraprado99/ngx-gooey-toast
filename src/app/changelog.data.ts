// AUTO-GENERATED from CHANGELOG.md by scripts/changelog-to-ts.mjs.
// Do not edit by hand — run `npm run changelog:build` to regenerate.

export type ChangeType = 'added' | 'changed' | 'fixed'

export interface Change {
  type: ChangeType
  text: string
}

export interface Release {
  version: string
  date: string
  changes: Change[]
}

export const releases: Release[] = [
  {
    "version": "0.4.0",
    "date": "2026-07-05",
    "changes": [
      {
        "type": "added",
        "text": "**toast:** async action buttons — an `action.onClick` that returns a Promise shows a loading state and holds the auto-dismiss until it settles, then flips to `successLabel`"
      },
      {
        "type": "added",
        "text": "**toaster:** `richColors` input — paint typed toasts with a saturated per-type fill (success green, error red, …) and white text; a per-toast `fillColor` still wins"
      },
      {
        "type": "added",
        "text": "**toaster:** focus hotkey — a configurable `hotkey` input (default `Alt+T`) moves keyboard focus into the toast stack, where Tab reaches each toast and pauses its timer; pass `null` to disable"
      },
      {
        "type": "added",
        "text": "**service:** `pauseAll()` / `resumeAll()` — freeze and resume every toast's auto-dismiss timer programmatically (e.g. while a dialog is open)"
      },
      {
        "type": "added",
        "text": "**service:** `queueSize` signal — read how many toasts are waiting in the overflow queue behind `visibleToasts`"
      },
      {
        "type": "fixed",
        "text": "**ssr:** fix a hydration mismatch on the metaball merge filter id — the per-instance counter is now root-provided, so it resets per server request and matches the client"
      },
      {
        "type": "fixed",
        "text": "**toast:** auto-dismiss a short-duration expanded toast that previously stayed open forever when `duration` was below the expand + collapse time"
      },
      {
        "type": "fixed",
        "text": "**toast:** cancel a pending delayed expand when a toast is dismissed mid-window, so it can no longer re-expand while leaving"
      },
      {
        "type": "fixed",
        "text": "**toaster:** clear the aria-live announcement timers when the toaster is destroyed"
      },
      {
        "type": "fixed",
        "text": "**service:** detach the `visibilitychange` listener on teardown (`ngOnDestroy`)"
      },
      {
        "type": "changed",
        "text": "**toast:** reuse the cached content padding during collapse instead of another `getComputedStyle`"
      },
      {
        "type": "changed",
        "text": "**toast:** announce the running duplicate count to screen readers when toasts coalesce (the count badge is `aria-hidden`)"
      },
      {
        "type": "changed",
        "text": "**toast:** log consumer callback errors (`action`, `cancel`, `onDismiss`, `onAutoClose`, `finally`) instead of silently swallowing them"
      }
    ]
  },
  {
    "version": "0.3.1",
    "date": "2026-07-02",
    "changes": [
      {
        "type": "added",
        "text": "**toast:** add custom toast, dismissible flag, and mutable duration"
      }
    ]
  },
  {
    "version": "0.3.0",
    "date": "2026-06-19",
    "changes": [
      {
        "type": "added",
        "text": "**toast:** add loading(), cancel button and mutable duration"
      },
      {
        "type": "fixed",
        "text": "**toast:** sync the progress bar with the auto-dismiss timer"
      }
    ]
  },
  {
    "version": "0.2.1",
    "date": "2026-06-15",
    "changes": [
      {
        "type": "fixed",
        "text": "replay now reflects an in-place `update()` instead of re-showing the original toast"
      },
      {
        "type": "fixed",
        "text": "markdown emphasis only renders when the `*`/`_` open and close delimiters match"
      },
      {
        "type": "changed",
        "text": "cache static content padding so `measure()` skips repeated `getComputedStyle`"
      },
      {
        "type": "changed",
        "text": "dirty-check the metaball merge loop, skipping unchanged per-frame path writes"
      },
      {
        "type": "changed",
        "text": "share a single `lerpDims` helper across the morph/resize animations"
      }
    ]
  },
  {
    "version": "0.2.0",
    "date": "2026-06-15",
    "changes": [
      {
        "type": "added",
        "text": "add ngx-gooey-toast library, demo app, and release tooling"
      },
      {
        "type": "added",
        "text": "**demo:** add Google Search Console site verification meta tag"
      },
      {
        "type": "added",
        "text": "**demo:** add static prerendering (SSG) and full SEO metadata"
      },
      {
        "type": "added",
        "text": "enhance header component with live GitHub star count and update repository link"
      },
      {
        "type": "added",
        "text": "enhance install tabs component with animated slider and improved styles"
      }
    ]
  },
  {
    "version": "0.2.0",
    "date": "2026-06-10",
    "changes": [
      {
        "type": "added",
        "text": "history & replay API — re-fire dismissed toasts faithfully"
      },
      {
        "type": "added",
        "text": "opt-in haptics on mobile, respecting reduced-motion"
      },
      {
        "type": "fixed",
        "text": "duplicate coalescing no longer merges toasts tracked by id"
      }
    ]
  },
  {
    "version": "0.1.0",
    "date": "2026-05-22",
    "changes": [
      {
        "type": "added",
        "text": "animation presets: smooth, bouncy, subtle, snappy"
      },
      {
        "type": "added",
        "text": "sanitized rich descriptions via { html } and { markdown }"
      },
      {
        "type": "added",
        "text": "progress bar and per-toast timestamps"
      }
    ]
  },
  {
    "version": "0.0.1",
    "date": "2026-05-01",
    "changes": [
      {
        "type": "added",
        "text": "initial release — morphing pill → blob toasts for Angular"
      },
      {
        "type": "added",
        "text": "hand-rolled spring engine on requestAnimationFrame, zero runtime deps"
      },
      {
        "type": "added",
        "text": "GooeyToastService: success/error/info/warning/show, promise, update, dismiss"
      }
    ]
  }
]
