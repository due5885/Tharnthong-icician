import { useEffect, useState } from 'react';
import {
  AdminUser,
  AttendanceRecord,
  CustomerAccount,
  DeliveryRecord,
  Employee,
  ExpenseCategory,
  ExpenseItem,
  IceProduct,
  IcePurchaseItemType,
  IcePurchaseRecord,
  IceQuantity,
  IceSupplier,
  EmployeeLoan,
  MonthlyFixedExpense,
  OperationSummaryStats,
  PaymentStatus,
  PaymentStatusDetails,
  PaymentStatusLabels,
  RoleLevel,
  RouteItem,
  SummaryOperationsData,
  TabType,
  TruckStockRecord,
  Vehicle,
  VehicleLogEntry,
  WarehouseItem,
  WarehouseLog,
} from './types';
import {
  INITIAL_ICE_PURCHASE_ITEM_TYPES,
  INITIAL_CUSTOMERS,
  INITIAL_EXPENSE_CATEGORIES,
  INITIAL_EXPENSES,
  INITIAL_ICE_PRODUCTS,
  INITIAL_ICE_PURCHASES,
  INITIAL_ICE_SUPPLIERS,
  INITIAL_MONTHLY_FIXED_EXPENSES,
  INITIAL_OVERALL_SUMMARY,
  INITIAL_RECENT_DELIVERIES,
  INITIAL_ROUTES,
  INITIAL_SUMMARY_STATS,
  INITIAL_TRUCK_RECORDS,
  INITIAL_WAREHOUSE_ITEMS,
  INITIAL_WAREHOUSE_LOGS,
} from './data/initialData';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { OperationsView } from './components/OperationsView';
import { CustomersView } from './components/CustomersView';
import { CustomerDetailsView } from './components/CustomerDetailsView';
import { CreditCustomersView } from './components/CreditCustomersView';
import { PaymentStatusLabelsModal } from './components/PaymentStatusLabelsModal';
import { WarehouseView } from './components/WarehouseView';
import { SummaryView } from './components/SummaryView';
import { ExpensesView } from './components/ExpensesView';
import { IcePurchaseView } from './components/IcePurchaseView';
import { AddExpenseModal } from './components/AddExpenseModal';
import { ExpenseCategoryManagerModal } from './components/ExpenseCategoryManagerModal';
import { AddCustomerModal } from './components/AddCustomerModal';
import { ManageAdminsModal } from './components/ManageAdminsModal';
import { BackupModal } from './components/BackupModal';
import { CustomerPriceModal } from './components/CustomerPriceModal';
import { ProductManagerModal } from './components/ProductManagerModal';
import { RouteManagerModal } from './components/RouteManagerModal';
import { NewAndOldPaymentModal } from './components/NewAndOldPaymentModal';
import { LoginView } from './components/LoginView';
import { Toast } from './components/Toast';
import { AIAssistantView } from './components/AIAssistantView';
import { CashReconciliationView } from './components/CashReconciliationView';
import { EmployeeManagerModal } from './components/EmployeeManagerModal';
import { AttendanceView } from './components/AttendanceView';
import { VehicleManagerModal } from './components/VehicleManagerModal';
import { VehicleLogView } from './components/VehicleLogView';
import { buildBusinessContext } from './lib/assistantContext';
import { canAccessTab } from './lib/permissions';
import { DEFAULT_PAYMENT_STATUS_LABELS } from './lib/paymentStatusLabels';
import { useFirestoreSyncedState } from './lib/useFirestoreSyncedState';

const INITIAL_ADMINS: AdminUser[] = [
  { id: 'ADMIN-1', name: 'Owner', role: 'เจ้าของร้าน', roleLevel: 'owner', pin: '166868' },
  { id: 'ADMIN-2', name: 'ปอย (แผนกบัญชี)', role: 'ฝ่ายบัญชี', roleLevel: 'accountant', pin: '123456' },
];

const SESSION_KEY = 'tharnthong_session_admin_id';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('operations');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  const [currentShift, setCurrentShift] = useState<string>('Shift A');

  // Selected Date state (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Ice Products State
  const [products, setProducts] = useState<IceProduct[]>(() => {
    const saved = localStorage.getItem('tharnthong_ice_products');
    if (!saved) return INITIAL_ICE_PRODUCTS;
    try {
      const parsed: IceProduct[] = JSON.parse(saved);
      return parsed.map((p) => {
        const initial = INITIAL_ICE_PRODUCTS.find(
          (init) => init.id === p.id || init.key === p.key || init.labelTh === p.labelTh
        );
        return {
          ...p,
          imageUrl: p.imageUrl || initial?.imageUrl,
        };
      });
    } catch {
      return INITIAL_ICE_PRODUCTS;
    }
  });

  // Delivery Routes State
  const [routes, setRoutes] = useState<RouteItem[]>(() => {
    const saved = localStorage.getItem('tharnthong_routes');
    return saved ? JSON.parse(saved) : INITIAL_ROUTES;
  });

  // Fixed Monthly Operating Expenses State
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyFixedExpense[]>(() => {
    const saved = localStorage.getItem('tharnthong_monthly_expenses');
    return saved ? JSON.parse(saved) : INITIAL_MONTHLY_FIXED_EXPENSES;
  });

  // Truck Stock Loading & Return Records State
  const [truckRecords, setTruckRecords] = useState<TruckStockRecord[]>(() => {
    const saved = localStorage.getItem('tharnthong_truck_records');
    return saved ? JSON.parse(saved) : INITIAL_TRUCK_RECORDS;
  });

  // Ice Suppliers (สายบางแสนซื้อน้ำแข็งมาขายต่อ ไม่ได้ผลิตเอง) & itemized daily purchase records
  const [iceSuppliers, setIceSuppliers] = useState<IceSupplier[]>(() => {
    const saved = localStorage.getItem('tharnthong_ice_suppliers');
    if (!saved) return INITIAL_ICE_SUPPLIERS;
    try {
      const parsed: IceSupplier[] = JSON.parse(saved);
      // Migration guard: suppliers saved before itemPrices existed won't have the field.
      return parsed.map((s) => ({ ...s, itemPrices: s.itemPrices || {} }));
    } catch {
      return INITIAL_ICE_SUPPLIERS;
    }
  });
  const [icePurchases, setIcePurchases] = useState<IcePurchaseRecord[]>(() => {
    const saved = localStorage.getItem('tharnthong_ice_purchases');
    return saved ? JSON.parse(saved) : INITIAL_ICE_PURCHASES;
  });
  const [icePurchaseItemTypes, setIcePurchaseItemTypes] = useState<IcePurchaseItemType[]>(() => {
    const saved = localStorage.getItem('tharnthong_ice_purchase_item_types');
    return saved ? JSON.parse(saved) : INITIAL_ICE_PURCHASE_ITEM_TYPES;
  });

  // Admin Management state (persisted)
  const [admins, setAdmins] = useState<AdminUser[]>(() => {
    const saved = localStorage.getItem('tharnthong_admins');
    return saved ? JSON.parse(saved) : INITIAL_ADMINS;
  });

  // One-time migration: browsers that already had the old single-admin (ปอย only) list saved
  // before the Owner/แผนกบัญชี split won't pick up INITIAL_ADMINS on their own, since saved
  // state takes precedence. Force the new list in once per browser, then never touch it again
  // so any admins added later through the UI aren't wiped out.
  useEffect(() => {
    const MIGRATION_KEY = 'tharnthong_admins_migration_owner_v2';
    if (!localStorage.getItem(MIGRATION_KEY)) {
      setAdmins(INITIAL_ADMINS);
      localStorage.setItem(MIGRATION_KEY, 'done');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Login session (sessionStorage only — closing the tab/browser requires a fresh login)
  const [activeAdminId, setActiveAdminId] = useState<string | null>(() => {
    return sessionStorage.getItem(SESSION_KEY);
  });

  // App State with localStorage persistence
  const [stats, setStats] = useState<OperationSummaryStats>(() => {
    const saved = localStorage.getItem('tharnthong_stats');
    return saved ? JSON.parse(saved) : INITIAL_SUMMARY_STATS;
  });

  const [summaryData, setSummaryData] = useState<SummaryOperationsData>(() => {
    const saved = localStorage.getItem('tharnthong_summary');
    return saved ? JSON.parse(saved) : INITIAL_OVERALL_SUMMARY;
  });

  // Synced to Firestore (cross-device) with localStorage as a local cache/fallback.
  const [recentDeliveries, setRecentDeliveries] = useFirestoreSyncedState<DeliveryRecord[]>(
    'app_data/deliveries',
    'tharnthong_deliveries',
    INITIAL_RECENT_DELIVERIES
  );

  const [customers, setCustomers] = useFirestoreSyncedState<CustomerAccount[]>(
    'app_data/customers',
    'tharnthong_customers',
    INITIAL_CUSTOMERS
  );

  // Ongoing merge (safe to run every load): browsers that already had routes/customers saved
  // before a new route was added in code (e.g. สายไพรบูรณ์) won't pick up the addition on their
  // own, since saved state takes precedence over INITIAL_*. This only adds what's missing by id
  // — it never touches or removes anything already saved.
  useEffect(() => {
    setRoutes((prev) => {
      const existingIds = new Set(prev.map((r) => r.id));
      const missing = INITIAL_ROUTES.filter((r) => !existingIds.has(r.id));
      return missing.length ? [...prev, ...missing] : prev;
    });
    setCustomers((prev) => {
      const existingIds = new Set(prev.map((c) => c.id));
      const missing = INITIAL_CUSTOMERS.filter((c) => !existingIds.has(c.id));
      return missing.length ? [...prev, ...missing] : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => {
    const saved = localStorage.getItem('tharnthong_expenses');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(() => {
    const saved = localStorage.getItem('tharnthong_expense_categories');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSE_CATEGORIES;
  });

  // Payment Status Labels (editable by owner/accountant)
  const [statusLabels, setStatusLabels] = useState<PaymentStatusLabels>(() => {
    const saved = localStorage.getItem('tharnthong_status_labels');
    return saved ? { ...DEFAULT_PAYMENT_STATUS_LABELS, ...JSON.parse(saved) } : DEFAULT_PAYMENT_STATUS_LABELS;
  });

  // Warehouse Items & Logs State
  const [warehouseItems, setWarehouseItems] = useState(() => {
    const saved = localStorage.getItem('tharnthong_warehouse_items');
    if (!saved) return INITIAL_WAREHOUSE_ITEMS;
    try {
      const parsed: WarehouseItem[] = JSON.parse(saved);
      return parsed.filter(
        (i) => i.category !== 'น้ำแข็งสำเร็จรูป/ห้องเย็น' && i.category !== 'ถุง/บรรจุภัณฑ์'
      );
    } catch {
      return INITIAL_WAREHOUSE_ITEMS;
    }
  });

  const [warehouseLogs, setWarehouseLogs] = useState(() => {
    const saved = localStorage.getItem('tharnthong_warehouse_logs');
    return saved ? JSON.parse(saved) : INITIAL_WAREHOUSE_LOGS;
  });

  // Employee Master List State
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('tharnthong_employees');
    return saved ? JSON.parse(saved) : [];
  });

  // Attendance Records State
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('tharnthong_attendance');
    return saved ? JSON.parse(saved) : [];
  });

  // Employee Loans (ยืมเงิน) State
  const [employeeLoans, setEmployeeLoans] = useState<EmployeeLoan[]>(() => {
    const saved = localStorage.getItem('tharnthong_employee_loans');
    return saved ? JSON.parse(saved) : [];
  });

  // Vehicle Master List State
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem('tharnthong_vehicles');
    return saved ? JSON.parse(saved) : [];
  });

  // Vehicle Fuel/Repair Log State
  const [vehicleLogEntries, setVehicleLogEntries] = useState<VehicleLogEntry[]>(() => {
    const saved = localStorage.getItem('tharnthong_vehicle_logs');
    return saved ? JSON.parse(saved) : [];
  });

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isExpenseCategoryManagerOpen, setIsExpenseCategoryManagerOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isManageAdminsOpen, setIsManageAdminsOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isProductManagerOpen, setIsProductManagerOpen] = useState(false);
  const [isRouteManagerOpen, setIsRouteManagerOpen] = useState(false);
  const [isEmployeeManagerOpen, setIsEmployeeManagerOpen] = useState(false);
  const [isVehicleManagerOpen, setIsVehicleManagerOpen] = useState(false);
  const [isStatusLabelsModalOpen, setIsStatusLabelsModalOpen] = useState(false);
  const [customerForPriceModal, setCustomerForPriceModal] = useState<CustomerAccount | null>(null);
  const [newAndOldModalCustomer, setNewAndOldModalCustomer] = useState<CustomerAccount | null>(null);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Currently logged-in admin (null when no valid session — gates the whole app)
  const activeAdminObj = admins.find((a) => a.id === activeAdminId) || null;
  const activeAdminName = activeAdminObj?.name || '';

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('tharnthong_ice_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('tharnthong_routes', JSON.stringify(routes));
  }, [routes]);

  useEffect(() => {
    localStorage.setItem('tharnthong_monthly_expenses', JSON.stringify(monthlyExpenses));
  }, [monthlyExpenses]);

  useEffect(() => {
    localStorage.setItem('tharnthong_truck_records', JSON.stringify(truckRecords));
  }, [truckRecords]);

  useEffect(() => {
    localStorage.setItem('tharnthong_ice_suppliers', JSON.stringify(iceSuppliers));
  }, [iceSuppliers]);

  useEffect(() => {
    localStorage.setItem('tharnthong_ice_purchases', JSON.stringify(icePurchases));
  }, [icePurchases]);

  useEffect(() => {
    localStorage.setItem('tharnthong_ice_purchase_item_types', JSON.stringify(icePurchaseItemTypes));
  }, [icePurchaseItemTypes]);

  useEffect(() => {
    localStorage.setItem('tharnthong_admins', JSON.stringify(admins));
  }, [admins]);

  useEffect(() => {
    localStorage.setItem('tharnthong_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('tharnthong_summary', JSON.stringify(summaryData));
  }, [summaryData]);

  // recentDeliveries and customers persist via useFirestoreSyncedState above (localStorage + Firestore).

  useEffect(() => {
    localStorage.setItem('tharnthong_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('tharnthong_expense_categories', JSON.stringify(expenseCategories));
  }, [expenseCategories]);

  useEffect(() => {
    localStorage.setItem('tharnthong_status_labels', JSON.stringify(statusLabels));
  }, [statusLabels]);

  useEffect(() => {
    localStorage.setItem('tharnthong_warehouse_items', JSON.stringify(warehouseItems));
  }, [warehouseItems]);

  useEffect(() => {
    localStorage.setItem('tharnthong_warehouse_logs', JSON.stringify(warehouseLogs));
  }, [warehouseLogs]);

  useEffect(() => {
    localStorage.setItem('tharnthong_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('tharnthong_attendance', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem('tharnthong_employee_loans', JSON.stringify(employeeLoans));
  }, [employeeLoans]);

  useEffect(() => {
    localStorage.setItem('tharnthong_vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem('tharnthong_vehicle_logs', JSON.stringify(vehicleLogEntries));
  }, [vehicleLogEntries]);

  // Reset to a permitted tab if the logged-in admin's role can no longer see the active one
  useEffect(() => {
    if (activeAdminObj && !canAccessTab(activeAdminObj.roleLevel, activeTab)) {
      setActiveTab('operations');
    }
  }, [activeAdminObj, activeTab]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  // Product Manager Handlers
  const handleAddProduct = (prod: Omit<IceProduct, 'id'>) => {
    const newProd: IceProduct = {
      ...prod,
      id: `PROD-${Date.now().toString().slice(-4)}`,
    };
    setProducts((prev) => [...prev, newProd]);
  };

  const handleUpdateProduct = (id: string, updated: Partial<IceProduct>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updated } : p))
    );
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // Warehouse Handlers
  const handleAddWarehouseItem = (item: Omit<WarehouseItem, 'id' | 'lastUpdated'>) => {
    const newItem: WarehouseItem = {
      ...item,
      id: `WH-${Date.now().toString().slice(-4)}`,
      lastUpdated: new Date().toLocaleString('sv-SE').substring(0, 16).replace('T', ' '),
    };
    setWarehouseItems((prev: WarehouseItem[]) => [...prev, newItem]);
  };

  const handleUpdateWarehouseItem = (id: string, updated: Partial<WarehouseItem>) => {
    setWarehouseItems((prev: WarehouseItem[]) =>
      prev.map((i) => (i.id === id ? { ...i, ...updated } : i))
    );
  };

  const handleDeleteWarehouseItem = (id: string) => {
    setWarehouseItems((prev: WarehouseItem[]) => prev.filter((i) => i.id !== id));
  };

  const handleAddWarehouseLog = (log: Omit<WarehouseLog, 'id' | 'timestamp'>) => {
    const newLog: WarehouseLog = {
      ...log,
      id: `WLOG-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleString('sv-SE').substring(0, 16).replace('T', ' '),
    };
    setWarehouseLogs((prev: WarehouseLog[]) => [newLog, ...prev]);
  };
  const handleAddRoute = (route: Omit<RouteItem, 'id'>) => {
    const newRoute: RouteItem = {
      ...route,
      id: `ROUTE-${Date.now().toString().slice(-4)}`,
    };
    setRoutes((prev) => [...prev, newRoute]);
  };

  const handleUpdateRoute = (id: string, updated: Partial<RouteItem>) => {
    setRoutes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updated } : r))
    );
  };

  const handleDeleteRoute = (id: string) => {
    setRoutes((prev) => prev.filter((r) => r.id !== id));
  };

  const handleMoveRoute = (index: number, direction: 'up' | 'down') => {
    setRoutes((prev) => {
      const next = [...prev];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  // Monthly Fixed Expense Handlers
  const handleAddMonthlyExpense = (month: string, name: string, amount: number) => {
    const newExpense: MonthlyFixedExpense = {
      id: `MEXP-${Date.now().toString().slice(-4)}`,
      month,
      name,
      amount,
    };
    setMonthlyExpenses((prev) => [...prev, newExpense]);
  };

  const handleUpdateMonthlyExpense = (id: string, name: string, amount: number) => {
    setMonthlyExpenses((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, name, amount } : exp))
    );
  };

  const handleDeleteMonthlyExpense = (id: string) => {
    setMonthlyExpenses((prev) => prev.filter((exp) => exp.id !== id));
    showToast('ลบรายการค่าใช้จ่ายดำเนินงานเรียบร้อยแล้ว');
  };

  // Truck Stock Record Handlers
  const handleSaveTruckRecord = (
    recData: Omit<TruckStockRecord, 'id' | 'updatedAt'>
  ) => {
    const newRec: TruckStockRecord = {
      ...recData,
      id: `TRUCK-${Date.now().toString().slice(-4)}`,
      updatedAt: new Date().toISOString(),
    };
    setTruckRecords((prev) => [newRec, ...prev]);
  };

  const handleUpdateTruckRecord = (id: string, updated: Partial<TruckStockRecord>) => {
    setTruckRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updated } : r))
    );
  };

  // Ice Purchase Handlers — สายบางแสนซื้อน้ำแข็งจากผู้ขาย (เช่น ธารทิพย์) มาขายต่อ ไม่ได้ผลิตเอง
  const handleAddIcePurchase = (record: IcePurchaseRecord) => {
    setIcePurchases((prev) => [record, ...prev]);
  };
  const handleDeleteIcePurchase = (id: string) => {
    setIcePurchases((prev) => prev.filter((p) => p.id !== id));
  };
  const handleAddIceSupplier = (name: string): IceSupplier => {
    const existing = iceSuppliers.find((s) => s.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (existing) return existing;
    const created: IceSupplier = { id: `SUP-${Date.now()}`, name: name.trim(), itemPrices: {} };
    setIceSuppliers((prev) => [...prev, created]);
    return created;
  };
  // ราคาต่อหน่วยล็อคแยกตามผู้ขายแต่ละราย — คนละผู้ขายคนละราคา
  const handleUpdateIceSupplierItemPrice = (supplierId: string, key: string, pricePerUnit: number) => {
    setIceSuppliers((prev) =>
      prev.map((s) =>
        s.id === supplierId
          ? { ...s, itemPrices: { ...s.itemPrices, [key]: Math.max(0, pricePerUnit) } }
          : s
      )
    );
  };

  // Build a "โม่(5), หลอดเล็ก(2)" style summary text from a customer's current quantities
  const buildCustomerSummaryText = (customer: CustomerAccount): string => {
    const parts: string[] = [];
    products.forEach((prod) => {
      const qty = customer.quantities[prod.key] || 0;
      if (qty > 0) {
        parts.push(`${prod.labelTh}(${qty})`);
      }
    });
    return parts.join(', ');
  };

  // Record a dated bill history entry so per-day billing (e.g. credit customers due-date tracking) isn't lost when a customer's current ledger row gets overwritten the next day
  const recordCustomerBillHistory = (
    customer: CustomerAccount,
    status: PaymentStatus,
    statusDetails?: PaymentStatusDetails,
    extra?: Partial<Pick<DeliveryRecord, 'paymentMethod' | 'note'>>
  ) => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const routeObj = routes.find((r) => r.name === customer.route);
    const newRecord: DeliveryRecord = {
      id: `DEL-${Date.now().toString().slice(-4)}`,
      time: `${hours}:${minutes}`,
      customerId: customer.id,
      customerName: customer.name,
      summaryText: buildCustomerSummaryText(customer),
      totalAmount: customer.totalAmount,
      status,
      statusDetails,
      date: selectedDate,
      routeId: routeObj?.id,
      routeName: customer.route,
      ...extra,
    };
    setRecentDeliveries((prev) => [newRecord, ...prev]);
  };

  // Handler: Confirm a payment status change from the Customers screen (Cash/Debt/Credit/OldPayment)
  const handleConfirmCustomerStatus = (customer: CustomerAccount, status: PaymentStatusDetails['status']) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customer.id ? { ...c, status, statusDetails: undefined, lastUpdated: selectedDate } : c
      )
    );
    recordCustomerBillHistory(customer, status);
  };

  // Combined Payment Handler (NewAndOld)
  const handleSaveNewAndOldPayment = (
    customerId: string,
    details: PaymentStatusDetails
  ) => {
    const customer = customers.find((c) => c.id === customerId);
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? {
              ...c,
              status: 'NewAndOld',
              statusDetails: details,
              lastUpdated: selectedDate,
            }
          : c
      )
    );
    if (customer) {
      recordCustomerBillHistory(customer, 'NewAndOld', details);
    }
  };

  // Admin Handlers
  const handleAddAdmin = (name: string, role: string, roleLevel: RoleLevel, pin: string) => {
    const newAdmin: AdminUser = {
      id: `ADMIN-${Date.now().toString().slice(-4)}`,
      name,
      role: role || 'พนักงานส่งน้ำแข็ง',
      roleLevel,
      pin,
    };
    setAdmins((prev) => [...prev, newAdmin]);
  };

  const handleUpdateAdmin = (id: string, updated: Partial<AdminUser>) => {
    if (updated.roleLevel && updated.roleLevel !== 'owner') {
      const target = admins.find((a) => a.id === id);
      const remainingOwners = admins.filter((a) => a.id !== id && a.roleLevel === 'owner');
      if (target?.roleLevel === 'owner' && remainingOwners.length === 0) {
        showToast('ต้องมีผู้ใช้งานสิทธิ์เจ้าของอย่างน้อย 1 ท่านในระบบ');
        return;
      }
    }
    setAdmins((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
  };

  const handleDeleteAdmin = (id: string) => {
    if (admins.length <= 1) {
      showToast('ต้องมีผู้ใช้งาน / Admin อย่างน้อย 1 ท่านในระบบ');
      return;
    }
    const target = admins.find((a) => a.id === id);
    const remainingOwners = admins.filter((a) => a.id !== id && a.roleLevel === 'owner');
    if (target?.roleLevel === 'owner' && remainingOwners.length === 0) {
      showToast('ต้องมีผู้ใช้งานสิทธิ์เจ้าของอย่างน้อย 1 ท่านในระบบ');
      return;
    }
    setAdmins((prev) => prev.filter((a) => a.id !== id));
    if (activeAdminId === id) {
      handleLogout();
    }
  };

  const handleLogin = (id: string) => {
    setActiveAdminId(id);
    sessionStorage.setItem(SESSION_KEY, id);
    const selected = admins.find((a) => a.id === id);
    if (selected) {
      setStats((prev) => ({ ...prev, shiftWorker: selected.name }));
    }
  };

  const handleLogout = () => {
    setActiveAdminId(null);
    sessionStorage.removeItem(SESSION_KEY);
  };

  // Handler: Add new ice delivery from Operations screen
  const handleAddDelivery = (
    deliveryData: Omit<DeliveryRecord, 'id'>,
    quantities: IceQuantity
  ) => {
    const newDelivery: DeliveryRecord = {
      ...deliveryData,
      id: `DEL-${Date.now().toString().slice(-4)}`,
    };

    setRecentDeliveries((prev) => [newDelivery, ...prev]);

    // Update Stats
    setStats((prev) => {
      const isCash = deliveryData.status === 'Cash' || deliveryData.status === 'NewAndOld';
      const isDebt = deliveryData.status === 'Debt';
      return {
        ...prev,
        todaySales: prev.todaySales + deliveryData.totalAmount,
        cashAccumulated: isCash
          ? prev.cashAccumulated + deliveryData.totalAmount
          : prev.cashAccumulated,
        debtAmount: isDebt
          ? prev.debtAmount + deliveryData.totalAmount
          : prev.debtAmount,
        billCount: prev.billCount + 1,
      };
    });

    // Update Overall Summary counts
    setSummaryData((prev) => ({
      ...prev,
      totalRevenue: prev.totalRevenue + deliveryData.totalAmount,
      cashRevenue:
        deliveryData.status === 'Cash' || deliveryData.status === 'NewAndOld'
          ? prev.cashRevenue + deliveryData.totalAmount
          : prev.cashRevenue,
      creditRevenue:
        deliveryData.status === 'Credit' || deliveryData.status === 'Debt'
          ? prev.creditRevenue + deliveryData.totalAmount
          : prev.creditRevenue,
      cubeCount: prev.cubeCount + (quantities.cube || 0),
      crushedCount: prev.crushedCount + (quantities.crushed || 0),
      largeTubeCount: prev.largeTubeCount + (quantities.largeTube || 0),
      smallTubeCount: prev.smallTubeCount + (quantities.smallTube || 0),
    }));

    // Check if customer exists and update customer record as well
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.name.toLowerCase() === deliveryData.customerName.toLowerCase()) {
          const newQuantities: IceQuantity = { ...c.quantities };
          Object.keys(quantities).forEach((k) => {
            newQuantities[k] = (newQuantities[k] || 0) + (quantities[k] || 0);
          });

          return {
            ...c,
            quantities: newQuantities,
            totalAmount: c.totalAmount + deliveryData.totalAmount,
            status: deliveryData.status,
          };
        }
        return c;
      })
    );
  };

  // Handler: Update customer record from Customers screen
  const handleUpdateCustomer = (id: string, updated: Partial<CustomerAccount>) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
    );
  };

  // Handler: Delete Customer
  const handleDeleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  // Handler: Save custom customer prices
  const handleSaveCustomerPrices = (
    customerId: string,
    customPrices: Partial<Record<string, number>>
  ) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, customPrices } : c))
    );
  };

  // Handler: Save All Customers
  const handleSaveAllCustomers = () => {
    showToast('บันทึกข้อมูลการลงบัญชีลูกค้าทั้งหมดเรียบร้อยแล้ว');
  };

  // Handler: Update Payment Status Labels
  const handleUpdateStatusLabels = (labels: PaymentStatusLabels) => {
    setStatusLabels(labels);
  };

  // Handler: Add new Customer
  const handleAddCustomer = (newCustData: Omit<CustomerAccount, 'id'>) => {
    const newCust: CustomerAccount = {
      ...newCustData,
      id: `CUST-${Date.now().toString().slice(-4)}`,
    };
    setCustomers((prev) => [newCust, ...prev]);
  };

  // Handler: Add new Expense
  const handleAddExpense = (expenseData: Omit<ExpenseItem, 'id'>) => {
    const newExpense: ExpenseItem = {
      ...expenseData,
      id: `EXP-${Date.now().toString().slice(-4)}`,
    };
    setExpenses((prev) => [newExpense, ...prev]);
  };

  // Handler: Delete Expense
  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((exp) => exp.id !== id));
    showToast('ลบรายการรายจ่ายเรียบร้อยแล้ว');
  };

  // Handler: Add new Expense Category
  const handleAddExpenseCategory = (category: Omit<ExpenseCategory, 'id'>) => {
    const newCategory: ExpenseCategory = {
      ...category,
      id: `ECAT-${Date.now().toString().slice(-4)}`,
    };
    setExpenseCategories((prev) => [...prev, newCategory]);
  };

  // Handler: Delete Expense Category
  const handleDeleteExpenseCategory = (id: string) => {
    setExpenseCategories((prev) => prev.filter((c) => c.id !== id));
  };

  // Employee Handlers
  const handleAddEmployee = (employee: Omit<Employee, 'id'>) => {
    const newEmployee: Employee = { ...employee, id: `EMP-${Date.now().toString().slice(-6)}` };
    setEmployees((prev) => [...prev, newEmployee]);
  };

  const handleUpdateEmployee = (id: string, updated: Partial<Employee>) => {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)));
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  // Attendance Handlers
  const handleAddAttendance = (record: Omit<AttendanceRecord, 'id'>) => {
    const newRecord: AttendanceRecord = { ...record, id: `ATT-${Date.now().toString().slice(-6)}` };
    setAttendanceRecords((prev) => [newRecord, ...prev]);
  };

  const handleDeleteAttendance = (id: string) => {
    setAttendanceRecords((prev) => prev.filter((r) => r.id !== id));
  };

  // Employee Loan Handlers
  const handleAddLoan = (loan: Omit<EmployeeLoan, 'id'>) => {
    const newLoan: EmployeeLoan = { ...loan, id: `LOAN-${Date.now().toString().slice(-6)}` };
    setEmployeeLoans((prev) => [newLoan, ...prev]);
  };

  const handleDeleteLoan = (id: string) => {
    setEmployeeLoans((prev) => prev.filter((l) => l.id !== id));
  };

  // Vehicle Handlers
  const handleAddVehicle = (vehicle: Omit<Vehicle, 'id'>) => {
    const newVehicle: Vehicle = { ...vehicle, id: `VEH-${Date.now().toString().slice(-6)}` };
    setVehicles((prev) => [...prev, newVehicle]);
  };

  const handleUpdateVehicle = (id: string, updated: Partial<Vehicle>) => {
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...updated } : v)));
  };

  const handleDeleteVehicle = (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  };

  // Vehicle Log Handlers
  const handleAddVehicleLog = (entry: Omit<VehicleLogEntry, 'id'>) => {
    const newEntry: VehicleLogEntry = { ...entry, id: `VLOG-${Date.now().toString().slice(-6)}` };
    setVehicleLogEntries((prev) => [newEntry, ...prev]);
  };

  const handleDeleteVehicleLog = (id: string) => {
    setVehicleLogEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const currentIcePurchaseCost = icePurchases
    .filter((p) => p.date === selectedDate)
    .reduce((sum, p) => sum + p.totalAmount, 0);

  const businessContext = buildBusinessContext({
    selectedDate,
    stats,
    summaryData,
    customers,
    expenses,
    monthlyExpenses,
    recentDeliveries,
    icePurchaseCost: currentIcePurchaseCost,
    routes,
    truckRecords,
    warehouseLogs,
  });

  if (!activeAdminObj) {
    return <LoginView admins={admins} onLoginSuccess={handleLogin} />;
  }

  const roleLevel = activeAdminObj.roleLevel;

  return (
    <div className="min-h-screen bg-[#F2F6FA] text-[#1E293B] flex flex-col font-sans">
      {/* Top Header */}
      <Header
        showSearch={showSearch}
        onSearchToggle={() => setShowSearch(!showSearch)}
        searchQuery={globalSearchQuery}
        onSearchChange={(q) => setGlobalSearchQuery(q)}
        currentShift={currentShift}
        onShiftChange={(shift) => setCurrentShift(shift)}
        selectedDate={selectedDate}
        onDateChange={(date) => setSelectedDate(date)}
        activeAdminName={activeAdminName}
        roleLevel={roleLevel}
        onOpenManageAdmins={() => setIsManageAdminsOpen(true)}
        onOpenBackup={() => setIsBackupOpen(true)}
        onLogout={handleLogout}
      />

      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        shiftWorker={activeAdminName}
        roleLevel={roleLevel}
      />

      {/* Main Content Area */}
      <main className="pt-20 px-4 md:px-10 lg:pl-80 max-w-7xl mx-auto w-full flex-1 transition-all">
        {activeTab === 'operations' && (
          <OperationsView
            stats={{ ...stats, shiftWorker: activeAdminName }}
            recentDeliveries={recentDeliveries}
            customers={customers}
            products={products}
            routes={routes}
            truckRecords={truckRecords}
            roleLevel={roleLevel}
            onAddDelivery={handleAddDelivery}
            onSaveTruckRecord={handleSaveTruckRecord}
            onOpenProductManager={() => setIsProductManagerOpen(true)}
            onOpenEmployeeManager={() => setIsEmployeeManagerOpen(true)}
            onShowToast={showToast}
            selectedDate={selectedDate}
            onDateChange={(d) => setSelectedDate(d)}
            currentShift={currentShift}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersView
            customers={customers}
            routes={routes}
            products={products}
            statusLabels={statusLabels}
            roleLevel={roleLevel}
            onUpdateCustomer={handleUpdateCustomer}
            onConfirmCustomerStatus={handleConfirmCustomerStatus}
            onDeleteCustomer={handleDeleteCustomer}
            onOpenPriceModal={(customer) => setCustomerForPriceModal(customer)}
            onOpenNewAndOldModal={(customer) => setNewAndOldModalCustomer(customer)}
            onOpenRouteManager={() => setIsRouteManagerOpen(true)}
            onOpenProductManager={() => setIsProductManagerOpen(true)}
            onOpenStatusLabelsModal={() => setIsStatusLabelsModalOpen(true)}
            onSaveAll={handleSaveAllCustomers}
            onOpenAddModal={() => setIsAddCustomerOpen(true)}
            onShowToast={showToast}
            selectedDate={selectedDate}
            onDateChange={(d) => setSelectedDate(d)}
            currentShift={currentShift}
          />
        )}

        {activeTab === 'creditCustomers' && (
          <CreditCustomersView
            customers={customers}
            deliveries={recentDeliveries}
            onUpdateCustomer={handleUpdateCustomer}
            onShowToast={showToast}
            selectedDate={selectedDate}
            onDateChange={(d) => setSelectedDate(d)}
          />
        )}

        {activeTab === 'customerDetails' && (
          <CustomerDetailsView
            customers={customers}
            routes={routes}
            recentDeliveries={recentDeliveries}
            selectedDate={selectedDate}
            onDateChange={(d) => setSelectedDate(d)}
            onUpdateCustomer={handleUpdateCustomer}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'warehouse' && (
          <WarehouseView
            items={warehouseItems}
            logs={warehouseLogs}
            onAddItem={handleAddWarehouseItem}
            onUpdateItem={handleUpdateWarehouseItem}
            onDeleteItem={handleDeleteWarehouseItem}
            onAddLog={handleAddWarehouseLog}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'summary' && (
          <SummaryView
            recentDeliveries={recentDeliveries}
            expenses={expenses}
            monthlyExpenses={monthlyExpenses}
            customers={customers}
            routes={routes}
            products={products}
            roleLevel={roleLevel}
            selectedDate={selectedDate}
            onDateChange={(d) => setSelectedDate(d)}
            icePurchases={icePurchases}
            onAddMonthlyExpense={handleAddMonthlyExpense}
            onUpdateMonthlyExpense={handleUpdateMonthlyExpense}
            onDeleteMonthlyExpense={handleDeleteMonthlyExpense}
            onNavigateToExpenses={() => setActiveTab('expenses')}
            onNavigateToIcePurchase={() => setActiveTab('icePurchase')}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesView
            expenses={expenses}
            routes={routes}
            categories={expenseCategories}
            onOpenAddExpenseModal={() => setIsAddExpenseOpen(true)}
            onOpenCategoryManager={() => setIsExpenseCategoryManagerOpen(true)}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {activeTab === 'icePurchase' && (
          <IcePurchaseView
            suppliers={iceSuppliers}
            itemTypes={icePurchaseItemTypes}
            purchases={icePurchases}
            selectedDate={selectedDate}
            onDateChange={(d) => setSelectedDate(d)}
            onAddPurchase={handleAddIcePurchase}
            onDeletePurchase={handleDeleteIcePurchase}
            onAddSupplier={handleAddIceSupplier}
            onUpdateSupplierItemPrice={handleUpdateIceSupplierItemPrice}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'assistant' && (
          <AIAssistantView
            businessContext={businessContext}
            selectedDate={selectedDate}
            onDateChange={(d) => setSelectedDate(d)}
            roleLevel={roleLevel}
            activeAdminName={activeAdminName}
          />
        )}

        {activeTab === 'reconciliation' && (
          <CashReconciliationView
            selectedDate={selectedDate}
            onDateChange={(d) => setSelectedDate(d)}
            routes={routes}
            products={products}
            truckRecords={truckRecords}
            deliveries={recentDeliveries}
            onUpdateTruckRecord={handleUpdateTruckRecord}
          />
        )}

        {activeTab === 'attendance' && (
          <AttendanceView
            employees={employees}
            attendanceRecords={attendanceRecords}
            employeeLoans={employeeLoans}
            selectedDate={selectedDate}
            onDateChange={(d) => setSelectedDate(d)}
            onAddAttendance={handleAddAttendance}
            onDeleteAttendance={handleDeleteAttendance}
            onAddLoan={handleAddLoan}
            onDeleteLoan={handleDeleteLoan}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'vehicles' && (
          <VehicleLogView
            vehicles={vehicles}
            logEntries={vehicleLogEntries}
            onOpenVehicleManager={() => setIsVehicleManagerOpen(true)}
            onAddLogEntry={handleAddVehicleLog}
            onDeleteLogEntry={handleDeleteVehicleLog}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        roleLevel={roleLevel}
      />

      {/* Modals */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        routes={routes}
        categories={expenseCategories}
        onAddExpense={handleAddExpense}
        onShowToast={showToast}
      />

      <ExpenseCategoryManagerModal
        isOpen={isExpenseCategoryManagerOpen}
        onClose={() => setIsExpenseCategoryManagerOpen(false)}
        categories={expenseCategories}
        onAddCategory={handleAddExpenseCategory}
        onDeleteCategory={handleDeleteExpenseCategory}
        onShowToast={showToast}
      />

      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        routes={routes}
        products={products}
        onAddCustomer={handleAddCustomer}
        onShowToast={showToast}
      />

      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        onShowToast={showToast}
      />

      <ManageAdminsModal
        isOpen={isManageAdminsOpen}
        onClose={() => setIsManageAdminsOpen(false)}
        admins={admins}
        activeAdminId={activeAdminId}
        onAddAdmin={handleAddAdmin}
        onUpdateAdmin={handleUpdateAdmin}
        onDeleteAdmin={handleDeleteAdmin}
        onShowToast={showToast}
      />

      <CustomerPriceModal
        isOpen={!!customerForPriceModal}
        onClose={() => setCustomerForPriceModal(null)}
        customer={customerForPriceModal}
        products={products}
        onSavePrices={handleSaveCustomerPrices}
        onShowToast={showToast}
      />

      <ProductManagerModal
        isOpen={isProductManagerOpen}
        onClose={() => setIsProductManagerOpen(false)}
        products={products}
        onAddProduct={handleAddProduct}
        onUpdateProduct={handleUpdateProduct}
        onDeleteProduct={handleDeleteProduct}
        onShowToast={showToast}
      />

      <RouteManagerModal
        isOpen={isRouteManagerOpen}
        onClose={() => setIsRouteManagerOpen(false)}
        routes={routes}
        onAddRoute={handleAddRoute}
        onUpdateRoute={handleUpdateRoute}
        onDeleteRoute={handleDeleteRoute}
        onMoveRoute={handleMoveRoute}
        onShowToast={showToast}
      />

      <PaymentStatusLabelsModal
        isOpen={isStatusLabelsModalOpen}
        onClose={() => setIsStatusLabelsModalOpen(false)}
        labels={statusLabels}
        onSaveLabels={handleUpdateStatusLabels}
        onShowToast={showToast}
      />

      <NewAndOldPaymentModal
        isOpen={!!newAndOldModalCustomer}
        onClose={() => setNewAndOldModalCustomer(null)}
        customer={newAndOldModalCustomer}
        onSavePayment={handleSaveNewAndOldPayment}
        onShowToast={showToast}
      />

      <EmployeeManagerModal
        isOpen={isEmployeeManagerOpen}
        onClose={() => setIsEmployeeManagerOpen(false)}
        employees={employees}
        onAddEmployee={handleAddEmployee}
        onUpdateEmployee={handleUpdateEmployee}
        onDeleteEmployee={handleDeleteEmployee}
        onShowToast={showToast}
      />

      <VehicleManagerModal
        isOpen={isVehicleManagerOpen}
        onClose={() => setIsVehicleManagerOpen(false)}
        vehicles={vehicles}
        onAddVehicle={handleAddVehicle}
        onUpdateVehicle={handleUpdateVehicle}
        onDeleteVehicle={handleDeleteVehicle}
        onShowToast={showToast}
      />

      {/* Toast Feedback */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
