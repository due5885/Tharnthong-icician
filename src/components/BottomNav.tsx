import React from 'react';
import { RoleLevel, TabType } from '../types';
import { canAccessTab } from '../lib/permissions';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  roleLevel: RoleLevel;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, roleLevel }) => {
  const allTabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'operations', label: 'ขึ้น-เหลือน้ำแข็ง', icon: 'inventory_2' },
    { id: 'customers', label: 'ลงบัญชี', icon: 'group' },
    { id: 'customerDetails', label: 'รายละเอียด', icon: 'badge' },
    { id: 'creditCustomers', label: 'เครดิต', icon: 'event_repeat' },
    { id: 'warehouse', label: 'โกดัง', icon: 'warehouse' },
    { id: 'summary', label: 'สรุป', icon: 'analytics' },
    { id: 'reconciliation', label: 'กระทบยอด', icon: 'fact_check' },
    { id: 'expenses', label: 'รายจ่าย', icon: 'payments' },
    { id: 'icePurchase', label: 'ซื้อน้ำแข็ง', icon: 'shopping_cart' },
    { id: 'attendance', label: 'วันทำงาน', icon: 'schedule' },
    { id: 'vehicles', label: 'รถ/ซาเล้ง', icon: 'local_shipping' },
    { id: 'assistant', label: 'ผู้ช่วย AI', icon: 'smart_toy' },
  ];

  const tabs = allTabs.filter((t) => canAccessTab(roleLevel, t.id));

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 bg-[#EBF2F7] border-t border-[#D2E0EB] shadow-md flex justify-around items-center h-20 px-2 pb-safe">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center transition-all duration-150 active:scale-90 px-4 py-1.5 rounded-full cursor-pointer relative ${
              isActive
                ? 'bg-[#1E3A5F] text-white font-semibold shadow-xs'
                : 'text-[#1E293B] hover:bg-[#DCE7F0] opacity-80'
            }`}
          >
            <div className="relative">
              <span
                className={`material-symbols-outlined text-2xl ${
                  isActive ? 'fill-1' : ''
                }`}
              >
                {tab.icon}
              </span>
            </div>
            <span className="text-xs font-medium tracking-wide mt-0.5">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
