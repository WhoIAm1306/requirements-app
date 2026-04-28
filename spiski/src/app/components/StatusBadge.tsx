import React from 'react';
import { Status } from './registry/types';

const STATUS_CONFIG: Record<Status, { label: string; color: string; dot: string }> = {
  new: {
    label: 'Новое',
    color: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    dot: 'bg-blue-500',
  },
  review: {
    label: 'На рассмотрении',
    color: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    dot: 'bg-amber-500',
  },
  in_progress: {
    label: 'В работе',
    color: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
    dot: 'bg-violet-500',
  },
  approved: {
    label: 'Согласовано',
    color: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Отклонено',
    color: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    dot: 'bg-red-500',
  },
  archived_completed: {
    label: 'Завершено',
    color: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
    dot: 'bg-teal-500',
  },
  archived_outdated: {
    label: 'Устарело',
    color: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
    dot: 'bg-orange-400',
  },
};

interface StatusBadgeProps {
  status: Status;
  compact?: boolean;
}

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ${compact ? 'text-[11px]' : 'text-xs'} font-medium whitespace-nowrap ${cfg.color}`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export function getStatusConfig(status: Status) {
  return STATUS_CONFIG[status];
}
