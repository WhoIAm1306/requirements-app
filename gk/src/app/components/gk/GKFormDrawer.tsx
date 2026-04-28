import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Building2, Hash, Tag, User, FileText } from 'lucide-react';
import { GK, GKStatus } from '../../types/gk';
import { CUSTOMERS } from '../../data/mockData';

interface Props {
  mode: 'create' | 'edit';
  initialData?: GK | null;
  onSave: (data: Partial<GK>) => void;
  onClose: () => void;
  saving?: boolean;
}

interface FormData {
  name: string;
  shortName: string;
  code: string;
  customer: string;
  status: GKStatus;
  useShortNameInId: boolean;
  note: string;
}

const EMPTY: FormData = {
  name: '', shortName: '', code: '', customer: '',
  status: 'active', useShortNameInId: false, note: '',
};

function Field({ label, required, error, icon, children }: {
  label: string; required?: boolean; error?: string; icon?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <label className="flex items-center gap-1.5 text-xs mb-2" style={{ color: '#64748B', fontWeight: 500 }}>
        {icon && <span style={{ color: '#94A3B8' }}>{icon}</span>}
        {label}
        {required && <span style={{ color: '#EF4444' }}>*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-xs flex items-center gap-1" style={{ color: '#EF4444' }}>
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

const inputStyle = (hasError?: boolean): React.CSSProperties => ({
  border: `1.5px solid ${hasError ? '#EF4444' : '#DCE3EE'}`,
  color: '#1F2937',
  background: 'white',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 13,
  width: '100%',
  outline: 'none',
  transition: 'all 0.15s',
});

export function GKFormDrawer({ mode, initialData, onSave, onClose, saving }: Props) {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setForm({
        name: initialData.name,
        shortName: initialData.shortName,
        code: initialData.code,
        customer: initialData.customer,
        status: initialData.status,
        useShortNameInId: initialData.useShortNameInId,
        note: initialData.note,
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
  }, [mode, initialData]);

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => setForm((f) => ({ ...f, [k]: v }));

  const validate = (): boolean => {
    const errs: Partial<FormData> = {};
    if (!form.name.trim()) errs.name = 'Наименование обязательно';
    if (!form.shortName.trim()) errs.shortName = 'Краткое наименование обязательно';
    if (!form.code.trim()) errs.code = 'Код ГК обязателен';
    if (!form.customer.trim()) errs.customer = 'Заказчик обязателен';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => { if (validate()) onSave(form); };

  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = '#2563EB';
    e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, hasError?: boolean) => {
    e.target.style.borderColor = hasError ? '#EF4444' : '#DCE3EE';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0" style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

      <div className="relative h-full flex flex-col bg-white" style={{ width: 480, boxShadow: '-8px 0 40px rgba(0,0,0,0.2)' }}>
        {/* Top accent */}
        <div className="h-1" style={{ background: 'linear-gradient(90deg, #2563EB, #7C3AED)' }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>
              {mode === 'create' ? 'Создать ГК' : 'Редактировать ГК'}
            </h2>
            {mode === 'edit' && initialData && (
              <p className="text-xs mt-0.5 font-mono" style={{ color: '#94A3B8' }}>{initialData.code}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-all"
            style={{ color: '#94A3B8' }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.background = '#F1F5F9'; el.style.color = '#64748B'; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'transparent'; el.style.color = '#94A3B8'; }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <Field label="Наименование ГК" required error={errors.name} icon={<Building2 className="w-3.5 h-3.5" />}>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Полное наименование государственного контракта"
              style={inputStyle(!!errors.name)}
              onFocus={onFocus}
              onBlur={(e) => onBlur(e, !!errors.name)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Краткое наименование" required error={errors.shortName} icon={<Tag className="w-3.5 h-3.5" />}>
              <input
                type="text"
                value={form.shortName}
                onChange={(e) => set('shortName', e.target.value.toUpperCase())}
                placeholder="МФЦ"
                style={inputStyle(!!errors.shortName)}
                onFocus={onFocus}
                onBlur={(e) => onBlur(e, !!errors.shortName)}
              />
            </Field>
            <Field label="Код / Номер ГК" required error={errors.code} icon={<Hash className="w-3.5 h-3.5" />}>
              <input
                type="text"
                value={form.code}
                onChange={(e) => set('code', e.target.value)}
                placeholder="2024-МЦД-001"
                style={inputStyle(!!errors.code)}
                onFocus={onFocus}
                onBlur={(e) => onBlur(e, !!errors.code)}
              />
            </Field>
          </div>

          <Field label="Заказчик" required error={errors.customer} icon={<User className="w-3.5 h-3.5" />}>
            <select
              value={form.customer}
              onChange={(e) => set('customer', e.target.value)}
              style={{ ...inputStyle(!!errors.customer), appearance: 'none', cursor: 'pointer' }}
              onFocus={onFocus}
              onBlur={(e) => onBlur(e, !!errors.customer)}
            >
              <option value="">— Выберите заказчика —</option>
              {CUSTOMERS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          {/* Status */}
          <div className="mb-5">
            <label className="block text-xs mb-2" style={{ color: '#64748B', fontWeight: 500 }}>Статус</label>
            <div className="grid grid-cols-2 gap-3">
              {(['active', 'archive'] as const).map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                  style={{
                    border: `1.5px solid ${form.status === s ? (s === 'active' ? '#22C55E' : '#94A3B8') : '#DCE3EE'}`,
                    background: form.status === s ? (s === 'active' ? '#F0FDF4' : '#F8FAFC') : 'white',
                  }}
                >
                  <input type="radio" name="status" value={s} checked={form.status === s}
                    onChange={() => set('status', s)} className="sr-only" />
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ border: `2px solid ${form.status === s ? (s === 'active' ? '#22C55E' : '#94A3B8') : '#DCE3EE'}` }}
                  >
                    {form.status === s && (
                      <div className="w-2 h-2 rounded-full" style={{ background: s === 'active' ? '#22C55E' : '#94A3B8' }} />
                    )}
                  </div>
                  <span className="text-sm" style={{ color: form.status === s ? (s === 'active' ? '#15803D' : '#64748B') : '#64748B', fontWeight: form.status === s ? 500 : 400 }}>
                    {s === 'active' ? 'Активна' : 'Архив'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Toggle: useShortNameInId */}
          <div className="mb-5">
            <label className="block text-xs mb-2" style={{ color: '#64748B', fontWeight: 500 }}>Краткое имя в ID</label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => set('useShortNameInId', !form.useShortNameInId)}
                className="relative flex-shrink-0 transition-all"
                style={{ width: 44, height: 24, borderRadius: 12, background: form.useShortNameInId ? '#2563EB' : '#DCE3EE', cursor: 'pointer' }}
              >
                <div
                  className="absolute top-0.5 transition-all rounded-full bg-white shadow-sm"
                  style={{ width: 20, height: 20, left: form.useShortNameInId ? 22 : 2 }}
                />
              </div>
              <span className="text-sm transition-colors" style={{ color: form.useShortNameInId ? '#2563EB' : '#64748B', fontWeight: form.useShortNameInId ? 500 : 400 }}>
                Использовать краткое наименование в идентификаторах
              </span>
            </label>
            {form.useShortNameInId && form.shortName && (
              <div className="mt-2 px-3 py-2 rounded-xl text-xs" style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
                Пример ID: <code style={{ fontWeight: 700 }}>{form.shortName}-2024-001</code>
              </div>
            )}
          </div>

          {/* Note */}
          <Field label="Примечание" icon={<FileText className="w-3.5 h-3.5" />}>
            <textarea
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
              placeholder="Дополнительная информация о контракте…"
              rows={3}
              style={{ ...inputStyle(), resize: 'none', lineHeight: 1.6 } as React.CSSProperties}
              onFocus={onFocus}
              onBlur={(e) => onBlur(e)}
            />
          </Field>

          {mode === 'edit' && initialData && (
            <div className="rounded-xl p-4 text-xs space-y-2" style={{ background: '#F8FAFC', border: '1px solid #DCE3EE' }}>
              {[
                { label: 'Создано', value: new Date(initialData.createdAt).toLocaleString('ru-RU') },
                { label: 'Обновлено', value: new Date(initialData.updatedAt).toLocaleString('ru-RU') },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span style={{ color: '#94A3B8' }}>{label}</span>
                  <span style={{ color: '#64748B', fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid #F1F5F9' }}>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm transition-all"
            style={{ border: '1.5px solid #DCE3EE', color: '#64748B', background: 'white', fontWeight: 500 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; }}
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm text-white transition-all"
            style={{ background: '#2563EB', fontWeight: 600, opacity: saving ? 0.7 : 1 }}
            onMouseEnter={(e) => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = '#3B82F6'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#2563EB'; }}
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Сохранение…' : mode === 'create' ? 'Создать ГК' : 'Сохранить изменения'}
          </button>
        </div>
      </div>
    </div>
  );
}
