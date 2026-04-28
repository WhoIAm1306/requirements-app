import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Check, ChevronDown, Layers, Link2, Pencil, Plus, Save, Search, X, Zap } from 'lucide-react'
import { useAuth } from '@/auth/auth-context'
import { fetchContracts } from '@/api/contracts'
import { bindRequirementsToFunction, fetchFunctionRequirements, fetchGKContractDetails, fetchStageJiraEpicStatuses, unbindRequirementsFromFunction, upsertGKFunction } from '@/api/gkContracts'
import { fetchRequirements } from '@/api/requirements'
import type { ContractItem, GKFunction, GKStage, JiraEpicStatusItem, Requirement } from '@/types'

type FlatFunction = GKFunction & { stageNumber: number; stageName: string }

type FunctionModalState = {
  open: boolean
  contractId: number | null
  initial?: FlatFunction
}

function FunctionFormModal({
  state,
  stages,
  canEdit,
  onClose,
  onSubmit,
  onOpenProposals,
}: {
  state: FunctionModalState
  stages: GKStage[]
  canEdit: boolean
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
  onOpenProposals: (fn: FlatFunction) => void
}) {
  const fn = state.initial
  const [stageNumber, setStageNumber] = useState('')
  const [functionName, setFunctionName] = useState('')
  const [nmck, setNmck] = useState('')
  const [tz, setTz] = useState('')
  const [jiraDraft, setJiraDraft] = useState('')
  const [jiraEpics, setJiraEpics] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [confluenceDraft, setConfluenceDraft] = useState('')
  const [confluenceLinks, setConfluenceLinks] = useState<string[]>([])
  const [stageMenuOpen, setStageMenuOpen] = useState(false)

  useEffect(() => {
    if (!state.open || !fn) return
    setStageNumber(String(fn.stageNumber || ''))
    setFunctionName(fn.functionName || '')
    setNmck(fn.nmckFunctionNumber || '')
    setTz(fn.tzSectionNumber || '')
    setJiraDraft('')
    setConfluenceDraft('')
    setJiraEpics(fn.jiraEpicLinks || [])
    setConfluenceLinks(fn.confluenceLinks || [])
  }, [state.open, fn])

  useEffect(() => {
    if (!state.open) setStageMenuOpen(false)
  }, [state.open])

  if (!state.open || !fn) return null

  const addUnique = (list: string[], value: string) => {
    const trimmed = value.trim()
    if (!trimmed || list.includes(trimmed)) return list
    return [...list, trimmed]
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/45" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-[512px] max-w-[94vw] overflow-hidden shadow-2xl">
        <div className="h-1 w-full" style={{ background: '#2563EB' }} />
        <div className="h-[57px] px-5 border-b flex items-center justify-between" style={{ borderColor: '#F1F5F9' }}>
          <div>
            <div className="text-[22px] font-semibold text-slate-900 leading-[22px]">Функция</div>
          </div>
          <button onClick={onClose} className="w-6 h-6 rounded-[10px] inline-flex items-center justify-center text-slate-400 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 pt-2 border-b border-slate-100">
          <div className="relative">
            <div className="flex items-center">
              <button
                type="button"
                className="h-9 px-1 mr-6 text-sm font-medium transition-colors"
                style={{ color: '#2563EB' }}
              >
                Функция
              </button>
              <button
                type="button"
                onClick={() => onOpenProposals(fn)}
                className="h-9 px-1 text-sm font-medium transition-colors"
                style={{ color: '#64748B' }}
              >
                Предложения
              </button>
            </div>
            <div className="h-[1px] bg-slate-200" />
            <span
              className="absolute bottom-0 left-0 h-[2px] bg-blue-600 rounded-full transition-transform duration-300 ease-out"
              style={{ width: '84px', transform: 'translateX(0)' }}
            />
          </div>
        </div>
        <div className="px-5 pt-4 pb-4 flex flex-col gap-4">
          <div className="h-9 rounded-[10px] border px-3 flex items-center justify-between" style={{ borderColor: '#DCE3EE', background: '#F8FAFC' }}>
            <span className="text-xs" style={{ color: '#64748B' }}>Этап</span>
            <div className="relative">
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => setStageMenuOpen((p) => !p)}
                className="h-8 px-2.5 rounded-[10px] inline-flex items-center gap-1.5 text-sm disabled:opacity-60 transition-colors"
                style={{ background: '#fff', border: '1px solid #CBD5E1', color: '#1F2937' }}
              >
                {stageNumber} - {stages.find((s) => String(s.stageNumber) === stageNumber)?.stageName || `Этап ${stageNumber}`}
                <ChevronDown size={13} />
              </button>
              {canEdit && stageMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-72 rounded-xl border border-slate-200 bg-white shadow-xl z-20 overflow-hidden">
                  {stages.map((stage) => {
                    const active = String(stage.stageNumber) === stageNumber
                    return (
                      <button
                        key={stage.id}
                        type="button"
                        onClick={() => {
                          setStageNumber(String(stage.stageNumber))
                          setStageMenuOpen(false)
                        }}
                        className="w-full px-3 py-2.5 text-left text-sm flex items-center justify-between transition-colors"
                        style={{ background: active ? '#EFF6FF' : '#fff', color: active ? '#2563EB' : '#1F2937' }}
                        onMouseEnter={(e) => {
                          if (!active) e.currentTarget.style.background = '#F8FAFC'
                        }}
                        onMouseLeave={(e) => {
                          if (!active) e.currentTarget.style.background = '#fff'
                        }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-flex items-center justify-center w-5 h-5 rounded-md text-[11px] font-semibold"
                            style={{ background: active ? '#2563EB' : '#E2E8F0', color: active ? '#fff' : '#475569' }}
                          >
                            {stage.stageNumber}
                          </span>
                          <span>{stage.stageName || `Этап ${stage.stageNumber}`}</span>
                        </span>
                        {active && <Check size={13} />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Наименование функции</span>
            <input value={functionName} onChange={(e) => setFunctionName(e.target.value)} disabled={!canEdit} className="w-full h-[34px] rounded-[10px] border border-slate-300 px-3 text-sm disabled:bg-slate-100" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs text-slate-500">№ НМЦК</span>
              <input value={nmck} onChange={(e) => setNmck(e.target.value)} disabled={!canEdit} className="w-full h-[34px] rounded-[10px] border border-slate-300 px-3 text-sm disabled:bg-slate-100" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-slate-500">№ раздела ТЗ</span>
              <input value={tz} onChange={(e) => setTz(e.target.value)} disabled={!canEdit} className="w-full h-[34px] rounded-[10px] border border-slate-300 px-3 text-sm disabled:bg-slate-100" />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Jira Epics</span>
            <div className="flex gap-2">
              <input value={jiraDraft} onChange={(e) => setJiraDraft(e.target.value)} disabled={!canEdit} className="flex-1 h-[30px] rounded-[10px] border border-slate-300 px-3 text-xs disabled:bg-slate-100" />
              <button type="button" disabled={!canEdit} onClick={() => { setJiraEpics((prev) => addUnique(prev, jiraDraft)); setJiraDraft('') }} className="w-10 h-[30px] rounded-[10px] border inline-flex items-center justify-center" style={{ borderColor: '#BFDBFE', background: '#EFF6FF', color: '#2563EB' }}>
                <Plus size={14} />
              </button>
            </div>
            {jiraEpics.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {jiraEpics.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                    {item}
                    {canEdit && <button type="button" onClick={() => setJiraEpics((prev) => prev.filter((x) => x !== item))}><X size={11} /></button>}
                  </span>
                ))}
              </div>
            )}
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Confluence links</span>
            <div className="flex gap-2">
              <input value={confluenceDraft} onChange={(e) => setConfluenceDraft(e.target.value)} disabled={!canEdit} className="flex-1 h-[30px] rounded-[10px] border border-slate-300 px-3 text-xs disabled:bg-slate-100" />
              <button type="button" disabled={!canEdit} onClick={() => { setConfluenceLinks((prev) => addUnique(prev, confluenceDraft)); setConfluenceDraft('') }} className="w-10 h-[30px] rounded-[10px] border inline-flex items-center justify-center" style={{ borderColor: '#BFDBFE', background: '#EFF6FF', color: '#2563EB' }}>
                <Plus size={14} />
              </button>
            </div>
            {confluenceLinks.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {confluenceLinks.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
                    {item}
                    {canEdit && <button type="button" onClick={() => setConfluenceLinks((prev) => prev.filter((x) => x !== item))}><X size={11} /></button>}
                  </span>
                ))}
              </div>
            )}
          </label>
        </div>
        <div className="h-[64px] px-5 border-t border-slate-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-slate-300 text-sm">Закрыть</button>
          {canEdit && (
            <button
              disabled={saving}
              onClick={async () => {
                const stageNum = Number(stageNumber)
                if (!Number.isFinite(stageNum) || !functionName.trim() || !nmck.trim() || !tz.trim()) {
                  toast.error('Заполните обязательные поля функции')
                  return
                }
                setSaving(true)
                try {
                  await onSubmit({
                    stageNumber: stageNum,
                    functionName: functionName.trim(),
                    nmckFunctionNumber: nmck.trim(),
                    tzSectionNumber: tz.trim(),
                    jiraLink: jiraEpics[0] || undefined,
                    confluenceLinks,
                    jiraEpicLinks: jiraEpics,
                  })
                  onClose()
                } finally {
                  setSaving(false)
                }
              }}
              className="h-9 px-4 rounded-lg text-sm text-white bg-blue-600 disabled:opacity-70 inline-flex items-center gap-1.5"
            >
              <Save size={14} />
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function FunctionProposalsModal({
  open,
  loading,
  linkedItems,
  allItems,
  search,
  searching,
  onSearchChange,
  onClose,
  onBind,
  onUnbind,
}: {
  open: boolean
  loading: boolean
  linkedItems: Array<{ id: number; taskIdentifier?: string; shortName?: string }>
  allItems: Array<{ id: number; taskIdentifier?: string; shortName?: string }>
  search: string
  searching: boolean
  onSearchChange: (value: string) => void
  onClose: () => void
  onBind: (ids: number[]) => Promise<void>
  onUnbind: (ids: number[]) => Promise<void>
}) {
  const [selectedBindIds, setSelectedBindIds] = useState<number[]>([])
  const [selectedUnbindIds, setSelectedUnbindIds] = useState<number[]>([])
  const linkedSet = useMemo(() => new Set(linkedItems.map((x) => x.id)), [linkedItems])
  const available = useMemo(() => allItems.filter((x) => !linkedSet.has(x.id)), [allItems, linkedSet])
  const toggle = (arr: number[], id: number) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id])

  useEffect(() => {
    if (open) {
      setSelectedBindIds([])
      setSelectedUnbindIds([])
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center bg-black/45" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-[1040px] max-w-[96vw] p-5 shadow-2xl">
        <div className="text-sm font-semibold text-slate-900 mb-1">Привязка предложений</div>
        <div className="text-xs text-slate-500 mb-4">Слева — привязанные, справа — поиск и привязка предложений.</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 text-xs font-semibold text-slate-600">Привязанные ({linkedItems.length})</div>
            <div className="max-h-[360px] overflow-y-auto">
              {linkedItems.length === 0 ? <div className="p-3 text-sm text-slate-400">Нет привязанных предложений.</div> : linkedItems.map((item) => (
                <label key={item.id} className="flex items-start gap-2 px-3 py-2 border-b border-slate-100 last:border-b-0 cursor-pointer">
                  <input type="checkbox" checked={selectedUnbindIds.includes(item.id)} onChange={() => setSelectedUnbindIds((prev) => toggle(prev, item.id))} />
                  <div className="min-w-0">
                    <div className="text-xs text-blue-600 font-mono">#{item.id}</div>
                    <div className="text-sm text-slate-700 truncate">{item.taskIdentifier || '—'} - {item.shortName || 'Без названия'}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="px-3 py-2 border-t border-slate-100">
              <button disabled={loading || selectedUnbindIds.length === 0} onClick={async () => { await onUnbind(selectedUnbindIds); setSelectedUnbindIds([]) }} className="h-8 px-3 rounded-lg text-xs text-white" style={{ background: '#DC2626', opacity: loading || selectedUnbindIds.length === 0 ? 0.6 : 1 }}>
                Отвязать выбранные ({selectedUnbindIds.length})
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100">
              <div className="text-xs font-semibold text-slate-600 mb-2">Поиск предложений</div>
              <input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Пустой поиск покажет все предложения" className="w-full h-8 px-3 rounded-lg border border-slate-200 text-sm" />
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {searching ? <div className="p-3 text-sm text-slate-400">Поиск...</div> : available.length === 0 ? <div className="p-3 text-sm text-slate-400">Нет результатов.</div> : available.map((item) => (
                <label key={item.id} className="flex items-start gap-2 px-3 py-2 border-b border-slate-100 last:border-b-0 cursor-pointer">
                  <input type="checkbox" checked={selectedBindIds.includes(item.id)} onChange={() => setSelectedBindIds((prev) => toggle(prev, item.id))} />
                  <div className="min-w-0">
                    <div className="text-xs text-blue-600 font-mono">#{item.id}</div>
                    <div className="text-sm text-slate-700 truncate">{item.taskIdentifier || '—'} - {item.shortName || 'Без названия'}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="px-3 py-2 border-t border-slate-100">
              <button disabled={loading || selectedBindIds.length === 0} onClick={async () => { await onBind(selectedBindIds); setSelectedBindIds([]) }} className="h-8 px-3 rounded-lg text-xs text-white" style={{ background: '#2563EB', opacity: loading || selectedBindIds.length === 0 ? 0.6 : 1 }}>
                Привязать выбранные ({selectedBindIds.length})
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-slate-300 text-sm">Закрыть</button>
        </div>
      </div>
    </div>
  )
}

export function FunctionsDirectoryPage() {
  const auth = useAuth()
  const [contracts, setContracts] = useState<ContractItem[]>([])
  const [detailsByContract, setDetailsByContract] = useState<Record<number, { stages: GKStage[] }>>({})
  const [contractId, setContractId] = useState<number | null>(null)
  const [stageNumber, setStageNumber] = useState<number | null>(null)
  const [functions, setFunctions] = useState<FlatFunction[]>([])
  const [epicStatusesByFn, setEpicStatusesByFn] = useState<Record<number, JiraEpicStatusItem[]>>({})
  const [search, setSearch] = useState('')
  const [modalState, setModalState] = useState<FunctionModalState>({ open: false, contractId: null })
  const [proposalsModalOpen, setProposalsModalOpen] = useState(false)
  const [proposalsLoading, setProposalsLoading] = useState(false)
  const [linkedByFn, setLinkedByFn] = useState<Record<number, Array<{ id: number; taskIdentifier?: string; shortName?: string }>>>({})
  const [allRequirements, setAllRequirements] = useState<Array<{ id: number; taskIdentifier?: string; shortName?: string }>>([])
  const [requirementsSearch, setRequirementsSearch] = useState('')
  const [requirementsSearching, setRequirementsSearching] = useState(false)

  useEffect(() => {
    if (!modalState.open) {
      setProposalsModalOpen(false)
      setRequirementsSearch('')
    }
  }, [modalState.open])

  useEffect(() => {
    ;(async () => {
      try { setContracts(await fetchContracts()) }
      catch (error: any) { toast.error(error?.response?.data?.message || 'Ошибка загрузки ГК') }
    })()
  }, [])

  useEffect(() => {
    if (!contractId) { setFunctions([]); setStageNumber(null); return }
    ;(async () => {
      try {
        let cached = detailsByContract[contractId]
        if (!cached) {
          const details = await fetchGKContractDetails(contractId)
          cached = { stages: details.stages || [] }
          setDetailsByContract((prev) => ({ ...prev, [contractId]: cached! }))
        }
        const stages = cached.stages || []
        const targetStage = stageNumber ?? stages[0]?.stageNumber ?? null
        if (targetStage == null) {
          setFunctions([])
          return
        }
        if (stageNumber == null) setStageNumber(targetStage)
        const stage = stages.find((s) => s.stageNumber === targetStage)
        const rows = (stage?.functions || []).map((fn) => ({
          ...fn,
          stageNumber: stage?.stageNumber || targetStage,
          stageName: stage?.stageName || '',
        }))
        setFunctions(rows)

        try {
          const statuses = await fetchStageJiraEpicStatuses(contractId, targetStage)
          setEpicStatusesByFn(statuses)
        } catch {
          setEpicStatusesByFn({})
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Ошибка загрузки функций')
      }
    })()
  }, [contractId, stageNumber, detailsByContract])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return functions
    return functions.filter((x) =>
      [x.functionName, x.tzSectionNumber, x.nmckFunctionNumber, x.jiraLink || '']
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [functions, search])

  const stages = useMemo(() => {
    if (!contractId) return []
    return detailsByContract[contractId]?.stages || []
  }, [contractId, detailsByContract])

  const functionCards = useMemo(() => {
    return [...filtered].sort((a, b) => a.id - b.id)
  }, [filtered])

  const getEpicVisual = (epic?: JiraEpicStatusItem) => {
    if (!epic) return { label: 'Серый', bg: '#F1F5F9', color: '#64748B', level: 0 }
    const category = (epic.statusCategory || '').toLowerCase()
    if (epic.syncStatus === 'error') return { label: 'Серый', bg: '#F1F5F9', color: '#64748B', level: 0 }
    if (category.includes('done') || category.includes('готов') || category.includes('выполн')) return { label: 'Зеленый', bg: '#F0FDF4', color: '#16A34A', level: 3 }
    if (category.includes('progress') || category.includes('работ') || category.includes('разраб')) return { label: 'Синий', bg: '#DBEAFE', color: '#1D4ED8', level: 2 }
    if (category.includes('to do') || category.includes('todo') || category.includes('new') || epic.syncStatus === 'planned') return { label: 'Голубой', bg: '#E0F2FE', color: '#0284C7', level: 1 }
    return { label: 'Серый', bg: '#F1F5F9', color: '#64748B', level: 0 }
  }
  const statusStripColors = ['#CBD5E1', '#7DD3FC', '#60A5FA', '#4ADE80']

  useEffect(() => {
    if (!proposalsModalOpen || !modalState.contractId || !modalState.initial) return
    let cancelled = false
    ;(async () => {
      try {
        setRequirementsSearching(true)
        const rows = await fetchRequirements(requirementsSearch.trim() ? { search: requirementsSearch.trim() } : undefined)
        if (cancelled) return
        setAllRequirements(rows.map((r: Requirement) => ({ id: r.id, taskIdentifier: r.taskIdentifier, shortName: r.shortName })))
      } catch {
        if (!cancelled) toast.error('Не удалось загрузить предложения')
      } finally {
        if (!cancelled) setRequirementsSearching(false)
      }
    })()
    return () => { cancelled = true }
  }, [proposalsModalOpen, modalState.contractId, modalState.initial?.id, requirementsSearch])

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="w-[340px] border-r border-slate-200 bg-white flex flex-col">
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="text-sm font-semibold text-slate-900">Справочник функций</div>
          <div className="text-xs text-slate-500">ГК и этапы</div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contracts.map((c) => {
            const active = contractId === c.id
            const stagesForContract = detailsByContract[c.id]?.stages || []
            const stagesCount = c.stagesCount ?? stagesForContract.length
            const functionsCount = c.functionsCount ?? stagesForContract.reduce((acc, s) => acc + (s.functions?.length || 0), 0)
            return (
              <div key={c.id} className="border-b border-slate-100">
                <button
                  onClick={async () => {
                    setContractId(c.id)
                    setSearch('')
                    if (!detailsByContract[c.id]) {
                      try {
                        const details = await fetchGKContractDetails(c.id)
                        setDetailsByContract((prev) => ({ ...prev, [c.id]: { stages: details.stages || [] } }))
                        setStageNumber(details.stages?.[0]?.stageNumber ?? null)
                      } catch (error: any) {
                        toast.error(error?.response?.data?.message || 'Ошибка загрузки этапов')
                      }
                    } else {
                      const first = detailsByContract[c.id].stages?.[0]?.stageNumber ?? null
                      setStageNumber((prev) => prev ?? first)
                    }
                  }}
                  className="w-full text-left transition-all group"
                  style={{
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
                    <span style={{ fontSize: 10, color: '#94A3B8' }}>#{c.id}</span>
                  </div>
                  <div className="text-[13px] font-medium text-slate-800 mb-2 leading-[1.35]">{c.name}</div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                      style={{
                        fontSize: 10,
                        background: stagesCount > 0 ? '#EFF6FF' : '#F8FAFC',
                        color: stagesCount > 0 ? '#2563EB' : '#CBD5E1',
                        fontWeight: 500,
                      }}
                    >
                      <Layers className="w-2.5 h-2.5" />
                      {stagesCount} эт.
                    </span>
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                      style={{
                        fontSize: 10,
                        background: functionsCount > 0 ? '#F0FDF4' : '#F8FAFC',
                        color: functionsCount > 0 ? '#16A34A' : '#CBD5E1',
                        fontWeight: 500,
                      }}
                    >
                      <Zap className="w-2.5 h-2.5" />
                      {functionsCount} ф.
                    </span>
                  </div>
                </button>
                {active && stagesForContract.length > 0 && (
                  <div className="pb-2 px-2 bg-slate-50/60">
                    {stagesForContract.map((st) => {
                      const stActive = stageNumber === st.stageNumber
                      return (
                        <button
                          key={st.id}
                          onClick={() => setStageNumber(st.stageNumber)}
                          className="w-full mt-1 h-9 px-3 rounded-[10px] text-left text-xs flex items-center justify-between border transition-colors"
                          style={{
                            background: stActive ? '#2563EB' : '#fff',
                            color: stActive ? '#fff' : '#334155',
                            borderColor: stActive ? '#2563EB' : '#E2E8F0',
                          }}
                        >
                          <span className="inline-flex items-center gap-2 min-w-0">
                            <span
                              className="inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-semibold flex-shrink-0"
                              style={{ background: stActive ? 'rgba(255,255,255,0.2)' : '#E2E8F0', color: stActive ? '#fff' : '#475569' }}
                            >
                              {st.stageNumber}
                            </span>
                            <span className="truncate">{st.stageName || `Этап ${st.stageNumber}`}</span>
                          </span>
                          <span className="inline-flex items-center justify-center rounded-full px-2 h-5 text-[10px]" style={{ background: stActive ? 'rgba(255,255,255,0.2)' : '#E2E8F0', color: stActive ? '#fff' : '#475569' }}>
                            {(st.functions || []).length}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900">Функции этапа</h1>
            {functions.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {functionCards.length}
              </span>
            )}
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск по функциям..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-8 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 placeholder-slate-400 outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-slate-50">
          {!contractId || stageNumber == null ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">Выберите ГК и этап</div>
          ) : functionCards.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">Нет функций по выбранному этапу</div>
          ) : (
            <div className="grid grid-cols-4 gap-3 min-w-[1200px]">
              {functionCards.map((fn) => (
                <button
                  key={fn.id}
                  type="button"
                  onClick={() => setModalState({ open: true, contractId, initial: fn })}
                  className="text-left rounded-xl border border-slate-200 bg-white p-3 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="text-sm font-semibold text-slate-900 leading-5">{fn.functionName || 'Без названия'}</div>
                    {auth.canEditGKFunctions && <Pencil size={14} className="text-slate-400" />}
                  </div>
                  <div className="text-xs text-slate-500 mb-1">Этап: {fn.stageNumber}</div>
                  <div className="text-xs text-slate-500 mb-1">НМЦК: <span className="text-slate-700">{fn.nmckFunctionNumber || '—'}</span></div>
                  <div className="text-xs text-slate-500 mb-2">ТЗ: <span className="text-slate-700">{fn.tzSectionNumber || '—'}</span></div>
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                      <Link2 size={11} /> Jira {fn.jiraEpicLinks?.length || 0}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                      <Layers size={11} /> Conf {fn.confluenceLinks?.length || 0}
                    </span>
                  </div>
                  {((epicStatusesByFn[fn.id] || []).length > 0) ? (() => {
                    const epic = (epicStatusesByFn[fn.id] || [])[0]
                    const visual = getEpicVisual(epic)
                    return (
                      <div className="rounded-[10px] border border-slate-200 px-2.5 py-2 bg-white">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="text-xs font-medium text-slate-800 truncate">{epic.summary || epic.epicKey || 'Jira Epic'}</div>
                          <span className="px-1.5 py-0.5 rounded-[8px] text-[10px]" style={{ background: visual.bg, color: visual.color }}>{visual.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {statusStripColors.map((color, index) => (
                            <span key={`${fn.id}-${color}`} className="inline-block h-1.5 flex-1 rounded-full" style={{ background: color, opacity: index <= visual.level ? 1 : 0.25 }} />
                          ))}
                        </div>
                      </div>
                    )
                  })() : (
                    <div className="text-[11px] text-slate-500">Статус эпика: <span className="font-medium text-slate-700">Серый</span></div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <FunctionFormModal
        state={modalState}
        stages={stages}
        canEdit={Boolean(auth.canEditGKFunctions || auth.isSuperuser)}
        onClose={() => setModalState({ open: false, contractId: null })}
        onOpenProposals={async (fn) => {
          if (!modalState.contractId) return
          try {
            const rows = await fetchFunctionRequirements(modalState.contractId, fn.id)
            setLinkedByFn((prev) => ({
              ...prev,
              [fn.id]: rows.map((r) => ({ id: r.id, taskIdentifier: r.taskIdentifier, shortName: r.shortName })),
            }))
            setProposalsModalOpen(true)
          } catch {
            toast.error('Не удалось загрузить привязанные предложения')
          }
        }}
        onSubmit={async (payload) => {
          if (!modalState.contractId) return
          await upsertGKFunction(modalState.contractId, payload)
          toast.success('Функция сохранена')
          const details = await fetchGKContractDetails(modalState.contractId)
          setDetailsByContract((prev) => ({ ...prev, [modalState.contractId!]: { stages: details.stages || [] } }))
          if (contractId === modalState.contractId) {
            const stage = (details.stages || []).find((s) => s.stageNumber === (stageNumber ?? payload.stageNumber))
            const rows = (stage?.functions || []).map((fn) => ({
              ...fn,
              stageNumber: stage?.stageNumber || payload.stageNumber,
              stageName: stage?.stageName || '',
            }))
            setFunctions(rows)
          }
        }}
      />
      <FunctionProposalsModal
        open={proposalsModalOpen}
        loading={proposalsLoading}
        linkedItems={modalState.initial ? (linkedByFn[modalState.initial.id] || []) : []}
        allItems={allRequirements}
        search={requirementsSearch}
        searching={requirementsSearching}
        onSearchChange={setRequirementsSearch}
        onClose={() => {
          setProposalsModalOpen(false)
          setRequirementsSearch('')
        }}
        onBind={async (ids) => {
          if (!modalState.contractId || !modalState.initial) return
          setProposalsLoading(true)
          try {
            await bindRequirementsToFunction(modalState.contractId, modalState.initial.id, ids)
            const rows = await fetchFunctionRequirements(modalState.contractId, modalState.initial.id)
            setLinkedByFn((prev) => ({
              ...prev,
              [modalState.initial!.id]: rows.map((r) => ({ id: r.id, taskIdentifier: r.taskIdentifier, shortName: r.shortName })),
            }))
            toast.success('Предложения привязаны')
          } catch {
            toast.error('Не удалось привязать предложения')
          } finally {
            setProposalsLoading(false)
          }
        }}
        onUnbind={async (ids) => {
          if (!modalState.contractId || !modalState.initial) return
          setProposalsLoading(true)
          try {
            await unbindRequirementsFromFunction(modalState.contractId, modalState.initial.id, ids)
            const rows = await fetchFunctionRequirements(modalState.contractId, modalState.initial.id)
            setLinkedByFn((prev) => ({
              ...prev,
              [modalState.initial!.id]: rows.map((r) => ({ id: r.id, taskIdentifier: r.taskIdentifier, shortName: r.shortName })),
            }))
            toast.success('Предложения отвязаны')
          } catch {
            toast.error('Не удалось отвязать предложения')
          } finally {
            setProposalsLoading(false)
          }
        }}
      />
    </div>
  )
}
