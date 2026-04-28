import React from 'react';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { FilterState } from './registry/types';
import {
  STATUS_OPTIONS,
  SECTION_OPTIONS,
  SYSTEM_OPTIONS,
  PRIORITY_OPTIONS,
} from './registry/mock-data';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onReset: () => void;
  activeCount: number;
}

interface FilterDropdownProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}

function FilterDropdown({ label, value, options, onChange }: FilterDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);
  const isActive = value !== '';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-sm font-medium transition-all whitespace-nowrap
          ${isActive
            ? 'border-blue-300 bg-blue-50 text-blue-700'
            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
          }`}
      >
        <span>{isActive ? selected?.label : label}</span>
        {isActive ? (
          <X
            className="w-3.5 h-3.5 text-blue-500 hover:text-blue-700"
            onClick={(e) => { e.stopPropagation(); onChange(''); setOpen(false); }}
          />
        ) : (
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 min-w-[180px] rounded-xl bg-white border border-slate-200 shadow-lg py-1 overflow-hidden">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors
                  ${opt.value === value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                {opt.value === value && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                )}
                {opt.value !== value && <span className="w-1.5 h-1.5 flex-shrink-0" />}
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function FilterBar({ filters, onFilterChange, onReset, activeCount }: FilterBarProps) {
  return (
    <div className="flex items-center gap-2 px-6 py-2.5 bg-white border-b border-slate-100">
      <SlidersHorizontal className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <span className="text-xs font-medium text-slate-500 mr-1 flex-shrink-0">Фильтры:</span>

      <FilterDropdown
        label="Статус"
        value={filters.status}
        options={STATUS_OPTIONS}
        onChange={(v) => onFilterChange('status', v)}
      />
      <FilterDropdown
        label="Раздел"
        value={filters.section}
        options={SECTION_OPTIONS}
        onChange={(v) => onFilterChange('section', v)}
      />
      <FilterDropdown
        label="Система"
        value={filters.system}
        options={SYSTEM_OPTIONS}
        onChange={(v) => onFilterChange('system', v)}
      />
      <FilterDropdown
        label="Приоритет"
        value={filters.priority}
        options={PRIORITY_OPTIONS}
        onChange={(v) => onFilterChange('priority', v)}
      />

      {activeCount > 0 && (
        <>
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Сбросить фильтры
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
              {activeCount}
            </span>
          </button>
        </>
      )}
    </div>
  );
}
