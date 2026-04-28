import React, { useState, useEffect, useRef } from 'react';
import {
  X, Save, Plus, Edit2, Trash2, Archive, ArchiveRestore,
  AlertCircle, ArrowUp, ArrowDown, ExternalLink,
  Building2, Hash, Tag, User, FileText, Layers, Info,
  ChevronRight, Clock, History, ChevronDown,
  Upload,
} from 'lucide-react';
import { GK, GKStage, GKFunction, GKStatus, HistoryEntry, UserRole } from '../../types/gk';
import { GKStatusBadge } from './StatusBadge';
import { FunctionsManager } from './FunctionsManager';
import { generateHistory, CUSTOMERS } from '../../data/mockData';

// ─── types ────────────────────────────────────────────────────────────────────

type ModalTab = 'basic' | 'stages' | 'functions' | 'history';

interface FormState {
  name: string; shortName: string; code: string; customer: string;
  status: GKStatus; useShortNameInId: boolean; note: string;
}

const EMPTY_FORM: FormState = {
  name: '', shortName: '', code: '', customer: '',
  status: 'active', useShortNameInId: false, note: '',
};

export interface GKModalProps {
  mode: 'create' | 'edit';
  gk?: GK | null;
  role: UserRole;
  onSave: (data: Partial<GK>) => Promise<void>;
  onClose: () => void;
  onArchive?: (gk: GK) => void;
  onRestore?: (gk: GK) => void;
  onDelete?: (gk: GK) => void;
  onUpdateGK?: (gkId: string, updates: Partial<GK>) => void;
  onViewProposals?: (gk: GK) => void;
  onOpenImport?: (stageId: string) => void;
}

// ─── utils ───────────────────────────────────────────────────────────────────

const inp = (err?: string): React.CSSProperties => ({
  border: `1.5px solid ${err ? '#EF4444' : '#DCE3EE'}`,
  borderRadius: 10,
  color: '#1F2937',
  background: 'white',
  width: '100%',
  padding: '9px 12px',
  fontSize: 13,
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
});

function inpFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = '#2563EB';
  e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
}
function inpBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, err?: string) {
  e.target.style.borderColor = err ? '#EF4444' : '#DCE3EE';
  e.target.style.boxShadow = 'none';
}

// ─── basic form ───────────────────────────────────────────────────────────────

function BasicTab({ form, setForm, errors, gk, role }: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Partial<Record<keyof FormState, string>>;
  gk?: GK | null;
  role: UserRole;
}) {
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const totalFns = gk?.stages.reduce((s, st) => s + st.functions.length, 0) ?? 0;

  return (
    <div className="flex gap-6">
      {/* Left column: form */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* GK name */}
        <div>
          <label className="flex items-center gap-1.5 text-xs mb-1.5" style={{ color: '#64748B', fontWeight: 500 }}>
            <Building2 className="w-3.5 h-3.5" />Наименование ГК <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <textarea
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Полное наименование государственного контракта"
            rows={2}
            style={{ ...inp(errors.name), resize: 'none', lineHeight: 1.5 } as React.CSSProperties}
            onFocus={inpFocus}
            onBlur={(e) => inpBlur(e, errors.name)}
          />
          {errors.name && <Err>{errors.name}</Err>}
        </div>

        {/* Short name + Code */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs mb-1.5" style={{ color: '#64748B', fontWeight: 500 }}>
              <Tag className="w-3.5 h-3.5" />Краткое наим. <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={form.shortName}
              onChange={(e) => set('shortName', e.target.value.toUpperCase())}
              placeholder="МФЦ"
              style={inp(errors.shortName)}
              onFocus={inpFocus}
              onBlur={(e) => inpBlur(e, errors.shortName)}
            />
            {errors.shortName && <Err>{errors.shortName}</Err>}
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs mb-1.5" style={{ color: '#64748B', fontWeight: 500 }}>
              <Hash className="w-3.5 h-3.5" />Код / Номер ГК <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => set('code', e.target.value)}
              placeholder="2024-МЦД-001"
              style={inp(errors.code)}
              onFocus={inpFocus}
              onBlur={(e) => inpBlur(e, errors.code)}
            />
            {errors.code && <Err>{errors.code}</Err>}
          </div>
        </div>

        {/* Customer */}
        <div>
          <label className="flex items-center gap-1.5 text-xs mb-1.5" style={{ color: '#64748B', fontWeight: 500 }}>
            <User className="w-3.5 h-3.5" />Заказчик <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <select
            value={form.customer}
            onChange={(e) => set('customer', e.target.value)}
            style={{ ...inp(errors.customer), appearance: 'none', cursor: 'pointer' } as React.CSSProperties}
            onFocus={inpFocus}
            onBlur={(e) => inpBlur(e, errors.customer)}
          >
            <option value="">— Выберите заказчика —</option>
            {CUSTOMERS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.customer && <Err>{errors.customer}</Err>}
        </div>

        {/* Status */}
        <div>
          <label className="text-xs mb-2 block" style={{ color: '#64748B', fontWeight: 500 }}>Статус</label>
          <div className="flex gap-3">
            {(['active', 'archive'] as const).map((s) => (
              <label
                key={s}
                className="flex items-center gap-2.5 flex-1 p-3 rounded-xl cursor-pointer transition-all"
                style={{
                  border: `1.5px solid ${form.status === s ? (s === 'active' ? '#22C55E' : '#94A3B8') : '#DCE3EE'}`,
                  background: form.status === s ? (s === 'active' ? '#F0FDF4' : '#F8FAFC') : 'white',
                }}
              >
                <input type="radio" className="sr-only" checked={form.status === s} onChange={() => set('status', s)} />
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ border: `2px solid ${form.status === s ? (s === 'active' ? '#22C55E' : '#94A3B8') : '#DCE3EE'}` }}
                >
                  {form.status === s && <div className="w-2 h-2 rounded-full" style={{ background: s === 'active' ? '#22C55E' : '#94A3B8' }} />}
                </div>
                <span className="text-sm" style={{ color: form.status === s ? (s === 'active' ? '#15803D' : '#64748B') : '#64748B', fontWeight: form.status === s ? 500 : 400 }}>
                  {s === 'active' ? '● Активна' : '○ Архив'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* useShortNameInId */}
        <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #DCE3EE' }}>
          <div
            onClick={() => set('useShortNameInId', !form.useShortNameInId)}
            className="relative flex-shrink-0 cursor-pointer transition-all mt-0.5"
            style={{ width: 40, height: 22, borderRadius: 11, background: form.useShortNameInId ? '#2563EB' : '#CBD5E1' }}
          >
            <div className="absolute top-0.5 rounded-full bg-white shadow-sm transition-all"
              style={{ width: 18, height: 18, left: form.useShortNameInId ? 20 : 2 }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs" style={{ color: '#1F2937', fontWeight: 500 }}>Использовать краткое имя в ID</p>
            {form.useShortNameInId && form.shortName && (
              <p className="text-[10px] mt-0.5" style={{ color: '#64748B' }}>
                Пример: <code style={{ color: '#2563EB', fontWeight: 600 }}>{form.shortName}-2024-001</code>
              </p>
            )}
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="flex items-center gap-1.5 text-xs mb-1.5" style={{ color: '#64748B', fontWeight: 500 }}>
            <FileText className="w-3.5 h-3.5" />Примечание
          </label>
          <textarea
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
            placeholder="Дополнительная информация о контракте…"
            rows={3}
            style={{ ...inp(), resize: 'none', lineHeight: 1.6 } as React.CSSProperties}
            onFocus={inpFocus}
            onBlur={(e) => inpBlur(e)}
          />
        </div>
      </div>

      {/* Right column: stats (edit mode only) */}
      {gk && (
        <div className="w-52 flex-shrink-0 space-y-3">
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #DCE3EE' }}>
            <div className="px-4 py-2" style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
              <p className="text-[10px]" style={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Статистика</p>
            </div>
            {[
              { label: 'Этапов', value: gk.stages.length, color: '#2563EB', bg: '#EFF6FF' },
              { label: 'Функций', value: totalFns, color: '#16A34A', bg: '#F0FDF4' },
              { label: 'Jira Epics', value: gk.stages.flatMap((s) => s.functions.flatMap((f) => f.jiraEpics)).length, color: '#7C3AED', bg: '#F5F3FF' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid #F8FAFC' }}>
                <span className="text-xs" style={{ color: '#64748B' }}>{label}</span>
                <span className="text-sm px-2 py-0.5 rounded-lg" style={{ color, background: bg, fontWeight: 700 }}>{value}</span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #DCE3EE' }}>
            <div className="px-4 py-2" style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
              <p className="text-[10px]" style={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Метаданные</p>
            </div>
            {[
              { label: 'Создано', value: new Date(gk.createdAt).toLocaleDateString('ru-RU') },
              { label: 'Обновлено', value: new Date(gk.updatedAt).toLocaleDateString('ru-RU') },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col px-4 py-2.5" style={{ borderBottom: '1px solid #F8FAFC' }}>
                <span className="text-[10px]" style={{ color: '#94A3B8' }}>{label}</span>
                <span className="text-xs" style={{ color: '#64748B', fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>

          {gk.note && (
            <div className="rounded-2xl p-3" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <p className="text-[10px] mb-1" style={{ color: '#D97706', fontWeight: 600 }}>Примечание</p>
              <p className="text-[10px] leading-relaxed" style={{ color: '#92400E' }}>{gk.note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── stages tab ───────────────────────────────────────────────────────────────

interface StageFormData { stageNumber: string; stageName: string; comment: string; }
const EMPTY_STAGE: StageFormData = { stageNumber: '', stageName: '', comment: '' };

function StagesTab({ gk, role, onUpdateGK }: {
  gk: GK;
  role: UserRole;
  onUpdateGK?: (id: string, u: Partial<GK>) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stageForm, setStageForm] = useState<StageFormData>(EMPTY_STAGE);
  const [stageErrors, setStageErrors] = useState<Partial<StageFormData>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const sorted = [...gk.stages].sort((a, b) => a.stageNumber - b.stageNumber);
  const usedNums = sorted.map((s) => s.stageNumber);

  const validateStage = (form: StageFormData, exceptId?: string): Partial<StageFormData> => {
    const e: Partial<StageFormData> = {};
    const n = Number(form.stageNumber);
    if (!form.stageNumber || isNaN(n) || n < 1) { e.stageNumber = 'Укажите корректный номер'; }
    else {
      const dup = sorted.find((s) => s.stageNumber === n && s.id !== exceptId);
      if (dup) e.stageNumber = `Номер ${n} уже занят`;
    }
    if (!form.stageName.trim()) e.stageName = 'Наименование обязательно';
    return e;
  };

  const handleAdd = () => {
    const errs = validateStage(stageForm);
    setStageErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const newStage: GKStage = {
      id: `stage_${Date.now()}`,
      stageNumber: Number(stageForm.stageNumber),
      stageName: stageForm.stageName.trim(),
      comment: stageForm.comment.trim() || undefined,
      functions: [],
    };
    onUpdateGK?.(gk.id, { stages: [...gk.stages, newStage], updatedAt: new Date().toISOString() });
    setAdding(false);
    setStageForm(EMPTY_STAGE);
    setStageErrors({});
  };

  const handleEdit = (stage: GKStage) => {
    const errs = validateStage(stageForm, stage.id);
    setStageErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onUpdateGK?.(gk.id, {
      stages: gk.stages.map((s) =>
        s.id === stage.id
          ? { ...s, stageNumber: Number(stageForm.stageNumber), stageName: stageForm.stageName.trim(), comment: stageForm.comment.trim() || undefined }
          : s
      ),
      updatedAt: new Date().toISOString(),
    });
    setEditingId(null);
  };

  const startEdit = (stage: GKStage) => {
    setEditingId(stage.id);
    setStageForm({ stageNumber: String(stage.stageNumber), stageName: stage.stageName, comment: stage.comment ?? '' });
    setStageErrors({});
    setAdding(false);
  };

  const handleDelete = (stageId: string) => {
    onUpdateGK?.(gk.id, { stages: gk.stages.filter((s) => s.id !== stageId), updatedAt: new Date().toISOString() });
    setDeleteConfirmId(null);
  };

  const moveStage = (stageId: string, dir: 'up' | 'down') => {
    const idx = sorted.findIndex((s) => s.id === stageId);
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === sorted.length - 1) return;
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    const newSorted = [...sorted];
    const aNum = newSorted[idx].stageNumber;
    const bNum = newSorted[swapIdx].stageNumber;
    newSorted[idx] = { ...newSorted[idx], stageNumber: bNum };
    newSorted[swapIdx] = { ...newSorted[swapIdx], stageNumber: aNum };
    onUpdateGK?.(gk.id, { stages: newSorted, updatedAt: new Date().toISOString() });
  };

  const StageInlineForm = ({ onSave, onCancel, existingId }: { onSave: () => void; onCancel: () => void; existingId?: string }) => (
    <div className="px-4 py-4 rounded-2xl space-y-3" style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE' }}>
      <div className="grid gap-3" style={{ gridTemplateColumns: '90px 1fr' }}>
        <div>
          <label className="text-[10px] block mb-1" style={{ color: '#2563EB', fontWeight: 600 }}>
            № этапа <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input type="number" min={1}
            value={stageForm.stageNumber}
            onChange={(e) => setStageForm((f) => ({ ...f, stageNumber: e.target.value }))}
            style={{ ...inp(stageErrors.stageNumber), padding: '7px 10px', fontSize: 12 }}
            onFocus={inpFocus}
            onBlur={(e) => inpBlur(e, stageErrors.stageNumber)}
          />
          {stageErrors.stageNumber && <Err>{stageErrors.stageNumber}</Err>}
        </div>
        <div>
          <label className="text-[10px] block mb-1" style={{ color: '#2563EB', fontWeight: 600 }}>
            Наименование <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input type="text"
            value={stageForm.stageName}
            onChange={(e) => setStageForm((f) => ({ ...f, stageName: e.target.value }))}
            placeholder="Разработка и тестирование"
            style={{ ...inp(stageErrors.stageName), padding: '7px 10px', fontSize: 12 }}
            onFocus={inpFocus}
            onBlur={(e) => inpBlur(e, stageErrors.stageName)}
          />
          {stageErrors.stageName && <Err>{stageErrors.stageName}</Err>}
        </div>
      </div>
      <div>
        <label className="text-[10px] block mb-1" style={{ color: '#2563EB', fontWeight: 600 }}>Комментарий</label>
        <input type="text"
          value={stageForm.comment}
          onChange={(e) => setStageForm((f) => ({ ...f, comment: e.target.value }))}
          placeholder="Необязательный комментарий"
          style={{ ...inp(), padding: '7px 10px', fontSize: 12 }}
          onFocus={inpFocus}
          onBlur={(e) => inpBlur(e)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Btn variant="ghost" onClick={onCancel} size="sm">Отмена</Btn>
        <Btn variant="primary" onClick={onSave} size="sm"><Save className="w-3 h-3" />Сохранить</Btn>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: '#64748B' }}>
          Этапов: <span style={{ color: '#1F2937', fontWeight: 600 }}>{gk.stages.length}</span>
        </p>
        {role !== 'read' && !adding && (
          <Btn variant="primary-ghost" size="sm" onClick={() => { setAdding(true); setEditingId(null); setStageForm({ stageNumber: String(usedNums.length + 1), stageName: '', comment: '' }); setStageErrors({}); }}>
            <Plus className="w-3.5 h-3.5" />Добавить этап
          </Btn>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <StageInlineForm onSave={handleAdd} onCancel={() => { setAdding(false); setStageErrors({}); }} />
      )}

      {/* Empty */}
      {sorted.length === 0 && !adding && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl" style={{ border: '2px dashed #DCE3EE', background: '#F8FAFC' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#EFF6FF' }}>
            <Layers className="w-6 h-6" style={{ color: '#93C5FD' }} />
          </div>
          <div className="text-center">
            <p className="text-sm" style={{ color: '#1F2937', fontWeight: 500 }}>Этапы не добавлены</p>
            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Создайте первый этап для этой ГК</p>
          </div>
          {role !== 'read' && (
            <Btn variant="primary-ghost" size="sm" onClick={() => { setAdding(true); setStageForm({ stageNumber: '1', stageName: '', comment: '' }); setStageErrors({}); }}>
              <Plus className="w-3.5 h-3.5" />Добавить этап
            </Btn>
          )}
        </div>
      )}

      {/* Stages table */}
      {sorted.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #DCE3EE' }}>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #DCE3EE' }}>
                {['№', 'Наименование', 'Комментарий', 'Функций', role !== 'read' ? 'Порядок' : '', role !== 'read' ? 'Действия' : ''].filter(Boolean).map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 whitespace-nowrap" style={{ fontWeight: 600, fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((stage, i) => (
                editingId === stage.id ? (
                  <tr key={stage.id}>
                    <td colSpan={6} className="px-3 py-3">
                      <StageInlineForm
                        existingId={stage.id}
                        onSave={() => handleEdit(stage)}
                        onCancel={() => { setEditingId(null); setStageErrors({}); }}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={stage.id} className="group/stage transition-colors" style={{ borderBottom: '1px solid #F1F5F9', background: 'white' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#F8FAFC'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'white'; }}
                  >
                    <td className="px-4 py-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-white" style={{ background: '#2563EB', fontWeight: 700 }}>
                        {stage.stageNumber}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span style={{ color: '#1F2937', fontWeight: 500 }}>{stage.stageName}</span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <span className="truncate block" style={{ color: '#94A3B8' }}>{stage.comment ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full" style={{ background: stage.functions.length > 0 ? '#EFF6FF' : '#F1F5F9', color: stage.functions.length > 0 ? '#2563EB' : '#CBD5E1', fontWeight: 600 }}>
                        {stage.functions.length}
                      </span>
                    </td>
                    {role !== 'read' && (
                      <td className="px-4 py-3">
                        <div className="flex gap-0.5">
                          <button onClick={() => moveStage(stage.id, 'up')} disabled={i === 0}
                            className="p-1 rounded transition-colors" style={{ color: i === 0 ? '#E2E8F0' : '#94A3B8' }}
                            onMouseEnter={(e) => { if (i > 0) (e.currentTarget as HTMLButtonElement).style.color = '#2563EB'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = i === 0 ? '#E2E8F0' : '#94A3B8'; }}>
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => moveStage(stage.id, 'down')} disabled={i === sorted.length - 1}
                            className="p-1 rounded transition-colors"
                            style={{ color: i === sorted.length - 1 ? '#E2E8F0' : '#94A3B8' }}
                            onMouseEnter={(e) => { if (i < sorted.length - 1) (e.currentTarget as HTMLButtonElement).style.color = '#2563EB'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = i === sorted.length - 1 ? '#E2E8F0' : '#94A3B8'; }}>
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                    {role !== 'read' && (
                      <td className="px-4 py-3">
                        {deleteConfirmId === stage.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px]" style={{ color: '#EF4444' }}>Удалить?</span>
                            <button onClick={() => handleDelete(stage.id)}
                              className="text-[10px] px-2 py-0.5 rounded-lg text-white transition-all" style={{ background: '#EF4444' }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#DC2626'; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#EF4444'; }}>Да</button>
                            <button onClick={() => setDeleteConfirmId(null)}
                              className="text-[10px] px-2 py-0.5 rounded-lg transition-all" style={{ border: '1px solid #DCE3EE', color: '#64748B' }}>Нет</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 opacity-0 group-hover/stage:opacity-100 transition-opacity">
                            <IBtn onClick={() => startEdit(stage)} hoverColor="#2563EB" hoverBg="#EFF6FF" title="Редактировать">
                              <Edit2 className="w-3.5 h-3.5" />
                            </IBtn>
                            {role === 'superuser' && (
                              <IBtn onClick={() => setDeleteConfirmId(stage.id)} hoverColor="#EF4444" hoverBg="#FEF2F2" title="Удалить">
                                <Trash2 className="w-3.5 h-3.5" />
                              </IBtn>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── functions tab ────────────────────────────────────────────────────────────

function FunctionsTab({ gk, role, onUpdateGK, onOpenImport }: {
  gk: GK;
  role: UserRole;
  onUpdateGK?: (id: string, u: Partial<GK>) => void;
  onOpenImport?: (stageId: string) => void;
}) {
  const sorted = [...gk.stages].sort((a, b) => a.stageNumber - b.stageNumber);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(sorted[0]?.id ?? null);
  const selectedStage = sorted.find((s) => s.id === selectedStageId) ?? null;

  const handleAddFunction = (stageId: string, data: Omit<GKFunction, 'id' | 'updatedAt'>) => {
    const newFn: GKFunction = { ...data, id: `fn_${Date.now()}`, updatedAt: new Date().toISOString() };
    onUpdateGK?.(gk.id, { stages: gk.stages.map((s) => s.id === stageId ? { ...s, functions: [...s.functions, newFn] } : s), updatedAt: new Date().toISOString() });
  };
  const handleUpdateFunction = (stageId: string, fnId: string, data: Partial<GKFunction>) =>
    onUpdateGK?.(gk.id, { stages: gk.stages.map((s) => s.id === stageId ? { ...s, functions: s.functions.map((f) => f.id === fnId ? { ...f, ...data, updatedAt: new Date().toISOString() } : f) } : s), updatedAt: new Date().toISOString() });
  const handleDeleteFunction = (stageId: string, fnId: string) =>
    onUpdateGK?.(gk.id, { stages: gk.stages.map((s) => s.id === stageId ? { ...s, functions: s.functions.filter((f) => f.id !== fnId) } : s), updatedAt: new Date().toISOString() });

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#EFF6FF' }}>
          <Layers className="w-7 h-7" style={{ color: '#93C5FD' }} />
        </div>
        <div className="text-center">
          <p className="text-sm" style={{ color: '#1F2937', fontWeight: 500 }}>Нет этапов</p>
          <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Добавьте этапы на вкладке «Этапы», затем управляйте функциями</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stage selector + Import button */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-[10px] block mb-1.5" style={{ color: '#64748B', fontWeight: 500 }}>
            ЭТАП ДЛЯ УПРАВЛЕНИЯ ФУНКЦИЯМИ
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {sorted.map((stage) => (
              <button
                key={stage.id}
                onClick={() => setSelectedStageId(stage.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all"
                style={
                  selectedStageId === stage.id
                    ? { background: '#2563EB', color: 'white', fontWeight: 600, border: '1.5px solid #2563EB' }
                    : { background: 'white', color: '#64748B', border: '1.5px solid #DCE3EE', fontWeight: 400 }
                }
                onMouseEnter={(e) => {
                  if (selectedStageId !== stage.id) (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC';
                }}
                onMouseLeave={(e) => {
                  if (selectedStageId !== stage.id) (e.currentTarget as HTMLButtonElement).style.background = 'white';
                }}
              >
                <span
                  className="w-5 h-5 rounded-md flex items-center justify-center text-[10px]"
                  style={{
                    background: selectedStageId === stage.id ? 'rgba(255,255,255,0.2)' : '#F1F5F9',
                    color: selectedStageId === stage.id ? 'white' : '#64748B',
                    fontWeight: 700,
                  }}
                >
                  {stage.stageNumber}
                </span>
                {stage.stageName.length > 20 ? stage.stageName.slice(0, 20) + '…' : stage.stageName}
                <span
                  className="px-1.5 py-0.5 rounded-full text-[9px]"
                  style={{
                    background: selectedStageId === stage.id ? 'rgba(255,255,255,0.25)' : '#EFF6FF',
                    color: selectedStageId === stage.id ? 'white' : '#2563EB',
                    fontWeight: 600,
                  }}
                >
                  {stage.functions.length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Import button */}
        {role !== 'read' && selectedStageId && (
          <button
            onClick={() => onOpenImport?.(selectedStageId!)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all flex-shrink-0"
            style={{ background: '#F5F3FF', color: '#7C3AED', border: '1.5px solid #DDD6FE', fontWeight: 500 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#EDE9FE'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F5F3FF'; }}
          >
            <Upload className="w-4 h-4" />
            Импорт функций
          </button>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#F1F5F9' }} />

      {/* Functions */}
      {selectedStage ? (
        <FunctionsManager
          stage={selectedStage}
          role={role}
          onAddFunction={handleAddFunction}
          onUpdateFunction={handleUpdateFunction}
          onDeleteFunction={handleDeleteFunction}
        />
      ) : (
        <p className="text-sm text-center py-8" style={{ color: '#94A3B8' }}>Выберите этап</p>
      )}
    </div>
  );
}

// ─── history tab ──────────────────────────────────────────────────────────────

function HistoryTab({ gk }: { gk: GK }) {
  const [history] = useState<HistoryEntry[]>(() => generateHistory(gk.id));
  const typeStyle: Record<string, { color: string; bg: string; border: string }> = {
    'Создание':           { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
    'Изменение':          { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    'Добавление этапа':   { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    'Добавление функции': { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  };
  return (
    <div className="space-y-0">
      {history.map((e, i) => {
        const s = typeStyle[e.action] ?? { color: '#64748B', bg: '#F8FAFC', border: '#DCE3EE' };
        return (
          <div key={e.id} className="flex gap-4">
            <div className="flex flex-col items-center flex-shrink-0 pt-1.5">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
              {i < history.length - 1 && <div className="w-px flex-1 mt-1.5 mb-1.5" style={{ background: '#F1F5F9' }} />}
            </div>
            <div className="flex-1 min-w-0 pb-4">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] border"
                  style={{ color: s.color, background: s.bg, borderColor: s.border, fontWeight: 500 }}>
                  {e.action}
                </span>
                {e.field && <span className="text-[10px]" style={{ color: '#64748B' }}>поле: <b>{e.field}</b></span>}
              </div>
              {e.oldValue && e.newValue && (
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[10px] line-through" style={{ color: '#94A3B8' }}>{e.oldValue}</span>
                  <ChevronRight className="w-2.5 h-2.5" style={{ color: '#CBD5E1' }} />
                  <span className="text-[10px]" style={{ color: '#1F2937', fontWeight: 500 }}>{e.newValue}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-[10px]" style={{ color: '#94A3B8' }}>
                <span>{e.user}</span>
                <span>·</span>
                <Clock className="w-2.5 h-2.5" />
                <span>{new Date(e.timestamp).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── shared mini-components ───────────────────────────────────────────────────

function Err({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 text-[10px] flex items-center gap-1" style={{ color: '#EF4444' }}>
      <AlertCircle className="w-2.5 h-2.5 flex-shrink-0" />{children}
    </p>
  );
}

function Btn({ children, onClick, variant = 'primary', size = 'md', disabled }: {
  children: React.ReactNode; onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'primary-ghost';
  size?: 'sm' | 'md'; disabled?: boolean;
}) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    borderRadius: size === 'sm' ? 10 : 12,
    padding: size === 'sm' ? '6px 12px' : '9px 18px',
    fontSize: size === 'sm' ? 12 : 13,
    fontWeight: 500,
    transition: 'all 0.15s',
    cursor: 'pointer',
    border: '1.5px solid transparent',
    opacity: disabled ? 0.6 : 1,
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: '#2563EB', color: 'white', borderColor: '#2563EB' },
    ghost: { background: 'white', color: '#64748B', borderColor: '#DCE3EE' },
    danger: { background: '#EF4444', color: 'white', borderColor: '#EF4444' },
    'primary-ghost': { background: '#EFF6FF', color: '#2563EB', borderColor: '#BFDBFE' },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...baseStyle, ...variants[variant] }}
      onMouseEnter={(e) => {
        if (!disabled) {
          const el = e.currentTarget as HTMLButtonElement;
          if (variant === 'primary') el.style.background = '#3B82F6';
          if (variant === 'ghost') el.style.background = '#F8FAFC';
          if (variant === 'danger') el.style.background = '#DC2626';
          if (variant === 'primary-ghost') el.style.background = '#DBEAFE';
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = variants[variant].background as string;
      }}
    >
      {children}
    </button>
  );
}

function IBtn({ onClick, children, title, hoverColor, hoverBg }: {
  onClick: () => void; children: React.ReactNode; title?: string; hoverColor: string; hoverBg: string;
}) {
  return (
    <button onClick={onClick} title={title}
      className="p-1.5 rounded-lg transition-all" style={{ color: '#94A3B8' }}
      onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.color = hoverColor; el.style.background = hoverBg; }}
      onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.color = '#94A3B8'; el.style.background = 'transparent'; }}>
      {children}
    </button>
  );
}

// ─── main GKModal ─────────────────────────────────────────────────────────────

export function GKModal({ mode, gk, role, onSave, onClose, onArchive, onRestore, onDelete, onUpdateGK, onViewProposals, onOpenImport }: GKModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('basic');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && gk) {
      setForm({ name: gk.name, shortName: gk.shortName, code: gk.code, customer: gk.customer, status: gk.status, useShortNameInId: gk.useShortNameInId, note: gk.note });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setActiveTab('basic');
  }, [mode, gk?.id]);

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'Обязательное поле';
    if (!form.shortName.trim()) e.shortName = 'Обязательное поле';
    if (!form.code.trim()) e.code = 'Обязательное поле';
    if (!form.customer.trim()) e.customer = 'Выберите заказчика';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) { setActiveTab('basic'); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const tabs: { id: ModalTab; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    { id: 'basic',    label: 'Основное',         icon: <Info className="w-3.5 h-3.5" /> },
    { id: 'stages',   label: `Этапы${gk ? ` (${gk.stages.length})` : ''}`,    icon: <Layers className="w-3.5 h-3.5" />, disabled: mode === 'create' },
    { id: 'functions',label: `Функции${gk ? ` (${gk.stages.reduce((s,st)=>s+st.functions.length,0)})` : ''}`, icon: <Upload className="w-3.5 h-3.5" />, disabled: mode === 'create' },
    { id: 'history',  label: 'История',           icon: <History className="w-3.5 h-3.5" />, disabled: mode === 'create' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0" style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)' }} onClick={onClose} />

      {/* Modal */}
      <div
        className="relative flex flex-col bg-white"
        style={{
          width: '100%', maxWidth: 960,
          height: '90vh', maxHeight: 820,
          borderRadius: 20,
          boxShadow: '0 30px 80px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Accent bar */}
        <div className="h-1 flex-shrink-0" style={{ background: 'linear-gradient(90deg, #2563EB, #7C3AED)' }} />

        {/* Header */}
        <div className="flex-shrink-0" style={{ background: '#0F172A' }}>
          <div className="flex items-start justify-between px-6 py-4">
            <div className="flex-1 min-w-0">
              {mode === 'edit' && gk ? (
                <>
                  <div className="flex items-center gap-2 mb-1.5">
                    <GKStatusBadge status={gk.status} />
                    <code className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: '#1E293B', color: '#64748B' }}>
                      {gk.code}
                    </code>
                    <code className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: '#1E293B', color: '#94A3B8' }}>
                      {gk.shortName}
                    </code>
                  </div>
                  <h2 className="text-base leading-snug" style={{ color: 'white', fontWeight: 700, maxWidth: 600 }}>
                    {gk.name}
                  </h2>
                  <p className="text-xs mt-1" style={{ color: '#475569' }}>{gk.customer}</p>
                </>
              ) : (
                <>
                  <h2 style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>Создать ГК</h2>
                  <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Заполните основные данные государственного контракта</p>
                </>
              )}
            </div>

            {/* Header actions (edit mode) */}
            <div className="flex items-center gap-1 flex-shrink-0 ml-4">
              {mode === 'edit' && gk && (
                <>
                  {onViewProposals && (
                    <HBtn onClick={() => onViewProposals(gk)} title="Предложения" hoverColor="#FCD34D">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </HBtn>
                  )}
                  {role !== 'read' && onArchive && gk.status === 'active' && (
                    <HBtn onClick={() => onArchive(gk)} title="В архив" hoverColor="#FCD34D">
                      <Archive className="w-3.5 h-3.5" />
                    </HBtn>
                  )}
                  {role !== 'read' && onRestore && gk.status === 'archive' && (
                    <HBtn onClick={() => onRestore(gk)} title="Восстановить" hoverColor="#4ADE80">
                      <ArchiveRestore className="w-3.5 h-3.5" />
                    </HBtn>
                  )}
                  {role === 'superuser' && onDelete && (
                    <HBtn onClick={() => onDelete(gk)} title="Удалить" hoverColor="#F87171">
                      <Trash2 className="w-3.5 h-3.5" />
                    </HBtn>
                  )}
                </>
              )}
              <HBtn onClick={onClose} title="Закрыть" hoverColor="#F87171">
                <X className="w-4 h-4" />
              </HBtn>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex px-6 gap-0" style={{ borderTop: '1px solid #1E293B' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                disabled={tab.disabled}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs border-b-2 transition-all whitespace-nowrap"
                style={{
                  borderColor: activeTab === tab.id ? '#3B82F6' : 'transparent',
                  color: tab.disabled ? '#334155' : activeTab === tab.id ? '#60A5FA' : '#64748B',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  cursor: tab.disabled ? 'not-allowed' : 'pointer',
                }}
                title={tab.disabled ? 'Доступно после сохранения ГК' : undefined}
              >
                {tab.icon}
                {tab.label}
                {tab.disabled && mode === 'create' && (
                  <span className="text-[9px] ml-0.5" style={{ color: '#334155' }}>(после создания)</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6" style={{ background: activeTab === 'basic' ? 'white' : '#FAFBFC' }}>
          {activeTab === 'basic' && (
            <BasicTab form={form} setForm={setForm} errors={errors} gk={gk} role={role} />
          )}
          {activeTab === 'stages' && gk && (
            <StagesTab gk={gk} role={role} onUpdateGK={onUpdateGK} />
          )}
          {activeTab === 'functions' && gk && (
            <FunctionsTab gk={gk} role={role} onUpdateGK={onUpdateGK} onOpenImport={onOpenImport} />
          )}
          {activeTab === 'history' && gk && (
            <HistoryTab gk={gk} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid #F1F5F9', background: 'white' }}>
          <div>
            {activeTab !== 'basic' && mode === 'edit' && (
              <p className="text-xs" style={{ color: '#94A3B8' }}>
                <Info className="w-3 h-3 inline mr-1 align-middle" />
                Изменения на этой вкладке применяются сразу
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" onClick={onClose}>Отмена</Btn>
            {(activeTab === 'basic' || mode === 'create') && role !== 'read' && (
              <Btn variant="primary" onClick={handleSave} disabled={saving}>
                {saving
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Сохранение…</>
                  : <><Save className="w-4 h-4" />{mode === 'create' ? 'Создать ГК' : 'Сохранить изменения'}</>
                }
              </Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HBtn({ onClick, children, title, hoverColor }: {
  onClick: () => void; children: React.ReactNode; title: string; hoverColor: string;
}) {
  return (
    <button onClick={onClick} title={title}
      className="p-1.5 rounded-lg transition-all" style={{ color: '#64748B' }}
      onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.color = hoverColor; el.style.background = '#1E293B'; }}
      onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.color = '#64748B'; el.style.background = 'transparent'; }}>
      {children}
    </button>
  );
}
