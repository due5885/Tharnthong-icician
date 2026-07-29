import React, { useState } from 'react';
import {
  CustomerAccount,
  DeliveryRecord,
  ExpenseItem,
  IceProduct,
  IcePurchaseRecord,
  MonthlyFixedExpense,
  RoleLevel,
  RouteItem,
} from '../types';
import { formatShortDate } from '../lib/statementExport';
import { canViewNetProfit } from '../lib/permissions';
import { DateInput } from './DateInput';

interface SummaryViewProps {
  recentDeliveries: DeliveryRecord[];
  expenses: ExpenseItem[];
  monthlyExpenses: MonthlyFixedExpense[];
  customers: CustomerAccount[];
  routes: RouteItem[];
  products: IceProduct[];
  roleLevel: RoleLevel;
  selectedDate: string;
  onDateChange: (date: string) => void;
  icePurchases: IcePurchaseRecord[];
  onAddMonthlyExpense: (month: string, name: string, amount: number) => void;
  onUpdateMonthlyExpense: (id: string, name: string, amount: number) => void;
  onDeleteMonthlyExpense: (id: string) => void;
  onNavigateToExpenses: () => void;
  onNavigateToIcePurchase: () => void;
  onShowToast: (msg: string) => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  recentDeliveries,
  expenses,
  monthlyExpenses,
  customers,
  routes,
  products,
  roleLevel,
  selectedDate,
  onDateChange,
  icePurchases,
  onAddMonthlyExpense,
  onUpdateMonthlyExpense,
  onDeleteMonthlyExpense,
  onNavigateToExpenses,
  onNavigateToIcePurchase,
  onShowToast,
}) => {
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => selectedDate.slice(0, 7));

  // Form for adding new fixed expense
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState<number>(0);

  const sublineRoute = routes.find((r) => r.type === 'subline');

  // Revenue for the selected day/month, computed live from recentDeliveries — every delivery
  // logged anywhere (route customers, quick-sale, สายย่อย, ฯลฯ) carries its own dated status,
  // so this always reflects the actual ledger instead of a manually-accumulated running total.
  const periodDeliveries = recentDeliveries.filter((d) =>
    reportType === 'daily' ? d.date === selectedDate : d.date.startsWith(selectedMonth)
  );

  // สายย่อย deliveries are cash-in/out, not itemized sales — kept out of the regular revenue mix.
  const regularDeliveries = periodDeliveries.filter(
    (d) => !sublineRoute || d.routeName !== sublineRoute.name
  );
  const sublineDeliveries = sublineRoute
    ? periodDeliveries.filter((d) => d.routeName === sublineRoute.name)
    : [];

  const computedRevenue = regularDeliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  const computedCashRevenue = regularDeliveries
    .filter((d) => d.status === 'Cash' || d.status === 'NewAndOld' || d.status === 'OldPayment')
    .reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  const computedCreditRevenue = regularDeliveries
    .filter((d) => d.status === 'Credit' || d.status === 'Debt')
    .reduce((sum, d) => sum + (d.totalAmount || 0), 0);

  // Calculate Product Quantities for all products dynamically
  const productTotals: Record<string, number> = {};
  products.forEach((p) => {
    productTotals[p.key] = 0;
  });

  customers.forEach((c) => {
    if (c.quantities) {
      Object.entries(c.quantities).forEach(([k, qty]) => {
        const val = typeof qty === 'number' ? qty : 0;
        productTotals[k] = (productTotals[k] || 0) + val;
      });
    }
  });

  // Per-route sales breakdown — answers "แต่ละสายวันนี้ขายได้เท่าไหร่"
  const routeNames = Array.from(
    new Set(regularDeliveries.map((d) => d.routeName || 'ไม่ระบุสาย'))
  );
  const routeSalesBreakdown = routeNames
    .map((routeName) => {
      const bills = regularDeliveries.filter((d) => (d.routeName || 'ไม่ระบุสาย') === routeName);
      const cash = bills
        .filter((d) => d.status === 'Cash' || d.status === 'NewAndOld' || d.status === 'OldPayment')
        .reduce((s, d) => s + d.totalAmount, 0);
      const credit = bills.filter((d) => d.status === 'Credit').reduce((s, d) => s + d.totalAmount, 0);
      const debt = bills.filter((d) => d.status === 'Debt').reduce((s, d) => s + d.totalAmount, 0);
      return { routeName, cash, credit, debt, total: cash + credit + debt, billCount: bills.length };
    })
    .sort((a, b) => b.total - a.total);

  // สายย่อย cash recap — answers "สายย่อยจ่ายค่าน้ำแข็งมาเท่าไหร่"
  const sublineByCustomer: Record<string, { total: number; cash: number; transfer: number }> = {};
  sublineDeliveries.forEach((d) => {
    if (!sublineByCustomer[d.customerName]) {
      sublineByCustomer[d.customerName] = { total: 0, cash: 0, transfer: 0 };
    }
    sublineByCustomer[d.customerName].total += d.totalAmount;
    if (d.paymentMethod === 'Transfer') {
      sublineByCustomer[d.customerName].transfer += d.totalAmount;
    } else {
      sublineByCustomer[d.customerName].cash += d.totalAmount;
    }
  });
  const sublineRecap = Object.entries(sublineByCustomer).map(([name, v]) => ({ name, ...v }));
  const sublineTotal = sublineDeliveries.reduce((s, d) => s + d.totalAmount, 0);

  // รับชำระเงินเครดิต — debt/credit settlements received during the period (excludes สายย่อย)
  const creditPayments: {
    customerName: string;
    amountPaid: number;
    method?: string;
    date: string;
  }[] = [];
  customers.forEach((c) => {
    const isSubline = sublineRoute && c.route === sublineRoute.name;
    if (isSubline) return;
    (c.paymentHistory || []).forEach((p) => {
      const inPeriod = reportType === 'daily' ? p.date === selectedDate : p.date.startsWith(selectedMonth);
      if (inPeriod) {
        creditPayments.push({ customerName: c.name, amountPaid: p.amountPaid, method: p.method, date: p.date });
      }
    });
  });
  const creditPaymentsTotal = creditPayments.reduce((s, p) => s + p.amountPaid, 0);

  // Daily expense records for the period — previously summed across ALL history regardless
  // of the selected day/month; now correctly scoped like everything else above.
  const periodExpenses = expenses.filter((e) =>
    reportType === 'daily' ? e.date === selectedDate : e.date.startsWith(selectedMonth)
  );
  const totalDailyExpenseRecorded = periodExpenses.reduce((sum, item) => sum + item.amount, 0);

  // ต้นทุนซื้อน้ำแข็งจากผู้ขาย (เช่น ธารทิพย์) — คำนวณจากบันทึกซื้อจริงตามช่วงที่เลือก (วัน/เดือน)
  const periodIcePurchases = icePurchases.filter((p) =>
    reportType === 'daily' ? p.date === selectedDate : p.date.startsWith(selectedMonth)
  );
  const icePurchaseCost = periodIcePurchases.reduce((sum, p) => sum + p.totalAmount, 0);

  // Fixed monthly operating costs (เงินเดือน, ค่าเช่า, ค่าน้ำไฟ) only apply to the monthly view,
  // and only the entries actually tagged for the selected month.
  const periodFixedExpenses = monthlyExpenses.filter((e) => e.month === selectedMonth);
  const totalFixedMonthlyExpense = periodFixedExpenses.reduce((sum, item) => sum + item.amount, 0);

  const grandTotalExpense =
    reportType === 'daily' ? totalDailyExpenseRecorded : totalDailyExpenseRecorded + totalFixedMonthlyExpense;

  // Net Profit calculation
  const calculatedNetProfit = computedRevenue - (icePurchaseCost || 0) - grandTotalExpense;

  // Cash actually collected in hand (revenue cash bucket + credit settled in cash + สายย่อย cash in) minus cash expenses out
  const cashExpenseTotal = periodExpenses
    .filter((e) => e.status === 'Cash')
    .reduce((s, e) => s + e.amount, 0);
  const netCashToDeposit =
    computedCashRevenue +
    creditPayments.filter((p) => p.method !== 'Transfer').reduce((s, p) => s + p.amountPaid, 0) +
    sublineDeliveries.filter((d) => d.paymentMethod !== 'Transfer').reduce((s, d) => s + d.totalAmount, 0) -
    cashExpenseTotal;

  const handleAddFixedExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseName.trim()) {
      onShowToast('กรุณาระบุชื่อรายการค่าใช้จ่าย');
      return;
    }

    onAddMonthlyExpense(selectedMonth, newExpenseName.trim(), Math.max(0, newExpenseAmount));
    setNewExpenseName('');
    setNewExpenseAmount(0);
    onShowToast(`เพิ่มรายการ "${newExpenseName}" เรียบร้อยแล้ว`);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header and Daily/Monthly Toggle */}
      <section className="bg-white p-4 sm:p-5 rounded-2xl border border-[#D2E0EB] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-[#1E3A5F] flex items-center gap-2 font-sans">
              <span className="material-symbols-outlined text-[#0284C7]">analytics</span>
              สรุปภาพรวมผลการดำเนินงาน
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              เลือกรูปแบบสรุปรายวัน หรือสรุปประมวลผลรายเดือน
            </p>
          </div>

          {/* Daily vs Monthly Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-[#E2E8F0] rounded-xl border border-[#CBD5E1]">
            <button
              onClick={() => setReportType('daily')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportType === 'daily'
                  ? 'bg-[#1E3A5F] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#1E3A5F]'
              }`}
            >
              สรุปรายวัน
            </button>
            <button
              onClick={() => setReportType('monthly')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportType === 'monthly'
                  ? 'bg-[#1E3A5F] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#1E3A5F]'
              }`}
            >
              สรุปรายเดือน
            </button>
          </div>
        </div>

        {/* Date / Month Picker Filter */}
        <div className="flex items-center gap-3 pt-2 border-t border-[#E2E8F0]">
          {reportType === 'daily' ? (
            <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#CBD5E1] px-3 py-1.5 rounded-xl">
              <span className="material-symbols-outlined text-sm text-[#0284C7]">calendar_today</span>
              <span className="text-xs font-bold text-[#1E3A5F]">เลือกวัน:</span>
              <DateInput
                value={selectedDate}
                onChange={onDateChange}
                className="bg-transparent text-xs font-bold text-[#0284C7] data-mono outline-none cursor-pointer w-24"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#CBD5E1] px-3 py-1.5 rounded-xl">
              <span className="material-symbols-outlined text-sm text-[#0284C7]">calendar_month</span>
              <span className="text-xs font-bold text-[#1E3A5F]">เลือกเดือน:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#0284C7] data-mono outline-none cursor-pointer"
              />
            </div>
          )}

          <span className="text-xs font-semibold text-[#64748B]">
            {reportType === 'daily' ? `ข้อมูลประจำวันที่ ${formatShortDate(selectedDate)}` : `ประมวลผลประจำเดือน ${selectedMonth}`}
          </span>
        </div>
      </section>

      {/* Top Main Bento Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Total Revenue Big Card */}
        <div className="lg:col-span-2 bg-[#1E3A5F] text-white p-6 rounded-2xl shadow-xs flex flex-col justify-between relative overflow-hidden min-h-[190px]">
          <div className="absolute top-2 right-2 p-2 opacity-10 pointer-events-none">
            <span className="material-symbols-outlined text-9xl fill-1">payments</span>
          </div>

          <div>
            <p className="text-xs font-bold tracking-widest uppercase opacity-80 text-[#7DD3FC]">
              {reportType === 'daily' ? 'TOTAL REVENUE (รายรับรวมวันนี้)' : 'MONTHLY REVENUE (รายรับรวมเดือนนี้)'}
            </p>
            <h3 className="text-3xl md:text-4xl font-bold mt-1 tracking-tight data-mono">
              ฿ {computedRevenue.toLocaleString()}.00
            </h3>
          </div>

          <div className="flex items-center gap-6 mt-6 pt-4 border-t border-white/20">
            <div className="flex flex-col">
              <span className="text-xs opacity-75 font-medium">เงินสด (Cash)</span>
              <span className="text-lg md:text-xl font-bold text-[#7DD3FC] data-mono">
                ฿ {computedCashRevenue.toLocaleString()}
              </span>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="flex flex-col">
              <span className="text-xs opacity-75 font-medium">เครดิต/ค้างชำระ (Credit)</span>
              <span className="text-lg md:text-xl font-bold text-[#BAE6FD] data-mono">
                ฿ {computedCreditRevenue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Top Right Summary Metric Cards for each product */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {products.map((prod) => {
            const totalQty = productTotals[prod.key] || 0;
            return (
              <div
                key={prod.id}
                className="bg-white border border-[#D2E0EB] p-3 rounded-2xl flex flex-col justify-between hover:border-[#0284C7] transition-all shadow-xs"
              >
                <div className="flex items-center gap-2">
                  {prod.imageUrl ? (
                    <img
                      src={prod.imageUrl}
                      alt={prod.labelTh}
                      className="w-7 h-7 rounded-lg object-cover border border-[#CBD5E1] shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-[#0284C7] text-lg">
                      {prod.icon || 'ac_unit'}
                    </span>
                  )}
                  <span className="text-xs font-bold text-[#1E3A5F] truncate">
                    {prod.labelTh}
                  </span>
                </div>
                <div className="flex items-end justify-between mt-2">
                  <span className="text-xl font-bold text-[#1E3A5F] data-mono">
                    {totalQty.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-bold text-[#0369A1] bg-[#E0F2FE] px-1.5 py-0.5 rounded-full">
                    {prod.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* สรุปยอดขายแยกตามสายส่ง */}
      <section className="bg-white p-5 rounded-2xl border border-[#D2E0EB] shadow-xs space-y-3">
        <div className="flex items-center gap-2.5 pb-2 border-b border-[#E2E8F0]">
          <div className="w-10 h-10 rounded-2xl bg-[#E0F2FE] flex items-center justify-center text-[#0284C7]">
            <span className="material-symbols-outlined text-xl">alt_route</span>
          </div>
          <div>
            <h3 className="font-bold text-base text-[#1E3A5F]">สรุปยอดขายแยกตามสายส่ง</h3>
            <p className="text-xs text-[#64748B]">แต่ละสายวันนี้ขายได้เท่าไหร่ แยกเงินสด/เครดิต/ค้างจ่าย</p>
          </div>
        </div>

        {routeSalesBreakdown.length === 0 ? (
          <p className="text-xs text-[#94A3B8] py-4 text-center">ยังไม่มีรายการขายในช่วงเวลานี้</p>
        ) : (
          <div className="overflow-x-auto thin-scrollbar">
            <table className="w-full border-collapse text-left min-w-[560px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-[#64748B] border-b border-[#E2E8F0]">
                  <th className="py-2 font-bold">สายส่ง</th>
                  <th className="py-2 font-bold text-right">เงินสด</th>
                  <th className="py-2 font-bold text-right">เครดิต</th>
                  <th className="py-2 font-bold text-right">ค้างจ่าย</th>
                  <th className="py-2 font-bold text-right">รวม</th>
                  <th className="py-2 font-bold text-right">บิล</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-[#F1F5F9]">
                {routeSalesBreakdown.map((r) => (
                  <tr key={r.routeName} className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 font-bold text-[#1E3A5F]">{r.routeName}</td>
                    <td className="py-2.5 text-right data-mono text-[#0284C7] font-semibold">
                      {r.cash > 0 ? `฿${r.cash.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-2.5 text-right data-mono text-[#475569] font-semibold">
                      {r.credit > 0 ? `฿${r.credit.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-2.5 text-right data-mono text-[#DC2626] font-semibold">
                      {r.debt > 0 ? `฿${r.debt.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-2.5 text-right data-mono font-bold text-[#1E293B]">
                      ฿{r.total.toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right data-mono text-[#64748B]">{r.billCount}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#CBD5E1] font-bold text-sm">
                  <td className="py-2.5 text-[#1E3A5F]">รวมทั้งหมด</td>
                  <td className="py-2.5 text-right data-mono text-[#0284C7]">
                    ฿{routeSalesBreakdown.reduce((s, r) => s + r.cash, 0).toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right data-mono text-[#475569]">
                    ฿{routeSalesBreakdown.reduce((s, r) => s + r.credit, 0).toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right data-mono text-[#DC2626]">
                    ฿{routeSalesBreakdown.reduce((s, r) => s + r.debt, 0).toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right data-mono text-[#1E293B]">
                    ฿{routeSalesBreakdown.reduce((s, r) => s + r.total, 0).toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right data-mono text-[#64748B]">
                    {routeSalesBreakdown.reduce((s, r) => s + r.billCount, 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Two-column: สายย่อย recap + รับชำระเงินเครดิต */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* สายย่อยจ่ายค่าน้ำแข็งมาเท่าไหร่ */}
        <section className="bg-white p-5 rounded-2xl border border-[#D2E0EB] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#ECFDF5] flex items-center justify-center text-[#059669]">
                <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
              </div>
              <div>
                <h3 className="font-bold text-base text-[#1E3A5F]">รับเงินสายย่อย</h3>
                <p className="text-xs text-[#64748B]">สายย่อยจ่ายค่าน้ำแข็งมาเท่าไหร่</p>
              </div>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                sublineTotal < 0
                  ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                  : 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
              }`}
            >
              รวม ฿{sublineTotal.toLocaleString()}
            </span>
          </div>

          {sublineRecap.length === 0 ? (
            <p className="text-xs text-[#94A3B8] py-3 text-center">ยังไม่มีรายการรับเงินสายย่อยในช่วงเวลานี้</p>
          ) : (
            <div className="space-y-1.5">
              {sublineRecap.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between gap-2 p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs"
                >
                  <span className="font-semibold text-[#1E293B] truncate flex-1">{s.name}</span>
                  {s.cash > 0 && <span className="text-[#64748B]">สด ฿{s.cash.toLocaleString()}</span>}
                  {s.transfer > 0 && <span className="text-[#64748B]">โอน ฿{s.transfer.toLocaleString()}</span>}
                  <span
                    className={`font-bold data-mono shrink-0 ${
                      s.total < 0 ? 'text-[#DC2626]' : 'text-[#059669]'
                    }`}
                  >
                    ฿{s.total.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* รับชำระเงินเครดิต */}
        <section className="bg-white p-5 rounded-2xl border border-[#D2E0EB] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#F1F5F9] flex items-center justify-center text-[#475569]">
                <span className="material-symbols-outlined text-xl">event_repeat</span>
              </div>
              <div>
                <h3 className="font-bold text-base text-[#1E3A5F]">รับชำระเงินเครดิต</h3>
                <p className="text-xs text-[#64748B]">ลูกค้าเครดิตที่จ่ายยอดค้างเข้ามาช่วงนี้</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full border bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]">
              รวม ฿{creditPaymentsTotal.toLocaleString()}
            </span>
          </div>

          {creditPayments.length === 0 ? (
            <p className="text-xs text-[#94A3B8] py-3 text-center">ยังไม่มีลูกค้าเครดิตชำระเงินในช่วงเวลานี้</p>
          ) : (
            <div className="space-y-1.5">
              {creditPayments.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs"
                >
                  <span className="font-semibold text-[#1E293B] truncate flex-1">{p.customerName}</span>
                  <span className="text-[#64748B]">{p.method === 'Transfer' ? 'โอน' : 'สด'}</span>
                  <span className="font-bold data-mono text-[#475569] shrink-0">
                    ฿{p.amountPaid.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* รายละเอียดค่าใช้จ่าย */}
      <section className="bg-white p-5 rounded-2xl border border-[#D2E0EB] shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FEE2E2] flex items-center justify-center text-[#DC2626]">
              <span className="material-symbols-outlined text-xl">receipt_long</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1E3A5F]">รายละเอียดค่าใช้จ่าย</h3>
              <p className="text-xs text-[#64748B]">มีรายจ่ายอะไรบ้างในช่วงเวลานี้</p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full border bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]">
            รวม ฿{totalDailyExpenseRecorded.toLocaleString()}
          </span>
        </div>

        {periodExpenses.length === 0 ? (
          <p className="text-xs text-[#94A3B8] py-3 text-center">ยังไม่มีรายจ่ายบันทึกในช่วงเวลานี้</p>
        ) : (
          <div className="space-y-1.5">
            {periodExpenses.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between gap-2 p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs"
              >
                <span className="material-symbols-outlined text-[#DC2626] text-base shrink-0">
                  {exp.icon}
                </span>
                <span className="text-[#64748B] data-mono w-16 shrink-0">{exp.time}</span>
                <span className="font-semibold text-[#1E293B] flex-1 truncate">{exp.description}</span>
                <span className="text-[#64748B] shrink-0">{exp.route || 'ส่วนกลาง'}</span>
                <span className="font-bold data-mono text-[#DC2626] shrink-0">
                  ฿{exp.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            onClick={onNavigateToExpenses}
            className="text-xs font-bold text-[#0284C7] hover:underline flex items-center gap-1 cursor-pointer"
          >
            ไปที่หน้าบันทึกรายจ่าย
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </section>

      {/* Ice Purchase Cost — computed from itemized purchase records (สายบางแสนซื้อน้ำแข็งจากผู้ขายมาขายต่อ) */}
      <section className="bg-white p-5 rounded-2xl border border-[#BAE6FD] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E0F2FE] flex items-center justify-center text-[#0284C7]">
              <span className="material-symbols-outlined text-xl">shopping_cart</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1E3A5F]">
                ต้นทุนค่าน้ำแข็งที่ซื้อมา
              </h3>
              <p className="text-xs text-[#64748B]">
                รวมจากรายการซื้อน้ำแข็งที่บันทึกไว้ {reportType === 'daily' ? 'ในวันนี้' : 'ในเดือนนี้'}
                {periodIcePurchases.length > 0 ? ` (${periodIcePurchases.length} รายการ)` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#CBD5E1] px-3 py-2 rounded-2xl">
              <span className="font-bold text-lg text-[#0284C7] data-mono">
                ฿{icePurchaseCost.toLocaleString()}
              </span>
            </div>
            <button
              onClick={onNavigateToIcePurchase}
              className="text-xs font-bold text-[#0284C7] hover:underline cursor-pointer flex items-center gap-1 whitespace-nowrap"
            >
              ไปที่หน้าบันทึกซื้อน้ำแข็ง
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>

      {/* Fixed Operating Expenses Manager Section — monthly only (เงินเดือน, ค่าเช่าที่, ค่าน้ำค่าไฟ) */}
      {reportType === 'monthly' && (
        <section className="bg-white p-5 rounded-2xl border border-[#D2E0EB] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#DC2626] text-xl">
                receipt_long
              </span>
              <div>
                <h3 className="font-bold text-base text-[#1E3A5F]">
                  รายการค่าใช้จ่ายดำเนินงานประจำ (เงินเดือน, ค่าเช่า, ค่าน้ำไฟ)
                </h3>
                <p className="text-xs text-[#64748B]">
                  เพิ่ม ลบ และเปลี่ยนชื่อรายการค่าใช้จ่ายประจำเดือน {selectedMonth} ได้ตามต้องการ
                </p>
              </div>
            </div>

            <span className="text-xs font-bold bg-[#FEE2E2] text-[#DC2626] px-3 py-1 rounded-full border border-[#FECACA]">
              รวมประจำเดือน: ฿ {totalFixedMonthlyExpense.toLocaleString()}
            </span>
          </div>

          {/* Existing Fixed Expenses Table */}
          <div className="divide-y divide-[#E2E8F0]">
            {periodFixedExpenses.length === 0 ? (
              <p className="text-xs text-[#94A3B8] py-3 text-center">
                ยังไม่มีรายการค่าใช้จ่ายประจำสำหรับเดือน {selectedMonth}
              </p>
            ) : (
              periodFixedExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8FAFC] px-2 rounded-xl transition-all"
                >
                  <div className="flex-1">
                    <input
                      type="text"
                      value={exp.name}
                      onChange={(e) =>
                        onUpdateMonthlyExpense(exp.id, e.target.value, exp.amount)
                      }
                      className="font-bold text-sm text-[#1E3A5F] bg-transparent border-b border-transparent focus:border-[#0284C7] focus:bg-white px-1 py-0.5 rounded-sm outline-none w-full"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-1 text-xs">
                      <span className="text-[#64748B] font-bold">฿</span>
                      <input
                        type="number"
                        min="0"
                        value={exp.amount}
                        onChange={(e) =>
                          onUpdateMonthlyExpense(
                            exp.id,
                            exp.name,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-24 font-bold text-[#DC2626] text-right data-mono outline-none"
                      />
                      <span className="text-[#64748B] text-[11px]">บาท</span>
                    </div>

                    <button
                      onClick={() => onDeleteMonthlyExpense(exp.id)}
                      className="p-1.5 text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-xl transition-colors cursor-pointer"
                      title="ลบรายการ"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Form to Add New Fixed Expense */}
          <form
            onSubmit={handleAddFixedExpense}
            className="pt-3 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
          >
            <div className="sm:col-span-6">
              <label className="text-xs font-semibold text-[#64748B] block mb-1">
                เพิ่มชื่อรายการค่าใช้จ่ายใหม่
              </label>
              <input
                type="text"
                placeholder="เช่น ค่าเช่าสถานที่, เงินเดือนพนักงาน B"
                value={newExpenseName}
                onChange={(e) => setNewExpenseName(e.target.value)}
                className="w-full px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0284C7] outline-none"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="text-xs font-semibold text-[#64748B] block mb-1">
                จำนวนเงิน (บาท)
              </label>
              <input
                type="number"
                min="0"
                placeholder="0.00"
                value={newExpenseAmount || ''}
                onChange={(e) => setNewExpenseAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#DC2626] data-mono focus:ring-2 focus:ring-[#DC2626] outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full py-2 bg-[#1E3A5F] hover:bg-[#152C4A] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                เพิ่มรายการ
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Net Profit & Loss Financial Statement — owner only, staff/accountant share this screen */}
      {canViewNetProfit(roleLevel) && (
        <section className="bg-white p-6 rounded-2xl border border-[#D2E0EB] shadow-xs space-y-4">
          <h3 className="font-bold text-lg text-[#1E3A5F] flex items-center gap-2 font-sans">
            <span className="material-symbols-outlined text-[#0284C7]">account_balance</span>
            สรุปงบกำไร - ขาดทุนสุทธิ ({reportType === 'daily' ? 'รายวัน' : 'รายเดือน'})
          </h3>

          <div className="space-y-3 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
            {/* Row 1: Total Revenue */}
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-[#1E293B]">1. รายรับรวมจากการขาย:</span>
              <span className="font-bold text-lg text-[#0284C7] data-mono">
                + ฿ {computedRevenue.toLocaleString()}
              </span>
            </div>

            {/* Row 2: Ice Purchase Cost */}
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-[#64748B]">
                2. (-) ต้นทุนค่าน้ำแข็งที่สั่งซื้อมา:
              </span>
              <span className="font-bold text-base text-[#DC2626] data-mono">
                - ฿ {(icePurchaseCost || 0).toLocaleString()}
              </span>
            </div>

            {/* Row 3: Recorded Expenses */}
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-[#64748B]">
                3. (-) ค่าใช้จ่ายรวมทั้งหมด{reportType === 'monthly' ? ' (รายวัน + ประจำเดือน)' : ''}:
              </span>
              <span className="font-bold text-base text-[#DC2626] data-mono">
                - ฿ {grandTotalExpense.toLocaleString()}
              </span>
            </div>

            <div className="pt-3 border-t border-[#CBD5E1] flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-[#1E3A5F] uppercase block">
                  กำไรสุทธิคงเหลือจริง (NET PROFIT)
                </span>
                <span className="text-[11px] text-[#64748B]">
                  (รายรับ - ต้นทุนน้ำแข็ง - ค่าใช้จ่าย)
                </span>
              </div>

              <span
                className={`text-2xl md:text-3xl font-bold data-mono ${
                  calculatedNetProfit >= 0 ? 'text-[#0284C7]' : 'text-[#DC2626]'
                }`}
              >
                ฿ {calculatedNetProfit.toLocaleString()}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Cash-in-hand reconciliation — everyone who handles cash needs this, so it stays visible to all roles */}
      <section className="bg-white p-6 rounded-2xl border border-[#D2E0EB] shadow-xs space-y-3">
        <h3 className="font-bold text-lg text-[#1E3A5F] flex items-center gap-2 font-sans">
          <span className="material-symbols-outlined text-[#059669]">account_balance_wallet</span>
          เงินสดที่ต้องนำส่ง ({reportType === 'daily' ? 'รายวัน' : 'รายเดือน'})
        </h3>
        <div className="space-y-3 bg-[#ECFDF5] p-4 rounded-2xl border border-[#A7F3D0]">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-[#1E293B]">เงินสดจากการขาย + รับชำระเครดิต + สายย่อย:</span>
            <span className="font-bold data-mono text-[#059669]">
              + ฿ {(computedCashRevenue + creditPaymentsTotal + sublineTotal).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-[#64748B]">(-) ค่าใช้จ่ายที่จ่ายเป็นเงินสด:</span>
            <span className="font-bold data-mono text-[#DC2626]">
              - ฿ {cashExpenseTotal.toLocaleString()}
            </span>
          </div>
          <div className="pt-2 border-t border-[#A7F3D0] flex justify-between items-center">
            <span className="text-xs font-bold text-[#047857] uppercase">เงินสดคงเหลือที่ต้องนำส่ง</span>
            <span
              className={`text-xl font-bold data-mono ${
                netCashToDeposit >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'
              }`}
            >
              ฿ {netCashToDeposit.toLocaleString()}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
