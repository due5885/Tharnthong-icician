import React, { useState } from 'react';
import { CustomerAccount, IceBucketHolding } from '../types';

interface IceBucketManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerAccount | null;
  onUpdateCustomer: (id: string, updated: Partial<CustomerAccount>) => void;
  onShowToast: (msg: string) => void;
}

const BUCKET_SIZES = [
  'ถัง 100 ลิตร',
  'ถัง 200 ลิตร',
  'ถัง 300 ลิตร',
  'ถัง 500 ลิตร',
  'ถัง 1,000 ลิตร',
  'ถังฝาโชว์ / แสตนเลส',
];

export const IceBucketManagerModal: React.FC<IceBucketManagerModalProps> = ({
  isOpen,
  onClose,
  customer,
  onUpdateCustomer,
  onShowToast,
}) => {
  const [selectedSize, setSelectedSize] = useState(BUCKET_SIZES[1]);
  const [customSizeText, setCustomSizeText] = useState('');
  const [count, setCount] = useState<number>(1);
  const [note, setNote] = useState('');

  if (!isOpen || !customer) return null;

  const currentBuckets = customer.iceBuckets || [];

  const handleAddBucket = (e: React.FormEvent) => {
    e.preventDefault();
    if (count <= 0) return;

    const finalSize = selectedSize === 'CUSTOM' ? customSizeText.trim() : selectedSize;
    if (!finalSize) {
      onShowToast('กรุณาระบุขนาดถังน้ำแข็ง');
      return;
    }

    const newBucket: IceBucketHolding = {
      id: `BUCKET-${Date.now()}`,
      bucketSize: finalSize,
      count,
      note: note.trim() || undefined,
    };

    const updatedBuckets = [...currentBuckets, newBucket];
    onUpdateCustomer(customer.id, { iceBuckets: updatedBuckets });
    onShowToast(`เพิ่มถังน้ำแข็ง "${finalSize}" จำนวน ${count} ใบ ให้ "${customer.name}" เรียบร้อยแล้ว`);

    setNote('');
    setCount(1);
    if (selectedSize === 'CUSTOM') {
      setCustomSizeText('');
    }
  };

  const handleDeleteBucket = (bucketId: string, sizeName: string) => {
    const updated = currentBuckets.filter((b) => b.id !== bucketId);
    onUpdateCustomer(customer.id, { iceBuckets: updated });
    onShowToast(`ลบถังน้ำแข็ง "${sizeName}" ออกแล้ว`);
  };

  const handleUpdateCount = (bucketId: string, delta: number) => {
    const updated = currentBuckets.map((b) => {
      if (b.id === bucketId) {
        return { ...b, count: Math.max(1, b.count + delta) };
      }
      return b;
    });
    onUpdateCustomer(customer.id, { iceBuckets: updated });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-[#BAE6FD]">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">inventory</span>
            </div>
            <div>
              <h3 className="font-bold text-[#1E3A5F]">จัดการถังน้ำแข็งประจำร้าน</h3>
              <p className="text-xs text-[#0284C7] font-semibold">{customer.name} ({customer.code})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#64748B] hover:bg-[#F1F5F9] rounded-full transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Current Buckets List */}
        <div className="py-4 space-y-3">
          <h4 className="text-xs font-bold uppercase text-[#64748B]">
            ถังน้ำแข็งที่ฝากไว้ที่ร้าน ({currentBuckets.reduce((sum, b) => sum + b.count, 0)} ใบ)
          </h4>

          {currentBuckets.length === 0 ? (
            <div className="text-center py-6 bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl text-xs text-[#94A3B8]">
              ยังไม่มีข้อมูลถังน้ำแข็งฝากไว้ที่ร้านนี้
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
              {currentBuckets.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl"
                >
                  <div>
                    <span className="font-bold text-xs text-[#1E3A5F] block">🪣 {b.bucketSize}</span>
                    {b.note && <span className="text-[11px] text-[#64748B]">{b.note}</span>}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white border border-[#CBD5E1] rounded-xl px-2 py-0.5 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => handleUpdateCount(b.id, -1)}
                        className="w-5 h-5 flex items-center justify-center bg-[#F1F5F9] hover:bg-[#CBD5E1] rounded-md text-[#1E3A5F]"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-[#0284C7]">{b.count} ใบ</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateCount(b.id, 1)}
                        className="w-5 h-5 flex items-center justify-center bg-[#F1F5F9] hover:bg-[#CBD5E1] rounded-md text-[#1E3A5F]"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteBucket(b.id, b.bucketSize)}
                      className="p-1 text-[#94A3B8] hover:text-[#DC2626] rounded-lg"
                      title="ลบถังนี้"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Bucket Form */}
        <form onSubmit={handleAddBucket} className="pt-3 border-t border-[#E2E8F0] space-y-3">
          <h4 className="text-xs font-bold text-[#1E3A5F]">เพิ่มถังน้ำแข็งให้ร้านนี้</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-[#64748B]">ขนาดถังน้ำแข็ง</label>
              <select
                value={selectedSize}
                onChange={(e) => {
                  setSelectedSize(e.target.value);
                  if (e.target.value !== 'CUSTOM') {
                    setCustomSizeText('');
                  }
                }}
                className="w-full mt-1 px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs font-semibold text-[#1E3A5F] focus:ring-2 focus:ring-[#0284C7] outline-none cursor-pointer"
              >
                {BUCKET_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="CUSTOM">✏️ กำหนดขนาดเอง...</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#64748B]">จำนวน (ใบ)</label>
              <input
                type="number"
                min="1"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                className="w-full mt-1 px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#0284C7] text-center focus:ring-2 focus:ring-[#0284C7] outline-none"
              />
            </div>
          </div>

          {selectedSize === 'CUSTOM' && (
            <div className="animate-fadeIn">
              <label className="text-[11px] font-semibold text-[#0284C7]">ระบุขนาดถังน้ำแข็งเอง</label>
              <input
                type="text"
                required
                placeholder="เช่น ถัง 150 ลิตร, ถังทรงสี่เหลี่ยม 80 ลิตร"
                value={customSizeText}
                onChange={(e) => setCustomSizeText(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-[#0284C7] bg-[#F0F9FF] rounded-xl text-xs font-semibold text-[#1E3A5F] focus:ring-2 focus:ring-[#0284C7] outline-none"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-[#64748B]">หมายเหตุ / จุดติดตั้ง</label>
            <input
              type="text"
              placeholder="เช่น สีส้ม วางข้างแคชเชียร์"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs focus:ring-2 focus:ring-[#0284C7] outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
            >
              เสร็จสิ้น
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0284C7] text-white rounded-xl text-xs font-bold hover:bg-[#0369A1] shadow-xs cursor-pointer"
            >
              + เพิ่มถัง
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
