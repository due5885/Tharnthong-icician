import React from 'react';
import { RoleLevel, TabType } from '../types';
import { canAccessTab } from '../lib/permissions';
import { resolveAdminAvatarByName } from '../lib/adminAvatars';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  shiftWorker: string;
  roleLevel: RoleLevel;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  shiftWorker,
  roleLevel,
}) => {
  const can = (tab: TabType) => canAccessTab(roleLevel, tab);
  const avatarUrl = resolveAdminAvatarByName(shiftWorker);

  return (
    <aside className="hidden lg:flex fixed left-0 top-16 h-[calc(100vh-64px)] w-72 bg-[#EBF2F7] border-r border-[#D2E0EB] shadow-xs flex-col py-6 px-4 z-40">
      {/* Manager Profile Info */}
      <div className="pb-6 border-b border-[#D2E0EB] mb-6 px-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#1E3A5F]/30 flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={shiftWorker} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0284C7] to-[#1E3A5F] text-white font-bold text-lg">
                {shiftWorker.charAt(0)}
              </div>
            )}
          </div>
          <div className="overflow-hidden">
            <h3 className="font-semibold text-[#1E293B] text-sm truncate">
              {shiftWorker}
            </h3>
            <p className="text-xs text-[#64748B] truncate">
              Factory Admin • Shift A
            </p>
          </div>
        </div>
      </div>

      {/* Main Navigation Links */}
      <div className="flex flex-col gap-1.5 flex-1">
        {can('operations') && (
          <button
            onClick={() => onTabChange('operations')}
            className={`w-full text-left rounded-full px-4 py-3 flex items-center gap-4 transition-colors font-medium text-sm cursor-pointer ${
              activeTab === 'operations'
                ? 'bg-[#1E3A5F] text-white shadow-xs'
                : 'text-[#1E293B] hover:bg-[#DCE7F0]'
            }`}
          >
            <span
              className={`material-symbols-outlined ${
                activeTab === 'operations' ? 'fill-1' : ''
              }`}
            >
              inventory_2
            </span>
            <span>ขึ้นน้ำแข็ง-น้ำแข็งเหลือ</span>
          </button>
        )}

        {can('customers') && (
          <button
            onClick={() => onTabChange('customers')}
            className={`w-full text-left rounded-full px-4 py-3 flex items-center gap-4 transition-colors font-medium text-sm cursor-pointer ${
              activeTab === 'customers'
                ? 'bg-[#1E3A5F] text-white shadow-xs'
                : 'text-[#1E293B] hover:bg-[#DCE7F0]'
            }`}
          >
            <span
              className={`material-symbols-outlined ${
                activeTab === 'customers' ? 'fill-1' : ''
              }`}
            >
              group
            </span>
            <span>ลงบัญชีลูกค้า (Customers)</span>
          </button>
        )}

        {can('customerDetails') && (
          <button
            onClick={() => onTabChange('customerDetails')}
            className={`w-full text-left rounded-full px-4 py-3 flex items-center gap-4 transition-colors font-medium text-sm cursor-pointer ${
              activeTab === 'customerDetails'
                ? 'bg-[#1E3A5F] text-white shadow-xs'
                : 'text-[#1E293B] hover:bg-[#DCE7F0]'
            }`}
          >
            <span
              className={`material-symbols-outlined ${
                activeTab === 'customerDetails' ? 'fill-1' : ''
              }`}
            >
              badge
            </span>
            <span>รายละเอียดลูกค้า & ยอดค้าง</span>
          </button>
        )}

        {can('creditCustomers') && (
          <button
            onClick={() => onTabChange('creditCustomers')}
            className={`w-full text-left rounded-full px-4 py-3 flex items-center gap-4 transition-colors font-medium text-sm cursor-pointer ${
              activeTab === 'creditCustomers'
                ? 'bg-[#1E3A5F] text-white shadow-xs'
                : 'text-[#1E293B] hover:bg-[#DCE7F0]'
            }`}
          >
            <span
              className={`material-symbols-outlined ${
                activeTab === 'creditCustomers' ? 'fill-1' : ''
              }`}
            >
              event_repeat
            </span>
            <span>ลูกค้าเครดิต</span>
          </button>
        )}

        {can('warehouse') && (
          <button
            onClick={() => onTabChange('warehouse')}
            className={`w-full text-left rounded-full px-4 py-3 flex items-center gap-4 transition-colors font-medium text-sm cursor-pointer ${
              activeTab === 'warehouse'
                ? 'bg-[#1E3A5F] text-white shadow-xs'
                : 'text-[#1E293B] hover:bg-[#DCE7F0]'
            }`}
          >
            <span
              className={`material-symbols-outlined ${
                activeTab === 'warehouse' ? 'fill-1' : ''
              }`}
            >
              warehouse
            </span>
            <span>สต๊อกใหญ่โกดังร้าน</span>
          </button>
        )}

        {can('summary') && (
          <button
            onClick={() => onTabChange('summary')}
            className={`w-full text-left rounded-full px-4 py-3 flex items-center gap-4 transition-colors font-medium text-sm cursor-pointer ${
              activeTab === 'summary'
                ? 'bg-[#1E3A5F] text-white shadow-xs'
                : 'text-[#1E293B] hover:bg-[#DCE7F0]'
            }`}
          >
            <span
              className={`material-symbols-outlined ${
                activeTab === 'summary' ? 'fill-1' : ''
              }`}
            >
              analytics
            </span>
            <span>สรุปภาพรวม (Summary)</span>
          </button>
        )}

        {can('reconciliation') && (
          <button
            onClick={() => onTabChange('reconciliation')}
            className={`w-full text-left rounded-full px-4 py-3 flex items-center gap-4 transition-colors font-medium text-sm cursor-pointer ${
              activeTab === 'reconciliation'
                ? 'bg-[#1E3A5F] text-white shadow-xs'
                : 'text-[#1E293B] hover:bg-[#DCE7F0]'
            }`}
          >
            <span
              className={`material-symbols-outlined ${
                activeTab === 'reconciliation' ? 'fill-1' : ''
              }`}
            >
              fact_check
            </span>
            <span>กระทบยอดเงินสด</span>
          </button>
        )}

        {can('expenses') && (
          <button
            onClick={() => onTabChange('expenses')}
            className={`w-full text-left rounded-full px-4 py-3 flex items-center gap-4 transition-colors font-medium text-sm cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-[#1E3A5F] text-white shadow-xs'
                : 'text-[#1E293B] hover:bg-[#DCE7F0]'
            }`}
          >
            <span
              className={`material-symbols-outlined ${
                activeTab === 'expenses' ? 'fill-1' : ''
              }`}
            >
              payments
            </span>
            <span>รายจ่ายประจำวัน (Expenses)</span>
          </button>
        )}

        {can('icePurchase') && (
          <button
            onClick={() => onTabChange('icePurchase')}
            className={`w-full text-left rounded-full px-4 py-3 flex items-center gap-4 transition-colors font-medium text-sm cursor-pointer ${
              activeTab === 'icePurchase'
                ? 'bg-[#1E3A5F] text-white shadow-xs'
                : 'text-[#1E293B] hover:bg-[#DCE7F0]'
            }`}
          >
            <span
              className={`material-symbols-outlined ${
                activeTab === 'icePurchase' ? 'fill-1' : ''
              }`}
            >
              shopping_cart
            </span>
            <span>ซื้อน้ำแข็งรายวัน</span>
          </button>
        )}

        {can('attendance') && (
          <button
            onClick={() => onTabChange('attendance')}
            className={`w-full text-left rounded-full px-4 py-3 flex items-center gap-4 transition-colors font-medium text-sm cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-[#1E3A5F] text-white shadow-xs'
                : 'text-[#1E293B] hover:bg-[#DCE7F0]'
            }`}
          >
            <span
              className={`material-symbols-outlined ${
                activeTab === 'attendance' ? 'fill-1' : ''
              }`}
            >
              schedule
            </span>
            <span>วันทำงานพนักงาน</span>
          </button>
        )}

        {can('vehicles') && (
          <button
            onClick={() => onTabChange('vehicles')}
            className={`w-full text-left rounded-full px-4 py-3 flex items-center gap-4 transition-colors font-medium text-sm cursor-pointer ${
              activeTab === 'vehicles'
                ? 'bg-[#1E3A5F] text-white shadow-xs'
                : 'text-[#1E293B] hover:bg-[#DCE7F0]'
            }`}
          >
            <span
              className={`material-symbols-outlined ${
                activeTab === 'vehicles' ? 'fill-1' : ''
              }`}
            >
              local_shipping
            </span>
            <span>รถกระบะ & ซาเล้ง</span>
          </button>
        )}

        {can('assistant') && (
          <button
            onClick={() => onTabChange('assistant')}
            className={`w-full text-left rounded-full px-4 py-3 flex items-center gap-4 transition-colors font-medium text-sm cursor-pointer ${
              activeTab === 'assistant'
                ? 'bg-[#1E3A5F] text-white shadow-xs'
                : 'text-[#1E293B] hover:bg-[#DCE7F0]'
            }`}
          >
            <span
              className={`material-symbols-outlined ${
                activeTab === 'assistant' ? 'fill-1' : ''
              }`}
            >
              smart_toy
            </span>
            <span>ผู้ช่วย AI</span>
          </button>
        )}

        {can('customers') && (
          <div className="pt-4 border-t border-[#D2E0EB] mt-2 space-y-1">
            <div className="px-4 py-2 text-xs font-bold uppercase text-[#64748B] tracking-wider">
              คลังสินค้า & รายงาน
            </div>
            <a
              href="#inventory"
              onClick={(e) => {
                e.preventDefault();
                onTabChange('operations');
              }}
              className="w-full text-left rounded-full px-4 py-2.5 flex items-center gap-4 text-[#1E293B] hover:bg-[#DCE7F0] text-xs font-medium transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">warehouse</span>
              <span>สต็อกน้ำแข็งคงเหลือ</span>
            </a>
            <a
              href="#pricelist"
              onClick={(e) => {
                e.preventDefault();
                onTabChange('customers');
              }}
              className="w-full text-left rounded-full px-4 py-2.5 flex items-center gap-4 text-[#1E293B] hover:bg-[#DCE7F0] text-xs font-medium transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">sell</span>
              <span>ตารางราคาน้ำแข็ง</span>
            </a>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-[#D2E0EB]">
        <div className="bg-white p-3 rounded-2xl border border-[#D2E0EB]">
          <div className="flex items-center gap-2 text-xs text-[#1E3A5F] font-semibold mb-1">
            <span className="material-symbols-outlined text-sm">info</span>
            <span>ระบบบันทึกธารทอง</span>
          </div>
          <p className="text-[11px] text-[#64748B]">
            เชื่อมโยงระบบรับส่งน้ำแข็ง ยอดขาย และรายจ่ายแบบเรียลไทม์
          </p>
        </div>
      </div>
    </aside>
  );
};
