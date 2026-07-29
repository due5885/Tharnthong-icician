// "28/7/2026" — day/month/year, matching how Dumrong writes dates by hand (never month-first)
export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

// For "YYYY-MM-DD HH:MM" timestamp strings (e.g. warehouse logs, assistant chat) —
// reformats just the date portion to D/M/YYYY and keeps the time as-is.
export function formatTimestampDMY(timestamp: string): string {
  const [datePart, timePart] = timestamp.split(' ');
  const formattedDate = formatShortDate(datePart);
  return timePart ? `${formattedDate} ${timePart}` : formattedDate;
}

// "หลอดใหญ่(200), หลอดเล็ก(10)" -> "ใหญ่ 200 เล็ก 10"
export function shortenSummaryText(summaryText: string): string {
  return summaryText
    .replace(/น้ำแข็ง/g, '')
    .replace(/หลอด/g, '')
    .replace(/\(/g, ' ')
    .replace(/\),?\s*/g, ' ')
    .replace(/,\s*/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function downloadCsv(rows: string[][], filename: string) {
  const csvBody = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csvBody], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function copyText(text: string, onShowToast: (msg: string) => void) {
  try {
    await navigator.clipboard.writeText(text);
    onShowToast('คัดลอกข้อความแล้ว นำไปวางส่งทาง LINE ได้เลย');
    return;
  } catch {
    // Fall through to legacy fallback below (older browsers / blocked Clipboard API)
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    onShowToast(copied ? 'คัดลอกข้อความแล้ว นำไปวางส่งทาง LINE ได้เลย' : 'คัดลอกข้อความไม่สำเร็จ ลองอีกครั้ง');
  } catch {
    onShowToast('คัดลอกข้อความไม่สำเร็จ ลองอีกครั้ง');
  }
}
