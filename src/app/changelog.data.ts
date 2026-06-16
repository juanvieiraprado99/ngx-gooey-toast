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
