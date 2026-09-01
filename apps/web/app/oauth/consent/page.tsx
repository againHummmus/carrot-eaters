import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string }>;
}) {
  const { authorization_id: authorizationId } = await searchParams;

  if (!authorizationId) {
    return <ErrorCard message="Отсутствует authorization_id." />;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect(`/login?redirect=${encodeURIComponent(`/oauth/consent?authorization_id=${authorizationId}`)}`);
  }

  const { data: authDetails, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

  if (error || !authDetails) {
    return <ErrorCard message={error?.message ?? 'Некорректный запрос авторизации.'} />;
  }

  if (!('authorization_id' in authDetails)) {
    redirect(authDetails.redirect_url);
  }

  const scopes = authDetails.scope?.trim() ? authDetails.scope.split(' ') : [];

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <div className="animate-fade-in-up flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/5 sm:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-2xl shadow-sm shadow-emerald-500/30">
            🥕
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Разрешить доступ?</h1>
          <p className="text-sm text-slate-500">
            <span className="font-medium text-slate-800">{authDetails.client.name}</span> запрашивает доступ к твоим данным в Carrot
            Eaters.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <p>
            <span className="text-slate-500">Приложение:</span> {authDetails.client.name}
          </p>
          <p className="mt-1 break-all">
            <span className="text-slate-500">Redirect URI:</span> {authDetails.redirect_uri}
          </p>
          {scopes.length > 0 && (
            <div className="mt-2">
              <span className="text-slate-500">Разрешения:</span>
              <ul className="ml-4 list-disc">
                {scopes.map((scope) => (
                  <li key={scope}>{scope}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <form action="/api/oauth/decision" method="POST" className="flex gap-3">
          <input type="hidden" name="authorization_id" value={authorizationId} />
          <button
            type="submit"
            name="decision"
            value="approve"
            className="flex-1 rounded-lg bg-slate-900 px-3 py-2.5 font-medium text-white transition-all hover:bg-slate-800 active:scale-[0.98]"
          >
            Разрешить
          </button>
          <button
            type="submit"
            name="decision"
            value="deny"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 font-medium text-slate-600 transition-all hover:bg-slate-50 active:scale-[0.98]"
          >
            Отклонить
          </button>
        </form>
      </div>
    </main>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <p className="animate-fade-in-up rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
        Ошибка: {message}
      </p>
    </main>
  );
}
