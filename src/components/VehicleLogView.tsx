import React, { useState } from 'react';
import { Vehicle, VehicleLogEntry } from '../types';
import { formatShortDate } from '../lib/statementExport';
import { DateInput } from './DateInput';

interface VehicleLogViewProps {
  vehicles: Vehicle[];
  logEntries: VehicleLogEntry[];
  onOpenVehicleManager: () => void;
  onAddLogEntry: (entry: Omit<VehicleLogEntry, 'id'>) => void;
  onDeleteLogEntry: (id: string) => void;
  onShowToast: (msg: string) => void;
}

const todayStr = () => new Date().toISOString().split('T')[0];

export const VehicleLogView: React.FC<VehicleLogViewProps> = ({
  vehicles,
  logEntries,
  onOpenVehicleManager,
  onAddLogEntry,
  onDeleteLogEntry,
  onShowToast,
}) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [entryDate, setEntryDate] = useState(todayStr());
  const [entryType, setEntryType] = useState<'fuel' | 'repair'>('fuel');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [attachmentDataUrl, setAttachmentDataUrl] = useState<string | undefined>(undefined);
  const [attachmentName, setAttachmentName] = useState<string | undefined>(undefined);

  const currentVehicleId = selectedVehicleId || vehicles[0]?.id || '';
  const currentVehicle = vehicles.find((v) => v.id === currentVehicleId);

  const vehicleEntries = logEntries
    .filter((e) => e.vehicleId === currentVehicleId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      onShowToast('ไฟล์ใหญ่เกินไป กรุณาแนบไฟล์ไม่เกิน 3MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentDataUrl(reader.result as string);
      setAttachmentName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVehicle) {
      onShowToast('กรุณาเพิ่มรถก่อน (กด "จัดการรถ")');
      return;
    }
    if (amount <= 0) {
      onShowToast('กรุณาระบุจำนวนเงิน');
      return;
    }

    onAddLogEntry({
      vehicleId: currentVehicle.id,
      vehiclePlate: currentVehicle.plateNumber,
      date: entryDate,
      type: entryType,
      amount,
      description: description.trim() || (entryType === 'fuel' ? 'เติมน้ำมัน' : 'ค่าซ่อม'),
      attachmentDataUrl,
      attachmentName,
    });

    setAmount(0);
    setDescription('');
    setAttachmentDataUrl(undefined);
    setAttachmentName(undefined);
    onShowToast(`บันทึกรายการของทะเบียน "${currentVehicle.plateNumber}" เรียบร้อยแล้ว`);
  };

  return (
    <div className="space-y-6 pb-24">
      <section className="bg-white p-4 sm:p-5 rounded-2xl border border-[#D2E0EB] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-[#1E3A5F] flex items-center gap-2 font-sans">
              <span className="material-symbols-outlined text-[#0284C7]">local_shipping</span>
              รถกระบะ & ซาเล้ง
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              บันทึกค่าน้ำมัน/ค่าซ่อมแต่ละคัน พร้อมแนบบิลจริง — บันทึกไว้ดูอย่างเดียว ไม่คำนวณอัตโนมัติ
            </p>
          </div>
          <button
            onClick={onOpenVehicleManager}
            className="px-3.5 py-2 bg-white border border-[#CBD5E1] text-[#1E3A5F] rounded-xl text-xs font-bold hover:bg-[#F1F5F9] transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <span className="material-symbols-outlined text-sm">tune</span>
            จัดการรถ
          </button>
        </div>

        {vehicles.length === 0 ? (
          <div className="bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs font-semibold px-4 py-3 rounded-2xl flex items-start gap-2">
            <span className="material-symbols-outlined text-base">warning</span>
            <span>ยังไม่มีรถในระบบ — กด "จัดการรถ" เพื่อเพิ่มทะเบียนแรก</span>
          </div>
        ) : (
          <>
            <div>
              <label className="text-xs font-bold text-[#1E3A5F] block mb-1">เลือกรถ</label>
              <select
                value={currentVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full sm:w-72 px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm font-bold text-[#1E3A5F] focus:ring-2 focus:ring-[#0284C7] outline-none"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber} {v.note ? `(${v.note})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Entry Form */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#E2E8F0]">
              <div>
                <label className="text-xs font-bold text-[#1E3A5F] block mb-1">วันที่</label>
                <DateInput
                  value={entryDate}
                  onChange={setEntryDate}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm font-bold text-[#1E3A5F] focus:ring-2 focus:ring-[#0284C7] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1E3A5F] block mb-1">ประเภทรายการ</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEntryType('fuel')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                      entryType === 'fuel'
                        ? 'bg-[#0284C7] text-white border-[#0284C7]'
                        : 'bg-white text-[#64748B] border-[#CBD5E1]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">local_gas_station</span>
                    เติมน้ำมัน
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryType('repair')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                      entryType === 'repair'
                        ? 'bg-[#DC2626] text-white border-[#DC2626]'
                        : 'bg-white text-[#64748B] border-[#CBD5E1]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">build</span>
                    ค่าซ่อม
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1E3A5F] block mb-1">จำนวนเงิน (บาท)</label>
                <input
                  type="number"
                  min="0"
                  value={amount || ''}
                  placeholder="0"
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-[#CBD5E1] rounded-xl text-sm font-bold text-[#1E3A5F] data-mono focus:ring-2 focus:ring-[#0284C7] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1E3A5F] block mb-1">รายละเอียด</label>
                <input
                  type="text"
                  placeholder={entryType === 'fuel' ? 'เช่น เติมดีเซล' : 'เช่น เปลี่ยนยาง'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-[#CBD5E1] rounded-xl text-sm focus:ring-2 focus:ring-[#0284C7] outline-none"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-3">
                <label className="px-3.5 py-2 bg-[#F0F9FF] border border-[#BAE6FD] text-[#0369A1] rounded-xl text-xs font-bold cursor-pointer hover:bg-[#E0F2FE] transition-colors flex items-center gap-1.5 w-fit">
                  <span className="material-symbols-outlined text-sm">attach_file</span>
                  + แนบบิล
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
                </label>
                {attachmentName && (
                  <span className="text-xs font-semibold text-[#16A34A] flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    {attachmentName}
                  </span>
                )}
                <button
                  type="submit"
                  className="ml-auto px-5 py-2 bg-[#1E3A5F] hover:bg-[#152C4A] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  บันทึกรายการ
                </button>
              </div>
            </form>
          </>
        )}
      </section>

      {/* History */}
      {currentVehicle && (
        <section className="bg-white rounded-2xl border border-[#D2E0EB] shadow-xs overflow-hidden">
          <div className="bg-[#EBF2F7] px-4 py-3 border-b border-[#D2E0EB] flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#1E3A5F] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0284C7] text-lg">history</span>
              ประวัติของทะเบียน {currentVehicle.plateNumber}
            </h3>
            <span className="text-xs font-bold text-[#64748B]">{vehicleEntries.length} รายการ</span>
          </div>

          {vehicleEntries.length === 0 ? (
            <div className="p-8 text-center text-[#94A3B8] text-sm">ยังไม่มีประวัติของรถคันนี้</div>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {vehicleEntries.map((entry) => (
                <div key={entry.id} className="p-3.5 flex items-center gap-3 hover:bg-[#F8FAFC] transition-colors">
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      entry.type === 'fuel'
                        ? 'bg-[#E0F2FE] text-[#0284C7]'
                        : 'bg-[#FEE2E2] text-[#DC2626]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {entry.type === 'fuel' ? 'local_gas_station' : 'build'}
                    </span>
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-[#1E293B]">{entry.description}</span>
                      <span className="text-[10px] text-[#64748B]">{formatShortDate(entry.date)}</span>
                    </div>
                    {entry.attachmentDataUrl && (
                      <a
                        href={entry.attachmentDataUrl}
                        download={entry.attachmentName}
                        className="text-[11px] font-semibold text-[#0284C7] hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <span className="material-symbols-outlined text-xs">attach_file</span>
                        {entry.attachmentName || 'ไฟล์แนบ'}
                      </a>
                    )}
                  </div>

                  <span className="font-bold text-sm text-[#1E3A5F] data-mono whitespace-nowrap">
                    ฿ {entry.amount.toLocaleString()}
                  </span>

                  <button
                    onClick={() => onDeleteLogEntry(entry.id)}
                    className="p-1.5 text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
