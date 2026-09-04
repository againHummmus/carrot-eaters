import type messages from './messages/ru.json';
import type { Locale } from './i18n/config';

/**
 * Makes `useTranslations`/`getTranslations` key-checked against the Russian
 * catalogue, which is the source of truth. TypeScript only ever sees that one
 * file, so `npm run check:messages` is what keeps `en.json` in sync with it.
 */
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
