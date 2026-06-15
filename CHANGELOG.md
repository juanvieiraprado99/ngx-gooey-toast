# Changelog

All notable changes to this project are documented here. This file is generated
from [Conventional Commit](https://www.conventionalcommits.org/) messages by
`commit-and-tag-version` — do not edit it by hand.

## [0.2.0](https://github.com/juanprado/ngx-gooey-toast/compare/v0.1.0...v0.2.0) (2026-06-10)

### Features

* history & replay API — re-fire dismissed toasts faithfully
* opt-in haptics on mobile, respecting reduced-motion

### Bug Fixes

* duplicate coalescing no longer merges toasts tracked by id

## [0.1.0](https://github.com/juanprado/ngx-gooey-toast/compare/v0.0.1...v0.1.0) (2026-05-22)

### Features

* animation presets: smooth, bouncy, subtle, snappy
* sanitized rich descriptions via { html } and { markdown }
* progress bar and per-toast timestamps

## 0.0.1 (2026-05-01)

### Features

* initial release — morphing pill → blob toasts for Angular
* hand-rolled spring engine on requestAnimationFrame, zero runtime deps
* GooeyToastService: success/error/info/warning/show, promise, update, dismiss
