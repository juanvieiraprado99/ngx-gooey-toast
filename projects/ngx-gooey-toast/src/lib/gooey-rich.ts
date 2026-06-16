/**
 * Inline rich-content helpers for toast descriptions. Pure, zero-dependency.
 *
 * Security: `renderMarkdown` HTML-escapes its input first and only emits a
 * fixed tag whitelist, so its output is constrained even before it reaches
 * Angular's sanitizer. The component still runs every rich value through
 * `DomSanitizer.sanitize(SecurityContext.HTML, …)` — nothing is ever trusted
 * via `bypassSecurityTrust*`.
 */
import type { GooeyRichContent } from './gooey-toast.types'

/** Narrow a content value to the inline rich variant (`{ html }`/`{ markdown }`). */
export function isRichContent(v: unknown): v is GooeyRichContent {
  return typeof v === 'object' && v !== null && ('html' in v || 'markdown' in v)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Light markdown → HTML string. Subset: `` `code` ``, `**bold**`,
 * `*italic*` / `_italic_`, `[text](http(s)|mailto url)`, and `\n` → `<br>`.
 * Input is escaped first; links are restricted to safe URL schemes.
 */
export function renderMarkdown(md: string): string {
  let s = escapeHtml(md)
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(\*|_)([^*_\n]+)\1/g, '<em>$2</em>')
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  )
  return s.replace(/\n/g, '<br>')
}
