import React from 'react';
import { Plus, Download, BookOpen, LayoutList, LayoutGrid, Shield } from 'lucide-react';
import { UserRole } from '../../types/gk';

const roleConfig: Record<UserRole, { label: string; color: string; bg: string }> = {
  superuser: { label: 'Superuser', color: '#16A34A', bg: '#DCFCE7' },
  edit:      { label: 'Edit',      color: '#D97706', bg: '#FEF3C7' },
  read:      { label: 'Read',      color: '#64748B', bg: '#F1F5F9' },
};

interface Props {
  role: UserRole;
  onRoleChange: (r: UserRole) => void;
  onAddGK: () => void;
  onExport: () => void;
  viewMode: 'list' | 'cards';
  onViewModeChange: (v: 'list' | 'cards') => void;
  totalCount: number;
}

export function AppHeader({ role, onRoleChange, onAddGK, onExport, viewMode, onViewModeChange, totalCount }: Props) {
  const rc = roleConfig[role];
  return (
    <header
      className="flex items-center gap-4 px-5 flex-shrink-0"
      style={{ height: 52, background: '#0F172A', borderBottom: '1px solid #1E293B' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#2563EB,#7C3AED)' }}>
          <BookOpen className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <span className="text-white" style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>
            Справочник ГК
          </span>
          <span className="ml-2" style={{ fontSize: 10, color: '#334155', fontWeight: 500 }}>
            {totalCount} записей
          </span>
        </div>
      </div>

      <div className="flex-1" />

      {/* View toggle */}
      <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #1E293B', background: '#0B1120' }}>
        {([['list', <LayoutList className="w-3.5 h-3.5" />], ['cards', <LayoutGrid className="w-3.5 h-3.5" />]] as const).map(([v, icon]) => (
          <button
            key={v}
            onClick={() => onViewModeChange(v)}
            className="flex items-center gap-1.5 px-3 py-1.5 transition-all"
            style={{
              fontSize: 11, cursor: 'pointer', border: 'none',
              background: viewMode === v ? '#1E293B' : 'transparent',
              color: viewMode === v ? '#60A5FA' : '#475569',
            }}
            onMouseEnter={(e) => { if (viewMode !== v) (e.currentTarget as HTMLButtonElement).style.color = '#94A3B8'; }}
            onMouseLeave={(e) => { if (viewMode !== v) (e.currentTarget as HTMLButtonElement).style.color = '#475569'; }}
          >
            {icon}
            <span>{v === 'list' ? 'Реестр' : 'Карточки'}</span>
          </button>
        ))}
      </div>

      {/* Export */}
      <button
        onClick={onExport}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all"
        style={{ fontSize: 12, color: '#475569', background: 'transparent', border: '1px solid #1E293B', cursor: 'pointer' }}
        onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.color = '#94A3B8'; el.style.background = '#1E293B'; }}
        onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.color = '#475569'; el.style.background = 'transparent'; }}
      >
        <Download className="w-3.5 h-3.5" />
        Экспорт
      </button>

      {/* Add GK */}
      {role !== 'read' && (
        <button
          onClick={onAddGK}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-white transition-all"
          style={{ fontSize: 12.5, fontWeight: 600, background: '#2563EB', border: 'none', cursor: 'pointer' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#3B82F6'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#2563EB'; }}
        >
          <Plus className="w-3.5 h-3.5" />
          Создать ГК
        </button>
      )}

      {/* Role pill */}
      <div className="flex items-center gap-2 pl-2" style={{ borderLeft: '1px solid #1E293B' }}>
        <Shield className="w-3 h-3" style={{ color: '#334155' }} />
        <div className="flex rounded-full overflow-hidden" style={{ background: '#0B1120', border: '1px solid #1E293B' }}>
          {(['superuser', 'edit', 'read'] as UserRole[]).map((r) => {
            const { label, color, bg } = roleConfig[r];
            return (
              <button
                key={r}
                onClick={() => onRoleChange(r)}
                className="px-2.5 py-1 transition-all"
                style={{
                  fontSize: 10, fontWeight: 500, cursor: 'pointer', border: 'none',
                  background: role === r ? bg : 'transparent',
                  color: role === r ? color : '#334155',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
