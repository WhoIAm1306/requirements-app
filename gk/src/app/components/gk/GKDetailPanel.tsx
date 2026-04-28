import React, { useState } from 'react';
import {
  X, Edit2, Archive, ArchiveRestore, Layers, History,
  Info, ExternalLink, Clock, User, ChevronRight,
} from 'lucide-react';
import { GK, GKFunction, GKStage, HistoryEntry, UserRole } from '../../types/gk';
import { GKStatusBadge } from './StatusBadge';
import { StagesManager } from './StagesManager';
import { generateHistory } from '../../data/mockData';

interface Props {
  gk: GK;
  role: UserRole;
  onClose: () => void;
  onEdit: (gk: GK) => void;
  onArchive: (gk: GK) => void;
  onRestore: (gk: GK) => void;
  onUpdateGK: (gkId: string, updates: Partial<GK>) => void;
  onViewProposals: (gk: GK) => void;
}

type Tab = 'basic' | 'stages' | 'history';

function HistoryTab({ gk }: { gk: GK }) {
  const [history] = useState<HistoryEntry[]>(() => generateHistory(gk.id));

  const actionStyles: Record<string, { color: string; bg: string; border: string }> = {
    'Создание':           { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
    'Изменение':          { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    'Добавление этапа':   { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    'Добавление функции': { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  };

  return (
    <div className="space-y-2">
      {history.map((entry, i) => {
        const style = actionStyles[entry.action] ?? { color: '#64748B', bg: '#F8FAFC', border: '#DCE3EE' };
        return (
          <div key={entry.id} className="flex gap-3">
            {/* Timeline line */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="w-2 h-2 rounded-full mt-1.5" style={{ background: style.color }} />
              {i < history.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: '#F1F5F9' }} />}
            </div>

            <div className="flex-1 min-w-0 pb-3">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border"
                  style={{ color: style.color, background: style.bg, borderColor: style.border, fontWeight: 500 }}
                >
                  {entry.action}
                </span>
                {entry.field && (
                  <span className="text-[10px]" style={{ color: '#64748B' }}>
                    поле: <span style={{ fontWeight: 500 }}>{entry.field}</span>
                  </span>
                )}
              </div>
              {entry.oldValue && entry.newValue && (
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[10px] line-through" style={{ color: '#94A3B8' }}>{entry.oldValue}</span>
                  <ChevronRight className="w-2.5 h-2.5" style={{ color: '#CBD5E1' }} />
                  <span className="text-[10px]" style={{ color: '#1F2937', fontWeight: 500 }}>{entry.newValue}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <User className="w-2.5 h-2.5" style={{ color: '#94A3B8' }} />
                <span className="text-[10px]" style={{ color: '#64748B' }}>{entry.user}</span>
                <Clock className="w-2.5 h-2.5" style={{ color: '#94A3B8' }} />
                <span className="text-[10px]" style={{ color: '#94A3B8' }}>
                  {new Date(entry.timestamp).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BasicTab({ gk, onViewProposals }: { gk: GK; onViewProposals: (gk: GK) => void }) {
  const totalFunctions = gk.stages.reduce((s, st) => s + st.functions.length, 0);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 text-center" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <div className="text-3xl" style={{ color: '#2563EB', fontWeight: 800, lineHeight: 1 }}>{gk.stages.length}</div>
          <div className="text-xs mt-1" style={{ color: '#64748B' }}>Этапов</div>
        </div>
        <div className="rounded-2xl p-4 text-center" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <div className="text-3xl" style={{ color: '#16A34A', fontWeight: 800, lineHeight: 1 }}>{totalFunctions}</div>
          <div className="text-xs mt-1" style={{ color: '#64748B' }}>Функций</div>
        </div>
      </div>

      {/* Attributes */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #DCE3EE' }}>
        {[
          { label: 'Код ГК', value: <code className="text-xs px-2 py-0.5 rounded-md" style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', fontWeight: 600 }}>{gk.code}</code> },
          { label: 'Краткое наименование', value: <code className="text-xs px-2 py-0.5 rounded-md" style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', fontWeight: 600 }}>{gk.shortName}</code> },
          { label: 'Заказчик', value: <span className="text-xs" style={{ color: '#1F2937' }}>{gk.customer}</span> },
          { label: 'ID через краткое имя', value: <span className="text-xs" style={{ color: gk.useShortNameInId ? '#2563EB' : '#94A3B8', fontWeight: gk.useShortNameInId ? 600 : 400 }}>{gk.useShortNameInId ? 'Да' : 'Нет'}</span> },
          { label: 'Создано', value: <span className="text-xs" style={{ color: '#64748B' }}>{new Date(gk.createdAt).toLocaleDateString('ru-RU')}</span> },
          { label: 'Обновлено', value: <span className="text-xs" style={{ color: '#64748B' }}>{new Date(gk.updatedAt).toLocaleDateString('ru-RU')}</span> },
        ].map(({ label, value }, i, arr) => (
          <div
            key={label}
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: i < arr.length - 1 ? '1px solid #F1F5F9' : 'none' }}
          >
            <span className="text-xs" style={{ color: '#64748B' }}>{label}</span>
            <div>{value}</div>
          </div>
        ))}
      </div>

      {/* Note */}
      {gk.note && (
        <div className="rounded-2xl p-4" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <p className="text-xs mb-1" style={{ color: '#D97706', fontWeight: 600 }}>Примечание</p>
          <p className="text-xs leading-relaxed" style={{ color: '#92400E' }}>{gk.note}</p>
        </div>
      )}

      {/* Integration */}
      <div className="rounded-2xl p-4" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#2563EB' }}>
            <Info className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs mb-1" style={{ color: '#1D4ED8', fontWeight: 600 }}>
              Интеграция с предложениями
            </p>
            <p className="text-xs leading-relaxed" style={{ color: '#1E40AF' }}>
              При выборе этой ГК в карточке предложения доступны этапы и функции по НМЦК{' '}
              <code className="px-1 rounded" style={{ background: '#DBEAFE', color: '#1D4ED8' }}>{gk.shortName}</code>.
              Выбор функции автоматически подставит номер раздела ТЗ.
            </p>
            <button
              onClick={() => onViewProposals(gk)}
              className="flex items-center gap-1 mt-2 text-xs transition-all"
              style={{ color: '#2563EB', fontWeight: 500 }}
            >
              Открыть связанные предложения <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GKDetailPanel({ gk, role, onClose, onEdit, onArchive, onRestore, onUpdateGK, onViewProposals }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('basic');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'basic',   label: 'Основное', icon: <Info className="w-3.5 h-3.5" /> },
    { id: 'stages',  label: `Этапы (${gk.stages.length})`, icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'history', label: 'История', icon: <History className="w-3.5 h-3.5" /> },
  ];

  const handleAddStage = (data: { stageNumber: number; stageName: string; comment?: string }) => {
    const newStage: GKStage = {
      id: `stage_${Date.now()}`,
      stageNumber: data.stageNumber,
      stageName: data.stageName,
      comment: data.comment,
      functions: [],
    };
    onUpdateGK(gk.id, { stages: [...gk.stages, newStage], updatedAt: new Date().toISOString() });
  };

  const handleUpdateStage = (stageId: string, updates: Partial<GKStage>) =>
    onUpdateGK(gk.id, { stages: gk.stages.map((s) => (s.id === stageId ? { ...s, ...updates } : s)), updatedAt: new Date().toISOString() });

  const handleDeleteStage = (stageId: string) =>
    onUpdateGK(gk.id, { stages: gk.stages.filter((s) => s.id !== stageId), updatedAt: new Date().toISOString() });

  const handleAddFunction = (stageId: string, data: Omit<GKFunction, 'id' | 'updatedAt'>) => {
    const newFn: GKFunction = { ...data, id: `fn_${Date.now()}`, updatedAt: new Date().toISOString() };
    onUpdateGK(gk.id, {
      stages: gk.stages.map((s) => s.id === stageId ? { ...s, functions: [...s.functions, newFn] } : s),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateFunction = (stageId: string, fnId: string, data: Partial<GKFunction>) =>
    onUpdateGK(gk.id, {
      stages: gk.stages.map((s) =>
        s.id === stageId
          ? { ...s, functions: s.functions.map((f) => f.id === fnId ? { ...f, ...data, updatedAt: new Date().toISOString() } : f) }
          : s
      ),
      updatedAt: new Date().toISOString(),
    });

  const handleDeleteFunction = (stageId: string, fnId: string) =>
    onUpdateGK(gk.id, {
      stages: gk.stages.map((s) => s.id === stageId ? { ...s, functions: s.functions.filter((f) => f.id !== fnId) } : s),
      updatedAt: new Date().toISOString(),
    });

  return (
    <div
      className="flex flex-col h-full flex-shrink-0"
      style={{
        width: 500,
        minWidth: 400,
        background: 'white',
        borderLeft: '1px solid #DCE3EE',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.06)',
      }}
    >
      {/* Panel header */}
      <div className="flex-shrink-0" style={{ background: '#0F172A' }}>
        <div className="flex items-start gap-3 px-5 py-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <GKStatusBadge status={gk.status} />
              <code className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: '#1E293B', color: '#94A3B8' }}>
                {gk.code}
              </code>
            </div>
            <p className="text-sm leading-snug" style={{ color: 'white', fontWeight: 600 }} title={gk.name}>
              {gk.name.length > 70 ? gk.name.slice(0, 70) + '…' : gk.name}
            </p>
            <p className="text-xs mt-1" style={{ color: '#64748B' }}>{gk.customer}</p>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {role !== 'read' && (
              <HeaderIconBtn onClick={() => onEdit(gk)} title="Редактировать" hoverColor="#60A5FA">
                <Edit2 className="w-3.5 h-3.5" />
              </HeaderIconBtn>
            )}
            <HeaderIconBtn onClick={() => onViewProposals(gk)} title="Предложения" hoverColor="#FCD34D">
              <ExternalLink className="w-3.5 h-3.5" />
            </HeaderIconBtn>
            {role !== 'read' && (
              gk.status === 'active'
                ? <HeaderIconBtn onClick={() => onArchive(gk)} title="В архив" hoverColor="#FCD34D"><Archive className="w-3.5 h-3.5" /></HeaderIconBtn>
                : <HeaderIconBtn onClick={() => onRestore(gk)} title="Восстановить" hoverColor="#4ADE80"><ArchiveRestore className="w-3.5 h-3.5" /></HeaderIconBtn>
            )}
            <HeaderIconBtn onClick={onClose} title="Закрыть" hoverColor="#F87171">
              <X className="w-3.5 h-3.5" />
            </HeaderIconBtn>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4" style={{ borderTop: '1px solid #1E293B' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs border-b-2 transition-all whitespace-nowrap"
              style={{
                borderColor: activeTab === tab.id ? '#3B82F6' : 'transparent',
                color: activeTab === tab.id ? '#60A5FA' : '#64748B',
                fontWeight: activeTab === tab.id ? 600 : 400,
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'basic' && <BasicTab gk={gk} onViewProposals={onViewProposals} />}
        {activeTab === 'stages' && (
          <div className="h-full -m-5">
            <StagesManager
              gk={gk}
              role={role}
              onAddStage={handleAddStage}
              onUpdateStage={handleUpdateStage}
              onDeleteStage={handleDeleteStage}
              onAddFunction={handleAddFunction}
              onUpdateFunction={handleUpdateFunction}
              onDeleteFunction={handleDeleteFunction}
            />
          </div>
        )}
        {activeTab === 'history' && <HistoryTab gk={gk} />}
      </div>
    </div>
  );
}

function HeaderIconBtn({
  onClick, children, title, hoverColor,
}: {
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  hoverColor: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-lg transition-all"
      style={{ color: '#64748B' }}
      onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.color = hoverColor; el.style.background = '#1E293B'; }}
      onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.color = '#64748B'; el.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}
