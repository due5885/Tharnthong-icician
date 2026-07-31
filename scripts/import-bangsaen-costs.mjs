// Loads the cost side of the 20-23/7 handover sheet: itemised ice purchases from ธารทิพย์
// (which is also the stock-in) and the daily fuel expense.
//   node scripts/import-bangsaen-costs.mjs [--commit]
import fs from 'node:fs';
import path from 'node:path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const COMMIT = process.argv.includes('--commit');

// Supplier unit costs solved from the four daily "จ่ายค่าน้ำแข็ง" totals — the only integer
// set that reproduces all four exactly (฿2,873 / ฿3,486 / ฿2,420 / ฿2,422).
const UNIT_COST = { kon: 60, mo: 24, yai: 19, jio: 20, mud: 60 };
const LABEL = { kon: 'ก้อน', mo: 'โม่', yai: 'ใหญ่', jio: 'จิ๋ว', mud: 'มัด' };

const PURCHASES = {
  '2026-07-20': { qty: { kon: 1, mo: 2, yai: 55, jio: 20, mud: 22 }, total: 2873 },
  '2026-07-21': { qty: { kon: 1, mo: 4, yai: 90, jio: 15, mud: 22 }, total: 3486 },
  '2026-07-22': { qty: { kon: 1, yai: 40, jio: 20, mud: 20 }, total: 2420 },
  '2026-07-23': { qty: { kon: 1, mo: 8, yai: 30, jio: 20, mud: 20 }, total: 2422 },
};
const FUEL = { '2026-07-20': 600, '2026-07-21': 600, '2026-07-22': 500, '2026-07-23': 600 };

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

const [suppliers, purchases, expenses, itemTypes] = await Promise.all([
  read('iceSuppliers'),
  read('icePurchases'),
  read('expenses'),
  read('icePurchaseItemTypes'),
]);

const supplier = (suppliers || [])[0];
if (!supplier) throw new Error('no ice supplier configured');

// lock the solved unit prices onto the supplier so future entries auto-calculate
const nextSuppliers = (suppliers || []).map((s) =>
  s.id === supplier.id ? { ...s, itemPrices: { ...(s.itemPrices || {}), ...UNIT_COST } } : s
);

const PREFIX = 'ICEP-XLSX-';
const newPurchases = Object.entries(PURCHASES).map(([date, { qty, total }]) => {
  const items = Object.entries(qty).map(([key, quantity]) => ({
    name: LABEL[key],
    quantity,
    amount: quantity * UNIT_COST[key],
  }));
  const sum = items.reduce((s, i) => s + i.amount, 0);
  if (sum !== total) throw new Error(`${date}: computed ฿${sum} != sheet ฿${total}`);
  return {
    id: `${PREFIX}${date}`,
    date,
    time: '06:00',
    supplierId: supplier.id,
    supplierName: supplier.name,
    items,
    totalAmount: total,
    paymentType: 'Cash',
    note: 'นำเข้าจากใบสรุปสายบางแสน 20-23/7/69',
  };
});

const EXP_PREFIX = 'EXP-XLSX-FUEL-';
const newExpenses = Object.entries(FUEL).map(([date, amount]) => ({
  id: `${EXP_PREFIX}${date}`,
  time: '06:00',
  route: 'สายบางแสน',
  category: 'Fuel',
  categoryTh: 'ค่าน้ำมัน',
  icon: 'local_gas_station',
  description: 'ค่าน้ำมันรถส่งน้ำแข็ง',
  amount,
  status: 'Cash',
  date,
}));

const keptPurchases = (purchases || []).filter((p) => !String(p.id).startsWith(PREFIX));
const keptExpenses = (expenses || []).filter((e) => !String(e.id).startsWith(EXP_PREFIX));
const nextPurchases = [...newPurchases, ...keptPurchases];
const nextExpenses = [...newExpenses, ...keptExpenses];

console.log(`supplier: ${supplier.name} — locking unit costs ${JSON.stringify(UNIT_COST)}`);
console.log(`item types available: ${(itemTypes || []).map((t) => t.labelTh).join(', ')}`);
console.log(`\nice purchases (${newPurchases.length} days, keeping ${keptPurchases.length} existing):`);
newPurchases.forEach((p) =>
  console.log(`  ${p.date}: ${p.items.map((i) => `${i.name}×${i.quantity}=฿${i.amount}`).join('  ')}  → รวม ฿${p.totalAmount.toLocaleString()}`)
);
console.log(`\nfuel expenses (${newExpenses.length} days, keeping ${keptExpenses.length} existing):`);
newExpenses.forEach((e) => console.log(`  ${e.date}: ฿${e.amount}`));

if (!COMMIT) {
  console.log('\nDRY RUN — nothing written. Re-run with --commit.');
  process.exit(0);
}
await setDoc(doc(db, 'bangsaen_app_data/iceSuppliers'), { value: nextSuppliers });
await setDoc(doc(db, 'bangsaen_app_data/icePurchases'), { value: nextPurchases });
await setDoc(doc(db, 'bangsaen_app_data/expenses'), { value: nextExpenses });
console.log('\nwritten to Firestore.');
process.exit(0);
