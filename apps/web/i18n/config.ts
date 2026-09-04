export const LOCALES = ['ru', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ru';

/** The chosen language is a long-lived preference, not a session value. */
export const LOCALE_COOKIE = 'locale';
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Names are always written in their own language — that is how a switcher is read. */
export const LOCALE_NAMES: Record<Locale, string> = { ru: 'Русский', en: 'English' };

/** Short labels for the compact switcher. */
export const LOCALE_SHORT_NAMES: Record<Locale, string> = { ru: 'RU', en: 'EN' };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * First supported language of an `Accept-Language` header, ignoring q-weights:
 * browsers already send the list in preference order.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  for (const part of header.split(',')) {
    const tag = part.split(';')[0].trim().toLowerCase();
    const base = tag.split('-')[0];
    if (isLocale(base)) return base;
  }
  return null;
}
