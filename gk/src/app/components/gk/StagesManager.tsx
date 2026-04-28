import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Save, AlertCircle, Layers } from 'lucide-react';
import { GK, GKFunction, GKStage, UserRole } from '../../types/gk';
import { FunctionsManager } from './FunctionsManager';

interface Props {
  gk: GK;
  role: UserRole;
  onAddStage: (data: { stageNumber: number; stageName: string; comment?: string }) => void;
  onUpdateStage: (stageId: string, data: Partial<GKStage>) => void;
  onDeleteStage: (stageId: string) => void;
  onAddFunction: (stageId: string, data: Omit<GKFunction, 'id' | 'updatedAt'>) => void;
  onUpdateFunction: (stageId: string, fnId: string, data: Partial<GKFunction>) => void;
  onDeleteFunction: (stageId: string, fnId: string) => void;
}

interface StageForm {
  stageNumber: string;
  stageName: string;
  comment: string;
}

function StageFormInline({
  existingNumbers, initial, onSave, onCancel,
}: {
  existingNumbers: number[];
  initial?: GKStage;
  onSave: (data: { stageNumber: number; stageName: string; comment?: string }) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<StageForm>({
    stageNumber: initial ? String(initial.stageNumber) : String(Math.max(0, ...existingNumbers) + 1),
    stageName: initial?.stageName ?? '',
    comment: initial?.comment ?? '',
  });
  const [errors, setErrors] = useState<Partial<StageForm>>({});

  const validate = () => {
    const e: Partial<StageForm> = {};
    const n = Number(form.stageNumber);
    if (!form.stageNumber.trim() || isNaN(n) || n < 1) e.stageNumber = 'Укажите корректный номер';
    else if (!initial && existingNumbers.includes(n)) e.stageNumber = 'Номер уже занят';
    if (!form.stageName.trim()) e.stageName = 'Наименование обязательно';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ stageNumber: Number(form.stageNumber), stageName: form.stageName.trim(), comment: form.comment.trim() || undefined });
  };

  const inStyle: React.CSSProperties = { border: '1.5px solid #DCE3EE', color: '#1F2937', background: 'white', borderRadius: 8, outline: 'none' };
  const inErrStyle: React.CSSProperties = { ...inStyle, borderColor: '#EF4444' };

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE' }}>
      <div className="grid gap-3" style={{ gridTemplateColumns: '80px 1fr' }}>
        <div>
          <label className="block text-xs mb-1" style={{ color: '#2563EB', fontWeight: 500 }}>
            № этапа <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            type="number" min={1}
            value={form.stageNumber}
            onChange={(e) => setForm((f) => ({ ...f, stageNumber: e.target.value }))}
            className="w-full px-2.5 py-1.5 text-xs"
            style={errors.stageNumber ? inErrStyle : inStyle}
            onFocus={(e) => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
            onBlur={(e) => { e.target.style.borderColor = errors.stageNumber ? '#EF4444' : '#DCE3EE'; e.target.style.boxShadow = 'none'; }}
          />
          {errors.stageNumber && <p className="mt-0.5 text-[10px]" style={{ color: '#EF4444' }}>{errors.stageNumber}</p>}
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: '#2563EB', fontWeight: 500 }}>
            Наименование <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            type="text"
            value={form.stageName}
            onChange={(e) => setForm((f) => ({ ...f, stageName: e.target.value }))}
            placeholder="Разработка и тестирование"
            className="w-full px-2.5 py-1.5 text-xs"
            style={errors.stageName ? inErrStyle : inStyle}
            onFocus={(e) => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
            onBlur={(e) => { e.target.style.borderColor = errors.stageName ? '#EF4444' : '#DCE3EE'; e.target.style.boxShadow = 'none'; }}
          />
          {errors.stageName && <p className="mt-0.5 text-[10px]" style={{ color: '#EF4444' }}>{errors.stageName}</p>}
        </div>
      </div>
      <div>
        <label className="block text-xs mb-1" style={{ color: '#2563EB', fontWeight: 500 }}>Комментарий</label>
        <input
          type="text"
          value={form.comment}
          onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
          placeholder="Необязательное описание"
          className="w-full px-2.5 py-1.5 text-xs"
          style={inStyle}
          onFocus={(e) => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
          onBlur={(e) => { e.target.style.borderColor = '#DCE3EE'; e.target.style.boxShadow = 'none'; }}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded-xl transition-all"
          style={{ border: '1px solid #BFDBFE', color: '#2563EB', background: 'white', fontWeight: 500 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; }}>
          Отмена
        </button>
        <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl text-white transition-all"
          style={{ background: '#2563EB', fontWeight: 500 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#3B82F6'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#2563EB'; }}>
          <Save className="w-3 h-3" />
          Сохранить
        </button>
      </div>
    </div>
  );
}

export function StagesManager({
  gk, role, onAddStage, onUpdateStage, onDeleteStage,
  onAddFunction, onUpdateFunction, onDeleteFunction,
}: Props) {
  const [selectedStageId, setSelectedStageId] = useState<string | null>(
    gk.stages.length > 0 ? gk.stages[0].id : null
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingStage, setAddingStage] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const existingNumbers = gk.stages.map((s) => s.stageNumber);
  const sorted = [...gk.stages].sort((a, b) => a.stageNumber - b.stageNumber);
  const selectedStage = sorted.find((s) => s.id === selectedStageId) ?? null;

  return (
    <div className="flex gap-0 h-full" style={{ minHeight: 300 }}>
      {/* Stage list: left column */}
      <div className="flex flex-col flex-shrink-0" style={{ width: 180, borderRight: '1px solid #DCE3EE' }}>
        <div className="flex items-center justify-between px-3 py-2 flex-shrink-0" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <span className="text-xs" style={{ color: '#64748B', fontWeight: 500 }}>
            {gk.stages.length} этапов
          </span>
          {role !== 'read' && !addingStage && (
            <button
              onClick={() => setAddingStage(true)}
              className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
              style={{ background: '#EFF6FF', color: '#2563EB' }}
              title="Добавить этап"
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#DBEAFE'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#EFF6FF'; }}>
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {gk.stages.length === 0 && !addingStage && (
            <div className="flex flex-col items-center justify-center h-32 gap-2 px-3">
              <Layers className="w-7 h-7" style={{ color: '#CBD5E1' }} />
              <p className="text-[10px] text-center" style={{ color: '#94A3B8' }}>Этапы не добавлены</p>
              {role !== 'read' && (
                <button onClick={() => setAddingStage(true)} className="text-[10px] hover:underline" style={{ color: '#2563EB' }}>
                  + Добавить
                </button>
              )}
            </div>
          )}

          {sorted.map((stage) => {
            const isSelected = selectedStageId === stage.id;
            const isEditing = editingId === stage.id;
            const isConfirmDelete = confirmDeleteId === stage.id;

            return (
              <div key={stage.id}>
                {isEditing ? (
                  <div className="p-2">
                    <StageFormInline
                      existingNumbers={existingNumbers.filter((n) => n !== stage.stageNumber)}
                      initial={stage}
                      onSave={(data) => { onUpdateStage(stage.id, data); setEditingId(null); }}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => { setSelectedStageId(stage.id); setConfirmDeleteId(null); }}
                    className="flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-all group/stage"
                    style={{
                      background: isSelected ? '#EFF6FF' : 'white',
                      borderLeft: `3px solid ${isSelected ? '#2563EB' : 'transparent'}`,
                      borderBottom: '1px solid #F1F5F9',
                    }}
                    onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC'; }}
                    onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'white'; }}
                  >
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] flex-shrink-0"
                      style={{
                        background: isSelected ? '#2563EB' : '#F1F5F9',
                        color: isSelected ? 'white' : '#64748B',
                        fontWeight: 700,
                      }}
                    >
                      {stage.stageNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] leading-tight truncate" style={{ color: isSelected ? '#1D4ED8' : '#1F2937', fontWeight: isSelected ? 600 : 400 }}>
                        {stage.stageName}
                      </p>
                      <span className="text-[9px]" style={{ color: '#94A3B8' }}>
                        {stage.functions.length} функц.
                      </span>
                    </div>

                    {/* Stage actions (visible on hover) */}
                    {role !== 'read' && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover/stage:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { setEditingId(stage.id); }}
                          className="p-0.5 rounded transition-colors" style={{ color: '#94A3B8' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#2563EB'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#94A3B8'; }}>
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                        {isConfirmDelete ? (
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => { onDeleteStage(stage.id); setConfirmDeleteId(null); if (selectedStageId === stage.id) setSelectedStageId(null); }}
                              className="text-[9px] px-1 py-0.5 rounded text-white" style={{ background: '#EF4444' }}>✓</button>
                            <button onClick={() => setConfirmDeleteId(null)}
                              className="text-[9px] px-1 py-0.5 rounded" style={{ border: '1px solid #DCE3EE', color: '#64748B' }}>✕</button>
                          </div>
                        ) : role === 'superuser' && (
                          <button onClick={() => setConfirmDeleteId(stage.id)}
                            className="p-0.5 rounded transition-colors" style={{ color: '#94A3B8' }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#94A3B8'; }}>
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Functions area: right column */}
      <div className="flex-1 overflow-hidden flex flex-col p-3">
        {addingStage && (
          <div className="mb-3 flex-shrink-0">
            <StageFormInline
              existingNumbers={existingNumbers}
              onSave={(data) => {
                onAddStage(data);
                setAddingStage(false);
              }}
              onCancel={() => setAddingStage(false)}
            />
          </div>
        )}

        {selectedStage ? (
          <div className="flex flex-col h-full">
            {/* Selected stage header */}
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-white"
                style={{ background: '#2563EB', fontWeight: 700 }}>
                {selectedStage.stageNumber}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: '#1F2937', fontWeight: 600 }}>{selectedStage.stageName}</p>
                {selectedStage.comment && (
                  <p className="text-[10px] truncate" style={{ color: '#94A3B8' }}>{selectedStage.comment}</p>
                )}
              </div>
            </div>
            <FunctionsManager
              stage={selectedStage}
              role={role}
              onAddFunction={onAddFunction}
              onUpdateFunction={onUpdateFunction}
              onDeleteFunction={onDeleteFunction}
            />
          </div>
        ) : !addingStage && (
          <div className="flex flex-col items-center justify-center flex-1 gap-2">
            <p className="text-xs" style={{ color: '#94A3B8' }}>Выберите этап для управления функциями</p>
          </div>
        )}
      </div>
    </div>
  );
}
