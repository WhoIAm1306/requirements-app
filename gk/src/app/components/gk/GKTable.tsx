import React, { useState } from 'react';
import {
  ChevronLeft, ChevronRight, Edit2, Archive, ArchiveRestore,
  Trash2, ExternalLink, Layers, ArrowUp, ArrowDown,
} from 'lucide-react';
import { GK, UserRole } from '../../types/gk';
import { GKStatusBadge } from './StatusBadge';

interface Props {
  gks: GK[];
  selectedGkId: string | null;
  selectedIds: Set<string>;
  onSelectGk: (gk: GK) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
  loading: boolean;
  role: UserRole;
  onEdit: (gk: GK) => void;
  onArchive: (gk: GK) => void;
  onRestore: (gk: GK) => void;
  onDelete: (gk: GK) => void;
  onViewProposals: (gk: GK) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-3 rounded-full animate-pulse"
            style={{ background: 'linear-gradient(90deg, #F1F5F9, #E2E8F0, #F1F5F9)', backgroundSize: '200% 100%', width: `${50 + (i * 17) % 45}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

type SortKey = 'name' | 'code' | 'customer' | 'status' | 'updatedAt';

export function GKTable({
  gks, selectedGkId, selectedIds, onSelectGk, onToggleSelect, onToggleSelectAll,
  loading, role, onEdit, onArchive, onRestore, onDelete, onViewProposals,
}: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'updatedAt', dir: 'desc' });

  const totalFunctions = (gk: GK) => gk.stages.reduce((s, st) => s + st.functions.length, 0);

  const sorted = [...gks].sort((a, b) => {
    let va: string = '';
    let vb: string = '';
    if (sort.key === 'name') { va = a.name; vb = b.name; }
    else if (sort.key === 'code') { va = a.code; vb = b.code; }
    else if (sort.key === 'customer') { va = a.customer; vb = b.customer; }
    else if (sort.key === 'status') { va = a.status; vb = b.status; }
    else { va = a.updatedAt; vb = b.updatedAt; }
    return sort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const allPageSelected = paged.length > 0 && paged.every((g) => selectedIds.has(g.id));
  const someSelected = paged.some((g) => selectedIds.has(g.id));

  const toggleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sort.key !== k) return <span className="w-3 h-3 opacity-0 inline-block" />;
    return sort.dir === 'asc'
      ? <ArrowUp className="w-3 h-3 inline-block ml-1 text-blue-600" />
      : <ArrowDown className="w-3 h-3 inline-block ml-1 text-blue-600" />;
  };

  const TH = ({ k, children, cls }: { k?: SortKey; children: React.ReactNode; cls?: string }) => (
    <th
      className={`text-left px-4 py-3 whitespace-nowrap select-none ${k ? 'cursor-pointer' : ''} ${cls ?? ''}`}
      style={{ fontWeight: 500, fontSize: 11, color: '#64748B', letterSpacing: '0.03em', textTransform: 'uppercase' }}
      onClick={k ? () => toggleSort(k) : undefined}
    >
      {children}
      {k && <SortIcon k={k} />}
    </th>
  );

  const colCount = role !== 'read' ? 10 : 9;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm min-w-[900px]">
          <thead className="sticky top-0 z-10">
            <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #DCE3EE' }}>
              {role !== 'read' && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allPageSelected; }}
                    onChange={() =>
                      allPageSelected ? onToggleSelectAll([]) : onToggleSelectAll(paged.map((g) => g.id))
                    }
                    className="w-4 h-4 rounded cursor-pointer"
                    style={{ accentColor: '#2563EB' }}
                  />
                </th>
              )}
              <TH k="name">Наименование ГК</TH>
              <TH>Краткое</TH>
              <TH k="code">Код</TH>
              <TH k="customer">Заказчик</TH>
              <TH k="status">Статус</TH>
              <TH cls="text-center">Этапы</TH>
              <TH cls="text-center">Функции</TH>
              <TH k="updatedAt">Обновлено</TH>
              <th className="w-28 px-4 py-3 text-right" style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>
                ДЕЙСТВИЯ
              </th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={colCount} />)
              : paged.length === 0
              ? (
                <tr>
                  <td colSpan={colCount} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#EFF6FF' }}>
                        <Layers className="w-7 h-7" style={{ color: '#93C5FD' }} />
                      </div>
                      <div>
                        <p className="text-sm" style={{ color: '#1F2937', fontWeight: 500 }}>Записи не найдены</p>
                        <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>
                          Попробуйте изменить фильтры или поисковый запрос
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )
              : paged.map((gk) => {
                const isSelected = selectedIds.has(gk.id);
                const isActive = selectedGkId === gk.id;
                const fnCount = totalFunctions(gk);

                return (
                  <tr
                    key={gk.id}
                    onClick={() => onSelectGk(gk)}
                    className="cursor-pointer transition-colors group"
                    style={{
                      background: isActive ? '#EFF6FF' : isSelected ? '#F0F9FF' : 'white',
                      borderBottom: '1px solid #F1F5F9',
                      borderLeft: `3px solid ${isActive ? '#2563EB' : 'transparent'}`,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive && !isSelected) {
                        (e.currentTarget as HTMLTableRowElement).style.background = '#F8FAFC';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive && !isSelected) {
                        (e.currentTarget as HTMLTableRowElement).style.background = 'white';
                      }
                    }}
                  >
                    {role !== 'read' && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelect(gk.id)}
                          className="w-4 h-4 rounded cursor-pointer"
                          style={{ accentColor: '#2563EB' }}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 max-w-[220px]">
                      <div className="text-xs truncate" style={{ color: '#1F2937', fontWeight: 600 }}>
                        {gk.name}
                      </div>
                      {gk.useShortNameInId && (
                        <span className="text-[10px]" style={{ color: '#94A3B8' }}>ID → краткое имя</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <code
                        className="text-xs px-2 py-0.5 rounded-md"
                        style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', fontWeight: 600 }}
                      >
                        {gk.shortName}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono" style={{ color: '#64748B' }}>{gk.code}</span>
                    </td>
                    <td className="px-4 py-3 max-w-[140px]">
                      <span className="text-xs truncate block" style={{ color: '#64748B' }} title={gk.customer}>
                        {gk.customer}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <GKStatusBadge status={gk.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs"
                        style={
                          gk.stages.length > 0
                            ? { background: '#EFF6FF', color: '#2563EB', fontWeight: 600 }
                            : { background: '#F8FAFC', color: '#CBD5E1' }
                        }
                      >
                        {gk.stages.length}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs"
                        style={
                          fnCount > 0
                            ? { background: '#F0FDF4', color: '#16A34A', fontWeight: 600 }
                            : { background: '#F8FAFC', color: '#CBD5E1' }
                        }
                      >
                        {fnCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: '#94A3B8' }}>{fmt(gk.updatedAt)}</span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {role !== 'read' && (
                          <IconBtn
                            onClick={() => onEdit(gk)}
                            title="Редактировать"
                            hoverColor="#2563EB"
                            hoverBg="#EFF6FF"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </IconBtn>
                        )}
                        <IconBtn
                          onClick={() => onViewProposals(gk)}
                          title="Предложения"
                          hoverColor="#F59E0B"
                          hoverBg="#FFFBEB"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </IconBtn>
                        {role !== 'read' && (
                          gk.status === 'active'
                            ? (
                              <IconBtn onClick={() => onArchive(gk)} title="В архив" hoverColor="#F59E0B" hoverBg="#FFFBEB">
                                <Archive className="w-3.5 h-3.5" />
                              </IconBtn>
                            )
                            : (
                              <IconBtn onClick={() => onRestore(gk)} title="Восстановить" hoverColor="#22C55E" hoverBg="#F0FDF4">
                                <ArchiveRestore className="w-3.5 h-3.5" />
                              </IconBtn>
                            )
                        )}
                        {role === 'superuser' && (
                          <IconBtn onClick={() => onDelete(gk)} title="Удалить" hoverColor="#EF4444" hoverBg="#FEF2F2">
                            <Trash2 className="w-3.5 h-3.5" />
                          </IconBtn>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
        style={{ borderTop: '1px solid #DCE3EE', background: '#F8FAFC' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#94A3B8' }}>Строк:</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="text-xs border rounded-lg px-2 py-1 focus:outline-none transition-all"
            style={{ borderColor: '#DCE3EE', color: '#64748B', background: 'white' }}
          >
            {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="text-xs" style={{ color: '#94A3B8' }}>
            {gks.length === 0 ? '0' : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, gks.length)}`} из {gks.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <PagBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </PagBtn>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = i + 1;
            return (
              <PagBtn key={p} onClick={() => setPage(p)} active={p === currentPage}>
                {p}
              </PagBtn>
            );
          })}
          {totalPages > 7 && <span className="text-xs" style={{ color: '#94A3B8' }}>…{totalPages}</span>}
          <PagBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
            <ChevronRight className="w-3.5 h-3.5" />
          </PagBtn>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  onClick, children, title, hoverColor, hoverBg,
}: {
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  hoverColor: string;
  hoverBg: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-lg transition-all"
      style={{ color: '#94A3B8' }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.color = hoverColor;
        el.style.background = hoverBg;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.color = '#94A3B8';
        el.style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

function PagBtn({
  onClick, children, disabled, active,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="min-w-[28px] h-7 px-1 rounded-lg text-xs flex items-center justify-center transition-all"
      style={
        active
          ? { background: '#2563EB', color: 'white', fontWeight: 600 }
          : { color: '#64748B', opacity: disabled ? 0.3 : 1 }
      }
      onMouseEnter={(e) => {
        if (!active && !disabled) (e.currentTarget as HTMLButtonElement).style.background = '#EFF6FF';
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}
