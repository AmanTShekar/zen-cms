import { create } from 'zustand'

export interface Locale {
 code: string
 name: string
 flag: string
 default?: boolean
}

interface I18nState {
 i18nEnabled: boolean
 currentLocale: string
 availableLocales: Locale[]
 // Backend-compatible format: { fieldKey: { locale: value } }
 // e.g. { title: { en: "Hello", es: "Hola" } }
 translations: Record<string, Record<string, string>>

 setI18nEnabled: (enabled: boolean) => void
 setCurrentLocale: (locale: string) => void
 setTranslations: (translations: Record<string, Record<string, string>>) => void
 updateTranslation: (fieldKey: string, locale: string, value: string) => void
 /** Converts from legacy flat locale-first format: { locale: { fieldKey: value } } */
 importLegacyFormat: (legacy: Record<string, Record<string, string>>) => void
 /** Returns the value for a field + current locale, or the default locale fallback */
 getLocalizedValue: (fieldKey: string) => string | undefined
}

export const useI18nStore = create<I18nState>((set, get) => ({
 i18nEnabled: false,
 currentLocale: 'en',
 availableLocales: [
 { code: 'en', name: 'English', flag: '🇺🇸', default: true },
 { code: 'es', name: 'Español', flag: '🇪🇸', default: false },
 { code: 'fr', name: 'Français', flag: '🇫🇷', default: false },
 { code: 'de', name: 'Deutsch', flag: '🇩🇪', default: false },
 { code: 'zh', name: '中文', flag: '🇨🇳', default: false },
 { code: 'ja', name: '日本語', flag: '🇯🇵', default: false },
 ],
 translations: {},

 setI18nEnabled: (i18nEnabled) => set({ i18nEnabled }),
 setCurrentLocale: (currentLocale) => set({ currentLocale }),
 setTranslations: (translations) => set({ translations }),

 /** Set a specific locale value for a field — merges into the existing locale map */
 updateTranslation: (fieldKey, locale, value) =>
 set((state) => ({
 translations: {
 ...state.translations,
 [fieldKey]: {
 ...(state.translations[fieldKey] || {}),
 [locale]: value,
 },
 },
 })),

 /** Convert from legacy { en: { "title": "Hello" } } → { title: { en: "Hello" } } */
 importLegacyFormat: (legacy) =>
 set(() => {
 const converted: Record<string, Record<string, string>> = {}
 for (const [locale, fieldMap] of Object.entries(legacy)) {
 for (const [fieldKey, value] of Object.entries(fieldMap as Record<string, string>)) {
 if (!converted[fieldKey]) converted[fieldKey] = {}
 converted[fieldKey][locale] = value
 }
 }
 return { translations: converted }
 }),

 /** Read the current locale value for a field, falling back to the default locale */
 getLocalizedValue: (fieldKey) => {
 const { translations, currentLocale, availableLocales } = get()
 const fieldMap = translations[fieldKey]
 if (!fieldMap) return undefined
 return (
 fieldMap[currentLocale] ??
 fieldMap[availableLocales.find((l) => l.default)?.code ?? 'en']
 )
 },
}))
