'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getTranslations } from 'next-intl/server';

export async function createProfile(formData: FormData) {
  const { supabase, userId } = await requireUser();

  const name = String(formData.get('name') ?? '').trim();
  const kcalTarget = Number(formData.get('kcal_target'));
  const timezone = String(formData.get('timezone') ?? 'Europe/Belgrade');

  if (!name || !Number.isFinite(kcalTarget) || kcalTarget <= 0) {
    const t = await getTranslations('onboarding');
    throw new Error(t('invalid'));
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, name, kcal_target: kcalTarget, timezone });
  if (error) throw new Error(error.message);

  redirect('/dashboard');
}
