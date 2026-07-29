import React, { useRef, useState } from 'react';
import { applyBackup, exportBackup, readBackupFile } from '../lib/backup';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose, onShowToast }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleExport = () => {
    exportBackup();
    onShowToast('ดาวน์โหลดไฟล์สำรองข้อมูลแล้ว');
  };

  const handleFileChosen = (file: File | null) => {
    setError('');
    setPendingFile(file);
  };

  const handleConfirmRestore = async () => {
    if (!pendingFile) return;
    try {
      const backup = await readBackupFile(pendingFile);
      applyBackup(backup);
      onShowToast('กู้คืนข้อมูลสำเร็จ กำลังโหลดหน้าใหม่...');
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการกู้คืนข้อมูล');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-[#BAE6FD] max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E0F2FE] flex items-center justify-center text-[#0284C7]">
              <span className="material-symbols-outlined text-xl">backup</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1E3A5F]">สำรอง & กู้คืนข้อมูล</h3>
              <p className="text-xs text-[#64748B]">ป้องกันข้อมูลหายจากการล้างเบราว์เซอร์</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#64748B] hover:bg-[#F1F5F9] rounded-full transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="py-5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
            ดาวน์โหลดไฟล์สำรอง
          </h4>
          <p className="text-xs text-[#64748B]">
            บันทึกข้อมูลทั้งหมด (ลูกค้า, แอดมิน, สายส่ง, รายจ่าย ฯลฯ) เป็นไฟล์ .json ลงเครื่องคอมพิวเตอร์
            ควรทำเป็นประจำ เช่น หลังลงบัญชีหรือแก้ไขข้อมูลสำคัญ
          </p>
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-sm font-bold transition-colors cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-lg">file_download</span>
            ดาวน์โหลดไฟล์สำรองข้อมูลตอนนี้
          </button>
        </div>

        <div className="py-5 border-t border-[#E2E8F0] space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#DC2626]">
            กู้คืนข้อมูลจากไฟล์สำรอง
          </h4>
          <p className="text-xs text-[#64748B]">
            เลือกไฟล์ .json ที่เคยดาวน์โหลดไว้ เพื่อกู้คืนข้อมูล — การกู้คืนจะ
            <strong className="text-[#DC2626]"> เขียนทับข้อมูลปัจจุบันทั้งหมด</strong>
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={(e) => handleFileChosen(e.target.files?.[0] || null)}
            className="w-full text-xs text-[#1E293B] file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#F1F5F9] file:text-[#1E3A5F] hover:file:bg-[#E2E8F0] cursor-pointer"
          />

          {error && (
            <p className="text-xs font-bold text-[#DC2626] bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {pendingFile && !error && (
            <div className="p-3 bg-[#FEF3C7] border border-[#FDE68A] rounded-xl flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#B45309]">
                ยืนยันกู้คืนจากไฟล์ "{pendingFile.name}" ? ข้อมูลปัจจุบันจะถูกแทนที่ทั้งหมด
              </span>
              <button
                onClick={handleConfirmRestore}
                className="px-3 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold rounded-lg cursor-pointer shrink-0"
              >
                ยืนยันกู้คืน
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
