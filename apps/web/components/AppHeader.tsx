'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signOut } from '@/app/settings/actions';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

export function AppHeader() {
  const t = useTranslations('nav');
  const links = [
    { href: '/dashboard', label: t('today') },
    { href: '/history', label: t('history') },
    { href: '/recipes', label: t('recipes') },
    { href: '/settings', label: t('settings') },
  ];
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 w-full border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight text-slate-900">
          <img src="/icons/icon-192.png" alt="" width={32} height={32} className="h-8 w-8 rounded-xl shadow-sm shadow-emerald-500/20" />
          Carrot Eaters
        </Link>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95"
          >
            {t('menu')}
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            >
              <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div
            className={`absolute right-0 mt-2 w-48 origin-top-right rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/5 transition-all duration-150 ${
              open ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
            }`}
          >
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center rounded-xl px-3 py-2 text-sm transition-colors ${
                    active ? 'bg-emerald-50 font-medium text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="my-1 h-px bg-slate-100" />
            <LocaleSwitcher compact />
            <div className="my-1 h-px bg-slate-100" />
            <form action={signOut}>
              <button
                type="submit"
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
              >
                {t('signOut')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
