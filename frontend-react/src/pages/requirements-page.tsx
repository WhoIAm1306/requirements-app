import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Archive,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  Unlink,
  X,
  Info,
} from 'lucide-react'
import {
  archiveRequirement,
  deleteRequirement,
  exportRequirementsFile,
  fetchRequirementGKLink,
  fetchRequirements,
  restoreRequirement,
  unlinkRequirementGK,
  type RequirementGKLinkInfo,
  type RequirementListQuery,
} from '@/api/requirements'
import { fetchStageJiraEpicStatuses } from '@/api/gkContracts'
import { downloadBlob } from '@/lib/utils'
import type { JiraEpicStatusItem, Requirement } from '@/types'
import { ProposalModal } from '@/components/ProposalModal'

/* ─── Column definitions ────────────────────────────────── */
const COLUMNS = [
  { key: 'num',       label: '№',          width: 48  },
  { key: 'id',        label: 'ID',         width: 120 },
  { key: 'name',      label: 'Наименование', width: 280 },
  { key: 'initiator', label: 'Инициатор',  width: 190 },
  { key: 'resp',      label: 'Ответственный', width: 190 },
  { key: 'section',   label: 'Раздел',     width: 170 },
  { key: 'priority',  label: 'Приоритет',  width: 170 },
  { key: 'gk',        label: 'ГК',         width: 190 },
  { key: 'func',      label: 'Функция НМЦК, ТЗ', width: 190 },
  { key: 'status',    label: 'Статус',     width: 190 },
  { key: 'system',    label: 'Система',    width: 145 },
  { key: 'proposal',  label: 'Предложение', width: 380 },
  { key: 'comment',   label: 'Комментарии и описание проблем', width: 280 },
  { key: 'dit',       label: 'Письмо в ДИТ', width: 175 },
  { key: 'created',   label: 'Дата создания', width: 130 },
  { key: 'due',       label: 'Дата выполнения', width: 140 },
  { key: 'actions',   label: '',           width: 44  },
]
const PAGE_SIZE = 25
const CHECKBOX_W = 52
const CHECKBOX_LEFT_PAD = 16
const COLUMN_DIVIDER = '1px solid #e5e7eb'

/* ─── Archive filter options ───────────────────────────── */
const ARCHIVE_OPTIONS = [
  { value: 'active',  label: 'Активные' },
  { value: 'all',     label: 'Все' },
  { value: 'archived',label: 'Архивные' },
]

function applySystemFilterParams(systemTab: string, params: RequirementListQuery) {
  if (!systemTab) return
  if (systemTab === 'Система 112') {
    params.systemType = '112'
    return
  }
  if (systemTab === 'Система 101') {
    params.systemType = '101'
    return
  }
  if (systemTab === 'Телефония 112') {
    params.systemType = '112'
    params.telephonySection = 'true'
    return
  }
  if (systemTab === 'Телефония 101') {
    params.systemType = '101'
    params.telephonySection = 'true'
  }
}

/* ─── Status config ────────────────────────────────────── */
type StatusCfg = { bg: string; text: string; dot: string }
const STATUS_CFG: Record<string, StatusCfg> = {
  'Новое':           { bg: '#eff6ff', text: '#1447e6', dot: '#2b7fff' },
  'Требуется обсуждение': { bg: '#fffbeb', text: '#bb4d00', dot: '#fe9a00' },
  'Подтверждено':    { bg: '#f5f3ff', text: '#7008e7', dot: '#8e51ff' },
  'Учтено':          { bg: '#fff7ed', text: '#ca3500', dot: '#ff8904' },
  'Выполнено':       { bg: '#ecfdf5', text: '#007a55', dot: '#00bc7d' },
}
function getStatusCfg(s: string): StatusCfg {
  return STATUS_CFG[s] ?? { bg: '#f1f5f9', text: '#45556c', dot: '#94a3b8' }
}

function getRowTone(item: Requirement) {
  if (!item.isArchived) return { bg: '#ffffff' }
  const s = item.statusText || ''
  if (s === 'Завершено' || s === 'Выполнено' || item.archivedReason === 'completed')
    return { bg: 'rgba(236,253,245,0.55)' }
  return { bg: 'rgba(255,247,237,0.55)' }
}

function normalizeSearchValue(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.toLowerCase().replace(/\s+/g, ' ').trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).toLowerCase()
  if (value instanceof Date) return value.toISOString().toLowerCase()
  return ''
}

function matchesSmartSearch(item: Requirement, query: string): boolean {
  const normalizedQuery = normalizeSearchValue(query)
  if (!normalizedQuery) return true
  const tokens = normalizedQuery.split(' ').filter(Boolean)
  if (tokens.length === 0) return true

  const searchableValues = Object.values(item)
    .map(normalizeSearchValue)
    .filter(Boolean)

  if (searchableValues.length === 0) return false
  const haystack = searchableValues.join(' ')
  return tokens.every((token) => haystack.includes(token))
}

/* ─── StatusBadge ──────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  if (!status) return null
  const c = getStatusCfg(status)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 9999, padding: '2px 8px', background: c.bg, color: c.text, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', lineHeight: 1.4 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot, flexShrink: 0, display: 'inline-block' }} />
      {status}
    </span>
  )
}

/* ─── FilterPill ───────────────────────────────────────── */
function FilterPill({ label, value, options, onChange }: {
  label: string; value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  const selected = options.find(o => o.value === value)
  const active = Boolean(value)
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(p => !p)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 10px', borderRadius: 8, border: `1px solid ${active ? '#93c5fd' : '#e2e8f0'}`, background: active ? '#eff6ff' : '#fff', color: active ? '#1d4ed8' : '#45556c', fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s' }}>
        <span style={{ color: active ? '#93c5fd' : '#94a3b8', fontSize: 11 }}>{label}:</span>
        <span>{selected?.label || 'Все'}</span>
        {active && (
          <span onClick={e => { e.stopPropagation(); onChange('') }} style={{ marginLeft: 2, display: 'flex', alignItems: 'center', color: '#93c5fd' }}>
            <X size={12} />
          </span>
        )}
        {!active && <ChevronDown size={12} style={{ color: '#94a3b8' }} />}
      </button>
      {open && (
        <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: 4, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 100, minWidth: 160 }}>
          {options.map(opt => (
            <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false) }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 13, background: value === opt.value ? '#eff6ff' : 'transparent', color: value === opt.value ? '#1d4ed8' : '#1e293b', fontWeight: value === opt.value ? 600 : 400, cursor: 'pointer' }}
              onMouseEnter={e => { if (value !== opt.value) e.currentTarget.style.background = '#f8fafc' }}
              onMouseLeave={e => { if (value !== opt.value) e.currentTarget.style.background = 'transparent' }}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── RowMenu ──────────────────────────────────────────── */
function RowMenu({ item, onView, onArchive, onRestore, onDelete }: {
  item: Requirement; onView: () => void
  onArchive: () => void; onRestore: () => void; onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(p => !p)}
        style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: open ? '#f1f5f9' : 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}>
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 2, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 200, minWidth: 160, overflow: 'hidden' }}>
          <button onClick={() => { onView(); setOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', fontSize: 13, color: '#374151', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
            Просмотр
          </button>
          <div style={{ height: 1, background: '#f1f5f9', margin: '2px 0' }} />
          {item.isArchived ? (
            <button onClick={() => { onRestore(); setOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', fontSize: 13, color: '#b45309', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fffbeb' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              <RotateCcw size={14} />Восстановить
            </button>
          ) : (
            <button onClick={() => { onArchive(); setOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', fontSize: 13, color: '#92400e', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fffbeb' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              <Archive size={14} />В архив
            </button>
          )}
          <button onClick={() => { onDelete(); setOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', fontSize: 13, color: '#dc2626', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
            <Trash2 size={14} />Удалить
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── SkeletonRows ─────────────────────────────────────── */
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', height: 46, borderBottom: '1px solid #f1f5f9', padding: '0 8px', gap: 0 }}>
          <div style={{ width: CHECKBOX_W, flexShrink: 0 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, background: '#e2e8f0' }} className="animate-pulse" />
          </div>
          {COLUMNS.map(col => (
            <div key={col.key} style={{ width: col.width, flexShrink: 0, paddingLeft: 8, paddingRight: 8, borderRight: col.key === 'actions' ? 'none' : COLUMN_DIVIDER }}>
              <div style={{ height: 12, borderRadius: 4, background: '#e2e8f0', width: col.key === 'actions' ? 0 : '80%' }} className="animate-pulse" />
            </div>
          ))}
        </div>
      ))}
    </>
  )
}

/* ─── RecordCountPopup ─────────────────────────────────── */
function RecordCountPopup({ items }: { items: Requirement[] }) {
  const [hover, setHover] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const total = items.length

  const byStatus = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of items) { m[r.statusText] = (m[r.statusText] ?? 0) + 1 }
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [items])

  const byPriority = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of items) {
      const p = r.implementationQueue || 'Не указан'
      m[p] = (m[p] ?? 0) + 1
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [items])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'default' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#64748b', padding: '0 10px', height: 32, borderRadius: 8, background: hover ? '#f1f5f9' : 'transparent', transition: 'background .15s' }}>
        <Info size={13} style={{ color: '#94a3b8' }} />
        <span>Всего записей:</span>
        <span style={{ fontWeight: 700, color: '#1e293b' }}>{total}</span>
      </div>
      {hover && (
        <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: 6, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.13)', zIndex: 200, minWidth: 260, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>По статусам</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
            {byStatus.map(([s, cnt]) => {
              const cfg = getStatusCfg(s)
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: 12, color: '#374151' }}>{s || '—'}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{cnt}</span>
                </div>
              )
            })}
          </div>
          {byPriority.length > 0 && (
            <>
              <div style={{ height: 1, background: '#f1f5f9', margin: '8px 0' }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>По приоритетам</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {byPriority.map(([p, cnt]) => (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{p}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{cnt}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Table row ────────────────────────────────────────── */
function RequirementRow({
  item, index, selected, onSelect, onOpen, onArchive, onRestore, onDelete, functionLabel, onOpenFunction,
}: {
  item: Requirement; index: number; selected: boolean
  onSelect: (id: number, checked: boolean) => void
  onOpen: () => void; onArchive: () => void; onRestore: () => void; onDelete: () => void
  functionLabel?: { line1: string; line2?: string }
  onOpenFunction: () => void
}) {
  const [hover, setHover] = useState(false)
  const tone = getRowTone(item)
  const rowBg = selected ? '#eff6ff' : hover ? '#f8fafc' : tone.bg
  const fmt = (d?: string | null) => d ? new Date(d).toLocaleDateString('ru-RU') : '—'
  const clamp2: React.CSSProperties = {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: 1.25,
    maxHeight: '2.5em',
    wordBreak: 'break-word',
  }
  const centeredCell: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  }

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', minHeight: 58, borderBottom: '1px solid #f1f5f9', background: rowBg, cursor: 'pointer', transition: 'background .1s', userSelect: 'none', borderLeft: selected ? '2px solid #3b82f6' : '2px solid transparent' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onOpen}
    >
      {/* Checkbox */}
      <div style={{ width: CHECKBOX_W, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: CHECKBOX_LEFT_PAD, boxSizing: 'border-box' }}
        onClick={e => { e.stopPropagation(); onSelect(item.id, !selected) }}>
        <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${selected ? '#3b82f6' : '#cbd5e1'}`, background: selected ? '#3b82f6' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .1s' }}>
          {selected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </div>
      </div>

      {/* № */}
      <div style={{ width: COLUMNS[0].width, flexShrink: 0, paddingLeft: 8, paddingRight: 8, borderRight: COLUMN_DIVIDER, fontSize: 12, color: '#94a3b8', fontVariantNumeric: 'tabular-nums', ...centeredCell }}>
        {item.sequenceNumber ?? index + 1}
      </div>
      {/* ID */}
      <div style={{ width: COLUMNS[1].width, flexShrink: 0, paddingLeft: 8, paddingRight: 8, borderRight: COLUMN_DIVIDER, ...centeredCell }}>
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#3b82f6', fontWeight: 700, background: '#eff6ff', borderRadius: 6, padding: '3px 8px', lineHeight: 1.2, display: 'inline-flex', alignItems: 'center' }}>{item.taskIdentifier || '—'}</span>
      </div>
      {/* Наименование */}
      <div style={{ width: COLUMNS[2].width, flexShrink: 0, paddingLeft: 8, paddingRight: 8, borderRight: COLUMN_DIVIDER, fontSize: 13, color: '#1e293b', fontWeight: 500 }} title={item.shortName}>
        <div style={clamp2}>
        {item.shortName || '—'}
        </div>
      </div>
      {/* Инициатор */}
      <div style={{ width: COLUMNS[3].width, flexShrink: 0, paddingLeft: 8, paddingRight: 8, borderRight: COLUMN_DIVIDER, fontSize: 12, ...centeredCell }}>
        <div style={{ ...clamp2, color: '#374151' }} title={item.initiator}>
          {item.initiator || '—'}
        </div>
      </div>
      {/* Ответственный */}
      <div style={{ width: COLUMNS[4].width, flexShrink: 0, paddingLeft: 8, paddingRight: 8, borderRight: COLUMN_DIVIDER, fontSize: 12, color: '#374151' }} title={item.responsiblePerson ?? ''}>
        <div style={clamp2}>{item.responsiblePerson || '—'}</div>
      </div>
      {/* Раздел */}
      <div style={{ width: COLUMNS[5].width, flexShrink: 0, paddingLeft: 8, paddingRight: 8, borderRight: COLUMN_DIVIDER, fontSize: 12, color: '#374151' }} title={item.sectionName}>
        <div style={clamp2}>{item.sectionName || '—'}</div>
      </div>
      {/* Приоритет */}
      <div style={{ width: COLUMNS[6].width, flexShrink: 0, paddingLeft: 8, paddingRight: 8, borderRight: COLUMN_DIVIDER, fontSize: 12, color: '#64748b', ...centeredCell }} title={item.implementationQueue}>
        <div style={clamp2}>{item.implementationQueue || '—'}</div>
      </div>
      {/* ГК */}
      <div style={{ width: COLUMNS[7].width, flexShrink: 0, paddingLeft: 8, paddingRight: 8, borderRight: COLUMN_DIVIDER, fontSize: 12, color: '#374151', ...centeredCell }} title={item.contractName}>
        <div style={clamp2}>{item.contractName || '—'}</div>
      </div>
      {/* Функция НМЦК, ТЗ */}
      <div style={{ width: COLUMNS[8].width, flexShrink: 0, paddingLeft: 8, paddingRight: 8, borderRight: COLUMN_DIVIDER, fontSize: 11 }}>
        {functionLabel ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenFunction() }}
            title={[functionLabel.line1, functionLabel.line2].filter(Boolean).join('\n')}
            style={{ border: 'none', background: 'none', padding: 0, margin: 0, color: '#1d4ed8', cursor: 'pointer', textAlign: 'left', width: '100%' }}
          >
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{functionLabel.line1}</div>
            {functionLabel.line2 && (
              <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: '#475569', marginTop: 2 }}>
                {functionLabel.line2}
              </div>
            )}
          </button>
        ) : (
          <span style={{ color: '#cbd5e1' }}>—</span>
        )}
      </div>
      {/* Статус */}
      <div style={{ width: COLUMNS[9].width, flexShrink: 0, paddingLeft: 8, paddingRight: 8, borderRight: COLUMN_DIVIDER, ...centeredCell }}>
        <StatusBadge status={item.statusText} />
      </div>
      {/* Система */}
      <div style={{ width: COLUMNS[10].width, flexShrink: 0, paddingLeft: 8, paddingRight: 8, borderRight: COLUMN_DIVIDER, fontSize: 12, color: '#64748b', ...centeredCell }}>
        <div style={clamp2}>{item.systemType || '—'}</div>
      </div>
      {/* Предложение */}
      <div style={{ width: COLUMNS[11].width, flexShrink: 0, paddingLeft: 8, paddingRight: 8, borderRight: COLUMN_DIVIDER, fontSize: 12, color: '#64748b' }} title={item.proposalText ?? ''}>
        {item.proposalText
          ? <div style={clamp2}>{item.proposalText}</div>
          : <span style={{ color: '#cbd5e1' }}>—</span>}
      </div>
      {/* Комментарии */}
      <div style={{ width: COLUMNS[12].width, flexShrink: 0, paddingLeft: 8, paddingRight: 8, borderRight: COLUMN_DIVIDER, fontSize: 12, color: '#64748b' }} title={item.problemComment ?? ''}>
        {item.problemComment
          ? <div style={clamp2}>{item.problemComment}</div>
          : <span style={{ color: '#cbd5e1' }}>—</span>}
      </div>
      {/* Письмо в ДИТ */}
      <div style={{ width: COLUMNS[13].width, flexShrink: 0, paddingLeft: 8, paddingRight: 8, borderRight: COLUMN_DIVIDER, fontSize: 11 }}>
        {item.ditOutgoingNumber && <div style={{ color: '#374151', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{item.ditOutgoingNumber}</div>}
        {item.ditOutgoingDate && <div style={{ color: '#94a3b8' }}>{fmt(item.ditOutgoingDate)}</div>}
        {!item.ditOutgoingNumber && !item.ditOutgoingDate && <span style={{ color: '#cbd5e1' }}>—</span>}
      </div>
      {/* Дата создания */}
      <div style={{ width: COLUMNS[14].width, flexShrink: 0, paddingLeft: 8, paddingRight: 8, borderRight: COLUMN_DIVIDER, fontSize: 12, color: '#94a3b8', fontVariantNumeric: 'tabular-nums', ...centeredCell }}>
        {fmt(item.createdAt)}
      </div>
      {/* Дата выполнения */}
      <div style={{ width: COLUMNS[15].width, flexShrink: 0, paddingLeft: 8, paddingRight: 8, borderRight: COLUMN_DIVIDER, fontSize: 12, color: item.completedAt ? '#059669' : '#94a3b8', fontVariantNumeric: 'tabular-nums', ...centeredCell }}>
        {fmt(item.completedAt)}
      </div>
      {/* Actions */}
      <div style={{ width: COLUMNS[16].width, flexShrink: 0, ...centeredCell }}>
        <RowMenu item={item} onView={onOpen} onArchive={onArchive} onRestore={onRestore} onDelete={onDelete} />
      </div>
    </div>
  )
}

function FunctionModal({
  open, onClose, linkInfo, loading, jiraStatuses,
}: {
  open: boolean
  onClose: () => void
  linkInfo: RequirementGKLinkInfo | null
  loading: boolean
  jiraStatuses: JiraEpicStatusItem[]
}) {
  if (!open) return null
  const cardStyle: React.CSSProperties = {
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    background: '#fff',
    padding: 12,
  }
  const functionTitle = linkInfo?.functionName?.trim() || '—'
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-[14px] flex flex-col" style={{ width: 'min(900px, 92vw)', maxHeight: '86vh', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Функция</div>
          <button type="button" onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: 18, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            <div style={{ color: '#64748b', fontSize: 13 }}>Загрузка данных функции...</div>
          ) : !linkInfo?.hasFunction ? (
            <div style={{ color: '#64748b', fontSize: 13 }}>Функция для записи не найдена.</div>
          ) : (
            <>
              <div style={cardStyle}>
                <div style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Карточка функции</div>
                <div style={{ color: '#0f172a', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{functionTitle}</div>
                <div style={{ color: '#334155', fontSize: 13 }}>
                  НМЦК: <b>{linkInfo.nmckFunctionNumber || '—'}</b> | ТЗ: <b>{linkInfo.tzSectionNumber || '—'}</b>
                </div>
              </div>
              <div style={cardStyle}>
                <div style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Jira</div>
                {linkInfo.jiraLink ? (
                  <a href={linkInfo.jiraLink} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontSize: 13, textDecoration: 'none', wordBreak: 'break-all' }}>
                    {linkInfo.jiraLink}
                  </a>
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: 13 }}>Ссылка Jira не задана</div>
                )}
                {jiraStatuses.length > 0 ? (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {jiraStatuses.map((s) => (
                      <div key={`${s.link}-${s.epicKey || ''}`} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', background: '#f8fafc' }}>
                        <div style={{ fontSize: 12, color: '#0f172a', fontWeight: 600 }}>{s.epicKey || s.link}</div>
                        <div style={{ fontSize: 12, color: '#475569' }}>
                          Статус: {s.status || s.syncStatus || 'unknown'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ marginTop: 8, color: '#94a3b8', fontSize: 12 }}>Статус Jira по API: нет данных</div>
                )}
              </div>
              <div style={cardStyle}>
                <div style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Confluence</div>
                {(linkInfo.confluenceLinks || []).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(linkInfo.confluenceLinks || []).map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontSize: 13, textDecoration: 'none', wordBreak: 'break-all' }}>
                        {url}
                      </a>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: 13 }}>Ссылки Confluence не заданы</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Page component ───────────────────────────────────── */
export function RequirementsPage() {
  /* ── State ── */
  const [items, setItems] = useState<Requirement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchParams] = useSearchParams()
  const systemTab = searchParams.get('system') || ''
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterArchive, setFilterArchive] = useState('active')
  const [onlyWithoutFunction, setOnlyWithoutFunction] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [page, setPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalReq, setModalReq] = useState<Requirement | null>(null)
  const [modalMode, setModalMode] = useState<'view' | 'create'>('view')
  const [functionModalOpen, setFunctionModalOpen] = useState(false)
  const [functionModalLoading, setFunctionModalLoading] = useState(false)
  const [functionModalData, setFunctionModalData] = useState<RequirementGKLinkInfo | null>(null)
  const [functionJiraStatuses, setFunctionJiraStatuses] = useState<JiraEpicStatusItem[]>([])
  const [functionInfoByRequirementId, setFunctionInfoByRequirementId] = useState<Record<number, RequirementGKLinkInfo>>({})
  const tableRef = useRef<HTMLDivElement>(null)

  /* ── Load data ── */
  const load = async () => {
    setLoading(true)
    try {
      const params: RequirementListQuery = {}
      applySystemFilterParams(systemTab, params)
      if (filterStatus) params.status = filterStatus
      if (filterPriority) params.implementationQueue = filterPriority
      if (onlyWithoutFunction) params.noFunction = true
      if (filterArchive === 'all') params.includeArchived = true
      if (filterArchive === 'archived') params.archivedOnly = true
      if (sortOrder === 'asc') params.sortOrder = 'asc'
      const data = await fetchRequirements(params)
      setItems(data)
      setPage(1)
      setSelected(new Set())
    } catch { toast.error('Ошибка загрузки данных') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [systemTab, filterStatus, filterPriority, filterArchive, onlyWithoutFunction, sortOrder]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Derive unique priorities from data ── */
  const priorityOptions = useMemo(() => {
    const dynamic = Array.from(new Set(items.map((r) => r.implementationQueue).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'ru'))
      .map((v) => ({ value: v, label: v }))
    return [{ value: '', label: 'Все' }, ...dynamic]
  }, [items])

  const statusOptions = useMemo(() => {
    const values = ['Новое', 'Требуется обсуждение', 'Подтверждено', 'Учтено', 'Выполнено']
    return [{ value: '', label: 'Все' }, ...values.map((v) => ({ value: v, label: v }))]
  }, [])

  const displayItems = useMemo(
    () => items.filter((item) => matchesSmartSearch(item, search)),
    [items, search],
  )

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(displayItems.length / PAGE_SIZE))
  const pageItems = displayItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  useEffect(() => {
    const idsToLoad = pageItems
      .filter((row) => row.contractTZFunctionId && !functionInfoByRequirementId[row.id])
      .map((row) => row.id)
    if (idsToLoad.length === 0) return
    let cancelled = false
    void (async () => {
      const loaded = await Promise.all(idsToLoad.map(async (id) => {
        try {
          const info = await fetchRequirementGKLink(id)
          return [id, info] as const
        } catch {
          return null
        }
      }))
      if (cancelled) return
      setFunctionInfoByRequirementId((prev) => {
        const next = { ...prev }
        for (const row of loaded) {
          if (!row) continue
          const [id, info] = row
          next[id] = info
        }
        return next
      })
    })()
    return () => { cancelled = true }
  }, [pageItems, functionInfoByRequirementId])

  const pageStart = (page - 1) * PAGE_SIZE + 1
  const pageEnd = Math.min(page * PAGE_SIZE, displayItems.length)

  /* ── Selection ── */
  const toggleSelect = (id: number, checked: boolean) => {
    setSelected(prev => { const s = new Set(prev); checked ? s.add(id) : s.delete(id); return s })
  }
  const allSelected = pageItems.length > 0 && pageItems.every(r => selected.has(r.id))
  const toggleAll = () => {
    if (allSelected) setSelected(prev => { const s = new Set(prev); pageItems.forEach(r => s.delete(r.id)); return s })
    else setSelected(prev => { const s = new Set(prev); pageItems.forEach(r => s.add(r.id)); return s })
  }

  /* ── Row actions ── */
  const openRow = (req: Requirement) => { setModalReq(req); setModalMode('view'); setModalOpen(true) }
  const openCreate = () => { setModalReq(null); setModalMode('create'); setModalOpen(true) }
  const openFunctionModal = async (req: Requirement) => {
    setFunctionModalOpen(true)
    setFunctionModalLoading(true)
    setFunctionModalData(null)
    setFunctionJiraStatuses([])
    try {
      const info = functionInfoByRequirementId[req.id] ?? await fetchRequirementGKLink(req.id)
      setFunctionModalData(info)
      if (info.contractId && info.stageNumber && info.functionId) {
        const statusesByFn = await fetchStageJiraEpicStatuses(info.contractId, info.stageNumber)
        setFunctionJiraStatuses(statusesByFn[info.functionId] || [])
      }
    } catch {
      toast.error('Не удалось загрузить карточку функции')
    } finally {
      setFunctionModalLoading(false)
    }
  }

  const handleArchive = async (id: number) => {
    try { await archiveRequirement(id, 'completed'); toast.success('Архивировано'); load() }
    catch { toast.error('Ошибка') }
  }
  const handleRestore = async (id: number) => {
    try { await restoreRequirement(id); toast.success('Восстановлено'); load() }
    catch { toast.error('Ошибка') }
  }
  const handleDelete = async (id: number) => {
    if (!confirm('Удалить запись?')) return
    try { await deleteRequirement(id); toast.success('Удалено'); load() }
    catch { toast.error('Ошибка') }
  }

  /* ── Bulk actions ── */
  const handleBulkArchive = async () => {
    const ids = Array.from(selected)
    for (const id of ids) { try { await archiveRequirement(id, 'completed') } catch { /* ignore */ } }
    toast.success(`Архивировано: ${ids.length}`)
    setSelected(new Set()); load()
  }
  const handleBulkUnlink = async () => {
    const ids = Array.from(selected)
    for (const id of ids) { try { await unlinkRequirementGK(id) } catch { /* ignore */ } }
    toast.success(`Отвязано: ${ids.length}`)
    setSelected(new Set()); load()
  }
  const handleBulkDelete = async () => {
    if (!confirm(`Удалить ${selected.size} записей?`)) return
    const ids = Array.from(selected)
    for (const id of ids) { try { await deleteRequirement(id) } catch { /* ignore */ } }
    toast.success(`Удалено: ${ids.length}`)
    setSelected(new Set()); load()
  }

  /* ── Export ── */
  const handleExport = async () => {
    try {
      const params: RequirementListQuery = {}
      applySystemFilterParams(systemTab, params)
      if (filterStatus) params.status = filterStatus
      if (filterPriority) params.implementationQueue = filterPriority
      if (onlyWithoutFunction) params.noFunction = true
      if (filterArchive === 'all') params.includeArchived = true
      if (filterArchive === 'archived') params.archivedOnly = true
      const blob = await exportRequirementsFile(params)
      downloadBlob(blob, 'requirements.xlsx')
    } catch { toast.error('Ошибка экспорта') }
  }

  /* ── Table total width ── */
  const tableWidth = CHECKBOX_W + COLUMNS.reduce((s, c) => s + c.width, 0)

  /* ── Active filters count ── */
  const activeFilters = [filterStatus, filterPriority, filterArchive !== 'active' ? filterArchive : '', onlyWithoutFunction ? 'no-func' : ''].filter(Boolean).length
  const resetFilters = () => {
    setFilterStatus('')
    setFilterPriority('')
    setFilterArchive('active')
    setOnlyWithoutFunction(false)
    setSearch('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f0f2f5', overflow: 'hidden' }}>

      {/* ── Header toolbar ── */}
      <div style={{ flexShrink: 0, background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 20px' }}>
        {/* Top row: title + actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
              Реестр предложений
            </h1>
            <RecordCountPopup items={displayItems} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Поиск..."
                style={{ height: 34, paddingLeft: 32, paddingRight: 10, width: 200, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#1e293b', outline: 'none', background: '#f8fafc' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#fff' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc' }}
              />
            </div>

            {/* Add button */}
            <button onClick={openCreate}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 8, background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#2563eb' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#3b82f6' }}>
              <Plus size={15} />Добавить запись
            </button>

            {/* Export */}
            <button onClick={handleExport}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}>
              <Download size={14} />Экспорт
            </button>

          </div>
        </div>

      </div>

      {/* ── Filter bar ── */}
      <div style={{ flexShrink: 0, background: '#fff', borderBottom: '1px solid #f1f5f9', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <SlidersHorizontal size={14} style={{ color: activeFilters > 0 ? '#3b82f6' : '#94a3b8', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginRight: 4 }}>Фильтры:</span>

        <FilterPill label="Приоритет" value={filterPriority} options={priorityOptions} onChange={setFilterPriority} />
        <FilterPill label="Статус" value={filterStatus} options={statusOptions} onChange={setFilterStatus} />
        <FilterPill label="Показать" value={filterArchive}
          options={ARCHIVE_OPTIONS}
          onChange={setFilterArchive} />
        <button
          onClick={() => setOnlyWithoutFunction((v) => !v)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 32,
            padding: '0 10px',
            borderRadius: 8,
            border: `1px solid ${onlyWithoutFunction ? '#93c5fd' : '#e2e8f0'}`,
            background: onlyWithoutFunction ? '#eff6ff' : '#fff',
            color: onlyWithoutFunction ? '#1d4ed8' : '#45556c',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Без функции ГК
        </button>

        {activeFilters > 0 && (
          <button onClick={resetFilters}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 10px', borderRadius: 8, border: 'none', background: 'transparent', color: '#ef4444', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
            <X size={13} />Сбросить
          </button>
        )}
      </div>

      {/* ── Table area ── */}
      <div ref={tableRef} style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {/* Table */}
        <div style={{ minWidth: tableWidth }}>
          {/* Sticky header */}
          <div style={{ position: 'sticky', top: 0, zIndex: 30, background: '#f8fafc', borderBottom: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', minHeight: 40 }}>
            {/* Checkbox all */}
            <div style={{ width: CHECKBOX_W, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: CHECKBOX_LEFT_PAD, boxSizing: 'border-box' }}
              onClick={toggleAll}>
              <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${allSelected ? '#3b82f6' : '#cbd5e1'}`, background: allSelected ? '#3b82f6' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
                {allSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                {!allSelected && selected.size > 0 && pageItems.some(r => selected.has(r.id)) && (
                  <div style={{ width: 8, height: 2, background: '#3b82f6', borderRadius: 1 }} />
                )}
              </div>
            </div>
            {COLUMNS.map(col => (
              <div key={col.key} style={{ width: col.width, flexShrink: 0, paddingLeft: 8, paddingRight: 8, borderRight: col.key === 'actions' ? 'none' : COLUMN_DIVIDER, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4, justifyContent: ['num', 'id', 'initiator', 'priority', 'gk', 'status', 'system', 'created', 'due', 'actions'].includes(col.key) ? 'center' : 'flex-start', textAlign: ['num', 'id', 'initiator', 'priority', 'gk', 'status', 'system', 'created', 'due', 'actions'].includes(col.key) ? 'center' : 'left' }}>
                {col.label}
                {col.key === 'num' && (
                  <button onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: 9 }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Rows */}
          {loading ? (
            <SkeletonRows />
          ) : pageItems.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12 }}>
              <Search size={36} style={{ color: '#cbd5e1' }} />
              <div style={{ fontSize: 14, color: '#94a3b8' }}>Нет записей</div>
              {(search || activeFilters > 0) && (
                <button onClick={resetFilters} style={{ fontSize: 13, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Сбросить фильтры
                </button>
              )}
            </div>
          ) : (
            pageItems.map((item, idx) => (
              <RequirementRow
                key={item.id}
                item={item}
                index={(page - 1) * PAGE_SIZE + idx}
                selected={selected.has(item.id)}
                onSelect={toggleSelect}
                onOpen={() => openRow(item)}
                onArchive={() => handleArchive(item.id)}
                onRestore={() => handleRestore(item.id)}
                onDelete={() => handleDelete(item.id)}
                functionLabel={(() => {
                  const info = functionInfoByRequirementId[item.id]
                  if (info?.hasFunction) {
                    const fn = info.functionName?.trim()
                    return {
                      line1: `НМЦК: ${info.nmckFunctionNumber || '—'} | ТЗ: ${info.tzSectionNumber || '—'}`,
                      line2: fn || undefined,
                    }
                  }
                  if (item.nmckPointText || item.tzPointText) {
                    return {
                      line1: `НМЦК: ${item.nmckPointText || '—'} | ТЗ: ${item.tzPointText || '—'}`,
                    }
                  }
                  return undefined
                })()}
                onOpenFunction={() => openFunctionModal(item)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Pagination ── */}
      {!loading && displayItems.length > 0 && (
        <div style={{ flexShrink: 0, height: 46, background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            Записей {pageStart}–{pageEnd} из {displayItems.length}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: page === 1 ? '#cbd5e1' : '#374151', cursor: page === 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }).map((_, i) => {
              const pg = i + 1
              if (totalPages > 7 && Math.abs(pg - page) > 2 && pg !== 1 && pg !== totalPages) {
                if (pg === 2 && page > 4) return <span key={pg} style={{ padding: '0 2px', color: '#94a3b8', fontSize: 13 }}>…</span>
                if (pg === totalPages - 1 && page < totalPages - 3) return <span key={pg} style={{ padding: '0 2px', color: '#94a3b8', fontSize: 13 }}>…</span>
                if (Math.abs(pg - page) > 2) return null
              }
              return (
                <button key={pg} onClick={() => setPage(pg)}
                  style={{ width: 30, height: 30, borderRadius: 6, border: page === pg ? 'none' : '1px solid #e2e8f0', background: page === pg ? '#3b82f6' : '#fff', color: page === pg ? '#fff' : '#374151', fontWeight: page === pg ? 700 : 400, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {pg}
                </button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: page === totalPages ? '#cbd5e1' : '#374151', cursor: page === totalPages ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Bulk actions bar ── */}
      {selected.size > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 50, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 14, background: '#1e293b', boxShadow: '0 8px 32px rgba(0,0,0,0.25)', color: '#fff', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, paddingRight: 8, borderRight: '1px solid rgba(255,255,255,0.2)' }}>
            Выбрано: {selected.size}
          </span>
          <button onClick={handleBulkArchive} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px', borderRadius: 8, background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 13, border: 'none', cursor: 'pointer' }}>
            <Archive size={14} />Архивировать
          </button>
          <button onClick={handleBulkUnlink} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px', borderRadius: 8, background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 13, border: 'none', cursor: 'pointer' }}>
            <Unlink size={14} />Отвязать ГК
          </button>
          <button onClick={handleBulkDelete} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px', borderRadius: 8, background: 'rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: 13, border: 'none', cursor: 'pointer' }}>
            <Trash2 size={14} />Удалить
          </button>
          <button onClick={() => setSelected(new Set())} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, background: 'rgba(255,255,255,0.1)', color: '#94a3b8', border: 'none', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Proposal modal ── */}
      <ProposalModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        requirement={modalReq}
        mode={modalMode}
        onSaved={load}
      />
      <FunctionModal
        open={functionModalOpen}
        onClose={() => setFunctionModalOpen(false)}
        linkInfo={functionModalData}
        loading={functionModalLoading}
        jiraStatuses={functionJiraStatuses}
      />
    </div>
  )
}
