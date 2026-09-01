'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { MealWithItems } from '@kbju/shared';

export function MealRow({ meal }: { meal: MealWithItems }) {
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
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <button className="flex-1 text-left" onClick={() => setExpanded((v) => !v)}>
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
            <p className="font-medium">{meal.title}</p>
          )}
          <p className="text-xs text-slate-400">{time}</p>
        </button>
        <div className="text-right">
          <p className="text-sm font-medium">{Math.round(meal.kcal)} ккал</p>
          <p className="text-xs text-slate-400">
            Б{Math.round(meal.protein)}/Ж{Math.round(meal.fat)}/У{Math.round(meal.carbs)}
          </p>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
          {meal.items?.map((item) => (
            <div key={item.id} className="flex justify-between text-sm text-slate-600">
              <span>
                {item.name}
                {item.grams ? ` (${item.grams} г)` : ''}
              </span>
              <span>{Math.round(item.kcal)} ккал</span>
            </div>
          ))}
          <div className="mt-1 flex gap-3 text-sm">
            <button disabled={busy} onClick={() => setEditing(true)} className="text-slate-500 underline disabled:opacity-50">
              Переименовать
            </button>
            <button disabled={busy} onClick={handleDelete} className="text-red-600 underline disabled:opacity-50">
              Удалить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
