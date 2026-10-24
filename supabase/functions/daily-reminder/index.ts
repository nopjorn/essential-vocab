// Supabase Edge Function: sends the daily study reminder as a Web Push notification.
// Runs every hour (pg_cron, see SYNC-SETUP.md). For each subscription whose chosen reminder hour
// (push_subs.remind, e.g. '2000') matches the current hour in its time zone, and whose owner has not
// studied yet today, it sends a rotating reminder (card count, time needed, a due word, a gentle note when a big backlog
// is waiting). At 21:00 local a second reminder goes only to people with a 3+ day streak and no 🧊 who have not studied (message.mjs). Dead subscriptions (404/410) are deleted.
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@example.com).
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { buildMessage } from './message.mjs';

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
    const remindHour = (s.remind || '2000').slice(0, 2);
    // main reminder at the chosen hour; a second, late one at 21:00 when the chosen hour is earlier
    const kind = remindHour === hour ? 'main' : hour === '21' && remindHour < '21' ? 'late' : null;
    if (!kind) continue;
    const { data: row } = await sb.from('progress').select('data').eq('user_id', s.user_id).maybeSingle();
    const msg = buildMessage(row?.data, date, kind);
    if (!msg) continue; // already studied today, or nothing worth sending
    try {
      await webpush.sendNotification(s.sub, JSON.stringify({ title: msg.title, body: msg.body, url: APP_URL + msg.url, due: msg.due }));
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from('push_subs').delete().eq('endpoint', s.endpoint);
    }
  }
  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } });
});
