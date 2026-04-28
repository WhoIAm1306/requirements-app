import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { login } from '@/api/auth'
import { useAuth } from '@/auth/auth-context'

export function LoginPage() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      setLoading(true)
      const data = await login({ email, password })
      auth.setAuth(data)
      toast.success('Вход выполнен')
      navigate('/requirements', { replace: true })
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{ background: '#0f172a' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg mb-3"
            style={{ background: '#409EFF' }}
          >
            Р
          </div>
          <h1 className="text-xl font-bold text-white">Requirements App</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Войдите в свою учётную запись
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl p-6 space-y-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Почта
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              autoComplete="email"
              className="w-full h-10 px-3.5 rounded-xl text-sm outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
              }}
              onFocus={(e) => { e.currentTarget.style.border = '1px solid #409EFF' }}
              onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full h-10 px-3.5 rounded-xl text-sm outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
              }}
              onFocus={(e) => { e.currentTarget.style.border = '1px solid #409EFF' }}
              onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 mt-2"
            style={{ background: '#409EFF' }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#66B1FF' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#409EFF' }}
          >
            {loading ? 'Входим...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )
}
