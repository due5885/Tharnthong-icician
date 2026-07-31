// Confirms every per-customer price stored in Firestore matches the agreed table exactly,
// and that prices live on the customer record (fixed for every date) rather than per-day.
//   node scripts/verify-customer-prices.mjs
import fs from 'node:fs';
import path from 'node:path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// key -> Thai column name used in the agreed table
const KEY_TH = {
  largeTube: 'หลอดใหญ่',
  smallTube: 'หลอดเล็ก',
  tubeCrushed: 'หลอดโม่',
  pack: 'หลอดแพ็ค',
  packSplit: 'หลอดแพ็คแบ่ง',
  crushed: 'โม่ ก.ส.',
  cube: 'ก้อน',
};

// The table Boss signed off on, keyed by ลำดับ (BSN code number).
const EXPECTED = {
  1:  { tubeCrushed: 35, pack: 110 },
  2:  { smallTube: 35, pack: 100, packSplit: 5 },
  3:  { smallTube: 35, tubeCrushed: 35 },
  4:  { largeTube: 35, packSplit: 5 },
  5:  { smallTube: 35, pack: 110, packSplit: 5.5 },
  6:  { packSplit: 5 },
  7:  { smallTube: 35 },
  8:  { smallTube: 35 },
  9:  { smallTube: 35, tubeCrushed: 35 },
  10: { smallTube: 35 },
  11: { smallTube: 35 },
  12: { pack: 110, packSplit: 5.5 },
  13: { pack: 110, packSplit: 5.5 },
  14: { pack: 100 },
  15: { largeTube: 33, smallTube: 33, packSplit: 33 },
  16: { pack: 110 },
  17: { smallTube: 35, pack: 110, packSplit: 5.5 },
  20: { largeTube: 33, pack: 110 },
  21: { smallTube: 35 },
  22: { largeTube: 35, smallTube: 35, pack: 110 },
  23: { pack: 110 },
  24: { pack: 100 },
  25: { pack: 110 },
  26: { pack: 110, packSplit: 5.5 },
  28: { pack: 100, packSplit: 5 },
  29: { packSplit: 5 },
  30: { pack: 110 },
  31: { pack: 120 },
  35: { largeTube: 30 },
  36: { largeTube: 30, smallTube: 30, pack: 110, crushed: 0 },
  38: { largeTube: 30 },
  39: { largeTube: 33 },
};

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);
const read = async (n) => {
  const s = await getDoc(doc(db, `bangsaen_app_data/${n}`));
  return s.exists() ? s.data().value : null;
};

const [customers, ledger] = await Promise.all([read('customers'), read('dailyLedger')]);
const byCode = Object.fromEntries((customers || []).map((c) => [c.code, c]));

let ok = 0;
const problems = [];
for (const [num, want] of Object.entries(EXPECTED)) {
  const code = `BSN${String(num).padStart(3, '0')}`;
  const cust = byCode[code];
  if (!cust) {
    problems.push(`${code}: ไม่พบลูกค้า`);
    continue;
  }
  const got = cust.customPrices || {};
  const wantKeys = Object.keys(want).sort().join(',');
  const gotKeys = Object.keys(got).sort().join(',');
  const mismatched = Object.entries(want).filter(([k, v]) => Number(got[k]) !== Number(v));
  const extra = Object.keys(got).filter((k) => !(k in want));
  if (mismatched.length === 0 && extra.length === 0 && wantKeys === gotKeys) {
    ok++;
  } else {
    const detail = [
      ...mismatched.map(([k, v]) => `${KEY_TH[k] || k}: ควรเป็น ฿${v} แต่เป็น ${got[k] === undefined ? 'ไม่ได้ตั้ง' : '฿' + got[k]}`),
      ...extra.map((k) => `มีเกินมา ${KEY_TH[k] || k} ฿${got[k]}`),
    ];
    problems.push(`${code} ${cust.name}: ${detail.join(' | ')}`);
  }
}

console.log(`ตรวจราคาเฉพาะราย: ตรง ${ok}/${Object.keys(EXPECTED).length} ร้าน`);
if (problems.length) {
  console.log('\nปัญหาที่พบ:');
  problems.forEach((p) => console.log('  ' + p));
} else {
  console.log('*** ตรงกับตารางที่ตกลงกันไว้ทุกร้าน ทุกรายการ ***');
}

// Anything else carrying custom prices that shouldn't
const unexpected = (customers || []).filter(
  (c) => c.customPrices && Object.keys(c.customPrices).length > 0 &&
    !(c.code in byCode && EXPECTED[Number(String(c.code).replace('BSN', ''))])
);
console.log(`\nลูกค้าที่มีราคาเฉพาะแต่ไม่ได้อยู่ในตาราง: ${unexpected.length}`);
unexpected.forEach((c) => console.log(`  ${c.code} ${c.name}: ${JSON.stringify(c.customPrices)}`));

// Prove prices are NOT stored per-day: no ledger entry should carry a price field
let priceInLedger = 0;
for (const rows of Object.values(ledger || {})) {
  for (const e of Object.values(rows)) {
    if (e.customPrices || e.prices) priceInLedger++;
  }
}
console.log(`\nราคาที่ถูกเก็บปนอยู่ในข้อมูลรายวัน: ${priceInLedger} รายการ ${priceInLedger === 0 ? '(ถูกต้อง — ราคาผูกกับลูกค้า ไม่ผูกกับวัน)' : '(ผิด!)'}`);
console.log(`วันที่มีข้อมูลในระบบ: ${Object.keys(ledger || {}).sort().join(', ')}`);
process.exit(problems.length ? 1 : 0);
