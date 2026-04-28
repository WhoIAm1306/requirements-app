import React from 'react';
import { X, ArrowUpDown, RotateCcw } from 'lucide-react';
import { FilterState } from '../../types/gk';

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  customers: string[];
}

export const DEFAULT_FILTERS: FilterState = {
  status: 'all',
  customer: '',
  hasStages: 'all',
  hasFunctions: 'all',
  sortBy: 'updatedAt',
  sortOrder: 'desc',
};

const selectCls = `
  text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none transition-all bg-white
  text-gray-700 cursor-pointer
`.trim();

function SegmentButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-xs transition-all"
      style={
        active
          ? { background: '#2563EB', color: 'white', fontWeight: 500 }
          : { background: 'white', color: '#64748B' }
      }
    >
      {children}
    </button>
  );
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs flex-shrink-0" style={{ color: '#64748B', fontWeight: 500 }}>
      {children}
    </span>
  );
}

export function GKFilters({ filters, onChange, customers }: Props) {
  const set = <K extends keyof FilterState>(k: K, v: FilterState[K]) =>
    onChange({ ...filters, [k]: v });

  const isDefault = JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS);

  const segmentStyle = { border: '1px solid #DCE3EE', borderRadius: 8, overflow: 'hidden', display: 'inline-flex' };

  return (
    <div
      className="flex items-center gap-4 px-5 py-2.5 flex-wrap flex-shrink-0"
      style={{ background: '#F8FAFC', borderBottom: '1px solid #DCE3EE' }}
    >
      {/* Status */}
      <div className="flex items-center gap-2">
        <FilterLabel>Статус:</FilterLabel>
        <div style={segmentStyle}>
          <SegmentButton active={filters.status === 'all'}     onClick={() => set('status', 'all')}>Все</SegmentButton>
          <SegmentButton active={filters.status === 'active'}  onClick={() => set('status', 'active')}>Активные</SegmentButton>
          <SegmentButton active={filters.status === 'archive'} onClick={() => set('status', 'archive')}>Архив</SegmentButton>
        </div>
      </div>

      {/* Customer */}
      <div className="flex items-center gap-2">
        <FilterLabel>Заказчик:</FilterLabel>
        <select
          value={filters.customer}
          onChange={(e) => set('customer', e.target.value)}
          className={selectCls}
          style={{ borderColor: filters.customer ? '#2563EB' : '#DCE3EE', minWidth: 160 }}
        >
          <option value="">Все заказчики</option>
          {customers.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Has stages */}
      <div className="flex items-center gap-2">
        <FilterLabel>Этапы:</FilterLabel>
        <div style={segmentStyle}>
          <SegmentButton active={filters.hasStages === 'all'} onClick={() => set('hasStages', 'all')}>Все</SegmentButton>
          <SegmentButton active={filters.hasStages === 'yes'} onClick={() => set('hasStages', 'yes')}>Есть</SegmentButton>
          <SegmentButton active={filters.hasStages === 'no'}  onClick={() => set('hasStages', 'no')}>Нет</SegmentButton>
        </div>
      </div>

      {/* Has functions */}
      <div className="flex items-center gap-2">
        <FilterLabel>Функции:</FilterLabel>
        <div style={segmentStyle}>
          <SegmentButton active={filters.hasFunctions === 'all'} onClick={() => set('hasFunctions', 'all')}>Все</SegmentButton>
          <SegmentButton active={filters.hasFunctions === 'yes'} onClick={() => set('hasFunctions', 'yes')}>Есть</SegmentButton>
          <SegmentButton active={filters.hasFunctions === 'no'}  onClick={() => set('hasFunctions', 'no')}>Нет</SegmentButton>
        </div>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <ArrowUpDown className="w-3.5 h-3.5" style={{ color: '#94A3B8' }} />
        <select
          value={filters.sortBy}
          onChange={(e) => set('sortBy', e.target.value as FilterState['sortBy'])}
          className={selectCls}
          style={{ borderColor: '#DCE3EE' }}
        >
          <option value="updatedAt">По дате обновления</option>
          <option value="name">По названию</option>
          <option value="code">По коду</option>
        </select>
        <button
          onClick={() => set('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
          style={{ border: '1px solid #DCE3EE', background: 'white', color: '#64748B' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; }}
          title={filters.sortOrder === 'asc' ? 'По убыванию' : 'По возрастанию'}
        >
          {filters.sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {/* Active filter chips */}
      {filters.customer && (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
          style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}
        >
          <span>{filters.customer}</span>
          <button
            onClick={() => set('customer', '')}
            className="hover:opacity-70 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Reset */}
      {!isDefault && (
        <button
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ml-auto"
          style={{ color: '#EF4444', border: '1px solid #FECACA', background: '#FEF2F2' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FEE2E2'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2'; }}
        >
          <RotateCcw className="w-3 h-3" />
          Сбросить фильтры
        </button>
      )}
    </div>
  );
}
