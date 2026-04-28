import React, { useState } from 'react';
import {
  MoreHorizontal,
  Eye,
  Pencil,
  Archive,
  Trash2,
  Unlink,
  Copy,
} from 'lucide-react';
import { Proposal, Variant } from './registry/types';
import { StatusBadge } from './StatusBadge';
import { PriorityChip } from './PriorityChip';
import { COL_STYLE } from './ColumnHeaders';

interface RequirementRowCardProps {
  proposal: Proposal;
  variant: Variant;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
}

function getRowBg(proposal: Proposal, isSelected: boolean, isHovered: boolean, variant: Variant): string {
  const isA = variant === 'A';

  if (isSelected) {
    return isA ? 'bg-blue-50' : 'bg-blue-50/80';
  }
  if (proposal.status === 'archived_completed') {
    return isHovered
      ? isA ? 'bg-emerald-50' : 'bg-emerald-50/90'
      : 'bg-emerald-50/50';
  }
  if (proposal.status === 'archived_outdated') {
    return isHovered
      ? isA ? 'bg-orange-50' : 'bg-orange-50/90'
      : 'bg-orange-50/50';
  }
  if (isHovered) {
    return isA ? 'bg-slate-50' : 'bg-white';
  }
  return 'bg-white';
}

function ContextMenu({ onClose }: { onClose: () => void }) {
  const items = [
    { icon: Eye, label: 'Открыть', action: 'open' },
    { icon: Pencil, label: 'Редактировать', action: 'edit' },
    { icon: Copy, label: 'Дублировать', action: 'copy' },
    { separator: true },
    { icon: Archive, label: 'Архивировать', action: 'archive' },
    { icon: Unlink, label: 'Отвязать ГК', action: 'unlink' },
    { separator: true },
    { icon: Trash2, label: 'Удалить', action: 'delete', danger: true },
  ];

  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 z-30 w-44 rounded-xl bg-white border border-slate-200 shadow-xl py-1 overflow-hidden">
        {items.map((item, i) =>
          'separator' in item && item.separator ? (
            <div key={i} className="h-px bg-slate-100 my-1" />
          ) : (
            <button
              key={i}
              onClick={() => { onClose(); }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-1.5 text-sm transition-colors
                ${'danger' in item && item.danger
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-slate-700 hover:bg-slate-50'
                }`}
            >
              {item.icon && <item.icon className="w-4 h-4 flex-shrink-0 opacity-70" />}
              {item.label}
            </button>
          )
        )}
      </div>
    </>
  );
}

export function RequirementRowCard({
  proposal,
  variant,
  isSelected,
  onSelect,
  onOpen,
}: RequirementRowCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isA = variant === 'A';

  const rowBg = getRowBg(proposal, isSelected, isHovered, variant);

  const isArchived =
    proposal.status === 'archived_completed' || proposal.status === 'archived_outdated';

  // Row classes differ by variant
  const rowClass = isA
    ? `grid items-center border-b border-slate-100 px-3 cursor-pointer transition-colors duration-100 group ${rowBg}
       ${isSelected ? 'border-l-[3px] border-l-blue-500' : 'border-l-[3px] border-l-transparent'}`
    : `grid items-center px-3 cursor-pointer transition-all duration-150 group rounded-xl border ${rowBg}
       ${isSelected
          ? 'border-blue-200 shadow-sm shadow-blue-100'
          : isHovered
          ? 'border-slate-200 shadow-md shadow-slate-100/80'
          : 'border-slate-100 shadow-sm shadow-slate-50'
        }`;

  const cellSep = isA
    ? 'border-r border-r-slate-100 last:border-r-0'
    : 'border-r border-r-slate-50/80 last:border-r-0';

  const rowHeight = isA ? 'h-[48px]' : 'h-[56px]';

  return (
    <div
      className={`${rowClass} ${rowHeight} relative`}
      style={COL_STYLE}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); }}
      onClick={() => onOpen(proposal.id)}
    >
      {/* Checkbox */}
      <div className={`flex items-center justify-center h-full ${cellSep}`} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onSelect(proposal.id)}
          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all flex-shrink-0
            ${isSelected
              ? 'bg-blue-600 border-blue-600'
              : isHovered
              ? 'border-slate-400 bg-white'
              : 'border-slate-300 bg-white opacity-60 group-hover:opacity-100'
            }`}
        >
          {isSelected && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
              <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </div>

      {/* ID */}
      <div className={`flex items-center h-full pr-3 ${cellSep}`}>
        <div className="flex flex-col gap-0.5">
          <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-mono font-semibold leading-tight
            ${isSelected
              ? 'bg-blue-100 text-blue-700'
              : isArchived
              ? 'bg-slate-100 text-slate-500'
              : 'bg-slate-100 text-slate-600'
            }`}>
            {proposal.displayId.replace('РП-2024-', 'РП-').replace('РП-2023-', 'РП-')}
          </span>
          <PriorityChip priority={proposal.priority} />
        </div>
      </div>

      {/* Title */}
      <div className={`flex items-center h-full pr-4 min-w-0 ${cellSep}`}>
        <div className="min-w-0">
          <p className={`text-sm font-medium leading-snug line-clamp-2 ${
            isArchived ? 'text-slate-400' : isSelected ? 'text-blue-900' : 'text-slate-800'
          }`} style={{ display: '-webkit-box', WebkitLineClamp: isA ? 1 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {proposal.title}
          </p>
          {!isA && (
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {proposal.section === 'digital' ? 'Цифровизация' :
               proposal.section === 'infra' ? 'Инфраструктура' :
               proposal.section === 'security' ? 'Инф. безопасность' :
               proposal.section === 'hr' ? 'HR и кадры' :
               proposal.section === 'finance' ? 'Финансы' : 'Юридический'} · {proposal.system}
            </p>
          )}
        </div>
      </div>

      {/* Status */}
      <div className={`flex items-center h-full pr-3 ${cellSep}`}>
        <StatusBadge status={proposal.status} compact />
      </div>

      {/* Initiator */}
      <div className={`flex flex-col justify-center h-full pr-3 ${cellSep}`}>
        <span className="text-sm text-slate-700 font-medium truncate">{proposal.initiator}</span>
        <span className="text-xs text-slate-400 truncate">{proposal.initiatorOrg}</span>
      </div>

      {/* Responsible */}
      <div className={`flex flex-col justify-center h-full pr-3 ${cellSep}`}>
        <span className="text-sm text-slate-700 font-medium truncate">{proposal.responsible}</span>
        <span className="text-xs text-slate-400 truncate">{proposal.responsibleDept}</span>
      </div>

      {/* GK / Stage */}
      <div className={`flex flex-col justify-center h-full pr-3 ${cellSep}`}>
        {proposal.gkNumber !== '—' ? (
          <>
            <span className="text-xs font-semibold text-slate-600 truncate">{proposal.gkNumber}</span>
            <span className="text-xs text-slate-400 truncate">{proposal.stage}</span>
          </>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </div>

      {/* Updated */}
      <div className={`flex items-center h-full pr-3 ${cellSep}`}>
        <span className="text-xs text-slate-500">{proposal.updatedAt}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center h-full relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all
            ${menuOpen
              ? 'bg-blue-100 text-blue-600'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }
            ${!isHovered && !menuOpen ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}
          `}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {menuOpen && <ContextMenu onClose={() => setMenuOpen(false)} />}
      </div>
    </div>
  );
}
