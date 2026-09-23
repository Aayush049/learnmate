import React from 'react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel" }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-gray-700 font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {cancelText}
            </button>
            <button 
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-2 text-white font-medium bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
