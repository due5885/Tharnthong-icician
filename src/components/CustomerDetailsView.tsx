import React, { useEffect, useState } from 'react';
import { CustomerAccount, DeliveryRecord, IceBucketHolding, RouteItem } from '../types';
import { copyText, downloadCsv, formatShortDate, shortenSummaryText } from '../lib/statementExport';
import { DateInput } from './DateInput';

const PAY_METHOD_LABELS: Record<'Cash' | 'Transfer' | 'OldDebt', string> = {
  Cash: 'เงินสด',
  Transfer: 'โอน',
  OldDebt: 'จ่ายเก่า',
};

interface CustomerDetailsViewProps {
  customers: CustomerAccount[];
  routes: RouteItem[];
  recentDeliveries: DeliveryRecord[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onUpdateCustomer: (id: string, updated: Partial<CustomerAccount>) => void;
  onShowToast: (msg: string) => void;
}

export const CustomerDetailsView: React.FC<CustomerDetailsViewProps> = ({
  customers,
  routes,
  recentDeliveries,
  selectedDate,
  onDateChange,
  onUpdateCustomer,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('ALL');
  const [viewPeriod, setViewPeriod] = useState<'DAILY' | 'MONTHLY' | 'ALL'>('DAILY');
  const [selectedMonth, setSelectedMonth] = useState(() => selectedDate.substring(0, 7)); // YYYY-MM

  // Debt Settlement Modal State
  const [settleCustomer, setSettleCustomer] = useState<CustomerAccount | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNote, setPayNote] = useState('');
  const [payMethod, setPayMethod] = useState<'Cash' | 'Transfer' | 'OldDebt'>('Cash');
  const [payDate, setPayDate] = useState(selectedDate);

  // Drill-down: null = show the master customer list, set = show that one customer's full detail page
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  // Master list mode: 'DUE' (default, compact cards, only customers who owe something) or 'ALL' (full table, everyone)
  const [listMode, setListMode] = useState<'DUE' | 'ALL'>('DUE');

  // Filter Customers
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRoute = selectedRoute === 'ALL' || c.route === selectedRoute;
    return matchesSearch && matchesRoute;
  });

  // Helper to calculate total period delivery sales for a customer
  const getCustomerPeriodStats = (custName: string) => {
    const custDeliveries = recentDeliveries.filter((d) => {
      if (d.customerName !== custName) return false;
      if (viewPeriod === 'DAILY') return d.date === selectedDate;
      if (viewPeriod === 'MONTHLY') return d.date.startsWith(selectedMonth);
      return true; // ALL
    });

    let totalPurchased = 0;
    let amountPaid = 0;
    let periodDebt = 0;

    custDeliveries.forEach((d) => {
      totalPurchased += d.totalAmount || 0;
      if (d.status === 'Cash' || d.status === 'Credit') {
        amountPaid += d.totalAmount || 0;
      } else if (d.status === 'Debt') {
        periodDebt += d.totalAmount || 0;
      } else if (d.status === 'OldPayment' || d.status === 'NewAndOld') {
        const newPaid = d.statusDetails?.newAmountPaid || 0;
        const oldPaid = d.statusDetails?.oldDebtPaid || 0;
        amountPaid += newPaid + oldPaid;
        const totalBill = d.totalAmount || 0;
        if (totalBill > newPaid) {
          periodDebt += totalBill - newPaid;
        }
      }
    });

    return { totalPurchased, amountPaid, periodDebt, deliveryCount: custDeliveries.length };
  };

  // Grand Totals Calculation
  let grandTotalSales = 0;
  let grandTotalPaid = 0;
  let grandPeriodDebt = 0;
  let grandAccumulatedDebt = 0;

  filteredCustomers.forEach((c) => {
    const stats = getCustomerPeriodStats(c.name);
    grandTotalSales += stats.totalPurchased;
    grandTotalPaid += stats.amountPaid;
    grandPeriodDebt += stats.periodDebt;
    grandAccumulatedDebt += c.accumulatedDebt || (c.status === 'Debt' ? c.totalAmount : 0);
  });

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || null;

  // Dated, unpaid ("Debt") bills for the customer currently being viewed — lets staff see exactly which
  // dates were never paid instead of just one lump accumulated total (customers pay irregularly and staff
  // often forget which dates are still outstanding)
  const selectedCustomerDebtBills = selectedCustomer
    ? recentDeliveries
        .filter((d) => d.customerName === selectedCustomer.name && d.status === 'Debt')
        .sort((a, b) => (a.date < b.date ? 1 : -1))
    : [];

  const [debtExportRange, setDebtExportRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  useEffect(() => {
    if (!selectedCustomer) return;
    const dates = selectedCustomerDebtBills.map((d) => d.date).sort();
    setDebtExportRange({ start: dates[0] || '', end: dates[dates.length - 1] || '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomerId]);

  // Customers who owe something right now — either this period's bill or accumulated old debt
  const dueCustomers = filteredCustomers.filter((c) => {
    const accumDebt = c.accumulatedDebt ?? (c.status === 'Debt' ? c.totalAmount : 0);
    const stats = getCustomerPeriodStats(c.name);
    return accumDebt > 0 || stats.periodDebt > 0;
  });

  // Handle Debt Settlement
  const handleSettleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleCustomer) return;
    if (payAmount <= 0) {
      onShowToast('กรุณาระบุจำนวนเงินที่รับชำระ');
      return;
    }

    const currentDebt = settleCustomer.accumulatedDebt || (settleCustomer.status === 'Debt' ? settleCustomer.totalAmount : 0);
    const newDebt = Math.max(0, currentDebt - payAmount);

    const newHistoryItem = {
      id: `PAY-${Date.now()}`,
      date: payDate,
      amountPaid: payAmount,
      debtRemaining: newDebt,
      type: 'DEBT_SETTLEMENT' as const,
      method: payMethod,
      note: payNote.trim() || 'ชำระหนี้ค้างสะสม',
    };

    const existingHistory = settleCustomer.paymentHistory || [];

    onUpdateCustomer(settleCustomer.id, {
      accumulatedDebt: newDebt,
      status: newDebt === 0 ? 'Cash' : settleCustomer.status,
      paymentHistory: [newHistoryItem, ...existingHistory],
    });

    onShowToast(
      `บันทึกรับชำระเงินจาก "${settleCustomer.name}" จำนวน ฿${payAmount.toLocaleString()} (${
        PAY_METHOD_LABELS[payMethod]
      }) วันที่ ${formatShortDate(payDate)} เรียบร้อยแล้ว`
    );
    setSettleCustomer(null);
    setPayAmount(0);
    setPayNote('');
    setPayMethod('Cash');
  };

  // Debt bills within the picked export range, for the customer currently being viewed
  const getDebtBillsInRange = () =>
    selectedCustomerDebtBills.filter(
      (d) => d.date >= debtExportRange.start && d.date <= debtExportRange.end
    );

  const handleExportDebtCsv = () => {
    if (!selectedCustomer) return;
    const billsInRange = getDebtBillsInRange();
    const header = ['วันที่', 'รายละเอียด', 'ยอดค้าง'];
    const rows = billsInRange.map((d) => [formatShortDate(d.date), shortenSummaryText(d.summaryText), d.totalAmount.toString()]);
    const total = billsInRange.reduce((sum, d) => sum + d.totalAmount, 0);
    rows.push(['', 'รวม', total.toString()]);
    downloadCsv([header, ...rows], `${selectedCustomer.name}-ยอดค้าง-${debtExportRange.start}_${debtExportRange.end}.csv`);
    onShowToast(`ดาวน์โหลดรายการยอดค้างของ "${selectedCustomer.name}" เรียบร้อยแล้ว`);
  };

  const handleCopyDebtText = () => {
    if (!selectedCustomer) return;
    const billsInRange = getDebtBillsInRange();
    const lines = [
      `ยอดค้างชำระของ: ${selectedCustomer.name} (${selectedCustomer.route} • รหัส ${selectedCustomer.code})`,
      `ช่วงวันที่ ${formatShortDate(debtExportRange.start)} - ${formatShortDate(debtExportRange.end)}`,
      '',
    ];
    billsInRange.forEach((d) => {
      const summary = shortenSummaryText(d.summaryText);
      lines.push(`${formatShortDate(d.date)} ค้าง ฿${d.totalAmount.toLocaleString()}${summary ? ` (${summary})` : ''}`);
    });
    const total = billsInRange.reduce((sum, d) => sum + d.totalAmount, 0);
    lines.push('', `รวมค้างทั้งหมด: ฿${total.toLocaleString()}`);
    copyText(lines.join('\n'), onShowToast);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1E3A5F] to-[#0284C7] rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#BAE6FD] text-xs font-bold uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-sm">badge</span>
            <span>Customer Financial Summary</span>
          </div>
          <h1 className="text-2xl font-bold">รายละเอียดบัญชี & ยอดค้างชำระลูกค้า</h1>
          <p className="text-xs text-[#E0F2FE] mt-1">
            ดึงข้อมูลรายชื่อลูกค้าจากระบบบัญชี สรุปยอดซื้อ รับชำระ ยอดค้างชำระประจำรอบ และยอดค้างสะสม
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/20 backdrop-blur-xs shrink-0">
          <button
            onClick={() => setViewPeriod('DAILY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewPeriod === 'DAILY'
                ? 'bg-white text-[#1E3A5F] shadow-xs'
                : 'text-white hover:bg-white/10'
            }`}
          >
            รายวัน
          </button>
          <button
            onClick={() => setViewPeriod('MONTHLY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewPeriod === 'MONTHLY'
                ? 'bg-white text-[#1E3A5F] shadow-xs'
                : 'text-white hover:bg-white/10'
            }`}
          >
            รายเดือน
          </button>
          <button
            onClick={() => setViewPeriod('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewPeriod === 'ALL'
                ? 'bg-white text-[#1E3A5F] shadow-xs'
                : 'text-white hover:bg-white/10'
            }`}
          >
            ทั้งหมด
          </button>
        </div>
      </div>

      {/* Filter and Date Bar */}
      <div className="bg-white border border-[#D2E0EB] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          {/* Search Box */}
          <div className="relative flex-1 max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#94A3B8] text-lg">
              search
            </span>
            <input
              type="text"
              placeholder="ค้นหาลูกค้า..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-[#CBD5E1] rounded-xl text-xs focus:ring-2 focus:ring-[#0284C7] outline-none"
            />
          </div>

          {/* Route Filter */}
          <select
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] outline-none cursor-pointer"
          >
            <option value="ALL">ทุกสายส่ง</option>
            {routes.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date / Month Selector */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {viewPeriod === 'DAILY' && (
            <DateInput
              value={selectedDate}
              onChange={onDateChange}
              className="px-3 py-1.5 border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#1E3A5F] focus:ring-2 focus:ring-[#0284C7] outline-none cursor-pointer w-24"
            />
          )}

          {viewPeriod === 'MONTHLY' && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#1E3A5F] focus:ring-2 focus:ring-[#0284C7] outline-none cursor-pointer"
            />
          )}
        </div>
      </div>

      {/* Grand Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-[#D2E0EB] p-4 rounded-2xl shadow-xs">
          <div className="text-xs font-bold text-[#64748B]">ยอดซื้อรวมประจำรอบ</div>
          <div className="text-2xl font-bold text-[#1E3A5F] mt-1 data-mono">
            ฿{grandTotalSales.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#64748B] mt-1">จากลูกค้า {filteredCustomers.length} ราย</div>
        </div>

        <div className="bg-[#F0FDF4] border border-[#BBF7D0] p-4 rounded-2xl shadow-xs">
          <div className="text-xs font-bold text-[#166534]">ยอดชำระแล้วประจำรอบ</div>
          <div className="text-2xl font-bold text-[#15803D] mt-1 data-mono">
            ฿{grandTotalPaid.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#166534] mt-1">เงินสด / โอนชำระ</div>
        </div>

        <div className="bg-[#FFFBEB] border border-[#FDE68A] p-4 rounded-2xl shadow-xs">
          <div className="text-xs font-bold text-[#92400E]">ยอดค้างประจำรอบ</div>
          <div className="text-2xl font-bold text-[#D97706] mt-1 data-mono">
            ฿{grandPeriodDebt.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#92400E] mt-1">รอการจัดเก็บ</div>
        </div>

        <div className="bg-[#FEF2F2] border border-[#FCA5A5] p-4 rounded-2xl shadow-xs">
          <div className="text-xs font-bold text-[#991B1B]">ยอดค้างชำระสะสมรวมสุทธิ</div>
          <div className="text-2xl font-bold text-[#DC2626] mt-1 data-mono">
            ฿{grandAccumulatedDebt.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#991B1B] mt-1">ค้างสะสมทุกงวดรวมกัน</div>
        </div>
      </div>

      {/* Customer Financial Details — master list, click a row/card to open that customer's full page */}
      {!selectedCustomer ? (
        <div className="space-y-3">
          {/* Mode toggle: default to only customers who owe something; "ลูกค้าทั้งหมด" shows everyone in the full table */}
          <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setListMode('DUE')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                listMode === 'DUE' ? 'bg-white text-[#1E3A5F] shadow-2xs' : 'text-[#64748B] hover:text-[#1E3A5F]'
              }`}
            >
              มียอดค้าง ({dueCustomers.length} ราย)
            </button>
            <button
              type="button"
              onClick={() => setListMode('ALL')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                listMode === 'ALL' ? 'bg-white text-[#1E3A5F] shadow-2xs' : 'text-[#64748B] hover:text-[#1E3A5F]'
              }`}
            >
              ลูกค้าทั้งหมด ({filteredCustomers.length} ราย)
            </button>
          </div>

          {listMode === 'DUE' ? (
            dueCustomers.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-[#D2E0EB] text-center text-[#64748B] font-medium text-sm">
                ไม่มีลูกค้าที่มียอดค้างตอนนี้ 🎉
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {dueCustomers.map((cust) => {
                  const stats = getCustomerPeriodStats(cust.name);
                  const accumDebt = cust.accumulatedDebt ?? (cust.status === 'Debt' ? cust.totalAmount : 0);

                  return (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => setSelectedCustomerId(cust.id)}
                      className="text-left bg-white rounded-2xl p-3 border border-[#D2E0EB] hover:border-[#0284C7] shadow-xs hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold bg-[#E0F2FE] text-[#0369A1] px-1.5 py-0.5 rounded-md shrink-0">
                          {cust.code}
                        </span>
                        <span className="font-bold text-xs text-[#1E293B] truncate">{cust.name}</span>
                      </div>
                      <div className="text-[10px] text-[#64748B] font-medium mt-0.5 truncate">{cust.route}</div>
                      <div className="mt-2 space-y-0.5">
                        {stats.periodDebt > 0 && (
                          <div className="text-[10px] font-bold text-[#D97706]">
                            ค้างรอบนี้ ฿{stats.periodDebt.toLocaleString()}
                          </div>
                        )}
                        {accumDebt > 0 && (
                          <div className="text-xs font-bold text-[#DC2626]">
                            ค้างสะสม ฿{accumDebt.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
        <div className="bg-white border border-[#D2E0EB] rounded-3xl shadow-xs overflow-hidden">
          <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0284C7]">format_list_bulleted</span>
              <h3 className="font-bold text-sm text-[#1E3A5F]">
                รายการสรุปยอดรายลูกค้า ({filteredCustomers.length} ราย)
              </h3>
            </div>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[65vh]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EBF2F7] text-[#1E3A5F] font-bold uppercase text-[11px] border-b border-[#D2E0EB] sticky top-0 z-10">
                <tr>
                  <th className="p-3.5">รหัส / ชื่อลูกค้า</th>
                  <th className="p-3.5">สายส่ง</th>
                  <th className="p-3.5">🪣 ถังน้ำแข็งประจำร้าน</th>
                  <th className="p-3.5 text-right">ยอดซื้อรอบนี้</th>
                  <th className="p-3.5 text-right">จ่ายแล้ว</th>
                  <th className="p-3.5 text-right">ค้างรอบนี้</th>
                  <th className="p-3.5 text-right">ยอดค้างสะสมรวม</th>
                  <th className="p-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredCustomers.map((cust) => {
                  const stats = getCustomerPeriodStats(cust.name);
                  const accumDebt = cust.accumulatedDebt ?? (cust.status === 'Debt' ? cust.totalAmount : 0);
                  const buckets = cust.iceBuckets || [];

                  return (
                    <tr
                      key={cust.id}
                      onClick={() => setSelectedCustomerId(cust.id)}
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                    >
                      <td className="p-3.5 font-bold text-[#1E293B]">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold bg-[#E0F2FE] text-[#0369A1] px-1.5 py-0.5 rounded-md">
                            {cust.code}
                          </span>
                          <span>{cust.name}</span>
                        </div>
                      </td>

                      <td className="p-3.5 font-semibold text-[#64748B]">{cust.route}</td>

                      <td className="p-3.5">
                        {buckets.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {buckets.map((b) => (
                              <span
                                key={b.id}
                                className="text-[10px] font-semibold bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1] px-2 py-0.5 rounded-lg flex items-center gap-1"
                              >
                                🪣 {b.bucketSize} <strong className="text-[#0284C7]">({b.count} ใบ)</strong>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#94A3B8] italic">ไม่มีถังน้ำแข็ง</span>
                        )}
                      </td>

                      <td className="p-3.5 text-right font-bold text-[#1E3A5F] data-mono">
                        ฿{stats.totalPurchased.toLocaleString()}
                      </td>

                      <td className="p-3.5 text-right font-bold text-[#166534] data-mono">
                        ฿{stats.amountPaid.toLocaleString()}
                      </td>

                      <td className="p-3.5 text-right font-bold text-[#D97706] data-mono">
                        ฿{stats.periodDebt.toLocaleString()}
                      </td>

                      <td className="p-3.5 text-right font-bold data-mono">
                        {accumDebt > 0 ? (
                          <span className="text-[#DC2626] bg-[#FEE2E2] px-2 py-1 rounded-xl">
                            ฿{accumDebt.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[#166534] bg-[#DCFCE7] px-2 py-1 rounded-xl">
                            ฿0 (ไม่มีค้าง)
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        <span className="material-symbols-outlined text-[#94A3B8]">chevron_right</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
          )}
        </div>
      ) : (
        (() => {
          const cust = selectedCustomer;
          const stats = getCustomerPeriodStats(cust.name);
          const accumDebt = cust.accumulatedDebt ?? (cust.status === 'Debt' ? cust.totalAmount : 0);
          const custDeliveries = recentDeliveries.filter((d) => d.customerName === cust.name);

          return (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setSelectedCustomerId(null)}
                className="flex items-center gap-1.5 text-xs font-bold text-[#0284C7] hover:text-[#0369A1] cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                กลับไปรายชื่อลูกค้าทั้งหมด
              </button>

              <div className="bg-white border border-[#D2E0EB] rounded-3xl shadow-xs p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-[#E0F2FE] text-[#0369A1] px-1.5 py-0.5 rounded-md">
                        {cust.code}
                      </span>
                      <span className="font-bold text-xl text-[#1E3A5F]">{cust.name}</span>
                    </div>
                    <span className="text-xs text-[#64748B] font-medium">สายส่ง: {cust.route}</span>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="material-symbols-outlined text-sm text-[#94A3B8]">call</span>
                      <input
                        type="tel"
                        placeholder="เบอร์โทรลูกค้า (ยังไม่ระบุ)"
                        value={cust.phone || ''}
                        onChange={(e) => onUpdateCustomer(cust.id, { phone: e.target.value })}
                        className="px-2 py-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-medium text-[#1E293B] w-44 focus:ring-2 focus:ring-[#0284C7] outline-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSettleCustomer(cust);
                      setPayAmount(accumDebt);
                      setPayDate(selectedDate);
                      setPayMethod('Cash');
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-xl shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 w-fit"
                  >
                    <span className="material-symbols-outlined text-sm">payments</span>
                    รับชำระหนี้
                  </button>
                </div>

                {/* Per-customer KPI cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-2xl">
                    <div className="text-[11px] font-bold text-[#64748B]">ยอดซื้อรอบนี้</div>
                    <div className="text-lg font-bold text-[#1E3A5F] data-mono">
                      ฿{stats.totalPurchased.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-[#F0FDF4] border border-[#BBF7D0] p-3 rounded-2xl">
                    <div className="text-[11px] font-bold text-[#166534]">จ่ายแล้ว</div>
                    <div className="text-lg font-bold text-[#15803D] data-mono">
                      ฿{stats.amountPaid.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-[#FFFBEB] border border-[#FDE68A] p-3 rounded-2xl">
                    <div className="text-[11px] font-bold text-[#92400E]">ค้างรอบนี้</div>
                    <div className="text-lg font-bold text-[#D97706] data-mono">
                      ฿{stats.periodDebt.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-[#FEF2F2] border border-[#FCA5A5] p-3 rounded-2xl">
                    <div className="text-[11px] font-bold text-[#991B1B]">ยอดค้างสะสมรวม</div>
                    <div className="text-lg font-bold text-[#DC2626] data-mono">
                      ฿{accumDebt.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Dated debt breakdown + export — for customers who pay irregularly and staff lose track of which dates are still owed */}
                <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-2xl p-3 space-y-2.5">
                  <h4 className="text-xs font-bold uppercase text-[#991B1B]">รายการยอดค้างแยกวัน</h4>

                  {selectedCustomerDebtBills.length === 0 ? (
                    <div className="text-xs text-[#94A3B8] p-2 text-center">ยังไม่มีบิลค้างชำระ (สถานะ "ค้างชำระ") ของลูกค้ารายนี้</div>
                  ) : (
                    <>
                      <div className="flex items-end gap-2 flex-wrap">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-[#64748B] uppercase">ตั้งแต่วันที่</span>
                          <DateInput
                            value={debtExportRange.start}
                            onChange={(v) => setDebtExportRange((prev) => ({ ...prev, start: v }))}
                            className="px-2.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#1E3A5F] data-mono focus:ring-2 focus:ring-[#0284C7] outline-none w-24"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-[#64748B] uppercase">ถึงวันที่</span>
                          <DateInput
                            value={debtExportRange.end}
                            onChange={(v) => setDebtExportRange((prev) => ({ ...prev, end: v }))}
                            className="px-2.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#1E3A5F] data-mono focus:ring-2 focus:ring-[#0284C7] outline-none w-24"
                          />
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            onClick={handleExportDebtCsv}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F1F5F9] text-[#1E3A5F] rounded-xl text-xs font-bold transition-all border border-[#CBD5E1] cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm text-[#0284C7]">download</span>
                            ดาวน์โหลด Excel/CSV
                          </button>
                          <button
                            onClick={handleCopyDebtText}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F1F5F9] text-[#1E3A5F] rounded-xl text-xs font-bold transition-all border border-[#CBD5E1] cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm text-[#0284C7]">content_copy</span>
                            คัดลอกข้อความส่ง LINE
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {getDebtBillsInRange().map((d) => (
                          <div
                            key={d.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2.5 bg-white border border-[#FCA5A5] rounded-xl text-xs"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-[#1E3A5F] data-mono">{formatShortDate(d.date)}</span>
                              {d.summaryText && <span className="text-[#64748B]">{d.summaryText}</span>}
                            </div>
                            <span className="font-bold text-[#DC2626] data-mono">฿{d.totalAmount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Ice Buckets Info */}
                <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded-2xl">
                  <div className="text-xs font-bold text-[#1E3A5F] mb-1 flex items-center gap-1">
                    <span>🪣 ถังน้ำแข็งที่ตั้งไว้ที่ร้าน:</span>
                  </div>
                  {cust.iceBuckets && cust.iceBuckets.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {cust.iceBuckets.map((b) => (
                        <span key={b.id} className="text-xs bg-white border border-[#CBD5E1] px-2 py-1 rounded-xl text-[#334155] font-semibold">
                          {b.bucketSize}: <strong className="text-[#0284C7]">{b.count} ใบ</strong> ({b.note || 'ไม่มีระบุ'})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-[#94A3B8]">ยังไม่ได้ระบุถังน้ำแข็ง</span>
                  )}
                </div>

                {/* Payment History Logs */}
                <div>
                  <h4 className="text-xs font-bold uppercase text-[#64748B] mb-2">ประวัติการรับชำระเงินค้าง</h4>
                  {cust.paymentHistory && cust.paymentHistory.length > 0 ? (
                    <div className="space-y-2">
                      {cust.paymentHistory.map((p) => (
                        <div key={p.id} className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl flex justify-between items-center text-xs">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[#166534]">{formatShortDate(p.date)}</span>
                              {p.method && (
                                <span className="text-[9px] font-bold bg-white border border-[#BBF7D0] text-[#166534] px-1.5 py-0.5 rounded-full">
                                  {PAY_METHOD_LABELS[p.method]}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#64748B]">{p.note}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-[#15803D] text-sm data-mono block">
                              +฿{p.amountPaid.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-[#991B1B]">คงเหลือ: ฿{p.debtRemaining.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-[#94A3B8] p-3 bg-[#F8FAFC] rounded-2xl text-center">
                      ยังไม่มีประวัติชำระหนี้ค้างสะสม
                    </div>
                  )}
                </div>

                {/* Deliveries */}
                <div>
                  <h4 className="text-xs font-bold uppercase text-[#64748B] mb-2">รายการรับ-ส่งน้ำแข็งล่าสุด</h4>
                  {custDeliveries.length > 0 ? (
                    <div className="space-y-2">
                      {custDeliveries.map((d) => (
                        <div key={d.id} className="p-3 bg-white border border-[#E2E8F0] rounded-2xl flex justify-between items-center text-xs">
                          <div>
                            <div className="font-bold text-[#1E3A5F]">{formatShortDate(d.date)} • {d.time}</div>
                            <div className="text-[11px] text-[#64748B] mt-0.5">{d.summaryText}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-[#0284C7] data-mono text-sm">
                              ฿{d.totalAmount.toLocaleString()}
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1]">
                              {d.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-[#94A3B8] p-3 bg-[#F8FAFC] rounded-2xl text-center">
                      ยังไม่มีรายการจัดส่งน้ำแข็งในระบบ
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* Settle Debt Modal */}
      {settleCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-[#BAE6FD]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-[#DCFCE7] text-[#166534] flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">payments</span>
                </div>
                <div>
                  <h3 className="font-bold text-[#1E3A5F]">บันทึกรับชำระเงินค้างสะสม</h3>
                  <p className="text-xs text-[#64748B]">{settleCustomer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSettleCustomer(null)}
                className="p-1 text-[#64748B] hover:bg-[#F1F5F9] rounded-full"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="mt-4 space-y-4">
              <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-2xl flex justify-between items-center">
                <span className="text-xs font-semibold text-[#991B1B]">ยอดค้างสะสมปัจจุบัน</span>
                <span className="text-lg font-bold text-[#DC2626] data-mono">
                  ฿{(settleCustomer.accumulatedDebt ?? (settleCustomer.status === 'Debt' ? settleCustomer.totalAmount : 0)).toLocaleString()}
                </span>
              </div>

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
                  <button
                    type="button"
                    onClick={() => setPayMethod('OldDebt')}
                    className={`flex-1 px-2 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-colors flex items-center justify-center gap-1 ${
                      payMethod === 'OldDebt'
                        ? 'bg-[#D97706] text-white border-[#D97706]'
                        : 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1] hover:bg-[#E2E8F0]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">history</span>
                    จ่ายเก่า
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
                  onClick={() => setSettleCustomer(null)}
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
