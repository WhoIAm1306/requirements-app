import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAdmin, RequireAuth, RequireFunctionsAccess, PublicOnly } from '@/auth/guards'
import { AppShell } from '@/components/layout/app-shell'
import { AdminUsersPage } from '@/pages/admin-users-page'
import { FunctionsDirectoryPage } from '@/pages/functions-directory-page'
import { GKDirectoryPage } from '@/pages/gk-directory-page'
import { LoginPage } from '@/pages/login-page'
import { RequirementsPage } from '@/pages/requirements-page'

/* Pages that need a scroll wrapper (not full-screen) */
function Scrollable({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {children}
    </div>
  )
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/requirements" replace />} />
          <Route
            path="/requirements"
            element={
              <Scrollable>
                <RequirementsPage />
              </Scrollable>
            }
          />
          <Route path="/gk-directory" element={<GKDirectoryPage />} />
          <Route element={<RequireFunctionsAccess />}>
            <Route
              path="/functions-directory"
              element={
                <Scrollable>
                  <FunctionsDirectoryPage />
                </Scrollable>
              }
            />
          </Route>
          <Route element={<RequireAdmin />}>
            <Route
              path="/admin/users"
              element={
                <Scrollable>
                  <AdminUsersPage />
                </Scrollable>
              }
            />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
