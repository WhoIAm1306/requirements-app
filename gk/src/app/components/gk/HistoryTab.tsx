import React, { useState } from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import { GK, HistoryEntry } from '../../types/gk';
import { generateHistory } from '../../data/mockData';

const typeStyle: Record<string, { color: string; bg: string; border: string }> = {
  'Создание':           { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  'Изменение':          { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  'Добавление этапа':   { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  'Добавление функции': { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
};

interface Props { gk: GK; }

export function HistoryTab({ gk }: Props) {
  const [history] = useState<HistoryEntry[]>(() => generateHistory(gk.id));

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#EFF6FF' }}>
          <Clock className="w-6 h-6" style={{ color: '#93C5FD' }} />
        </div>
        <p style={{ fontSize: 13, color: '#94A3B8' }}>История изменений пуста</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {history.map((e, i) => {
        const s = typeStyle[e.action] ?? { color: '#64748B', bg: '#F8FAFC', border: '#DCE3EE' };
        return (
          <div key={e.id} className="flex gap-4">
            <div className="flex flex-col items-center flex-shrink-0 pt-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
              {i < history.length - 1 && <div className="w-px flex-1 mt-1.5 mb-1.5" style={{ background: '#F1F5F9' }} />}
            </div>
            <div className="flex-1 min-w-0 pb-4">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full"
                  style={{ fontSize: 10, border: `1px solid ${s.border}`, color: s.color, background: s.bg, fontWeight: 500 }}
                >
                  {e.action}
                </span>
                {e.field && (
                  <span style={{ fontSize: 10, color: '#64748B' }}>
                    поле: <b>{e.field}</b>
                  </span>
                )}
              </div>
              {e.oldValue && e.newValue && (
                <div className="flex items-center gap-1 mb-1">
                  <span className="line-through" style={{ fontSize: 10, color: '#94A3B8' }}>{e.oldValue}</span>
                  <ChevronRight className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#CBD5E1' }} />
                  <span style={{ fontSize: 10, color: '#1F2937', fontWeight: 500 }}>{e.newValue}</span>
                </div>
              )}
              <div className="flex items-center gap-2" style={{ fontSize: 10, color: '#94A3B8' }}>
                <span>{e.user}</span>
                <span>·</span>
                <Clock className="w-2.5 h-2.5" />
                <span>
                  {new Date(e.timestamp).toLocaleString('ru-RU', {
                    day: '2-digit', month: '2-digit', year: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
