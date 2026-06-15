// @ts-check
/**
 * Print the changelog section for a given version to stdout — used by the
 * release workflow as the GitHub Release body.
 *
 *   node scripts/extract-release-notes.mjs v0.2.0   (the leading "v" is optional)
 *
 * Falls back to the newest section when no version is passed.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const md = readFileSync(resolve(here, '..', 'CHANGELOG.md'), 'utf8')

const wanted = (process.argv[2] ?? '').replace(/^v/, '').trim()
const blocks = md.split(/^## /m).slice(1)

const pick =
  blocks.find((b) => (wanted ? b.match(/(\d+\.\d+\.\d+[^\s\]]*)/)?.[1] === wanted : true)) ??
  blocks[0]

if (!pick) {
  console.error(`No changelog section found${wanted ? ` for ${wanted}` : ''}.`)
  process.exit(1)
}

// Re-add the "## " stripped by split, trim trailing blank lines.
process.stdout.write(`## ${pick}`.replace(/\s+$/g, '') + '\n')
