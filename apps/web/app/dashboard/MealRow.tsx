'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { MealWithItems } from '@carrot-eaters/shared';

export function MealRow({ meal, delay = 0 }: { meal: MealWithItems; delay?: number }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(meal.title);
  const [busy, setBusy] = useState(false);

  const time = new Date(meal.eaten_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  async function handleDelete() {
    if (!confirm(`Удалить «${meal.title}»?`)) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from('meals').delete().eq('id', meal.id);
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    router.refresh();
  }

  async function handleRename() {
    if (!title.trim() || title === meal.title) {
      setEditing(false);
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from('meals').update({ title }).eq('id', meal.id);
    setBusy(false);
    setEditing(false);
    if (error) {
      alert(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm shadow-slate-900/3 transition-shadow hover:shadow-md"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setExpanded((v) => !v)}>
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className={`h-4 w-4 shrink-0 text-slate-300 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          >
            <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="min-w-0 flex-1">
            {editing ? (
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                onClick={(e) => e.stopPropagation()}
                className="w-full rounded border border-slate-300 px-1 py-0.5 text-sm font-medium"
              />
            ) : (
              <p className="truncate font-medium text-slate-800">{meal.title}</p>
            )}
            <p className="text-xs text-slate-400">{time}</p>
          </div>
        </button>
        <div className="shrink-0 text-right">
          <p className="text-sm font-medium text-slate-800">{Math.round(meal.kcal)} ккал</p>
          <p className="text-xs text-slate-400">
            Б{Math.round(meal.protein)}/Ж{Math.round(meal.fat)}/У{Math.round(meal.carbs)}
          </p>
        </div>
      </div>

      <div
        className={`grid transition-all duration-200 ease-out ${expanded ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
            {meal.items?.map((item) => (
              <div key={item.id} className="flex justify-between text-sm text-slate-600">
                <span className="truncate pr-2">
                  {item.name}
                  {item.grams ? ` (${item.grams} г)` : ''}
                </span>
                <span className="shrink-0">{Math.round(item.kcal)} ккал</span>
              </div>
            ))}
            <div className="mt-1 flex gap-4 text-sm">
              <button disabled={busy} onClick={() => setEditing(true)} className="text-slate-500 transition-colors hover:text-slate-800 disabled:opacity-50">
                Переименовать
              </button>
              <button disabled={busy} onClick={handleDelete} className="text-red-500 transition-colors hover:text-red-700 disabled:opacity-50">
                Удалить
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
