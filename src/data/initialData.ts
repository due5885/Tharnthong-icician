import {
  CustomerAccount,
  DeliveryRecord,
  ExpenseCategory,
  ExpenseItem,
  IcePurchaseItemType,
  IcePurchaseRecord,
  IceProduct,
  IceSupplier,
  MonthlyFixedExpense,
  OperationSummaryStats,
  RouteItem,
  SummaryOperationsData,
  TruckStockRecord,
  WarehouseItem,
  WarehouseLog,
} from '../types';

import imgBlock from '../assets/images/ice_block_1784828328137.jpg';
import imgKak from '../assets/images/ice_kak_1784828344568.jpg';
import imgCrushed from '../assets/images/ice_crushed_1784828357234.jpg';
import imgLargeTube from '../assets/images/ice_large_tube_1784828372243.jpg';
import imgSmallTube from '../assets/images/ice_small_tube_1784828387870.jpg';
import imgPack from '../assets/images/ice_pack_1784828400254.jpg';
import imgTubeCrushed from '../assets/images/ice_tube_crushed_1784828415579.jpg';

export const INITIAL_ICE_PRODUCTS: IceProduct[] = [
  { id: 'PROD-1', key: 'cube', labelTh: 'น้ำแข็งก้อน', unit: 'ถุง', icon: 'ice_skating', imageUrl: imgBlock, pricePerUnit: 50, isSystem: true },
  { id: 'PROD-2', key: 'block', labelTh: 'น้ำแข็งกั๊ก', unit: 'ก้อน', icon: 'square', imageUrl: imgKak, pricePerUnit: 40, isSystem: true },
  { id: 'PROD-3', key: 'crushed', labelTh: 'น้ำแข็งโม่', unit: 'ถุง', icon: 'texture', imageUrl: imgCrushed, pricePerUnit: 30, isSystem: true },
  { id: 'PROD-4', key: 'largeTube', labelTh: 'หลอดใหญ่', unit: 'ถุง', icon: 'view_column', imageUrl: imgLargeTube, pricePerUnit: 35, isSystem: true },
  { id: 'PROD-5', key: 'smallTube', labelTh: 'หลอดเล็ก', unit: 'ถุง', icon: 'view_week', imageUrl: imgSmallTube, pricePerUnit: 30, isSystem: true },
  { id: 'PROD-6', key: 'pack', labelTh: 'แพ็ค', unit: 'แพ็ค', icon: 'inventory_2', imageUrl: imgPack, pricePerUnit: 25, isSystem: true },
  { id: 'PROD-7', key: 'tubeCrushed', labelTh: 'หลอดโม่', unit: 'ถุง', icon: 'grain', imageUrl: imgTubeCrushed, pricePerUnit: 30, isSystem: true },
];

export const INITIAL_ROUTES: RouteItem[] = [
  { id: 'ROUTE-1', name: 'สายบางแสน', driverName: 'ปอย', type: 'mobile' },
  { id: 'ROUTE-2', name: 'สายไพรบูรณ์', type: 'mobile' },
];

export const INITIAL_SUMMARY_STATS: OperationSummaryStats = {
  todaySales: 0,
  cashAccumulated: 0,
  debtAmount: 0,
  billCount: 0,
  shiftWorker: 'ปอย',
};

export const INITIAL_OVERALL_SUMMARY: SummaryOperationsData = {
  totalRevenue: 0,
  cashRevenue: 0,
  creditRevenue: 0,
  cubeCount: 0,
  cubeTrend: 'Stable',
  crushedCount: 0,
  crushedTrend: 'Stable',
  largeTubeCount: 0,
  largeTubeTrend: 'Stable',
  smallTubeCount: 0,
  smallTubeTrend: 'Stable',
};

export const INITIAL_MONTHLY_FIXED_EXPENSES: MonthlyFixedExpense[] = [];

export const INITIAL_RECENT_DELIVERIES: DeliveryRecord[] = [];

export const INITIAL_TRUCK_RECORDS: TruckStockRecord[] = [];

// สายบางแสนไม่ได้ผลิตน้ำแข็งเอง — ไปซื้อน้ำแข็งจากผู้ขาย (เช่น ธารทิพย์) มาเพื่อขายต่อให้ลูกค้า
// รายชื่อผู้ขายเป็นรายการที่แก้ไข/เพิ่มได้ เผื่อในอนาคตมีสายอื่นซื้อจากผู้ขายรายอื่นด้วย
// ราคาต่อหน่วย (itemPrices) ล็อคแยกตามผู้ขายแต่ละราย — คนละผู้ขายคนละราคา ตั้งเองในหน้าซื้อน้ำแข็ง
export const INITIAL_ICE_SUPPLIERS: IceSupplier[] = [
  { id: 'SUP-1', name: 'ธารทิพย์', itemPrices: {} },
];

// ชื่อรายการตามบิลซื้อของผู้ขาย (มัด/ใหญ่/จิ๋ว/โม่/ก้อน) — คนละชุดกับชื่อสินค้าที่ขายให้ลูกค้า
// (INITIAL_ICE_PRODUCTS) เพราะหน่วยที่ซื้อจากผู้ขายไม่จำเป็นต้องตรงกับหน่วยที่ขายปลีก
export const INITIAL_ICE_PURCHASE_ITEM_TYPES: IcePurchaseItemType[] = [
  { key: 'mud', labelTh: 'มัด' },
  { key: 'yai', labelTh: 'ใหญ่' },
  { key: 'jio', labelTh: 'จิ๋ว' },
  { key: 'mo', labelTh: 'โม่' },
  { key: 'kon', labelTh: 'ก้อน' },
];

export const INITIAL_ICE_PURCHASES: IcePurchaseRecord[] = [];

// นำเข้าจาก Excel: สายบางแสน.xlsx (39 รายชื่อ จาก 2 หน้าที่มีข้อมูล — ไม่รวมหน้า "งานบอลลูนอมตะนินจา" ซึ่งเป็นงานอีเวนต์แยกต่างหาก)
export const INITIAL_CUSTOMERS: CustomerAccount[] = [
  { id: 'CUST-001', code: 'BSN001', name: 'นายน้ำ', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-002', code: 'BSN002', name: 'บ้านอุดม', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-003', code: 'BSN003', name: 'กาแฟตาจวน', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-004', code: 'BSN004', name: 'เตี๋ยวเรือแสนแสบ', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-005', code: 'BSN005', name: 'ป้าแจ๋ว', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-006', code: 'BSN006', name: 'เจ๊พิณ', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-007', code: 'BSN007', name: 'โกปิ๊ กาแฟ', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-008', code: 'BSN008', name: 'กาแฟเจ๊ปลูก', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-009', code: 'BSN009', name: 'กล้วยทอด', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-010', code: 'BSN010', name: 'ผลไม้', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-011', code: 'BSN011', name: 'ฮ้อยจ้อปูเจ้า', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-012', code: 'BSN012', name: 'น้อง นัน', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-013', code: 'BSN013', name: 'ยายทอง', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-014', code: 'BSN014', name: 'ร้านชำ ครกหิน', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-015', code: 'BSN015', name: 'ชายทะเล', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-016', code: 'BSN016', name: 'เพิ่มทรัพย์ ของชำ', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-017', code: 'BSN017', name: 'เจ๊นุช มิตรสัมพันธ์', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-018', code: 'BSN018', name: 'อพาร์ทเมนท์เกินบุญ', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-019', code: 'BSN019', name: 'ป้าอ้วน ร้านของชำ', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-020', code: 'BSN020', name: 'เฮียซู', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-021', code: 'BSN021', name: 'เจ๊ ณี', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-022', code: 'BSN022', name: 'หอพักแจ๋ว', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-023', code: 'BSN023', name: 'ร้านอาหารทองดี', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-024', code: 'BSN024', name: 'แสนสบาย', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-025', code: 'BSN025', name: 'เจ๊ เจี๊ยบ', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-026', code: 'BSN026', name: 'ต้นโพธิ ร้านชพ', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-027', code: 'BSN027', name: 'น้องจี', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-028', code: 'BSN028', name: 'ครัวคุณอร ตามสั่ง', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-029', code: 'BSN029', name: 'อ้อมใจ ตามสั่ง', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-030', code: 'BSN030', name: 'ป้ามน', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-031', code: 'BSN031', name: 'ติดร้านขนมเค้ก', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-032', code: 'BSN032', name: 'Somecream', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-033', code: 'BSN033', name: 'ร้านไก่ย่าง', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-034', code: 'BSN034', name: 'ข้าวแกงปักษ์ใต้', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-035', code: 'BSN035', name: 'ครัวแสนสุข', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-036', code: 'BSN036', name: 'ร้านอัญชลี', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-037', code: 'BSN037', name: 'ร้านมาร์ท', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-038', code: 'BSN038', name: 'ชาชีส ชาใต้', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-039', code: 'BSN039', name: 'กาแฟร้านใหม่', route: 'สายบางแสน', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },

  // นำเข้าจาก Excel: สายไพรบูรณ์.xlsx (86 รายชื่อ รวมจากชีท "ใบงานจริง")
  { id: 'CUST-040', code: 'PB001', name: 'โกปิฮับ', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-041', code: 'PB002', name: 'เอมอันดา', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-042', code: 'PB003', name: 'ครัวกลาง', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-043', code: 'PB004', name: 'ร้านขายของชำแยกคีรี', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-044', code: 'PB005', name: 'ร้าน นำฮวด', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-045', code: 'PB006', name: 'ร้าน HOP', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-046', code: 'PB007', name: 'ร้านต้มเลือดหมู', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-047', code: 'PB008', name: 'ร้านขายของชำถังแก๊ส', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-048', code: 'PB009', name: 'ร้าน เจเจ', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-049', code: 'PB010', name: 'ร้านของชำป้าอู๊ด', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-050', code: 'PB011', name: 'ร้านของชำพิษณุโลก', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-051', code: 'PB012', name: 'ร้านของชำป้าแอ๋ว', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-052', code: 'PB013', name: 'ร้านของชำขายแก๊ส', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-053', code: 'PB014', name: 'ร้านหมูปิ้ง', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-054', code: 'PB015', name: 'ร้านหน้าตึกคอม', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-055', code: 'PB016', name: 'ร้านหน้าโรงบาล', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-056', code: 'PB017', name: 'ร้านอู่ซ่อมรถ', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-057', code: 'PB018', name: 'ร้านสระว่ายน้ำ', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-058', code: 'PB019', name: 'ร้านป้าอร', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-059', code: 'PB020', name: 'ร้านของชำในซอย', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-060', code: 'PB021', name: 'ชานม', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-061', code: 'PB022', name: 'ร้านหมูสะเต๊ะ', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-062', code: 'PB023', name: 'ร้านโต้เกาเหา', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-063', code: 'PB024', name: 'ร้าน้ำมะพร้าว', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-064', code: 'PB025', name: 'หน้าประปา', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-065', code: 'PB026', name: 'ร้านผัดไทย', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-066', code: 'PB027', name: 'ร้านข้างเทศบาล', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-067', code: 'PB028', name: 'ร้านอุดมฟาร์มาซี', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-068', code: 'PB029', name: 'ร้านกาแฟโบราณ', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-069', code: 'PB030', name: 'ร้านหนึ่ง', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-070', code: 'PB031', name: 'ร้านส้มตำยายโส', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-071', code: 'PB032', name: 'ร้านส้มตำยายจันทร์', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-072', code: 'PB033', name: 'ร้าน ณ โอเลี้ยง', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-073', code: 'PB034', name: 'ร้านขายน้ำปั่น', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-074', code: 'PB035', name: 'ร้านราเมง', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-075', code: 'PB036', name: 'เรือนจำหญิง', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-076', code: 'PB037', name: 'กาแฟเรือนจำ', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-077', code: 'PB038', name: 'ร้านขาหมู', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-078', code: 'PB039', name: 'ร้านใบตอง', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-079', code: 'PB040', name: 'ร้านครัวคุณหญิง', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-080', code: 'PB041', name: 'ร้านครัวยายชื่น', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-081', code: 'PB042', name: 'ร้านตรงข้ามดับเพลิง', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-082', code: 'PB043', name: 'ร้านของชำดับเพลิง', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-083', code: 'PB044', name: 'ร้านชานม', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-084', code: 'PB045', name: 'ซอยมุกหอม', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-085', code: 'PB046', name: 'ร้านหอพักบุญสิริ', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-086', code: 'PB047', name: 'ส้มตำ', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-087', code: 'PB048', name: 'ร้านลูกแหลม', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-088', code: 'PB049', name: 'ร้านอู่อิ๋ว', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-089', code: 'PB050', name: 'ร้านนันดา', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-090', code: 'PB051', name: 'ร้านทศพล', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-091', code: 'PB052', name: 'ร้านลาบเป็ด', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-092', code: 'PB053', name: 'ร้านอาแป๊ะ', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-093', code: 'PB054', name: 'ร้านเจ้หนิง', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-094', code: 'PB055', name: 'ร้านชำสุขใจ', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-095', code: 'PB056', name: 'ร้านชาบู', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-096', code: 'PB057', name: 'ร้านก๋วยเตี๋ยว ร.5', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-097', code: 'PB058', name: 'ร้านกาแฟอินทนิล', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-098', code: 'PB059', name: 'โรงแรมชคสะอาด', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-099', code: 'PB060', name: 'ตามสั่งเจ้กุ้ง', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-100', code: 'PB061', name: 'หลังโรงแรม', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-101', code: 'PB062', name: 'ร้านเจ้บัว', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-102', code: 'PB063', name: 'ร้านชานมไข่มุก', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-103', code: 'PB064', name: 'ร้านกาแฟพี่จิ๋ว', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-104', code: 'PB065', name: 'ร้านพี่กล้าม', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-105', code: 'PB066', name: 'ร้านชำติดมอไชต์', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-106', code: 'PB067', name: 'ร้านหน้าวัดน้อย', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-107', code: 'PB068', name: 'ร้านข้าวมันไก่', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-108', code: 'PB069', name: 'ร้านข้าวหมูแดง', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-109', code: 'PB070', name: 'ร้านก๋วยเตี๋ยว', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-110', code: 'PB071', name: 'ร้านวัดช่องลม', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-111', code: 'PB072', name: 'ร้านตามสั่งเจ้แอน', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-112', code: 'PB073', name: 'ร้านบะหมี่เกี๊ยว', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-113', code: 'PB074', name: 'ร้านลุงอ้วน', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-114', code: 'PB075', name: 'หอสี', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-115', code: 'PB076', name: 'ร้านกอไผ่', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-116', code: 'PB077', name: 'ร้านพี่วัน', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-117', code: 'PB078', name: 'หน้าโรงไก่', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-118', code: 'PB079', name: 'ร้านข้าวต้มปลา', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-119', code: 'PB080', name: 'ร้านหมูสะเต๊ะ', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-120', code: 'PB081', name: 'คอนโด', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-121', code: 'PB082', name: 'ร้านมินิมาร์ท', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-122', code: 'PB083', name: 'เย็นตาโฟ', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-123', code: 'PB084', name: 'ร้านเค้ก', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-124', code: 'PB085', name: 'ร้านทวีชัย', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
  { id: 'CUST-125', code: 'PB086', name: 'ALL TEA HOUSE', route: 'สายไพรบูรณ์', quantities: {}, extraAmount: 0, totalAmount: 0, status: 'Cash' },
];

export const INITIAL_EXPENSES: ExpenseItem[] = [];

// Curated icon set (Material Symbols names) covering common ice-shop expense types —
// fuel/transport, wages, electricity/water, maintenance, packaging, plus a few extras
// (rent, phone/internet, vehicle wash, food/meals, tax, misc) for the icon picker.
export const EXPENSE_ICON_CHOICES: string[] = [
  'local_gas_station',
  'badge',
  'bolt',
  'water_drop',
  'build',
  'package_2',
  'ac_unit',
  'home_work',
  'call',
  'wifi',
  'local_car_wash',
  'receipt_long',
  'restaurant',
  'cleaning_services',
  'shield',
  'settings',
  'local_shipping',
  'payments',
];

export const INITIAL_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'ECAT-1', key: 'Fuel', labelTh: 'ค่าน้ำมัน', icon: 'local_gas_station' },
  { id: 'ECAT-2', key: 'Wages', labelTh: 'ค่าแรง', icon: 'badge' },
  { id: 'ECAT-3', key: 'Utilities', labelTh: 'ค่าน้ำ-ค่าไฟ', icon: 'bolt' },
  { id: 'ECAT-4', key: 'Maintenance', labelTh: 'ซ่อมบำรุง', icon: 'build' },
  { id: 'ECAT-5', key: 'Packaging', labelTh: 'บรรจุภัณฑ์', icon: 'package_2' },
  { id: 'ECAT-6', key: 'Other', labelTh: 'อื่นๆ', icon: 'payments' },
];

export const INITIAL_WAREHOUSE_ITEMS: WarehouseItem[] = [];

export const INITIAL_WAREHOUSE_LOGS: WarehouseLog[] = [];
