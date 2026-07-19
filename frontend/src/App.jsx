import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import ApplicantLayout from './components/layout/ApplicantLayout/ApplicantLayout';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Landing — lazy para aislar framer-motion fuera del bundle inicial
const LandingPage = lazy(() => import('./pages/Landing/LandingPage'));

// Páginas del dashboard de reclutador
const VacantesPage       = lazy(() => import('./pages/Vacantes/VacantesPage'));
const CandidatosPage     = lazy(() => import('./pages/Candidatos/CandidatosPage'));
const PanelPrincipalPage = lazy(() => import('./pages/PanelPrincipal/PanelPrincipalPage'));
const ConfiguracionPage  = lazy(() => import('./pages/Configuracion/ConfiguracionPage'));
const EstadisticasPage   = lazy(() => import('./pages/Estadisticas/EstadisticasPage'));

// Páginas de autenticación
const LoginPage              = lazy(() => import('./pages/Auth/LoginPage'));
const RegistroCandidatoPage  = lazy(() => import('./pages/Auth/RegistroCandidatoPage'));
const RegistroEmpresaPage    = lazy(() => import('./pages/Auth/RegistroEmpresaPage'));
const RecuperarContrasenaPage = lazy(() => import('./pages/Auth/RecuperarContrasenaPage'));
const AceptarInvitacionPage  = lazy(() => import('./pages/Auth/AceptarInvitacionPage'));
const ResetPasswordPage      = lazy(() => import('./pages/Auth/ResetPasswordPage'));

// Páginas del portal de aplicantes
const PerfilPage         = lazy(() => import('./pages/PortalAplicantes/PerfilPage'));
const InicioPage         = lazy(() => import('./pages/PortalAplicantes/InicioPage'));
const TrabajosPage       = lazy(() => import('./pages/PortalAplicantes/TrabajosPage'));
const DetallesPuestoPage = lazy(() => import('./pages/PortalAplicantes/DetallesPuestoPage'));
const MisAplicacionesPage = lazy(() => import('./pages/PortalAplicantes/MisAplicacionesPage'));
const NotificacionesPage = lazy(() => import('./pages/PortalAplicantes/NotificacionesPage'));

// Páginas legales
const PrivacidadPage = lazy(() => import('./pages/Legal/PrivacidadPage'));
const TerminosPage   = lazy(() => import('./pages/Legal/TerminosPage'));
const ContactoPage   = lazy(() => import('./pages/Legal/ContactoPage'));

// Página de error
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-applik-bg">
      <div className="size-10 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Landing page — sin layout */}
            <Route index element={<LandingPage />} />

            {/* Portal de aplicante: Público */}
            <Route element={<ApplicantLayout />}>
              <Route path='inicio' element={<InicioPage />} />
              <Route path='/trabajos' element={<TrabajosPage />}/>
              <Route path='/trabajo/:id' element={<DetallesPuestoPage />} />
              <Route path='/privacidad' element={<PrivacidadPage />} />
              <Route path='/terminos'   element={<TerminosPage />} />
              <Route path='/contacto'   element={<ContactoPage />} />
              <Route element={<ProtectedRoute allowedRoles={["aplicante", "reclutador", "admin"]} />}>
                <Route path='/perfil' element={<PerfilPage />} />
                <Route path='/aplicaciones' element={<MisAplicacionesPage />}/>
                <Route path='/notificaciones' element={<NotificacionesPage />}/>
              </Route>
            </Route>

            {/* Dashboard de reclutador: Protegido */}
            <Route
              path='/'
              element={
                <ProtectedRoute allowedRoles={["reclutador", "admin"]}>
                  <MainLayout/>
                </ProtectedRoute>
              }
            >
              <Route path='dashboard' element={<PanelPrincipalPage />} />
              <Route path='vacantes' element={<VacantesPage />} />
              <Route path='candidatos' element={<CandidatosPage />} />
              <Route path='estadistica' element={<EstadisticasPage />} />
              <Route path='configuracion' element={<ConfiguracionPage />} />
            </Route>

            {/* Auth — sin layout */}
            <Route path='/login' element={<LoginPage />} />
            <Route path='/registro' element={<RegistroCandidatoPage />} />
            <Route path='/registrar-empresa' element={<RegistroEmpresaPage />} />
            <Route path='/recuperar-contrasena' element={<RecuperarContrasenaPage />} />
            <Route path='/register/reclutador' element={<AceptarInvitacionPage />} />
            <Route path='/reset-password' element={<ResetPasswordPage />} />

            <Route path='*' element={<NotFoundPage />}/>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
