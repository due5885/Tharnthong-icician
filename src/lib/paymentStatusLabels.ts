import { PaymentStatus, PaymentStatusLabels } from '../types';

export const DEFAULT_PAYMENT_STATUS_LABELS: PaymentStatusLabels = {
  Cash: 'เงินสด',
  Debt: 'ค้างชำระ',
  Credit: 'เครดิต',
  OldPayment: 'จ่ายหนี้เก่า',
  NewAndOld: 'จ่ายใหม่รวมเก่า',
};

export const PAYMENT_STATUS_ORDER: PaymentStatus[] = [
  'Cash',
  'Debt',
  'Credit',
  'OldPayment',
  'NewAndOld',
];

export const PAYMENT_STATUS_DESCRIPTIONS: PaymentStatusLabels = {
  Cash: 'จ่ายครบวันนี้',
  Debt: 'ยังไม่จ่ายเลย',
  Credit: 'มีกำหนดวันชำระ',
  OldPayment: 'เคลียร์ยอดค้างเก่า',
  NewAndOld: 'จ่ายทั้งวันนี้+เก่าพร้อมกัน',
};
