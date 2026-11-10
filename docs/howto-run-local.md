# วิธีรันแอปในเครื่อง (Windows)

"ศัพท์ต้องรู้" เป็นเว็บแบบ static (HTML + JS ธรรมดา) **ไม่มีขั้นตอน build** — แค่เปิดเว็บเซิร์ฟเวอร์ชี้ที่โฟลเดอร์โปรเจกต์ แล้วเปิดในเบราว์เซอร์ แก้ไฟล์แล้วรีเฟรชก็เห็นผลทันที

## 1. สิ่งที่ต้องมี

| ใช้ทำอะไร | ต้องมี |
|---|---|
| รันแอป | Python 3 (เช็กด้วย `python --version`) |
| รันชุดทดสอบ (ไม่บังคับ) | Node.js + npm (`node --version`, `npm --version`) |
| ดูแอป | เบราว์เซอร์ใดก็ได้ (แนะนำ Chrome / Edge) |

## 2. รันแอป

เปิด PowerShell ที่โฟลเดอร์โปรเจกต์ แล้วรัน:

```powershell
cd D:\Applications\GitHubApp\essential-vocab
python -m http.server 8765
```

จากนั้นเปิด **http://localhost:8765/** ในเบราว์เซอร์

- หยุดเซิร์ฟเวอร์: กด `Ctrl + C` ในหน้าต่างที่รันอยู่
- พอร์ต `8765` เป็นพอร์ตเดียวกับที่ชุดทดสอบใช้ จึงรันเซิร์ฟเวอร์ค้างไว้แล้วสั่ง `npm test` ได้เลย (config จะใช้เซิร์ฟเวอร์เดิมซ้ำ)
- ถ้าพอร์ตถูกใช้อยู่แล้ว ให้เปลี่ยนเลขพอร์ต (เช่น `python -m http.server 8080`) หรือดูว่าใครใช้อยู่:
  ```powershell
  Get-NetTCPConnection -LocalPort 8765 -State Listen
  ```
- **อย่าดับเบิลคลิกเปิด `index.html` ตรงๆ (`file://`)** — service worker จะไม่ลงทะเบียนและบางส่วนของแอปทำงานไม่ครบ ต้องเปิดผ่าน `http://localhost` เสมอ

## 3. ระวัง: `config.js` เปิดระบบซิงก์ + ล็อกอินไว้

ไฟล์ [config.js](../config.js) ที่ commit อยู่ตั้งค่า `url` เป็น Supabase จริง และ `requireLogin: true` ดังนั้นตอนเปิดที่ `localhost` แอปจะ **ล็อกอยู่ที่หน้าเข้าสู่ระบบ** และถ้าล็อกอินด้วยบัญชีจริง ข้อมูลที่ทดลองในเครื่องอาจถูกซิงก์ขึ้นไปปนกับข้อมูลจริงบนคลาวด์

(ข้อมูลความก้าวหน้าใน `localhost:8765` แยกจากของ `nopjorn.github.io` อยู่แล้ว เพราะ localStorage แยกตามที่อยู่เว็บ)

วิธีรันแบบไม่ยุ่งกับคลาวด์:

1. แก้ `config.js` ชั่วคราวให้ปิดซิงก์ — เว้น `url` ว่าง:
   ```js
   window.SYNC_CONFIG = { url: '', anonKey: '' };
   ```
2. รีเฟรชหน้า แอปจะเปิดได้ทันทีโดยไม่ต้องล็อกอิน และเก็บข้อมูลไว้ในเครื่องเท่านั้น
3. **ก่อน commit / push ต้องคืนค่าเดิม** ไม่เช่นนั้นเว็บจริงจะเสียระบบล็อกอินและซิงก์:
   ```powershell
   git checkout -- config.js
   git diff config.js   # ต้องไม่มีอะไรขึ้น
   ```

> ชุดทดสอบ Playwright ไม่ต้องทำขั้นตอนนี้ — มันแทนที่ `config.js` เป็นแบบปิดซิงก์ให้เองในทุกเทสต์ ([tests/helpers.js](../tests/helpers.js))

## 4. เมื่อหน้าไม่ตรงกับโค้ดล่าสุด (service worker แคช)

แอปมี service worker แบบ network-first จึงปกติรีเฟรชแล้วได้ไฟล์ใหม่ แต่ถ้าเห็นของเก่าค้าง:

- กด `Ctrl + Shift + R` (รีเฟรชแบบข้ามแคช) หรือ
- DevTools (`F12`) → **Application** → **Service Workers** → ติ๊ก **Bypass for network** (หรือกด **Unregister**) หรือ
- DevTools → **Application** → **Storage** → **Clear site data** (จะล้างข้อมูลความก้าวหน้าของ `localhost:8765` ด้วย)

ตอนทำงานบ่อยๆ แนะนำให้เปิด DevTools ค้างไว้ พร้อมติ๊ก **Bypass for network** และ **Disable cache**

## 5. ดูบน iPhone / iPad ในวงเน็ตเดียวกัน (ไม่บังคับ)

1. หา IP ของคอมพิวเตอร์: `ipconfig` (ดูบรรทัด IPv4 Address เช่น `192.168.1.20`)
2. รันเซิร์ฟเวอร์ตามข้อ 2 (Windows อาจถามเรื่อง Firewall ให้อนุญาตเฉพาะเครือข่ายส่วนตัว)
3. เปิด `http://192.168.1.20:8765/` ใน Safari บนเครื่อง

ข้อจำกัด: ที่อยู่แบบนี้ไม่ใช่ HTTPS จึง **ใช้ service worker และ "เพิ่มลงหน้าจอโฮม" ไม่ได้** — เหมาะแค่ดูหน้าตา/เลย์เอาต์ ส่วนการทดสอบแบบแอปบนหน้าจอโฮม ให้ push ขึ้น GitHub Pages แล้วทดสอบที่ `https://nopjorn.github.io/essential-vocab/`

ถ้าไม่อยากเปิดให้เครื่องอื่นเข้า ให้ผูกไว้เฉพาะเครื่องนี้: `python -m http.server 8765 --bind 127.0.0.1`

## 6. รันชุดทดสอบ (Playwright)

```powershell
npm ci                         # ครั้งแรก (ติดตั้งตามเวอร์ชันใน package-lock.json)
npx playwright install chromium  # ครั้งแรก หรือเมื่อ Playwright แจ้งว่าไม่พบเบราว์เซอร์
npm test                       # รันทั้งหมด
```

- config ([playwright.config.js](../playwright.config.js)) เปิด `python3 -m http.server 8765` ให้เอง จึงต้องมีคำสั่ง `python3` ใน PATH (เช็กด้วย `python3 --version`) ถ้ามีเซิร์ฟเวอร์รันอยู่ที่พอร์ต 8765 แล้วจะใช้ตัวนั้นต่อ
- ถ้า Playwright แจ้งว่าไม่พบเบราว์เซอร์เวอร์ชันที่ต้องการ และไม่อยากดาวน์โหลดใหม่ ให้ชี้ไปที่ Chromium ที่ติดตั้งไว้แล้วใน `%LOCALAPPDATA%\ms-playwright\chromium-<เลข>\chrome-win64\chrome.exe` ด้วย `$env:PW_CHROMIUM = '...'` (ใช้ได้กับชุดทดสอบนี้)
- **ไม่ต้องตั้ง `PW_CHROMIUM` เป็นปกติ** — ตัวแปรนี้ใช้เฉพาะในเครื่อง container ของ Claude (ตามที่เขียนใน [CLAUDE.md](../CLAUDE.md)) บน Windows ให้ Playwright ใช้เบราว์เซอร์ที่ติดตั้งเอง
- รันเฉพาะไฟล์ / เฉพาะเทสต์:
  ```powershell
  npx playwright test tests/data.spec.js            # ตรวจข้อมูล ไม่เปิดเบราว์เซอร์ เสร็จในไม่กี่วินาที
  npx playwright test tests/games.spec.js
  npx playwright test -g "ชื่อเทสต์บางส่วน"
  ```
- รันแบบแบ่งส่วนเหมือน CI: `npx playwright test --shard=1/3`
- ดูการทำงานของเทสต์แบบมีหน้าต่าง: `npx playwright test --ui`
- ผลรายงานอยู่ใน `test-results/` และ `playwright-report/` (ทั้งสองโฟลเดอร์อยู่ใน `.gitignore` แล้ว)

## 7. ก่อน push (ย่อ — รายละเอียดอยู่ใน [CLAUDE.md](../CLAUDE.md))

- `npm test` ผ่านครบ (CI รันชุดเดียวกันทุกครั้งที่ push ไป `master`)
- ขึ้นเลขเวอร์ชันทุกครั้ง: `APP_VERSION` ใน `app.js`, `VERSION` ใน `sw.js` (`o3k-<เวอร์ชันเดียวกัน>`), แถวใหม่ในตารางท้าย `README.md` และบนสุดของ `data/app/changelog.js`
- `git diff config.js` ต้องว่างเปล่า (ดูข้อ 3)
