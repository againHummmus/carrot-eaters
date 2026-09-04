'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getTranslations } from 'next-intl/server';

export async function updateSettings(formData: FormData) {
  const { supabase, userId } = await requireUser();

  const kcalTarget = Number(formData.get('kcal_target'));
  const timezone = String(formData.get('timezone') ?? '').trim();

  if (!Number.isFinite(kcalTarget) || kcalTarget <= 0 || !timezone) {
    const t = await getTranslations('settings');
    throw new Error(t('invalid'));
  }

  const { error } = await supabase.from('profiles').update({ kcal_target: kcalTarget, timezone }).eq('user_id', userId);
  if (error) throw new Error(error.message);

  revalidatePath('/dashboard');
  revalidatePath('/settings');
}

export async function signOut() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect('/login');
}
