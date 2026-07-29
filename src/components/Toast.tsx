import React, { useEffect } from 'react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3500);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-20 right-4 z-50 bg-[#5A5A40] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-white/20 animate-fadeIn">
      <span className="material-symbols-outlined text-[#EBEBE4]">
        check_circle
      </span>
      <span className="text-xs md:text-sm font-semibold">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-white/70 hover:text-white p-0.5 rounded-full cursor-pointer"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
};
