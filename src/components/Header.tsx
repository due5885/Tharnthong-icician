import React from 'react';
import { RoleLevel } from '../types';
import { resolveAdminAvatarByName } from '../lib/adminAvatars';
import { DateInput } from './DateInput';

interface HeaderProps {
  onSearchToggle?: () => void;
  showSearch?: boolean;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  currentShift?: string;
  onShiftChange?: (shift: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  activeAdminName: string;
  roleLevel: RoleLevel;
  onOpenManageAdmins: () => void;
  onOpenBackup: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSearchToggle,
  showSearch,
  searchQuery,
  onSearchChange,
  currentShift = 'Shift A',
  onShiftChange,
  selectedDate,
  onDateChange,
  activeAdminName,
  roleLevel,
  onOpenManageAdmins,
  onOpenBackup,
  onLogout,
}) => {
  const avatarUrl = resolveAdminAvatarByName(activeAdminName);
  const AdminAvatar = () =>
    avatarUrl ? (
      <img src={avatarUrl} alt={activeAdminName} className="w-4 h-4 rounded-full object-cover shrink-0" />
    ) : (
      <span className="material-symbols-outlined text-sm text-[#A2D2FF]">
        {roleLevel === 'owner' ? 'manage_accounts' : 'person'}
      </span>
    );

  return (
    <header className="bg-[#1E3A5F] text-white fixed top-0 w-full z-50 shadow-xs flex justify-between items-center px-3 md:px-8 h-16 transition-all border-b border-[#152C4A]">
      <div className="flex items-center gap-2 md:gap-3">
        <span className="material-symbols-outlined text-[#A2D2FF] text-2xl md:text-3xl">
          ac_unit
        </span>
        <div className="flex flex-col">
          <h1 className="font-bold text-base md:text-xl tracking-tight text-white uppercase font-sans leading-none">
            THARNTHONG ICE
          </h1>
          <span className="text-[10px] text-[#A2D2FF] font-medium hidden sm:inline-block">
            โรงน้ำแข็งธารทอง
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Date Selector */}
        <div className="flex items-center gap-1 bg-white/15 hover:bg-white/20 border border-white/20 rounded-full px-2.5 py-1 text-xs font-semibold text-white transition-all">
          <span className="material-symbols-outlined text-sm text-[#A2D2FF]">calendar_month</span>
          <DateInput
            value={selectedDate}
            onChange={onDateChange}
            className="bg-transparent text-white focus:outline-none text-xs cursor-pointer font-sans w-[4.5rem] data-mono"
          />
        </div>

        {showSearch && onSearchChange && (
          <div className="relative animate-fadeIn hidden lg:block">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-white/70 text-sm">
              search
            </span>
            <input
              type="text"
              placeholder="ค้นหาลูกค้า/รายการ..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-full text-xs bg-white/15 text-white placeholder-white/70 border border-white/20 focus:outline-none focus:bg-white focus:text-[#1E293B] transition-all w-36 sm:w-48"
            />
          </div>
        )}

        {/* Shift Badge Selector */}
        {onShiftChange && (
          <select
            value={currentShift}
            onChange={(e) => onShiftChange(e.target.value)}
            className="hidden sm:block bg-white/15 text-white text-xs border border-white/20 rounded-full px-2.5 py-1 font-medium focus:outline-none cursor-pointer"
          >
            <option value="Shift A" className="text-[#1E293B]">กะ A (06:00 - 14:00)</option>
            <option value="Shift B" className="text-[#1E293B]">กะ B (14:00 - 22:00)</option>
            <option value="Shift Night" className="text-[#1E293B]">กะ ดึก (22:00 - 06:00)</option>
          </select>
        )}

        {/* Backup/Restore Trigger — owner only */}
        {roleLevel === 'owner' && (
          <button
            onClick={onOpenBackup}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 px-2.5 py-1 rounded-full text-xs font-bold text-white transition-all cursor-pointer"
            title="สำรอง & กู้คืนข้อมูล"
          >
            <span className="material-symbols-outlined text-sm text-[#A2D2FF]">backup</span>
            <span className="hidden md:inline">สำรองข้อมูล</span>
          </button>
        )}

        {/* Admin Manage Trigger — owner only */}
        {roleLevel === 'owner' ? (
          <button
            onClick={onOpenManageAdmins}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 px-2.5 py-1 rounded-full text-xs font-bold text-white transition-all cursor-pointer"
            title="จัดการรายชื่อ Admin/พนักงาน"
          >
            <AdminAvatar />
            <span className="max-w-[100px] truncate hidden md:inline">{activeAdminName}</span>
            <span className="material-symbols-outlined text-xs">arrow_drop_down</span>
          </button>
        ) : (
          <span className="flex items-center gap-1.5 bg-white/10 border border-white/20 px-2.5 py-1 rounded-full text-xs font-bold text-white">
            <AdminAvatar />
            <span className="max-w-[100px] truncate hidden md:inline">{activeAdminName}</span>
          </span>
        )}

        {/* Logout */}
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 bg-white/15 hover:bg-[#DC2626] border border-white/20 px-2.5 py-1 rounded-full text-xs font-bold text-white transition-all cursor-pointer"
          title="ออกจากระบบ"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          <span className="hidden md:inline">ออกจากระบบ</span>
        </button>
      </div>
    </header>
  );
};

