import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import TabBar from './components/TabBar'
import Gastos from './pages/Gastos'
import Compartidos from './pages/Compartidos'
import Mas from './pages/Mas'
import Login from './pages/Login'

function AppInterna() {
  const { usuario, cargando, avisoDesvinculado, setAvisoDesvinculado, avisoSaldado, setAvisoSaldado, marcarNotificacionLeida } = useAuth()

  if (cargando) return null

  if (!usuario) return <Login />

  return (
    <div className="app">
      {avisoDesvinculado && (
        <div className="aviso-desvinculado">
          <span>{avisoDesvinculado ? `${avisoDesvinculado} se desvinculó de tu cuenta` : 'Tu pareja se desvinculó de tu cuenta'}</span>
          <button onClick={() => setAvisoDesvinculado(null)}>✕</button>
        </div>
      )}
      {avisoSaldado && (
        <div className={`aviso-saldado ${avisoSaldado.tipo === 'reclamo' ? 'aviso-saldado--reclamo' : ''}`}>
          <span>
            {avisoSaldado.tipo === 'reclamo'
              ? `${avisoSaldado.nombre} te está reclamando la deuda`
              : `${avisoSaldado.nombre} te saldó la deuda`}
          </span>
          <button onClick={async () => {
            if (avisoSaldado?.id) await marcarNotificacionLeida(avisoSaldado.id)
            setAvisoSaldado(null)
          }}>✕</button>
        </div>
      )}
      <main className="contenido">
        <Routes>
          <Route path="/"            element={<Navigate to="/gastos" replace />} />
          <Route path="/gastos"      element={<Gastos />} />
          <Route path="/compartidos" element={<Compartidos />} />
          <Route path="/mas"         element={<Mas />} />
        </Routes>
      </main>
      <TabBar />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppInterna />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
