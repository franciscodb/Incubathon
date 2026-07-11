import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { InstallPWA } from './components/InstallPWA'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import BusinessForm from './pages/BusinessForm'
import ProcedureDetail from './pages/ProcedureDetail'
import Marketplace from './pages/Marketplace'
import ProfessionalDetail from './pages/ProfessionalDetail'
import ProfessionalProfile from './pages/ProfessionalProfile'
import UserProfile from './pages/UserProfile'
import Pricing from './pages/Pricing'
import CheckoutSuccess from './pages/CheckoutSuccess'
import { Privacy, Terms } from './pages/Legal'

export default function App() {
  return (
    <>
      <InstallPWA />
      <Routes>
      {/* Público */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      <Route path="/privacidad" element={<Privacy />} />
      <Route path="/terminos" element={<Terms />} />

      {/* Área autenticada */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Dueño de negocio */}
        <Route path="/app" element={<Dashboard />} />
        <Route path="/negocio/nuevo" element={<BusinessForm />} />
        <Route path="/negocio/:id/editar" element={<BusinessForm />} />
        <Route path="/negocio/:businessId/tramite/:code" element={<ProcedureDetail />} />
        <Route path="/perfil" element={<UserProfile />} />
        <Route path="/precios" element={<Pricing />} />
        <Route path="/precios/exito" element={<CheckoutSuccess />} />

        {/* Marketplace (ambos roles) */}
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/profesional/:id" element={<ProfessionalDetail />} />

        {/* Profesional */}
        <Route path="/pro/perfil" element={<ProfessionalProfile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
