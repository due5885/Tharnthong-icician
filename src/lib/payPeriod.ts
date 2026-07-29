export function getPayPeriodLabel(dateStr: string): string {
  const day = parseInt(dateStr.slice(8, 10), 10);
  if (day >= 1 && day <= 10) return 'งวด 1-10';
  if (day >= 11 && day <= 20) return 'งวด 11-20';
  return 'งวด 21-สิ้นเดือน';
}

export const PAY_PERIOD_ORDER = ['งวด 1-10', 'งวด 11-20', 'งวด 21-สิ้นเดือน'];
