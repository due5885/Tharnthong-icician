import {
  CustomerAccount,
  ExpenseItem,
  MonthlyFixedExpense,
  OperationSummaryStats,
  DeliveryRecord,
  RouteItem,
  SummaryOperationsData,
  TruckStockRecord,
  WarehouseLog,
} from '../types';

interface BuildContextArgs {
  selectedDate: string;
  stats: OperationSummaryStats;
  summaryData: SummaryOperationsData;
  customers: CustomerAccount[];
  expenses: ExpenseItem[];
  monthlyExpenses: MonthlyFixedExpense[];
  recentDeliveries: DeliveryRecord[];
  icePurchaseCost: number;
  routes: RouteItem[];
  truckRecords: TruckStockRecord[];
  warehouseLogs: WarehouseLog[];
}

export function buildBusinessContext({
  selectedDate,
  stats,
  summaryData,
  customers,
  expenses,
  monthlyExpenses,
  recentDeliveries,
  icePurchaseCost,
  routes,
  truckRecords,
  warehouseLogs,
}: BuildContextArgs): string {
  const todaysExpenses = expenses.filter((e) => e.date === selectedDate);
  const totalTodayExpense = todaysExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalMonthlyFixed = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

  const debtCustomers = customers
    .filter((c) => c.status === 'Debt' && c.totalAmount > 0)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 8);

  const accumulatedDebtCustomers = customers
    .filter((c) => (c.accumulatedDebt || 0) > 0)
    .sort((a, b) => (b.accumulatedDebt || 0) - (a.accumulatedDebt || 0))
    .slice(0, 8);

  const todaysDeliveries = recentDeliveries.filter((d) => d.date === selectedDate);

  const netProfitEstimate = stats.todaySales - (icePurchaseCost || 0) - totalTodayExpense;

  const expenseByCategory: Record<string, number> = {};
  todaysExpenses.forEach((e) => {
    expenseByCategory[e.categoryTh] = (expenseByCategory[e.categoryTh] || 0) + e.amount;
  });

  const lines: string[] = [];
  lines.push(`วันที่ที่กำลังดู: ${selectedDate}`);
  lines.push('');
  lines.push('== ยอดขายวันนี้ ==');
  lines.push(`- ยอดขายรวม: ${stats.todaySales.toLocaleString()} บาท`);
  lines.push(`- เงินสดสะสม: ${stats.cashAccumulated.toLocaleString()} บาท`);
  lines.push(`- ยอดค้างชำระ (หนี้ใหม่วันนี้): ${stats.debtAmount.toLocaleString()} บาท`);
  lines.push(`- จำนวนบิลวันนี้: ${stats.billCount} บิล`);
  lines.push(`- ผู้ปฏิบัติงานกะนี้: ${stats.shiftWorker}`);
  lines.push('');
  lines.push('== รายรับรวม (สะสมในระบบ) แยกประเภท ==');
  lines.push(`- รายรับรวม: ${summaryData.totalRevenue.toLocaleString()} บาท`);
  lines.push(`- เงินสด: ${summaryData.cashRevenue.toLocaleString()} บาท`);
  lines.push(`- เครดิต/ค้างชำระ: ${summaryData.creditRevenue.toLocaleString()} บาท`);
  lines.push(
    `- จำนวนน้ำแข็งขายได้: ก้อน ${summaryData.cubeCount}, โม่ ${summaryData.crushedCount}, หลอดใหญ่ ${summaryData.largeTubeCount}, หลอดเล็ก ${summaryData.smallTubeCount}`
  );
  lines.push('');
  lines.push('== รายจ่ายวันนี้ ==');
  if (todaysExpenses.length === 0) {
    lines.push('- ไม่มีการบันทึกรายจ่ายวันนี้');
  } else {
    Object.entries(expenseByCategory).forEach(([cat, amt]) => {
      lines.push(`- ${cat}: ${amt.toLocaleString()} บาท`);
    });
  }
  lines.push(`- รวมรายจ่ายวันนี้: ${totalTodayExpense.toLocaleString()} บาท`);
  lines.push(`- ค่าใช้จ่ายประจำเดือนคงที่ (เงินเดือน/ค่าเช่า/ค่าน้ำไฟ ฯลฯ): ${totalMonthlyFixed.toLocaleString()} บาท/เดือน`);
  lines.push(`- ต้นทุนค่าน้ำแข็งที่สั่งซื้อมาวันนี้: ${(icePurchaseCost || 0).toLocaleString()} บาท`);
  lines.push(`- กำไรสุทธิโดยประมาณวันนี้ (รายรับ - ต้นทุนน้ำแข็ง - รายจ่ายวันนี้): ${netProfitEstimate.toLocaleString()} บาท`);
  lines.push('');
  lines.push('== ลูกค้าที่มียอดค้างชำระวันนี้ (สถานะ Debt) ==');
  if (debtCustomers.length === 0) {
    lines.push('- ไม่มีลูกค้าค้างชำระวันนี้');
  } else {
    debtCustomers.forEach((c) => {
      lines.push(`- ${c.name} (${c.route}): ค้าง ${c.totalAmount.toLocaleString()} บาท`);
    });
  }
  lines.push('');
  lines.push('== ลูกค้าที่มียอดหนี้สะสมเดิม (accumulatedDebt) สูงสุด ==');
  if (accumulatedDebtCustomers.length === 0) {
    lines.push('- ไม่มีข้อมูลหนี้สะสมเดิม');
  } else {
    accumulatedDebtCustomers.forEach((c) => {
      lines.push(`- ${c.name} (${c.route}): หนี้สะสมเดิม ${(c.accumulatedDebt || 0).toLocaleString()} บาท`);
    });
  }
  lines.push('');
  lines.push('== รายการส่งน้ำแข็งล่าสุดวันนี้ ==');
  if (todaysDeliveries.length === 0) {
    lines.push('- ยังไม่มีรายการส่งวันนี้ในระบบ');
  } else {
    todaysDeliveries.slice(0, 10).forEach((d) => {
      lines.push(`- ${d.time} ${d.customerName}: ${d.summaryText} รวม ${d.totalAmount.toLocaleString()} บาท (${d.status})`);
    });
  }

  // Completeness signals — lets Snow flag what looks unlogged for the day, not just report numbers
  const routesWithDeliveryToday = new Set(
    todaysDeliveries.map((d) => d.routeName).filter((r): r is string => !!r)
  );
  const routesMissingToday = routes.filter((r) => !routesWithDeliveryToday.has(r.name));

  const todaysTruckRecords = truckRecords.filter((t) => t.date === selectedDate);
  const todaysWarehouseLogs = warehouseLogs.filter((w) => w.date === selectedDate);

  lines.push('');
  lines.push('== ตรวจสอบความครบถ้วนของการลงบัญชีวันนี้ ==');
  lines.push(`- ทั้งหมดมี ${routes.length} สายส่ง: ${routes.map((r) => r.name).join(', ') || '-'}`);
  if (routesMissingToday.length === 0) {
    lines.push('- ทุกสายส่งมีรายการบันทึกไว้แล้ววันนี้');
  } else {
    lines.push(`- สายส่งที่ยังไม่มีรายการบันทึกวันนี้เลย: ${routesMissingToday.map((r) => r.name).join(', ')}`);
  }
  lines.push(
    `- ใบบันทึกขึ้นน้ำแข็งบนรถ/ตรวจนับเหลือกลับวันนี้: ${
      todaysTruckRecords.length === 0 ? 'ยังไม่มีการบันทึกเลย' : `บันทึกแล้ว ${todaysTruckRecords.length} รอบ`
    }`
  );
  lines.push(
    `- บันทึกเข้า-ออกสต็อกโกดังวันนี้: ${
      todaysWarehouseLogs.length === 0 ? 'ยังไม่มีการบันทึกเลย' : `บันทึกแล้ว ${todaysWarehouseLogs.length} รายการ`
    }`
  );

  return lines.join('\n');
}
