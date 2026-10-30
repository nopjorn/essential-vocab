// Smart reminders (1.72): the text builder shared by the Supabase Edge Function (supabase/functions/daily-reminder/message.mjs).
const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const load = () => import(pathToFileURL(path.join(__dirname, '..', 'supabase', 'functions', 'daily-reminder', 'message.mjs')).href);
const NOW = Date.parse('2026-10-24T12:00:00Z'), DAY = 86400000;
const prog = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => ['word' + i, { d: NOW - (i + 1) * DAY, b: 1 }]));

test('reminder text: skips people who already studied, rotates, gentle for a big backlog', async () => {
  const { buildMessage } = await load();
  expect(buildMessage({ hist: { '2026-10-24': 5 }, prog: prog(5) }, '2026-10-24', 'main', NOW)).toBeNull();
  // several days give different shapes but always mention the card count or a due word
  const bodies = new Set();
  for (let d = 1; d <= 20; d++) {
    const m = buildMessage({ prog: prog(12), streak: { count: 4 } }, `2026-10-${String(d).padStart(2, '0')}`, 'main', NOW);
    expect(m.due).toBe(12); expect(m.body).toMatch(/12|word0/); bodies.add(m.body.replace(/\d+/g, '#'));
  }
  expect(bodies.size).toBeGreaterThan(1);
  // big backlog: gentle, tells the daily cap instead of the scary number alone
  const big = buildMessage({ prog: prog(120) }, '2026-10-24', 'main', NOW);
  expect(big.body).toContain('120'); expect(big.body).toContain('50'); expect(big.body).toContain('ไม่ต้องรีบ');
  // gentle mode off → plain count
  expect(buildMessage({ prog: prog(120), settings: { gentle: false } }, '2026-10-24', 'main', NOW).body).not.toContain('ไม่ต้องรีบ');
  // nothing due → new words invitation
  expect(buildMessage({ prog: {}, streak: { count: 2 } }, '2026-10-24', 'main', NOW).body).toContain('คำใหม่');
});

test('late reminder: only for a 3+ day streak without freezes that has not studied today', async () => {
  const { buildMessage } = await load();
  const base = { prog: prog(3), streak: { count: 5 }, freeze: 0 };
  expect(buildMessage(base, '2026-10-24', 'late', NOW).body).toContain('สตรีค 5 วันกำลังจะขาด');
  expect(buildMessage({ ...base, freeze: 1 }, '2026-10-24', 'late', NOW)).toBeNull();
  expect(buildMessage({ ...base, streak: { count: 2 } }, '2026-10-24', 'late', NOW)).toBeNull();
  expect(buildMessage({ ...base, hist: { '2026-10-24': 1 } }, '2026-10-24', 'late', NOW)).toBeNull();
});

test('a broken streak is not announced (no "about to break", no "keep your streak")', async () => {
  const { buildMessage } = await load();
  const d = { prog: prog(3), streak: { count: 45, last: '2026-10-14' }, freeze: 0 };
  expect(buildMessage(d, '2026-10-24', 'late', NOW)).toBeNull();
  expect(buildMessage(d, '2026-10-24', 'main', NOW).body).not.toContain('สตรีค');
  // yesterday was the last day: still at risk
  expect(buildMessage({ ...d, streak: { count: 45, last: '2026-10-23' } }, '2026-10-24', 'late', NOW).body).toContain('สตรีค 45 วันกำลังจะขาด');
  // a missed day covered by a freeze keeps the streak in the main message
  expect(buildMessage({ ...d, streak: { count: 45, last: '2026-10-22' }, freeze: 1 }, '2026-10-24', 'main', NOW).body).toContain('45 วัน');
});
