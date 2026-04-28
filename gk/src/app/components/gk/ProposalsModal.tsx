import React, { useState } from 'react';
import {
  X, FileText, CheckCircle2, Clock, AlertCircle, ChevronRight,
  Search, Filter, Info, Layers, Hash,
} from 'lucide-react';
import { GK } from '../../types/gk';

interface Proposal {
  id: string;
  title: string;
  number: string;
  status: 'draft' | 'review' | 'approved' | 'rejected';
  stageName: string;
  stageNumber: number;
  functionName: string;
  nmck: string;
  tz: string;
  author: string;
  createdAt: string;
}

function genProposals(gk: GK): Proposal[] {
  const statuses: Proposal['status'][] = ['draft', 'review', 'approved', 'rejected'];
  const authors = ['Иванов И.И.', 'Петрова М.С.', 'Сидоров А.В.', 'Козлова Т.Н.'];
  const count = Math.floor(Math.random() * 8) + 4;
  return Array.from({ length: count }, (_, i) => {
    const stage = gk.stages[i % Math.max(gk.stages.length, 1)];
    const fn = stage?.functions[i % Math.max(stage?.functions.length || 1, 1)];
    return {
      id: `prop_${gk.id}_${i}`,
      title: `Предложение по ${gk.shortName} #${String(i + 1).padStart(3, '0')}`,
      number: `${gk.code}-П-${String(i + 1).padStart(3, '0')}`,
      status: statuses[i % 4],
      stageName: stage?.stageName ?? '—',
      stageNumber: stage?.stageNumber ?? i + 1,
      functionName: fn?.functionName ?? '—',
      nmck: fn?.nmckFunctionNumber ?? '—',
      tz: fn?.tzSectionNumber ?? '—',
      author: authors[i % 4],
      createdAt: new Date(Date.now() - i * 5 * 24 * 3600000).toLocaleDateString('ru-RU'),
    };
  });
}

const statusConfig: Record<Proposal['status'], { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  draft:    { label: 'Черновик',    color: '#64748B', bg: '#F8FAFC', border: '#DCE3EE', icon: <Clock className="w-3 h-3" /> },
  review:   { label: 'На проверке', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: <FileText className="w-3 h-3" /> },
  approved: { label: 'Утверждено',  color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected: { label: 'Отклонено',  color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: <AlertCircle className="w-3 h-3" /> },
};

interface Props {
  gk: GK;
  onClose: () => void;
}

export function ProposalsModal({ gk, onClose }: Props) {
  const [proposals] = useState<Proposal[]>(() => genProposals(gk));
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filtered = proposals.filter((p) => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) &&
      !p.number.toLowerCase().includes(search.toLowerCase()) &&
      !p.functionName.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return true;
  });

  const counts = Object.fromEntries(
    Object.keys(statusConfig).map((k) => [k, proposals.filter((p) => p.status === k).length])
  );

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)' }} onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden"
        style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.08)' }}>

        {/* Top gradient accent */}
        <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #2563EB 0%, #7C3AED 50%, #22C55E 100%)' }} />

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Связанные предложения</h2>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-xs px-2 py-0.5 rounded-md" style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', fontWeight: 600 }}>
                {gk.shortName}
              </code>
              <span className="text-xs" style={{ color: '#64748B' }}>{gk.name}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-all" style={{ color: '#94A3B8' }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.background = '#F1F5F9'; el.style.color = '#64748B'; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'transparent'; el.style.color = '#94A3B8'; }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Integration info */}
        <div className="px-6 py-3 flex-shrink-0" style={{ background: '#EFF6FF', borderBottom: '1px solid #DBEAFE' }}>
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#2563EB' }} />
            <p className="text-xs leading-relaxed" style={{ color: '#1E40AF' }}>
              <span style={{ fontWeight: 600 }}>Интеграция: </span>
              При выборе ГК <code className="px-1 rounded" style={{ background: '#DBEAFE' }}>{gk.shortName}</code> в карточке предложения
              доступно <span style={{ fontWeight: 600 }}>{gk.stages.length} этапов</span> и функций по НМЦК / разделам ТЗ.
              Выбор функции автоматически подставит код НМЦК и номер раздела ТЗ.
            </p>
          </div>
        </div>

        {/* Status stat cards */}
        <div className="flex items-stretch gap-3 px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #F1F5F9' }}>
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
              className="flex-1 flex flex-col items-center gap-1 p-3 rounded-xl transition-all"
              style={{
                border: `1.5px solid ${filterStatus === key ? cfg.border : '#F1F5F9'}`,
                background: filterStatus === key ? cfg.bg : 'white',
              }}
              onMouseEnter={(e) => { if (filterStatus !== key) (e.currentTarget as HTMLButtonElement).style.background = '#FAFBFC'; }}
              onMouseLeave={(e) => { if (filterStatus !== key) (e.currentTarget as HTMLButtonElement).style.background = 'white'; }}
            >
              <span style={{ color: cfg.color, fontWeight: 700, fontSize: 18, lineHeight: 1 }}>
                {counts[key] ?? 0}
              </span>
              <span className="text-[10px]" style={{ color: '#64748B' }}>{cfg.label}</span>
            </button>
          ))}
        </div>

        {/* Filters bar */}
        <div className="flex items-center gap-3 px-6 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#94A3B8' }} />
            <input type="text" placeholder="Поиск по предложениям…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl"
              style={{ border: '1.5px solid #DCE3EE', color: '#1F2937', background: '#F8FAFC', outline: 'none' }}
              onFocus={(e) => { e.target.style.borderColor = '#2563EB'; e.target.style.background = 'white'; }}
              onBlur={(e) => { e.target.style.borderColor = '#DCE3EE'; e.target.style.background = '#F8FAFC'; }}
            />
          </div>
          <span className="text-xs ml-auto" style={{ color: '#94A3B8' }}>
            Показано: <span style={{ color: '#1F2937', fontWeight: 600 }}>{filtered.length}</span> из {proposals.length}
          </span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#EFF6FF' }}>
                <FileText className="w-6 h-6" style={{ color: '#93C5FD' }} />
              </div>
              <p className="text-sm" style={{ color: '#64748B', fontWeight: 500 }}>Предложений не найдено</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0" style={{ background: '#F8FAFC', borderBottom: '2px solid #DCE3EE' }}>
                <tr>
                  {['Номер', 'Наименование', 'Статус', 'Этап', 'Функция / НМЦК / ТЗ', 'Автор', 'Дата'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 whitespace-nowrap" style={{ fontWeight: 600, fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {h}
                    </th>
                  ))}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const cfg = statusConfig[p.status];
                  return (
                    <tr key={p.id} className="transition-colors group/row" style={{ borderBottom: '1px solid #F1F5F9' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#FAFBFC'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'white'; }}>
                      <td className="px-4 py-3">
                        <code className="text-[11px]" style={{ color: '#2563EB', fontWeight: 600 }}>{p.number}</code>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <span className="text-xs truncate block" style={{ color: '#1F2937', fontWeight: 500 }}>{p.title}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] border"
                          style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border, fontWeight: 500 }}>
                          {cfg.icon}{cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] text-white flex-shrink-0"
                            style={{ background: '#2563EB', fontWeight: 700 }}>{p.stageNumber}</div>
                          <span className="text-[11px] truncate max-w-[100px]" style={{ color: '#64748B' }}>{p.stageName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className="text-[11px] block truncate" style={{ color: '#1F2937', fontWeight: 500 }}>{p.functionName}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px]" style={{ color: '#94A3B8' }}>
                            НМЦК: <code style={{ color: '#2563EB' }}>{p.nmck}</code>
                          </span>
                          <span className="text-[10px]" style={{ color: '#94A3B8' }}>
                            ТЗ: <code style={{ color: '#7C3AED' }}>{p.tz}</code>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px]" style={{ color: '#64748B' }}>{p.author}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px]" style={{ color: '#94A3B8' }}>{p.createdAt}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="p-1 rounded-lg transition-all opacity-0 group-hover/row:opacity-100"
                          style={{ color: '#94A3B8' }}
                          onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.color = '#2563EB'; el.style.background = '#EFF6FF'; }}
                          onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.color = '#94A3B8'; el.style.background = 'transparent'; }}>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid #F1F5F9', background: '#F8FAFC' }}>
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" style={{ color: '#94A3B8' }} />
            <span className="text-xs" style={{ color: '#64748B' }}>
              {gk.stages.length} этапов · {gk.stages.reduce((s, st) => s + st.functions.length, 0)} функций доступно для выбора
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm transition-all"
            style={{ border: '1.5px solid #DCE3EE', color: '#64748B', background: 'white', fontWeight: 500 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; }}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
