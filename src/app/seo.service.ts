import { DOCUMENT, inject, Injectable } from '@angular/core'
import { Meta, Title } from '@angular/platform-browser'

/** Production origin — used for canonical / og:url / sitemap. */
export const BASE_URL = 'https://ngx-gooey-toast.vercel.app'

/** Default social share image (absolute URL required by OG/Twitter). */
const DEFAULT_IMAGE = `${BASE_URL}/ngx-gooey-toast.png`

export interface SeoData {
  /** Full <title>. */
  title: string
  /** Meta description + og/twitter description. */
  description: string
  /** Route path starting with '/', e.g. '/changelog' or '/'. */
  path: string
  /** Absolute image URL for social cards. Defaults to the brand mark. */
  image?: string
}

/**
 * Sets per-route SEO tags (title, description, Open Graph, Twitter card, canonical).
 * Runs during prerendering, so the generated static HTML already carries these tags.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title)
  private readonly meta = inject(Meta)
  private readonly document = inject(DOCUMENT)

  update({ title, description, path, image = DEFAULT_IMAGE }: SeoData): void {
    const url = `${BASE_URL}${path}`

    this.title.setTitle(title)
    this.meta.updateTag({ name: 'description', content: description })

    // Open Graph
    this.meta.updateTag({ property: 'og:type', content: 'website' })
    this.meta.updateTag({ property: 'og:site_name', content: 'ngx-gooey-toast' })
    this.meta.updateTag({ property: 'og:title', content: title })
    this.meta.updateTag({ property: 'og:description', content: description })
    this.meta.updateTag({ property: 'og:url', content: url })
    this.meta.updateTag({ property: 'og:image', content: image })

    // Twitter card
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' })
    this.meta.updateTag({ name: 'twitter:title', content: title })
    this.meta.updateTag({ name: 'twitter:description', content: description })
    this.meta.updateTag({ name: 'twitter:image', content: image })

    this.setCanonical(url)
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) {
      link = this.document.createElement('link')
      link.setAttribute('rel', 'canonical')
      this.document.head.appendChild(link)
    }
    link.setAttribute('href', url)
  }
}
