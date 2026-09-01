import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const formData = await request.formData();
  const decision = formData.get('decision');
  const authorizationId = formData.get('authorization_id') as string | null;

  if (!authorizationId) {
    return NextResponse.json({ error: 'Missing authorization_id' }, { status: 400 });
  }

  const supabase = await createClient();

  if (decision === 'approve') {
    const { data, error } = await supabase.auth.oauth.approveAuthorization(authorizationId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    // 303: forces the browser to follow up with GET, since this handler is itself a
    // POST (form submit) and NextResponse.redirect defaults to 307, which would
    // preserve POST — and the OAuth client's callback only accepts GET.
    return NextResponse.redirect(data.redirect_url, 303);
  }

  const { data, error } = await supabase.auth.oauth.denyAuthorization(authorizationId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.redirect(data.redirect_url, 303);
}
