import React from 'react';

interface GameAlertProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
}

export const GameAlert: React.FC<GameAlertProps> = ({ isOpen, message, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
        <h3 className="text-lg font-bold text-zinc-100 mb-4">Notification</h3>
        <p className="text-zinc-300 mb-6">{message}</p>
        <button
          onClick={onClose}
          className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          Oke
        </button>
      </div>
    </div>
  );
};
