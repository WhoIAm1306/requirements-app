import { useState, useRef, useEffect } from 'react'
import { LogOut, ChevronDown, User, Lock, Eye, EyeOff, X } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/auth-context'
import { changePassword } from '@/api/auth'
import { toast } from 'sonner'

/* ─── Nav items ──────────────────────────────────────────── */
const NAV_ITEMS = [
  { to: '/requirements', label: 'Предложения' },
  { to: '/gk-directory', label: 'Справочник ГК' },
  { to: '/functions-directory', label: 'Функции ГК', requiresFunctionsAccess: true },
  { to: '/admin/users', label: 'Административная панель', adminOnly: true },
]

/* ─── Profile modal ──────────────────────────────────────── */
function ProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const auth = useAuth()
  const [tab, setTab] = useState<'info' | 'password'>('info')
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showCur, setShowCur] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) { setTab('info'); setCurrentPwd(''); setNewPwd(''); setConfirmPwd('') }
  }, [isOpen])

  const handleChangePassword = async () => {
    if (!currentPwd.trim()) { toast.error('Введите текущий пароль'); return }
    if (newPwd.length < 6) { toast.error('Новый пароль должен быть не менее 6 символов'); return }
    if (newPwd !== confirmPwd) { toast.error('Пароли не совпадают'); return }
    setSaving(true)
    try {
      await changePassword({ currentPassword: currentPwd, newPassword: newPwd })
      toast.success('Пароль изменён')
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg ?? 'Ошибка при смене пароля')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const C = { border: '#DCDFE6', bg: '#F5F7FA', primary: '#409EFF', text: '#303133', secondary: '#606266', placeholder: '#C0C4CC' }

  const initials = (auth.fullName || '?')[0].toUpperCase()
  const accessLabel = auth.isSuperuser
    ? 'Суперпользователь'
    : auth.profile?.accessLevel === 'edit'
      ? 'Редактирование'
      : auth.profile?.accessLevel === 'read'
        ? 'Чтение'
        : (auth.profile?.accessLevel || 'Не указан')

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl overflow-hidden w-[480px] max-w-[95vw]" style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
          <h2 className="text-base font-semibold" style={{ color: C.text }}>Профиль пользователя</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ color: C.secondary }}
            onMouseEnter={e => { e.currentTarget.style.background = C.bg }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
            <X size={16} />
          </button>
        </div>

        {/* Avatar + name */}
        <div className="px-6 pt-5 pb-4 flex items-center gap-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
            style={{ background: '#409EFF' }}>{initials}</div>
          <div>
            <div className="text-base font-semibold" style={{ color: C.text }}>{auth.fullName || '—'}</div>
            <div className="text-sm mt-0.5" style={{ color: C.secondary }}>{auth.organization || '—'}</div>
            <div className="mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: auth.isSuperuser ? '#FDF6EC' : '#F0F9EB', color: auth.isSuperuser ? '#E6A23C' : '#67C23A', fontWeight: 500 }}>
                {accessLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-4 gap-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          {(['info', 'password'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="pb-3 text-sm font-medium border-b-2 transition-colors"
              style={{ borderColor: tab === t ? '#409EFF' : 'transparent', color: tab === t ? '#409EFF' : C.secondary }}>
              {t === 'info' ? 'Информация' : 'Смена пароля'}
            </button>
          ))}
        </div>

        <div className="px-6 py-5">
          {tab === 'info' ? (
            <div className="flex flex-col gap-3">
              {[
                { icon: User, label: 'Полное имя', value: auth.fullName || '—' },
                { icon: User, label: 'Организация', value: auth.organization || '—' },
                { icon: User, label: 'Email', value: auth.profile?.email || '—' },
                { icon: Lock, label: 'Уровень доступа', value: accessLabel },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: C.bg }}>
                  <row.icon size={15} style={{ color: C.placeholder, flexShrink: 0 }} />
                  <span className="text-xs flex-shrink-0" style={{ color: C.secondary, width: 120 }}>{row.label}</span>
                  <span className="text-sm font-medium" style={{ color: C.text }}>{row.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {[
                { label: 'Текущий пароль', value: currentPwd, onChange: setCurrentPwd, show: showCur, toggle: () => setShowCur(s => !s) },
                { label: 'Новый пароль', value: newPwd, onChange: setNewPwd, show: showNew, toggle: () => setShowNew(s => !s) },
                { label: 'Подтвердите новый пароль', value: confirmPwd, onChange: setConfirmPwd, show: showConf, toggle: () => setShowConf(s => !s) },
              ].map(f => (
                <div key={f.label} className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: C.secondary }}>{f.label}</label>
                  <div style={{ position: 'relative' }}>
                    <input type={f.show ? 'text' : 'password'} value={f.value} onChange={e => f.onChange(e.target.value)}
                      className="w-full px-3 pr-10 text-sm outline-none"
                      style={{ height: 36, borderRadius: 8, border: `1px solid ${C.border}`, color: C.text }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#409EFF' }}
                      onBlur={e => { e.currentTarget.style.borderColor = C.border }}
                    />
                    <button type="button" onClick={f.toggle}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      style={{ color: C.placeholder }}>
                      {f.show ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={handleChangePassword} disabled={saving}
                className="w-full h-10 rounded-xl text-sm font-semibold text-white mt-2"
                style={{ background: '#409EFF', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Сохранение...' : 'Сменить пароль'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Nav dropdown ───────────────────────────────────────── */
function NavDropdown({ isSuperuser, canAccessFunctions }: { isSuperuser: boolean; canAccessFunctions: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const items = NAV_ITEMS.filter(item => {
    if (item.adminOnly && !isSuperuser) return false
    if (item.requiresFunctionsAccess && !canAccessFunctions) return false
    return true
  })

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs transition-colors"
        style={{ border: '1px solid rgba(255,255,255,0.14)', color: open ? '#fff' : 'rgba(255,255,255,0.75)', background: open ? 'rgba(255,255,255,0.10)' : 'transparent' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = '#fff' }}
        onMouseLeave={e => {
          if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)' }
        }}>
        Разделы
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl overflow-hidden z-[150]"
          style={{ border: '1px solid #DCDFE6', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', top: '100%' }}>
          {items.map(item => (
            <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${isActive ? 'bg-[#ECF5FF] text-[#409EFF] font-medium' : 'text-[#303133] hover:bg-[#F5F7FA]'}`
              }>
              {item.label}
            </NavLink>
          ))}
          <div style={{ borderTop: '1px solid #DCDFE6' }} />
        </div>
      )}
    </div>
  )
}

/* ─── AppShell ───────────────────────────────────────────── */
export function AppShell() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [profileOpen, setProfileOpen] = useState(false)
  const systemTab = searchParams.get('system') || ''
  const isRequirementsRoute = location.pathname.startsWith('/requirements')

  const systemTabs = [
    { value: 'Система 112', label: 'Система 112' },
    { value: 'Система 101', label: 'Система 101' },
    { value: 'Телефония 112', label: 'Телефония 112' },
    { value: 'Телефония 101', label: 'Телефония 101' },
  ]

  const setSystemFilter = (value: string) => {
    const next = new URLSearchParams(searchParams)
    if (!value) next.delete('system')
    else next.set('system', value)
    setSearchParams(next)
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-5 py-0"
        style={{ height: 57, background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Left: logo + system tabs */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ background: '#409EFF' }}>
              R
            </div>
            <span className="text-white font-semibold text-sm tracking-wide">RFI.КИСУСС</span>
          </div>

          {isRequirementsRoute ? (
            <div className="flex gap-1 bg-slate-800 rounded-lg p-0.5">
              {systemTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setSystemFilter(systemTab === tab.value ? '' : tab.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    systemTab === tab.value
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : (
            <NavLink to="/requirements"
              className={({ isActive }) =>
                `flex items-center h-[57px] px-4 text-sm font-medium border-b-2 transition-colors ${isActive ? 'border-[#409EFF] text-[#409EFF]' : 'border-transparent text-slate-400 hover:text-slate-200'}`
              }>
              Реестр предложений
            </NavLink>
          )}
        </div>

        {/* Right: nav dropdown + user + logout */}
        <div className="flex items-center gap-3">
          <NavDropdown isSuperuser={auth.isSuperuser} canAccessFunctions={auth.canAccessFunctionsDirectory} />

          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="text-right px-1.5 py-0.5 rounded-md hover:bg-white/5 transition-colors"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
            title="Открыть профиль"
          >
            <div className="text-sm font-medium text-white leading-tight">{auth.fullName || '—'}</div>
            <div className="text-xs text-slate-400">{auth.organization || ''}</div>
          </button>

          {/* Avatar — click opens profile */}
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 transition-opacity hover:opacity-80"
            style={{ background: '#409EFF' }}
            title="Профиль"
          >
            {(auth.fullName || '?')[0].toUpperCase()}
          </button>

          <button
            type="button"
            onClick={() => { auth.logout(); navigate('/login') }}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.12)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Выйти
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>

      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  )
}
