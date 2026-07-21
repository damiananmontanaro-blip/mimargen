/**
 * Webhook de Lemon Squeezy → mantiene la tabla subscriptions al día.
 * Seguridad: verifica la firma HMAC-SHA256 del body crudo (X-Signature).
 * Usa la SERVICE ROLE key (solo server-side) para escribir salteando RLS.
 */
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !url || !serviceKey) {
    return NextResponse.json({ error: 'Webhook no configurado' }, { status: 500 });
  }

  const raw = await req.text();
  const firma = req.headers.get('x-signature') ?? '';
  const esperada = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(firma, 'utf8');
  const b = Buffer.from(esperada, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
  }

  let payload: any;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const evento: string = payload?.meta?.event_name ?? '';
  const userId: string | undefined = payload?.meta?.custom_data?.user_id;
  const attrs = payload?.data?.attributes ?? {};
  const subId: string = String(payload?.data?.id ?? '');
  const status: string = attrs.status ?? 'unknown';
  const emailCliente: string | null = attrs.user_email ?? null;
  const renuevaEl: string | null = attrs.renews_at ?? null;
  const terminaEl: string | null = attrs.ends_at ?? null;

  if (!evento.startsWith('subscription_')) {
    return NextResponse.json({ ok: true, ignored: evento });
  }
  if (!userId) {
    // Sin custom user_id no podemos mapear al usuario: registrar y responder 200 para que Lemon no reintente infinito.
    console.error('Webhook Lemon sin custom_data.user_id', { evento, subId, emailCliente });
    return NextResponse.json({ ok: true, warning: 'sin user_id' });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error } = await admin.from('subscriptions').upsert(
    {
      user_id: userId,
      lemon_subscription_id: subId,
      status,
      email: emailCliente,
      renews_at: renuevaEl,
      ends_at: terminaEl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) {
    console.error('Error guardando suscripción', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
