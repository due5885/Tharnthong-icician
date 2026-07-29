import React, { useEffect, useRef, useState } from 'react';

interface DateInputProps {
  value: string; // ISO yyyy-mm-dd, may be ''
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];
const THAI_WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

const DEFAULT_CLASSNAME =
  'px-2.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#1E3A5F] data-mono cursor-pointer focus:ring-2 focus:ring-[#0284C7] outline-none';

// Always renders/edits dates as D/M/YYYY (day-month-year), regardless of device/browser locale —
// native <input type="date"> defers formatting to OS region settings, which we can't force to D/M/Y
// on every device, so this is a self-contained calendar popover instead.
function formatDMY(iso: string): string {
  if (!iso) return '';
  const parts = iso.split('-').map(Number);
  const [y, m, d] = parts;
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export const DateInput: React.FC<DateInputProps> = ({ value, onChange, className, placeholder, required }) => {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [viewYear, setViewYear] = useState(() => (value ? Number(value.split('-')[0]) : now.getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => (value ? Number(value.split('-')[1]) : now.getMonth() + 1));
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (value) {
      const [y, m] = value.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m);
    }
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay();

  const goPrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };
  const goNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const selectDay = (d: number) => {
    onChange(toISO(viewYear, viewMonth, d));
    setOpen(false);
  };

  const isSelected = (d: number) => value === toISO(viewYear, viewMonth, d);
  const isToday = (d: number) =>
    now.getFullYear() === viewYear && now.getMonth() + 1 === viewMonth && now.getDate() === d;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="relative inline-block" ref={wrapperRef}>
      <input
        type="text"
        readOnly
        required={required}
        value={formatDMY(value)}
        placeholder={placeholder || 'ว/ด/ปปปป'}
        onClick={() => setOpen((o) => !o)}
        className={className || DEFAULT_CLASSNAME}
      />
      {open && (
        <div className="absolute z-50 mt-1 bg-white rounded-2xl shadow-2xl border border-[#D2E0EB] p-3 w-64 left-0">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={goPrevMonth}
              className="p-1 rounded-lg hover:bg-[#F1F5F9] cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <span className="text-xs font-bold text-[#1E3A5F] data-mono">
              {THAI_MONTHS_SHORT[viewMonth - 1]} {viewYear}
            </span>
            <button
              type="button"
              onClick={goNextMonth}
              className="p-1 rounded-lg hover:bg-[#F1F5F9] cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {THAI_WEEKDAYS.map((w) => (
              <span key={w} className="text-[10px] font-bold text-[#94A3B8]">
                {w}
              </span>
            ))}
            {cells.map((d, i) => (
              <button
                type="button"
                key={i}
                disabled={d === null}
                onClick={() => d && selectDay(d)}
                className={`text-[11px] py-1 rounded-lg cursor-pointer data-mono ${
                  d === null
                    ? 'invisible'
                    : isSelected(d)
                      ? 'bg-[#0284C7] text-white font-bold'
                      : isToday(d)
                        ? 'border border-[#0284C7] text-[#0284C7] font-bold'
                        : 'hover:bg-[#F1F5F9] text-[#1E293B]'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="mt-2 w-full text-[10px] font-bold text-[#64748B] hover:text-[#DC2626] cursor-pointer"
            >
              ล้างวันที่
            </button>
          )}
        </div>
      )}
    </div>
  );
};
