import React, { useState } from 'react';
import {
  Edit2, Archive, ArchiveRestore, Trash2, ExternalLink,
  Layers, Zap, FileCode, Calendar, RefreshCw, Info,
  History, Upload, Building2, Hash, Tag, FileText, Link,
  ChevronRight, MessageSquare,
} from 'lucide-react';
import { GK, GKFunction, GKStage, UserRole } from '../../types/gk';
import { GKStatusBadge, JiraStatusBadge } from './StatusBadge';
import { StagesTab } from './StagesTab';
import { HistoryTab } from './HistoryTab';
import { FunctionsManager } from './FunctionsManager';

// ─── types ────────────────────────────────────────────────────────────────────

type Tab = 'basic' | 'stages' | 'functions' | 'history';

interface Props {
  gk: GK;
  role: UserRole;
  onEdit: (gk: GK) => void;
  onArchive: (gk: GK) => void;
  onRestore: (gk: GK) => void;
  onDelete: (gk: GK) => void;
  onUpdateGK: (id: string, updates: Partial<GK>) => void;
  onViewProposals: (gk: GK) => void;
  onOpenImport: (stageId: string) => void;
}

// ─── basic tab content ────────────────────────────────────────────────────────

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: '1px solid #F8FAFC' }}>
      <span className="w-28 flex-shrink-0 text-right" style={{ fontSize: 11, color: '#94A3B8', paddingTop: 1 }}>{label}</span>
      <div className="flex-1 min-w-0" style={{ fontSize: 12.5, color: '#1F2937' }}>{children}</div>
    </div>
  );
}

function StatCard({ label, value, color, bg, icon }: {
  label: string; value: number; color: string; bg: string; icon: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col gap-2 p-4 rounded-2xl" style={{ background: bg, border: `1px solid ${color}18` }}>
      <div style={{ color, opacity: 0.55 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#64748B' }}>{label}</div>
    </div>
  );
}

function BasicTabContent({ gk }: { gk: GK }) {
  const totalFns = gk.stages.reduce((s, st) => s + st.functions.length, 0);
  const allJira = gk.stages.flatMap((s) => s.functions.flatMap((f) => f.jiraEpics));
  const allConf = gk.stages.flatMap((s) => s.functions.flatMap((f) => f.confluenceLinks));

  return (
    <div className="space-y-5">
      {/* Info table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #F1F5F9' }}>
        <InfoRow label="Наименование">
          <span style={{ fontWeight: 500, lineHeight: 1.5 }}>{gk.name}</span>
        </InfoRow>
        <InfoRow label="Краткое имя">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full" style={{ background: '#EFF6FF', color: '#2563EB', fontWeight: 700, fontSize: 12 }}>
            {gk.shortName}
          </span>
        </InfoRow>
        <InfoRow label="Код / Номер">
          <code style={{ fontSize: 12, background: '#F8FAFC', padding: '2px 8px', borderRadius: 8, border: '1px solid #F1F5F9', color: '#475569' }}>
            {gk.code}
          </code>
        </InfoRow>
        <InfoRow label="Заказчик">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#94A3B8' }} />
            {gk.customer}
          </span>
        </InfoRow>
        <InfoRow label="Статус">
          <GKStatusBadge status={gk.status} />
        </InfoRow>
        <InfoRow label="ID из краткого">
          <span className="flex items-center gap-2">
            <span className="w-8 h-4 rounded-full flex items-center" style={{ background: gk.useShortNameInId ? '#2563EB' : '#E2E8F0', padding: '2px', transition: 'background 0.2s' }}>
              <span className="w-3 h-3 rounded-full bg-white shadow-sm" style={{ marginLeft: gk.useShortNameInId ? 16 : 2, transition: 'margin 0.2s' }} />
            </span>
            <span style={{ fontSize: 12, color: '#64748B' }}>{gk.useShortNameInId ? 'Включено' : 'Выключено'}</span>
            {gk.useShortNameInId && (
              <code style={{ fontSize: 10, color: '#2563EB', background: '#EFF6FF', padding: '1px 6px', borderRadius: 6 }}>
                {gk.shortName}-2024-001
              </code>
            )}
          </span>
        </InfoRow>
        {gk.note && (
          <InfoRow label="Примечание">
            <span style={{ color: '#64748B', lineHeight: 1.6, fontSize: 12 }}>{gk.note}</span>
          </InfoRow>
        )}
        <InfoRow label="Создано">
          <span style={{ color: '#64748B' }}>{new Date(gk.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
        </InfoRow>
        <InfoRow label="Обновлено">
          <span style={{ color: '#64748B' }}>{new Date(gk.updatedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
        </InfoRow>
      </div>

      {/* Stat cards */}
      <div className="flex gap-3">
        <StatCard label="Этапов"    value={gk.stages.length} color="#2563EB" bg="#EFF6FF" icon={<Layers className="w-5 h-5" />} />
        <StatCard label="Функций"   value={totalFns}          color="#16A34A" bg="#F0FDF4" icon={<Zap className="w-5 h-5" />} />
        <StatCard label="Jira Epics" value={allJira.length}  color="#7C3AED" bg="#F5F3FF" icon={<FileCode className="w-5 h-5" />} />
        <StatCard label="Confluence" value={allConf.length}  color="#D97706" bg="#FFFBEB" icon={<Link className="w-5 h-5" />} />
      </div>

      {/* Jira epics preview */}
      {allJira.length > 0 && (
        <div>
          <p className="mb-2" style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Jira Epics
          </p>
          <div className="flex flex-wrap gap-2">
            {allJira.slice(0, 12).map((j, idx) => (
              <a key={idx} href={j.url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all"
                style={{ border: '1.5px solid #BFDBFE', background: '#EFF6FF', textDecoration: 'none' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = '#DBEAFE'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = '#EFF6FF'; }}
              >
                <code style={{ fontSize: 10, color: '#2563EB', fontWeight: 700 }}>{j.key}</code>
                <JiraStatusBadge status={j.status} />
                <ExternalLink className="w-2.5 h-2.5" style={{ color: '#93C5FD' }} />
              </a>
            ))}
            {allJira.length > 12 && (
              <span className="px-2.5 py-1.5 rounded-xl" style={{ fontSize: 11, color: '#94A3B8', background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                +{allJira.length - 12} ещё
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── functions tab content ────────────────────────────────────────────────────

function FunctionsTabContent({ gk, role, onUpdateGK, onOpenImport }: {
  gk: GK; role: UserRole;
  onUpdateGK: (id: string, u: Partial<GK>) => void;
  onOpenImport: (stageId: string) => void;
}) {
  const sorted = [...gk.stages].sort((a, b) => a.stageNumber - b.stageNumber);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(sorted[0]?.id ?? null);
  const selectedStage = sorted.find((s) => s.id === selectedStageId) ?? null;

  const handleAddFn = (stageId: string, data: Omit<GKFunction, 'id' | 'updatedAt'>) => {
    const newFn: GKFunction = { ...data, id: `fn_${Date.now()}`, updatedAt: new Date().toISOString() };
    onUpdateGK(gk.id, {
      stages: gk.stages.map((s) => s.id === stageId ? { ...s, functions: [...s.functions, newFn] } : s),
      updatedAt: new Date().toISOString(),
    });
  };
  const handleUpdateFn = (stageId: string, fnId: string, data: Partial<GKFunction>) =>
    onUpdateGK(gk.id, {
      stages: gk.stages.map((s) => s.id === stageId
        ? { ...s, functions: s.functions.map((f) => f.id === fnId ? { ...f, ...data, updatedAt: new Date().toISOString() } : f) }
        : s),
      updatedAt: new Date().toISOString(),
    });
  const handleDeleteFn = (stageId: string, fnId: string) =>
    onUpdateGK(gk.id, {
      stages: gk.stages.map((s) => s.id === stageId ? { ...s, functions: s.functions.filter((f) => f.id !== fnId) } : s),
      updatedAt: new Date().toISOString(),
    });

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#EFF6FF' }}>
          <Layers className="w-7 h-7" style={{ color: '#93C5FD' }} />
        </div>
        <div className="text-center">
          <p style={{ fontSize: 14, color: '#1F2937', fontWeight: 500 }}>Нет этапов</p>
          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Перейдите на вкладку «Этапы» и создайте первый</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stage pills + import button */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="mb-2" style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Выберите этап
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {sorted.map((stage) => {
              const isSel = selectedStageId === stage.id;
              return (
                <button key={stage.id} onClick={() => setSelectedStageId(stage.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all"
                  style={{
                    fontSize: 12, border: '1.5px solid',
                    borderColor: isSel ? '#2563EB' : '#DCE3EE',
                    background: isSel ? '#2563EB' : 'white',
                    color: isSel ? 'white' : '#64748B',
                    fontWeight: isSel ? 600 : 400, cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'; }}
                  onMouseLeave={(e) => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = 'white'; }}
                >
                  <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px]"
                    style={{ background: isSel ? 'rgba(255,255,255,0.2)' : '#F1F5F9', color: isSel ? 'white' : '#64748B', fontWeight: 700 }}>
                    {stage.stageNumber}
                  </span>
                  <span className="max-w-[140px] truncate">{stage.stageName}</span>
                  <span className="px-1.5 py-0 rounded-full text-[10px]"
                    style={{ background: isSel ? 'rgba(255,255,255,0.25)' : '#EFF6FF', color: isSel ? 'white' : '#2563EB', fontWeight: 600 }}>
                    {stage.functions.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {role !== 'read' && selectedStageId && (
          <button
            onClick={() => onOpenImport(selectedStageId!)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all flex-shrink-0 mt-5"
            style={{ background: '#F5F3FF', color: '#7C3AED', border: '1.5px solid #DDD6FE', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#EDE9FE'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F5F3FF'; }}
          >
            <Upload className="w-4 h-4" />
            Импорт функций
          </button>
        )}
      </div>
      <div style={{ height: 1, background: '#F1F5F9' }} />
      {selectedStage ? (
        <FunctionsManager
          stage={selectedStage}
          role={role}
          onAddFunction={handleAddFn}
          onUpdateFunction={handleUpdateFn}
          onDeleteFunction={handleDeleteFn}
        />
      ) : (
        <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingTop: 32 }}>Выберите этап</p>
      )}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function GKDetailView({ gk, role, onEdit, onArchive, onRestore, onDelete, onUpdateGK, onViewProposals, onOpenImport }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('basic');

  const totalFns = gk.stages.reduce((s, st) => s + st.functions.length, 0);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'basic',     label: 'Основное',  icon: <Info className="w-3.5 h-3.5" /> },
    { id: 'stages',    label: 'Этапы',     icon: <Layers className="w-3.5 h-3.5" />,  badge: gk.stages.length },
    { id: 'functions', label: 'Функции',   icon: <Zap className="w-3.5 h-3.5" />,      badge: totalFns },
    { id: 'history',   label: 'История',   icon: <History className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: '#F8FAFC' }}>
      {/* ── Detail Header ── */}
      <div className="flex-shrink-0" style={{ background: '#0F172A' }}>
        {/* Top row: GK meta + actions */}
        <div className="flex items-start justify-between px-6 py-4 gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <GKStatusBadge status={gk.status} />
              <code className="px-2 py-0.5 rounded-lg" style={{ fontSize: 10, background: '#1E293B', color: '#64748B' }}>
                {gk.code}
              </code>
              <span className="px-2 py-0.5 rounded-lg" style={{ fontSize: 10, background: '#1E293B', color: '#94A3B8', fontWeight: 700 }}>
                {gk.shortName}
              </span>
            </div>
            <h2 className="leading-snug" style={{ color: 'white', fontWeight: 700, fontSize: 17, maxWidth: 560 }}>
              {gk.name}
            </h2>
            <p className="mt-1 flex items-center gap-1.5" style={{ fontSize: 12, color: '#475569' }}>
              <Building2 className="w-3 h-3" />
              {gk.customer}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {role !== 'read' && (
              <HeaderActionBtn onClick={() => onEdit(gk)} hoverColor="#93C5FD" title="Редактировать ГК" label="Редактировать">
                <Edit2 className="w-3.5 h-3.5" />
              </HeaderActionBtn>
            )}
            <HeaderActionBtn onClick={() => onViewProposals(gk)} hoverColor="#FCD34D" title="Предложения" label="Предложения">
              <MessageSquare className="w-3.5 h-3.5" />
            </HeaderActionBtn>
            {role !== 'read' && gk.status === 'active' && (
              <HeaderActionBtn onClick={() => onArchive(gk)} hoverColor="#FCD34D" title="В архив" label="Архив">
                <Archive className="w-3.5 h-3.5" />
              </HeaderActionBtn>
            )}
            {role !== 'read' && gk.status === 'archive' && (
              <HeaderActionBtn onClick={() => onRestore(gk)} hoverColor="#4ADE80" title="Восстановить" label="Восстановить">
                <ArchiveRestore className="w-3.5 h-3.5" />
              </HeaderActionBtn>
            )}
            {role === 'superuser' && (
              <HeaderActionBtn onClick={() => onDelete(gk)} hoverColor="#F87171" title="Удалить" label="Удалить">
                <Trash2 className="w-3.5 h-3.5" />
              </HeaderActionBtn>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex px-6 gap-0" style={{ borderTop: '1px solid #1E293B' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all whitespace-nowrap"
              style={{
                fontSize: 12.5,
                borderColor: activeTab === tab.id ? '#3B82F6' : 'transparent',
                color: activeTab === tab.id ? '#60A5FA' : '#64748B',
                fontWeight: activeTab === tab.id ? 600 : 400,
                background: 'transparent',
                cursor: 'pointer',
                border: 'none',
                borderBottom: `2px solid ${activeTab === tab.id ? '#3B82F6' : 'transparent'}`,
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="px-1.5 py-0 rounded-full text-[10px] leading-4"
                  style={{
                    background: activeTab === tab.id ? '#1E40AF' : '#1E293B',
                    color: activeTab === tab.id ? '#93C5FD' : '#64748B',
                    fontWeight: 600,
                  }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab body ── */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'basic' && <BasicTabContent gk={gk} />}
        {activeTab === 'stages' && (
          <StagesTab gk={gk} role={role} onUpdateGK={onUpdateGK} />
        )}
        {activeTab === 'functions' && (
          <FunctionsTabContent gk={gk} role={role} onUpdateGK={onUpdateGK} onOpenImport={onOpenImport} />
        )}
        {activeTab === 'history' && <HistoryTab gk={gk} />}
      </div>

      {/* ── Footer info bar ── */}
      <div
        className="flex items-center justify-between px-6 py-2 flex-shrink-0"
        style={{ borderTop: '1px solid #F1F5F9', background: 'white' }}
      >
        <div className="flex items-center gap-4">
          {[
            { icon: <Calendar className="w-3 h-3" />, label: `Создано: ${new Date(gk.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}` },
            { icon: <RefreshCw className="w-3 h-3" />, label: `Обновлено: ${new Date(gk.updatedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}` },
          ].map(({ icon, label }) => (
            <span key={label} className="flex items-center gap-1" style={{ fontSize: 10, color: '#CBD5E1' }}>
              {icon}{label}
            </span>
          ))}
        </div>
        {activeTab !== 'basic' && (
          <span style={{ fontSize: 10, color: '#CBD5E1' }}>
            <Info className="w-2.5 h-2.5 inline mr-1 align-middle" />
            Изменения на этой вкладке применяются сразу
          </span>
        )}
      </div>
    </div>
  );
}

function HeaderActionBtn({ onClick, children, title, label, hoverColor }: {
  onClick: () => void; children: React.ReactNode; title: string; label: string; hoverColor: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all group"
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#475569' }}
      onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.background = '#1E293B'; el.style.color = hoverColor; }}
      onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'transparent'; el.style.color = '#475569'; }}
    >
      {children}
      <span style={{ fontSize: 9, letterSpacing: '0.03em' }}>{label}</span>
    </button>
  );
}
