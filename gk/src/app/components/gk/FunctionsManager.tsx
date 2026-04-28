import React, { useState } from 'react';
import {
  Plus, Edit2, Trash2, X, Save, ExternalLink, Link, ChevronDown,
  ChevronRight, Hash, FileCode, AlertCircle,
} from 'lucide-react';
import { GKFunction, GKStage, JiraEpic, UserRole } from '../../types/gk';
import { JiraStatusBadge, JiraStatusProgress } from './StatusBadge';

interface Props {
  stage: GKStage;
  role: UserRole;
  onAddFunction: (stageId: string, data: Omit<GKFunction, 'id' | 'updatedAt'>) => void;
  onUpdateFunction: (stageId: string, fnId: string, data: Partial<GKFunction>) => void;
  onDeleteFunction: (stageId: string, fnId: string) => void;
}

interface FnForm {
  functionName: string;
  nmckFunctionNumber: string;
  tzSectionNumber: string;
  jiraEpics: JiraEpic[];
  confluenceLinks: string[];
}

const emptyForm: FnForm = {
  functionName: '', nmckFunctionNumber: '', tzSectionNumber: '',
  jiraEpics: [], confluenceLinks: [],
};

function validateFnForm(f: FnForm) {
  const e: Partial<Record<keyof FnForm, string>> = {};
  if (!f.functionName.trim()) e.functionName = 'Обязательное поле';
  if (!f.nmckFunctionNumber.trim()) e.nmckFunctionNumber = 'Обязательное поле';
  if (!f.tzSectionNumber.trim()) e.tzSectionNumber = 'Обязательное поле';
  return e;
}

function normalizeUrl(url: string): string {
  url = url.trim();
  if (url && !url.startsWith('http')) return `https://${url}`;
  return url;
}

const inputCls = (err?: string) => `
  w-full px-3 py-2 text-xs rounded-lg transition-all
  ${err ? 'outline-2 outline-red-400' : ''}
`.trim();
const inputStyle = (err?: string): React.CSSProperties => ({
  border: `1.5px solid ${err ? '#EF4444' : '#DCE3EE'}`,
  color: '#1F2937',
  background: 'white',
  outline: 'none',
});

function FnFormModal({
  initialData, onSave, onClose,
}: {
  initialData?: GKFunction;
  onSave: (data: FnForm) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FnForm>(
    initialData
      ? { functionName: initialData.functionName, nmckFunctionNumber: initialData.nmckFunctionNumber,
          tzSectionNumber: initialData.tzSectionNumber, jiraEpics: [...initialData.jiraEpics],
          confluenceLinks: [...initialData.confluenceLinks] }
      : emptyForm
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FnForm, string>>>({});
  const [newJiraKey, setNewJiraKey] = useState('');
  const [newJiraSummary, setNewJiraSummary] = useState('');
  const [newConfluence, setNewConfluence] = useState('');

  const set = <K extends keyof FnForm>(k: K, v: FnForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    const errs = validateFnForm(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onSave(form);
  };

  const addJira = () => {
    if (!newJiraKey.trim()) return;
    set('jiraEpics', [...form.jiraEpics, {
      key: newJiraKey.trim().toUpperCase(),
      summary: newJiraSummary.trim() || 'Epic',
      status: 'Open',
      url: `https://jira.example.com/browse/${newJiraKey.trim().toUpperCase()}`,
    }]);
    setNewJiraKey(''); setNewJiraSummary('');
  };

  const addConfluence = () => {
    const url = normalizeUrl(newConfluence);
    if (!url) return;
    set('confluenceLinks', [...form.confluenceLinks, url]);
    setNewConfluence('');
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)' }}>
        {/* Accent bar */}
        <div className="h-1 rounded-t-2xl" style={{ background: '#2563EB' }} />

        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <h3 className="text-gray-900" style={{ fontSize: 15, fontWeight: 600 }}>
            {initialData ? 'Редактировать функцию' : 'Добавить функцию'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* functionName */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#64748B', fontWeight: 500 }}>
              Наименование функции <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={form.functionName}
              onChange={(e) => set('functionName', e.target.value)}
              placeholder="Модуль авторизации и аутентификации"
              className={inputCls(errors.functionName)}
              style={inputStyle(errors.functionName)}
              onFocus={(e) => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
              onBlur={(e) => { e.target.style.borderColor = errors.functionName ? '#EF4444' : '#DCE3EE'; e.target.style.boxShadow = 'none'; }}
            />
            {errors.functionName && <p className="mt-1 text-xs flex items-center gap-1" style={{ color: '#EF4444' }}>
              <AlertCircle className="w-3 h-3" />{errors.functionName}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#64748B', fontWeight: 500 }}>
                <Hash className="w-3 h-3 inline mr-1" style={{ color: '#2563EB' }} />
                № НМЦК <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={form.nmckFunctionNumber}
                onChange={(e) => set('nmckFunctionNumber', e.target.value)}
                placeholder="1.1.01"
                className={inputCls(errors.nmckFunctionNumber)}
                style={inputStyle(errors.nmckFunctionNumber)}
                onFocus={(e) => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = errors.nmckFunctionNumber ? '#EF4444' : '#DCE3EE'; e.target.style.boxShadow = 'none'; }}
              />
              {errors.nmckFunctionNumber && <p className="mt-1 text-xs" style={{ color: '#EF4444' }}>{errors.nmckFunctionNumber}</p>}
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#64748B', fontWeight: 500 }}>
                <FileCode className="w-3 h-3 inline mr-1" style={{ color: '#7C3AED' }} />
                № раздела ТЗ <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={form.tzSectionNumber}
                onChange={(e) => set('tzSectionNumber', e.target.value)}
                placeholder="3.1.1"
                className={inputCls(errors.tzSectionNumber)}
                style={inputStyle(errors.tzSectionNumber)}
                onFocus={(e) => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = errors.tzSectionNumber ? '#EF4444' : '#DCE3EE'; e.target.style.boxShadow = 'none'; }}
              />
              {errors.tzSectionNumber && <p className="mt-1 text-xs" style={{ color: '#EF4444' }}>{errors.tzSectionNumber}</p>}
            </div>
          </div>

          {/* Jira Epics */}
          <div>
            <label className="block text-xs mb-2" style={{ color: '#64748B', fontWeight: 500 }}>
              Jira Epics
            </label>
            <div className="space-y-1.5 mb-2">
              {form.jiraEpics.map((epic, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #DCE3EE' }}>
                  <a href={epic.url} target="_blank" rel="noreferrer"
                    className="text-xs flex items-center gap-1 hover:underline" style={{ color: '#2563EB', fontWeight: 600 }}
                    onClick={(e) => e.stopPropagation()}>
                    {epic.key}<ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <span className="text-xs flex-1 truncate" style={{ color: '#64748B' }}>{epic.summary}</span>
                  <JiraStatusBadge status={epic.status} />
                  <button onClick={() => set('jiraEpics', form.jiraEpics.filter((_, idx) => idx !== i))}
                    className="text-slate-400 hover:text-red-500 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newJiraKey} onChange={(e) => setNewJiraKey(e.target.value)}
                placeholder="KEY-123" className="w-24 text-xs px-2.5 py-1.5 rounded-lg"
                style={{ border: '1.5px solid #DCE3EE', color: '#1F2937' }}
                onFocus={(e) => { e.target.style.borderColor = '#2563EB'; }}
                onBlur={(e) => { e.target.style.borderColor = '#DCE3EE'; }}
                onKeyDown={(e) => e.key === 'Enter' && addJira()} />
              <input type="text" value={newJiraSummary} onChange={(e) => setNewJiraSummary(e.target.value)}
                placeholder="Название epic" className="flex-1 text-xs px-2.5 py-1.5 rounded-lg"
                style={{ border: '1.5px solid #DCE3EE', color: '#1F2937' }}
                onFocus={(e) => { e.target.style.borderColor = '#2563EB'; }}
                onBlur={(e) => { e.target.style.borderColor = '#DCE3EE'; }}
                onKeyDown={(e) => e.key === 'Enter' && addJira()} />
              <button onClick={addJira} className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', fontWeight: 500 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#DBEAFE'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#EFF6FF'; }}>
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Confluence */}
          <div>
            <label className="block text-xs mb-2" style={{ color: '#64748B', fontWeight: 500 }}>
              Confluence links
            </label>
            <div className="space-y-1.5 mb-2">
              {form.confluenceLinks.map((link, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #DCE3EE' }}>
                  <Link className="w-3 h-3 flex-shrink-0" style={{ color: '#94A3B8' }} />
                  <a href={link} target="_blank" rel="noreferrer"
                    className="text-xs flex-1 truncate hover:underline" style={{ color: '#2563EB' }}>
                    {link}
                  </a>
                  <button onClick={() => set('confluenceLinks', form.confluenceLinks.filter((_, idx) => idx !== i))}
                    className="text-slate-400 hover:text-red-500 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newConfluence} onChange={(e) => setNewConfluence(e.target.value)}
                placeholder="https://confluence.example.com/pages/..."
                className="flex-1 text-xs px-2.5 py-1.5 rounded-lg"
                style={{ border: '1.5px solid #DCE3EE', color: '#1F2937' }}
                onFocus={(e) => { e.target.style.borderColor = '#2563EB'; }}
                onBlur={(e) => { e.target.style.borderColor = '#DCE3EE'; }}
                onKeyDown={(e) => e.key === 'Enter' && addConfluence()} />
              <button onClick={addConfluence} className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', fontWeight: 500 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#DBEAFE'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#EFF6FF'; }}>
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid #F1F5F9' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm transition-all"
            style={{ border: '1px solid #DCE3EE', color: '#64748B', background: 'white', fontWeight: 500 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; }}>
            Отмена
          </button>
          <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-white transition-all"
            style={{ background: '#2563EB', fontWeight: 500 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#3B82F6'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#2563EB'; }}>
            <Save className="w-4 h-4" />
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function FunctionsManager({ stage, role, onAddFunction, onUpdateFunction, onDeleteFunction }: Props) {
  const [editingFn, setEditingFn] = useState<GKFunction | null>(null);
  const [addingFn, setAddingFn] = useState(false);
  const [expandedFnId, setExpandedFnId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSave = (data: FnForm) => {
    if (editingFn) { onUpdateFunction(stage.id, editingFn.id, data); setEditingFn(null); }
    else { onAddFunction(stage.id, data); setAddingFn(false); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <span className="text-xs" style={{ color: '#64748B' }}>
          <span style={{ fontWeight: 600, color: '#1F2937' }}>{stage.functions.length}</span> функций
        </span>
        {role !== 'read' && (
          <button onClick={() => setAddingFn(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all"
            style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', fontWeight: 500 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#DBEAFE'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#EFF6FF'; }}>
            <Plus className="w-3 h-3" />
            Добавить функцию
          </button>
        )}
      </div>

      {/* Empty state */}
      {stage.functions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 rounded-2xl" style={{ border: '2px dashed #DCE3EE', background: '#F8FAFC' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ background: '#EFF6FF' }}>
            <FileCode className="w-5 h-5" style={{ color: '#93C5FD' }} />
          </div>
          <p className="text-xs" style={{ color: '#64748B', fontWeight: 500 }}>Функции не добавлены</p>
          {role !== 'read' && (
            <button onClick={() => setAddingFn(true)} className="mt-2 text-xs hover:underline transition-all" style={{ color: '#2563EB' }}>
              + Добавить первую функцию
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1.5 overflow-y-auto">
          {stage.functions.map((fn) => {
            const isExpanded = expandedFnId === fn.id;
            const isDeleting = deletingId === fn.id;

            return (
              <div key={fn.id} className="rounded-xl overflow-hidden transition-all"
                style={{ border: `1.5px solid ${isExpanded ? '#2563EB' : '#DCE3EE'}`, background: 'white' }}>
                {/* Row */}
                <div onClick={() => setExpandedFnId(isExpanded ? null : fn.id)}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'white'; }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs" style={{ color: '#1F2937', fontWeight: 500 }}>{fn.functionName}</span>
                      {fn.jiraEpics.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: '#EFF6FF', color: '#2563EB', fontWeight: 500 }}>
                          Jira: {fn.jiraEpics.length}
                        </span>
                      )}
                      {fn.confluenceLinks.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: '#F5F3FF', color: '#7C3AED', fontWeight: 500 }}>
                          Conf: {fn.confluenceLinks.length}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px]" style={{ color: '#94A3B8' }}>
                        НМЦК: <code style={{ color: '#2563EB' }}>{fn.nmckFunctionNumber}</code>
                      </span>
                      <span className="text-[10px]" style={{ color: '#94A3B8' }}>
                        ТЗ: <code style={{ color: '#7C3AED' }}>{fn.tzSectionNumber}</code>
                      </span>
                      <span className="text-[10px] ml-auto" style={{ color: '#CBD5E1' }}>{fmt(fn.updatedAt)}</span>
                    </div>
                  </div>
                  {role !== 'read' && (
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setEditingFn(fn)}
                        className="p-1.5 rounded-lg transition-all" style={{ color: '#94A3B8' }}
                        onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.color = '#2563EB'; el.style.background = '#EFF6FF'; }}
                        onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.color = '#94A3B8'; el.style.background = 'transparent'; }}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {isDeleting ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => { onDeleteFunction(stage.id, fn.id); setDeletingId(null); }}
                            className="px-2 py-1 text-[10px] rounded-lg text-white transition-all"
                            style={{ background: '#EF4444', fontWeight: 500 }}>Удалить</button>
                          <button onClick={() => setDeletingId(null)}
                            className="px-2 py-1 text-[10px] rounded-lg transition-all"
                            style={{ border: '1px solid #DCE3EE', color: '#64748B' }}>Отмена</button>
                        </div>
                      ) : role === 'superuser' && (
                        <button onClick={() => setDeletingId(fn.id)}
                          className="p-1.5 rounded-lg transition-all" style={{ color: '#94A3B8' }}
                          onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.color = '#EF4444'; el.style.background = '#FEF2F2'; }}
                          onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.color = '#94A3B8'; el.style.background = 'transparent'; }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                  <div className="flex-shrink-0">
                    {isExpanded
                      ? <ChevronDown className="w-3.5 h-3.5" style={{ color: '#2563EB' }} />
                      : <ChevronRight className="w-3.5 h-3.5" style={{ color: '#CBD5E1' }} />}
                  </div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="px-3 py-3 space-y-3" style={{ borderTop: '1px solid #F1F5F9', background: '#FAFBFC' }}>
                    {fn.jiraEpics.length > 0 && (
                      <div>
                        <p className="text-[10px] mb-2" style={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jira Epics</p>
                        <div className="space-y-2">
                          {fn.jiraEpics.map((epic, i) => (
                            <div key={i} className="p-2.5 rounded-xl" style={{ background: 'white', border: '1px solid #DCE3EE' }}>
                              <div className="flex items-center gap-2 mb-1.5">
                                <a href={epic.url} target="_blank" rel="noreferrer"
                                  className="text-xs flex items-center gap-1 hover:underline" style={{ color: '#2563EB', fontWeight: 700 }}
                                  onClick={(e) => e.stopPropagation()}>
                                  {epic.key}<ExternalLink className="w-2.5 h-2.5" />
                                </a>
                                <JiraStatusBadge status={epic.status} />
                                <span className="text-xs flex-1 truncate" style={{ color: '#64748B' }}>{epic.summary}</span>
                              </div>
                              <JiraStatusProgress status={epic.status} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {fn.confluenceLinks.length > 0 && (
                      <div>
                        <p className="text-[10px] mb-2" style={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confluence</p>
                        <div className="space-y-1">
                          {fn.confluenceLinks.map((link, i) => (
                            <a key={i} href={link} target="_blank" rel="noreferrer"
                              className="flex items-center gap-2 text-xs hover:underline" style={{ color: '#2563EB' }}
                              onClick={(e) => e.stopPropagation()}>
                              <Link className="w-3 h-3 flex-shrink-0" style={{ color: '#94A3B8' }} />
                              <span className="truncate">{link}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {fn.jiraEpics.length === 0 && fn.confluenceLinks.length === 0 && (
                      <p className="text-xs" style={{ color: '#CBD5E1' }}>Нет прикреплённых ссылок</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(addingFn || editingFn) && (
        <FnFormModal
          initialData={editingFn ?? undefined}
          onSave={handleSave}
          onClose={() => { setAddingFn(false); setEditingFn(null); }}
        />
      )}
    </div>
  );
}
