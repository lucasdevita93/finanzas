import { useState } from 'react'
import FormularioGasto from '../components/FormularioGasto'
import { MEDIOS_DE_PAGO as MEDIOS_INICIALES, CATEGORIAS as CATEGORIAS_INICIALES, USUARIO_ACTUAL, OTRO_USUARIO } from '../lib/datos'

// Datos de ejemplo — se reemplazan por Supabase en el Paso 4
const PERFIL_EJEMPLO = {
  nombre: USUARIO_ACTUAL,
  foto: null,
  vinculadoCon: OTRO_USUARIO,
}

const RECURRENTES_EJEMPLO = [
  { id: 1, descripcion: 'Netflix',  icono: '📱', categoria: 'Suscripciones',    medio_de_pago: 'Tarjeta Crédito Mercado Pago', compartido: true,  responsable: 'Lucas', importe: 3200   },
  { id: 2, descripcion: 'Gym',      icono: '💆', categoria: 'Cuidado Personal', medio_de_pago: 'Efectivo',                    compartido: false, responsable: 'Lucas', importe: 8000   },
  { id: 3, descripcion: 'Alquiler', icono: '🏠', categoria: 'Hogar',            medio_de_pago: 'Efectivo',                    compartido: true,  responsable: 'Sofi',  importe: 150000 },
]

function Mas() {
  const [medios, setMedios] = useState(MEDIOS_INICIALES)
  const [categorias, setCategorias] = useState(CATEGORIAS_INICIALES)
  const [recurrentes, setRecurrentes] = useState(RECURRENTES_EJEMPLO)
  const [nuevoMedio, setNuevoMedio] = useState({ nombre: '', esCredito: false })
  const [nuevaCategoria, setNuevaCategoria] = useState({ nombre: '', icono: '' })
  const [seccionAbierta, setSeccionAbierta] = useState(null)
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(null) // { tipo, id }
  const [recurrenteEditando, setRecurrenteEditando] = useState(null)

  function agregarMedio() {
    if (!nuevoMedio.nombre.trim()) return
    setMedios(prev => [...prev, { id: Date.now(), nombre: nuevoMedio.nombre.trim(), esCredito: nuevoMedio.esCredito }])
    setNuevoMedio({ nombre: '', esCredito: false })
  }

  function eliminarMedio(id) {
    setMedios(prev => prev.filter(m => m.id !== id))
    setConfirmandoEliminar(null)
  }

  function agregarCategoria() {
    if (!nuevaCategoria.nombre.trim()) return
    setCategorias(prev => [...prev, { id: Date.now(), ...nuevaCategoria }])
    setNuevaCategoria({ nombre: '', icono: '' })
  }

  function eliminarCategoria(id) {
    setCategorias(prev => prev.filter(c => c.id !== id))
    setConfirmandoEliminar(null)
  }

  function eliminarRecurrente(id) {
    setRecurrentes(prev => prev.filter(r => r.id !== id))
    setConfirmandoEliminar(null)
  }

  function toggleSeccion(nombre) {
    setSeccionAbierta(prev => prev === nombre ? null : nombre)
  }

  return (
    <div className="pagina config">

      <h1>Configuración</h1>

      {/* Perfil */}
      <div className="config-seccion">
        <div className="config-perfil">
          <div className="config-perfil__avatar">
            {PERFIL_EJEMPLO.foto
              ? <img src={PERFIL_EJEMPLO.foto} alt="foto" />
              : <span>{PERFIL_EJEMPLO.nombre[0]}</span>
            }
          </div>
          <div className="config-perfil__info">
            <p className="config-perfil__nombre">{PERFIL_EJEMPLO.nombre}</p>
            <p className="config-perfil__vinculo">
              Vinculado con {PERFIL_EJEMPLO.vinculadoCon}
            </p>
          </div>
          <button className="config-perfil__editar">Editar</button>
        </div>
      </div>

      {/* Medios de pago */}
      <div className="config-seccion">
        <button
          className="config-seccion__header"
          onClick={() => toggleSeccion('medios')}
        >
          <span>💳 Medios de pago</span>
          <span>{seccionAbierta === 'medios' ? '▲' : '▼'}</span>
        </button>

        {seccionAbierta === 'medios' && (
          <div className="config-seccion__contenido">
            <ul className="config-lista">
              {medios.map(medio => (
                <li key={medio.id} className="config-lista__item">
                  <span>
                    {medio.nombre}
                    {medio.esCredito && <span className="medio-badge-credito">crédito</span>}
                  </span>
                  {confirmandoEliminar?.tipo === 'medio' && confirmandoEliminar.id === medio.id ? (
                    <div className="config-confirmar-eliminar">
                      <span>¿Eliminar?</span>
                      <button className="config-confirmar-eliminar__si" onClick={() => eliminarMedio(medio.id)}>Sí</button>
                      <button className="config-confirmar-eliminar__no" onClick={() => setConfirmandoEliminar(null)}>No</button>
                    </div>
                  ) : (
                    <button className="config-lista__eliminar" onClick={() => setConfirmandoEliminar({ tipo: 'medio', id: medio.id })}>✕</button>
                  )}
                </li>
              ))}
            </ul>
            <div className="config-agregar">
              <input
                type="text"
                placeholder="Ej: Tarjeta Visa BBVA"
                value={nuevoMedio.nombre}
                onChange={e => setNuevoMedio(prev => ({ ...prev, nombre: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && agregarMedio()}
              />
              <button
                type="button"
                className={`chip-credito ${nuevoMedio.esCredito ? 'chip-credito--activo' : ''}`}
                onClick={() => setNuevoMedio(prev => ({ ...prev, esCredito: !prev.esCredito }))}
              >
                💳 Es tarjeta de crédito
              </button>
              <button onClick={agregarMedio}>+ Agregar</button>
            </div>
          </div>
        )}
      </div>

      {/* Categorías */}
      <div className="config-seccion">
        <button
          className="config-seccion__header"
          onClick={() => toggleSeccion('categorias')}
        >
          <span>📊 Categorías</span>
          <span>{seccionAbierta === 'categorias' ? '▲' : '▼'}</span>
        </button>

        {seccionAbierta === 'categorias' && (
          <div className="config-seccion__contenido">
            <ul className="config-lista">
              {categorias.map(cat => (
                <li key={cat.id} className="config-lista__item">
                  <span>{cat.icono} {cat.nombre}</span>
                  {confirmandoEliminar?.tipo === 'categoria' && confirmandoEliminar.id === cat.id ? (
                    <div className="config-confirmar-eliminar">
                      <span>¿Eliminar?</span>
                      <button className="config-confirmar-eliminar__si" onClick={() => eliminarCategoria(cat.id)}>Sí</button>
                      <button className="config-confirmar-eliminar__no" onClick={() => setConfirmandoEliminar(null)}>No</button>
                    </div>
                  ) : (
                    <button className="config-lista__eliminar" onClick={() => setConfirmandoEliminar({ tipo: 'categoria', id: cat.id })}>✕</button>
                  )}
                </li>
              ))}
            </ul>
            <div className="config-agregar config-agregar--categoria">
              <input
                type="text"
                placeholder="Ícono (ej: 🏋️)"
                value={nuevaCategoria.icono}
                onChange={e => setNuevaCategoria(prev => ({ ...prev, icono: e.target.value }))}
              />
              <input
                type="text"
                placeholder="Nombre de categoría"
                value={nuevaCategoria.nombre}
                onChange={e => setNuevaCategoria(prev => ({ ...prev, nombre: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && agregarCategoria()}
              />
              <button onClick={agregarCategoria}>+ Agregar</button>
            </div>
          </div>
        )}
      </div>

      {/* Gastos recurrentes */}
      <div className="config-seccion">
        <button className="config-seccion__header" onClick={() => toggleSeccion('recurrentes')}>
          <span>📋 Gastos recurrentes</span>
          <span>{seccionAbierta === 'recurrentes' ? '▲' : '▼'}</span>
        </button>
        {seccionAbierta === 'recurrentes' && (
          <div className="config-seccion__contenido">
            {recurrentes.length === 0 ? (
              <p className="sin-gastos">No tenés gastos recurrentes configurados</p>
            ) : (
              <ul className="config-lista">
                {recurrentes.map(r => (
                  <li key={r.id} className="config-lista__item">
                    <span className="config-lista__item-texto">
                      {r.icono} {r.descripcion}
                      {r.compartido && <span className="medio-badge-credito">{r.responsable === USUARIO_ACTUAL ? 'vos pagás' : `paga ${r.responsable}`}</span>}
                    </span>
                    <div className="config-lista__acciones">
                      <button
                        className="config-lista__editar"
                        onClick={() => setRecurrenteEditando(r)}
                      >✏️</button>
                      {confirmandoEliminar?.tipo === 'recurrente' && confirmandoEliminar.id === r.id ? (
                        <div className="config-confirmar-eliminar">
                          <span>¿Eliminar?</span>
                          <button className="config-confirmar-eliminar__si" onClick={() => eliminarRecurrente(r.id)}>Sí</button>
                          <button className="config-confirmar-eliminar__no" onClick={() => setConfirmandoEliminar(null)}>No</button>
                        </div>
                      ) : (
                        <button className="config-lista__eliminar" onClick={() => setConfirmandoEliminar({ tipo: 'recurrente', id: r.id })}>✕</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Cerrar sesión */}
      <button className="boton-cerrar-sesion">
        Cerrar sesión
      </button>

      {recurrenteEditando && (
        <FormularioGasto
          onCerrar={() => setRecurrenteEditando(null)}
          gastoInicial={{
            ...recurrenteEditando,
            fecha: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })(),
            recurrente: true,
            tiene_cuotas: false,
            cuotas: '',
          }}
        />
      )}

    </div>
  )
}

export default Mas
