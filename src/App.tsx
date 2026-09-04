import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import Login from '@/pages/Login'
import FinanceDashboard from '@/pages/FinanceDashboard'
import TeamPlaceholder from '@/pages/TeamPlaceholder'

function RequireAuth({ children }: { children: ReactNode }) {
  const session = useAuth((s) => s.session)
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const session = useAuth((s) => s.session)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/finance"
          element={
            <RequireAuth>
              <FinanceDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/product"
          element={
            <RequireAuth>
              <TeamPlaceholder team="product" />
            </RequireAuth>
          }
        />
        <Route
          path="/sales"
          element={
            <RequireAuth>
              <TeamPlaceholder team="sales" />
            </RequireAuth>
          }
        />
        <Route
          path="/engineering"
          element={
            <RequireAuth>
              <TeamPlaceholder team="engineering" />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to={session ? `/${session.team}` : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
