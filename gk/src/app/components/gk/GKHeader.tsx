import React from 'react';
import {
  Plus, Search, SlidersHorizontal, Download,
  LayoutList, LayoutGrid, BookOpen, ChevronRight,
} from 'lucide-react';
import { UserRole } from '../../types/gk';

interface Props {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  onAddGK: () => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  onExport: () => void;
  viewMode: 'table' | 'cards';
  onViewModeChange: (m: 'table' | 'cards') => void;
  role: UserRole;
  total: number;
  filtered: number;
  activeFilterCount: number;
}

export function GKHeader({
  searchQuery, onSearchChange, onAddGK,
  filtersOpen, onToggleFilters, onExport,
  viewMode, onViewModeChange,
  role, total, filtered, activeFilterCount,
}: Props) {
  return (
    <>
      {/* Dark top nav */}
      <div className="flex items-center gap-0 px-5 py-0 flex-shrink-0" style={{ background: '#0F172A', minHeight: 48 }}>
        <div className="flex items-center gap-2 mr-6">
          <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-white text-sm" style={{ fontWeight: 600, letterSpacing: '-0.01em' }}>
            ГосСправочник
          </span>
        </div>

        {/* Breadcrumb nav */}
        <nav className="flex items-center gap-1 flex-1">
          {['Реестр предложений', 'Справочники', 'Справочник ГК'].map((item, i, arr) => (
            <React.Fragment key={item}>
              {i < arr.length - 1 ? (
                <>
                  <button className="text-slate-400 hover:text-slate-200 text-xs py-3 px-2 transition-colors">
                    {item}
                  </button>
                  <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
                </>
              ) : (
                <span className="text-white text-xs py-3 px-2 border-b-2 border-blue-500" style={{ fontWeight: 500 }}>
                  {item}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* Right: stats */}
        <div className="flex items-center gap-4 ml-auto">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              <span className="text-slate-400">
                {filtered !== total
                  ? `${filtered} / ${total} записей`
                  : `${total} записей`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* White action bar */}
      <div className="bg-white border-b px-5 py-3 flex items-center gap-3 flex-shrink-0" style={{ borderColor: '#DCE3EE' }}>
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по ГК, этапам, функциям, НМЦК…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm rounded-lg transition-all"
            style={{
              border: '1.5px solid #DCE3EE',
              color: '#1F2937',
              background: '#F8FAFC',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#2563EB';
              e.target.style.background = '#FFFFFF';
              e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#DCE3EE';
              e.target.style.background = '#F8FAFC';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Filters toggle */}
        <button
          onClick={onToggleFilters}
          className="relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm transition-all"
          style={
            filtersOpen
              ? { background: '#EFF6FF', color: '#2563EB', border: '1.5px solid #BFDBFE', fontWeight: 500 }
              : { background: 'white', color: '#64748B', border: '1.5px solid #DCE3EE', fontWeight: 400 }
          }
        >
          <SlidersHorizontal className="w-4 h-4" />
          Фильтры
          {activeFilterCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white flex items-center justify-center"
              style={{ background: '#2563EB', fontSize: 10, fontWeight: 700 }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Export */}
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm transition-all"
          style={{ background: 'white', color: '#64748B', border: '1.5px solid #DCE3EE' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; }}
        >
          <Download className="w-4 h-4" />
          Экспорт
        </button>

        {/* View mode */}
        <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1.5px solid #DCE3EE' }}>
          {(['table', 'cards'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className="flex items-center justify-center w-8 h-8 transition-all"
              style={
                viewMode === mode
                  ? { background: '#2563EB', color: 'white' }
                  : { background: 'white', color: '#94A3B8' }
              }
              title={mode === 'table' ? 'Таблица' : 'Карточки'}
            >
              {mode === 'table'
                ? <LayoutList className="w-4 h-4" />
                : <LayoutGrid className="w-4 h-4" />}
            </button>
          ))}
        </div>

        {/* Add button */}
        {role !== 'read' && (
          <button
            onClick={onAddGK}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white transition-all"
            style={{ background: '#2563EB', fontWeight: 500 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#3B82F6'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#2563EB'; }}
            onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#1D4ED8'; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#3B82F6'; }}
          >
            <Plus className="w-4 h-4" />
            Добавить ГК
          </button>
        )}
      </div>
    </>
  );
}
