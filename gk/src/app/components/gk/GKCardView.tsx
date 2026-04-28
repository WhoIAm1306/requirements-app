import React from 'react';
import { Layers, Zap, Edit2, Archive, ArchiveRestore, Calendar, MoreHorizontal } from 'lucide-react';
import { GK, UserRole } from '../../types/gk';
import { GKStatusBadge } from './StatusBadge';

interface Props {
  gks: GK[];
  selectedGkId: string | null;
  onSelectGk: (gk: GK) => void;
  role: UserRole;
  onEdit: (gk: GK) => void;
  onArchive: (gk: GK) => void;
  onRestore: (gk: GK) => void;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function GKCardView({ gks, selectedGkId, onSelectGk, role, onEdit, onArchive, onRestore }: Props) {
  if (gks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-56 gap-3" style={{ background: '#F5F7FA' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#EFF6FF' }}>
          <Layers className="w-8 h-8" style={{ color: '#93C5FD' }} />
        </div>
        <div className="text-center">
          <p className="text-sm" style={{ color: '#1F2937', fontWeight: 500 }}>Нет данных</p>
          <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Попробуйте изменить фильтры</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-auto" style={{ background: '#F5F7FA' }}>
      {gks.map((gk) => {
        const totalFns = gk.stages.reduce((s, st) => s + st.functions.length, 0);
        const isActive = selectedGkId === gk.id;

        return (
          <div
            key={gk.id}
            onClick={() => onSelectGk(gk)}
            className="bg-white rounded-2xl cursor-pointer transition-all group relative overflow-hidden"
            style={{
              border: `2px solid ${isActive ? '#2563EB' : '#DCE3EE'}`,
              boxShadow: isActive
                ? '0 0 0 4px rgba(37,99,235,0.12), 0 4px 12px rgba(0,0,0,0.06)'
                : '0 2px 8px rgba(0,0,0,0.04)',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                const el = e.currentTarget as HTMLDivElement;
                el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
                el.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                const el = e.currentTarget as HTMLDivElement;
                el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                el.style.transform = 'translateY(0)';
              }
            }}
          >
            {/* Top accent */}
            <div className="h-1 w-full" style={{ background: isActive ? '#2563EB' : '#F1F5F9' }} />

            <div className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-snug truncate-2" style={{ color: '#1F2937', fontWeight: 600, lineHeight: 1.4 }} title={gk.name}>
                    {gk.name.length > 65 ? gk.name.slice(0, 65) + '…' : gk.name}
                  </p>
                </div>
                <GKStatusBadge status={gk.status} />
              </div>

              {/* Codes */}
              <div className="flex items-center gap-2 mb-3">
                <code
                  className="text-xs px-2 py-0.5 rounded-md"
                  style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', fontWeight: 600 }}
                >
                  {gk.shortName}
                </code>
                <span className="text-xs font-mono truncate" style={{ color: '#94A3B8' }}>{gk.code}</span>
              </div>

              {/* Customer */}
              <p className="text-xs mb-4 truncate" style={{ color: '#64748B' }}>{gk.customer}</p>

              {/* Stats row */}
              <div className="flex items-center gap-0 mb-4 rounded-xl overflow-hidden" style={{ border: '1px solid #F1F5F9' }}>
                <StatChip icon={<Layers className="w-3.5 h-3.5" />} value={gk.stages.length} label="эт." color="#2563EB" bg="#EFF6FF" />
                <div className="w-px self-stretch" style={{ background: '#F1F5F9' }} />
                <StatChip icon={<Zap className="w-3.5 h-3.5" />} value={totalFns} label="фун." color="#22C55E" bg="#F0FDF4" />
                <div className="w-px self-stretch" style={{ background: '#F1F5F9' }} />
                <div className="flex items-center gap-1 flex-1 px-3 py-2">
                  <Calendar className="w-3 h-3" style={{ color: '#94A3B8' }} />
                  <span className="text-xs" style={{ color: '#94A3B8' }}>{fmt(gk.updatedAt)}</span>
                </div>
              </div>

              {/* Actions */}
              {role !== 'read' && (
                <div
                  className="flex items-center gap-1.5 pt-3"
                  style={{ borderTop: '1px solid #F1F5F9' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => onEdit(gk)}
                    className="flex-1 py-1.5 text-xs rounded-xl transition-all text-center"
                    style={{ color: '#2563EB', border: '1px solid #BFDBFE', background: 'white', fontWeight: 500 }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#EFF6FF'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; }}
                  >
                    <Edit2 className="w-3 h-3 inline mr-1" />
                    Изменить
                  </button>
                  {gk.status === 'active' ? (
                    <button
                      onClick={() => onArchive(gk)}
                      className="flex-1 py-1.5 text-xs rounded-xl transition-all text-center"
                      style={{ color: '#F59E0B', border: '1px solid #FDE68A', background: 'white', fontWeight: 500 }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFBEB'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; }}
                    >
                      <Archive className="w-3 h-3 inline mr-1" />
                      Архив
                    </button>
                  ) : (
                    <button
                      onClick={() => onRestore(gk)}
                      className="flex-1 py-1.5 text-xs rounded-xl transition-all text-center"
                      style={{ color: '#22C55E', border: '1px solid #BBF7D0', background: 'white', fontWeight: 500 }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F0FDF4'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; }}
                    >
                      <ArchiveRestore className="w-3 h-3 inline mr-1" />
                      Вернуть
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatChip({
  icon, value, label, color, bg,
}: {
  icon: React.ReactNode; value: number; label: string; color: string; bg: string;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-1 px-3 py-2" style={{ color }}>
      <span style={{ color, opacity: value > 0 ? 1 : 0.3 }}>{icon}</span>
      <span className="text-xs" style={{ fontWeight: value > 0 ? 600 : 400, color: value > 0 ? color : '#CBD5E1' }}>
        {value} {label}
      </span>
    </div>
  );
}
