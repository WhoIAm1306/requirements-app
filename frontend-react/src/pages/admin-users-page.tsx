import { useEffect, useMemo, useState } from 'react'
import { Download, Pencil, Plus, Trash2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  createAdminUser,
  deleteAllRequirements,
  deleteAdminUser,
  exportAdminUsersFile,
  fetchJiraAPIConfig,
  fetchAdminUsers,
  importAdminUsersFile,
  saveJiraAPIConfig,
  updateAdminUser,
} from '@/api/adminUsers'
import { downloadBlob } from '@/lib/utils'
import type { AccessLevel, AdminUser, CreateAdminUserPayload, Organization, UpdateAdminUserPayload } from '@/types'

const ORG_OPTIONS: Organization[] = ['ДИТ', '112', '101', 'Танто-С']

type UserForm = {
  fullName: string
  organization: Organization
  email: string
  password: string
  accessLevel: AccessLevel
  isActive: boolean
}

function emptyForm(): UserForm {
  return {
    fullName: '',
    organization: 'ДИТ',
    email: '',
    password: '',
    accessLevel: 'read',
    isActive: true,
  }
}

function UserModal({
  open,
  editing,
  onClose,
  onSubmit,
}: {
  open: boolean
  editing: AdminUser | null
  onClose: () => void
  onSubmit: (payload: CreateAdminUserPayload | UpdateAdminUserPayload, id?: number) => Promise<void>
}) {
  const [form, setForm] = useState<UserForm>(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (!editing) {
      setForm(emptyForm())
      return
    }
    setForm({
      fullName: editing.fullName || '',
      organization: (editing.organization as Organization) || 'ДИТ',
      email: editing.email || '',
      password: '',
      accessLevel: editing.accessLevel || 'read',
      isActive: Boolean(editing.isActive),
    })
  }, [open, editing])

  if (!open) return null

  const isEdit = Boolean(editing)
  const title = isEdit ? 'Редактирование пользователя' : 'Новый пользователь'

  const submit = async () => {
    if (!form.fullName.trim()) return toast.error('Укажите ФИО')
    if (!form.email.trim()) return toast.error('Укажите email')
    if (!isEdit && form.password.length < 6) return toast.error('Пароль должен быть не менее 6 символов')
    setSaving(true)
    try {
      if (isEdit && editing) {
        const payload: UpdateAdminUserPayload = {
          fullName: form.fullName.trim(),
          organization: form.organization,
          email: form.email.trim(),
          accessLevel: form.accessLevel,
          isActive: form.isActive,
        }
        await onSubmit(payload, editing.id)
      } else {
        const payload: CreateAdminUserPayload = {
          fullName: form.fullName.trim(),
          organization: form.organization,
          email: form.email.trim(),
          password: form.password,
          accessLevel: form.accessLevel,
          isActive: form.isActive,
        }
        await onSubmit(payload)
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const set = <K extends keyof UserForm>(k: K, v: UserForm[K]) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-2xl w-[520px] max-w-[95vw] overflow-hidden" style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-500">ФИО</span>
            <input
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Организация</span>
              <select
                value={form.organization}
                onChange={(e) => set('organization', e.target.value as Organization)}
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
              >
                {ORG_OPTIONS.map((org) => (
                  <option key={org} value={org}>
                    {org}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Уровень доступа</span>
              <select
                value={form.accessLevel}
                onChange={(e) => set('accessLevel', e.target.value as AccessLevel)}
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="read">Только чтение</option>
                <option value="edit">Редактирование</option>
              </select>
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-500">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
            />
          </label>
          {!isEdit && (
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Пароль</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
              />
            </label>
          )}
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
            Активный пользователь
          </label>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50">
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="h-9 px-4 rounded-lg text-sm font-medium text-white"
            style={{ background: '#409EFF', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'actions'>('users')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [importing, setImporting] = useState(false)
  const [jiraEmail, setJiraEmail] = useState('')
  const [jiraToken, setJiraToken] = useState('')
  const [jiraBearerToken, setJiraBearerToken] = useState('')
  const [jiraAuthType, setJiraAuthType] = useState<'bearer' | 'basic'>('bearer')
  const [jiraHasToken, setJiraHasToken] = useState(false)
  const [jiraHasBearerToken, setJiraHasBearerToken] = useState(false)
  const [actionsBusy, setActionsBusy] = useState(false)

  const loadUsers = async () => {
    try {
      setLoading(true)
      setUsers(await fetchAdminUsers())
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Ошибка загрузки пользователей')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const cfg = await fetchJiraAPIConfig()
        setJiraEmail(cfg.userEmail || '')
        setJiraHasToken(Boolean(cfg.hasToken))
        setJiraHasBearerToken(Boolean(cfg.hasBearerToken))
        setJiraAuthType(cfg.preferredAuth === 'basic' ? 'basic' : 'bearer')
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Ошибка загрузки Jira настроек')
      }
    })()
  }, [])

  const canDeleteIds = useMemo(() => new Set(users.filter((u) => !u.isSuperuser).map((u) => u.id)), [users])

  const handleSubmit = async (payload: CreateAdminUserPayload | UpdateAdminUserPayload, id?: number) => {
    try {
      setBusy(true)
      if (id) {
        await updateAdminUser(id, payload as UpdateAdminUserPayload)
        toast.success('Пользователь обновлен')
      } else {
        await createAdminUser(payload as CreateAdminUserPayload)
        toast.success('Пользователь создан')
      }
      await loadUsers()
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.response?.data?.message || 'Ошибка сохранения пользователя')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (user: AdminUser) => {
    if (!canDeleteIds.has(user.id)) {
      toast.error('Нельзя удалить этого пользователя')
      return
    }
    if (!window.confirm(`Удалить пользователя ${user.fullName}?`)) return
    try {
      setBusy(true)
      await deleteAdminUser(user.id)
      toast.success('Пользователь удален')
      await loadUsers()
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.response?.data?.message || 'Ошибка удаления')
    } finally {
      setBusy(false)
    }
  }

  const handleExport = async () => {
    try {
      const blob = await exportAdminUsersFile()
      downloadBlob(blob, 'admin-users.xlsx')
    } catch {
      toast.error('Ошибка экспорта пользователей')
    }
  }

  const handleImport = async (file?: File | null) => {
    if (!file) return
    try {
      setImporting(true)
      const result = await importAdminUsersFile(file)
      toast.success(`Импорт завершен: создано ${result.created}, обновлено ${result.updated}, ошибок ${result.failed}`)
      await loadUsers()
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Ошибка импорта пользователей')
    } finally {
      setImporting(false)
    }
  }

  const handleDeleteAllRequirements = async () => {
    if (!window.confirm('Удалить ВСЕ предложения? Действие необратимо.')) return
    try {
      setActionsBusy(true)
      const res = await deleteAllRequirements()
      toast.success(res.message || 'Все предложения удалены')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Ошибка удаления предложений')
    } finally {
      setActionsBusy(false)
    }
  }

  const handleSaveJiraAPI = async () => {
    if (jiraAuthType === 'bearer' && !jiraBearerToken.trim()) return toast.error('Укажите Bearer PAT Jira')
    if (jiraAuthType === 'basic' && !jiraEmail.trim()) return toast.error('Укажите логин/email Jira')
    if (jiraAuthType === 'basic' && !jiraToken.trim()) return toast.error('Укажите Jira API Token')
    try {
      setActionsBusy(true)
      await saveJiraAPIConfig({
        preferredAuth: jiraAuthType,
        bearerToken: jiraAuthType === 'bearer' ? jiraBearerToken.trim() : undefined,
        userEmail: jiraAuthType === 'basic' ? jiraEmail.trim() : undefined,
        apiToken: jiraAuthType === 'basic' ? jiraToken.trim() : undefined,
      })
      setJiraToken('')
      setJiraBearerToken('')
      setJiraHasToken(true)
      setJiraHasBearerToken(true)
      toast.success('Jira API подключена для всех пользователей')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Ошибка сохранения Jira настроек')
    } finally {
      setActionsBusy(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">Пользователи</h1>
          {!loading && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {users.length}
            </span>
          )}
        </div>
        {activeTab === 'users' ? (
          <div className="flex items-center gap-2">
            <label className="h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 inline-flex items-center gap-1.5 cursor-pointer hover:bg-slate-50">
              <Upload size={14} />
              {importing ? 'Импорт...' : 'Импорт'}
              <input
                type="file"
                className="hidden"
                accept=".xlsx"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  handleImport(file)
                  e.currentTarget.value = ''
                }}
              />
            </label>
            <button
              onClick={handleExport}
              className="h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 inline-flex items-center gap-1.5 hover:bg-slate-50"
            >
              <Download size={14} />
              Экспорт
            </button>
            <button
              onClick={() => {
                setEditing(null)
                setModalOpen(true)
              }}
              className="h-9 px-3 rounded-lg text-sm text-white inline-flex items-center gap-1.5"
              style={{ background: '#409EFF' }}
            >
              <Plus size={14} />
              Добавить
            </button>
          </div>
        ) : null}
      </div>
      <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center gap-2">
        <button
          onClick={() => setActiveTab('users')}
          className="h-8 px-3 rounded-lg text-sm"
          style={{ border: `1px solid ${activeTab === 'users' ? '#409EFF' : '#e2e8f0'}`, color: activeTab === 'users' ? '#409EFF' : '#64748b', background: activeTab === 'users' ? '#ECF5FF' : '#fff' }}
        >
          Пользователи
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          className="h-8 px-3 rounded-lg text-sm"
          style={{ border: `1px solid ${activeTab === 'actions' ? '#409EFF' : '#e2e8f0'}`, color: activeTab === 'actions' ? '#409EFF' : '#64748b', background: activeTab === 'actions' ? '#ECF5FF' : '#fff' }}
        >
          Действия
        </button>
      </div>

      {/* Table */}
      {activeTab === 'users' && (
      <div className="bg-white">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
              {['ФИО', 'Email', 'Организация', 'Уровень доступа', 'Статус', 'Действия'].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-left"
                  style={{ fontSize: 11, color: '#64748b', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-slate-400">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin" />
                    Загрузка...
                  </div>
                </td>
              </tr>
            )}
            {!loading && !users.length && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">
                  Пользователи не найдены
                </td>
              </tr>
            )}
            {!loading &&
              users.map((u) => (
                <tr
                  key={u.id}
                  style={{ borderBottom: '1px solid #f1f5f9' }}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                        style={{ background: '#409EFF' }}
                      >
                        {(u.fullName || '?')[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-800">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600">{u.email}</td>
                  <td className="px-5 py-3 text-sm text-slate-600">{u.organization || '—'}</td>
                  <td className="px-5 py-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={
                        u.isSuperuser
                          ? { background: '#D9ECFF', color: '#337ECC' }
                          : { background: '#F4F4F5', color: '#909399' }
                      }
                    >
                      {u.isSuperuser ? 'Суперпользователь' : (u.accessLevel || 'Пользователь')}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={
                        u.isActive
                          ? { background: '#F0F9EB', color: '#67C23A' }
                          : { background: '#FEF2F2', color: '#dc2626' }
                      }
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ background: u.isActive ? '#67C23A' : '#dc2626' }}
                      />
                      {u.isActive ? 'Активен' : 'Отключён'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditing(u)
                          setModalOpen(true)
                        }}
                        disabled={busy}
                        className="h-7 px-2 rounded-md border border-slate-200 text-slate-600 inline-flex items-center gap-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Pencil size={12} />
                        Изменить
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={!canDeleteIds.has(u.id) || busy}
                        className="h-7 px-2 rounded-md border border-rose-200 text-rose-600 inline-flex items-center gap-1 text-xs hover:bg-rose-50 disabled:opacity-40"
                      >
                        <Trash2 size={12} />
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      )}
      {activeTab === 'actions' && (
        <div className="p-6 bg-slate-50 h-full overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
            <div className="text-sm font-semibold text-slate-900 mb-1">1. Удалить все предложения</div>
            <p className="text-xs text-slate-500 mb-3">Полностью очищает реестр предложений. Действие необратимо.</p>
            <button
              onClick={handleDeleteAllRequirements}
              disabled={actionsBusy}
              className="h-9 px-4 rounded-lg text-sm text-white inline-flex items-center gap-1.5"
              style={{ background: '#DC2626', opacity: actionsBusy ? 0.7 : 1 }}
            >
              <Trash2 size={14} />
              Удалить все предложения
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="text-sm font-semibold text-slate-900 mb-1">2. Подключить API Jira</div>
            <p className="text-xs text-slate-500 mb-4">Один раз сохраняется для всех пользователей и используется при получении статусов эпиков.</p>
            <div className="grid grid-cols-1 gap-3 max-w-[560px]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setJiraAuthType('bearer')}
                  className="h-8 px-3 rounded-lg text-sm"
                  style={{ border: `1px solid ${jiraAuthType === 'bearer' ? '#409EFF' : '#e2e8f0'}`, color: jiraAuthType === 'bearer' ? '#409EFF' : '#64748b', background: jiraAuthType === 'bearer' ? '#ECF5FF' : '#fff' }}
                >
                  Bearer PAT
                </button>
                <button
                  onClick={() => setJiraAuthType('basic')}
                  className="h-8 px-3 rounded-lg text-sm"
                  style={{ border: `1px solid ${jiraAuthType === 'basic' ? '#409EFF' : '#e2e8f0'}`, color: jiraAuthType === 'basic' ? '#409EFF' : '#64748b', background: jiraAuthType === 'basic' ? '#ECF5FF' : '#fff' }}
                >
                  Логин + API token
                </button>
              </div>
              {jiraAuthType === 'bearer' ? (
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-500">Bearer PAT</span>
                  <input
                    type="password"
                    value={jiraBearerToken}
                    onChange={(e) => setJiraBearerToken(e.target.value)}
                    placeholder={jiraHasBearerToken ? 'PAT уже сохранен. Введите новый для замены' : 'Введите PAT'}
                    className="w-full h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                  />
                </label>
              ) : (
                <>
                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-slate-500">Логин / Email Jira</span>
                    <input
                      type="text"
                      value={jiraEmail}
                      onChange={(e) => setJiraEmail(e.target.value)}
                      placeholder="jira-user"
                      className="w-full h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-slate-500">Jira API Token</span>
                    <input
                      type="password"
                      value={jiraToken}
                      onChange={(e) => setJiraToken(e.target.value)}
                      placeholder={jiraHasToken ? 'Токен уже сохранён. Введите новый для замены' : 'Введите токен'}
                      className="w-full h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                    />
                  </label>
                </>
              )}
              <div className="text-xs" style={{ color: jiraHasToken ? '#16A34A' : '#94A3B8' }}>
                {jiraAuthType === 'bearer'
                  ? (jiraHasBearerToken ? 'PAT сохранен' : 'PAT пока не сохранен')
                  : (jiraHasToken ? 'Токен сохранён' : 'Токен пока не сохранён')}
              </div>
              <div>
                <button
                  onClick={handleSaveJiraAPI}
                  disabled={actionsBusy}
                  className="h-9 px-4 rounded-lg text-sm text-white"
                  style={{ background: '#409EFF', opacity: actionsBusy ? 0.7 : 1 }}
                >
                  Сохранить подключение Jira
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <UserModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
