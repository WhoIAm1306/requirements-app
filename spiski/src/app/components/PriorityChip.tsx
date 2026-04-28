import React from 'react';
import { Priority } from './registry/types';

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; icon: string }> = {
  critical: { label: 'Критический', color: 'text-red-600', icon: '▲▲' },
  high: { label: 'Высокий', color: 'text-orange-500', icon: '▲' },
  medium: { label: 'Средний', color: 'text-amber-500', icon: '●' },
  low: { label: 'Низкий', color: 'text-slate-400', icon: '▼' },
};

interface PriorityChipProps {
  priority: Priority;
  showLabel?: boolean;
}

export function PriorityChip({ priority, showLabel = false }: PriorityChipProps) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${cfg.color}`} title={cfg.label}>
      <span className="text-[10px] leading-none">{cfg.icon}</span>
      {showLabel && <span>{cfg.label}</span>}
    </span>
  );
}
