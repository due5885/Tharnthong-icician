// Creates the DeliveryRecord entries that match the imported daily ledger, so the Summary /
// cash-reconciliation screens (which read deliveries, not the ledger) show the same numbers.
// Deterministic ids make this safe to re-run.
//   node scripts/import-bangsaen-deliveries.mjs [--commit]
import fs from 'node:fs';
import path from 'node:path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const COMMIT = process.argv.includes('--commit');
const DATES = ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23'];

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

const [ledger, customers, products, routes, deliveries] = await Promise.all([
  read('dailyLedger'),
  read('customers'),
  read('products'),
  read('routes'),
  read('deliveries'),
]);

const custById = Object.fromEntries((customers || []).map((c) => [c.id, c]));
const labelByKey = Object.fromEntries((products || []).map((p) => [p.key, p.labelTh]));
const routeIdByName = Object.fromEntries((routes || []).map((r) => [r.name, r.id]));

const IMPORT_PREFIX = 'DEL-XLSX-';
const generated = [];
for (const date of DATES) {
  const rows = ledger?.[date] || {};
  for (const [customerId, entry] of Object.entries(rows)) {
    const cust = custById[customerId];
    if (!cust) continue;
    const summaryText = Object.entries(entry.quantities || {})
      .filter(([, q]) => q > 0)
      .map(([k, q]) => `${labelByKey[k] || k}(${q})`)
      .join(', ');
    generated.push({
      id: `${IMPORT_PREFIX}${date}-${customerId}`,
      time: '09:00',
      customerId,
      customerName: cust.name,
      summaryText,
      totalAmount: entry.totalAmount,
      status: entry.status || 'Cash',
      date,
      routeId: routeIdByName[cust.route],
      routeName: cust.route,
    });
  }
}

const kept = (deliveries || []).filter((d) => !String(d.id).startsWith(IMPORT_PREFIX));
const next = [...generated, ...kept];

console.log(`existing deliveries: ${(deliveries || []).length} (keeping ${kept.length} non-import)`);
console.log(`generated from ledger: ${generated.length}`);
for (const date of DATES) {
  const forDate = generated.filter((d) => d.date === date);
  const sum = forDate.reduce((s, d) => s + d.totalAmount, 0);
  console.log(`  ${date}: ${forDate.length} bills  รวม ฿${sum.toLocaleString()}`);
}

if (!COMMIT) {
  console.log('\nDRY RUN — nothing written. Re-run with --commit.');
  process.exit(0);
}
await setDoc(doc(db, 'bangsaen_app_data/deliveries'), { value: next });
console.log(`\nwritten: deliveries now ${next.length} records.`);
process.exit(0);
