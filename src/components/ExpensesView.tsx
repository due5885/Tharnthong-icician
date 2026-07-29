import React, { useState } from 'react';
import { ExpenseCategory, ExpenseItem, RouteItem } from '../types';
import { useHorizontalWheelScroll } from '../lib/useHorizontalWheelScroll';

interface ExpensesViewProps {
  expenses: ExpenseItem[];
  routes?: RouteItem[];
  categories: ExpenseCategory[];
  onOpenAddExpenseModal: () => void;
  onOpenCategoryManager: () => void;
  onDeleteExpense?: (id: string) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  routes = [],
  categories: expenseCategories,
  onOpenAddExpenseModal,
  onOpenCategoryManager,
  onDeleteExpense,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('All');
  const tableScrollRef = useHorizontalWheelScroll<HTMLDivElement>();

  const categories = [
    { key: 'All', label: 'ทุกหมวดหมู่' },
    ...expenseCategories.map((c) => ({ key: c.key, label: c.labelTh })),
  ];

  // Build list of route keys for filter
  const allRouteKeys = ['หน้าร้าน / ส่วนกลาง', ...routes.map((r) => r.name)];

  // Compute breakdown per route
  const routeTotals: Record<string, number> = {};
  allRouteKeys.forEach((k) => {
    routeTotals[k] = 0;
  });

  expenses.forEach((exp) => {
    const routeName = exp.route || 'หน้าร้าน / ส่วนกลาง';
    routeTotals[routeName] = (routeTotals[routeName] || 0) + exp.amount;
  });

  const filteredExpenses = expenses.filter((exp) => {
    const matchesCat = selectedCategory === 'All' || exp.category === selectedCategory;
    const expRoute = exp.route || 'หน้าร้าน / ส่วนกลาง';
    const matchesRoute = selectedRouteFilter === 'All' || expRoute === selectedRouteFilter;
    return matchesCat && matchesRoute;
  });

  const grandTotalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-6 pb-24">
      {/* Header and Add Button */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-2xl border border-[#D2E0EB] shadow-xs">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[#1E3A5F] flex items-center gap-2 font-sans">
            <span className="material-symbols-outlined text-[#0284C7]">payments</span>
            รายจ่ายประจำวัน (Daily Expenses)
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            ลงบันทึกรายจ่ายแยกตามสายส่งน้ำแข็งแต่ละสาย แล้วรวบรวมสรุปภาพรวมทั้งหมด
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCategoryManager}
            className="bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#1E3A5F] border border-[#CBD5E1] flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl font-bold text-xs md:text-sm transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg text-[#0284C7]">category</span>
            จัดการหมวดหมู่
          </button>
          <button
            onClick={onOpenAddExpenseModal}
            className="bg-[#0284C7] hover:bg-[#0369A1] text-white flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs md:text-sm active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            บันทึกรายจ่ายใหม่
          </button>
        </div>
      </section>

      {/* Request #3: สรุปรายจ่ายแยกตามสายส่งก่อน */}
      <section className="bg-white p-4 md:p-5 rounded-2xl border border-[#BAE6FD] shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
          <h3 className="font-bold text-sm text-[#1E3A5F] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0284C7] text-lg">alt_route</span>
            สรุปยอดรายจ่ายแยกตามแต่ละสายส่ง
          </h3>
          <span className="text-xs font-bold text-[#DC2626] data-mono bg-[#FEE2E2] px-2.5 py-0.5 rounded-full border border-[#FECACA]">
            รวมรายจ่ายทั้งหมด: ฿ {grandTotalExpense.toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {allRouteKeys.map((routeName) => {
            const amount = routeTotals[routeName] || 0;
            const isSelected = selectedRouteFilter === routeName;

            return (
              <button
                type="button"
                key={routeName}
                onClick={() =>
                  setSelectedRouteFilter(selectedRouteFilter === routeName ? 'All' : routeName)
                }
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#E0F2FE] border-[#0284C7] shadow-xs'
                    : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#CBD5E1]'
                }`}
              >
                <span className="text-[11px] font-bold text-[#64748B] block truncate">
                  {routeName}
                </span>
                <span className="text-lg font-bold text-[#1E3A5F] data-mono block mt-1">
                  ฿ {amount.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Filter Bar: Route & Category Filters */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3 bg-white p-3 rounded-2xl border border-[#D2E0EB] shadow-xs">
        {/* Route Selector Filter Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap py-1">
          <span className="text-xs font-bold text-[#64748B] shrink-0 mr-1">สายส่ง:</span>
          <button
            onClick={() => setSelectedRouteFilter('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
              selectedRouteFilter === 'All'
                ? 'bg-[#1E3A5F] text-white shadow-xs'
                : 'text-[#64748B] hover:bg-[#F1F5F9]'
            }`}
          >
            ทุกสายส่ง ({expenses.length})
          </button>
          {allRouteKeys.map((rName) => {
            const count = expenses.filter(
              (e) => (e.route || 'หน้าร้าน / ส่วนกลาง') === rName
            ).length;
            return (
              <button
                key={rName}
                onClick={() => setSelectedRouteFilter(rName)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                  selectedRouteFilter === rName
                    ? 'bg-[#1E3A5F] text-white shadow-xs'
                    : 'text-[#64748B] hover:bg-[#F1F5F9]'
                }`}
              >
                {rName} ({count})
              </button>
            );
          })}
        </div>

        {/* Category Badges */}
        <div className="flex items-center gap-1 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.key
                  ? 'bg-[#0284C7] text-white'
                  : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses Table */}
      <section className="bg-white border border-[#D2E0EB] rounded-2xl overflow-hidden shadow-xs">
        <div ref={tableScrollRef} className="overflow-x-auto thin-scrollbar">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#1E3A5F] text-white text-xs uppercase tracking-wider">
                <th className="p-3.5 font-bold">เวลา</th>
                <th className="p-3.5 font-bold">สายส่ง / ส่วนงาน</th>
                <th className="p-3.5 font-bold">หมวดหมู่</th>
                <th className="p-3.5 font-bold">รายละเอียด</th>
                <th className="p-3.5 font-bold text-right">จำนวนเงิน</th>
                <th className="p-3.5 font-bold text-center">ชำระด้วย</th>
                {onDeleteExpense && <th className="p-3.5 font-bold text-center">จัดการ</th>}
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-[#E2E8F0]">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-[#64748B] font-medium">
                    ไม่พบข้อมูลรายจ่ายในเงื่อนไขนี้
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => {
                  const expRoute = expense.route || 'หน้าร้าน / ส่วนกลาง';

                  return (
                    <tr key={expense.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="p-3.5 text-[#64748B] data-mono font-medium whitespace-nowrap">
                        {expense.time}
                      </td>
                      <td className="p-3.5 font-bold text-[#0284C7] whitespace-nowrap">
                        <span className="bg-[#E0F2FE] px-2 py-0.5 rounded-lg border border-[#BAE6FD]">
                          {expRoute}
                        </span>
                      </td>
                      <td className="p-3.5 font-semibold text-[#1E293B] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[#0284C7] text-base">
                            {expense.icon}
                          </span>
                          <span>{expense.categoryTh}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-[#1E293B] max-w-xs">{expense.description}</td>
                      <td className="p-3.5 text-right font-bold text-[#DC2626] data-mono text-sm whitespace-nowrap">
                        ฿ {expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        {expense.status === 'Cash' ? (
                          <span className="bg-[#E0F2FE] text-[#0284C7] px-2 py-0.5 rounded-full font-bold border border-[#BAE6FD]">
                            เงินสด
                          </span>
                        ) : (
                          <span className="bg-[#FEE2E2] text-[#DC2626] px-2 py-0.5 rounded-full font-bold border border-[#FECACA]">
                            ตั้งค้าง
                          </span>
                        )}
                      </td>
                      {onDeleteExpense && (
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => onDeleteExpense(expense.id)}
                            className="p-1.5 text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-xl transition-colors cursor-pointer"
                            title="ลบรายการ"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Total Daily Expenses Summary Banner */}
      <section className="bg-[#1E3A5F] text-white border border-[#1E3A5F] rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div>
          <span className="text-xs font-bold text-[#7DD3FC] uppercase tracking-wider block">
            GRAND TOTAL DAILY EXPENSES
          </span>
          <span className="text-base font-bold">รวมรายจ่ายประจำวันทั้งหมดทุกสายส่ง</span>
        </div>
        <span className="text-3xl font-bold text-[#7DD3FC] data-mono">
          ฿ {grandTotalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      </section>
    </div>
  );
};
