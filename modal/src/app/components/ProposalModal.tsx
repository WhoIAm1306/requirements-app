import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Save, Archive, ArchiveRestore, Trash2, Download, Paperclip,
  ChevronDown, Plus, Search, AlertTriangle, FileText, Clock,
  User, Building2, Calendar, Hash, MessageSquare, Upload,
  AlertCircle, CheckCircle2, Info, Pen, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import type { ProposalModalProps, FormData, Comment, Attachment, ArchiveReason } from './proposal/types';
import {
  INITIAL_FORM_DATA, INITIAL_COMMENTS, INITIAL_ATTACHMENTS, PREVIOUS_FILES,
  SECTION_OPTIONS, PRIORITY_OPTIONS, STATUS_OPTIONS, SYSTEM_OPTIONS,
  GC_OPTIONS, STAGES_BY_GC, NMCK_OPTIONS, TZ_OPTIONS, META
} from './proposal/mockData';

/* ─────────────── DESIGN TOKENS ─────────────── */
const C = {
  primary: '#409EFF',
  primaryLight: '#ECF5FF',
  primaryDark: '#337ECC',
  border: '#DCDFE6',
  borderFocus: '#409EFF',
  bg: '#F5F7FA',
  white: '#FFFFFF',
  textPrimary: '#303133',
  textRegular: '#606266',
  textSecondary: '#909399',
  textPlaceholder: '#C0C4CC',
  success: '#67C23A',
  successBg: '#F0F9EB',
  warning: '#E6A23C',
  warningBg: '#FDF6EC',
  danger: '#F56C6C',
  dangerBg: '#FEF0F0',
  dangerDark: '#F56C6C',
  sectionHeaderBg: '#F9FAFB',
};

/* ─────────────── STATUS CONFIG ─────────────── */
const STATUS_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  'Новое':           { color: '#909399', bg: '#F4F4F5', dot: '#909399' },
  'На рассмотрении': { color: '#409EFF', bg: '#ECF5FF', dot: '#409EFF' },
  'В работе':        { color: '#337ECC', bg: '#D9ECFF', dot: '#337ECC' },
  'На согласовании': { color: '#E6A23C', bg: '#FDF6EC', dot: '#E6A23C' },
  'Выполнено':       { color: '#67C23A', bg: '#F0F9EB', dot: '#67C23A' },
  'Отклонено':       { color: '#F56C6C', bg: '#FEF0F0', dot: '#F56C6C' },
  'Отложено':        { color: '#B88230', bg: '#FAECD8', dot: '#B88230' },
};

const getStatusCfg = (s: string) => STATUS_CONFIG[s] ?? { color: '#909399', bg: '#F4F4F5', dot: '#909399' };

/* ─────────────── BASE UI COMPONENTS ─────────────── */

function SectionCard({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div className="bg-white rounded-[10px] overflow-hidden" style={{ border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div className="px-5 py-3 flex items-center gap-2" style={{ background: C.sectionHeaderBg, borderBottom: `1px solid ${C.border}` }}>
        <div className="w-0.5 h-4 rounded-full" style={{ background: accent ?? C.primary }} />
        <h3 className="text-sm" style={{ color: C.textPrimary, fontWeight: 600, letterSpacing: '0.01em' }}>{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}

function FormField({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label style={{ fontSize: '12px', fontWeight: 500, color: C.textRegular, lineHeight: 1.4 }}>
        {label}
        {required && <span style={{ color: C.danger, marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {hint && <span style={{ fontSize: '11px', color: C.textSecondary }}>{hint}</span>}
    </div>
  );
}

function ReadOnlyValue({ value, multiline }: { value: string; multiline?: boolean }) {
  if (!value) return <span style={{ color: C.textPlaceholder, fontSize: '13px' }}>—</span>;
  if (multiline) {
    return (
      <div
        className="rounded-[8px] px-3 py-2 text-sm overflow-y-auto"
        style={{ background: C.bg, color: C.textPrimary, border: `1px solid ${C.border}`, minHeight: 80, maxHeight: 180, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
      >
        {value}
      </div>
    );
  }
  return <span style={{ fontSize: '13px', color: C.textPrimary, lineHeight: 1.5 }}>{value}</span>;
}

function FormInput({
  value, onChange, placeholder, disabled = false, readOnly = false, className = ''
}: { value: string; onChange?: (v: string) => void; placeholder?: string; disabled?: boolean; readOnly?: boolean; className?: string }) {
  if (readOnly) return <ReadOnlyValue value={value} />;
  return (
    <input
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full px-3 text-sm outline-none transition-colors ${className}`}
      style={{
        height: 36,
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        background: disabled ? C.bg : C.white,
        color: disabled ? C.textSecondary : C.textPrimary,
        cursor: disabled ? 'not-allowed' : 'text',
      }}
      onFocus={e => { if (!disabled) e.currentTarget.style.borderColor = C.primary; }}
      onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
    />
  );
}

function FormTextarea({
  value, onChange, placeholder, disabled = false, readOnly = false, rows = 4
}: { value: string; onChange?: (v: string) => void; placeholder?: string; disabled?: boolean; readOnly?: boolean; rows?: number }) {
  if (readOnly) return <ReadOnlyValue value={value} multiline />;
  return (
    <textarea
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      className="w-full px-3 py-2 text-sm outline-none transition-colors resize-y"
      style={{
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        background: disabled ? C.bg : C.white,
        color: disabled ? C.textSecondary : C.textPrimary,
        cursor: disabled ? 'not-allowed' : 'text',
        lineHeight: 1.6,
        minHeight: rows * 22,
      }}
      onFocus={e => { if (!disabled) e.currentTarget.style.borderColor = C.primary; }}
      onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
    />
  );
}

function FormDateInput({
  value, onChange, disabled = false, readOnly = false
}: { value: string; onChange?: (v: string) => void; disabled?: boolean; readOnly?: boolean }) {
  if (readOnly) {
    if (!value) return <span style={{ color: C.textPlaceholder, fontSize: '13px' }}>—</span>;
    try {
      const d = new Date(value);
      return <span style={{ fontSize: '13px', color: C.textPrimary }}>{d.toLocaleDateString('ru-RU')}</span>;
    } catch { return <span style={{ fontSize: '13px', color: C.textPrimary }}>{value}</span>; }
  }
  return (
    <input
      type="date"
      value={value}
      onChange={e => onChange?.(e.target.value)}
      disabled={disabled}
      className="w-full px-3 text-sm outline-none transition-colors"
      style={{
        height: 36,
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        background: disabled ? C.bg : C.white,
        color: value ? C.textPrimary : C.textPlaceholder,
        cursor: disabled ? 'not-allowed' : 'text',
      }}
      onFocus={e => { if (!disabled) e.currentTarget.style.borderColor = C.primary; }}
      onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
    />
  );
}

/* ─────────────── CUSTOM SELECT ─────────────── */
function CustomSelect({
  value, onChange, options, placeholder = '— Выберите —',
  creatable = false, disabled = false, readOnly = false,
}: {
  value: string; onChange?: (v: string) => void; options: string[];
  placeholder?: string; creatable?: boolean; disabled?: boolean; readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));
  const canCreate = creatable && query.trim() &&
    !options.some(o => o.toLowerCase() === query.trim().toLowerCase());

  if (readOnly) return <ReadOnlyValue value={value} />;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) { setOpen(!open); if (!open) setQuery(''); } }}
        className="w-full px-3 flex items-center justify-between text-sm outline-none"
        style={{
          height: 36, borderRadius: 8,
          border: `1px solid ${open ? C.primary : C.border}`,
          background: disabled ? C.bg : C.white,
          color: value ? C.textPrimary : C.textPlaceholder,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'border-color .15s',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
          {value || placeholder}
        </span>
        <ChevronDown size={13} style={{ color: C.textPlaceholder, flexShrink: 0, marginLeft: 4, transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 mt-1 bg-white overflow-hidden z-[200]"
          style={{ border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.12)', top: '100%' }}
        >
          <div className="p-2" style={{ borderBottom: `1px solid ${C.border}` }}>
            <div className="relative">
              <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: C.textPlaceholder }} />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Поиск..."
                className="w-full pl-7 pr-3 py-1.5 text-sm outline-none"
                style={{ borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12 }}
                onFocus={e => { e.currentTarget.style.borderColor = C.primary; }}
                onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
              />
            </div>
          </div>
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {filtered.length === 0 && !canCreate && (
              <div className="px-3 py-3 text-center text-xs" style={{ color: C.textSecondary }}>Нет вариантов</div>
            )}
            {filtered.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange?.(opt); setOpen(false); setQuery(''); }}
                className="w-full px-3 py-2 text-sm text-left transition-colors"
                style={{
                  background: value === opt ? C.primaryLight : 'transparent',
                  color: value === opt ? C.primary : C.textPrimary,
                }}
                onMouseEnter={e => { if (value !== opt) e.currentTarget.style.background = C.bg; }}
                onMouseLeave={e => { if (value !== opt) e.currentTarget.style.background = 'transparent'; }}
              >
                {opt}
              </button>
            ))}
            {canCreate && (
              <button
                type="button"
                onClick={() => { onChange?.(query.trim()); setOpen(false); setQuery(''); }}
                className="w-full px-3 py-2 text-sm text-left flex items-center gap-1.5"
                style={{ borderTop: `1px solid ${C.border}`, color: C.primary }}
                onMouseEnter={e => { e.currentTarget.style.background = C.primaryLight; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Plus size={11} />
                Создать: «{query.trim()}»
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── TOGGLE ─────────────── */
function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        style={{
          width: 40, height: 22, borderRadius: 11,
          background: checked ? C.primary : C.border,
          position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'background .2s', flexShrink: 0,
          border: 'none', padding: 0, opacity: disabled ? 0.5 : 1,
        }}
      >
        <span style={{
          display: 'block', width: 18, height: 18, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 2,
          left: checked ? 20 : 2,
          transition: 'left .2s',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        }} />
      </button>
      {label && <span style={{ fontSize: 12, color: C.textRegular }}>{label}</span>}
    </div>
  );
}

/* ─────────────── META CHIP ─────────────── */
function MetaChip({ icon: Icon, label, value, highlight }: { icon: React.ElementType; label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      style={{
        background: highlight ? '#FFF7E6' : C.bg,
        border: `1px solid ${highlight ? '#FFD591' : C.border}`,
        fontSize: 11, whiteSpace: 'nowrap',
      }}
    >
      <Icon size={10} style={{ color: highlight ? C.warning : C.textSecondary, flexShrink: 0 }} />
      <span style={{ color: C.textSecondary, fontWeight: 500 }}>{label}:</span>
      <span style={{ color: highlight ? '#D46B08' : C.textRegular, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

/* ─────────────── STATUS BADGE ─────────────── */
function StatusBadge({ status }: { status: string }) {
  const cfg = getStatusCfg(status);
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs" style={{ background: cfg.bg, color: cfg.color, fontWeight: 500 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0, display: 'inline-block' }} />
      {status}
    </span>
  );
}

/* ─────────────── CONFIRM DIALOG ─────────────── */
function ConfirmDialog({
  open, onClose, title, description, confirmLabel, confirmDanger, onConfirm, children
}: {
  open: boolean; onClose: () => void; title: string; description?: string;
  confirmLabel: string; confirmDanger?: boolean; onConfirm: () => void; children?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-xl p-6 w-[420px] max-w-[90vw]" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: confirmDanger ? C.dangerBg : C.warningBg }}>
            <AlertTriangle size={18} style={{ color: confirmDanger ? C.danger : C.warning }} />
          </div>
          <div>
            <h3 className="text-sm mb-1" style={{ color: C.textPrimary, fontWeight: 600 }}>{title}</h3>
            {description && <p className="text-xs" style={{ color: C.textRegular, lineHeight: 1.5 }}>{description}</p>}
          </div>
        </div>
        {children && <div className="mb-4">{children}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-lg transition-colors"
            style={{ border: `1px solid ${C.border}`, color: C.textRegular }}
            onMouseEnter={e => { e.currentTarget.style.background = C.bg; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            Отмена
          </button>
          <button onClick={() => { onConfirm(); onClose(); }} className="px-4 py-1.5 text-sm rounded-lg text-white transition-opacity"
            style={{ background: confirmDanger ? C.danger : C.warning }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── ADD QUEUE DIALOG ─────────────── */
function AddQueueDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (v: string) => void }) {
  const [val, setVal] = useState('');
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-xl p-6 w-[380px]" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <h3 className="text-sm mb-4" style={{ color: C.textPrimary, fontWeight: 600 }}>Добавить новую очередь</h3>
        <FormField label="Название очереди" required>
          <FormInput value={val} onChange={setVal} placeholder="Например: Очередь 4 — Срочный" />
        </FormField>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => { setVal(''); onClose(); }} className="px-4 py-1.5 text-sm rounded-lg"
            style={{ border: `1px solid ${C.border}`, color: C.textRegular }}>Отмена</button>
          <button
            disabled={!val.trim()}
            onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(''); onClose(); } }}
            className="px-4 py-1.5 text-sm rounded-lg text-white"
            style={{ background: val.trim() ? C.primary : C.border }}>
            Добавить
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── ARCHIVE DIALOG ─────────────── */
function ArchiveDialog({
  open, onClose, onConfirm
}: { open: boolean; onClose: () => void; onConfirm: (reason: 'completed' | 'irrelevant') => void }) {
  const [reason, setReason] = useState<'completed' | 'irrelevant'>('completed');
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-xl p-6 w-[420px]" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#FFF7E6' }}>
            <Archive size={18} style={{ color: C.warning }} />
          </div>
          <div>
            <h3 className="text-sm mb-1" style={{ color: C.textPrimary, fontWeight: 600 }}>Перевести в архив</h3>
            <p className="text-xs" style={{ color: C.textRegular, lineHeight: 1.5 }}>Выберите причину архивации записи</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 mb-5">
          {([
            { value: 'completed', label: 'Предложение выполнено', desc: 'Задача р��ализована в полном объёме' },
            { value: 'irrelevant', label: 'Предложение больше не актуально', desc: 'Потребность устранена иным способом или утратила значимость' },
          ] as const).map(opt => (
            <label key={opt.value}
              className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors"
              style={{ border: `1px solid ${reason === opt.value ? C.primary : C.border}`, background: reason === opt.value ? C.primaryLight : C.white }}
            >
              <input type="radio" value={opt.value} checked={reason === opt.value} onChange={() => setReason(opt.value)} className="mt-0.5" />
              <div>
                <div className="text-sm" style={{ color: C.textPrimary, fontWeight: 500 }}>{opt.label}</div>
                <div className="text-xs mt-0.5" style={{ color: C.textSecondary }}>{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-lg" style={{ border: `1px solid ${C.border}`, color: C.textRegular }}>Отмена</button>
          <button onClick={() => { onConfirm(reason); onClose(); }} className="px-4 py-1.5 text-sm rounded-lg text-white" style={{ background: C.warning }}>
            В архив
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── COMMENTS PANEL ─────────────── */
function CommentsPanel({
  comments, onDelete, onAdd, readOnly, canDelete, canAdd,
}: {
  comments: Comment[]; onDelete: (id: string) => void; onAdd: (text: string) => void;
  readOnly: boolean; canDelete: boolean; canAdd: boolean;
}) {
  const [text, setText] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <SectionCard title="Комментарии" accent="#67C23A">
      <div className="flex flex-col gap-3">
        {/* Comment list */}
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <MessageSquare size={28} style={{ color: C.textPlaceholder }} />
            <span className="text-sm" style={{ color: C.textSecondary }}>Комментариев пока нет</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
            {comments.map(c => (
              <div key={c.id} className="p-3 rounded-[8px] group relative" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0"
                      style={{ background: C.primary, fontWeight: 600 }}>
                      {c.author.charAt(0)}
                    </div>
                    <div>
                      <span className="text-xs" style={{ color: C.textPrimary, fontWeight: 600 }}>{c.author}</span>
                      <span className="text-xs mx-1.5" style={{ color: C.textPlaceholder }}>·</span>
                      <span className="text-xs" style={{ color: C.textSecondary }}>{c.organization}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs" style={{ color: C.textSecondary }}>
                      <Clock size={10} />
                      <span>{c.date}</span>
                    </div>
                  </div>
                  {!readOnly && canDelete && c.canDelete && (
                    <button
                      onClick={() => setConfirmId(c.id)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: C.danger }}
                      title="Удалить комментарий"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed" style={{ color: C.textPrimary }}>{c.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* New comment */}
        {!readOnly && canAdd && (
          <div className="flex flex-col gap-2 pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
            <FormTextarea
              value={text}
              onChange={setText}
              placeholder="Введите комментарий..."
              rows={3}
            />
            <div className="flex justify-end">
              <button
                onClick={() => { if (text.trim()) { onAdd(text.trim()); setText(''); } }}
                disabled={!text.trim()}
                className="px-4 py-1.5 text-sm rounded-lg text-white flex items-center gap-1.5 transition-opacity"
                style={{ background: text.trim() ? C.primary : C.border }}
              >
                <Plus size={14} />
                Добавить комментарий
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        title="Удалить комментарий?"
        description="Это действие нельзя отменить. Комментарий будет удалён безвозвратно."
        confirmLabel="Удалить"
        confirmDanger
        onConfirm={() => { if (confirmId) onDelete(confirmId); }}
      />
    </SectionCard>
  );
}

/* ─────────────── ATTACHMENTS PANEL ─────────────── */
function AttachmentsPanel({
  attachments, onDownload, onDetach, onUpload, onReattach, readOnly, canDetach, canUpload,
}: {
  attachments: Attachment[];
  onDownload: (id: string) => void;
  onDetach: (id: string) => void;
  onUpload: (files: FileList) => void;
  onReattach: (id: string) => void;
  readOnly: boolean;
  canDetach: boolean;
  canUpload: boolean;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [prevSearch, setPrevSearch] = useState('');
  const [prevOpen, setPrevOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (prevRef.current && !prevRef.current.contains(e.target as Node)) setPrevOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filteredPrev = PREVIOUS_FILES.filter(f =>
    f.name.toLowerCase().includes(prevSearch.toLowerCase())
  );

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    const colors: Record<string, string> = {
      pdf: '#F56C6C', docx: '#409EFF', doc: '#409EFF',
      xlsx: '#67C23A', xls: '#67C23A', xlsm: '#67C23A',
      msg: '#E6A23C', pst: '#E6A23C',
    };
    return colors[ext ?? ''] ?? C.textSecondary;
  };

  return (
    <SectionCard title="Вложения" accent="#E6A23C">
      <div className="flex flex-col gap-3">
        {/* File list */}
        {attachments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Paperclip size={28} style={{ color: C.textPlaceholder }} />
            <span className="text-sm" style={{ color: C.textSecondary }}>Файлов пока нет</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
            {attachments.map(f => (
              <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-[8px] group" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                <FileText size={18} style={{ color: getFileIcon(f.name), flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs truncate" style={{ color: C.textPrimary, fontWeight: 500 }}>{f.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs" style={{ color: C.textSecondary }}>{f.date}</span>
                    <span className="text-xs" style={{ color: C.textPlaceholder }}>·</span>
                    <span className="text-xs" style={{ color: C.textSecondary }}>{f.size}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onDownload(f.id)} className="px-2 py-1 text-xs rounded flex items-center gap-1"
                    style={{ border: `1px solid ${C.border}`, color: C.primary, background: C.white }}>
                    <Download size={11} /> Скачать
                  </button>
                  {!readOnly && canDetach && f.canDetach && (
                    <button onClick={() => setConfirmId(f.id)} className="px-2 py-1 text-xs rounded flex items-center gap-1"
                      style={{ border: `1px solid ${C.border}`, color: C.danger, background: C.white }}>
                      <X size={11} /> Открепить
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload area + Previously used */}
        {!readOnly && canUpload && (
          <div className="flex flex-col gap-2 pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition-opacity"
                style={{ background: C.primary, color: '#fff' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                <Upload size={13} /> Загрузить файлы
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".doc,.docx,.pdf,.xls,.xlsx,.xlsm,.msg,.pst"
                className="hidden"
                onChange={e => { if (e.target.files?.length) { onUpload(e.target.files); e.target.value = ''; } }}
              />
              <span className="text-xs" style={{ color: C.textSecondary }}>doc, docx, pdf, xls, xlsx, xlsm, msg, pst</span>
            </div>

            {/* Previously used files */}
            <div className="mt-1">
              <div className="text-xs mb-1.5" style={{ color: C.textRegular, fontWeight: 500 }}>Ранее используемые файлы</div>
              <div ref={prevRef} className="relative">
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-[8px] cursor-pointer"
                  style={{ border: `1px solid ${prevOpen ? C.primary : C.border}`, background: C.white }}
                  onClick={() => setPrevOpen(!prevOpen)}
                >
                  <Search size={12} style={{ color: C.textPlaceholder }} />
                  <input
                    value={prevSearch}
                    onChange={e => { setPrevSearch(e.target.value); setPrevOpen(true); }}
                    onClick={e => { e.stopPropagation(); setPrevOpen(true); }}
                    placeholder="Поиск по ранее загруженным файлам..."
                    className="flex-1 outline-none text-xs"
                    style={{ color: C.textPrimary, background: 'transparent' }}
                  />
                </div>
                {prevOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white z-[200] overflow-hidden"
                    style={{ border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.12)', top: '100%' }}>
                    <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                      {filteredPrev.length === 0 && (
                        <div className="px-3 py-3 text-xs text-center" style={{ color: C.textSecondary }}>Файлы не найдены</div>
                      )}
                      {filteredPrev.map(f => (
                        <button key={f.id} type="button"
                          onClick={() => { onReattach(f.id); setPrevOpen(false); setPrevSearch(''); }}
                          className="w-full px-3 py-2 flex items-center gap-2 text-left"
                          onMouseEnter={e => { e.currentTarget.style.background = C.bg; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <FileText size={13} style={{ color: getFileIcon(f.name), flexShrink: 0 }} />
                          <div className="min-w-0">
                            <div className="text-xs truncate" style={{ color: C.textPrimary }}>{f.name}</div>
                            <div className="text-xs" style={{ color: C.textSecondary }}>{f.date}</div>
                          </div>
                          <Paperclip size={11} style={{ color: C.primary, marginLeft: 'auto', flexShrink: 0 }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        title="Открепить файл?"
        description="Файл будет откреплён от записи. При необходимости его можно будет прикрепить снова через «Ранее используемые файлы»."
        confirmLabel="Открепить"
        confirmDanger
        onConfirm={() => { if (confirmId) onDetach(confirmId); }}
      />
    </SectionCard>
  );
}

/* ─────────────── MODAL HEADER ─────────────── */
function ModalHeader({
  taskId, mode, isArchived, archiveReason, onSave, onArchive, onRestore, onDelete, onClose, onModeToggle,
}: {
  taskId: string; mode: 'edit' | 'readonly'; isArchived: boolean; archiveReason: ArchiveReason;
  onSave: () => void; onArchive: () => void; onRestore: () => void; onDelete: () => void; onClose: () => void; onModeToggle: () => void;
}) {
  return (
    <div className="flex-shrink-0 bg-white z-10" style={{ borderBottom: `1px solid ${C.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
      {/* Main header row */}
      <div className="px-6 py-3 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base truncate" style={{ color: C.textPrimary, fontWeight: 700 }}>
              Карточка предложения
            </h2>
            <span className="px-2.5 py-0.5 rounded-[6px] text-xs" style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.primary, fontWeight: 600, fontFamily: 'monospace' }}>
              {taskId}
            </span>
            {isArchived && (
              <span className="px-2.5 py-0.5 rounded-full text-xs" style={{ background: '#FDF6EC', border: `1px solid #FAECD8`, color: C.warning, fontWeight: 500 }}>
                В архиве
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Mode toggle */}
          <button
            onClick={onModeToggle}
            className="px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 transition-colors"
            style={{ border: `1px solid ${C.border}`, color: mode === 'readonly' ? C.primary : C.textRegular, background: mode === 'readonly' ? C.primaryLight : C.white }}
          >
            {mode === 'edit' ? <><Eye size={12} /> Просмотр</> : <><Pen size={12} /> Редактировать</>}
          </button>

          {mode === 'edit' && (
            <button
              onClick={onSave}
              className="px-4 py-1.5 text-sm rounded-lg text-white flex items-center gap-1.5 transition-opacity"
              style={{ background: C.primary }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              <Save size={14} /> Сохранить
            </button>
          )}

          {isArchived ? (
            <button
              onClick={onRestore}
              className="px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition-colors"
              style={{ border: `1px solid ${C.warning}`, color: C.warning, background: '#FDF6EC' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FAECD8'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FDF6EC'; }}
            >
              <ArchiveRestore size={14} /> Восстановить
            </button>
          ) : (
            mode === 'edit' && (
              <button
                onClick={onArchive}
                className="px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition-colors"
                style={{ border: `1px solid ${C.border}`, color: C.textRegular }}
                onMouseEnter={e => { e.currentTarget.style.background = C.bg; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Archive size={14} /> В архив
              </button>
            )
          )}

          {mode === 'edit' && (
            <button
              onClick={onDelete}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: C.danger, border: `1px solid ${C.dangerBg}` }}
              title="Удалить запись"
              onMouseEnter={e => { e.currentTarget.style.background = C.dangerBg; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Trash2 size={15} />
            </button>
          )}

          <div style={{ width: 1, height: 22, background: C.border }} />
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: C.textSecondary }}
            onMouseEnter={e => { e.currentTarget.style.background = C.bg; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Meta chips row */}
      <div className="px-6 pb-2.5 flex flex-wrap gap-1.5">
        <MetaChip icon={Hash} label="ID" value={META.author === '' ? taskId : taskId} />
        <MetaChip icon={User} label="Автор" value={META.author} />
        <MetaChip icon={Building2} label="Орг. автора" value={META.authorOrg} />
        <MetaChip icon={Pen} label="Редактор" value={`${META.lastEditor} / ${META.lastEditorOrg}`} />
        <MetaChip icon={Clock} label="Обновлено" value={META.updatedAt} />
        <MetaChip icon={Calendar} label="Создано" value={META.createdAt} />
        <MetaChip icon={AlertCircle} label="Выполнить до" value={META.deadline} highlight />
      </div>

      {/* Archive banner */}
      {isArchived && (
        <div className="mx-6 mb-3 px-4 py-2.5 rounded-[8px] flex items-center gap-2.5"
          style={{ background: archiveReason === 'completed' ? C.successBg : '#FDF6EC', border: `1px solid ${archiveReason === 'completed' ? '#B3E19D' : '#FAECD8'}` }}>
          {archiveReason === 'completed'
            ? <CheckCircle2 size={15} style={{ color: C.success, flexShrink: 0 }} />
            : <Info size={15} style={{ color: C.warning, flexShrink: 0 }} />}
          <span className="text-xs" style={{ color: archiveReason === 'completed' ? '#4E8B2B' : '#B8720A', fontWeight: 500 }}>
            {archiveReason === 'completed'
              ? 'Запись в архиве: предложение выполнено'
              : 'Запись в архиве: предложение больше не актуально'}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─────────────── LEFT COLUMN ─────────────── */
function LeftColumn({ data, onChange, readOnly, priorities, onAddQueue }: {
  data: FormData; onChange: <K extends keyof FormData>(key: K, val: FormData[K]) => void;
  readOnly: boolean; priorities: string[]; onAddQueue: () => void;
}) {
  const f = <K extends keyof FormData>(key: K) => ({
    value: data[key] as string,
    onChange: (v: string) => onChange(key, v as FormData[K]),
    readOnly,
  });

  return (
    <div className="flex flex-col gap-4">
      <SectionCard title="Основные данные">
        <FieldGroup>
          <FormField label="Идентификатор задачи">
            <FormInput {...f('taskId')} disabled={!readOnly} />
          </FormField>
          <FormField label="Краткое наименование предложения" required>
            <FormInput {...f('shortName')} placeholder="Введите краткое наименование..." />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Инициатор" required>
              <FormInput {...f('initiator')} placeholder="ФИО инициатора" />
            </FormField>
            <FormField label="Ответственный">
              <FormInput {...f('responsible')} placeholder="ФИО ответственного" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Раздел">
              <CustomSelect value={data.section} onChange={v => onChange('section', v)} options={SECTION_OPTIONS} creatable readOnly={readOnly} placeholder="— Выберите раздел —" />
            </FormField>
            <FormField label="Система">
              <CustomSelect value={data.system} onChange={v => onChange('system', v)} options={SYSTEM_OPTIONS} readOnly={readOnly} placeholder="— Выберите систему —" />
            </FormField>
          </div>
          <FormField label="Приоритет / Очередь">
            <div className="flex gap-2">
              <div className="flex-1">
                <CustomSelect value={data.priority} onChange={v => onChange('priority', v)} options={priorities} readOnly={readOnly} placeholder="— Выберите очередь —" />
              </div>
              {!readOnly && (
                <button onClick={onAddQueue} className="px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 flex-shrink-0"
                  style={{ border: `1px dashed ${C.primary}`, color: C.primary, background: C.primaryLight }}>
                  <Plus size={11} /> Новая очередь
                </button>
              )}
            </div>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Статус">
              {readOnly
                ? <StatusBadge status={data.status} />
                : <CustomSelect value={data.status} onChange={v => onChange('status', v)} options={STATUS_OPTIONS} creatable readOnly={false} placeholder="— Статус —" />}
            </FormField>
            <FormField label="Дата выполнения">
              <FormDateInput value={data.dueDate} onChange={v => onChange('dueDate', v)} readOnly={readOnly} />
            </FormField>
          </div>
        </FieldGroup>
      </SectionCard>

      <SectionCard title="Содержание предложения">
        <FieldGroup>
          <FormField label="Предложение" required>
            <FormTextarea {...f('proposal')} placeholder="Опишите предложение подробно..." rows={5} />
          </FormField>
          <FormField label="Комментарии и описание проблем">
            <FormTextarea {...f('commentsText')} placeholder="Опишите текущие проблемы и ситуацию..." rows={4} />
          </FormField>
          <FormField label="Обсуждение">
            <FormTextarea {...f('discussion')} placeholder="Ход обсуждения, результаты встреч..." rows={4} />
          </FormField>
          <FormField label="Примечание">
            <FormTextarea {...f('note')} placeholder="Дополнительная информация..." rows={2} />
          </FormField>
        </FieldGroup>
      </SectionCard>
    </div>
  );
}

/* ─────────────── RIGHT COLUMN ─────────────── */
function RightColumn({ data, onChange, readOnly }: {
  data: FormData; onChange: <K extends keyof FormData>(key: K, val: FormData[K]) => void; readOnly: boolean;
}) {
  const stages = data.gc ? (STAGES_BY_GC[data.gc] ?? []) : [];

  const autoTZ = data.nmck
    ? `Автоподстановка на основе п.п. НМЦК: ${data.nmck}`
    : 'Не определено — выберите п.п. НМЦК';

  return (
    <div className="flex flex-col gap-4">
      <SectionCard title="Привязка к ГК и функции">
        <FieldGroup>
          <FormField label="Государственный контракт (ГК)">
            <CustomSelect value={data.gc} onChange={v => { onChange('gc', v); onChange('stage', ''); }} options={GC_OPTIONS} creatable readOnly={readOnly} placeholder="— Выберите ГК —" />
          </FormField>
          <FormField label="Этап" hint={!data.gc && !readOnly ? 'Сначала выберите ГК' : undefined}>
            <CustomSelect
              value={data.stage}
              onChange={v => onChange('stage', v)}
              options={stages}
              readOnly={readOnly}
              disabled={!data.gc}
              placeholder={data.gc ? '— Выберите этап —' : '— Сначала выберите ГК —'}
            />
          </FormField>

          <div className="pt-1 pb-1">
            <div className="flex items-center justify-between">
              <div className="text-xs" style={{ color: C.textRegular, fontWeight: 500 }}>Режим выбора п.п. ТЗ</div>
              {readOnly
                ? <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: data.useTZMode ? C.primaryLight : C.bg, color: data.useTZMode ? C.primary : C.textSecondary }}>{data.useTZMode ? 'Через ТЗ' : 'Автоматически'}</span>
                : <Toggle checked={data.useTZMode} onChange={v => onChange('useTZMode', v)} label={data.useTZMode ? 'Выбрать через ТЗ' : 'Автоматически'} />}
            </div>
            <div className="mt-1 text-xs" style={{ color: C.textSecondary, lineHeight: 1.4 }}>
              {data.useTZMode ? 'Ручной выбор пункта ТЗ из справочника' : 'п.п. ТЗ определяется автоматически по п.п. НМЦК'}
            </div>
          </div>

          <FormField label="п.п. НМЦК" hint="Пункт начальной максимальной цены контракта">
            <CustomSelect
              value={data.nmck}
              onChange={v => onChange('nmck', v)}
              options={NMCK_OPTIONS}
              readOnly={readOnly}
              disabled={!data.stage}
              placeholder={data.stage ? '— Выберите п.п. НМЦК —' : '— Сначала выберите этап —'}
            />
          </FormField>

          <FormField label="п.п. ТЗ">
            {data.useTZMode
              ? <CustomSelect value={data.tz} onChange={v => onChange('tz', v)} options={TZ_OPTIONS} readOnly={readOnly} placeholder="— Выберите п.п. ТЗ —" />
              : readOnly
                ? <ReadOnlyValue value={data.tz || autoTZ} />
                : (
                  <div className="px-3 py-2 rounded-[8px] text-xs" style={{ background: C.bg, border: `1px solid ${C.border}`, color: data.nmck ? C.textPrimary : C.textSecondary, minHeight: 36, display: 'flex', alignItems: 'center', lineHeight: 1.4 }}>
                    {data.tz || autoTZ}
                  </div>
                )}
          </FormField>
        </FieldGroup>
      </SectionCard>

      <SectionCard title="Письмо в ДИТ">
        <FieldGroup>
          <FormField label="Номер исходящего письма">
            <FormInput
              value={data.ditOutgoing}
              onChange={v => onChange('ditOutgoing', v)}
              readOnly={readOnly}
              placeholder="Например: Исх. № 2024-1234"
            />
          </FormField>
          <FormField label="Дата письма">
            <FormDateInput value={data.ditDate} onChange={v => onChange('ditDate', v)} readOnly={readOnly} />
          </FormField>
        </FieldGroup>
      </SectionCard>
    </div>
  );
}

/* ─────────────── MAIN MODAL ─────────────── */
export function ProposalModal({
  isOpen, onClose, mode, isArchived, archiveReason, onModeChange, onArchiveChange,
}: ProposalModalProps) {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [comments, setComments] = useState(INITIAL_COMMENTS);
  const [attachments, setAttachments] = useState(INITIAL_ATTACHMENTS);
  const [priorities, setPriorities] = useState(PRIORITY_OPTIONS);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState(false);
  const [archiveDialog, setArchiveDialog] = useState(false);
  const [addQueueDialog, setAddQueueDialog] = useState(false);

  const readOnly = mode === 'readonly';

  const updateField = useCallback(<K extends keyof FormData>(key: K, val: FormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: val }));
  }, []);

  const handleSave = () => {
    toast.success('Изменения сохранены', { description: `Карточка ${formData.taskId} обновлена` });
  };

  const handleDelete = () => {
    toast.error('Запись удалена', { description: `Карточка ${formData.taskId} удалена безвозвратно` });
    onClose();
  };

  const handleArchive = (reason: 'completed' | 'irrelevant') => {
    onArchiveChange(true, reason);
    toast.success('Запись перемещена в архив', {
      description: reason === 'completed' ? 'Предложение выполнено' : 'Предложение больше не актуально'
    });
  };

  const handleRestore = () => {
    onArchiveChange(false);
    toast.success('Запись восстановлена из архива');
  };

  const handleAddComment = (text: string) => {
    setComments(prev => [...prev, {
      id: Date.now().toString(),
      author: 'Текущий пользователь',
      organization: 'ДТСЗН',
      date: new Date().toLocaleDateString('ru-RU') + ', ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      text,
      canDelete: true,
    }]);
    toast.success('Комментарий добавлен');
  };

  const handleDeleteComment = (id: string) => {
    setComments(prev => prev.filter(c => c.id !== id));
    toast.success('Комментарий удалён');
  };

  const handleDownload = (id: string) => {
    const file = attachments.find(a => a.id === id);
    toast.success('Загрузка началась', { description: file?.name });
  };

  const handleDetach = (id: string) => {
    const file = attachments.find(a => a.id === id);
    setAttachments(prev => prev.filter(a => a.id !== id));
    toast.success('Файл откреплён', { description: file?.name });
  };

  const handleUpload = (files: FileList) => {
    const newFiles: Attachment[] = Array.from(files).map(f => ({
      id: Date.now().toString() + f.name,
      name: f.name,
      date: new Date().toLocaleDateString('ru-RU'),
      size: `${Math.round(f.size / 1024)} КБ`,
      canDetach: true,
    }));
    setAttachments(prev => [...prev, ...newFiles]);
    toast.success(`Загружено файлов: ${files.length}`, { description: Array.from(files).map(f => f.name).join(', ') });
  };

  const handleReattach = (id: string) => {
    const file = PREVIOUS_FILES.find(f => f.id === id);
    if (!file) return;
    setAttachments(prev => [...prev, { id: Date.now().toString(), name: file.name, date: file.date, size: '—', canDetach: true }]);
    toast.success('Файл прикреплён', { description: file.name });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)' }}>
        {/* Modal */}
        <div
          className="bg-white flex flex-col"
          style={{
            width: '96vw', maxWidth: 1600,
            height: '94vh', maxHeight: '94vh',
            borderRadius: 12,
            boxShadow: '0 25px 80px rgba(0,0,0,0.25)',
            overflow: 'hidden',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Sticky Header */}
          <ModalHeader
            taskId={formData.taskId}
            mode={mode}
            isArchived={isArchived}
            archiveReason={archiveReason}
            onSave={handleSave}
            onArchive={() => setArchiveDialog(true)}
            onRestore={() => setRestoreConfirm(true)}
            onDelete={() => setDeleteConfirm(true)}
            onClose={onClose}
            onModeToggle={() => onModeChange(mode === 'edit' ? 'readonly' : 'edit')}
          />

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto" style={{ background: '#EEF0F5' }}>
            <div className="p-5">
              {/* 2-column form */}
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 520px), 1fr))' }}>
                <LeftColumn
                  data={formData}
                  onChange={updateField}
                  readOnly={readOnly}
                  priorities={priorities}
                  onAddQueue={() => setAddQueueDialog(true)}
                />
                <RightColumn
                  data={formData}
                  onChange={updateField}
                  readOnly={readOnly}
                />
              </div>

              {/* Bottom panels */}
              <div className="grid gap-4 mt-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))' }}>
                <CommentsPanel
                  comments={comments}
                  onDelete={handleDeleteComment}
                  onAdd={handleAddComment}
                  readOnly={readOnly}
                  canDelete={true}
                  canAdd={true}
                />
                <AttachmentsPanel
                  attachments={attachments}
                  onDownload={handleDownload}
                  onDetach={handleDetach}
                  onUpload={handleUpload}
                  onReattach={handleReattach}
                  readOnly={readOnly}
                  canDetach={true}
                  canUpload={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="Удалить запись безвозвратно?"
        description={`Карточка предложения «${formData.shortName}» (${formData.taskId}) будет удалена. Это действие необратимо.`}
        confirmLabel="Удалить"
        confirmDanger
        onConfirm={handleDelete}
      />
      <ConfirmDialog
        open={restoreConfirm}
        onClose={() => setRestoreConfirm(false)}
        title="Восстановить из архива?"
        description="Запись будет восстановлена в активный статус и снова доступна для редактирования."
        confirmLabel="Восстановить"
        onConfirm={handleRestore}
      />
      <ArchiveDialog
        open={archiveDialog}
        onClose={() => setArchiveDialog(false)}
        onConfirm={handleArchive}
      />
      <AddQueueDialog
        open={addQueueDialog}
        onClose={() => setAddQueueDialog(false)}
        onAdd={q => {
          setPriorities(prev => [...prev, q]);
          toast.success('Новая очередь добавлена', { description: q });
        }}
      />
    </>
  );
}