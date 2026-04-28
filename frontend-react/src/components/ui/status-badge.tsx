interface StatusBadgeConfig {
  label: string
  color: string
  dot: string
}

const KNOWN: Record<string, StatusBadgeConfig> = {
  Новое: {
    label: 'Новое',
    color: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    dot: 'bg-slate-400',
  },
  'В работе': {
    label: 'В работе',
    color: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    dot: 'bg-blue-500',
  },
  'На рассмотрении': {
    label: 'На рассмотрении',
    color: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    dot: 'bg-amber-500',
  },
  Согласовано: {
    label: 'Согласовано',
    color: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
  Выполнено: {
    label: 'Выполнено',
    color: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
    dot: 'bg-teal-500',
  },
  Отклонено: {
    label: 'Отклонено',
    color: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    dot: 'bg-red-500',
  },
  Отложено: {
    label: 'Отложено',
    color: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
    dot: 'bg-orange-400',
  },
  Архив: {
    label: 'Архив',
    color: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
    dot: 'bg-orange-400',
  },
}

function getConfig(status: string): StatusBadgeConfig {
  if (KNOWN[status]) return KNOWN[status]
  return {
    label: status,
    color: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    dot: 'bg-slate-400',
  }
}

interface StatusBadgeProps {
  status: string
  compact?: boolean
}

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  if (!status) return null
  const cfg = getConfig(status)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium whitespace-nowrap ${compact ? 'text-[11px]' : 'text-xs'} ${cfg.color}`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}
