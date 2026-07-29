import React, { useState } from 'react';
import { AdminUser } from '../types';
import { resolveAdminAvatarByName } from '../lib/adminAvatars';

interface LoginViewProps {
  admins: AdminUser[];
  onLoginSuccess: (adminId: string) => void;
}

const ROLE_LABELS: Record<AdminUser['roleLevel'], string> = {
  owner: 'เจ้าของร้าน',
  accountant: 'ฝ่ายบัญชี',
  staff: 'พนักงานส่ง',
};

const MAX_PIN_LENGTH = 12;

export const LoginView: React.FC<LoginViewProps> = ({ admins, onLoginSuccess }) => {
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectAdmin = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setPinInput('');
    setErrorMsg('');
  };

  const handleBack = () => {
    setSelectedAdmin(null);
    setPinInput('');
    setErrorMsg('');
  };

  const handleKeyPress = (num: string) => {
    if (!selectedAdmin || pinInput.length >= MAX_PIN_LENGTH) return;
    setPinInput((prev) => prev + num);
    setErrorMsg('');
  };

  const handleConfirm = () => {
    if (!selectedAdmin || !pinInput) return;
    if (pinInput === selectedAdmin.pin) {
      onLoginSuccess(selectedAdmin.id);
    } else {
      setErrorMsg('รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
      setPinInput('');
    }
  };

  const handleDelete = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setPinInput('');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-[#F2F6FA] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-[#BAE6FD] shadow-2xl p-6 sm:p-8 max-w-md w-full text-center space-y-6 relative overflow-hidden">
        <div className="w-16 h-16 rounded-3xl bg-[#E0F2FE] text-[#0284C7] mx-auto flex items-center justify-center shadow-inner">
          <span className="material-symbols-outlined text-3xl">ac_unit</span>
        </div>

        <div>
          <h2 className="text-xl font-bold text-[#1E3A5F]">THARNTHONG ICE</h2>
          <p className="text-xs text-[#64748B] mt-1">
            {selectedAdmin
              ? `กรอกรหัส PIN ของ ${selectedAdmin.name}`
              : 'เลือกชื่อผู้ใช้งานเพื่อเข้าสู่ระบบ'}
          </p>
        </div>

        {!selectedAdmin ? (
          <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar text-left">
            {admins.map((admin) => {
              const avatarUrl = resolveAdminAvatarByName(admin.name);
              return (
              <button
                key={admin.id}
                type="button"
                onClick={() => handleSelectAdmin(admin)}
                className="w-full p-3 rounded-2xl border border-[#D2E0EB] bg-[#F8FAFC] hover:bg-[#E0F2FE] hover:border-[#0284C7] transition-all cursor-pointer flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-[#0284C7] text-white flex items-center justify-center shrink-0 overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={admin.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-lg">person</span>
                  )}
                </div>
                <div className="text-left min-w-0">
                  <div className="font-bold text-sm text-[#1E293B] truncate">{admin.name}</div>
                  <div className="text-[11px] text-[#64748B]">{ROLE_LABELS[admin.roleLevel]}</div>
                </div>
                <span className="material-symbols-outlined text-[#94A3B8] ml-auto">chevron_right</span>
              </button>
              );
            })}
          </div>
        ) : (
          <>
            {/* PIN Display */}
            <div className="flex flex-wrap justify-center items-center gap-2 py-2 min-h-[2rem] max-w-xs mx-auto">
              {pinInput.length === 0 ? (
                <span className="text-xs text-[#94A3B8]">ยังไม่ได้กรอก PIN</span>
              ) : (
                Array.from({ length: pinInput.length }).map((_, idx) => (
                  <div
                    key={idx}
                    className="w-4 h-4 rounded-full bg-[#0284C7] border-2 border-[#0284C7] shadow-xs"
                  />
                ))
              )}
            </div>

            {errorMsg && (
              <p className="text-xs font-bold text-[#DC2626] bg-[#FEE2E2] py-1.5 px-3 rounded-xl border border-[#FCA5A5] animate-shake">
                {errorMsg}
              </p>
            )}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto pt-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(num)}
                  className="h-14 rounded-2xl bg-[#F8FAFC] hover:bg-[#E0F2FE] hover:text-[#0284C7] border border-[#E2E8F0] font-bold text-xl text-[#1E3A5F] data-mono active:scale-95 transition-all shadow-2xs cursor-pointer flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="h-14 rounded-2xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B] font-bold text-xs uppercase active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              >
                ล้าง
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="h-14 rounded-2xl bg-[#F8FAFC] hover:bg-[#E0F2FE] hover:text-[#0284C7] border border-[#E2E8F0] font-bold text-xl text-[#1E3A5F] data-mono active:scale-95 transition-all shadow-2xs cursor-pointer flex items-center justify-center"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="h-14 rounded-2xl bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] font-bold active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                title="ลบตัวเลข"
              >
                <span className="material-symbols-outlined text-xl">backspace</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!pinInput}
              className="w-full max-w-xs mx-auto h-12 rounded-2xl bg-[#0284C7] hover:bg-[#0369A1] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">login</span>
              ยืนยันเข้าสู่ระบบ
            </button>

            <button
              type="button"
              onClick={handleBack}
              className="text-xs font-bold text-[#64748B] hover:text-[#1E3A5F] hover:underline cursor-pointer"
            >
              ← เลือกชื่อใหม่
            </button>
          </>
        )}
      </div>
    </div>
  );
};
