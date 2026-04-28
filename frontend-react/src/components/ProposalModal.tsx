import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  X, Save, Archive, ArchiveRestore, Trash2, Download, Paperclip,
  ChevronDown, Plus, Search, AlertTriangle, FileText, Clock,
  User, Building2, Calendar, MessageSquare, Upload,
  CheckCircle2, Info, Pen, AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchRequirements,
  fetchRequirementById, updateRequirement, createRequirement,
  addRequirementComment, deleteRequirementComment,
  archiveRequirement, restoreRequirement, deleteRequirement,
  uploadRequirementAttachments, downloadRequirementAttachment,
  deleteRequirementAttachment, fetchRequirementAttachmentLibrary,
  attachRequirementFromLibrary,
} from '@/api/requirements'
import { fetchContracts } from '@/api/contracts'
import { fetchGKContractDetails } from '@/api/gkContracts'
import { createQueue, fetchQueues } from '@/api/queues'
import { useAuth } from '@/auth/auth-context'
import type { Requirement, RequirementPayload, CommentItem, RequirementAttachmentItem, ContractItem, GKStage } from '@/types'

/* ─── Design tokens ──────────────────────────────────────── */
const C = {
  primary: '#409EFF', primaryLight: '#ECF5FF', primaryDark: '#337ECC',
  border: '#DCDFE6', bg: '#F5F7FA', white: '#FFFFFF',
  textPrimary: '#303133', textRegular: '#606266',
  textSecondary: '#909399', textPlaceholder: '#C0C4CC',
  success: '#67C23A', successBg: '#F0F9EB',
  warning: '#E6A23C', warningBg: '#FDF6EC',
  danger: '#F56C6C', dangerBg: '#FEF0F0',
  sectionHeaderBg: '#F9FAFB',
}

/* ─── Status config ──────────────────────────────────────── */
const STATUS_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  'Новое':           { color: '#909399', bg: '#F4F4F5', dot: '#909399' },
  'Требуется обсуждение': { color: '#409EFF', bg: '#ECF5FF', dot: '#409EFF' },
  'Подтверждено': { color: '#337ECC', bg: '#D9ECFF', dot: '#337ECC' },
  'Учтено': { color: '#E6A23C', bg: '#FDF6EC', dot: '#E6A23C' },
  'Выполнено':       { color: '#67C23A', bg: '#F0F9EB', dot: '#67C23A' },
}
const getStatusCfg = (s: string) => STATUS_CONFIG[s] ?? { color: '#909399', bg: '#F4F4F5', dot: '#909399' }
const SECTION_OPTIONS_LIST = ['Телефония']
const SYSTEM_STATUS_OPTIONS = ['Новое', 'Требуется обсуждение', 'Подтверждено', 'Учтено', 'Выполнено']

/* ─── Base UI ────────────────────────────────────────────── */
function SectionCard({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-[12px]" style={{ background: C.white, border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div className="px-5 py-3 flex items-center gap-2" style={{ background: C.sectionHeaderBg, borderBottom: `1px solid ${C.border}` }}>
        <div className="w-0.5 h-4 rounded-full" style={{ background: accent ?? C.primary }} />
        <h3 className="text-sm" style={{ color: C.textPrimary, fontWeight: 600 }}>{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function FormField({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label style={{ fontSize: 12, fontWeight: 500, color: C.textRegular, lineHeight: 1.4 }}>
        {label}{required && <span style={{ color: C.danger, marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {hint && <span style={{ fontSize: 11, color: C.textSecondary }}>{hint}</span>}
    </div>
  )
}

function ReadOnlyValue({ value, multiline }: { value?: string | null; multiline?: boolean }) {
  if (!value) return <span style={{ color: C.textPlaceholder, fontSize: 13 }}>—</span>
  if (multiline) return (
    <div className="rounded-[8px] px-3 py-2 text-sm overflow-y-auto" style={{ background: C.bg, color: C.textPrimary, border: `1px solid ${C.border}`, minHeight: 80, maxHeight: 200, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{value}</div>
  )
  return <span style={{ fontSize: 13, color: C.textPrimary, lineHeight: 1.5 }}>{value}</span>
}

function FormInput({ value, onChange, placeholder, disabled = false, readOnly = false }: {
  value: string; onChange?: (v: string) => void; placeholder?: string; disabled?: boolean; readOnly?: boolean
}) {
  if (readOnly) return <ReadOnlyValue value={value} />
  return (
    <input value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} disabled={disabled}
      className="w-full px-3 text-sm outline-none transition-colors"
      style={{ height: 36, borderRadius: 8, border: `1px solid ${C.border}`, background: disabled ? C.bg : C.white, color: disabled ? C.textSecondary : C.textPrimary, cursor: disabled ? 'not-allowed' : 'text' }}
      onFocus={e => { if (!disabled) e.currentTarget.style.borderColor = C.primary }}
      onBlur={e => { e.currentTarget.style.borderColor = C.border }}
    />
  )
}

function FormTextarea({ value, onChange, placeholder, disabled = false, readOnly = false, rows = 4 }: {
  value: string; onChange?: (v: string) => void; placeholder?: string; disabled?: boolean; readOnly?: boolean; rows?: number
}) {
  if (readOnly) return <ReadOnlyValue value={value} multiline />
  return (
    <textarea value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} disabled={disabled} rows={rows}
      className="w-full px-3 py-2 text-sm outline-none transition-colors resize-y"
      style={{ borderRadius: 8, border: `1px solid ${C.border}`, background: disabled ? C.bg : C.white, color: disabled ? C.textSecondary : C.textPrimary, lineHeight: 1.6, minHeight: rows * 22 }}
      onFocus={e => { if (!disabled) e.currentTarget.style.borderColor = C.primary }}
      onBlur={e => { e.currentTarget.style.borderColor = C.border }}
    />
  )
}

function FormDateInput({ value, onChange, disabled = false, readOnly = false }: {
  value: string; onChange?: (v: string) => void; disabled?: boolean; readOnly?: boolean
}) {
  if (readOnly) {
    if (!value) return <span style={{ color: C.textPlaceholder, fontSize: 13 }}>—</span>
    try { return <span style={{ fontSize: 13, color: C.textPrimary }}>{new Date(value).toLocaleDateString('ru-RU')}</span> }
    catch { return <span style={{ fontSize: 13, color: C.textPrimary }}>{value}</span> }
  }
  return (
    <input type="date" value={value} onChange={e => onChange?.(e.target.value)} disabled={disabled}
      className="w-full px-3 text-sm outline-none"
      style={{ height: 36, borderRadius: 8, border: `1px solid ${C.border}`, background: disabled ? C.bg : C.white, color: value ? C.textPrimary : C.textPlaceholder }}
      onFocus={e => { if (!disabled) e.currentTarget.style.borderColor = C.primary }}
      onBlur={e => { e.currentTarget.style.borderColor = C.border }}
    />
  )
}

/* ─── Custom Select ──────────────────────────────────────── */
function CustomSelect({ value, onChange, options, placeholder = '— Выберите —', creatable = false, disabled = false, readOnly = false }: {
  value: string; onChange?: (v: string) => void; options: string[]; placeholder?: string; creatable?: boolean; disabled?: boolean; readOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery('') } }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
  const canCreate = creatable && query.trim() && !options.some(o => o.toLowerCase() === query.trim().toLowerCase())
  if (readOnly) return <ReadOnlyValue value={value} />
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" disabled={disabled} onClick={() => { if (!disabled) { setOpen(!open); if (!open) setQuery('') } }}
        className="w-full px-3 flex items-center justify-between text-sm outline-none"
        style={{ height: 36, borderRadius: 8, border: `1px solid ${open ? C.primary : C.border}`, background: disabled ? C.bg : C.white, color: value ? C.textPrimary : C.textPlaceholder, cursor: disabled ? 'not-allowed' : 'pointer' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>{value || placeholder}</span>
        <ChevronDown size={13} style={{ color: C.textPlaceholder, flexShrink: 0, marginLeft: 4, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-white z-[200]" style={{ border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.12)', top: '100%' }}>
          <div className="p-2" style={{ borderBottom: `1px solid ${C.border}` }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: C.textPlaceholder }} />
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск..."
                className="w-full pl-7 pr-3 py-1.5 text-sm outline-none"
                style={{ borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12 }}
                onFocus={e => { e.currentTarget.style.borderColor = C.primary }}
                onBlur={e => { e.currentTarget.style.borderColor = C.border }}
              />
            </div>
          </div>
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {filtered.length === 0 && !canCreate && <div className="px-3 py-3 text-center text-xs" style={{ color: C.textSecondary }}>Нет вариантов</div>}
            {filtered.map(opt => (
              <button key={opt} type="button" onClick={() => { onChange?.(opt); setOpen(false); setQuery('') }}
                className="w-full px-3 py-2 text-sm text-left"
                style={{ background: value === opt ? C.primaryLight : 'transparent', color: value === opt ? C.primary : C.textPrimary }}
                onMouseEnter={e => { if (value !== opt) e.currentTarget.style.background = C.bg }}
                onMouseLeave={e => { if (value !== opt) e.currentTarget.style.background = 'transparent' }}>
                {opt}
              </button>
            ))}
            {canCreate && (
              <button type="button" onClick={() => { onChange?.(query.trim()); setOpen(false); setQuery('') }}
                className="w-full px-3 py-2 text-sm text-left flex items-center gap-1.5"
                style={{ borderTop: `1px solid ${C.border}`, color: C.primary }}
                onMouseEnter={e => { e.currentTarget.style.background = C.primaryLight }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                <Plus size={11} />Создать: «{query.trim()}»
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Status badge ───────────────────────────────────────── */
function StatusBadgeModal({ status }: { status: string }) {
  const cfg = getStatusCfg(status)
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs" style={{ background: cfg.bg, color: cfg.color, fontWeight: 500 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0, display: 'inline-block' }} />
      {status}
    </span>
  )
}

/* ─── Meta chip ──────────────────────────────────────────── */
function MetaChip({ icon: Icon, label, value, highlight }: { icon: React.ElementType; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      style={{ background: highlight ? '#FFF7E6' : C.bg, border: `1px solid ${highlight ? '#FFD591' : C.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>
      <Icon size={10} style={{ color: highlight ? C.warning : C.textSecondary, flexShrink: 0 }} />
      <span style={{ color: C.textSecondary, fontWeight: 500 }}>{label}:</span>
      <span style={{ color: highlight ? '#D46B08' : C.textRegular, fontWeight: 500 }}>{value}</span>
    </div>
  )
}

/* ─── Confirm dialog ─────────────────────────────────────── */
function ConfirmDialog({ open, onClose, title, description, confirmLabel, confirmDanger, onConfirm, children }: {
  open: boolean; onClose: () => void; title: string; description?: string; confirmLabel: string; confirmDanger?: boolean; onConfirm: () => void; children?: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-xl p-6 w-[420px] max-w-[90vw]" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: confirmDanger ? C.dangerBg : C.warningBg }}>
            <AlertTriangle size={18} style={{ color: confirmDanger ? C.danger : C.warning }} />
          </div>
          <div>
            <h3 className="text-sm mb-1" style={{ color: C.textPrimary, fontWeight: 600 }}>{title}</h3>
            {description && <p className="text-xs" style={{ color: C.textRegular, lineHeight: 1.5 }}>{description}</p>}
          </div>
        </div>
        {children && <div className="mb-4">{children}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-lg" style={{ border: `1px solid ${C.border}`, color: C.textRegular }}
            onMouseEnter={e => { e.currentTarget.style.background = C.bg }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
            Отмена
          </button>
          <button onClick={() => { onConfirm(); onClose() }} className="px-4 py-1.5 text-sm rounded-lg text-white"
            style={{ background: confirmDanger ? C.danger : C.warning }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Archive dialog ─────────────────────────────────────── */
function ArchiveDialog({ open, onClose, onConfirm }: {
  open: boolean; onClose: () => void; onConfirm: (reason: 'completed' | 'outdated') => void
}) {
  const [reason, setReason] = useState<'completed' | 'outdated'>('completed')
  if (!open) return null
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
            { value: 'completed' as const, label: 'Предложение выполнено', desc: 'Задача реализована в полном объёме' },
            { value: 'outdated' as const, label: 'Предложение больше не актуально', desc: 'Потребность устранена иным способом или утратила значимость' },
          ]).map(opt => (
            <label key={opt.value} className="flex items-start gap-3 p-3 rounded-lg cursor-pointer"
              style={{ border: `1px solid ${reason === opt.value ? C.primary : C.border}`, background: reason === opt.value ? C.primaryLight : C.white }}>
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
          <button onClick={() => { onConfirm(reason); onClose() }} className="px-4 py-1.5 text-sm rounded-lg text-white" style={{ background: C.warning }}>В архив</button>
        </div>
      </div>
    </div>
  )
}

function QueueCreateDialog({ open, onClose, value, onChange, loading, onConfirm }: {
  open: boolean
  onClose: () => void
  value: string
  onChange: (v: string) => void
  loading: boolean
  onConfirm: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-xl p-6 w-[420px] max-w-[90vw]" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: C.primaryLight }}>
            <Plus size={18} style={{ color: C.primary }} />
          </div>
          <div>
            <h3 className="text-sm mb-1" style={{ color: C.textPrimary, fontWeight: 600 }}>Добавить очередь</h3>
            <p className="text-xs" style={{ color: C.textRegular, lineHeight: 1.5 }}>Введите номер новой очереди (только положительное число)</p>
          </div>
        </div>
        <div className="mb-5">
          <input
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !loading) onConfirm() }}
            placeholder="Например: 4"
            className="w-full px-3 text-sm outline-none transition-colors"
            style={{ height: 36, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.textPrimary }}
            onFocus={e => { e.currentTarget.style.borderColor = C.primary }}
            onBlur={e => { e.currentTarget.style.borderColor = C.border }}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-1.5 text-sm rounded-lg"
            style={{ border: `1px solid ${C.border}`, color: C.textRegular, opacity: loading ? 0.7 : 1 }}
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-1.5 text-sm rounded-lg text-white"
            style={{ background: C.primary, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Добавление...' : 'Добавить'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Comments panel ─────────────────────────────────────── */
function CommentsPanel({ reqId, comments, onRefresh, canEdit }: {
  reqId: number; comments: CommentItem[]; onRefresh: () => void; canEdit: boolean
}) {
  const [text, setText] = useState('')
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    if (!text.trim()) return
    setSaving(true)
    try {
      await addRequirementComment(reqId, text.trim())
      setText('')
      onRefresh()
      toast.success('Комментарий добавлен')
    } catch { toast.error('Ошибка при добавлении комментария') }
    finally { setSaving(false) }
  }

  const handleDelete = async (commentId: number) => {
    try {
      await deleteRequirementComment(reqId, commentId)
      onRefresh()
      toast.success('Комментарий удалён')
    } catch { toast.error('Ошибка при удалении') }
  }

  return (
    <SectionCard title="Комментарии" accent="#67C23A">
      <div className="flex flex-col gap-3">
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
                      style={{ background: C.primary, fontWeight: 600 }}>{c.authorName?.charAt(0) ?? '?'}</div>
                    <div>
                      <span className="text-xs" style={{ color: C.textPrimary, fontWeight: 600 }}>{c.authorName}</span>
                      <span className="text-xs mx-1.5" style={{ color: C.textPlaceholder }}>·</span>
                      <span className="text-xs" style={{ color: C.textSecondary }}>{c.authorOrg}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs" style={{ color: C.textSecondary }}>
                      <Clock size={10} />
                      <span>{new Date(c.createdAt).toLocaleDateString('ru-RU')}</span>
                    </div>
                  </div>
                  {canEdit && (
                    <button onClick={() => setConfirmId(c.id)} className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: C.danger }} title="Удалить">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed" style={{ color: C.textPrimary }}>{c.commentText}</p>
              </div>
            ))}
          </div>
        )}
        {canEdit && (
          <div className="flex flex-col gap-2 pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
            <FormTextarea value={text} onChange={setText} placeholder="Введите комментарий..." rows={3} />
            <div className="flex justify-end">
              <button onClick={handleAdd} disabled={!text.trim() || saving}
                className="px-4 py-1.5 text-sm rounded-lg text-white flex items-center gap-1.5"
                style={{ background: text.trim() ? C.primary : C.border, opacity: saving ? 0.7 : 1 }}>
                <Plus size={14} />Добавить комментарий
              </button>
            </div>
          </div>
        )}
      </div>
      <ConfirmDialog open={!!confirmId} onClose={() => setConfirmId(null)} title="Удалить комментарий?"
        description="Это действие нельзя отменить." confirmLabel="Удалить" confirmDanger
        onConfirm={() => { if (confirmId) handleDelete(confirmId) }} />
    </SectionCard>
  )
}

/* ─── Attachments panel ──────────────────────────────────── */
function AttachmentsPanel({ reqId, attachments, onRefresh, canEdit }: {
  reqId: number; attachments: RequirementAttachmentItem[]; onRefresh: () => void; canEdit: boolean
}) {
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [libSearch, setLibSearch] = useState('')
  const [libOpen, setLibOpen] = useState(false)
  const [libItems, setLibItems] = useState<{ id: number; originalFileName: string; createdAt: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const libRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (libRef.current && !libRef.current.contains(e.target as Node)) setLibOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const loadLib = useCallback(async (search: string) => {
    try {
      const data = await fetchRequirementAttachmentLibrary(search)
      setLibItems(data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { if (libOpen) loadLib(libSearch) }, [libOpen, libSearch, loadLib])

  const getFileColor = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase()
    const m: Record<string, string> = { pdf: '#F56C6C', docx: '#409EFF', doc: '#409EFF', xlsx: '#67C23A', xls: '#67C23A', msg: '#E6A23C' }
    return m[ext ?? ''] ?? C.textSecondary
  }

  const handleDownload = async (attId: number, fileName: string) => {
    try {
      const res = await downloadRequirementAttachment(attId)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url; a.download = fileName; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Ошибка загрузки файла') }
  }

  const handleDetach = async (attId: number) => {
    try { await deleteRequirementAttachment(attId); onRefresh(); toast.success('Файл откреплён') }
    catch { toast.error('Ошибка') }
  }

  const handleUpload = async (files: FileList) => {
    setUploading(true)
    try { await uploadRequirementAttachments(reqId, Array.from(files)); onRefresh(); toast.success('Файлы загружены') }
    catch { toast.error('Ошибка загрузки') }
    finally { setUploading(false) }
  }

  const handleReattach = async (libFileId: number) => {
    try { await attachRequirementFromLibrary(reqId, libFileId); onRefresh(); setLibOpen(false); toast.success('Файл прикреплён') }
    catch { toast.error('Ошибка') }
  }

  return (
    <SectionCard title="Вложения" accent="#E6A23C">
      <div className="flex flex-col gap-3">
        {attachments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Paperclip size={28} style={{ color: C.textPlaceholder }} />
            <span className="text-sm" style={{ color: C.textSecondary }}>Файлов пока нет</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
            {attachments.map(att => {
              const fname = att.libraryFile?.originalFileName ?? `Файл #${att.id}`
              return (
                <div key={att.id} className="flex items-center gap-3 p-2.5 rounded-[8px] group" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                  <FileText size={18} style={{ color: getFileColor(fname), flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate" style={{ color: C.textPrimary, fontWeight: 500 }}>{fname}</div>
                    <div className="text-xs mt-0.5" style={{ color: C.textSecondary }}>{new Date(att.createdAt).toLocaleDateString('ru-RU')}</div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleDownload(att.id, fname)} className="px-2 py-1 text-xs rounded flex items-center gap-1"
                      style={{ border: `1px solid ${C.border}`, color: C.primary, background: C.white }}>
                      <Download size={11} /> Скачать
                    </button>
                    {canEdit && (
                      <button onClick={() => setConfirmId(att.id)} className="px-2 py-1 text-xs rounded flex items-center gap-1"
                        style={{ border: `1px solid ${C.border}`, color: C.danger, background: C.white }}>
                        <X size={11} /> Открепить
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {canEdit && (
          <div className="flex flex-col gap-2 pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-2">
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5"
                style={{ background: C.primary, color: '#fff', opacity: uploading ? 0.7 : 1, transition: 'background .15s' }}
                onMouseEnter={e => { if (!uploading) e.currentTarget.style.background = '#2B77F5' }}
                onMouseLeave={e => { e.currentTarget.style.background = C.primary }}>
                <Upload size={13} />{uploading ? 'Загрузка...' : 'Загрузить файлы'}
              </button>
              <input ref={fileInputRef} type="file" multiple accept=".doc,.docx,.pdf,.xls,.xlsx,.xlsm,.msg" className="hidden"
                onChange={e => { if (e.target.files?.length) { handleUpload(e.target.files); e.target.value = '' } }} />
              <span className="text-xs" style={{ color: C.textSecondary }}>doc, docx, pdf, xls, xlsx, msg</span>
            </div>
            <div ref={libRef} className="relative">
              <div className="flex items-center gap-2 px-3 py-2 rounded-[8px] cursor-pointer"
                style={{ border: `1px solid ${libOpen ? C.primary : C.border}`, background: C.white }}
                onClick={() => setLibOpen(!libOpen)}>
                <Search size={12} style={{ color: C.textPlaceholder }} />
                <input value={libSearch} onChange={e => { setLibSearch(e.target.value); setLibOpen(true) }}
                  onClick={e => { e.stopPropagation(); setLibOpen(true) }}
                  placeholder="Поиск по ранее загруженным файлам..."
                  className="flex-1 outline-none text-xs" style={{ color: C.textPrimary, background: 'transparent' }} />
              </div>
              {libOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white z-[200]"
                  style={{ border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.12)', top: '100%' }}>
                  <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                    {libItems.length === 0 && <div className="px-3 py-3 text-xs text-center" style={{ color: C.textSecondary }}>Файлы не найдены</div>}
                    {libItems.map(f => (
                      <button key={f.id} type="button" onClick={() => handleReattach(f.id)}
                        className="w-full px-3 py-2 flex items-center gap-2 text-left"
                        onMouseEnter={e => { e.currentTarget.style.background = C.bg }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                        <FileText size={13} style={{ color: getFileColor(f.originalFileName), flexShrink: 0 }} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs truncate" style={{ color: C.textPrimary }}>{f.originalFileName}</div>
                          <div className="text-xs" style={{ color: C.textSecondary }}>{new Date(f.createdAt).toLocaleDateString('ru-RU')}</div>
                        </div>
                        <Paperclip size={11} style={{ color: C.primary, flexShrink: 0 }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <ConfirmDialog open={!!confirmId} onClose={() => setConfirmId(null)} title="Открепить файл?"
        description="Файл будет откреплён от записи." confirmLabel="Открепить" confirmDanger
        onConfirm={() => { if (confirmId) handleDetach(confirmId) }} />
    </SectionCard>
  )
}

/* ─── Modal form state ───────────────────────────────────── */
interface FormState {
  shortName: string; initiator: string; responsiblePerson: string; sectionName: string
  implementationQueue: string; statusText: string; systemType: string; completedAt: string
  proposalText: string; problemComment: string; discussionSummary: string; noteText: string
  contractName: string; contractTZFunctionId: string; nmckPointText: string; tzPointText: string
  ditOutgoingNumber: string; ditOutgoingDate: string; taskIdentifier: string
}

function reqToForm(r: Requirement): FormState {
  return {
    shortName: r.shortName ?? '',
    initiator: r.initiator ?? '',
    responsiblePerson: r.responsiblePerson ?? '',
    sectionName: r.sectionName ?? '',
    implementationQueue: r.implementationQueue ?? '',
    statusText: r.statusText ?? '',
    systemType: r.systemType ?? '',
    completedAt: r.completedAt ? r.completedAt.slice(0, 10) : '',
    proposalText: r.proposalText ?? '',
    problemComment: r.problemComment ?? '',
    discussionSummary: r.discussionSummary ?? '',
    noteText: r.noteText ?? '',
    contractName: r.contractName ?? '',
    contractTZFunctionId: r.contractTZFunctionId ? String(r.contractTZFunctionId) : '',
    nmckPointText: r.nmckPointText ?? '',
    tzPointText: r.tzPointText ?? '',
    ditOutgoingNumber: r.ditOutgoingNumber ?? '',
    ditOutgoingDate: r.ditOutgoingDate ? r.ditOutgoingDate.slice(0, 10) : '',
    taskIdentifier: r.taskIdentifier ?? '',
  }
}

const emptyForm = (): FormState => ({
  shortName: '', initiator: '', responsiblePerson: '', sectionName: '',
  implementationQueue: '', statusText: 'Новое', systemType: '', completedAt: '',
  proposalText: '', problemComment: '', discussionSummary: '', noteText: '',
  contractName: '', contractTZFunctionId: '', nmckPointText: '', tzPointText: '',
  ditOutgoingNumber: '', ditOutgoingDate: '', taskIdentifier: '',
})

/* ─── Main ProposalModal export ──────────────────────────── */
export interface ProposalModalProps {
  isOpen: boolean
  onClose: () => void
  /** existing requirement to view/edit; null = create new */
  requirement?: Requirement | null
  /** 'view' = detail card (with comments); 'create' = new proposal (no comments) */
  mode?: 'view' | 'create'
  onSaved?: () => void
}

export function ProposalModal({ isOpen, onClose, requirement, mode = 'view', onSaved }: ProposalModalProps) {
  const auth = useAuth()
  const isCreate = mode === 'create' || !requirement
  const canEditExisting = Boolean(auth.isSuperuser || auth.profile?.accessLevel === 'edit')
  const canDelete = Boolean(auth.canDeleteRequirements || auth.isSuperuser)
  const [editMode, setEditMode] = useState(isCreate || canEditExisting)
  const [form, setForm] = useState<FormState>(requirement ? reqToForm(requirement) : emptyForm())
  const [fullReq, setFullReq] = useState<Requirement | null>(requirement ?? null)
  const [saving, setSaving] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [queueCreateOpen, setQueueCreateOpen] = useState(false)
  const [queueNumberInput, setQueueNumberInput] = useState('')
  const [queueCreating, setQueueCreating] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [queueOptions, setQueueOptions] = useState<string[]>([])
  const [systemOptions, setSystemOptions] = useState<string[]>([])
  const [contractOptions, setContractOptions] = useState<ContractItem[]>([])
  const [contractStages, setContractStages] = useState<GKStage[]>([])
  const [selectedStageNumber, setSelectedStageNumber] = useState('')
  const [bindingMode, setBindingMode] = useState<'nmck' | 'tz'>('nmck')
  const [selectedTzSection, setSelectedTzSection] = useState('')

  /* reset on open */
  useEffect(() => {
    if (isOpen) {
      const src = requirement ?? null
      setFullReq(src)
      setForm(src ? reqToForm(src) : emptyForm())
      setEditMode(isCreate || canEditExisting)
      setBindingMode(src?.tzPointText ? 'tz' : 'nmck')
      setSelectedTzSection(src?.tzPointText ?? '')
      setSelectedStageNumber('')
    }
  }, [isOpen, requirement, isCreate, canEditExisting])

  const loadQueues = useCallback(async () => {
    try {
      const rows = await fetchQueues()
      const values = rows.map((q) => `${q.number} очередь`)
      setQueueOptions(Array.from(new Set(values)))
    } catch {
      setQueueOptions([])
    }
  }, [])

  const loadSelectOptions = useCallback(async () => {
    try {
      const rows = await fetchRequirements({ includeArchived: true })
      const systems = Array.from(new Set(rows.map((r) => r.systemType).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, 'ru'),
      )
      setSystemOptions(systems)
    } catch {
      setSystemOptions([])
    }
  }, [])

  const loadContracts = useCallback(async () => {
    try {
      const rows = await fetchContracts()
      setContractOptions(rows.filter((c) => c.isActive))
    } catch {
      setContractOptions([])
    }
  }, [])

  /* load full requirement (with comments+attachments) when viewing */
  const loadFull = useCallback(async () => {
    if (!requirement?.id) return
    setLoadingDetail(true)
    try {
      const r = await fetchRequirementById(requirement.id)
      setFullReq(r)
      if (!editMode) setForm(reqToForm(r))
    } catch { /* ignore */ }
    finally { setLoadingDetail(false) }
  }, [requirement?.id, editMode])

  useEffect(() => {
    if (isOpen && !isCreate) loadFull()
  }, [isOpen, isCreate, loadFull])

  useEffect(() => {
    if (isOpen) loadQueues()
  }, [isOpen, loadQueues])

  useEffect(() => {
    if (isOpen) loadSelectOptions()
  }, [isOpen, loadSelectOptions])

  useEffect(() => {
    if (isOpen) loadContracts()
  }, [isOpen, loadContracts])

  useEffect(() => {
    let cancelled = false
    const contract = contractOptions.find((c) => c.name === form.contractName)
    if (!contract) {
      setContractStages([])
      setSelectedStageNumber('')
      setSelectedTzSection('')
      return
    }
    void (async () => {
      try {
        const details = await fetchGKContractDetails(contract.id)
        if (cancelled) return
        const stages = details.stages || []
        setContractStages(stages)
        setSelectedStageNumber((prev) => {
          if (prev && stages.some((s) => String(s.stageNumber) === prev)) return prev
          return stages[0] ? String(stages[0].stageNumber) : ''
        })
      } catch {
        if (cancelled) return
        setContractStages([])
        setSelectedStageNumber('')
        setSelectedTzSection('')
      }
    })()
    return () => { cancelled = true }
  }, [contractOptions, form.contractName])

  const stageFunctions = useMemo(() => {
    const stage = contractStages.find((s) => String(s.stageNumber) === selectedStageNumber)
    return stage?.functions ?? []
  }, [contractStages, selectedStageNumber])

  const nmckOptions = useMemo(() => (
    stageFunctions
      .filter((fn) => fn.nmckFunctionNumber?.trim())
      .map((fn) => ({
        point: fn.nmckFunctionNumber.trim(),
        functionId: fn.id,
        tzSection: fn.tzSectionNumber?.trim() ?? '',
      }))
  ), [stageFunctions])

  const tzOptions = useMemo(() => (
    Array.from(new Set(
      stageFunctions
        .map((fn) => fn.tzSectionNumber?.trim())
        .filter((v): v is string => Boolean(v)),
    ))
  ), [stageFunctions])

  const nmckOptionsBySelectedTz = useMemo(() => (
    stageFunctions
      .filter((fn) => (fn.tzSectionNumber?.trim() ?? '') === selectedTzSection && fn.nmckFunctionNumber?.trim())
      .map((fn) => ({
        point: fn.nmckFunctionNumber.trim(),
        functionId: fn.id,
      }))
  ), [selectedTzSection, stageFunctions])

  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm(f => ({ ...f, [key]: val }))

  const handleContractChange = (name: string) => {
    setField('contractName', name)
    setSelectedStageNumber('')
    setContractStages([])
    setSelectedTzSection('')
    setField('contractTZFunctionId', '')
    setField('nmckPointText', '')
    setField('tzPointText', '')
  }

  const handleStageChange = (stageNumber: string) => {
    setSelectedStageNumber(stageNumber)
    setSelectedTzSection('')
    setField('contractTZFunctionId', '')
    setField('nmckPointText', '')
    setField('tzPointText', '')
  }

  const handleBindingModeChange = (mode: 'nmck' | 'tz') => {
    setBindingMode(mode)
    setSelectedTzSection('')
    setField('contractTZFunctionId', '')
    setField('nmckPointText', '')
    setField('tzPointText', '')
  }

  const handleNmckPointChange = (point: string) => {
    if (bindingMode === 'nmck') {
      const selected = nmckOptions.find((opt) => opt.point === point)
      setField('contractTZFunctionId', selected ? String(selected.functionId) : '')
      setField('nmckPointText', point)
      setField('tzPointText', selected?.tzSection ?? '')
      return
    }
    const selected = nmckOptionsBySelectedTz.find((opt) => opt.point === point)
    setField('contractTZFunctionId', selected ? String(selected.functionId) : '')
    setField('nmckPointText', point)
  }

  const handleTzPointChange = (point: string) => {
    setSelectedTzSection(point)
    setField('tzPointText', point)
    setField('contractTZFunctionId', '')
    setField('nmckPointText', '')
  }

  const toApiDateTime = (value: string): string | null => {
    const v = value.trim()
    if (!v) return null
    // Backend binds to time.Time, so send RFC3339 instead of date-only.
    return `${v}T00:00:00Z`
  }

  const getApiErrorMessage = (error: unknown, fallback: string): string => {
    const maybeMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) return maybeMessage
    return fallback
  }

  const buildPayload = (): RequirementPayload => ({
    shortName: form.shortName,
    initiator: form.initiator,
    responsiblePerson: form.responsiblePerson,
    sectionName: form.sectionName,
    implementationQueue: form.implementationQueue,
    statusText: form.statusText,
    systemType: form.systemType,
    completedAt: toApiDateTime(form.completedAt),
    proposalText: form.proposalText,
    problemComment: form.problemComment,
    discussionSummary: form.discussionSummary,
    noteText: form.noteText,
    contractName: form.contractName,
    contractTZFunctionId: form.contractTZFunctionId ? Number(form.contractTZFunctionId) : null,
    nmckPointText: form.nmckPointText,
    tzPointText: form.tzPointText,
    ditOutgoingNumber: form.ditOutgoingNumber,
    ditOutgoingDate: toApiDateTime(form.ditOutgoingDate),
    taskIdentifier: form.taskIdentifier || undefined,
  })

  const handleSave = async () => {
    if (!isCreate && !canEditExisting) {
      toast.error('Недостаточно прав для редактирования')
      return
    }
    if (!form.shortName.trim()) { toast.error('Укажите наименование предложения'); return }
    setSaving(true)
    try {
      if (isCreate) {
        await createRequirement(buildPayload())
        toast.success('Предложение создано')
        onSaved?.()
        onClose()
      } else if (fullReq) {
        await updateRequirement(fullReq.id, buildPayload())
        toast.success('Изменения сохранены')
        onSaved?.()
        loadFull()
        // Keep edit mode after save to avoid unexpected switch to read-only.
        setEditMode(true)
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Ошибка при сохранении'))
    }
    finally { setSaving(false) }
  }

  const handleArchive = async (_reason: 'completed' | 'outdated') => {
    if (!fullReq) return
    if (!canEditExisting) {
      toast.error('Недостаточно прав для архивации')
      return
    }
    try {
      const completedAt = new Date().toISOString().slice(0, 10)
      await updateRequirement(fullReq.id, {
        ...buildPayload(),
        statusText: 'Выполнено',
        completedAt,
      })
      setForm((prev) => ({ ...prev, statusText: 'Выполнено', completedAt }))
      await archiveRequirement(fullReq.id, 'completed')
      toast.success('Запись архивирована')
      onSaved?.()
      loadFull()
    }
    catch { toast.error('Ошибка архивации') }
  }

  const handleRestore = async () => {
    if (!fullReq) return
    if (!canEditExisting) {
      toast.error('Недостаточно прав для восстановления')
      return
    }
    try { await restoreRequirement(fullReq.id); toast.success('Запись восстановлена'); onSaved?.(); loadFull() }
    catch { toast.error('Ошибка восстановления') }
  }

  const handleDelete = async () => {
    if (!fullReq) return
    if (!canDelete) {
      toast.error('Недостаточно прав для удаления')
      return
    }
    try { await deleteRequirement(fullReq.id); toast.success('Запись удалена'); onSaved?.(); onClose() }
    catch { toast.error('Ошибка удаления') }
  }

  const handleAddQueue = () => {
    setQueueNumberInput('')
    setQueueCreateOpen(true)
  }

  const handleCreateQueue = async () => {
    const n = Number(queueNumberInput.trim())
    if (!Number.isFinite(n) || n <= 0) {
      toast.error('Номер очереди должен быть положительным числом')
      return
    }
    setQueueCreating(true)
    try {
      const q = await createQueue(Math.trunc(n))
      const value = `${q.number} очередь`
      setQueueOptions((prev) => (prev.includes(value) ? prev : [...prev, value]))
      setField('implementationQueue', value)
      toast.success('Очередь создана')
      setQueueCreateOpen(false)
    } catch {
      toast.error('Не удалось создать очередь')
    } finally {
      setQueueCreating(false)
    }
  }

  useEffect(() => {
    if (form.statusText === 'Выполнено' && !form.completedAt) {
      const todayStr = new Date().toISOString().slice(0, 10)
      setField('completedAt', todayStr)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.statusText])

  if (!isOpen) return null

  const isArchived = fullReq?.isArchived ?? false
  const archiveReason = fullReq?.archivedReason ?? null
  const readOnly = isCreate ? false : (!editMode || !canEditExisting)
  const completedAtForHeader = editMode ? form.completedAt : (fullReq?.completedAt ? fullReq.completedAt.slice(0, 10) : '')

  const title = isCreate ? 'Новое предложение' : 'Карточка предложения'
  const taskId = fullReq?.taskIdentifier ?? '—'

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center" style={{ background: 'rgba(0,0,0,0.55)', paddingTop: 24, paddingBottom: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="flex flex-col bg-white rounded-[18px]"
        style={{ width: '96vw', maxWidth: 1340, height: '92vh', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>

        {/* ── Sticky header ── */}
        <div className="flex-shrink-0 bg-white" style={{ borderBottom: `1px solid ${C.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <div className="px-6 py-3 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base truncate" style={{ color: C.textPrimary, fontWeight: 700 }}>{title}</h2>
                {!isCreate && (
                  <span className="px-2.5 py-0.5 rounded-[6px] text-xs" style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.primary, fontWeight: 600, fontFamily: 'monospace' }}>
                    {taskId}
                  </span>
                )}
                {isArchived && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs" style={{ background: '#FDF6EC', border: '1px solid #FAECD8', color: C.warning, fontWeight: 500 }}>В архиве</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {editMode && (
                <button onClick={handleSave} disabled={saving}
                  className="px-4 py-1.5 text-sm rounded-lg text-white flex items-center gap-1.5"
                  style={{ background: C.primary, opacity: saving ? 0.7 : 1, transition: 'filter .15s, background .15s' }}
                  onMouseEnter={e => { if (!saving) e.currentTarget.style.filter = 'brightness(0.95)' }}
                  onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}>
                  <Save size={14} />{saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              )}
              {!isCreate && canEditExisting && (isArchived ? (
                <button onClick={handleRestore} className="px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5"
                  style={{ border: `1px solid ${C.warning}`, color: C.warning, background: '#FDF6EC', transition: 'background .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#FCE8CC' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#FDF6EC' }}>
                  <ArchiveRestore size={14} />Восстановить
                </button>
              ) : editMode && (
                <button onClick={() => setArchiveOpen(true)} className="px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5"
                  style={{ border: `1px solid ${C.border}`, color: C.textRegular, background: '#fff', transition: 'background .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.bg }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}>
                  <Archive size={14} />В архив
                </button>
              ))}
              {!isCreate && editMode && canDelete && (
                <button onClick={() => setDeleteOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{ color: C.danger, border: `1px solid ${C.dangerBg}`, background: '#fff', transition: 'background .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}>
                  <Trash2 size={15} />
                </button>
              )}
              <div style={{ width: 1, height: 22, background: C.border }} />
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg"
                style={{ color: C.textSecondary }}
                onMouseEnter={e => { e.currentTarget.style.background = C.bg }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Meta chips */}
          {!isCreate && fullReq && (
            <div className="px-6 pb-2.5 flex flex-wrap gap-1.5">
              <MetaChip icon={User} label="Автор" value={fullReq.authorName || '—'} />
              <MetaChip icon={Building2} label="Орг. автора" value={fullReq.authorOrg || '—'} />
              {fullReq.lastEditedBy && <MetaChip icon={Pen} label="Редактор" value={`${fullReq.lastEditedBy} / ${fullReq.lastEditedOrg || ''}`} />}
              {fullReq.updatedAt && <MetaChip icon={Clock} label="Обновлено" value={new Date(fullReq.updatedAt).toLocaleDateString('ru-RU')} />}
              {fullReq.createdAt && <MetaChip icon={Calendar} label="Создано" value={new Date(fullReq.createdAt).toLocaleDateString('ru-RU')} />}
              {completedAtForHeader && <MetaChip icon={AlertCircle} label="Выполнить до" value={new Date(completedAtForHeader).toLocaleDateString('ru-RU')} highlight />}
            </div>
          )}

          {/* Archive banner */}
          {isArchived && (
            <div className="mx-6 mb-3 px-4 py-2.5 rounded-[8px] flex items-center gap-2.5"
              style={{ background: archiveReason === 'completed' ? C.successBg : '#FDF6EC', border: `1px solid ${archiveReason === 'completed' ? '#B3E19D' : '#FAECD8'}` }}>
              {archiveReason === 'completed'
                ? <CheckCircle2 size={15} style={{ color: C.success, flexShrink: 0 }} />
                : <Info size={15} style={{ color: C.warning, flexShrink: 0 }} />}
              <span className="text-xs" style={{ color: archiveReason === 'completed' ? '#4E8B2B' : '#B8720A', fontWeight: 500 }}>
                {archiveReason === 'completed' ? 'Запись в архиве: предложение выполнено' : 'Запись в архиве: предложение больше не актуально'}
              </span>
            </div>
          )}
        </div>

        {/* ── Body ── */}
        {loadingDetail ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm" style={{ color: C.textSecondary }}>Загрузка...</div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto" style={{ background: '#F0F2F5' }}>
            <div className="p-6 flex flex-col gap-5">
              <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 400px' }}>
              {/* Left column */}
              <div className="flex flex-col gap-4">
                <SectionCard title="Основные данные">
                  <div className="flex flex-col gap-4">
                    {!isCreate && (
                      <FormField label="Идентификатор задачи">
                        <FormInput value={form.taskIdentifier} onChange={v => setField('taskIdentifier', v)} readOnly />
                      </FormField>
                    )}
                    <FormField label="Краткое наименование предложения" required>
                      <FormInput value={form.shortName} onChange={v => setField('shortName', v)} placeholder="Введите краткое наименование..." readOnly={readOnly} />
                    </FormField>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Инициатор" required>
                        <FormInput value={form.initiator} onChange={v => setField('initiator', v)} placeholder="ФИО инициатора" readOnly={readOnly} />
                      </FormField>
                      <FormField label="Ответственный">
                        <FormInput value={form.responsiblePerson} onChange={v => setField('responsiblePerson', v)} placeholder="ФИО ответственного" readOnly={readOnly} />
                      </FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Раздел">
                        <CustomSelect value={form.sectionName} onChange={v => setField('sectionName', v)} options={SECTION_OPTIONS_LIST} creatable readOnly={readOnly} placeholder="— Выберите раздел —" />
                      </FormField>
                      <FormField label="Система">
                        <CustomSelect value={form.systemType} onChange={v => setField('systemType', v)} options={systemOptions} creatable readOnly={readOnly} placeholder="— Выберите систему —" />
                      </FormField>
                    </div>
                    <FormField label="Приоритет / Очередь">
                      {readOnly ? (
                        <ReadOnlyValue value={form.implementationQueue} />
                      ) : (
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <CustomSelect
                              value={form.implementationQueue}
                              onChange={(v) => setField('implementationQueue', v)}
                              options={queueOptions}
                              creatable
                              placeholder="— Выберите очередь —"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleAddQueue}
                            className="px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 flex-shrink-0"
                            style={{ border: `1px dashed ${C.primary}`, color: C.primary, background: C.primaryLight, transition: 'background .15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#D8E9FF' }}
                            onMouseLeave={e => { e.currentTarget.style.background = C.primaryLight }}
                          >
                            <Plus size={11} />Новая очередь
                          </button>
                        </div>
                      )}
                    </FormField>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Статус">
                        {readOnly
                          ? <StatusBadgeModal status={form.statusText} />
                          : <CustomSelect value={form.statusText} onChange={v => setField('statusText', v)} options={SYSTEM_STATUS_OPTIONS} readOnly={false} placeholder="— Статус —" />}
                      </FormField>
                      <FormField label="Дата выполнения">
                        <FormDateInput value={form.completedAt} onChange={v => setField('completedAt', v)} readOnly={readOnly} />
                      </FormField>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Содержание предложения">
                  <div className="flex flex-col gap-4">
                    <FormField label="Предложение" required>
                      <FormTextarea value={form.proposalText} onChange={v => setField('proposalText', v)} placeholder="Опишите предложение подробно..." rows={5} readOnly={readOnly} />
                    </FormField>
                    <FormField label="Комментарии и описание проблем">
                      <FormTextarea value={form.problemComment} onChange={v => setField('problemComment', v)} placeholder="Опишите текущие проблемы..." rows={4} readOnly={readOnly} />
                    </FormField>
                    <FormField label="Обсуждение">
                      <FormTextarea value={form.discussionSummary} onChange={v => setField('discussionSummary', v)} placeholder="Ход обсуждения, результаты встреч..." rows={4} readOnly={readOnly} />
                    </FormField>
                    <FormField label="Примечание">
                      <FormTextarea value={form.noteText} onChange={v => setField('noteText', v)} placeholder="Дополнительная информация..." rows={2} readOnly={readOnly} />
                    </FormField>
                  </div>
                </SectionCard>
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-4">
                <SectionCard title="Привязка к ГК и функции">
                  <div className="flex flex-col gap-4">
                    <FormField label="Государственный контракт (ГК)">
                      <CustomSelect
                        value={form.contractName}
                        onChange={handleContractChange}
                        options={contractOptions.map((c) => c.name)}
                        placeholder="— Выберите ГК —"
                        readOnly={readOnly}
                      />
                    </FormField>
                    <FormField label="Этап">
                      <CustomSelect
                        value={selectedStageNumber}
                        onChange={handleStageChange}
                        options={contractStages.map((s) => String(s.stageNumber))}
                        placeholder={form.contractName ? '— Выберите этап —' : 'Сначала выберите ГК'}
                        disabled={!form.contractName}
                        readOnly={readOnly}
                      />
                    </FormField>
                    <FormField label="Способ привязки">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleBindingModeChange('nmck')}
                          disabled={readOnly}
                          className="px-3 py-1.5 text-xs rounded-lg"
                          style={{ border: `1px solid ${bindingMode === 'nmck' ? C.primary : C.border}`, background: bindingMode === 'nmck' ? C.primaryLight : C.white, color: bindingMode === 'nmck' ? C.primary : C.textRegular, opacity: readOnly ? 0.7 : 1 }}
                        >
                          п.п. НМЦК
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBindingModeChange('tz')}
                          disabled={readOnly}
                          className="px-3 py-1.5 text-xs rounded-lg"
                          style={{ border: `1px solid ${bindingMode === 'tz' ? C.primary : C.border}`, background: bindingMode === 'tz' ? C.primaryLight : C.white, color: bindingMode === 'tz' ? C.primary : C.textRegular, opacity: readOnly ? 0.7 : 1 }}
                        >
                          п.п. ТЗ
                        </button>
                      </div>
                    </FormField>
                    <FormField label={bindingMode === 'nmck' ? 'п.п. НМЦК' : 'п.п. ТЗ'} hint={bindingMode === 'nmck' ? 'Пункт начальной максимальной цены контракта' : undefined}>
                      {readOnly ? (
                        <ReadOnlyValue value={bindingMode === 'nmck' ? form.nmckPointText : form.tzPointText} />
                      ) : (
                        <CustomSelect
                          value={bindingMode === 'nmck' ? form.nmckPointText : form.tzPointText}
                          onChange={bindingMode === 'nmck' ? handleNmckPointChange : handleTzPointChange}
                          options={bindingMode === 'nmck' ? nmckOptions.map((o) => o.point) : tzOptions}
                          placeholder={selectedStageNumber ? '— Выберите пункт —' : 'Сначала выберите этап'}
                          disabled={!selectedStageNumber}
                        />
                      )}
                    </FormField>
                    {bindingMode === 'tz' && (
                      <FormField label="п.п. НМЦК" hint="После выбора п.п. ТЗ выберите соответствующий п.п. НМЦК">
                        {readOnly ? (
                          <ReadOnlyValue value={form.nmckPointText} />
                        ) : (
                          <CustomSelect
                            value={form.nmckPointText}
                            onChange={handleNmckPointChange}
                            options={nmckOptionsBySelectedTz.map((o) => o.point)}
                            placeholder={selectedTzSection ? '— Выберите п.п. НМЦК —' : 'Сначала выберите п.п. ТЗ'}
                            disabled={!selectedTzSection}
                          />
                        )}
                      </FormField>
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="Письмо в ДИТ">
                  <div className="flex flex-col gap-4">
                    <FormField label="Номер исходящего письма">
                      <FormInput value={form.ditOutgoingNumber} onChange={v => setField('ditOutgoingNumber', v)} placeholder="Исх. № 2024-1234" readOnly={readOnly} />
                    </FormField>
                    <FormField label="Дата письма">
                      <FormDateInput value={form.ditOutgoingDate} onChange={v => setField('ditOutgoingDate', v)} readOnly={readOnly} />
                    </FormField>
                  </div>
                </SectionCard>

                {!isCreate && fullReq && (
                  <AttachmentsPanel
                    reqId={fullReq.id}
                    attachments={fullReq.attachments ?? []}
                    onRefresh={loadFull}
                    canEdit={editMode && canEditExisting}
                  />
                )}
              </div>
            </div>
              {!isCreate && fullReq && (
                <CommentsPanel
                  reqId={fullReq.id}
                  comments={fullReq.comments ?? []}
                  onRefresh={loadFull}
                  canEdit={editMode && canEditExisting}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <ArchiveDialog open={archiveOpen} onClose={() => setArchiveOpen(false)} onConfirm={handleArchive} />
      <QueueCreateDialog
        open={queueCreateOpen}
        onClose={() => { if (!queueCreating) setQueueCreateOpen(false) }}
        value={queueNumberInput}
        onChange={setQueueNumberInput}
        loading={queueCreating}
        onConfirm={handleCreateQueue}
      />
      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Удалить запись?"
        description="Это действие нельзя отменить. Запись будет удалена безвозвратно." confirmLabel="Удалить" confirmDanger
        onConfirm={handleDelete} />
    </div>
  )
}
