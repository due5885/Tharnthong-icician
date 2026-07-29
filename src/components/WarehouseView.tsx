import React, { useState } from 'react';
import { WarehouseItem, WarehouseLog } from '../types';
import { useHorizontalWheelScroll } from '../lib/useHorizontalWheelScroll';
import { formatShortDate, formatTimestampDMY } from '../lib/statementExport';
import { DateInput } from './DateInput';

interface WarehouseViewProps {
  items: WarehouseItem[];
  logs: WarehouseLog[];
  onAddItem: (item: Omit<WarehouseItem, 'id' | 'lastUpdated'>) => void;
  onUpdateItem: (id: string, updated: Partial<WarehouseItem>) => void;
  onDeleteItem: (id: string) => void;
  onAddLog: (log: Omit<WarehouseLog, 'id' | 'timestamp'>) => void;
  onShowToast: (msg: string) => void;
}

const CATEGORIES = [
  'ทั้งหมด',
  'ถังน้ำแข็งเปล่า',
  'กระสอบ',
  'เคมี/อุปกรณ์บำรุงรักษา',
];

const CATEGORY_ICONS: Record<string, string> = {
  'ถังน้ำแข็งเปล่า': 'inventory_2',
  'กระสอบ': 'inventory',
  'เคมี/อุปกรณ์บำรุงรักษา': 'construction',
};

export const WarehouseView: React.FC<WarehouseViewProps> = ({
  items,
  logs,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onAddLog,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'LOGS'>('ITEMS');
  const tableScrollRef = useHorizontalWheelScroll<HTMLDivElement>();
  const [searchQuery, setSearchQuery] = useState('');
  // Drill-down: null = show category cards, set = show that category's item list
  const [drilldownCategory, setDrilldownCategory] = useState<string | null>(null);

  // Add/Edit Item Modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WarehouseItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState(CATEGORIES[1]);
  const [itemQty, setItemQty] = useState<number>(0);
  const [itemUnit, setItemUnit] = useState('ใบ');
  const [itemMinThreshold, setItemMinThreshold] = useState<number>(10);

  // Stock Movement Transaction Modal
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transItemId, setTransItemId] = useState('');
  const [transType, setTransType] = useState<'IN' | 'OUT'>('IN');
  const [transQty, setTransQty] = useState<number>(10);
  const [transOperator, setTransOperator] = useState('');
  const [transNotes, setTransNotes] = useState('');
  const [transDate, setTransDate] = useState(() => new Date().toISOString().substring(0, 10));

  // Items within the currently drilled-into category
  const filteredItems = items.filter((item) => {
    const matchesCat = !drilldownCategory || item.category === drilldownCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Category summary for the top-level card view (always show every known category, even if empty, so admin can add the first item)
  const categoryList = CATEGORIES.filter((c) => c !== 'ทั้งหมด');
  const categorySummaries = categoryList.map((cat) => {
    const catItems = items.filter((i) => i.category === cat);
    const lowCount = catItems.filter((i) => i.minThreshold && i.quantity <= i.minThreshold).length;
    return { category: cat, count: catItems.length, lowCount };
  });

  // Filter Logs
  const filteredLogs = logs.filter((log) => {
    return log.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           log.operatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (log.notes && log.notes.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  // Open modal for new item
  const handleOpenNewItem = () => {
    setEditingItem(null);
    setItemName('');
    setItemCategory(drilldownCategory || CATEGORIES[1]);
    setItemQty(0);
    setItemUnit('ใบ');
    setItemMinThreshold(10);
    setIsItemModalOpen(true);
  };

  // Open modal for edit item
  const handleOpenEditItem = (item: WarehouseItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemCategory(item.category);
    setItemQty(item.quantity);
    setItemUnit(item.unit);
    setItemMinThreshold(item.minThreshold || 10);
    setIsItemModalOpen(true);
  };

  // Submit Item Form
  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      onShowToast('กรุณากรอกชื่อรายการสินค้า');
      return;
    }

    if (editingItem) {
      onUpdateItem(editingItem.id, {
        name: itemName.trim(),
        category: itemCategory,
        quantity: Math.max(0, itemQty),
        unit: itemUnit.trim() || 'ชิ้น',
        minThreshold: Math.max(0, itemMinThreshold),
        lastUpdated: new Date().toLocaleString('sv-SE').substring(0, 16).replace('T', ' '),
      });
      onShowToast(`แก้ไขข้อมูลสินค้า "${itemName}" เรียบร้อยแล้ว`);
    } else {
      onAddItem({
        name: itemName.trim(),
        category: itemCategory,
        quantity: Math.max(0, itemQty),
        unit: itemUnit.trim() || 'ชิ้น',
        minThreshold: Math.max(0, itemMinThreshold),
      });
      onShowToast(`เพิ่มสินค้าใหม่ "${itemName}" เข้าคลังเรียบร้อยแล้ว`);
    }

    setIsItemModalOpen(false);
  };

  // Open transaction modal
  const handleOpenTransaction = (item?: WarehouseItem, defaultType: 'IN' | 'OUT' = 'IN') => {
    if (items.length === 0) {
      onShowToast('ยังไม่มีสินค้าในคลัง กรุณาเพิ่มรายการสินค้าก่อน');
      return;
    }
    const target = item || items[0];
    setTransItemId(target.id);
    setTransType(defaultType);
    setTransQty(10);
    setTransOperator('');
    setTransNotes('');
    setTransDate(new Date().toISOString().substring(0, 10));
    setIsTransactionModalOpen(true);
  };

  // Submit Transaction
  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const item = items.find((i) => i.id === transItemId);
    if (!item) return;

    if (!transOperator.trim()) {
      onShowToast('กรุณาระบุชื่อผู้ดำเนินการ (ผู้รับ/ผู้นำออก)');
      return;
    }

    if (transQty <= 0) {
      onShowToast('จำนวนต้องมากกว่า 0');
      return;
    }

    if (transType === 'OUT' && transQty > item.quantity) {
      onShowToast(`ยอดในคลังมีเพียง ${item.quantity} ${item.unit} ไม่พอสำหรับการเบิกจ่าย`);
      return;
    }

    const nowStr = new Date().toLocaleString('sv-SE').substring(0, 16).replace('T', ' ');

    const newQty = transType === 'IN' ? item.quantity + transQty : item.quantity - transQty;

    // Update item stock quantity
    onUpdateItem(item.id, {
      quantity: newQty,
      lastUpdated: nowStr,
    });

    // Add log
    onAddLog({
      date: transDate,
      itemId: item.id,
      itemName: item.name,
      type: transType,
      quantity: transQty,
      operatorName: transOperator.trim(),
      notes: transNotes.trim() || undefined,
    });

    onShowToast(
      `บันทึกการ ${transType === 'IN' ? 'นำเข้า' : 'เบิกออก'} ${item.name} จำนวน ${transQty} ${item.unit} โดย ${transOperator} วันที่ ${formatShortDate(transDate)} เรียบร้อย`
    );
    setIsTransactionModalOpen(false);
  };

  // Low stock items count
  const lowStockCount = items.filter((i) => i.minThreshold && i.quantity <= i.minThreshold).length;

  return (
    <div className="space-y-6 pb-24">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#0F172A] to-[#334155] rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#94A3B8] text-xs font-bold uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-sm">warehouse</span>
            <span>Central Warehouse & Inventory Management</span>
          </div>
          <h1 className="text-2xl font-bold">คลังสินค้าใหญ่โกดังร้าน</h1>
          <p className="text-xs text-[#CBD5E1] mt-1">
            จัดการสต๊อกสินค้าคงคลัง ตรวจสอบสิ่งของในคลังใหญ่ และบันทึกผู้รับ/ผู้นำเข้า-ออกทุกครั้ง
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenTransaction(undefined, 'IN')}
            className="px-4 py-2 bg-[#166534] hover:bg-[#15803D] text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">file_download</span>
            <span>บันทึกนำเข้า/เบิกจ่าย</span>
          </button>

          <button
            onClick={handleOpenNewItem}
            className="px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">add_box</span>
            <span>เพิ่มรายการใหม่</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="bg-white border border-[#D2E0EB] rounded-2xl p-3.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Main Tabs */}
        <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('ITEMS')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'ITEMS'
                ? 'bg-white text-[#1E3A5F] shadow-2xs'
                : 'text-[#64748B] hover:text-[#1E3A5F]'
            }`}
          >
            <span className="material-symbols-outlined text-base">inventory_2</span>
            <span>รายการสินค้าในโกดัง ({items.length})</span>
            {lowStockCount > 0 && (
              <span className="bg-[#DC2626] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
                {lowStockCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('LOGS')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'LOGS'
                ? 'bg-white text-[#1E3A5F] shadow-2xs'
                : 'text-[#64748B] hover:text-[#1E3A5F]'
            }`}
          >
            <span className="material-symbols-outlined text-base">history_edu</span>
            <span>ประวัติตรวจรับ-เบิกจ่าย ({logs.length})</span>
          </button>
        </div>

        {/* Filter & Search — hidden on the top-level category card view; shown once drilled into a category, or on the Logs tab */}
        {(activeTab === 'LOGS' || (activeTab === 'ITEMS' && drilldownCategory)) && (
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#94A3B8] text-base">
                search
              </span>
              <input
                type="text"
                placeholder={activeTab === 'ITEMS' ? 'ค้นหาชื่อสินค้า...' : 'ค้นหาผู้เบิก/รายการ...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-[#CBD5E1] rounded-xl text-xs focus:ring-2 focus:ring-[#0284C7] outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Content Tab 1a: Top-level category cards */}
      {activeTab === 'ITEMS' && !drilldownCategory && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categorySummaries.map(({ category, count, lowCount }) => (
            <button
              key={category}
              type="button"
              onClick={() => setDrilldownCategory(category)}
              className="text-left bg-white rounded-3xl p-5 border border-[#D2E0EB] hover:border-[#0284C7] shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#EBF2F7] text-[#0284C7] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-3xl">
                  {CATEGORY_ICONS[category] || 'category'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-[#1E3A5F] truncate">{category}</h3>
                <p className="text-xs text-[#64748B] mt-0.5">{count} รายการ</p>
                {lowCount > 0 && (
                  <span className="inline-flex items-center gap-0.5 mt-1 text-[10px] font-bold bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] px-2 py-0.5 rounded-full animate-pulse">
                    <span className="material-symbols-outlined text-[12px]">warning</span>
                    สต๊อกต่ำ {lowCount} รายการ
                  </span>
                )}
              </div>
              <span className="material-symbols-outlined text-[#94A3B8]">chevron_right</span>
            </button>
          ))}
        </div>
      )}

      {/* Content Tab 1b: Items within the selected category */}
      {activeTab === 'ITEMS' && drilldownCategory && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setDrilldownCategory(null)}
            className="flex items-center gap-1.5 text-xs font-bold text-[#0284C7] hover:text-[#0369A1] cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            กลับไปหมวดหมู่ทั้งหมด
          </button>

          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0284C7]">
              {CATEGORY_ICONS[drilldownCategory] || 'category'}
            </span>
            <h3 className="font-bold text-lg text-[#1E3A5F]">{drilldownCategory}</h3>
          </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredItems.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-3xl border border-[#D2E0EB] text-center text-[#64748B] font-medium text-sm">
              ไม่พบข้อมูลสินค้าในโกดังตรงตามเงื่อนไข
            </div>
          ) : (
            filteredItems.map((item) => {
              const isLow = item.minThreshold && item.quantity <= item.minThreshold;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-3xl p-5 border transition-all shadow-xs hover:shadow-md flex flex-col justify-between ${
                    isLow ? 'border-[#FCA5A5] bg-[#FFF5F5]' : 'border-[#D2E0EB] hover:border-[#0284C7]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold bg-[#F1F5F9] text-[#475569] px-2 py-0.5 rounded-lg border border-[#E2E8F0] truncate">
                        {item.category}
                      </span>
                      {isLow && (
                        <span className="text-[10px] font-bold bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] px-2 py-0.5 rounded-full flex items-center gap-0.5 animate-pulse">
                          <span className="material-symbols-outlined text-[12px]">warning</span>
                          เตือนสต๊อกต่ำ
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-base text-[#1E3A5F] line-clamp-2">{item.name}</h3>

                    <div className="mt-4 flex items-baseline justify-between bg-[#F8FAFC] p-3 rounded-2xl border border-[#E2E8F0]">
                      <span className="text-xs font-semibold text-[#64748B]">คงเหลือในคลัง:</span>
                      <div>
                        <span className={`text-2xl font-bold data-mono ${isLow ? 'text-[#DC2626]' : 'text-[#0284C7]'}`}>
                          {item.quantity.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-[#64748B] ml-1">{item.unit}</span>
                      </div>
                    </div>

                    {item.minThreshold && (
                      <p className="text-[11px] text-[#64748B] mt-2">
                        จุดเตือนเบิกเพิ่ม: <strong className="text-[#1E293B]">{item.minThreshold} {item.unit}</strong>
                      </p>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenTransaction(item, 'IN')}
                      className="flex-1 py-1.5 bg-[#DCFCE7] hover:bg-[#BBF7D0] text-[#166534] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      <span>นำเข้า</span>
                    </button>

                    <button
                      onClick={() => handleOpenTransaction(item, 'OUT')}
                      className="flex-1 py-1.5 bg-[#FEE2E2] hover:bg-[#FCA5A5] text-[#991B1B] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">remove</span>
                      <span>เบิกออก</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditItem(item)}
                      className="p-1.5 text-[#64748B] hover:text-[#0284C7] hover:bg-[#E0F2FE] rounded-xl transition-all cursor-pointer"
                      title="แก้ไขข้อมูล"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        </div>
      )}

      {/* Content Tab 2: Movement Logs */}
      {activeTab === 'LOGS' && (
        <div className="bg-white border border-[#D2E0EB] rounded-3xl shadow-xs overflow-hidden">
          <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0284C7]">history</span>
              <h3 className="font-bold text-sm text-[#1E3A5F]">
                ประวัติการตรวจรับและเบิกจ่ายโกดัง ({filteredLogs.length} รายการ)
              </h3>
            </div>
          </div>

          <div ref={tableScrollRef} className="overflow-x-auto thin-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EBF2F7] text-[#1E3A5F] font-bold uppercase text-[11px] border-b border-[#D2E0EB]">
                <tr>
                  <th className="p-3.5">วัน/เวลา</th>
                  <th className="p-3.5">รายการสินค้า</th>
                  <th className="p-3.5 text-center">ประเภท</th>
                  <th className="p-3.5 text-right">จำนวน</th>
                  <th className="p-3.5">👤 ผู้ดำเนินการ (ใครนำเข้า-ออก)</th>
                  <th className="p-3.5">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#94A3B8]">
                      ยังไม่มีประวัติการนำเข้าหรือเบิกจ่ายสินค้า
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="p-3.5 font-bold text-[#64748B] data-mono whitespace-nowrap">
                        {formatTimestampDMY(log.timestamp)}
                      </td>

                      <td className="p-3.5 font-bold text-[#1E293B]">
                        {log.itemName}
                      </td>

                      <td className="p-3.5 text-center">
                        {log.type === 'IN' ? (
                          <span className="bg-[#DCFCE7] text-[#166534] font-bold px-2.5 py-1 rounded-xl text-[10px] border border-[#BBF7D0]">
                            🟢 นำเข้า
                          </span>
                        ) : (
                          <span className="bg-[#FEE2E2] text-[#991B1B] font-bold px-2.5 py-1 rounded-xl text-[10px] border border-[#FCA5A5]">
                            🔴 เบิกออก
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right font-bold text-sm data-mono">
                        <span className={log.type === 'IN' ? 'text-[#166534]' : 'text-[#DC2626]'}>
                          {log.type === 'IN' ? '+' : '-'}{log.quantity.toLocaleString()}
                        </span>
                      </td>

                      <td className="p-3.5 font-bold text-[#0284C7] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">person</span>
                        <span>{log.operatorName}</span>
                      </td>

                      <td className="p-3.5 text-[#64748B]">
                        {log.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-[#BAE6FD]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="font-bold text-[#1E3A5F]">
                {editingItem ? 'แก้ไขรายการสินค้าในโกดัง' : 'เพิ่มสินค้าใหม่เข้าโกดัง'}
              </h3>
              <button onClick={() => setIsItemModalOpen(false)} className="p-1 text-[#64748B] hover:bg-[#F1F5F9] rounded-full">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleItemSubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-[#1E3A5F]">ชื่อรายการสินค้า</label>
                <input
                  type="text"
                  placeholder="เช่น น้ำแข็งหลอดใหญ่ (ห้องเย็น A), ถุงพลาสติก 5kg"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0284C7] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1E3A5F]">หมวดหมู่</label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#0284C7] outline-none cursor-pointer"
                >
                  {CATEGORIES.filter((c) => c !== 'ทั้งหมด').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-[#1E3A5F]">จำนวนตั้งต้น</label>
                  <input
                    type="number"
                    min="0"
                    value={itemQty}
                    onChange={(e) => setItemQty(parseInt(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#0284C7] data-mono focus:ring-2 focus:ring-[#0284C7] outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1E3A5F]">หน่วยนับ</label>
                  <input
                    type="text"
                    placeholder="ถุง, ใบ, ก้อน, ถัง"
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs focus:ring-2 focus:ring-[#0284C7] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1E3A5F]">ระดับเตือนสต๊อกต่ำ (Min Alert)</label>
                <input
                  type="number"
                  min="0"
                  value={itemMinThreshold}
                  onChange={(e) => setItemMinThreshold(parseInt(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#DC2626] data-mono focus:ring-2 focus:ring-[#0284C7] outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="flex-1 py-2.5 border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#0284C7] text-white rounded-xl text-xs font-bold hover:bg-[#0369A1] shadow-md cursor-pointer"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Movement Transaction Modal (IN / OUT with Operator Name) */}
      {isTransactionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-[#BAE6FD]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${transType === 'IN' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#991B1B]'}`}>
                  <span className="material-symbols-outlined text-xl">
                    {transType === 'IN' ? 'file_download' : 'file_upload'}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-[#1E3A5F]">บันทึกการนำเข้า / เบิกจ่ายโกดัง</h3>
                  <p className="text-xs text-[#64748B]">ระบุรายการ และใครเป็นผู้นำเข้าหรือเบิกออก</p>
                </div>
              </div>
              <button onClick={() => setIsTransactionModalOpen(false)} className="p-1 text-[#64748B] hover:bg-[#F1F5F9] rounded-full">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleTransactionSubmit} className="mt-4 space-y-3">
              {/* Transaction Type Radio */}
              <div className="grid grid-cols-2 gap-2 bg-[#F1F5F9] p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setTransType('IN')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    transType === 'IN' ? 'bg-[#166534] text-white shadow-xs' : 'text-[#64748B]'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">add_circle</span>
                  <span>นำเข้า (IN)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTransType('OUT')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    transType === 'OUT' ? 'bg-[#DC2626] text-white shadow-xs' : 'text-[#64748B]'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">remove_circle</span>
                  <span>เบิกออก (OUT)</span>
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1E3A5F]">เลือกรายการสินค้า</label>
                <select
                  value={transItemId}
                  onChange={(e) => setTransItemId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#1E3A5F] focus:ring-2 focus:ring-[#0284C7] outline-none cursor-pointer"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (คงเหลือ: {i.quantity} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-[#1E3A5F]">จำนวน</label>
                  <input
                    type="number"
                    min="1"
                    value={transQty}
                    onChange={(e) => setTransQty(parseInt(e.target.value) || 1)}
                    className="w-full mt-1 px-3 py-2.5 border border-[#CBD5E1] rounded-xl text-base font-bold text-[#0284C7] data-mono focus:ring-2 focus:ring-[#0284C7] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1E3A5F]">วันที่</label>
                  <DateInput
                    value={transDate}
                    onChange={setTransDate}
                    className="w-full mt-1 px-3 py-2.5 border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#1E3A5F] data-mono focus:ring-2 focus:ring-[#0284C7] outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#DC2626]">👤 ผู้ดำเนินการ (ใครนำเข้า-เบิกออก)</label>
                <input
                  type="text"
                  placeholder="เช่น ช่างวิชัย, นายสมชาย (พนักงานสาย A), คุณสมพงษ์"
                  value={transOperator}
                  onChange={(e) => setTransOperator(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1E3A5F]">หมายเหตุเพิ่มเติม</label>
                <input
                  type="text"
                  placeholder="เช่น เบิกขึ้นรถกระบะสาย A, ฝากเข้าห้องเย็นล็อตบ่าย"
                  value={transNotes}
                  onChange={(e) => setTransNotes(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs focus:ring-2 focus:ring-[#0284C7] outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTransactionModalOpen(false)}
                  className="flex-1 py-2.5 border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer ${
                    transType === 'IN' ? 'bg-[#166534] hover:bg-[#15803D]' : 'bg-[#DC2626] hover:bg-[#B91C1C]'
                  }`}
                >
                  ยืนยันบันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
