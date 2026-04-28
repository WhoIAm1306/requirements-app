import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { toast } from 'sonner'
import {
  Archive,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Layers,
  MoreHorizontal,
  PenSquare,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react'
import { fetchContracts } from '@/api/contracts'
import {
  deleteGKAttachment,
  deleteGKContract,
  deleteGKFunction,
  deleteGKStage,
  downloadGKAttachment,
  createGKContract,
  createGKStage,
  fetchGKAttachments,
  fetchGKContractDetails,
  fetchStageJiraEpicStatuses,
  fetchFunctionRequirements,
  bindRequirementsToFunction,
  unbindRequirementsFromFunction,
  upsertGKFunction,
  updateGKContract,
  updateGKStage,
  uploadGKAttachments,
} from '@/api/gkContracts'
import { importGKFunctionsFile } from '@/api/imports'
import { fetchRequirements } from '@/api/requirements'
import { useAuth } from '@/auth/auth-context'
import { downloadBlob } from '@/lib/utils'
import type { ContractAttachmentItem, ContractItem, GKContractDetails, GKFunction, GKStage } from '@/types'

/* ─── Sidebar item ────────────────────────────────────────── */
function SidebarItem({
  contract,
  active,
  onClick,
}: {
  contract: ContractItem
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left transition-all group"
      style={{
        borderBottom: '1px solid #F1F5F9',
        borderLeft: active ? '3px solid #2563EB' : '3px solid transparent',
        background: active ? '#F0F6FF' : '#fff',
        padding: '12px 14px',
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <span
          className="px-1.5 py-0 rounded-md"
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.04em',
            background: active ? '#DBEAFE' : '#F1F5F9',
            color: active ? '#1D4ED8' : '#64748B',
          }}
        >
          ГК
        </span>
        <span style={{ fontSize: 10, color: '#94A3B8' }}>#{contract.id}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: contract.isActive ? '#1F2937' : '#94A3B8', lineHeight: 1.35 }}>
        {contract.name}
      </div>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
          style={{
            fontSize: 10,
            background: (contract.stagesCount ?? 0) > 0 ? '#EFF6FF' : '#F8FAFC',
            color: (contract.stagesCount ?? 0) > 0 ? '#2563EB' : '#CBD5E1',
            fontWeight: 500,
          }}
        >
          <Layers className="w-2.5 h-2.5" />
          {contract.stagesCount ?? 0} эт.
        </span>
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
          style={{
            fontSize: 10,
            background: (contract.functionsCount ?? 0) > 0 ? '#F0FDF4' : '#F8FAFC',
            color: (contract.functionsCount ?? 0) > 0 ? '#16A34A' : '#CBD5E1',
            fontWeight: 500,
          }}
        >
          <Zap className="w-2.5 h-2.5" />
          {contract.functionsCount ?? 0} ф.
        </span>
      </div>
    </button>
  )
}

/* ─── Stat card ───────────────────────────────────────────── */
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string | number
  color: string
  bg: string
}) {
  return (
    <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
          <Icon size={14} className={color} />
        </div>
        <span className="text-[11px] text-slate-500">{label}</span>
      </div>
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
    </div>
  )
}

/* ─── Placeholder ─────────────────────────────────────────── */
function EmptyPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-10">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#EFF6FF,#F5F3FF)', border: '2px solid #BFDBFE' }}>
        <BookOpen className="w-10 h-10" style={{ color: '#93C5FD' }} />
      </div>
      <div className="text-center">
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>Выберите ГК из списка</h3>
        <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 6 }}>
          Нажмите на запись слева, чтобы открыть детали,<br />
          этапы и функции
        </p>
      </div>
    </div>
  )
}

type ConfirmState = {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  danger?: boolean
  onConfirm?: () => Promise<void> | void
}

const secondaryBtnStyle: CSSProperties = {
  height: 32,
  padding: '0 12px',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#fff',
  color: '#45556C',
  fontSize: 13,
  fontWeight: 500,
}

const primaryBtnStyle: CSSProperties = {
  height: 32,
  padding: '0 12px',
  borderRadius: 8,
  border: '1px solid #2563EB',
  background: '#2563EB',
  color: '#fff',
  fontSize: 13,
  fontWeight: 500,
}

const modalOverlayStyle: CSSProperties = {
  background: 'rgba(0,0,0,0.45)',
}

const modalBodyStyle: CSSProperties = {
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
}

const modalSecondaryButtonStyle: CSSProperties = {
  border: '1px solid #e2e8f0',
  color: '#45556C',
  background: '#fff',
}

const modalPrimaryButtonStyle: CSSProperties = {
  background: '#2563EB',
  color: '#fff',
}

function ConfirmActionModal({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  if (!state.open) return null
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={modalOverlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-xl p-6 w-[420px] max-w-[90vw]" style={modalBodyStyle}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: state.danger ? '#FEE2E2' : '#EFF6FF' }}>
            <Trash2 size={16} style={{ color: state.danger ? '#DC2626' : '#2563EB' }} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 mb-1">{state.title}</div>
            {state.description && <div className="text-xs text-slate-500 leading-relaxed">{state.description}</div>}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-lg" style={modalSecondaryButtonStyle}>
            Отмена
          </button>
          <button
            onClick={async () => { await state.onConfirm?.(); onClose() }}
            className="px-4 py-1.5 text-sm rounded-lg text-white"
            style={{ background: state.danger ? '#DC2626' : '#2563EB', color: '#fff' }}
          >
            {state.confirmLabel || 'Подтвердить'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ContractFormModal({
  open, mode, initial, onClose, onSubmit,
}: {
  open: boolean
  mode: 'create' | 'edit'
  initial?: { name: string; number?: string; shortName: string; description: string; useShortNameInTaskId?: boolean; isActive?: boolean }
  onClose: () => void
  onSubmit: (payload: { name: string; number: string; shortName: string; description: string; useShortNameInTaskId: boolean; isActive: boolean }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [shortName, setShortName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [useShortNameInTaskId, setUseShortNameInTaskId] = useState(false)
  useEffect(() => {
    if (!open) return
    setName(initial?.name || '')
    setNumber(initial?.number || '')
    setShortName(initial?.shortName || '')
    setDescription(initial?.description || '')
    setIsActive(initial?.isActive ?? true)
    setUseShortNameInTaskId(Boolean(initial?.useShortNameInTaskId))
  }, [open, initial])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={modalOverlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-[20px] w-[960px] max-w-[96vw] overflow-hidden" style={{ ...modalBodyStyle, boxShadow: '0 30px 80px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.08)' }}>
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#2563EB,#7C3AED)' }} />
        <div className="px-6 py-4 border-b flex items-start justify-between" style={{ borderColor: '#1E293B', background: '#0F172A' }}>
          <div>
            <div className="text-[30px] font-bold mb-1" style={{ fontSize: 30, lineHeight: '27px', color: '#FFFFFF' }}>{mode === 'create' ? 'Создать ГК' : 'Редактировать ГК'}</div>
            <div className="text-xs" style={{ color: '#475569' }}>Заполните основные данные государственного контракта</div>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-[10px] inline-flex items-center justify-center text-slate-400 hover:bg-slate-800">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4" style={{ background: '#FFFFFF' }}>
          <div className="grid gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs" style={{ color: '#64748B' }}>Наименование ГК <span style={{ color: '#EF4444' }}>*</span></label>
              <textarea value={name} onChange={(e) => setName(e.target.value)} placeholder="Полное наименование государственного контракта" className="w-full min-h-[59px] p-3 rounded-[10px] border text-sm" style={{ borderColor: '#DCE3EE' }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs" style={{ color: '#64748B' }}>Краткое наим.</label>
                <input value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="МФЦ" className="w-full h-10 px-3 rounded-[10px] border text-sm" style={{ borderColor: '#DCE3EE' }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs" style={{ color: '#64748B' }}>Код / Номер ГК</label>
                <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="2024-МЦД-001" className="w-full h-10 px-3 rounded-[10px] border text-sm" style={{ borderColor: '#DCE3EE' }} />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs" style={{ color: '#64748B' }}>Статус</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsActive(true)}
                className="h-[46px] rounded-[14px] border flex items-center px-[13px] text-sm"
                style={{ borderColor: isActive ? '#22C55E' : '#DCE3EE', background: isActive ? '#F0FDF4' : '#FFFFFF', color: isActive ? '#15803D' : '#64748B', fontWeight: 500 }}
              >
                ● Активна
              </button>
              <button
                type="button"
                onClick={() => setIsActive(false)}
                className="h-[46px] rounded-[14px] border flex items-center px-[13px] text-sm"
                style={{ borderColor: !isActive ? '#22C55E' : '#DCE3EE', background: !isActive ? '#F0FDF4' : '#FFFFFF', color: !isActive ? '#15803D' : '#64748B' }}
              >
                ○ Архив
              </button>
            </div>
          </div>
          <div className="h-[50px] rounded-[14px] border border-slate-200 bg-slate-50 px-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setUseShortNameInTaskId((v) => !v)}
              className="w-10 h-[22px] rounded-full transition-colors relative"
              style={{ background: useShortNameInTaskId ? '#2563EB' : '#CBD5E1' }}
            >
              <span className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white transition-all shadow" style={{ left: useShortNameInTaskId ? 20 : 2 }} />
            </button>
            <span className="text-sm text-slate-700">Использовать краткое имя в ID предложения</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs" style={{ color: '#64748B' }}>Примечание</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Дополнительная информация о контракте..." className="w-full min-h-[84px] p-3 rounded-[10px] border text-sm" style={{ borderColor: '#CAD7EE' }} />
          </div>
        </div>
        <div className="h-[72px] border-t px-6 flex items-center justify-end gap-2" style={{ borderColor: '#F1F5F9' }}>
          <button onClick={onClose} className="h-[40px] px-[19px] text-sm rounded-[12px]" style={{ border: '1px solid #DCE3EE', color: '#64748B', background: '#fff' }}>Отмена</button>
          <button onClick={async () => { if (!name.trim()) return; await onSubmit({ name: name.trim(), number: number.trim(), shortName: shortName.trim(), description: description.trim(), useShortNameInTaskId, isActive }); onClose() }} className="h-[40px] px-[18px] text-sm rounded-[12px] text-white inline-flex items-center gap-1.5" style={modalPrimaryButtonStyle}>
            <Save size={14} />
            {mode === 'create' ? 'Создать ГК' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StageFormModal({
  open, initial, onClose, onSubmit,
}: {
  open: boolean
  initial?: { stageNumber: number; stageName: string }
  onClose: () => void
  onSubmit: (payload: { stageNumber: number; stageName: string }) => Promise<void>
}) {
  const [stageNumber, setStageNumber] = useState('')
  const [stageName, setStageName] = useState('')
  useEffect(() => {
    if (!open) return
    setStageNumber(initial?.stageNumber ? String(initial.stageNumber) : '')
    setStageName(initial?.stageName || '')
  }, [open, initial])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={modalOverlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-xl p-6 w-[460px] max-w-[92vw]" style={modalBodyStyle}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#EFF6FF' }}>
            <Layers size={16} style={{ color: '#2563EB' }} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 mb-1">{initial ? 'Редактировать этап' : 'Добавить этап'}</div>
            <div className="text-xs text-slate-500">Укажите номер и наименование этапа</div>
          </div>
        </div>
        <div className="space-y-3">
          <input value={stageNumber} onChange={(e) => setStageNumber(e.target.value)} placeholder="Номер этапа" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm" />
          <input value={stageName} onChange={(e) => setStageName(e.target.value)} placeholder="Название этапа" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm" />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-lg" style={modalSecondaryButtonStyle}>Отмена</button>
          <button
            onClick={async () => {
              const num = Number(stageNumber.trim())
              if (!Number.isFinite(num) || !stageName.trim()) return
              await onSubmit({ stageNumber: num, stageName: stageName.trim() })
              onClose()
            }}
            className="px-4 py-1.5 text-sm rounded-lg text-white" style={modalPrimaryButtonStyle}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}

function FunctionFormModal({
  open, initial, onClose, onSubmit,
}: {
  open: boolean
  initial?: {
    id?: number
    stageNumber: number
    functionName: string
    nmckFunctionNumber: string
    tzSectionNumber: string
    jiraLink?: string
    confluenceLinks?: string[]
    jiraEpicLinks?: string[]
  }
  onClose: () => void
  onSubmit: (payload: {
    stageNumber: number
    functionName: string
    nmckFunctionNumber: string
    tzSectionNumber: string
    jiraLink?: string
    confluenceLinks?: string[]
    jiraEpicLinks?: string[]
  }) => Promise<void>
}) {
  const [stageNumber, setStageNumber] = useState('')
  const [functionName, setFunctionName] = useState('')
  const [nmck, setNmck] = useState('')
  const [tz, setTz] = useState('')
  const [jiraDraft, setJiraDraft] = useState('')
  const [jiraEpics, setJiraEpics] = useState<string[]>([])
  const [confluenceDraft, setConfluenceDraft] = useState('')
  const [confluenceLinks, setConfluenceLinks] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setStageNumber(initial?.stageNumber ? String(initial.stageNumber) : '')
    setFunctionName(initial?.functionName || '')
    setNmck(initial?.nmckFunctionNumber || '')
    setTz(initial?.tzSectionNumber || '')
    setJiraDraft('')
    setConfluenceDraft('')
    setJiraEpics(initial?.jiraEpicLinks || [])
    setConfluenceLinks(initial?.confluenceLinks || [])
  }, [open, initial])
  if (!open) return null

  const addUnique = (list: string[], value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return list
    if (list.includes(trimmed)) return list
    return [...list, trimmed]
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={modalOverlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-[512px] max-w-[94vw] overflow-hidden" style={modalBodyStyle}>
        <div className="h-1 w-full" style={{ background: '#2563EB' }} />
        <div className="h-[57px] px-5 border-b flex items-center justify-between" style={{ borderColor: '#F1F5F9' }}>
          <div className="text-[30px] font-semibold" style={{ fontSize: 30, color: '#1F2937', lineHeight: '22px' }}>
            {initial?.id ? 'Редактировать функцию' : 'Добавить функцию'}
          </div>
          <button type="button" onClick={onClose} className="w-6 h-6 rounded-[10px] inline-flex items-center justify-center text-slate-400 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 pt-4 pb-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs" style={{ color: '#64748B' }}>Наименование функции <span style={{ color: '#EF4444' }}>*</span></label>
            <input value={functionName} onChange={(e) => setFunctionName(e.target.value)} placeholder="Модуль авторизации и аутентификации" className="h-[34px] px-3 rounded-[10px] border text-sm" style={{ borderColor: '#DCE3EE' }} />
          </div>
          <div className="h-9 rounded-[10px] border px-3 flex items-center justify-between" style={{ borderColor: '#DCE3EE', background: '#F8FAFC' }}>
            <span className="text-xs" style={{ color: '#64748B' }}>Этап</span>
            <input value={stageNumber} onChange={(e) => setStageNumber(e.target.value)} className="w-20 text-right text-sm bg-transparent outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs" style={{ color: '#64748B' }}>№ НМЦК <span style={{ color: '#EF4444' }}>*</span></label>
              <input
                value={nmck}
                onChange={(e) => setNmck(e.target.value)}
                placeholder="1.1.01"
                className="h-[34px] px-3 rounded-[10px] border text-sm"
                style={{ borderColor: '#DCE3EE' }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs" style={{ color: '#64748B' }}>№ раздела ТЗ <span style={{ color: '#EF4444' }}>*</span></label>
              <input
                value={tz}
                onChange={(e) => setTz(e.target.value)}
                placeholder="3.1.1"
                className="h-[34px] px-3 rounded-[10px] border text-sm"
                style={{ borderColor: '#DCE3EE' }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs" style={{ color: '#64748B' }}>Jira Epics</label>
            <div className="flex gap-2">
              <input
                value={jiraDraft}
                onChange={(e) => setJiraDraft(e.target.value)}
                placeholder="https://jira.example.com/browse/KEY-123"
                className="flex-1 h-[30px] px-[10px] rounded-[10px] border text-xs"
                style={{ borderColor: '#DCE3EE' }}
              />
              <button
                type="button"
                onClick={() => { setJiraEpics((prev) => addUnique(prev, jiraDraft)); setJiraDraft('') }}
                className="w-10 h-[30px] rounded-[10px] border inline-flex items-center justify-center"
                style={{ borderColor: '#BFDBFE', background: '#EFF6FF', color: '#2563EB' }}
              >
                <Plus size={14} />
              </button>
            </div>
            {jiraEpics.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {jiraEpics.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                    {item}
                    <button type="button" onClick={() => setJiraEpics((prev) => prev.filter((x) => x !== item))}><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs" style={{ color: '#64748B' }}>Confluence links</label>
            <div className="flex gap-2">
              <input
                value={confluenceDraft}
                onChange={(e) => setConfluenceDraft(e.target.value)}
                placeholder="https://confluence.example.com/pages/..."
                className="flex-1 h-[30px] px-[10px] rounded-[10px] border text-xs"
                style={{ borderColor: '#DCE3EE' }}
              />
              <button
                type="button"
                onClick={() => { setConfluenceLinks((prev) => addUnique(prev, confluenceDraft)); setConfluenceDraft('') }}
                className="w-10 h-[30px] rounded-[10px] border inline-flex items-center justify-center"
                style={{ borderColor: '#BFDBFE', background: '#EFF6FF', color: '#2563EB' }}
              >
                <Plus size={14} />
              </button>
            </div>
            {confluenceLinks.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {confluenceLinks.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
                    {item}
                    <button type="button" onClick={() => setConfluenceLinks((prev) => prev.filter((x) => x !== item))}><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="h-[71px] border-t px-5 flex items-center justify-end gap-2" style={{ borderColor: '#F1F5F9' }}>
          <button onClick={onClose} className="h-[38px] px-[17px] text-sm rounded-[14px]" style={{ border: '1px solid #DCE3EE', color: '#64748B', background: '#fff' }}>
            Отмена
          </button>
          <button
            onClick={async () => {
              const num = Number(stageNumber.trim())
              if (!Number.isFinite(num) || !functionName.trim()) return
              await onSubmit({
                stageNumber: num,
                functionName: functionName.trim(),
                nmckFunctionNumber: nmck.trim(),
                tzSectionNumber: tz.trim(),
                jiraLink: jiraEpics[0] || undefined,
                confluenceLinks,
                jiraEpicLinks: jiraEpics,
              })
              onClose()
            }}
            className="h-[38px] px-4 text-sm rounded-[14px] text-white inline-flex items-center gap-1.5"
            style={{ background: '#2563EB' }}
          >
            <Save size={14} />
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}

function ImportFunctionsModal({
  open, loading, onClose, onSubmit,
}: {
  open: boolean
  loading: boolean
  onClose: () => void
  onSubmit: (file: File) => Promise<void>
}) {
  const [file, setFile] = useState<File | null>(null)
  useEffect(() => {
    if (open) setFile(null)
  }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={modalOverlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-[560px] max-w-[94vw] overflow-hidden" style={modalBodyStyle}>
        <div className="h-1 w-full" style={{ background: '#2563EB' }} />
        <div className="h-[58px] px-5 border-b flex items-center justify-between" style={{ borderColor: '#F1F5F9' }}>
          <div className="text-lg font-semibold" style={{ color: '#1F2937' }}>
            Импорт функций
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-[10px] inline-flex items-center justify-center text-slate-400 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-slate-500 mb-3">Поддерживается формат Excel `.xlsx`/`.xls`. Импорт применяется к выбранной ГК.</p>
          <label className="block">
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <div
              className="rounded-xl border border-dashed px-4 py-5 cursor-pointer hover:bg-slate-50 transition-colors"
              style={{ borderColor: '#CBD5E1', background: '#F8FAFC' }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-700">
                    {file ? 'Файл выбран' : 'Выберите файл для импорта'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 truncate">
                    {file ? file.name : 'Нажмите, чтобы выбрать Excel файл'}
                  </div>
                </div>
                <span
                  className="h-8 px-3 rounded-lg text-xs inline-flex items-center"
                  style={{ border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB' }}
                >
                  <Upload size={12} className="mr-1.5" />
                  Обзор
                </span>
              </div>
            </div>
          </label>
        </div>
        <div className="h-[64px] border-t px-5 flex items-center justify-end gap-2" style={{ borderColor: '#F1F5F9' }}>
          <button onClick={onClose} disabled={loading} className="h-9 px-4 text-sm rounded-lg" style={modalSecondaryButtonStyle}>Отмена</button>
          <button
            disabled={!file || loading}
            onClick={async () => { if (!file) return; await onSubmit(file); onClose() }}
            className="h-9 px-4 text-sm rounded-lg text-white inline-flex items-center gap-1.5"
            style={{ ...modalPrimaryButtonStyle, opacity: !file || loading ? 0.7 : 1 }}
          >
            <Upload size={14} />
            {loading ? 'Импорт...' : 'Импортировать'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FunctionRequirementsModal({
  open, loading, items, allItems, searchValue, searching, onSearchChange, onClose, onBind, onUnbind,
}: {
  open: boolean
  loading: boolean
  items: Array<{ id: number; taskIdentifier?: string; shortName?: string }>
  allItems: Array<{ id: number; taskIdentifier?: string; shortName?: string; contractTZFunctionId?: number | null }>
  searchValue: string
  searching: boolean
  onSearchChange: (value: string) => void
  onClose: () => void
  onBind: (ids: number[]) => Promise<void>
  onUnbind: (ids: number[]) => Promise<void>
}) {
  const [selectedBindIds, setSelectedBindIds] = useState<number[]>([])
  const [selectedUnbindIds, setSelectedUnbindIds] = useState<number[]>([])
  const boundSet = useMemo(() => new Set(items.map((x) => x.id)), [items])

  const toggleId = (ids: number[], id: number) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])

  const availableRows = useMemo(
    () => allItems.filter((row) => !boundSet.has(row.id)),
    [allItems, boundSet],
  )

  useEffect(() => {
    if (open) {
      setSelectedBindIds([])
      setSelectedUnbindIds([])
    }
  }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={modalOverlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-xl p-6 w-[1040px] max-w-[96vw]" style={modalBodyStyle}>
        <div className="text-sm font-semibold text-slate-900 mb-1">Привязанные предложения</div>
        <p className="text-xs text-slate-500 mb-4">Слева — уже привязанные предложения, справа — поиск и выбор предложений для привязки.</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
            <div className="px-3 py-2 border-b border-slate-100 text-xs font-semibold text-slate-600">Уже привязанные ({items.length})</div>
            <div className="max-h-[360px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="p-3 text-sm text-slate-400">Пока нет привязанных предложений.</div>
              ) : (
                items.map((item) => (
                  <label key={item.id} className="flex items-start gap-2 px-3 py-2 border-b border-slate-100 last:border-b-0 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUnbindIds.includes(item.id)}
                      onChange={() => setSelectedUnbindIds((prev) => toggleId(prev, item.id))}
                    />
                    <div className="min-w-0">
                      <div className="text-xs text-blue-600 font-mono">#{item.id}</div>
                      <div className="text-sm text-slate-700 truncate">{item.taskIdentifier || '—'} - {item.shortName || 'Без названия'}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
            <div className="px-3 py-2 border-t border-slate-100">
              <button
                disabled={loading || selectedUnbindIds.length === 0}
                onClick={async () => {
                  await onUnbind(selectedUnbindIds)
                  setSelectedUnbindIds([])
                }}
                className="h-8 px-3 rounded-lg text-xs text-white"
                style={{ background: '#DC2626', opacity: loading || selectedUnbindIds.length === 0 ? 0.6 : 1 }}
              >
                Отвязать выбранные ({selectedUnbindIds.length})
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
            <div className="px-3 py-2 border-b border-slate-100">
              <div className="text-xs font-semibold text-slate-600 mb-2">Поиск по всем предложениям</div>
              <input
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Введите текст или оставьте пустым для вывода всех"
                className="w-full h-8 px-3 rounded-lg border border-slate-200 text-sm"
              />
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {searching ? (
                <div className="p-3 text-sm text-slate-400">Поиск...</div>
              ) : availableRows.length === 0 ? (
                <div className="p-3 text-sm text-slate-400">Ничего не найдено.</div>
              ) : (
                availableRows.map((item) => (
                  <label key={item.id} className="flex items-start gap-2 px-3 py-2 border-b border-slate-100 last:border-b-0 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBindIds.includes(item.id)}
                      onChange={() => setSelectedBindIds((prev) => toggleId(prev, item.id))}
                    />
                    <div className="min-w-0">
                      <div className="text-xs text-blue-600 font-mono">#{item.id}</div>
                      <div className="text-sm text-slate-700 truncate">{item.taskIdentifier || '—'} - {item.shortName || 'Без названия'}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
            <div className="px-3 py-2 border-t border-slate-100">
              <button
                disabled={loading || selectedBindIds.length === 0}
                onClick={async () => {
                  await onBind(selectedBindIds)
                  setSelectedBindIds([])
                }}
                className="h-8 px-3 rounded-lg text-xs text-white"
                style={{ background: '#2563EB', opacity: loading || selectedBindIds.length === 0 ? 0.6 : 1 }}
              >
                Привязать выбранные ({selectedBindIds.length})
              </button>
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-lg" style={modalSecondaryButtonStyle}>Закрыть</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main page ───────────────────────────────────────────── */
export function GKDirectoryPage() {
  const auth = useAuth()
  const [loading, setLoading] = useState(false)
  const [contracts, setContracts] = useState<ContractItem[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [details, setDetails] = useState<GKContractDetails | null>(null)
  const [attachments, setAttachments] = useState<ContractAttachmentItem[]>([])
  const [tab, setTab] = useState<'main' | 'stages' | 'functions'>('main')
  const [nextTabAfterSelect, setNextTabAfterSelect] = useState<'main' | 'stages' | 'functions' | null>(null)
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [sidebarStatusFilter, setSidebarStatusFilter] = useState<'all' | 'active' | 'archive'>('all')
  const sidebarSort = 'updated' as 'updated' | 'name'
  const [actionMenuOpen, setActionMenuOpen] = useState(false)
  const [contractModal, setContractModal] = useState<{ open: boolean; mode: 'create' | 'edit' }>({ open: false, mode: 'create' })
  const [stageModal, setStageModal] = useState<{ open: boolean; initial?: { stageNumber: number; stageName: string } }>({ open: false })
  const [functionModal, setFunctionModal] = useState<{
    open: boolean
    initial?: {
      id?: number
      stageNumber: number
      functionName: string
      nmckFunctionNumber: string
      tzSectionNumber: string
      jiraLink?: string
      confluenceLinks?: string[]
      jiraEpicLinks?: string[]
    }
  }>({ open: false })
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importingFunctions, setImportingFunctions] = useState(false)
  const [confirmState, setConfirmState] = useState<ConfirmState>({ open: false, title: '' })
  const activeCount = useMemo(() => contracts.filter((c) => c.isActive).length, [contracts])
  const canEditContract = Boolean(auth.canEditGKContract || auth.isSuperuser)
  const canEditStages = Boolean(auth.canEditGKStages || auth.canEditGKContract || auth.isSuperuser)
  const canEditFunctions = Boolean(auth.canEditGKFunctions || auth.isSuperuser)

  async function loadContracts() {
    setLoading(true)
    try { setContracts(await fetchContracts()) }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Ошибка загрузки ГК') }
    finally { setLoading(false) }
  }

  async function loadDetails(id: number) {
    try {
      setDetails(await fetchGKContractDetails(id))
      setAttachments(await fetchGKAttachments(id))
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Ошибка загрузки деталей ГК')
    }
  }

  useEffect(() => { void loadContracts() }, [])
  useEffect(() => {
    if (!selectedId) { setDetails(null); setAttachments([]); return }
    setTab(nextTabAfterSelect ?? 'main')
    if (nextTabAfterSelect) setNextTabAfterSelect(null)
    void loadDetails(selectedId)
  }, [selectedId, nextTabAfterSelect])

  const totalFunctions = useMemo(() => {
    if (!details?.stages?.length) return 0
    return details.stages.reduce((acc, s) => acc + (s.functions?.length || 0), 0)
  }, [details])

  const filteredContracts = useMemo(() => {
    const q = sidebarSearch.trim().toLowerCase()
    let rows = contracts.filter((c) => {
      if (sidebarStatusFilter === 'active' && !c.isActive) return false
      if (sidebarStatusFilter === 'archive' && c.isActive) return false
      if (!q) return true
      return c.name.toLowerCase().includes(q)
    })
    if (sidebarSort === 'name') {
      rows = [...rows].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    } else {
      rows = [...rows].sort((a, b) => (b.id - a.id))
    }
    return rows
  }, [contracts, sidebarSearch, sidebarSort, sidebarStatusFilter])

  const handleCreateContract = async (payload: { name: string; number: string; shortName: string; description: string; useShortNameInTaskId: boolean; isActive: boolean }) => {
    const { name, number, shortName, description, useShortNameInTaskId, isActive } = payload
    try {
      const created = await createGKContract({ name, number, shortName, description, useShortNameInTaskId, isActive })
      toast.success('ГК создана')
      await loadContracts()
      setNextTabAfterSelect('stages')
      setSelectedId(created.id)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Не удалось создать ГК')
    }
  }

  const handleEditContract = async (payload: { name: string; number: string; shortName: string; description: string; useShortNameInTaskId: boolean; isActive: boolean }) => {
    if (!details) return
    const { name, number, shortName, description, useShortNameInTaskId, isActive } = payload
    try {
      await updateGKContract(details.id, {
        name,
        number,
        shortName,
        description,
        useShortNameInTaskId,
        isActive,
      })
      toast.success('ГК обновлена')
      await loadContracts()
      await loadDetails(details.id)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Не удалось обновить ГК')
    }
  }

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 57px)' }}>
      <div className="flex items-center justify-between px-5 h-[52px] border-b flex-shrink-0 bg-white" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex items-center gap-2.5">
          <div className="text-sm font-semibold text-slate-900">Справочник ГК</div>
          <span className="text-[11px]" style={{ color: '#94a3b8' }}>{contracts.length} записей</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5" style={secondaryBtnStyle}>
            <Download className="w-3.5 h-3.5" />
            Экспорт
          </button>
          {canEditContract && (
            <button onClick={() => setContractModal({ open: true, mode: 'create' })} className="inline-flex items-center gap-1.5" style={primaryBtnStyle}>
              + Создать ГК
            </button>
          )}
        </div>
      </div>
      <div
        className="flex overflow-hidden"
        style={{ height: 'calc(100% - 52px)' }}
      >
      {/* ── Sidebar ───────────────────────────────────────── */}
      <aside
        className="flex flex-col bg-white border-r border-slate-200 flex-shrink-0"
        style={{ width: 358 }}
      >
        <div className="px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск ГК..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-7 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
            {sidebarSearch && (
              <button
                onClick={() => setSidebarSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        <div className="px-4 py-2.5 border-b border-slate-100">
          <div className="flex gap-1.5 mb-2">
            {([
              { key: 'all' as const, label: 'Все' },
              { key: 'active' as const, label: '● Активные' },
              { key: 'archive' as const, label: '○ Архив' },
            ]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSidebarStatusFilter(opt.key)}
                className="h-[26.5px] px-[13px] rounded-full text-[11px]"
                style={{ background: sidebarStatusFilter === opt.key ? '#2563EB' : '#F1F5F9', color: sidebarStatusFilter === opt.key ? '#fff' : '#64748B' }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid #F1F5F9', background: '#FAFBFC' }}>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>
            {filteredContracts.length} из {contracts.length}
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ fontSize: 10, background: '#EFF6FF', color: '#2563EB', fontWeight: 600 }}>
            ● {activeCount} активных
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="py-6 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-slate-400">
                <div className="w-3 h-3 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin" />
                Загрузка...
              </div>
            </div>
          )}
          {!loading && !filteredContracts.length && (
            <div className="py-8 text-center text-sm text-slate-400">Ничего не найдено</div>
          )}
          {!loading &&
            filteredContracts.map((c) => (
              <SidebarItem
                key={c.id}
                contract={c}
                active={selectedId === c.id}
                onClick={() => setSelectedId(c.id)}
              />
            ))}
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {!details ? (
          <EmptyPlaceholder />
        ) : (
          <>
            {/* Hero header */}
            <div style={{ background: '#0f172a', flexShrink: 0 }}>
              <div className="px-6 pt-5 pb-4">
                {/* Tags row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: details.isActive ? 'rgba(64,158,255,0.18)' : 'rgba(255,255,255,0.1)',
                        color: details.isActive ? '#66b1ff' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ background: details.isActive ? '#409EFF' : '#64748b' }}
                      />
                      {details.isActive ? 'Активный' : 'Архивный'}
                    </span>
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-medium"
                      style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
                    >
                      №&nbsp;{details.id}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    {auth.canEditGKContract && (
                      <button
                        onClick={() => setContractModal({ open: true, mode: 'edit' })}
                        className="inline-flex items-center gap-1.5"
                        style={primaryBtnStyle}
                      >
                        <PenSquare size={12} />
                        Редактировать
                      </button>
                    )}
                    {auth.canEditGKContract && (
                      <button
                        onClick={() => {
                          setConfirmState({
                            open: true,
                            title: details.isActive ? 'Перенести ГК в архив?' : 'Восстановить ГК?',
                            description: details.name,
                            confirmLabel: details.isActive ? 'В архив' : 'Восстановить',
                            onConfirm: async () => {
                              await updateGKContract(details.id, {
                                name: details.name,
                                number: details.number || '',
                                shortName: details.shortName || '',
                                description: details.description || '',
                                useShortNameInTaskId: Boolean(details.useShortNameInTaskId),
                                isActive: !details.isActive,
                              })
                              await loadContracts()
                              await loadDetails(details.id)
                            },
                          })
                        }}
                        className="inline-flex items-center gap-1.5"
                        style={primaryBtnStyle}
                      >
                        {details.isActive
                          ? <><Archive size={12} />В архив</>
                          : <><RotateCcw size={12} />Восстановить</>
                        }
                      </button>
                    )}

                    {auth.isSuperuser && (
                      <div className="relative">
                        <button
                          onClick={() => setActionMenuOpen((p) => !p)}
                          className="h-8 px-3 rounded-lg inline-flex items-center justify-center transition-all"
                          style={{
                            border: '1px solid #2563EB',
                            color: '#fff',
                            background: '#2563EB',
                          }}
                        >
                          <MoreHorizontal size={14} />
                        </button>
                        {actionMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setActionMenuOpen(false)} />
                            <div className="absolute right-0 top-full mt-1 z-30 w-40 rounded-xl bg-white border border-slate-200 shadow-xl py-1 overflow-hidden">
                              <button
                                onClick={() => {
                                  setActionMenuOpen(false)
                                  setConfirmState({
                                    open: true,
                                    title: 'Удалить ГК?',
                                    description: `Действие необратимо: ${details.name}`,
                                    confirmLabel: 'Удалить',
                                    danger: true,
                                    onConfirm: async () => {
                                      await deleteGKContract(details.id)
                                      setSelectedId(null)
                                      await loadContracts()
                                    },
                                  })
                                }}
                                className="flex w-full items-center gap-2.5 px-3.5 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4 opacity-70" />
                                Удалить
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                  {details.name}
                </h2>
                {details.description && (
                  <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {details.description}
                  </p>
                )}
              </div>

              {/* Tabs */}
              <div className="flex px-6 gap-0" style={{ borderTop: '1px solid #1E293B' }}>
                {(
                  [
                    { value: 'main', label: 'Основное' },
                    { value: 'stages', label: `Этапы (${details.stages.length})` },
                    { value: 'functions', label: `Функции (${totalFunctions})` },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTab(t.value)}
                    className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
                    style={{
                      borderColor: tab === t.value ? '#409EFF' : 'transparent',
                      color: tab === t.value ? '#60A5FA' : '#64748B',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-2 px-6 py-3 flex-shrink-0">
              <StatCard icon={Layers} label="Этапов" value={details.stages.length} color="#409EFF" bg="#ECF5FF" />
              <StatCard icon={Zap} label="Функций" value={totalFunctions} color="#337ECC" bg="#D9ECFF" />
              <StatCard
                icon={FileText}
                label="Короткое имя"
                value={details.shortName || '—'}
                color="#67C23A"
                bg="#F0F9EB"
              />
              <StatCard
                icon={BookOpen}
                label="Создан"
                value={new Date(details.createdAt).toLocaleDateString('ru-RU')}
                color="#909399"
                bg="#F4F4F5"
              />
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {tab === 'main' && (
                <MainTab
                  details={details}
                  attachments={attachments}
                  canEdit={auth.canEditGKFunctions}
                  canDelete={auth.isSuperuser}
                  selectedId={selectedId}
                  onAttachmentsChange={async () => {
                    if (selectedId) setAttachments(await fetchGKAttachments(selectedId))
                  }}
                />
              )}
              {tab === 'stages' && (
                <StagesTab
                  details={details}
                  canEdit={canEditStages}
                  onCreate={async (payload) => {
                    try {
                      await createGKStage(details.id, payload)
                      toast.success('Этап добавлен')
                      await loadContracts()
                      await loadDetails(details.id)
                    } catch (error: any) {
                      toast.error(error?.response?.data?.message || 'Не удалось сохранить этап')
                    }
                  }}
                  onEdit={(stage) => setStageModal({ open: true, initial: { stageNumber: stage.stageNumber, stageName: stage.stageName || '' } })}
                  onDelete={(stage) => {
                    setConfirmState({
                      open: true,
                      title: `Удалить этап ${stage.stageNumber}?`,
                      description: 'Все привязанные функции этапа тоже будут удалены.',
                      confirmLabel: 'Удалить',
                      danger: true,
                      onConfirm: async () => {
                        await deleteGKStage(details.id, stage.stageNumber)
                        toast.success('Этап удален')
                        await loadContracts()
                        await loadDetails(details.id)
                      },
                    })
                  }}
                />
              )}
              {tab === 'functions' && (
                <FunctionsTab
                  details={details}
                  canEdit={canEditFunctions}
                  onImport={() => setImportModalOpen(true)}
                  onCreate={(stageNumber) => setFunctionModal({ open: true, initial: { stageNumber, functionName: '', nmckFunctionNumber: '', tzSectionNumber: '', jiraLink: '' } })}
                  onEdit={(fn, stageNumber) => setFunctionModal({ open: true, initial: { id: fn.id, stageNumber, functionName: fn.functionName || '', nmckFunctionNumber: fn.nmckFunctionNumber || '', tzSectionNumber: fn.tzSectionNumber || '', jiraLink: fn.jiraLink || '', confluenceLinks: fn.confluenceLinks || [], jiraEpicLinks: fn.jiraEpicLinks || [] } })}
                  onDelete={(fn) => {
                    setConfirmState({
                      open: true,
                      title: 'Удалить функцию?',
                      description: fn.functionName || `ID: ${fn.id}`,
                      confirmLabel: 'Удалить',
                      danger: true,
                      onConfirm: async () => {
                        await deleteGKFunction(details.id, fn.id)
                        toast.success('Функция удалена')
                        await loadContracts()
                        await loadDetails(details.id)
                      },
                    })
                  }}
                />
              )}
            </div>
          </>
        )}
      </div>
      </div>
      <ContractFormModal
        open={contractModal.open}
        mode={contractModal.mode}
        initial={contractModal.mode === 'edit' && details ? { name: details.name || '', number: details.number || '', shortName: details.shortName || '', description: details.description || '', useShortNameInTaskId: Boolean(details.useShortNameInTaskId), isActive: Boolean(details.isActive) } : undefined}
        onClose={() => setContractModal((prev) => ({ ...prev, open: false }))}
        onSubmit={async (payload) => {
          if (contractModal.mode === 'create') await handleCreateContract(payload)
          else await handleEditContract(payload)
        }}
      />
      <StageFormModal
        open={stageModal.open}
        initial={stageModal.initial}
        onClose={() => setStageModal({ open: false })}
        onSubmit={async (payload) => {
          if (!details) return
          try {
            if (stageModal.initial) {
              await updateGKStage(details.id, stageModal.initial.stageNumber, payload.stageName)
              toast.success('Этап обновлен')
            } else {
              await createGKStage(details.id, payload)
              toast.success('Этап добавлен')
            }
            await loadContracts()
            await loadDetails(details.id)
          } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Не удалось сохранить этап')
          }
        }}
      />
      <FunctionFormModal
        open={functionModal.open}
        initial={functionModal.initial}
        onClose={() => setFunctionModal({ open: false })}
        onSubmit={async (payload) => {
          if (!details) return
          try {
            await upsertGKFunction(details.id, payload)
            toast.success(functionModal.initial?.id ? 'Функция обновлена' : 'Функция добавлена')
            await loadContracts()
            await loadDetails(details.id)
          } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Не удалось сохранить функцию')
          }
        }}
      />
      <ImportFunctionsModal
        open={importModalOpen}
        loading={importingFunctions}
        onClose={() => { if (!importingFunctions) setImportModalOpen(false) }}
        onSubmit={async (file) => {
          if (!details) return
          setImportingFunctions(true)
          try {
            const result = await importGKFunctionsFile(file, details.id)
            toast.success(`Импорт: создано ${result.created}, обновлено ${result.updated}, ошибок ${result.failed}`)
            await loadContracts()
            await loadDetails(details.id)
          } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Не удалось импортировать функции')
          } finally {
            setImportingFunctions(false)
          }
        }}
      />
      <ConfirmActionModal state={confirmState} onClose={() => setConfirmState({ open: false, title: '' })} />
    </div>
  )
}

/* ─── Main tab ────────────────────────────────────────────── */
function MainTab({
  details,
  attachments,
  canEdit,
  canDelete,
  selectedId,
  onAttachmentsChange,
}: {
  details: GKContractDetails
  attachments: ContractAttachmentItem[]
  canEdit: boolean
  canDelete: boolean
  selectedId: number | null
  onAttachmentsChange: () => Promise<void>
}) {
  return (
    <div className="space-y-4">
      {/* Info */}
      {details.description && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Описание</h4>
          <p className="text-sm text-slate-600 leading-relaxed">{details.description}</p>
        </div>
      )}

      {/* Attachments */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid #EBEEF5' }}
        >
          <span className="text-sm font-semibold text-slate-800">Файлы ТЗ и НМЦК</span>
        </div>
        <div className="p-4 grid md:grid-cols-2 gap-4">
          <AttachmentSection
            title="ТЗ"
            items={attachments.filter((x) => x.type === 'tz')}
            canEdit={canEdit}
            canDelete={canDelete}
            onUpload={async (files) => {
              if (!selectedId) return
              await uploadGKAttachments(selectedId, 'tz', files)
              await onAttachmentsChange()
            }}
            onDelete={async (id) => {
              await deleteGKAttachment(id)
              await onAttachmentsChange()
            }}
          />
          <AttachmentSection
            title="НМЦК"
            items={attachments.filter((x) => x.type === 'nmck')}
            canEdit={canEdit}
            canDelete={canDelete}
            onUpload={async (files) => {
              if (!selectedId) return
              await uploadGKAttachments(selectedId, 'nmck', files)
              await onAttachmentsChange()
            }}
            onDelete={async (id) => {
              await deleteGKAttachment(id)
              await onAttachmentsChange()
            }}
          />
        </div>
      </div>
    </div>
  )
}

/* ─── Stages tab ──────────────────────────────────────────── */
function StagesTab({
  details, canEdit, onCreate, onEdit, onDelete,
}: {
  details: GKContractDetails
  canEdit: boolean
  onCreate: (payload: { stageNumber: number; stageName: string; comment?: string }) => Promise<void>
  onEdit: (stage: GKStage) => void
  onDelete: (stage: GKStage) => void
}) {
  const [stageNumberInput, setStageNumberInput] = useState('')
  const [stageNameInput, setStageNameInput] = useState('')
  const [stageCommentInput, setStageCommentInput] = useState('')
  const [savingInline, setSavingInline] = useState(false)
  const [isAddingStage, setIsAddingStage] = useState(false)
  const hasStages = details.stages.length > 0

  const resetForm = () => {
    setStageNumberInput('')
    setStageNameInput('')
    setStageCommentInput('')
  }

  const handleInlineSave = async () => {
    const stageNumber = Number(stageNumberInput.trim())
    const stageName = stageNameInput.trim()
    if (!Number.isFinite(stageNumber) || stageNumber <= 0) {
      toast.error('Введите корректный номер этапа')
      return
    }
    if (!stageName) {
      toast.error('Введите наименование этапа')
      return
    }
    setSavingInline(true)
    try {
      await onCreate({ stageNumber, stageName, comment: stageCommentInput.trim() || undefined })
      resetForm()
      setIsAddingStage(false)
    } finally {
      setSavingInline(false)
    }
  }

  const renderAddButton = () => (
    <button
      onClick={() => setIsAddingStage(true)}
      className="h-8 px-3 rounded-[10px] text-xs inline-flex items-center gap-1.5"
      style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#2563EB' }}
    >
      <Plus size={12} />
      Добавить этап
    </button>
  )

  const renderInlineForm = () => (
    <div
      className="rounded-2xl border p-4"
      style={{ background: '#EFF6FF', borderColor: '#BFDBFE' }}
    >
      <div className="grid gap-3">
        <div className="grid gap-3" style={{ gridTemplateColumns: '80px 1fr' }}>
          <div>
            <label className="text-[10px] font-semibold" style={{ color: '#2563EB' }}>№ <span style={{ color: '#EF4444' }}>*</span></label>
            <input
              value={stageNumberInput}
              onChange={(e) => setStageNumberInput(e.target.value)}
              className="mt-1 w-full h-9 rounded-[10px] border px-3 text-sm"
              style={{ borderColor: '#DCE3EE', background: '#fff' }}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold" style={{ color: '#2563EB' }}>Наименование <span style={{ color: '#EF4444' }}>*</span></label>
            <input
              value={stageNameInput}
              onChange={(e) => setStageNameInput(e.target.value)}
              placeholder="Разработка и тестирование"
              className="mt-1 w-full h-9 rounded-[10px] border px-3 text-sm"
              style={{ borderColor: '#D7DFEE', background: '#fff' }}
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-semibold" style={{ color: '#2563EB' }}>Комментарий</label>
          <input
            value={stageCommentInput}
            onChange={(e) => setStageCommentInput(e.target.value)}
            placeholder="Необязательный комментарий"
            className="mt-1 w-full h-9 rounded-[10px] border px-3 text-sm"
            style={{ borderColor: '#DCE3EE', background: '#fff' }}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => { resetForm(); setIsAddingStage(false) }}
            disabled={savingInline}
            className="h-8 px-3 rounded-[10px] text-xs"
            style={{ border: '1px solid #DCE3EE', color: '#64748B', background: '#fff' }}
          >
            Отмена
          </button>
          <button
            onClick={handleInlineSave}
            disabled={savingInline}
            className="h-8 px-3 rounded-[10px] text-xs text-white inline-flex items-center gap-1.5"
            style={{ border: '1px solid #2563EB', background: '#2563EB', opacity: savingInline ? 0.7 : 1 }}
          >
            <Save size={12} />
            {savingInline ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )

  const renderStagesTable = () => (
    <div className="bg-white rounded-2xl border border-slate-300 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: '2px solid #DCE3EE', background: '#F8FAFC' }}>
            {['№', 'Наименование', 'Комментарий', 'Функций', 'Порядок'].map((h) => (
              <th key={h} className="px-4 py-2 text-left text-[10px] uppercase tracking-[0.05em]" style={{ color: '#64748B', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {details.stages.map((s) => (
            <tr key={s.id} style={{ borderBottom: '1px solid #F8FAFC', height: 49 }}>
              <td className="px-4 py-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-[10px] text-white text-xs font-bold" style={{ background: '#2563EB' }}>
                  {s.stageNumber}
                </span>
              </td>
              <td className="px-4 py-2 text-xs text-slate-800">{s.stageName || `Этап ${s.stageNumber}`}</td>
              <td className="px-4 py-2 text-xs text-slate-400">—</td>
              <td className="px-4 py-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                  {(s.functions || []).length}
                </span>
              </td>
              <td className="px-4 py-2">
                {canEdit && (
                  <div className="flex items-center gap-2 text-xs">
                    <button onClick={() => onEdit(s)} style={{ color: '#94A3B8' }}>↑</button>
                    <button onClick={() => onDelete(s)} style={{ color: '#94A3B8' }}>↓</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="text-[11px]" style={{ color: '#94A3B8' }}>
        Этапов: <span style={{ color: '#1F2937', fontWeight: 600 }}>{details.stages.length}</span>
      </div>

      {!hasStages && !isAddingStage && (
        <>
          {canEdit && <div className="flex justify-end">{renderAddButton()}</div>}
          <div
            className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3"
            style={{ borderColor: '#DCE3EE', background: '#F8FAFC', minHeight: 274 }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#EFF6FF' }}>
              <Layers size={24} style={{ color: '#60A5FA' }} />
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-slate-800">Этапы не добавлены</div>
              <div className="text-xs text-slate-400">Создайте первый этап этой ГК</div>
            </div>
            {canEdit && renderAddButton()}
          </div>
        </>
      )}

      {!hasStages && isAddingStage && canEdit && renderInlineForm()}

      {hasStages && !isAddingStage && (
        <>
          {canEdit && <div className="flex justify-end">{renderAddButton()}</div>}
          {renderStagesTable()}
        </>
      )}

      {hasStages && isAddingStage && (
        <>
          {canEdit && renderInlineForm()}
          {renderStagesTable()}
        </>
      )}
    </div>
  )
}

/* ─── Functions tab ───────────────────────────────────────── */
function FunctionsTab({
  details, canEdit, onImport, onCreate, onEdit, onDelete,
}: {
  details: GKContractDetails
  canEdit: boolean
  onImport: () => void
  onCreate: (stageNumber: number) => void
  onEdit: (fn: GKFunction, stageNumber: number) => void
  onDelete: (fn: GKFunction) => void
}) {
  const stageRows = details.stages
    .map((stage) => ({ stage, functions: stage.functions || [] }))
    .sort((a, b) => a.stage.stageNumber - b.stage.stageNumber)
  const [selectedStageNumber, setSelectedStageNumber] = useState<number>(stageRows[0]?.stage.stageNumber || 0)
  const selectedStage = stageRows.find((x) => x.stage.stageNumber === selectedStageNumber)?.stage ?? stageRows[0]?.stage
  const selectedFunctions = useMemo(
    () => [...(selectedStage?.functions || [])].sort((a, b) => a.id - b.id),
    [selectedStage],
  )
  const columnCount = 4
  const rowsPerColumn = Math.ceil(selectedFunctions.length / columnCount)
  const functionColumns = Array.from({ length: columnCount }, (_, colIdx) =>
    selectedFunctions.slice(colIdx * rowsPerColumn, (colIdx + 1) * rowsPerColumn),
  )
  const [expandedFnId, setExpandedFnId] = useState<number | null>(selectedFunctions[0]?.id ?? null)
  const [requirementsByFn, setRequirementsByFn] = useState<Record<number, Array<{ id: number; taskIdentifier?: string; shortName?: string }>>>({})
  const [epicStatusesByFn, setEpicStatusesByFn] = useState<Record<number, Array<{
    link: string
    epicKey?: string
    summary?: string
    status?: string
    statusCategory?: string
    syncStatus: string
    error?: string
  }>>>({})
  const [relationModal, setRelationModal] = useState<{ open: boolean; fn: GKFunction | null }>({ open: false, fn: null })
  const [relationLoading, setRelationLoading] = useState(false)
  const [allRequirements, setAllRequirements] = useState<Array<{ id: number; taskIdentifier?: string; shortName?: string; contractTZFunctionId?: number | null }>>([])
  const [requirementsSearch, setRequirementsSearch] = useState('')
  const [requirementsSearching, setRequirementsSearching] = useState(false)
  const statusStripColors = ['#CBD5E1', '#7DD3FC', '#60A5FA', '#4ADE80']

  const loadFunctionRequirements = async (fn: GKFunction) => {
    try {
      const rows = await fetchFunctionRequirements(details.id, fn.id)
      setRequirementsByFn((prev) => ({
        ...prev,
        [fn.id]: rows.map((r) => ({ id: r.id, taskIdentifier: r.taskIdentifier, shortName: r.shortName })),
      }))
    } catch {
      toast.error('Не удалось загрузить связанные предложения')
    }
  }

  useEffect(() => {
    const fn = selectedFunctions.find((item) => item.id === expandedFnId)
    if (!fn) return
    if (requirementsByFn[fn.id]) return
    void loadFunctionRequirements(fn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedFnId, selectedFunctions])

  useEffect(() => {
    if (!selectedStage) {
      setEpicStatusesByFn({})
      return
    }
    ;(async () => {
      try {
        const statuses = await fetchStageJiraEpicStatuses(details.id, selectedStage.stageNumber)
        setEpicStatusesByFn(statuses as Record<number, Array<{
          link: string
          epicKey?: string
          summary?: string
          status?: string
          statusCategory?: string
          syncStatus: string
          error?: string
        }>>)
      } catch {
        setEpicStatusesByFn({})
      }
    })()
  }, [details.id, selectedStage?.stageNumber])

  useEffect(() => {
    if (!relationModal.open || !relationModal.fn) return
    let cancelled = false
    ;(async () => {
      try {
        setRequirementsSearching(true)
        const rows = await fetchRequirements(requirementsSearch.trim() ? { search: requirementsSearch.trim() } : undefined)
        if (cancelled) return
        setAllRequirements(rows.map((r) => ({
          id: r.id,
          taskIdentifier: r.taskIdentifier,
          shortName: r.shortName,
          contractTZFunctionId: r.contractTZFunctionId,
        })))
      } catch {
        if (!cancelled) {
          setAllRequirements([])
          toast.error('Не удалось загрузить предложения для привязки')
        }
      } finally {
        if (!cancelled) setRequirementsSearching(false)
      }
    })()
    return () => { cancelled = true }
  }, [relationModal.open, relationModal.fn?.id, requirementsSearch])

  const getSingleEpicStatusVisual = (epic: { syncStatus: string; statusCategory?: string }) => {
    const category = (epic.statusCategory || '').toLowerCase()
    if (epic.syncStatus === 'error') return { label: 'Серый', bg: '#F1F5F9', color: '#64748B' }
    if (category.includes('done') || category.includes('готов') || category.includes('выполн')) {
      return { label: 'Зелёный', bg: '#F0FDF4', color: '#16A34A' }
    }
    if (category.includes('progress') || category.includes('работ') || category.includes('разраб')) {
      return { label: 'Синий', bg: '#DBEAFE', color: '#1D4ED8' }
    }
    if (category.includes('to do') || category.includes('todo') || category.includes('к выполн') || category.includes('new')
      || epic.syncStatus === 'planned') {
      return { label: 'Голубой', bg: '#E0F2FE', color: '#0284C7' }
    }
    if (epic.syncStatus === 'synced') return { label: 'Синий', bg: '#DBEAFE', color: '#1D4ED8' }
    return { label: 'Серый', bg: '#F1F5F9', color: '#64748B' }
  }

  const getSingleEpicStatusLevel = (epic: { syncStatus: string; statusCategory?: string }) => {
    const category = (epic.statusCategory || '').toLowerCase()
    if (epic.syncStatus === 'error') return 0
    if (category.includes('done') || category.includes('готов') || category.includes('выполн')) return 3
    if (category.includes('progress') || category.includes('работ') || category.includes('разраб')) return 2
    if (
      category.includes('to do') ||
      category.includes('todo') ||
      category.includes('к выполн') ||
      category.includes('new') ||
      epic.syncStatus === 'planned'
    ) return 1
    if (epic.syncStatus === 'synced') return 2
    return 0
  }

  const getEpicStatusVisual = (fnId: number) => {
    const epics = epicStatusesByFn[fnId] || []
    if (epics.length === 0) return { label: 'Серый', bg: '#F1F5F9', color: '#64748B' }
    if (epics.some((x) => x.syncStatus === 'error')) return { label: 'Серый', bg: '#F1F5F9', color: '#64748B' }

    const categories = epics.map((x) => (x.statusCategory || '').toLowerCase())
    const isDone = categories.length > 0 && categories.every((x) => x.includes('done') || x.includes('готов') || x.includes('выполн'))
    if (isDone) return { label: 'Зелёный', bg: '#F0FDF4', color: '#16A34A' }

    if (categories.some((x) => x.includes('progress') || x.includes('работ') || x.includes('разраб'))) {
      return { label: 'Синий', bg: '#DBEAFE', color: '#1D4ED8' }
    }

    if (categories.some((x) => x.includes('to do') || x.includes('todo') || x.includes('к выполн') || x.includes('new'))
      || epics.some((x) => x.syncStatus === 'planned')) {
      return { label: 'Голубой', bg: '#E0F2FE', color: '#0284C7' }
    }

    if (epics.some((x) => x.syncStatus === 'synced')) {
      return { label: 'Синий', bg: '#DBEAFE', color: '#1D4ED8' }
    }
    return { label: 'Серый', bg: '#F1F5F9', color: '#64748B' }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-[0.06em] mb-2" style={{ color: '#94A3B8', fontWeight: 600 }}>
            Выберите этап
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {stageRows.map(({ stage, functions }) => {
              const active = selectedStage?.stageNumber === stage.stageNumber
              return (
                <button
                  key={stage.id}
                  onClick={() => {
                    setSelectedStageNumber(stage.stageNumber)
                    setExpandedFnId(functions[0]?.id ?? null)
                  }}
                  className="h-[34px] px-[13px] rounded-[14px] inline-flex items-center gap-[6px] text-xs"
                  style={{
                    border: `1px solid ${active ? '#2563EB' : '#DCE3EE'}`,
                    background: active ? '#2563EB' : '#fff',
                    color: active ? '#fff' : '#64748B',
                  }}
                >
                  <span className="w-5 h-5 rounded-[8px] inline-flex items-center justify-center text-[10px] font-bold" style={{ background: active ? 'rgba(255,255,255,0.2)' : '#F1F5F9', color: active ? '#fff' : '#64748B' }}>
                    {stage.stageNumber}
                  </span>
                  <span>{stage.stageName || `Этап ${stage.stageNumber}`}</span>
                  <span className="px-1.5 h-[15px] rounded-full inline-flex items-center text-[10px] font-semibold" style={{ background: active ? 'rgba(255,255,255,0.25)' : '#EFF6FF', color: active ? '#fff' : '#2563EB' }}>
                    {functions.length}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: '#F1F5F9' }} />

      <div className="flex items-center justify-between">
        <div className="text-sm" style={{ color: '#1F2937', fontWeight: 600 }}>
          {selectedFunctions.length} <span style={{ color: '#64748B', fontWeight: 400 }}>функций</span>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (selectedStage) onCreate(selectedStage.stageNumber) }}
              className="inline-flex items-center"
              style={primaryBtnStyle}
            >
              + Добавить функцию
            </button>
            <button onClick={onImport} className="inline-flex items-center" style={primaryBtnStyle}>
              Импорт функций
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="grid grid-cols-4 gap-2 min-w-[1280px]">
          {functionColumns.map((column, columnIndex) => (
            <div key={`fn-col-${columnIndex}`} className="flex flex-col gap-2">
            {column.map((fn) => {
          const expanded = expandedFnId === fn.id
          const jiraLinks = (fn.jiraEpicLinks || []).filter(Boolean)
          const confLinks = (fn.confluenceLinks || []).filter(Boolean)
          const epicStatus = getEpicStatusVisual(fn.id)
          return (
            <div key={fn.id} className="rounded-[16px] border bg-white overflow-hidden" style={{ borderColor: expanded ? '#2563EB' : '#DCE3EE' }}>
              <div
                className="h-[112px] px-4 py-3 flex items-center gap-3 cursor-pointer"
                onClick={() => setExpandedFnId(expanded ? null : fn.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span
                      className="text-sm font-medium text-slate-800"
                      style={{
                        whiteSpace: 'normal',
                        overflowWrap: 'anywhere',
                        lineHeight: 1.35,
                        display: expanded ? 'block' : '-webkit-box',
                        WebkitLineClamp: expanded ? 'unset' : 2,
                        WebkitBoxOrient: expanded ? 'unset' : 'vertical',
                        overflow: expanded ? 'visible' : 'hidden',
                      }}
                    >
                      {fn.functionName}
                    </span>
                    <span className="px-2 py-0.5 rounded-[8px] text-[11px]" style={{ background: '#EFF6FF', color: '#2563EB' }}>Jira: {jiraLinks.length}</span>
                    <span className="px-2 py-0.5 rounded-[8px] text-[11px]" style={{ background: '#F5F3FF', color: '#7C3AED' }}>Conf: {confLinks.length}</span>
                    <span className="px-2 py-0.5 rounded-[8px] text-[11px]" style={{ background: epicStatus.bg, color: epicStatus.color }}>
                      Epic: {epicStatus.label}
                    </span>
                  </div>
                  <div className="text-xs mt-1.5" style={{ color: '#94A3B8' }}>
                    НМЦК: <span style={{ color: '#2563EB', fontFamily: 'Consolas, monospace' }}>{fn.nmckFunctionNumber || '—'}</span>
                    {'  '}ТЗ: <span style={{ color: '#7C3AED', fontFamily: 'Consolas, monospace' }}>{fn.tzSectionNumber || '—'}</span>
                  </div>
                </div>
                <div className="text-xs" style={{ color: '#CBD5E1' }}>{new Date(fn.updatedAt).toLocaleDateString('ru-RU')}</div>
                {canEdit && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (selectedStage) onEdit(fn, selectedStage.stageNumber)
                      }}
                      className="w-[32px] h-[32px] rounded-[10px] inline-flex items-center justify-center border"
                      style={{ color: '#64748B', borderColor: '#E2E8F0', background: '#fff' }}
                      title="Редактировать функцию"
                    >
                      <PenSquare size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(fn)
                      }}
                      className="w-[32px] h-[32px] rounded-[10px] inline-flex items-center justify-center border"
                      style={{ color: '#DC2626', borderColor: '#FECACA', background: '#fff' }}
                      title="Удалить функцию"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpandedFnId(expanded ? null : fn.id)
                  }}
                  className="w-[28px] h-[28px] inline-flex items-center justify-center rounded-md border"
                  style={{ color: '#64748B', borderColor: '#E2E8F0', background: '#fff' }}
                  title={expanded ? 'Свернуть' : 'Развернуть'}
                >
                  {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              </div>
              {expanded && (
                <div className="px-3 py-3 border-t" style={{ background: '#FAFBFC', borderColor: '#F1F5F9' }}>
                  <div className="text-[10px] uppercase tracking-[0.05em] mb-2" style={{ color: '#64748B', fontWeight: 600 }}>Jira Epics</div>
                  {(epicStatusesByFn[fn.id] || []).length > 0 ? (
                    <div className="flex flex-col gap-2 mb-3">
                      {(epicStatusesByFn[fn.id] || []).map((epic) => {
                        const epicVisual = getSingleEpicStatusVisual(epic)
                        const epicLevel = getSingleEpicStatusLevel(epic)
                        return (
                          <div
                            key={`${epic.link}-${epic.epicKey || ''}`}
                            className="rounded-[10px] border px-2.5 py-2.5"
                            style={{ borderColor: '#CBD5E1', background: '#fff', minHeight: 94 }}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <a href={epic.link} target="_blank" rel="noreferrer" className="text-xs truncate" style={{ color: '#2563EB', fontWeight: 600 }}>
                                {epic.epicKey || epic.link}
                              </a>
                              <span className="px-1.5 py-0.5 rounded-[8px] text-[11px] flex-shrink-0" style={{ background: epicVisual.bg, color: epicVisual.color }}>
                                {epicVisual.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mb-1.5">
                              {statusStripColors.map((color, index) => (
                                <span
                                  key={`${epic.link}-${color}`}
                                  className="inline-block h-1.5 flex-1 rounded-full"
                                  style={{ background: color, opacity: index <= epicLevel ? 1 : 0.25 }}
                                />
                              ))}
                            </div>
                            {epic.summary && (
                              <div className="text-xs" style={{ color: '#334155', lineHeight: 1.35 }}>{epic.summary}</div>
                            )}
                            {epic.status && (
                              <div className="text-[11px] mt-1" style={{ color: '#64748B' }}>Статус: {epic.status}</div>
                            )}
                            {epic.error && (
                              <div className="text-[11px] mt-1" style={{ color: '#DC2626' }}>{epic.error}</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : jiraLinks.length > 0 ? (
                    <div className="flex flex-col gap-2 mb-3">
                      {jiraLinks.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer" className="text-xs" style={{ color: '#2563EB' }}>
                          {url}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs mb-3" style={{ color: '#94A3B8' }}>Jira не задана</div>
                  )}
                  <div className="text-[10px] uppercase tracking-[0.05em] mb-2" style={{ color: '#64748B', fontWeight: 600 }}>Confluence</div>
                  {confLinks.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {confLinks.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer" className="text-xs" style={{ color: '#2563EB' }}>
                          {url}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs" style={{ color: '#94A3B8' }}>Confluence не задана</div>
                  )}
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid #F1F5F9' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] uppercase tracking-[0.05em]" style={{ color: '#64748B', fontWeight: 600 }}>
                        Привязанные предложения ({(requirementsByFn[fn.id] || []).length})
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => setRelationModal({ open: true, fn })}
                          className="h-7 px-2.5 rounded-lg text-xs"
                          style={{ border: '1px solid #DCE3EE', color: '#2563EB', background: '#fff' }}
                        >
                          Управлять
                        </button>
                      )}
                    </div>
                    {(requirementsByFn[fn.id] || []).length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {(requirementsByFn[fn.id] || []).slice(0, 5).map((row) => (
                          <div key={row.id} className="text-xs" style={{ color: '#475569' }}>
                            <span style={{ color: '#2563EB', fontFamily: 'Consolas, monospace' }}>#{row.id}</span> {row.taskIdentifier || '—'} - {row.shortName || 'Без названия'}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs" style={{ color: '#94A3B8' }}>Нет привязанных предложений</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
            })}
            </div>
          ))}
        </div>
        {selectedFunctions.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-400">Для выбранного этапа пока нет функций</div>
        )}
      </div>
      <FunctionRequirementsModal
        open={relationModal.open}
        loading={relationLoading}
        items={relationModal.fn ? (requirementsByFn[relationModal.fn.id] || []) : []}
        allItems={allRequirements}
        searchValue={requirementsSearch}
        searching={requirementsSearching}
        onSearchChange={setRequirementsSearch}
        onClose={() => {
          setRelationModal({ open: false, fn: null })
          setRequirementsSearch('')
        }}
        onBind={async (ids) => {
          if (!relationModal.fn) return
          setRelationLoading(true)
          try {
            await bindRequirementsToFunction(details.id, relationModal.fn.id, ids)
            toast.success('Предложения привязаны')
            await loadFunctionRequirements(relationModal.fn)
            const rows = await fetchRequirements(requirementsSearch.trim() ? { search: requirementsSearch.trim() } : undefined)
            setAllRequirements(rows.map((r) => ({
              id: r.id,
              taskIdentifier: r.taskIdentifier,
              shortName: r.shortName,
              contractTZFunctionId: r.contractTZFunctionId,
            })))
          } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Не удалось привязать предложения')
          } finally {
            setRelationLoading(false)
          }
        }}
        onUnbind={async (ids) => {
          if (!relationModal.fn) return
          setRelationLoading(true)
          try {
            await unbindRequirementsFromFunction(details.id, relationModal.fn.id, ids)
            toast.success('Предложения отвязаны')
            await loadFunctionRequirements(relationModal.fn)
            const rows = await fetchRequirements(requirementsSearch.trim() ? { search: requirementsSearch.trim() } : undefined)
            setAllRequirements(rows.map((r) => ({
              id: r.id,
              taskIdentifier: r.taskIdentifier,
              shortName: r.shortName,
              contractTZFunctionId: r.contractTZFunctionId,
            })))
          } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Не удалось отвязать предложения')
          } finally {
            setRelationLoading(false)
          }
        }}
      />
    </div>
  )
}

/* ─── Attachment section ──────────────────────────────────── */
function AttachmentSection({
  title,
  items,
  canEdit,
  canDelete,
  onUpload,
  onDelete,
}: {
  title: string
  items: ContractAttachmentItem[]
  canEdit: boolean
  canDelete: boolean
  onUpload: (files: File[]) => Promise<void>
  onDelete: (id: number) => Promise<void>
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-sm font-semibold text-slate-700">{title}</h5>
        {canEdit && (
          <label className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-600 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            Загрузить
            <input
              type="file"
              className="hidden"
              multiple
              onChange={async (e) => {
                const files = e.target.files ? Array.from(e.target.files) : []
                if (!files.length) return
                try {
                  await onUpload(files)
                  toast.success('Файлы загружены')
                } catch (error: any) {
                  toast.error(error?.response?.data?.message || 'Ошибка загрузки')
                } finally {
                  e.currentTarget.value = ''
                }
              }}
            />
          </label>
        )}
      </div>
      {!items.length ? (
        <div className="rounded-lg border border-dashed border-slate-200 py-4 text-center text-xs text-slate-400">
          Файлов нет
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate text-xs text-slate-700">{item.originalFileName}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={async () => {
                    const res = await downloadGKAttachment(item.id)
                    downloadBlob(res.data as Blob, item.originalFileName)
                  }}
                  className="h-6 w-6 rounded flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                {canDelete && (
                  <button
                    onClick={async () => {
                      await onDelete(item.id)
                      toast.success('Файл удалён')
                    }}
                    className="h-6 w-6 rounded flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
