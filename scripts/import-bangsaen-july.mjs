// One-off import of the 20-23/7 สายบางแสน ledger from the Excel handover sheet.
//   node scripts/import-bangsaen-july.mjs <payload.json> [--commit]
// Without --commit it only prints what WOULD change (dry run).
import fs from 'node:fs';
import path from 'node:path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const payloadFile = process.argv[2];
const COMMIT = process.argv.includes('--commit');
if (!payloadFile) {
  console.error('usage: node scripts/import-bangsaen-july.mjs <payload.json> [--commit]');
  process.exit(1);
}

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

const { customPrices, dailyLedger } = JSON.parse(fs.readFileSync(payloadFile, 'utf8'));

const read = async (name) => {
  const snap = await getDoc(doc(db, `bangsaen_app_data/${name}`));
  return snap.exists() ? snap.data().value : null;
};

// ---- customers: attach customPrices, leave every other field untouched ----
const customers = await read('customers');
if (!Array.isArray(customers)) throw new Error('customers doc missing');
let priced = 0;
const nextCustomers = customers.map((c) => {
  const prices = customPrices[c.id];
  if (!prices) return c;
  priced++;
  return { ...c, customPrices: { ...(c.customPrices || {}), ...prices } };
});
console.log(`customers: ${customers.length} total, setting custom prices on ${priced}`);

// ---- dailyLedger: merge the four days in, never dropping days already there ----
const existingLedger = (await read('dailyLedger')) || {};
const nextLedger = { ...existingLedger };
for (const [date, rows] of Object.entries(dailyLedger)) {
  const before = Object.keys(existingLedger[date] || {}).length;
  nextLedger[date] = { ...(existingLedger[date] || {}), ...rows };
  const total = Object.values(rows).reduce((s, e) => s + e.totalAmount, 0);
  console.log(
    `dailyLedger ${date}: ${Object.keys(rows).length} rows (had ${before}) รวม ฿${total.toLocaleString()}`
  );
}

// ---- products: make sure หลอดแพ็คแบ่ง exists ----
const products = await read('products');
const hasSplit = Array.isArray(products) && products.some((p) => p.key === 'packSplit');
const nextProducts = hasSplit
  ? products
  : [
      ...(products || []),
      {
        id: 'PROD-8',
        key: 'packSplit',
        labelTh: 'หลอดแพ็คแบ่ง',
        unit: 'ถุง',
        icon: 'shopping_bag',
        imageUrl: (products || []).find((p) => p.key === 'pack')?.imageUrl,
        pricePerUnit: 5,
        isSystem: true,
      },
    ];
console.log(`products: ${(products || []).length} -> ${nextProducts.length}${hasSplit ? ' (packSplit already present)' : ' (added หลอดแพ็คแบ่ง)'}`);

if (!COMMIT) {
  console.log('\nDRY RUN — nothing written. Re-run with --commit to apply.');
  process.exit(0);
}

await setDoc(doc(db, 'bangsaen_app_data/customers'), { value: nextCustomers });
await setDoc(doc(db, 'bangsaen_app_data/dailyLedger'), { value: nextLedger });
await setDoc(doc(db, 'bangsaen_app_data/products'), { value: nextProducts });
console.log('\nwritten to Firestore.');
process.exit(0);
