/**
 * Zenith Internationalization (i18n) Engine
 * ──────────────────────────────────────────
 * Handles locale detection, field-level localization, and locale-keyed writes.
 * Supports fallback chains so a missing translation gracefully degrades to the
 * nearest parent locale (e.g. "en-AU" → "en" → default).
 */

/** All locales the system will accept. Extend freely — the engine is data-driven. */
export const SUPPORTED_LOCALES: string[] = [
  'en',
  'en-US',
  'en-GB',
  'en-AU',
  'es',
  'es-MX',
  'fr',
  'fr-CA',
  'de',
  'pt',
  'pt-BR',
  'ja',
  'zh',
  'zh-TW',
  'ar',
  'hi',
  'ru',
  'ko',
  'it',
  'nl',
]

export const i18n = {
  defaultLocale: 'en',

  /** Returns the supported locale list at runtime (allows dynamic extension). */
  get locales(): string[] {
    return SUPPORTED_LOCALES
  },

  /**
   * Detects the request locale from:
   *   1. ?locale= query param
   *   2. X-Zenith-Locale header
   *   3. Accept-Language header (first segment)
   *   4. Falls back to defaultLocale
   */
  detectLocale(req: any): string {
    const candidates: string[] = [
      req.query?.locale,
      req.headers?.['x-zenith-locale'],
      req.headers?.['accept-language']?.split(',')[0]?.split(';')[0]?.trim(),
    ].filter(Boolean)

    for (const candidate of candidates) {
      if (this.locales.includes(candidate)) return candidate
      // Try the base language tag — "en-AU" → "en"
      const base = candidate.split('-')[0]
      if (this.locales.includes(base)) return base
    }

    return this.defaultLocale
  },

  /**
   * Given a locale string, returns an ordered list of locales to try
   * when the exact match is missing (most specific → least specific → default).
   *
   * Example: "en-AU" → ["en-AU", "en", "en-US", default]
   */
  fallbackChain(locale: string): string[] {
    const chain: string[] = [locale]
    const base = locale.split('-')[0]
    if (base !== locale) chain.push(base)
    if (base !== this.defaultLocale) chain.push(this.defaultLocale)
    return [...new Set(chain)]
  },

  /**
   * Reads a localized value from a locale map.
   * Walks the fallback chain so partial translations don't break reads.
   *
   * @param value  The stored locale map, e.g. { en: "Hello", fr: "Bonjour" }
   * @param locale The requested locale, e.g. "fr-CA"
   */
  getLocalizedValue(value: any, locale: string): unknown {
    if (typeof value !== 'object' || value === null) return value
    const chain = this.fallbackChain(locale)
    for (const l of chain) {
      if (value[l] !== undefined && value[l] !== null) return value[l]
    }
    // Last resort: return the first non-null value in the map
    const firstValue = Object.values(value).find((v) => v !== null && v !== undefined)
    return firstValue !== undefined ? firstValue : value
  },

  /**
   * Writes a single locale's value into an existing locale map.
   * Non-destructively merges so other locale translations are preserved.
   *
   * @param existing  Current stored value — could be a string (legacy) or locale map
   * @param locale    The locale being written, e.g. "fr"
   * @param newValue  The incoming translated value
   */
  setLocaleValue(existing: any, locale: string, newValue: any): Record<string, any> {
    // If the existing value is already a locale map, merge into it
    if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
      return { ...existing, [locale]: newValue }
    }
    // If existing is a plain scalar (legacy non-localized data), preserve it under
    // the default locale and add the new translation
    if (existing !== undefined && existing !== null) {
      return { [this.defaultLocale]: existing, [locale]: newValue }
    }
    // Fresh field — just store the new locale value
    return { [locale]: newValue }
  },
}
