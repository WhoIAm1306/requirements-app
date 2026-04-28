import React, { useState } from 'react';
import { Search, Plus, Download, MoreHorizontal, X } from 'lucide-react';

interface HeaderToolbarProps {
  searchValue: string;
  onSearchChange: (v: string) => void;
  totalCount: number;
  filteredCount: number;
}

export function HeaderToolbar({ searchValue, onSearchChange, totalCount, filteredCount }: HeaderToolbarProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 px-6 pt-5 pb-4 bg-white border-b border-slate-200">
      {/* Title row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-slate-900 whitespace-nowrap" style={{ fontSize: '20px', fontWeight: 600, lineHeight: '28px' }}>
            Реестр предложений
          </h1>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {filteredCount}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск по реестру..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-9 pl-9 pr-8 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
            {searchValue && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="w-px h-6 bg-slate-200 mx-1" />

          {/* Add button */}
          <button className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Добавить запись
          </button>

          {/* Export */}
          <button className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-sm font-medium transition-colors">
            <Download className="w-4 h-4 text-slate-500" />
            Экспорт Excel
          </button>

          {/* More */}
          <div className="relative">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {moreOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-xl bg-white border border-slate-200 shadow-lg py-1 overflow-hidden">
                  {['Настроить столбцы', 'Сохранить фильтры', 'Печать реестра', 'Журнал изменений'].map((item) => (
                    <button
                      key={item}
                      className="flex w-full px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                      onClick={() => setMoreOpen(false)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
