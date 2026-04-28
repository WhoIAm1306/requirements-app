import React, { useState } from 'react';
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, Save, Layers, AlertCircle } from 'lucide-react';
import { GK, GKStage, UserRole } from '../../types/gk';

// ─── shared utils ─────────────────────────────────────────────────────────────

export const stInp = (err?: string): React.CSSProperties => ({
  border: `1.5px solid ${err ? '#EF4444' : '#DCE3EE'}`,
  borderRadius: 10,
  color: '#1F2937',
  background: 'white',
  width: '100%',
  padding: '8px 11px',
  fontSize: 12.5,
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
});

export function stFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = '#2563EB';
  e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
}

export function stBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>, err?: string) {
  e.target.style.borderColor = err ? '#EF4444' : '#DCE3EE';
  e.target.style.boxShadow = 'none';
}

export function StErr({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 flex items-center gap-1" style={{ fontSize: 10, color: '#EF4444' }}>
      <AlertCircle className="w-2.5 h-2.5 flex-shrink-0" />{children}
    </p>
  );
}

export function SmBtn({
  children, onClick, variant = 'primary', disabled,
}: { children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'danger' | 'teal'; disabled?: boolean }) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: '#2563EB', color: 'white', borderColor: '#2563EB' },
    ghost: { background: 'white', color: '#64748B', borderColor: '#DCE3EE' },
    danger: { background: '#EF4444', color: 'white', borderColor: '#EF4444' },
    teal: { background: '#EFF6FF', color: '#2563EB', borderColor: '#BFDBFE' },
  };
  const hover: Record<string, string> = {
    primary: '#3B82F6', ghost: '#F8FAFC', danger: '#DC2626', teal: '#DBEAFE',
  };
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 500, border: '1.5px solid', cursor: 'pointer', opacity: disabled ? 0.6 : 1, transition: 'all 0.15s', ...styles[variant] }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = hover[variant]; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = styles[variant].background as string; }}
    >
      {children}
    </button>
  );
}

export function IBtn({ onClick, children, title, hoverColor, hoverBg }: {
  onClick: () => void; children: React.ReactNode; title?: string; hoverColor: string; hoverBg: string;
}) {
  return (
    <button onClick={onClick} title={title}
      style={{ padding: '5px', borderRadius: 8, color: '#94A3B8', background: 'transparent', cursor: 'pointer', transition: 'all 0.15s', border: 'none' }}
      onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.color = hoverColor; el.style.background = hoverBg; }}
      onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.color = '#94A3B8'; el.style.background = 'transparent'; }}>
      {children}
    </button>
  );
}

// ─── stage inline form ────────────────────────────────────────────────────────

interface StageFormData { stageNumber: string; stageName: string; comment: string; }
const EMPTY: StageFormData = { stageNumber: '', stageName: '', comment: '' };

function StageInlineForm({
  form, setForm, errors, onSave, onCancel,
}: {
  form: StageFormData;
  setForm: (f: StageFormData) => void;
  errors: Partial<StageFormData>;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-3 px-4 py-4 rounded-2xl" style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE' }}>
      <div className="grid gap-3" style={{ gridTemplateColumns: '80px 1fr' }}>
        <div>
          <label className="block mb-1" style={{ fontSize: 10, color: '#2563EB', fontWeight: 600 }}>
            № <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input type="number" min={1} value={form.stageNumber}
            onChange={(e) => setForm({ ...form, stageNumber: e.target.value })}
            style={stInp(errors.stageNumber)} onFocus={stFocus} onBlur={(e) => stBlur(e, errors.stageNumber)} />
          {errors.stageNumber && <StErr>{errors.stageNumber}</StErr>}
        </div>
        <div>
          <label className="block mb-1" style={{ fontSize: 10, color: '#2563EB', fontWeight: 600 }}>
            Наименование <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input type="text" value={form.stageName}
            onChange={(e) => setForm({ ...form, stageName: e.target.value })}
            placeholder="Разработка и тестирование"
            style={stInp(errors.stageName)} onFocus={stFocus} onBlur={(e) => stBlur(e, errors.stageName)} />
          {errors.stageName && <StErr>{errors.stageName}</StErr>}
        </div>
      </div>
      <div>
        <label className="block mb-1" style={{ fontSize: 10, color: '#2563EB', fontWeight: 600 }}>Комментарий</label>
        <input type="text" value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
          placeholder="Необязательный комментарий"
          style={stInp()} onFocus={stFocus} onBlur={(e) => stBlur(e)} />
      </div>
      <div className="flex justify-end gap-2">
        <SmBtn variant="ghost" onClick={onCancel}>Отмена</SmBtn>
        <SmBtn variant="primary" onClick={onSave}><Save className="w-3 h-3" />Сохранить</SmBtn>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

interface Props {
  gk: GK;
  role: UserRole;
  onUpdateGK?: (id: string, updates: Partial<GK>) => void;
}

export function StagesTab({ gk, role, onUpdateGK }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StageFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<StageFormData>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const sorted = [...gk.stages].sort((a, b) => a.stageNumber - b.stageNumber);

  const validate = (f: StageFormData, exceptId?: string): Partial<StageFormData> => {
    const e: Partial<StageFormData> = {};
    const n = Number(f.stageNumber);
    if (!f.stageNumber || isNaN(n) || n < 1) e.stageNumber = 'Укажите номер ≥ 1';
    else if (sorted.find((s) => s.stageNumber === n && s.id !== exceptId)) e.stageNumber = `Номер ${n} уже занят`;
    if (!f.stageName.trim()) e.stageName = 'Обязательное поле';
    return e;
  };

  const applyAdd = () => {
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const newStage: GKStage = {
      id: `stage_${Date.now()}`, stageNumber: Number(form.stageNumber),
      stageName: form.stageName.trim(), comment: form.comment.trim() || undefined, functions: [],
    };
    onUpdateGK?.(gk.id, { stages: [...gk.stages, newStage], updatedAt: new Date().toISOString() });
    setAdding(false); setForm(EMPTY); setErrors({});
  };

  const applyEdit = (stage: GKStage) => {
    const errs = validate(form, stage.id);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onUpdateGK?.(gk.id, {
      stages: gk.stages.map((s) => s.id === stage.id
        ? { ...s, stageNumber: Number(form.stageNumber), stageName: form.stageName.trim(), comment: form.comment.trim() || undefined }
        : s),
      updatedAt: new Date().toISOString(),
    });
    setEditingId(null);
  };

  const startEdit = (stage: GKStage) => {
    setEditingId(stage.id); setAdding(false);
    setForm({ stageNumber: String(stage.stageNumber), stageName: stage.stageName, comment: stage.comment ?? '' });
    setErrors({});
  };

  const moveStage = (stageId: string, dir: 'up' | 'down') => {
    const idx = sorted.findIndex((s) => s.id === stageId);
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === sorted.length - 1) return;
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    const clone = [...sorted];
    const aNum = clone[idx].stageNumber;
    clone[idx] = { ...clone[idx], stageNumber: clone[swapIdx].stageNumber };
    clone[swapIdx] = { ...clone[swapIdx], stageNumber: aNum };
    onUpdateGK?.(gk.id, { stages: clone, updatedAt: new Date().toISOString() });
  };

  const deleteStage = (id: string) => {
    onUpdateGK?.(gk.id, { stages: gk.stages.filter((s) => s.id !== id), updatedAt: new Date().toISOString() });
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-3 h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p style={{ fontSize: 11, color: '#94A3B8' }}>
          Этапов: <span style={{ color: '#1F2937', fontWeight: 600 }}>{gk.stages.length}</span>
        </p>
        {role !== 'read' && !adding && !editingId && (
          <SmBtn variant="teal" onClick={() => {
            setAdding(true);
            setForm({ stageNumber: String(sorted.length + 1), stageName: '', comment: '' });
            setErrors({});
          }}>
            <Plus className="w-3 h-3" />Добавить этап
          </SmBtn>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <StageInlineForm form={form} setForm={setForm} errors={errors}
          onSave={applyAdd} onCancel={() => { setAdding(false); setErrors({}); }} />
      )}

      {/* Empty */}
      {sorted.length === 0 && !adding && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl"
          style={{ border: '2px dashed #DCE3EE', background: '#F8FAFC' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#EFF6FF' }}>
            <Layers className="w-6 h-6" style={{ color: '#93C5FD' }} />
          </div>
          <div className="text-center">
            <p style={{ fontSize: 13, color: '#1F2937', fontWeight: 500 }}>Этапы не добавлены</p>
            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Создайте первый этап этой ГК</p>
          </div>
          {role !== 'read' && (
            <SmBtn variant="teal" onClick={() => { setAdding(true); setForm({ stageNumber: '1', stageName: '', comment: '' }); setErrors({}); }}>
              <Plus className="w-3 h-3" />Добавить этап
            </SmBtn>
          )}
        </div>
      )}

      {/* Table */}
      {sorted.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #DCE3EE' }}>
          <table className="w-full border-collapse" style={{ fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #DCE3EE' }}>
                {['№', 'Наименование', 'Комментарий', 'Функций', ...(role !== 'read' ? ['Порядок', ''] : [])].map((h) => (
                  <th key={h} className="text-left px-4 py-2" style={{ fontWeight: 600, fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((stage, i) =>
                editingId === stage.id ? (
                  <tr key={stage.id}>
                    <td colSpan={role !== 'read' ? 6 : 4} className="px-3 py-3">
                      <StageInlineForm form={form} setForm={setForm} errors={errors}
                        onSave={() => applyEdit(stage)}
                        onCancel={() => { setEditingId(null); setErrors({}); }} />
                    </td>
                  </tr>
                ) : (
                  <tr key={stage.id} className="group/row transition-colors"
                    style={{ borderBottom: '1px solid #F8FAFC', background: 'white' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#FAFBFC'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'white'; }}
                  >
                    <td className="px-4 py-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-white"
                        style={{ background: '#2563EB', fontWeight: 700, flexShrink: 0 }}>
                        {stage.stageNumber}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span style={{ color: '#1F2937', fontWeight: 500 }}>{stage.stageName}</span>
                    </td>
                    <td className="px-4 py-2.5" style={{ maxWidth: 200 }}>
                      <span className="block truncate" style={{ color: '#94A3B8' }}>{stage.comment ?? '—'}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 11, fontWeight: 600, background: stage.functions.length ? '#EFF6FF' : '#F1F5F9', color: stage.functions.length ? '#2563EB' : '#CBD5E1' }}>
                        {stage.functions.length}
                      </span>
                    </td>
                    {role !== 'read' && (
                      <>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-0.5">
                            <button onClick={() => moveStage(stage.id, 'up')} disabled={i === 0}
                              style={{ padding: 3, borderRadius: 6, color: i === 0 ? '#E2E8F0' : '#94A3B8', background: 'none', border: 'none', cursor: i === 0 ? 'not-allowed' : 'pointer' }}
                              onMouseEnter={(e) => { if (i > 0) (e.currentTarget as HTMLButtonElement).style.color = '#2563EB'; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = i === 0 ? '#E2E8F0' : '#94A3B8'; }}>
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => moveStage(stage.id, 'down')} disabled={i === sorted.length - 1}
                              style={{ padding: 3, borderRadius: 6, color: i === sorted.length - 1 ? '#E2E8F0' : '#94A3B8', background: 'none', border: 'none', cursor: i === sorted.length - 1 ? 'not-allowed' : 'pointer' }}
                              onMouseEnter={(e) => { if (i < sorted.length - 1) (e.currentTarget as HTMLButtonElement).style.color = '#2563EB'; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = i === sorted.length - 1 ? '#E2E8F0' : '#94A3B8'; }}>
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          {deleteConfirmId === stage.id ? (
                            <div className="flex items-center gap-1.5">
                              <span style={{ fontSize: 10, color: '#EF4444' }}>Удалить?</span>
                              <button onClick={() => deleteStage(stage.id)} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: '#EF4444', color: 'white', border: 'none', cursor: 'pointer' }}>Да</button>
                              <button onClick={() => setDeleteConfirmId(null)} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, border: '1px solid #DCE3EE', color: '#64748B', background: 'white', cursor: 'pointer' }}>Нет</button>
                            </div>
                          ) : (
                            <div className="flex gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
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
                      </>
                    )}
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
