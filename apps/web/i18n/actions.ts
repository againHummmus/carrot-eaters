'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale } from './config';

/** Stores the language choice and re-renders every server component with it. */
export async function setLocale(locale: unknown): Promise<void> {
  if (!isLocale(locale)) throw new Error(`Unsupported locale: ${String(locale)}`);

  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: 'lax',
  });

  revalidatePath('/', 'layout');
}
