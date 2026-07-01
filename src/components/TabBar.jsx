import { NavLink } from 'react-router-dom'

const tabs = [
  { ruta: '/gastos',      etiqueta: 'Gastos',        img: '/Waldo Gastos B.png' },
  { ruta: '/compartidos', etiqueta: 'Compartidos',   img: '/Waldo Compartidos.png' },
  { ruta: '/mas',         etiqueta: 'Configuración', img: '/Waldo Configuración.png' },
]

function TabBar() {
  return (
    <nav className="tabbar">
      {tabs.map((tab) => (
        <NavLink
          key={tab.ruta}
          to={tab.ruta}
          className={({ isActive }) => isActive ? 'tab tab--activo' : 'tab'}
        >
          {tab.img
            ? <img src={tab.img} alt={tab.etiqueta} className="tab__imagen" />
            : <span className="tab__icono">{tab.icono}</span>
          }
          <span className="tab__etiqueta">{tab.etiqueta}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default TabBar
