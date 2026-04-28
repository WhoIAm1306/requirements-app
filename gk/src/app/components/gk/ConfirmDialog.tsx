import React from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';
import { ConfirmDialogState } from '../../types/gk';

interface Props {
  dialog: ConfirmDialogState;
  onClose: () => void;
}

export function ConfirmDialog({ dialog, onClose }: Props) {
  const isDanger = dialog.variant === 'danger';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div
        className="relative bg-white rounded-2xl w-full max-w-md overflow-hidden"
        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)' }}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full" style={{ background: isDanger ? '#EF4444' : '#2563EB' }} />

        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: isDanger ? '#FEF2F2' : '#EFF6FF' }}
            >
              {isDanger
                ? <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} />
                : <Info className="w-5 h-5" style={{ color: '#2563EB' }} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-gray-900 mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
                {dialog.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>
                {dialog.message}
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm transition-all"
              style={{ border: '1px solid #DCE3EE', color: '#64748B', background: 'white', fontWeight: 500 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; }}
            >
              Отмена
            </button>
            <button
              onClick={() => { dialog.onConfirm(); onClose(); }}
              className="px-4 py-2 rounded-xl text-sm text-white transition-all"
              style={{ background: isDanger ? '#EF4444' : '#2563EB', fontWeight: 500 }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = isDanger ? '#DC2626' : '#3B82F6';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = isDanger ? '#EF4444' : '#2563EB';
              }}
            >
              {isDanger ? 'Да, удалить' : 'Подтвердить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
