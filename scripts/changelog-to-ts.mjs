// @ts-check
/**
 * Parse the root CHANGELOG.md (Conventional-Changelog format, produced by
 * `commit-and-tag-version`) into a typed TS module the Angular changelog page
 * imports. Single source of truth = CHANGELOG.md. No runtime network calls.
 *
 * Run via `npm run changelog:build` (wired into prestart/prebuild).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(here, '..')
const SRC = resolve(ROOT, 'CHANGELOG.md')
const OUT = resolve(ROOT, 'src/app/changelog.data.ts')

/** Conventional-changelog section heading → our change type. */
function sectionToType(heading) {
  const h = heading.toLowerCase()
  if (h.includes('bug fix') || h.includes('revert')) return 'fixed'
  if (h.includes('feature')) return 'added'
  // Performance, Refactor, Changed, BREAKING, etc.
  return 'changed'
}

/** Strip the trailing commit link conventional-changelog appends: " ([abc](url))". */
function cleanBullet(text) {
  return text
    .replace(/\s*\(\[[0-9a-f]{6,}\]\([^)]*\)\)\s*$/i, '')
    .replace(/\s+$/g, '')
    .trim()
}

function parse(md) {
  const releases = []
  // Split into per-version blocks at "## " headings (keep the heading).
  const blocks = md.split(/^## /m).slice(1)
  for (const block of blocks) {
    const lines = block.split('\n')
    const heading = lines[0]
    const version = heading.match(/(\d+\.\d+\.\d+[^\s\]]*)/)?.[1]
    if (!version) continue
    const date = heading.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? ''

    const changes = []
    let type = 'changed'
    for (const raw of lines.slice(1)) {
      const sec = raw.match(/^###\s+(.+)$/)
      if (sec) {
        type = sectionToType(sec[1])
        continue
      }
      const bullet = raw.match(/^\s*[*-]\s+(.+)$/)
      if (bullet) {
        const text = cleanBullet(bullet[1])
        if (text) changes.push({ type, text })
      }
    }
    if (changes.length) releases.push({ version, date, changes })
  }
  return releases
}

function emit(releases) {
  const body = JSON.stringify(releases, null, 2)
  return `// AUTO-GENERATED from CHANGELOG.md by scripts/changelog-to-ts.mjs.
// Do not edit by hand — run \`npm run changelog:build\` to regenerate.

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

export const releases: Release[] = ${body}
`
}

// Normalize CRLF → LF so the line-anchored regexes work on Windows checkouts
// (JS `.` won't cross `\r`, so `(.+)$` would otherwise miss every CRLF bullet).
const md = readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n')
const releases = parse(md)
writeFileSync(OUT, emit(releases), 'utf8')
console.log(`changelog-to-ts: wrote ${releases.length} releases → ${OUT}`)
