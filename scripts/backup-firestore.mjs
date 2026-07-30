// Reads the bangsaen Firestore docs and writes them to a local JSON backup file.
// Usage: node scripts/backup-firestore.mjs <outfile.json>
import fs from 'node:fs';
import path from 'node:path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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

const DOCS = [
  'customers',
  'products',
  'dailyLedger',
  'deliveries',
  'routes',
  'expenses',
  'icePurchases',
  'iceSuppliers',
];

const out = {};
for (const name of DOCS) {
  const snap = await getDoc(doc(db, `bangsaen_app_data/${name}`));
  out[name] = snap.exists() ? snap.data().value : null;
  const v = out[name];
  const size = Array.isArray(v) ? `${v.length} items` : v ? `${Object.keys(v).length} keys` : 'MISSING';
  console.log(`  ${name}: ${size}`);
}

const outFile = process.argv[2] || 'firestore-backup.json';
fs.writeFileSync(outFile, JSON.stringify(out, null, 2), 'utf8');
console.log(`\nbackup written -> ${outFile}`);
process.exit(0);
