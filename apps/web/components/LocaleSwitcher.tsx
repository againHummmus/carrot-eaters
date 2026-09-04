'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { LOCALES, LOCALE_NAMES, LOCALE_SHORT_NAMES, type Locale } from '@/i18n/config';
import { setLocale } from '@/i18n/actions';

/** Segmented RU/EN control. `compact` fits the header menu; the full form labels itself. */
export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale || pending) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  const buttons = (
    <div className="flex gap-1 rounded-xl bg-slate-100 p-0.5">
      {LOCALES.map((option) => {
        const active = option === locale;
        return (
          <button
            key={option}
            type="button"
            onClick={() => choose(option)}
            aria-pressed={active}
            aria-label={LOCALE_NAMES[option]}
            disabled={pending}
            className={`flex-1 rounded-[10px] px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
              active ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {compact ? LOCALE_SHORT_NAMES[option] : LOCALE_NAMES[option]}
          </button>
        );
      })}
    </div>
  );

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-1.5">
        <span className="text-sm text-slate-500">{t('language')}</span>
        {buttons}
      </div>
    );
  }

  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-slate-700">{t('language')}</span>
      {buttons}
    </label>
  );
}
