# ตั้งค่าซิงก์ข้อมูลอัตโนมัติ (Supabase) ☁️

ทำครั้งเดียวราว 15 นาที ใช้แพ็กเกจฟรีของ Supabase ได้
หลังตั้งค่าเสร็จ ความคืบหน้าจะเก็บบนคลาวด์ ลบแอปหรือเปลี่ยนเครื่องก็ไม่หาย และล็อกให้ใช้ได้เฉพาะคนที่เชิญได้

## 1. สร้างโปรเจกต์
1. สมัคร / เข้าสู่ระบบที่ https://supabase.com → **New project**
2. ตั้งชื่อ (เช่น `essential-vocab`) เลือก Region ใกล้ๆ เช่น **Southeast Asia (Singapore)** ตั้งรหัสผ่านฐานข้อมูลแล้วกด **Create**

## 2. สร้างตารางเก็บความคืบหน้า
เมนู **SQL Editor** → **New query** → วางโค้ดนี้แล้วกด **Run**

```sql
create table public.progress (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.progress enable row level security;
create policy "own progress" on public.progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```
ทุกคนจะอ่าน/เขียนได้เฉพาะแถวของตัวเองเท่านั้น

ถ้าอยากมี **อันดับเพื่อน** 🏆 และ **แจ้งเตือนรายวัน** 🔔 รันต่ออีกชุด:

```sql
-- อันดับเพื่อน: ทุกคนที่ล็อกอินเห็นอันดับ แต่แก้ได้เฉพาะแถวตัวเอง
create table public.leaderboard (
  user_id uuid primary key references auth.users on delete cascade,
  name text, xp int default 0, week text, week_xp int default 0,
  streak int default 0, mastered int default 0, updated_at timestamptz default now()
);
alter table public.leaderboard enable row level security;
create policy "members read" on public.leaderboard for select to authenticated using (true);
create policy "own insert" on public.leaderboard for insert to authenticated with check (auth.uid() = user_id);
create policy "own update" on public.leaderboard for update to authenticated using (auth.uid() = user_id);

-- แจ้งเตือน: เก็บการสมัครรับแจ้งเตือนของแต่ละเครื่อง
create table public.push_subs (
  endpoint text primary key,
  user_id uuid not null references auth.users on delete cascade,
  sub jsonb not null, remind text default '2000', tz text default 'Asia/Bangkok',
  updated_at timestamptz default now()
);
alter table public.push_subs enable row level security;
create policy "own subs" on public.push_subs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

## 3. ตั้งค่าการเข้าสู่ระบบ
1. **Authentication → Sign In / Providers** (หรือ **Providers**) → เปิด **Email**
2. ปิด **Allow new users to sign up** → คนแปลกหน้าสมัครเองไม่ได้ ใช้ได้เฉพาะคนที่เชิญ
3. **Authentication → Emails → Magic Link** แก้เนื้อหาอีเมลให้มีรหัส 6 หลัก เช่น
   ```html
   <h2>รหัสเข้าสู่ระบบ ศัพท์ต้องรู้</h2>
   <p>รหัสของคุณคือ <b style="font-size:24px">{{ .Token }}</b></p>
   ```
   (แอปใช้รหัสแทนลิงก์ เพราะลิงก์จะเปิดใน Safari ไม่ใช่ในแอปบนหน้าจอโฮม)
4. **Authentication → URL Configuration** → Site URL ใส่ `https://nopjorn.github.io/essential-vocab/`

## 4. เชิญคนที่อนุญาต
**Authentication → Users → Add user → Send invitation** ใส่อีเมล (ของตัวเองด้วย)
อยากเลิกให้ใครใช้ → ลบผู้ใช้คนนั้นในหน้านี้

## 5. ใส่ค่าในแอป
1. **Project Settings → API** คัดลอก **Project URL** และ **anon public key**
2. แก้ไฟล์ `config.js` ใน GitHub:
   ```js
   window.SYNC_CONFIG = {
     url: 'https://xxxxxxxx.supabase.co',
     anonKey: 'eyJhbGciOi...',
     requireLogin: true,   // true = ต้องเข้าสู่ระบบก่อนถึงจะใช้แอปได้
   };
   ```
   anon key ออกแบบมาให้เปิดเผยได้ ข้อมูลถูกป้องกันด้วยกฎในข้อ 2
3. Commit → รอ 1–2 นาที → ปิดแล้วเปิดแอปใหม่

## 6. เข้าสู่ระบบในแอป
⚙️ ตั้งค่า → ☁️ ซิงก์ข้อมูลอัตโนมัติ → **เข้าสู่ระบบ** → ใส่อีเมล → ใส่รหัส 6 หลักจากอีเมล
ความคืบหน้าในเครื่องจะถูกรวมกับบนคลาวด์ (คำที่แก้ล่าสุดจะชนะ เช่น กด “ลืม” หรือลบวิธีจำบนเครื่องหนึ่ง เครื่องอื่นจะได้ตามนั้น · ข้อมูลเก่าที่ไม่มีเวลาแก้ไขใช้กติกา “คำที่ก้าวหน้ากว่าอยู่”) แล้วซิงก์อัตโนมัติทุกครั้งที่เล่น

## 7. แจ้งเตือนรายวันบน iPhone (ไม่บังคับ) 🔔
ใช้ได้กับแอปที่ติดตั้งบนหน้าจอโฮม iOS 16.4 ขึ้นไป แจ้งเตือนตามเวลาที่ตั้งในแอป เฉพาะวันที่ยังไม่ได้เล่น

1. สร้างคีย์ VAPID (ในคอมที่มี Node.js): `npx web-push generate-vapid-keys` จะได้ Public Key กับ Private Key
2. ติดตั้ง Supabase CLI แล้วในโฟลเดอร์ repo นี้:
   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   supabase secrets set VAPID_PUBLIC_KEY=<public> VAPID_PRIVATE_KEY=<private> VAPID_SUBJECT=mailto:<อีเมลคุณ>
   supabase functions deploy daily-reminder
   ```
3. ตั้งให้ทำงานทุกชั่วโมง: **Database → Extensions** เปิด `pg_cron` และ `pg_net` แล้วรันใน SQL Editor
   (แทน `<project-ref>` และ `<service-role-key>` จาก Project Settings → API — **อย่าใส่ service-role key ในโค้ดแอป**)
   ```sql
   select cron.schedule('daily-reminder', '0 * * * *', $$
     select net.http_post(
       url := 'https://<project-ref>.supabase.co/functions/v1/daily-reminder',
       headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
     );
   $$);
   ```
4. ใส่ Public Key ใน `config.js` → `vapidPublicKey: '<public>'` แล้ว push
5. ในแอป (เข้าสู่ระบบแล้ว): ⚙️ ตั้งค่า → เตือนให้มาเรียนทุกวัน → เปิดสวิตช์ **🔔 แจ้งเตือนในแอป** → กดอนุญาต

> **แจ้งเตือนฉลาดขึ้น (1.72.0):** ข้อความแจ้งเตือนหมุนเวียนทุกวัน (จำนวนการ์ด / เวลาที่ใช้ / คำที่ค้างอยู่) และบอกเบาๆ เมื่อการ์ดค้างเยอะ
> นอกจากนี้ตอน 21:00 (เวลาของเครื่อง) จะส่ง **รอบสอง** เฉพาะคนที่สตรีค 3 วันขึ้นไป ไม่มี 🧊 และวันนี้ยังไม่ได้เรียน (ถ้าตั้งเวลาเตือนหลัก 21:00 ขึ้นไปจะไม่ส่งรอบสอง)
> ต้อง deploy ใหม่หลังอัปเดต: `supabase functions deploy daily-reminder` (cron เดิมใช้ได้เลย) · ตัวสร้างข้อความอยู่ใน `supabase/functions/daily-reminder/message.mjs`

> หมายเหตุ: `requireLogin` ล็อกหน้าแอปและข้อมูลบนคลาวด์ แต่ไฟล์เว็บ (โค้ด/รายการคำ) บน GitHub Pages ยังเปิดดูได้
> ถ้าต้องการปิดทั้งหมดจริงๆ ให้ย้ายไปวางบน Cloudflare Pages + Cloudflare Access
