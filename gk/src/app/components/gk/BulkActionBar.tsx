import React from 'react';
import { Archive, ArchiveRestore, Trash2, X, CheckSquare } from 'lucide-react';
import { UserRole } from '../../types/gk';

interface Props {
  count: number;
  role: UserRole;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onClear: () => void;
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${n} ${many}`;
  if (mod10 === 1) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} ${few}`;
  return `${n} ${many}`;
}

export function BulkActionBar({ count, role, onArchive, onRestore, onDelete, onClear }: Props) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-2xl"
      style={{
        background: '#0F172A',
        border: '1px solid #1E293B',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
        minWidth: 380,
      }}
    >
      {/* Selection count */}
      <div className="flex items-center gap-2 pr-3" style={{ borderRight: '1px solid #334155' }}>
        <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <CheckSquare className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-white text-sm" style={{ fontWeight: 600 }}>
          {pluralize(count, 'запись выбрана', 'записи выбраны', 'записей выбрано')}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 pl-1">
        <ActionBtn onClick={onArchive} icon={<Archive className="w-3.5 h-3.5" />} label="Архивировать" color="#F59E0B" hoverBg="#1E293B" />
        <ActionBtn onClick={onRestore} icon={<ArchiveRestore className="w-3.5 h-3.5" />} label="Восстановить" color="#22C55E" hoverBg="#1E293B" />
        {role === 'superuser' && (
          <ActionBtn onClick={onDelete} icon={<Trash2 className="w-3.5 h-3.5" />} label="Удалить" color="#EF4444" hoverBg="#1E293B" danger />
        )}
      </div>

      {/* Clear */}
      <button
        onClick={onClear}
        className="ml-2 p-1.5 rounded-lg transition-all flex items-center gap-1 text-slate-400 hover:text-white"
        title="Снять выделение"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ActionBtn({
  onClick, icon, label, color, hoverBg, danger,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color: string;
  hoverBg: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all"
      style={{ color, background: 'transparent', border: `1px solid ${danger ? '#7F1D1D' : '#1E293B'}` }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = danger ? '#7F1D1D33' : hoverBg;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      {icon}
      <span style={{ fontWeight: 500 }}>{label}</span>
    </button>
  );
}
