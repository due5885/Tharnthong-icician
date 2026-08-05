// Imports the new สายพระยาสัจจา route from "สรุปการขายเดือน 8 9921.xlsx".
// Customer names are stripped of Burmese/English (those exist only so migrant staff can
// read the sheet). Only วันที่ 1 carries real figures; sheets 2-10 are blank templates.
//   node scripts/import-phrayasajja.mjs <sj_data.json> [--commit]
import fs from 'node:fs';
import path from 'node:path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const dataFile = process.argv[2];
const COMMIT = process.argv.includes('--commit');
if (!dataFile) {
  console.error('usage: node scripts/import-phrayasajja.mjs <sj_data.json> [--commit]');
  process.exit(1);
}

const ROUTE_NAME = 'พระยาสัจจา';
const ROUTE_ID = 'ROUTE-3';
const DATE = '2026-08-01';
const CODE_PREFIX = 'PYS';

// Excel column -> app product key
const COL2KEY = { kon: 'cube', tubeMo: 'tubeCrushed', mo: 'crushed', yai: 'largeTube', lek: 'smallTube', pack: 'pack' };

// ขึ้นน้ำแข็งธารทิพย์ for this day: reproduces the sheet's ฿3,951 exactly.
// ก้อนละ 48 is stated on the sheet; the rest match the rates already seen on สายบางแสน.
const BUY = [
  { key: 'kon', name: 'ก้อน', qty: 24, unit: 48 },
  { key: 'mo', name: 'โม่', qty: 6, unit: 24 },
  { key: 'yai', name: 'ใหญ่', qty: 85, unit: 19 },
  { key: 'jio', name: 'จิ๋ว', qty: 46, unit: 20 },
  { key: 'mud', name: 'มัด', qty: 2, unit: 60 },
];
const BUY_TOTAL_SHEET = 3951;
const EXPENSES = [
  { key: 'Fuel', th: 'ค่าน้ำมัน', icon: 'local_gas_station', amount: 700, desc: 'ค่าน้ำมันรถส่งน้ำแข็ง' },
  { key: 'Other', th: 'อื่นๆ', icon: 'payments', amount: 100, desc: 'ค่าอาหาร' },
  { key: 'Other', th: 'อื่นๆ', icon: 'payments', amount: 500, desc: 'หักหนี้ค่าน้ำแข็งธารทิพย์' },
];

const { customers: rawCustomers, bills, derived } = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

const env = Object.fromEntries(
  fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter((l) => l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
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
const read = async (n) => { const s = await getDoc(doc(db, `bangsaen_app_data/${n}`)); return s.exists() ? s.data().value : null; };

const [routes, customers, ledger, deliveries, purchases, expenses, products, suppliers] = await Promise.all(
  ['routes', 'customers', 'dailyLedger', 'deliveries', 'icePurchases', 'expenses', 'products', 'iceSuppliers'].map(read)
);

const code = (order) => `${CODE_PREFIX}${String(order).padStart(3, '0')}`;
const custId = (order) => `CUST-${CODE_PREFIX}-${String(order).padStart(3, '0')}`;
const labelByKey = Object.fromEntries((products || []).map((p) => [p.key, p.labelTh]));

// ---- route ----
const nextRoutes = (routes || []).some((r) => r.name === ROUTE_NAME)
  ? routes
  : [...(routes || []), { id: ROUTE_ID, name: ROUTE_NAME, driverName: '', type: 'mobile' }];

// ---- customers (+ per-customer prices) ----
const existingByCode = new Map((customers || []).map((c) => [c.code, c]));
const priceByOrder = {};
for (const [order, p] of Object.entries(derived)) {
  const conv = {};
  for (const [col, val] of Object.entries(p)) if (COL2KEY[col]) conv[COL2KEY[col]] = val;
  if (Object.keys(conv).length) priceByOrder[order] = conv;
}

let added = 0, priced = 0;
const nextCustomers = [...(customers || [])];
for (const c of rawCustomers) {
  const cc = code(c.order);
  const prices = priceByOrder[c.order];
  const existing = existingByCode.get(cc);
  if (existing) {
    if (prices) { existing.customPrices = { ...(existing.customPrices || {}), ...prices }; priced++; }
    continue;
  }
  added++;
  if (prices) priced++;
  nextCustomers.push({
    id: custId(c.order), code: cc, name: c.cleaned, route: ROUTE_NAME,
    quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash',
    ...(prices ? { customPrices: prices } : {}),
  });
}

// ---- daily ledger + deliveries + old-debt settlements ----
const dayRows = {};
const newDeliveries = [];
const settlements = new Map(); // customerId -> amount
const DEL_PREFIX = 'DEL-PYS-';

for (const b of bills) {
  const id = custId(b.order);
  const quantities = {};
  for (const [col, v] of Object.entries(b.qty)) quantities[COL2KEY[col]] = v;

  const price = priceByOrder[b.order] || {};
  const calc = Object.entries(quantities).reduce((s, [k, v]) => s + v * (price[k] ?? 0), 0);
  const extraAmount = Math.round((b.billTotal - calc) * 100) / 100;

  let status = 'Cash';
  let statusDetails;
  if (b.billTotal > 0 && b.oldPay > 0) {
    status = 'NewAndOld';
    statusDetails = { status: 'NewAndOld', newAmountPaid: b.billTotal, oldDebtPaid: b.oldPay };
  } else if (b.billTotal === 0 && b.oldPay > 0) {
    status = 'OldPayment';
  } else if (b.debt > 0 && b.cash === 0 && b.transfer === 0) {
    status = 'Debt';
  }
  if (b.oldPay > 0) settlements.set(id, (settlements.get(id) || 0) + b.oldPay);

  if (b.billTotal > 0 || Object.keys(quantities).length) {
    dayRows[id] = {
      quantities, extraAmount, totalAmount: b.billTotal, status,
      ...(statusDetails ? { statusDetails } : {}),
      recordedAt: `${DATE}T09:00:00.000Z`,
    };
  }
  newDeliveries.push({
    id: `${DEL_PREFIX}${DATE}-${id}`,
    time: '09:00', customerId: id, customerName: b.name,
    summaryText: Object.entries(quantities).filter(([, q]) => q > 0)
      .map(([k, q]) => `${labelByKey[k] || k}(${q})`).join(', '),
    totalAmount: b.billTotal, status,
    ...(statusDetails ? { statusDetails } : {}),
    date: DATE, routeId: ROUTE_ID, routeName: ROUTE_NAME,
    ...(b.transfer > 0 ? { paymentMethod: 'Transfer' } : {}),
  });
}

// record old-debt payments on the customer so they show as รับชำระเงินเครดิต
for (const [id, amount] of settlements) {
  const cust = nextCustomers.find((c) => c.id === id);
  if (!cust) continue;
  const histId = `PAY-PYS-${DATE}-${id}`;
  const history = (cust.paymentHistory || []).filter((h) => h.id !== histId);
  cust.paymentHistory = [...history, {
    id: histId, date: DATE, amountPaid: amount, debtRemaining: 0,
    type: 'DEBT_SETTLEMENT', method: 'Cash', note: 'จ่ายค้าง (นำเข้าจากใบสรุปเดือน 8)',
  }];
}

const nextLedger = { ...(ledger || {}), [DATE]: { ...((ledger || {})[DATE] || {}), ...dayRows } };
const keptDeliveries = (deliveries || []).filter((d) => !String(d.id).startsWith(DEL_PREFIX));
const nextDeliveries = [...newDeliveries, ...keptDeliveries];

// ---- ice purchase ----
const buyItems = BUY.map((b) => ({ name: b.name, quantity: b.qty, amount: b.qty * b.unit }));
const buyTotal = buyItems.reduce((s, i) => s + i.amount, 0);
if (buyTotal !== BUY_TOTAL_SHEET) throw new Error(`ice purchase ฿${buyTotal} != sheet ฿${BUY_TOTAL_SHEET}`);
const supplier = (suppliers || [])[0];
const PUR_ID = `ICEP-PYS-${DATE}`;
const nextPurchases = [
  { id: PUR_ID, date: DATE, time: '06:00', supplierId: supplier?.id || 'SUP-1',
    supplierName: supplier?.name || 'ธารทิพย์', items: buyItems, totalAmount: buyTotal,
    paymentType: 'Cash', note: `ขึ้นน้ำแข็ง ${ROUTE_NAME} (นำเข้าจากใบสรุปเดือน 8)` },
  ...(purchases || []).filter((p) => p.id !== PUR_ID),
];

// ---- expenses ----
const EXP_PREFIX = `EXP-PYS-${DATE}-`;
const newExpenses = EXPENSES.map((e, i) => ({
  id: `${EXP_PREFIX}${i}`, time: '06:00', route: ROUTE_NAME,
  category: e.key, categoryTh: e.th, icon: e.icon,
  description: e.desc, amount: e.amount, status: 'Cash', date: DATE,
}));
const nextExpenses = [...newExpenses, ...(expenses || []).filter((e) => !String(e.id).startsWith(EXP_PREFIX))];

// ---- report ----
const billSum = bills.reduce((s, b) => s + b.billTotal, 0);
const oldPaySum = bills.reduce((s, b) => s + b.oldPay, 0);
const cashSum = bills.reduce((s, b) => s + b.cash, 0);
const debtSum = bills.reduce((s, b) => s + b.debt, 0);
console.log(`สายส่ง: ${nextRoutes.length} สาย ${(routes || []).some((r) => r.name === ROUTE_NAME) ? '(มี ' + ROUTE_NAME + ' อยู่แล้ว)' : '(เพิ่ม ' + ROUTE_NAME + ')'}`);
console.log(`ลูกค้า: เดิม ${(customers || []).length} -> ${nextCustomers.length}  (เพิ่ม ${added}, ตั้งราคาเฉพาะ ${priced})`);
console.log(`ยอดขาย ${DATE}: ${Object.keys(dayRows).length} บิล  เงินสด ฿${cashSum.toLocaleString()} + ค้างจ่าย ฿${debtSum.toLocaleString()} = ฿${billSum.toLocaleString()}`);
console.log(`จ่ายค้าง (หนี้เก่า): ฿${oldPaySum.toLocaleString()} จาก ${settlements.size} ราย`);
console.log(`ซื้อน้ำแข็ง: ${buyItems.map((i) => `${i.name}×${i.quantity}`).join(' ')} = ฿${buyTotal.toLocaleString()}`);
console.log(`รายจ่าย: ${newExpenses.map((e) => `${e.description} ฿${e.amount}`).join(' | ')}`);
const net = cashSum + oldPaySum - buyTotal - EXPENSES.reduce((s, e) => s + e.amount, 0);
console.log(`เงินสดคงเหลือคำนวณ: ฿${net.toLocaleString()}  (ในไฟล์ ฿1,594) ${net === 1594 ? 'ตรง ✓' : 'ต่าง ✗'}`);

if (!COMMIT) { console.log('\nDRY RUN — ยังไม่เขียนอะไร ใส่ --commit เพื่อบันทึกจริง'); process.exit(0); }

await setDoc(doc(db, 'bangsaen_app_data/routes'), { value: nextRoutes });
await setDoc(doc(db, 'bangsaen_app_data/customers'), { value: nextCustomers });
await setDoc(doc(db, 'bangsaen_app_data/dailyLedger'), { value: nextLedger });
await setDoc(doc(db, 'bangsaen_app_data/deliveries'), { value: nextDeliveries });
await setDoc(doc(db, 'bangsaen_app_data/icePurchases'), { value: nextPurchases });
await setDoc(doc(db, 'bangsaen_app_data/expenses'), { value: nextExpenses });
console.log('\nบันทึกลง Firestore แล้ว');
process.exit(0);
