// Supabase Edge Function: sends the daily study reminder as a Web Push notification.
// Runs every hour (pg_cron, see SYNC-SETUP.md). For each subscription whose chosen reminder hour
// (push_subs.remind, e.g. '2000') matches the current hour in its time zone, and whose owner has not
// studied yet today, it sends "วันนี้มีการ์ดรอ N ใบ". Dead subscriptions (404/410) are deleted.
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@example.com).
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);
const APP_URL = Deno.env.get('APP_URL') ?? 'https://nopjorn.github.io/essential-vocab/';

const localParts = (tz: string) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: p.hour };
};

Deno.serve(async () => {
  const { data: subs, error } = await sb.from('push_subs').select('endpoint, user_id, sub, remind, tz');
  if (error) return new Response(error.message, { status: 500 });
  let sent = 0;
  for (const s of subs ?? []) {
    const { date, hour } = localParts(s.tz || 'Asia/Bangkok');
    if ((s.remind || '2000').slice(0, 2) !== hour) continue;
    const { data: row } = await sb.from('progress').select('data').eq('user_id', s.user_id).maybeSingle();
    const d = row?.data ?? {};
    if (d.hist?.[date]) continue; // already studied today
    const now = Date.now();
    const due = Object.values(d.prog ?? {}).filter((p: any) => p && p.d <= now).length;
    const streak = d.streak?.count ?? 0;
    const body = due ? `วันนี้มีการ์ดรอทบทวน ${due} ใบ${streak ? ` · รักษาสตรีค 🔥 ${streak} วันไว้นะ` : ''}` : 'มาเรียนคำใหม่วันละนิดกัน 📚';
    try {
      await webpush.sendNotification(s.sub, JSON.stringify({ title: 'ศัพท์ต้องรู้ 📚', body, url: APP_URL }));
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from('push_subs').delete().eq('endpoint', s.endpoint);
    }
  }
  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } });
});
