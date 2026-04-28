import React from 'react';
import { GKStatus, JiraEpicStatus } from '../../types/gk';

export function GKStatusBadge({ status }: { status: GKStatus }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-green-50 text-green-600 border border-green-200" style={{ fontWeight: 500 }}>
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
        Активна
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-slate-100 text-slate-500 border border-slate-200" style={{ fontWeight: 500 }}>
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
      Архив
    </span>
  );
}

const jiraStatusConfig: Record<JiraEpicStatus, {
  label: string; bg: string; color: string; border: string; progress: number; dot: string;
}> = {
  Open:     { label: 'Open',     bg: '#F8FAFC', color: '#64748B', border: '#DCE3EE', progress: 0,   dot: '#94A3B8' },
  Analysis: { label: 'Analysis', bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', progress: 25,  dot: '#F59E0B' },
  Dev:      { label: 'Dev',      bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE', progress: 50,  dot: '#3B82F6' },
  DevTest:  { label: 'DevTest',  bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE', progress: 75,  dot: '#8B5CF6' },
  Closed:   { label: 'Closed',   bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', progress: 100, dot: '#22C55E' },
};

export function JiraStatusBadge({ status }: { status: JiraEpicStatus }) {
  const cfg = jiraStatusConfig[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border"
      style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border, fontWeight: 500 }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

export function JiraStatusProgress({ status }: { status: JiraEpicStatus }) {
  const cfg = jiraStatusConfig[status];
  const steps: JiraEpicStatus[] = ['Open', 'Analysis', 'Dev', 'DevTest', 'Closed'];
  return (
    <div className="flex items-center gap-1 mt-1.5">
      {steps.map((step) => {
        const stepCfg = jiraStatusConfig[step];
        const active = steps.indexOf(step) <= steps.indexOf(status);
        return (
          <div
            key={step}
            className="flex-1 h-1 rounded-full transition-all"
            style={{ background: active ? stepCfg.dot : '#E2E8F0' }}
          />
        );
      })}
    </div>
  );
}
