import { NavLink } from 'react-router-dom'

const tabsIzq = [
  { ruta: '/gastos',      etiqueta: 'Gastos',      icono: '💸' },
  { ruta: '/compartidos', etiqueta: 'Compartidos', icono: '🤝' },
]

const tabsDer = [
  { ruta: '/mas', etiqueta: 'Configuración', icono: '⚙️' },
]

function TabBar() {
  return (
    <nav className="tabbar">
      {tabsIzq.map((tab) => (
        <NavLink
          key={tab.ruta}
          to={tab.ruta}
          className={({ isActive }) => isActive ? 'tab tab--activo' : 'tab'}
        >
          <span className="tab__icono">{tab.icono}</span>
          <span className="tab__etiqueta">{tab.etiqueta}</span>
        </NavLink>
      ))}
      <div className="tabbar-fab-gap" />
      {tabsDer.map((tab) => (
        <NavLink
          key={tab.ruta}
          to={tab.ruta}
          className={({ isActive }) => isActive ? 'tab tab--activo' : 'tab'}
        >
          <span className="tab__icono">{tab.icono}</span>
          <span className="tab__etiqueta">{tab.etiqueta}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default TabBar
