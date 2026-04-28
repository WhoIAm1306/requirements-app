import React, { useState } from 'react';
import {
  Search, X, ChevronDown, Layers, Zap, SlidersHorizontal,
  Check, CircleSlash2, Building2, ArrowUpDown,
} from 'lucide-react';
import { GK, UserRole } from '../../types/gk';
import { GKStatusBadge } from './StatusBadge';

// ─── filter state ─────────────────────────────────────────────────────────────

export interface ListFilters {
  status: 'all' | 'active' | 'archive';
  customer: string;
  hasStages: 'all' | 'yes' | 'no';
  sortBy: 'name' | 'updated' | 'code' | 'stages' | 'functions';
  sortOrder: 'asc' | 'desc';
}

export const DEFAULT_LIST_FILTERS: ListFilters = {
  status: 'all', customer: '', hasStages: 'all', sortBy: 'updated', sortOrder: 'desc',
};

// ─── skeleton ─────────────────────────────────────────────────────────────────

function SkeletonItem() {
  return (
    <div className="px-4 py-3 animate-pulse space-y-2" style={{ borderBottom: '1px solid #F1F5F9' }}>
      <div className="flex items-center gap-2">
        <div className="w-16 h-4 rounded-full" style={{ background: '#F1F5F9' }} />
        <div className="flex-1 h-4 rounded-full" style={{ background: '#F1F5F9' }} />
      </div>
      <div className="w-32 h-3 rounded-full" style={{ background: '#F8FAFC' }} />
      <div className="flex gap-2">
        <div className="w-16 h-3 rounded-full" style={{ background: '#F8FAFC' }} />
        <div className="w-20 h-3 rounded-full" style={{ background: '#F8FAFC' }} />
      </div>
    </div>
  );
}

// ─── list item ────────────────────────────────────────────────────────────────

function GKListItem({
  gk, selected, checked, onSelect, onToggleCheck, role,
}: {
  gk: GK; selected: boolean; checked: boolean;
  onSelect: () => void; onToggleCheck: () => void; role: UserRole;
}) {
  const totalFns = gk.stages.reduce((s, st) => s + st.functions.length, 0);
  const jiraCount = gk.stages.flatMap((s) => s.functions.flatMap((f) => f.jiraEpics)).length;

  const statusColors: Record<string, { dot: string; bar: string }> = {
    active:  { dot: '#22C55E', bar: '#2563EB' },
    archive: { dot: '#94A3B8', bar: '#94A3B8' },
  };
  const sc = statusColors[gk.status] ?? statusColors.active;

  return (
    <div
      onClick={onSelect}
      className="group/item relative flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-all"
      style={{
        borderBottom: '1px solid #F1F5F9',
        borderLeft: `3px solid ${selected ? sc.bar : 'transparent'}`,
        background: selected ? '#F0F6FF' : 'white',
      }}
      onMouseEnter={(e) => {
        if (!selected) (e.currentTarget as HTMLDivElement).style.background = '#FAFBFC';
      }}
      onMouseLeave={(e) => {
        if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'white';
      }}
    >
      {/* Checkbox */}
      <div
        onClick={(e) => { e.stopPropagation(); onToggleCheck(); }}
        className="flex-shrink-0 mt-0.5 transition-all"
        style={{
          width: 16, height: 16, borderRadius: 5,
          border: `2px solid ${checked ? '#2563EB' : '#DCE3EE'}`,
          background: checked ? '#2563EB' : 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}
      >
        {checked && <Check className="w-2.5 h-2.5 text-white" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Row 1: status + shortname + code */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sc.dot }} />
          <span
            className="px-1.5 py-0 rounded-md"
            style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', background: selected ? '#DBEAFE' : '#F1F5F9', color: selected ? '#1D4ED8' : '#64748B' }}
          >
            {gk.shortName}
          </span>
          <span style={{ fontSize: 10, color: '#94A3B8' }}>{gk.code}</span>
        </div>

        {/* Row 2: name */}
        <p
          className="leading-snug"
          style={{
            fontSize: 13, fontWeight: selected ? 600 : 500,
            color: gk.status === 'archive' ? '#94A3B8' : '#1F2937',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {gk.name}
        </p>

        {/* Row 3: customer */}
        <p className="flex items-center gap-1" style={{ fontSize: 11, color: '#64748B' }}>
          <Building2 className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="truncate">{gk.customer}</span>
        </p>

        {/* Row 4: counters + date */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
            style={{ fontSize: 10, background: gk.stages.length ? '#EFF6FF' : '#F8FAFC', color: gk.stages.length ? '#2563EB' : '#CBD5E1', fontWeight: 500 }}
          >
            <Layers className="w-2.5 h-2.5" />
            {gk.stages.length} эт.
          </span>
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
            style={{ fontSize: 10, background: totalFns ? '#F0FDF4' : '#F8FAFC', color: totalFns ? '#16A34A' : '#CBD5E1', fontWeight: 500 }}
          >
            <Zap className="w-2.5 h-2.5" />
            {totalFns} фун.
          </span>
          {jiraCount > 0 && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
              style={{ fontSize: 10, background: '#F5F3FF', color: '#7C3AED', fontWeight: 500 }}
            >
              J {jiraCount}
            </span>
          )}
          <span className="ml-auto" style={{ fontSize: 10, color: '#CBD5E1' }}>
            {new Date(gk.updatedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── filter bar inside panel ──────────────────────────────────────────────────

function FilterPill({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full transition-all"
      style={{
        fontSize: 11, fontWeight: active ? 600 : 400, border: '1.5px solid transparent',
        background: active ? '#2563EB' : '#F1F5F9',
        color: active ? 'white' : '#64748B',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = '#E2E8F0'; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = '#F1F5F9'; }}
    >
      {children}
    </button>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

interface Props {
  gks: GK[];
  selectedGkId: string | null;
  selectedIds: Set<string>;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectGk: (gk: GK) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
  role: UserRole;
  loading: boolean;
  filters: ListFilters;
  onFiltersChange: (f: ListFilters) => void;
  customers: string[];
  totalCount: number;
}

export function GKListPanel({
  gks, selectedGkId, selectedIds, searchQuery, onSearchChange,
  onSelectGk, onToggleSelect, onToggleSelectAll,
  role, loading, filters, onFiltersChange, customers, totalCount,
}: Props) {
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [showSortDrop, setShowSortDrop] = useState(false);

  const allChecked = gks.length > 0 && gks.every((g) => selectedIds.has(g.id));
  const someChecked = gks.some((g) => selectedIds.has(g.id));

  const sortLabels: Record<string, string> = {
    updated: 'По дате',
    name: 'По имени',
    code: 'По коду',
    stages: 'По этапам',
    functions: 'По функциям',
  };

  return (
    <div className="flex flex-col h-full" style={{ borderRight: '1px solid #DCE3EE', background: 'white' }}>
      {/* Search */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid #F1F5F9' }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#94A3B8' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск по ГК, коду, заказчику…"
            style={{
              width: '100%', padding: '8px 32px 8px 32px', fontSize: 12.5,
              border: '1.5px solid #DCE3EE', borderRadius: 12, outline: 'none',
              background: '#F8FAFC', color: '#1F2937', transition: 'all 0.15s',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#2563EB'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#DCE3EE'; e.target.style.background = '#F8FAFC'; e.target.style.boxShadow = 'none'; }}
          />
          {searchQuery && (
            <button onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded transition-all"
              style={{ color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#94A3B8'; }}>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Quick filters */}
      <div className="px-4 py-2.5 flex-shrink-0 space-y-2" style={{ borderBottom: '1px solid #F1F5F9' }}>
        {/* Status pills */}
        <div className="flex gap-1.5">
          {(['all', 'active', 'archive'] as const).map((s) => (
            <FilterPill key={s} active={filters.status === s} onClick={() => onFiltersChange({ ...filters, status: s })}>
              {s === 'all' ? 'Все' : s === 'active' ? '● Активные' : '○ Архив'}
            </FilterPill>
          ))}
        </div>

        {/* Customer + Sort */}
        <div className="flex gap-1.5 relative">
          {/* Customer dropdown */}
          <div className="relative flex-1">
            <button
              onClick={() => { setShowCustomerDrop((v) => !v); setShowSortDrop(false); }}
              className="w-full flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all"
              style={{
                fontSize: 11, border: '1.5px solid', cursor: 'pointer',
                borderColor: filters.customer ? '#2563EB' : '#DCE3EE',
                background: filters.customer ? '#EFF6FF' : '#F8FAFC',
                color: filters.customer ? '#2563EB' : '#64748B',
              }}
            >
              <Building2 className="w-3 h-3 flex-shrink-0" />
              <span className="flex-1 text-left truncate">{filters.customer || 'Заказчик'}</span>
              {filters.customer
                ? <X className="w-2.5 h-2.5 flex-shrink-0" onClick={(e) => { e.stopPropagation(); onFiltersChange({ ...filters, customer: '' }); }} />
                : <ChevronDown className="w-2.5 h-2.5 flex-shrink-0" />
              }
            </button>
            {showCustomerDrop && (
              <div
                className="absolute top-full left-0 mt-1 z-30 py-1 rounded-xl overflow-hidden"
                style={{ background: 'white', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #DCE3EE', minWidth: 220 }}
              >
                {customers.map((c) => (
                  <button key={c} onClick={() => { onFiltersChange({ ...filters, customer: c }); setShowCustomerDrop(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 transition-all text-left"
                    style={{ fontSize: 12, background: filters.customer === c ? '#EFF6FF' : 'white', color: filters.customer === c ? '#2563EB' : '#1F2937', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={(e) => { if (filters.customer !== c) (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'; }}
                    onMouseLeave={(e) => { if (filters.customer !== c) (e.currentTarget as HTMLButtonElement).style.background = 'white'; }}>
                    {filters.customer === c && <Check className="w-3 h-3 flex-shrink-0" style={{ color: '#2563EB' }} />}
                    <span className="truncate">{c}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => { setShowSortDrop((v) => !v); setShowCustomerDrop(false); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl transition-all"
              style={{ fontSize: 11, border: '1.5px solid #DCE3EE', background: '#F8FAFC', color: '#64748B', cursor: 'pointer' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F1F5F9'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'; }}
            >
              <ArrowUpDown className="w-2.5 h-2.5" />
              {sortLabels[filters.sortBy]}
            </button>
            {showSortDrop && (
              <div
                className="absolute top-full right-0 mt-1 z-30 py-1 rounded-xl overflow-hidden"
                style={{ background: 'white', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #DCE3EE', minWidth: 160 }}
              >
                {(Object.entries(sortLabels) as [string, string][]).map(([k, label]) => (
                  <button key={k} onClick={() => {
                    onFiltersChange({ ...filters, sortBy: k as ListFilters['sortBy'], sortOrder: filters.sortBy === k && filters.sortOrder === 'asc' ? 'desc' : 'asc' });
                    setShowSortDrop(false);
                  }}
                    className="w-full flex items-center gap-2 px-3 py-2 transition-all text-left"
                    style={{ fontSize: 12, background: filters.sortBy === k ? '#EFF6FF' : 'white', color: filters.sortBy === k ? '#2563EB' : '#1F2937', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={(e) => { if (filters.sortBy !== k) (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'; }}
                    onMouseLeave={(e) => { if (filters.sortBy !== k) (e.currentTarget as HTMLButtonElement).style.background = 'white'; }}>
                    {filters.sortBy === k && <Check className="w-3 h-3" style={{ color: '#2563EB' }} />}
                    <span className="flex-1">{label}</span>
                    {filters.sortBy === k && (
                      <span style={{ color: '#94A3B8', fontSize: 10 }}>{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Count + select all */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0" style={{ borderBottom: '1px solid #F1F5F9', background: selectedIds.size > 0 ? '#EFF6FF' : '#FAFBFC' }}>
        <div className="flex items-center gap-2">
          <div
            onClick={() => onToggleSelectAll(allChecked ? [] : gks.map((g) => g.id))}
            style={{
              width: 15, height: 15, borderRadius: 4, cursor: 'pointer', flexShrink: 0,
              border: `2px solid ${someChecked ? '#2563EB' : '#DCE3EE'}`,
              background: allChecked ? '#2563EB' : 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {allChecked ? <Check className="w-2 h-2 text-white" /> : someChecked ? <div className="w-1.5 h-px" style={{ background: '#2563EB' }} /> : null}
          </div>
          <span style={{ fontSize: 11, color: selectedIds.size > 0 ? '#2563EB' : '#94A3B8', fontWeight: selectedIds.size > 0 ? 600 : 400 }}>
            {selectedIds.size > 0 ? `Выбрано: ${selectedIds.size}` : `${gks.length} из ${totalCount}`}
          </span>
        </div>
        {(filters.status !== 'all' || filters.customer || filters.hasStages !== 'all') && (
          <button
            onClick={() => onFiltersChange(DEFAULT_LIST_FILTERS)}
            className="flex items-center gap-1 transition-all"
            style={{ fontSize: 10, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#94A3B8'; }}
          >
            <CircleSlash2 className="w-3 h-3" />Сбросить
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto" onClick={() => { setShowCustomerDrop(false); setShowSortDrop(false); }}>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonItem key={i} />)
        ) : gks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 px-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#F8FAFC' }}>
              <SlidersHorizontal className="w-6 h-6" style={{ color: '#CBD5E1' }} />
            </div>
            <div className="text-center">
              <p style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>Ничего не найдено</p>
              <p style={{ fontSize: 11, color: '#CBD5E1', marginTop: 4 }}>Измените параметры поиска или фильтры</p>
            </div>
          </div>
        ) : (
          gks.map((gk) => (
            <GKListItem
              key={gk.id}
              gk={gk}
              selected={selectedGkId === gk.id}
              checked={selectedIds.has(gk.id)}
              onSelect={() => onSelectGk(gk)}
              onToggleCheck={() => onToggleSelect(gk.id)}
              role={role}
            />
          ))
        )}
      </div>
    </div>
  );
}
