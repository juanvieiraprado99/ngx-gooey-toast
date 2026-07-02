# Changelog

All notable changes to this project are documented here. This file is generated
from [Conventional Commit](https://www.conventionalcommits.org/) messages by
`commit-and-tag-version` — do not edit it by hand.

## [0.3.1](https://github.com/juanvieiraprado99/ngx-gooey-toast/compare/v0.3.0...v0.3.1) (2026-07-02)


### Features

* **toast:** add custom toast, dismissible flag, and mutable duration ([f854d9a](https://github.com/juanvieiraprado99/ngx-gooey-toast/commit/f854d9ae180eec86b538eb9efb0bb51afd3cccd1))

## [0.3.0](https://github.com/juanvieiraprado99/ngx-gooey-toast/compare/v0.2.1...v0.3.0) (2026-06-19)


### Features

* **toast:** add loading(), cancel button and mutable duration ([f28241f](https://github.com/juanvieiraprado99/ngx-gooey-toast/commit/f28241f217fdb28476e4ee4eaefc3780185e91a6))


### Bug Fixes

* **toast:** sync the progress bar with the auto-dismiss timer ([f650236](https://github.com/juanvieiraprado99/ngx-gooey-toast/commit/f650236bbab8c4ada96e6fbcd2821e7675e92293))

## [0.2.1] (2026-06-15)

### Bug Fixes

* replay now reflects an in-place `update()` instead of re-showing the original toast
* markdown emphasis only renders when the `*`/`_` open and close delimiters match

### Performance Improvements

* cache static content padding so `measure()` skips repeated `getComputedStyle`
* dirty-check the metaball merge loop, skipping unchanged per-frame path writes
* share a single `lerpDims` helper across the morph/resize animations

## 0.2.0 (2026-06-15)


### Features

* add ngx-gooey-toast library, demo app, and release tooling ([c04b8ea](https://github.com/juanvieiraprado99/ngx-gooey-toast/commit/c04b8ea81f0d1b4c831f8113154197f80a2d11c6))
* **demo:** add Google Search Console site verification meta tag ([73ea6c3](https://github.com/juanvieiraprado99/ngx-gooey-toast/commit/73ea6c3a96e950aefe5db14cdad0bcbc9e09b070))
* **demo:** add static prerendering (SSG) and full SEO metadata ([7abe0c5](https://github.com/juanvieiraprado99/ngx-gooey-toast/commit/7abe0c578ae2360949e0505eaa6aae4b50327fc1))
* enhance header component with live GitHub star count and update repository link ([1dff5cf](https://github.com/juanvieiraprado99/ngx-gooey-toast/commit/1dff5cfc12a9299f0f03965efaf5f00f360104ca))
* enhance install tabs component with animated slider and improved styles ([856a09d](https://github.com/juanvieiraprado99/ngx-gooey-toast/commit/856a09dce882f7cc903712662e52c91b8d4c933e))

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
