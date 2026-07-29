import React, { useState } from 'react';
import { CreditTermDays, CustomerAccount, DeliveryRecord } from '../types';
import { copyText, downloadCsv, formatShortDate, shortenSummaryText } from '../lib/statementExport';
import { DateInput } from './DateInput';

interface CreditCustomersViewProps {
  customers: CustomerAccount[];
  deliveries: DeliveryRecord[];
  onUpdateCustomer: (id: string, updated: Partial<CustomerAccount>) => void;
  onShowToast: (msg: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

interface CreditBillRow {
  id: string;
  date: string;
  totalAmount: number;
  summaryText: string;
}

interface CreditCustomerGroup {
  customer: CustomerAccount;
  bills: CreditBillRow[];
}

interface PeriodBucket {
  start: string;
  end: string;
  label: string;
}

const CREDIT_TERM_OPTIONS: CreditTermDays[] = [5, 7, 10, 15, 'monthly'];

const CREDIT_PAY_METHOD_LABELS: Record<'Cash' | 'Transfer', string> = {
  Cash: 'เงินสด',
  Transfer: 'โอน',
};

function periodKey(start: string, end: string): string {
  return `${start}_${end}`;
}

function findBucketForDate(date: string, buckets: PeriodBucket[]): PeriodBucket | undefined {
  return buckets.find((b) => date >= b.start && date <= b.end);
}

function isPeriodSettled(customer: CustomerAccount, bucket: PeriodBucket): boolean {
  return (customer.creditSettledPeriods || []).includes(periodKey(bucket.start, bucket.end));
}

function getPeriodTotal(bills: CreditBillRow[], bucket: PeriodBucket): number {
  return bills
    .filter((b) => b.date >= bucket.start && b.date <= bucket.end)
    .reduce((sum, b) => sum + b.totalAmount, 0);
}

// Outstanding = billed amount from unsettled periods (settled periods are excluded entirely),
// minus any freeform round-number payments that don't map to a specific period.
function getOutstanding(group: CreditCustomerGroup): number {
  const { customer, bills } = group;
  const buckets = getPeriodBuckets(customer.creditTermDays, bills);
  const billed = bills.reduce((sum, b) => {
    const bucket = findBucketForDate(b.date, buckets);
    if (bucket && isPeriodSettled(customer, bucket)) return sum;
    return sum + b.totalAmount;
  }, 0);
  return Math.max(0, billed - (customer.creditPaid || 0));
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function computeDueDate(baseDate: string, term?: CreditTermDays): Date | null {
  if (!term) return null;
  const d = new Date(baseDate);
  if (isNaN(d.getTime())) return null;
  if (term === 'monthly') {
    d.setMonth(d.getMonth() + 1);
  } else {
    d.setDate(d.getDate() + term);
  }
  return d;
}

function formatThaiDate(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function termLabel(term?: CreditTermDays): string {
  if (!term) return 'ยังไม่กำหนด';
  return term === 'monthly' ? 'รายเดือน' : `${term} วัน`;
}

function buildCreditGroups(
  customers: CustomerAccount[],
  deliveries: DeliveryRecord[],
  selectedDate: string
): CreditCustomerGroup[] {
  const creditBills = deliveries.filter((d) => d.status === 'Credit');
  const groups: CreditCustomerGroup[] = [];

  const findCustomer = (bill: DeliveryRecord): CustomerAccount | undefined =>
    (bill.customerId && customers.find((c) => c.id === bill.customerId)) ||
    customers.find((c) => c.name === bill.customerName);

  creditBills.forEach((bill) => {
    const customer = findCustomer(bill);
    if (!customer) return; // customer no longer exists (deleted) — skip

    let group = groups.find((g) => g.customer.id === customer.id);
    if (!group) {
      group = { customer, bills: [] };
      groups.push(group);
    }
    group.bills.push({
      id: bill.id,
      date: bill.date,
      totalAmount: bill.totalAmount,
      summaryText: bill.summaryText,
    });
  });

  // Fallback: customers whose current ledger row is "Credit" but have no matching dated bill yet
  // (e.g. status set outside the normal confirm flow) — still show them so nothing silently disappears.
  customers.forEach((customer) => {
    if (customer.status !== 'Credit') return;
    if (groups.some((g) => g.customer.id === customer.id)) return;
    groups.push({
      customer,
      bills: [
        {
          id: `fallback-${customer.id}`,
          date: customer.lastUpdated ? customer.lastUpdated.slice(0, 10) : selectedDate,
          totalAmount: customer.totalAmount,
          summaryText: '',
        },
      ],
    });
  });

  groups.forEach((g) => g.bills.sort((a, b) => (a.date < b.date ? 1 : -1)));
  groups.sort((a, b) => a.customer.name.localeCompare(b.customer.name, 'th'));
  return groups;
}

// Buckets one calendar month into N-day billing periods, e.g. term=15 -> [1-15],[16-endOfMonth],
// term=10 -> [1-10],[11-20],[21-endOfMonth] (matches the factory's own 10/20/month-end settlement cycle).
// A trailing remainder shorter than N days gets absorbed into the previous bucket instead of forming its own tiny one.
function monthBuckets(term: number, year: number, month: number): { startDay: number; endDay: number }[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const buckets: { startDay: number; endDay: number }[] = [];
  let start = 1;
  while (start <= daysInMonth) {
    let end = Math.min(start + term - 1, daysInMonth);
    if (daysInMonth - end < term) end = daysInMonth;
    buckets.push({ startDay: start, endDay: end });
    start = end + 1;
  }
  return buckets;
}

function getPeriodBuckets(term: CreditTermDays | undefined, bills: CreditBillRow[]): PeriodBucket[] {
  if (!term) return [];
  const today = new Date();
  const billDates = bills.map((b) => new Date(b.date)).filter((d) => !isNaN(d.getTime()));
  const allDates = billDates.length > 0 ? [...billDates, today] : [today];
  const minD = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxD = new Date(Math.max(...allDates.map((d) => d.getTime())));

  const buckets: PeriodBucket[] = [];
  const cursor = new Date(minD.getFullYear(), minD.getMonth(), 1);
  const stop = new Date(maxD.getFullYear(), maxD.getMonth(), 1);

  while (cursor <= stop) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    if (term === 'monthly') {
      const end = new Date(year, month + 1, 0);
      buckets.push({ start: toISO(new Date(year, month, 1)), end: toISO(end), label: formatShortDate(toISO(end)) });
    } else {
      monthBuckets(term, year, month).forEach(({ startDay, endDay }) => {
        const startDate = new Date(year, month, startDay);
        const endDate = new Date(year, month, endDay);
        buckets.push({ start: toISO(startDate), end: toISO(endDate), label: formatShortDate(toISO(endDate)) });
      });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return buckets;
}

export const CreditCustomersView: React.FC<CreditCustomersViewProps> = ({
  customers,
  deliveries,
  onUpdateCustomer,
  onShowToast,
  selectedDate,
  onDateChange,
}) => {
  const groups = buildCreditGroups(customers, deliveries, selectedDate);
  const [masterSearch, setMasterSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedTermFilter, setSelectedTermFilter] = useState<CreditTermDays | 'unassigned' | 'all'>('all');

  const [exportRanges, setExportRanges] = useState<Record<string, { start: string; end: string }>>({});

  // Record-payment modal state
  const [settleCustomer, setSettleCustomer] = useState<CustomerAccount | null>(null);
  const [settlingPeriod, setSettlingPeriod] = useState<PeriodBucket | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'Cash' | 'Transfer'>('Cash');
  const [payDate, setPayDate] = useState(selectedDate);
  const [payNote, setPayNote] = useState('');

  const closeSettleModal = () => {
    setSettleCustomer(null);
    setSettlingPeriod(null);
    setPayAmount(0);
    setPayNote('');
    setPayMethod('Cash');
  };

  // Freeform: pay any round-number amount, deducted from the overall running total.
  const openSettleModal = (customer: CustomerAccount) => {
    setSettleCustomer(customer);
    setSettlingPeriod(null);
    setPayAmount(0);
    setPayMethod('Cash');
    setPayDate(selectedDate);
    setPayNote('');
  };

  // Settle one specific billing period in full — removes that period's bills from the outstanding total entirely.
  const openSettlePeriodModal = (group: CreditCustomerGroup, bucket: PeriodBucket) => {
    setSettleCustomer(group.customer);
    setSettlingPeriod(bucket);
    setPayAmount(getPeriodTotal(group.bills, bucket));
    setPayMethod('Cash');
    setPayDate(selectedDate);
    setPayNote('');
  };

  const handleSettleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleCustomer) return;
    if (payAmount <= 0) {
      onShowToast('กรุณาระบุจำนวนเงินที่รับชำระ');
      return;
    }

    const group = groups.find((g) => g.customer.id === settleCustomer.id);
    const currentOutstanding = group ? getOutstanding(group) : 0;
    const newOutstanding = Math.max(0, currentOutstanding - payAmount);

    const newHistoryItem = {
      id: `PAY-CREDIT-${Date.now()}`,
      date: payDate,
      amountPaid: payAmount,
      debtRemaining: newOutstanding,
      type: 'CREDIT_SETTLEMENT' as const,
      method: payMethod,
      note: payNote.trim() || (settlingPeriod ? `ตัดจ่ายงวด ${settlingPeriod.label}` : 'ชำระยอดเครดิต'),
    };

    const existingHistory = settleCustomer.paymentHistory || [];

    if (settlingPeriod) {
      const key = periodKey(settlingPeriod.start, settlingPeriod.end);
      const existingSettled = settleCustomer.creditSettledPeriods || [];
      onUpdateCustomer(settleCustomer.id, {
        creditSettledPeriods: existingSettled.includes(key) ? existingSettled : [...existingSettled, key],
        paymentHistory: [newHistoryItem, ...existingHistory],
      });
    } else {
      onUpdateCustomer(settleCustomer.id, {
        creditPaid: (settleCustomer.creditPaid || 0) + payAmount,
        paymentHistory: [newHistoryItem, ...existingHistory],
      });
    }

    onShowToast(
      `บันทึกรับชำระเงินจาก "${settleCustomer.name}" จำนวน ฿${payAmount.toLocaleString()} (${
        CREDIT_PAY_METHOD_LABELS[payMethod]
      }) วันที่ ${formatShortDate(payDate)} เรียบร้อยแล้ว`
    );
    closeSettleModal();
  };

  const getRange = (group: CreditCustomerGroup) => {
    const existing = exportRanges[group.customer.id];
    if (existing) return existing;
    const dates = group.bills.map((b) => b.date).sort();
    return { start: dates[0], end: dates[dates.length - 1] };
  };

  const setRangeBoth = (customerId: string, start: string, end: string) => {
    setExportRanges((prev) => ({ ...prev, [customerId]: { start, end } }));
  };

  const setRange = (customerId: string, field: 'start' | 'end', value: string) => {
    setExportRanges((prev) => {
      const group = groups.find((g) => g.customer.id === customerId)!;
      return { ...prev, [customerId]: { ...(prev[customerId] || getRange(group)), [field]: value } };
    });
  };

  const handleTermChange = (customer: CustomerAccount, value: string) => {
    const term: CreditTermDays = value === 'monthly' ? 'monthly' : (Number(value) as CreditTermDays);
    onUpdateCustomer(customer.id, { creditTermDays: term });
    onShowToast(`ตั้งเงื่อนไขเครดิตของ "${customer.name}" เป็น ${termLabel(term)} เรียบร้อยแล้ว`);
  };

  const buildStatementLines = (group: CreditCustomerGroup, billsInRange: CreditBillRow[]) => {
    const range = getRange(group);
    const lines = [
      `ใบแจ้งหนี้ลูกค้า: ${group.customer.name} (${group.customer.route} • รหัส ${group.customer.code})`,
      `ช่วงวันที่ ${formatShortDate(range.start)} - ${formatShortDate(range.end)}`,
      '',
    ];
    billsInRange.forEach((bill) => {
      const summary = shortenSummaryText(bill.summaryText);
      lines.push(`${formatShortDate(bill.date)}${summary ? ' ' + summary : ''}`);
    });
    const total = billsInRange.reduce((sum, b) => sum + b.totalAmount, 0);
    lines.push('', `รวมทั้งหมด: ฿${total.toLocaleString()}`);
    return lines;
  };

  const handleExportCustomerCsv = (group: CreditCustomerGroup) => {
    const range = getRange(group);
    const billsInRange = group.bills.filter((b) => b.date >= range.start && b.date <= range.end);
    const header = ['วันที่', 'รายละเอียด', 'ยอดบิล'];
    const rows = billsInRange.map((bill) => [
      formatShortDate(bill.date),
      shortenSummaryText(bill.summaryText),
      bill.totalAmount.toString(),
    ]);
    const total = billsInRange.reduce((sum, b) => sum + b.totalAmount, 0);
    rows.push(['', 'รวม', total.toString()]);
    downloadCsv([header, ...rows], `${group.customer.name}-${range.start}_${range.end}.csv`);
    onShowToast(`ดาวน์โหลดใบแจ้งหนี้ของ "${group.customer.name}" เรียบร้อยแล้ว`);
  };

  const handleCopyCustomerText = (group: CreditCustomerGroup) => {
    const range = getRange(group);
    const billsInRange = group.bills.filter((b) => b.date >= range.start && b.date <= range.end);
    const text = buildStatementLines(group, billsInRange).join('\n');
    copyText(text, onShowToast);
  };

  const matchesTermFilter = (customer: CustomerAccount) => {
    if (selectedTermFilter === 'all') return true;
    if (selectedTermFilter === 'unassigned') return !customer.creditTermDays;
    return customer.creditTermDays === selectedTermFilter;
  };

  const termCounts: Record<string, number> = { all: groups.length, unassigned: 0 };
  CREDIT_TERM_OPTIONS.forEach((t) => {
    termCounts[String(t)] = 0;
  });
  groups.forEach((g) => {
    const key = g.customer.creditTermDays ? String(g.customer.creditTermDays) : 'unassigned';
    termCounts[key] = (termCounts[key] || 0) + 1;
  });

  const filteredMasterGroups = groups.filter((g) => {
    const q = masterSearch.toLowerCase();
    const matchesSearch =
      g.customer.name.toLowerCase().includes(q) || g.customer.code.toLowerCase().includes(q);
    return matchesSearch && matchesTermFilter(g.customer);
  });

  const selectedGroup = groups.find((g) => g.customer.id === selectedCustomerId) || null;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[#1E3A5F] font-sans flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0284C7]">event_repeat</span>
            ลูกค้าเครดิต
          </h2>
          <div className="flex items-center gap-2 mt-1 text-[#1E293B] text-xs md:text-sm">
            <span className="material-symbols-outlined text-sm text-[#0284C7]">calendar_today</span>
            <DateInput
              value={selectedDate}
              onChange={onDateChange}
              className="data-mono font-bold bg-[#E0F2FE] text-[#0369A1] px-2 py-0.5 rounded-lg border border-[#BAE6FD] cursor-pointer w-24"
            />
          </div>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-[#D2E0EB] text-center text-[#64748B] font-medium text-sm">
          ยังไม่มีลูกค้าที่ลงบัญชีเป็น "เครดิต" ในระบบ — พอลูกน้องลงบัญชีลูกค้าเป็นเครดิตในหน้า "ลงบัญชีลูกค้า" รายชื่อจะขึ้นที่นี่อัตโนมัติ
        </div>
      ) : !selectedGroup ? (
        /* ── Master list: pick a payment-term round first, then search + click a customer to drill in ── */
        <div className="space-y-3">
          {/* Term round selector — pick a billing cycle to see who's in it */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#D2E0EB] shadow-xs">
            <span className="text-[11px] font-bold text-[#64748B] uppercase block mb-2">รอบจ่าย</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedTermFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedTermFilter === 'all'
                    ? 'bg-[#1E3A5F] text-white shadow-xs'
                    : 'text-[#64748B] hover:bg-[#F1F5F9] border border-[#E2E8F0]'
                }`}
              >
                ทั้งหมด ({termCounts.all})
              </button>
              {CREDIT_TERM_OPTIONS.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setSelectedTermFilter(term)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedTermFilter === term
                      ? 'bg-[#1E3A5F] text-white shadow-xs'
                      : 'text-[#64748B] hover:bg-[#F1F5F9] border border-[#E2E8F0]'
                  }`}
                >
                  {termLabel(term)} ({termCounts[String(term)] || 0})
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedTermFilter('unassigned')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedTermFilter === 'unassigned'
                    ? 'bg-[#D97706] text-white shadow-xs'
                    : 'text-[#D97706] hover:bg-[#FEF3C7] border border-[#FDE68A]'
                }`}
              >
                ยังไม่กำหนด ({termCounts.unassigned})
              </button>
            </div>
          </div>

          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] text-sm">
              search
            </span>
            <input
              type="text"
              placeholder="ค้นหาชื่อลูกค้าหรือรหัส..."
              value={masterSearch}
              onChange={(e) => setMasterSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D2E0EB] bg-white text-xs font-medium focus:ring-2 focus:ring-[#1E3A5F] outline-none"
            />
          </div>

          {filteredMasterGroups.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-[#D2E0EB] text-center text-[#64748B] font-medium text-sm">
              ไม่พบลูกค้าเครดิตที่ตรงกับเงื่อนไขนี้
            </div>
          ) : (
            filteredMasterGroups.map((group) => {
              const { customer, bills } = group;
              const groupTotal = getOutstanding(group);
              const buckets = getPeriodBuckets(customer.creditTermDays, bills);
              const unsettledBills = bills.filter((b) => {
                const bucket = findBucketForDate(b.date, buckets);
                return !(bucket && isPeriodSettled(customer, bucket));
              });
              const dueDates = unsettledBills
                .map((b) => computeDueDate(b.date, customer.creditTermDays))
                .filter(Boolean) as Date[];
              const isOverdue = dueDates.some((d) => d.getTime() < new Date().setHours(0, 0, 0, 0));

              return (
                <div
                  key={customer.id}
                  className="w-full bg-white rounded-2xl p-4 border border-[#D2E0EB] hover:border-[#0284C7] shadow-xs transition-all flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerId(customer.id)}
                    className="flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-[#1E3A5F]">{customer.name}</span>
                      {isOverdue && (
                        <span className="text-[10px] font-bold bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] px-2 py-0.5 rounded-full">
                          เกินกำหนดชำระ
                        </span>
                      )}
                      <span className="text-[10px] font-bold bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0] px-2 py-0.5 rounded-full">
                        {unsettledBills.length} บิลค้าง
                      </span>
                    </div>
                    <span className="text-xs text-[#64748B] font-medium">
                      สายส่ง: {customer.route} • รหัส {customer.code}
                    </span>
                  </button>

                  <select
                    value={customer.creditTermDays ?? ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleTermChange(customer, e.target.value)}
                    className="shrink-0 px-2.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs font-bold text-[#1E3A5F] cursor-pointer focus:ring-2 focus:ring-[#0284C7] outline-none"
                  >
                    <option value="" disabled>
                      เลือกรอบจ่าย
                    </option>
                    {CREDIT_TERM_OPTIONS.map((term) => (
                      <option key={term} value={term}>
                        {termLabel(term)}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setSelectedCustomerId(customer.id)}
                    className="flex items-center gap-2 shrink-0 cursor-pointer"
                  >
                    <span className="font-bold text-lg text-[#0284C7] data-mono">
                      ฿ {groupTotal.toLocaleString()}
                    </span>
                    <span className="material-symbols-outlined text-[#94A3B8]">chevron_right</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ── Detail view: one customer, grouped into billing periods ───────────── */
        (() => {
          const { customer, bills } = selectedGroup;
          const groupTotal = getOutstanding(selectedGroup);
          const range = getRange(selectedGroup);
          const billsInRange = bills.filter((b) => b.date >= range.start && b.date <= range.end);
          const buckets = getPeriodBuckets(customer.creditTermDays, bills);

          return (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setSelectedCustomerId(null)}
                className="flex items-center gap-1.5 text-xs font-bold text-[#0284C7] hover:text-[#0369A1] cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                กลับไปรายชื่อลูกค้าเครดิตทั้งหมด
              </button>

              <div className="bg-white rounded-2xl p-4 border border-[#D2E0EB] shadow-xs space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-[#F1F5F9]">
                  <div>
                    <span className="font-bold text-xl text-[#1E3A5F]">{customer.name}</span>
                    <div className="text-xs text-[#64748B] font-medium">
                      สายส่ง: {customer.route} • รหัส {customer.code}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="material-symbols-outlined text-sm text-[#94A3B8]">call</span>
                      <input
                        type="tel"
                        placeholder="เบอร์โทรลูกค้า (ยังไม่ระบุ)"
                        value={customer.phone || ''}
                        onChange={(e) => onUpdateCustomer(customer.id, { phone: e.target.value })}
                        className="px-2 py-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-medium text-[#1E293B] w-44 focus:ring-2 focus:ring-[#0284C7] outline-none"
                      />
                    </div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg text-[#0284C7] data-mono">
                        ยอดค้างรวมทั้งหมด ฿ {groupTotal.toLocaleString()}
                      </span>
                      {(customer.creditPaid || 0) > 0 && (
                        <span className="text-[11px] font-medium text-[#16A34A]">
                          (จ่ายมาแล้วสะสม ฿{(customer.creditPaid || 0).toLocaleString()})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-end gap-3 flex-wrap">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-[#64748B] uppercase">เงื่อนไขเครดิต</span>
                      <select
                        value={customer.creditTermDays ?? ''}
                        onChange={(e) => handleTermChange(customer, e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#1E3A5F] cursor-pointer focus:ring-2 focus:ring-[#0284C7] outline-none"
                      >
                        <option value="" disabled>
                          เลือกเงื่อนไข
                        </option>
                        {CREDIT_TERM_OPTIONS.map((term) => (
                          <option key={term} value={term}>
                            {termLabel(term)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => openSettleModal(customer)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">payments</span>
                      บันทึกรับชำระ
                    </button>
                  </div>
                </div>

                {/* Billing-period chips — pick a period (e.g. every 15 days: 15/6, 30/6, 15/7, 31/7) to view+export just that period,
                    each shows its own total and a checkmark once settled */}
                {buckets.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-[#64748B] uppercase shrink-0">งวดที่จ่าย:</span>
                    {buckets.map((b) => {
                      const isActive = range.start === b.start && range.end === b.end;
                      const settled = isPeriodSettled(customer, b);
                      const periodTotal = getPeriodTotal(bills, b);
                      return (
                        <button
                          key={b.start}
                          type="button"
                          onClick={() => setRangeBoth(customer.id, b.start, b.end)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-[#0284C7] text-white border-[#0284C7]'
                              : settled
                                ? 'bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#16A34A] border-[#BBF7D0]'
                                : 'bg-[#F1F5F9] hover:bg-[#E0F2FE] text-[#0284C7] border-[#D2E0EB]'
                          }`}
                        >
                          {settled && <span className="material-symbols-outlined text-xs">check_circle</span>}
                          {b.label} · ฿{periodTotal.toLocaleString()}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        const dates = bills.map((bb) => bb.date).sort();
                        setRangeBoth(customer.id, dates[0], dates[dates.length - 1]);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-dashed border-[#CBD5E1] text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
                    >
                      ทั้งหมด
                    </button>
                  </div>
                )}

                {/* When the current view is exactly one billing period, offer to settle that period in full */}
                {(() => {
                  const activeBucket = buckets.find((b) => b.start === range.start && b.end === range.end);
                  if (!activeBucket) return null;
                  const settled = isPeriodSettled(customer, activeBucket);
                  return (
                    <div>
                      {settled ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] rounded-xl text-xs font-bold">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          จ่ายงวดนี้ครบแล้ว
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openSettlePeriodModal(selectedGroup, activeBucket)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">task_alt</span>
                          ตัดจ่ายงวดนี้เต็มจำนวน (฿{getPeriodTotal(bills, activeBucket).toLocaleString()})
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Freeform override, still available */}
                <div className="flex items-end gap-2 flex-wrap pt-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-[#64748B] uppercase">ตั้งแต่วันที่</span>
                    <DateInput
                      value={range.start || ''}
                      onChange={(v) => setRange(customer.id, 'start', v)}
                      className="px-2.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#1E3A5F] data-mono focus:ring-2 focus:ring-[#0284C7] outline-none w-24"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-[#64748B] uppercase">ถึงวันที่</span>
                    <DateInput
                      value={range.end || ''}
                      onChange={(v) => setRange(customer.id, 'end', v)}
                      className="px-2.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#1E3A5F] data-mono focus:ring-2 focus:ring-[#0284C7] outline-none w-24"
                    />
                  </div>
                  <span className="text-[11px] text-[#64748B] font-medium pb-1.5">
                    ({billsInRange.length} บิลในช่วงนี้ • รวม ฿
                    {billsInRange.reduce((s, b) => s + b.totalAmount, 0).toLocaleString()})
                  </span>

                  <div className="flex items-center gap-2 flex-wrap ml-auto">
                    <button
                      onClick={() => handleExportCustomerCsv(selectedGroup)}
                      disabled={billsInRange.length === 0}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#1E3A5F] rounded-xl text-xs font-bold transition-all border border-[#CBD5E1] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-sm text-[#0284C7]">download</span>
                      ดาวน์โหลด Excel/CSV
                    </button>
                    <button
                      onClick={() => handleCopyCustomerText(selectedGroup)}
                      disabled={billsInRange.length === 0}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#1E3A5F] rounded-xl text-xs font-bold transition-all border border-[#CBD5E1] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-sm text-[#0284C7]">content_copy</span>
                      คัดลอกข้อความส่ง LINE
                    </button>
                  </div>
                </div>
              </div>

              {/* Bills within the selected period */}
              <div className="space-y-1.5">
                {billsInRange.length === 0 ? (
                  <div className="bg-white p-6 rounded-2xl border border-[#D2E0EB] text-center text-[#94A3B8] text-xs">
                    ไม่มีบิลในช่วงที่เลือก
                  </div>
                ) : (
                  billsInRange.map((bill) => {
                    const bucket = findBucketForDate(bill.date, buckets);
                    const settled = bucket ? isPeriodSettled(customer, bucket) : false;
                    const due = computeDueDate(bill.date, customer.creditTermDays);
                    const billOverdue = !settled && due ? due.getTime() < new Date().setHours(0, 0, 0, 0) : false;
                    return (
                      <div
                        key={bill.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2.5 bg-white border border-[#E2E8F0] rounded-xl text-xs"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[#1E3A5F] data-mono">{formatShortDate(bill.date)}</span>
                          {bill.summaryText && <span className="text-[#64748B]">{bill.summaryText}</span>}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-bold text-[#0284C7] data-mono">
                            ฿ {bill.totalAmount.toLocaleString()}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-lg font-bold ${
                              settled
                                ? 'bg-[#DCFCE7] text-[#166534]'
                                : billOverdue
                                  ? 'bg-[#FEE2E2] text-[#DC2626]'
                                  : 'bg-[#E0F2FE] text-[#0369A1]'
                            }`}
                          >
                            {settled ? 'จ่ายแล้ว' : due ? `ครบกำหนด ${formatThaiDate(due)}` : 'ยังไม่กำหนดวัน'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Payment history for this credit customer */}
              {customer.paymentHistory && customer.paymentHistory.filter((p) => p.type === 'CREDIT_SETTLEMENT').length > 0 && (
                <div className="bg-white rounded-2xl p-4 border border-[#D2E0EB] shadow-xs space-y-2">
                  <h4 className="font-bold text-sm text-[#1E3A5F] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-[#16A34A]">history</span>
                    ประวัติการรับชำระ
                  </h4>
                  <div className="space-y-1.5">
                    {customer.paymentHistory
                      .filter((p) => p.type === 'CREDIT_SETTLEMENT')
                      .map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between gap-2 p-2 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-xs"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#1E3A5F] data-mono">{formatShortDate(p.date)}</span>
                            {p.method && (
                              <span className="px-1.5 py-0.5 rounded-md bg-white border border-[#D2E0EB] text-[10px] font-bold text-[#64748B]">
                                {p.method === 'Cash' ? 'เงินสด' : p.method === 'Transfer' ? 'โอน' : p.method}
                              </span>
                            )}
                            {p.note && <span className="text-[#64748B]">{p.note}</span>}
                          </div>
                          <span className="font-bold text-[#16A34A] data-mono">+฿{p.amountPaid.toLocaleString()}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()
      )}

      {/* Record Credit Payment Modal */}
      {settleCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-[#BAE6FD]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-[#DCFCE7] text-[#166534] flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">payments</span>
                </div>
                <div>
                  <h3 className="font-bold text-[#1E3A5F]">
                    {settlingPeriod ? `ตัดจ่ายงวด ${settlingPeriod.label}` : 'บันทึกรับชำระเงินเครดิต'}
                  </h3>
                  <p className="text-xs text-[#64748B]">{settleCustomer.name}</p>
                </div>
              </div>
              <button
                onClick={closeSettleModal}
                className="p-1 text-[#64748B] hover:bg-[#F1F5F9] rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="mt-4 space-y-4">
              <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-2xl flex justify-between items-center">
                <span className="text-xs font-semibold text-[#991B1B]">
                  {settlingPeriod ? `ยอดของงวด ${settlingPeriod.label}` : 'ยอดค้างรวมทั้งหมดปัจจุบัน'}
                </span>
                <span className="text-lg font-bold text-[#DC2626] data-mono">
                  ฿
                  {(() => {
                    const g = groups.find((gg) => gg.customer.id === settleCustomer.id);
                    if (!g) return 0;
                    return settlingPeriod ? getPeriodTotal(g.bills, settlingPeriod) : getOutstanding(g);
                  })().toLocaleString()}
                </span>
              </div>

              {settlingPeriod && (
                <div className="p-2.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-[11px] text-[#166534]">
                  การยืนยันนี้จะตัดยอดของงวด {settlingPeriod.label} ออกจากยอดค้างทั้งหมด ไม่ว่าจะพิมพ์จำนวนเงินเท่าไหร่
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-[#1E3A5F]">จำนวนเงินที่รับชำระ (บาท)</label>
                <input
                  type="number"
                  min="0"
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-2.5 border border-[#CBD5E1] rounded-xl text-base font-bold text-[#0284C7] data-mono focus:ring-2 focus:ring-[#0284C7] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1E3A5F] block mb-1">ช่องทางชำระ</label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPayMethod('Cash')}
                    className={`flex-1 px-2 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-colors flex items-center justify-center gap-1 ${
                      payMethod === 'Cash'
                        ? 'bg-[#16A34A] text-white border-[#16A34A]'
                        : 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1] hover:bg-[#E2E8F0]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">payments</span>
                    เงินสด
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('Transfer')}
                    className={`flex-1 px-2 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-colors flex items-center justify-center gap-1 ${
                      payMethod === 'Transfer'
                        ? 'bg-[#0284C7] text-white border-[#0284C7]'
                        : 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1] hover:bg-[#E2E8F0]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">account_balance</span>
                    โอน
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1E3A5F] block mb-1">วันที่จ่ายมา</label>
                <DateInput
                  value={payDate}
                  onChange={setPayDate}
                  className="w-full px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#1E3A5F] data-mono focus:ring-2 focus:ring-[#0284C7] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1E3A5F]">หมายเหตุ (ถ้ามี)</label>
                <input
                  type="text"
                  placeholder="เช่น โอนเข้าบัญชีธารทอง, ชำระเงินสดล่วงหน้า"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs focus:ring-2 focus:ring-[#0284C7] outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeSettleModal}
                  className="flex-1 py-2.5 border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#475569] hover:bg-[#F1F5F9] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#0284C7] text-white rounded-xl text-xs font-bold hover:bg-[#0369A1] shadow-md cursor-pointer"
                >
                  บันทึกรับเงิน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
