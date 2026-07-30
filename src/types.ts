export type TabType =
  | 'operations'
  | 'customers'
  | 'customerDetails'
  | 'creditCustomers'
  | 'warehouse'
  | 'summary'
  | 'expenses'
  | 'icePurchase'
  | 'assistant'
  | 'reconciliation'
  | 'attendance'
  | 'vehicles';

export interface IceSupplier {
  id: string;
  name: string;
  // ราคาต่อหน่วยล็อคแยกตามผู้ขายแต่ละราย (คนละผู้ขาย คนละราคา) — key ตรงกับ IcePurchaseItemType.key
  itemPrices: Record<string, number>;
}

export interface IcePurchaseItemType {
  key: string;
  labelTh: string;
}

export interface IcePurchaseItemEntry {
  name: string;
  quantity: number;
  amount: number;
}

export interface IcePurchaseRecord {
  id: string;
  date: string;
  time: string;
  supplierId: string;
  supplierName: string;
  items: IcePurchaseItemEntry[];
  totalAmount: number;
  paymentType: 'Cash' | 'Debt';
  note?: string;
}

export type AssistantPersonaId = 'snow';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  date: string; // YYYY-MM-DD, the day this was actually sent (for daily activity logs)
  askedBy?: string; // admin name who sent this (role === 'user' messages only)
}

export interface Employee {
  id: string;
  name: string;
  phone?: string;
  note?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  note?: string;
}

export interface EmployeeLoan {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  amount: number;
  note?: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  note?: string;
}

export interface VehicleLogEntry {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  date: string;
  type: 'fuel' | 'repair';
  amount: number;
  description: string;
  attachmentDataUrl?: string;
  attachmentName?: string;
}

export type PaymentStatus = 'Cash' | 'Debt' | 'Credit' | 'OldPayment' | 'NewAndOld';

export type PaymentStatusLabels = Record<PaymentStatus, string>;

export type CreditTermDays = 5 | 7 | 10 | 15 | 'monthly';

export interface PaymentStatusDetails {
  status: PaymentStatus;
  newAmountPaid?: number;
  oldDebtPaid?: number;
}

export interface IceProduct {
  id: string;
  key: string;
  labelTh: string;
  unit: string;
  icon: string;
  imageUrl?: string;
  pricePerUnit: number;
  isSystem?: boolean;
}

export type IceQuantity = Record<string, number>;

export interface DeliveryRecord {
  id: string;
  time: string;
  customerId?: string;
  customerName: string;
  summaryText: string;
  totalAmount: number;
  status: PaymentStatus;
  statusDetails?: PaymentStatusDetails;
  date: string;
  routeId?: string;
  routeName?: string;
  timeRound?: string;
  paymentMethod?: 'Cash' | 'Transfer';
  note?: string;
}

export interface IceBucketHolding {
  id: string;
  bucketSize: string;
  count: number;
  note?: string;
}

export interface CustomerAccount {
  id: string;
  code: string;
  name: string;
  phone?: string;
  route: string;
  quantities: IceQuantity;
  extraAmount: number; // เศษเงิน
  totalAmount: number;
  status: PaymentStatus;
  statusDetails?: PaymentStatusDetails;
  lastUpdated?: string;
  customPrices?: Partial<Record<string, number>>;
  accumulatedDebt?: number; // ยอดค้างชำระสะสมเดิม
  creditTermDays?: CreditTermDays; // เงื่อนไขวันครบกำหนดชำระสำหรับลูกค้าเครดิต
  creditPaid?: number; // ยอดที่ลูกค้าเครดิตจ่ายมาแบบยอดกลมๆ ไม่ตรงงวด (หักออกจากยอดบิลเครดิตรวม)
  creditSettledPeriods?: string[]; // งวดเครดิตที่ตัดจ่ายเต็มจำนวนแล้ว เก็บเป็น "startISO_endISO"
  iceBuckets?: IceBucketHolding[]; // ถังน้ำแข็งประจำร้าน
  paymentHistory?: {
    id: string;
    date: string;
    amountPaid: number;
    debtRemaining: number;
    type: 'DAILY_BILL' | 'DEBT_SETTLEMENT' | 'CREDIT_SETTLEMENT';
    method?: 'Cash' | 'Transfer' | 'OldDebt';
    note?: string;
  }[];
}

/**
 * One customer's ledger row for ONE specific day. The master CustomerAccount holds the
 * things that don't change day to day (name, route, custom prices, ice buckets, debts);
 * everything that IS per-day lives here, keyed by date, so re-opening an earlier date
 * shows exactly what was entered then instead of the latest day's numbers.
 */
export interface DailyCustomerEntry {
  quantities: IceQuantity;
  extraAmount: number;
  totalAmount: number;
  status: PaymentStatus;
  statusDetails?: PaymentStatusDetails;
  /** Set when the payment status was confirmed — drives the "บันทึกแล้ว" badge. */
  recordedAt?: string;
}

/** date (YYYY-MM-DD) -> customerId -> that day's ledger row */
export type DailyLedger = Record<string, Record<string, DailyCustomerEntry>>;

export interface WarehouseItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minThreshold: number;
  lastUpdated: string;
}

export interface WarehouseLog {
  id: string;
  timestamp: string;
  date: string;
  itemId: string;
  itemName: string;
  type: 'IN' | 'OUT' | 'ADJUST';
  quantity: number;
  operatorName: string; // ใครนำเข้า-ออก
  notes?: string;
}

export type RouteType = 'storefront' | 'mobile' | 'subline';

export interface RouteItem {
  id: string;
  name: string;
  driverName?: string;
  order?: number;
  type?: RouteType;
}

export interface TruckStockRecord {
  id: string;
  date: string;
  shift: string;
  timeRound?: string;
  routeId: string;
  routeName: string;
  driverName: string;
  vehicleType?: string;
  licensePlate?: string;
  loadedQuantities: IceQuantity;
  returnedQuantities: IceQuantity;
  cashCollected?: number;
  updatedAt: string;
}

export type RoleLevel = 'owner' | 'accountant' | 'staff';

export interface AdminUser {
  id: string;
  name: string;
  role: string;
  roleLevel: RoleLevel;
  pin: string;
}

export interface ExpenseItem {
  id: string;
  time: string;
  route?: string;
  category: string; // references ExpenseCategory.key
  categoryTh: string;
  icon: string;
  description: string;
  amount: number;
  status: 'Cash' | 'Debt';
  date: string;
}

export interface ExpenseCategory {
  id: string;
  key: string;
  labelTh: string;
  icon: string;
}

export interface MonthlyFixedExpense {
  id: string;
  month: string; // YYYY-MM format
  name: string;
  amount: number;
}

export interface OperationSummaryStats {
  todaySales: number;
  cashAccumulated: number;
  debtAmount: number;
  billCount: number;
  shiftWorker: string;
}

export interface SummaryOperationsData {
  totalRevenue: number;
  cashRevenue: number;
  creditRevenue: number;
  cubeCount: number;
  cubeTrend: string;
  crushedCount: number;
  crushedTrend: string;
  largeTubeCount: number;
  largeTubeTrend: string;
  smallTubeCount: number;
  smallTubeTrend: string;
}
