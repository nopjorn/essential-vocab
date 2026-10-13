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
ความคืบหน้าในเครื่องจะถูกรวมกับบนคลาวด์ (คำไหนก้าวหน้ากว่าจะเก็บอันนั้น) แล้วซิงก์อัตโนมัติทุกครั้งที่เล่น

> หมายเหตุ: `requireLogin` ล็อกหน้าแอปและข้อมูลบนคลาวด์ แต่ไฟล์เว็บ (โค้ด/รายการคำ) บน GitHub Pages ยังเปิดดูได้
> ถ้าต้องการปิดทั้งหมดจริงๆ ให้ย้ายไปวางบน Cloudflare Pages + Cloudflare Access
