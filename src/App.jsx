import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import TabBar from './components/TabBar'
import Gastos from './pages/Gastos'
import Compartidos from './pages/Compartidos'
import Mas from './pages/Mas'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
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
    </BrowserRouter>
  )
}

export default App
