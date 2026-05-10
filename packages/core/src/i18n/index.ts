/**
 * Zenith Internationalization (i18n) Engine
 * ──────────────────────────────────────
 * Handles locale detection and field-level localization.
 */
export const i18n = {
  defaultLocale: 'en',
  locales: ['en', 'es', 'fr', 'de', 'ja'],
  
  detectLocale(req: any): string {
    const locale = req.query.locale || req.headers['accept-language']?.split(',')[0] || this.defaultLocale;
    return this.locales.includes(locale) ? locale : this.defaultLocale;
  },

  getLocalizedValue(value: any, locale: string): any {
    if (typeof value !== 'object' || value === null) return value;
    return value[locale] || value[this.defaultLocale] || value;
  }
};
