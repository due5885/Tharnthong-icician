export const BACKUP_KEYS = [
  'tharnthong_ice_products',
  'tharnthong_routes',
  'tharnthong_monthly_expenses',
  'tharnthong_truck_records',
  'tharnthong_ice_purchase_costs',
  'tharnthong_admins',
  'tharnthong_stats',
  'tharnthong_summary',
  'tharnthong_deliveries',
  'tharnthong_customers',
  'tharnthong_expenses',
  'tharnthong_warehouse_items',
  'tharnthong_warehouse_logs',
  'tharnthong_employees',
  'tharnthong_attendance',
  'tharnthong_vehicles',
  'tharnthong_vehicle_logs',
] as const;

interface BackupFile {
  app: 'tharnthong-ice';
  exportedAt: string;
  data: Record<string, unknown>;
}

export function exportBackup(): void {
  const data: Record<string, unknown> = {};
  BACKUP_KEYS.forEach((key) => {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      try {
        data[key] = JSON.parse(raw);
      } catch {
        data[key] = raw;
      }
    }
  });

  const backup: BackupFile = {
    app: 'tharnthong-ice',
    exportedAt: new Date().toISOString(),
    data,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.href = url;
  a.download = `tharnthong-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function readBackupFile(file: File): Promise<BackupFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!parsed || parsed.app !== 'tharnthong-ice' || typeof parsed.data !== 'object') {
          reject(new Error('ไฟล์นี้ไม่ใช่ไฟล์สำรองข้อมูลของธารทอง น้ำแข็ง'));
          return;
        }
        resolve(parsed as BackupFile);
      } catch {
        reject(new Error('ไม่สามารถอ่านไฟล์นี้ได้ (รูปแบบไฟล์ไม่ถูกต้อง)'));
      }
    };
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์นี้ได้'));
    reader.readAsText(file);
  });
}

export function applyBackup(backup: BackupFile): void {
  BACKUP_KEYS.forEach((key) => {
    if (key in backup.data) {
      localStorage.setItem(key, JSON.stringify(backup.data[key]));
    }
  });
}
