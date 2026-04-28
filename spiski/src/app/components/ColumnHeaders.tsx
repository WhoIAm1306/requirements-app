import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Variant } from './registry/types';

const COL_STYLE = { gridTemplateColumns: '40px 84px 1fr 148px 162px 162px 148px 112px 52px' };

interface ColumnHeadersProps {
  variant: Variant;
  allSelected: boolean;
  someSelected: boolean;
  onSelectAll: () => void;
  sortColumn?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (col: string) => void;
}

const COLUMNS = [
  { key: 'displayId', label: 'ID', sortable: true },
  { key: 'title', label: 'Наименование предложения', sortable: true },
  { key: 'status', label: 'Статус', sortable: true },
  { key: 'initiator', label: 'Инициатор', sortable: true },
  { key: 'responsible', label: 'Ответственный', sortable: true },
  { key: 'gkStage', label: 'ГК / Этап', sortable: false },
  { key: 'updatedAt', label: 'Обновлено', sortable: true },
];

export function ColumnHeaders({
  variant,
  allSelected,
  someSelected,
  onSelectAll,
  sortColumn,
  sortDir,
  onSort,
}: ColumnHeadersProps) {
  const isA = variant === 'A';

  return (
    <div
      className={`grid items-center select-none sticky top-0 z-10
        ${isA
          ? 'bg-slate-50 border-b-2 border-slate-200 px-3'
          : 'bg-slate-50/80 backdrop-blur-sm border-b border-slate-200/70 px-3'
        }`}
      style={COL_STYLE}
    >
      {/* Checkbox col */}
      <div className="flex items-center justify-center py-2.5">
        <button
          onClick={onSelectAll}
          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0
            ${allSelected
              ? 'bg-blue-600 border-blue-600'
              : someSelected
              ? 'bg-blue-600 border-blue-600'
              : 'border-slate-300 bg-white hover:border-blue-400'
            }`}
        >
          {allSelected ? (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
              <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : someSelected ? (
            <span className="w-2 h-0.5 bg-white rounded" />
          ) : null}
        </button>
      </div>

      {/* Data columns */}
      {COLUMNS.map((col) => (
        <div
          key={col.key}
          className={`flex items-center gap-1 py-2.5 pr-3
            ${isA ? 'border-r border-r-slate-200 last:border-r-0' : 'border-r border-r-slate-100 last:border-r-0'}
          `}
        >
          <span
            className={`text-xs font-semibold tracking-wide uppercase
              ${isA ? 'text-slate-500' : 'text-slate-400'}`}
            style={{ fontSize: '11px', letterSpacing: '0.04em' }}
          >
            {col.label}
          </span>
          {col.sortable && onSort && (
            <button
              onClick={() => onSort(col.key)}
              className={`ml-0.5 flex-shrink-0 transition-opacity
                ${sortColumn === col.key ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}
            >
              <ArrowUpDown className={`w-3 h-3 ${sortColumn === col.key ? 'text-blue-500' : 'text-slate-400'}`} />
            </button>
          )}
        </div>
      ))}

      {/* Actions col */}
      <div className="flex items-center justify-center py-2.5" />
    </div>
  );
}

export { COL_STYLE };
