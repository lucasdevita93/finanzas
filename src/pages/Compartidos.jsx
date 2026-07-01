import { useState, useEffect } from 'react'
import FormularioGasto from '../components/FormularioGasto'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

function formatearFecha(fechaStr) {
  const [anio, mes, dia] = fechaStr.split('-')
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function mitadACargo(gasto) {
  const base = gasto.cuotas_total ? gasto.importe / gasto.cuotas_total : gasto.importe
  return base / 2
}

function PorCategoriaCompartidos({ gastos, categorias, onCerrar }) {
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null)
  const totalGeneral = gastos.reduce((sum, g) => sum + mitadACargo(g), 0)
  const porCategoria = Object.entries(
    gastos.reduce((acc, g) => {
      if (!acc[g.categoria_nombre]) acc[g.categoria_nombre] = 0
      acc[g.categoria_nombre] += mitadACargo(g)
      return acc
    }, {})
  ).map(([cat, total]) => ({ cat, total })).sort((a, b) => b.total - a.total)

  const gastosCat = categoriaSeleccionada ? gastos.filter(g => g.categoria_nombre === categoriaSeleccionada) : []
  const emoji = (nombre) => categorias.find(c => c.nombre === nombre)?.emoji ?? '📦'

  return (
    <>
      <div className="modal-overlay" onClick={onCerrar} />
      <div className="modal-panel">
        <div className="modal-header">
          <h2>Por categoría</h2>
          <button className="modal-cerrar" onClick={onCerrar}>✕</button>
        </div>
        {categoriaSeleccionada ? (
          <div className="panel-interior">
            <div className="panel-interior__header">
              <button className="boton-volver" onClick={() => setCategoriaSeleccionada(null)}>← Volver</button>
              <h3>{emoji(categoriaSeleccionada)} {categoriaSeleccionada}</h3>
            </div>
            <p className="detalle-total">Total: {formatearPesos(gastosCat.reduce((sum, g) => sum + mitadACargo(g), 0))}</p>
            <ul className="lista-gastos">
              {gastosCat.map(g => (
                <li key={g.id} className="gasto-item">
                  <span className="gasto-item__icono">{emoji(g.categoria_nombre)}</span>
                  <div className="gasto-item__info">
                    <span className="gasto-item__desc">{g.descripcion || g.categoria_nombre}</span>
                    <span className="gasto-item__fecha">{formatearFecha(g.fecha)} · Total: {formatearPesos(g.importe)}</span>
                    <span className="gasto-item__pagador">{g.esMio ? 'Pagaste vos' : `Pagó ${g.nombrePagador}`}</span>
                  </div>
                  <span className="gasto-item__importe">{formatearPesos(mitadACargo(g))}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="lista-categorias">
            {porCategoria.map(({ cat, total }) => {
              const porcentaje = totalGeneral > 0 ? Math.round((total / totalGeneral) * 100) : 0
              return (
                <li key={cat} className="categoria-item" onClick={() => setCategoriaSeleccionada(cat)}>
                  <span className="categoria-item__icono">{emoji(cat)}</span>
                  <div className="categoria-item__info">
                    <span className="categoria-item__nombre">{cat}</span>
                    <div className="categoria-item__barra-wrap">
                      <div className="categoria-item__barra" style={{ width: `${porcentaje}%` }} />
                    </div>
                  </div>
                  <div className="categoria-item__derecha">
                    <span className="categoria-item__total">{formatearPesos(total)}</span>
                    <span className="categoria-item__pct">{porcentaje}%</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}

function Compartidos() {
  const { perfil, pareja, categorias } = useAuth()
  const ahora = new Date()
  const [anio, setAnio] = useState(ahora.getFullYear())
  const [mes, setMes] = useState(ahora.getMonth())
  const [gastos, setGastos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [formularioAbierto, setFormularioAbierto] = useState(false)
  const [gastoEditando, setGastoEditando] = useState(null)
  const [porCategoriaAbierto, setPorCategoriaAbierto] = useState(false)

  useEffect(() => {
    if (!perfil) return
    cargarGastos()
  }, [anio, mes, perfil, pareja])

  async function cargarGastos() {
    setCargando(true)
    const desde = `${anio}-${String(mes + 1).padStart(2, '0')}-01`
    const hasta = mes === 11 ? `${anio + 1}-01-01` : `${anio}-${String(mes + 2).padStart(2, '0')}-01`

    const { data: mios } = await supabase
      .from('gastos')
      .select('*')
      .eq('user_id', perfil.id)
      .eq('compartido', true)
      .gte('fecha', desde)
      .lt('fecha', hasta)

    let dePareja = []
    if (pareja?.id) {
      const { data } = await supabase
        .from('gastos')
        .select('*')
        .eq('user_id', pareja.id)
        .eq('compartido', true)
        .gte('fecha', desde)
        .lt('fecha', hasta)
      dePareja = data ?? []
    }

    const normalizados = [
      ...(mios ?? []).map(g => ({ ...g, esMio: true, nombrePagador: perfil.nombre })),
      ...dePareja.map(g => ({ ...g, esMio: false, nombrePagador: pareja?.nombre ?? 'Tu pareja' })),
    ].sort((a, b) => b.fecha.localeCompare(a.fecha))

    setGastos(normalizados)
    setCargando(false)
  }

  function mesAnterior() {
    if (mes === 0) { setMes(11); setAnio(a => a - 1) } else setMes(m => m - 1)
  }
  function mesSiguiente() {
    if (mes === 11) { setMes(0); setAnio(a => a + 1) } else setMes(m => m + 1)
  }

  const nombreMes = `${new Date(anio, mes).toLocaleString('es-AR', { month: 'long' })} ${anio}`

  const totalMio = gastos.filter(g => g.esMio).reduce((sum, g) => {
    return sum + (g.cuotas_total ? g.importe / g.cuotas_total : g.importe)
  }, 0)
  const totalPareja = gastos.filter(g => !g.esMio).reduce((sum, g) => {
    return sum + (g.cuotas_total ? g.importe / g.cuotas_total : g.importe)
  }, 0)
  const totalCompartido = totalMio + totalPareja
  const saldo = (totalMio - totalPareja) / 2
  const saldoPositivo = saldo > 0.5
  const saldoNegativo = saldo < -0.5
  const nombrePareja = pareja?.nombre ?? 'Tu pareja'

  if (!perfil?.pareja_id) {
    return (
      <div className="pagina compartidos">
        <h1>Compartidos</h1>
        <p className="sin-gastos" style={{ marginTop: '3rem' }}>
          Vinculá tu cuenta desde <strong>Configuración</strong> para ver los gastos compartidos.
        </p>
      </div>
    )
  }

  return (
    <div className="pagina compartidos">
      <h1>Compartidos</h1>

      <div className="mes-nav">
        <button className="mes-nav__flecha" onClick={mesAnterior}>‹</button>
        <span className="mes-nav__nombre">{nombreMes}</span>
        <button className="mes-nav__flecha" onClick={mesSiguiente}>›</button>
      </div>

      <div className="tarjeta">
        <p className="tarjeta__label">Total gastado entre los dos</p>
        <p className="tarjeta__monto">{cargando ? '...' : formatearPesos(totalCompartido)}</p>
        <p className="tarjeta__detalle">cada uno debería haber puesto {formatearPesos(totalCompartido / 2)}</p>
      </div>

      <div className={`tarjeta ${saldoPositivo ? 'tarjeta--verde' : saldoNegativo ? 'tarjeta--rojo' : ''}`}>
        <p className="tarjeta__label">
          {saldoPositivo ? `${nombrePareja} te debe` : saldoNegativo ? `Le debés a ${nombrePareja}` : 'Están a mano'}
        </p>
        <p className={`tarjeta__monto ${saldoPositivo ? 'saldo--positivo' : saldoNegativo ? 'saldo--negativo' : ''}`}>
          {saldo === 0 ? '🤝' : formatearPesos(Math.abs(saldo))}
        </p>
      </div>

      <div className="botones-analisis">
        <button className="boton-analisis" onClick={() => setPorCategoriaAbierto(true)}>
          <span className="boton-analisis__icono-wrap">
            <span className="boton-analisis__icono">📊</span>
            <span className="boton-analisis__filtro">🔽</span>
          </span>
          <span className="boton-analisis__texto">Categoría</span>
        </button>
      </div>

      <div className="seccion">
        <h3 className="seccion__titulo">Detalle</h3>
        {cargando ? (
          <p className="sin-gastos">Cargando...</p>
        ) : gastos.length === 0 ? (
          <p className="sin-gastos">No hay gastos compartidos este mes</p>
        ) : (
          <ul className="lista-gastos">
            {gastos.map(gasto => {
              const cat = categorias.find(c => c.nombre === gasto.categoria_nombre)
              const importeCuota = gasto.cuotas_total ? gasto.importe / gasto.cuotas_total : gasto.importe
              return (
                <li
                  key={gasto.id}
                  className="gasto-item"
                  onClick={gasto.esMio ? () => { setGastoEditando(gasto); setFormularioAbierto(true) } : undefined}
                  style={gasto.esMio ? { cursor: 'pointer' } : undefined}
                >
                  <span className="gasto-item__icono">{cat?.emoji ?? '📦'}</span>
                  <div className="gasto-item__info">
                    <span className="gasto-item__desc">{gasto.descripcion || gasto.categoria_nombre}</span>
                    <span className="gasto-item__fecha">
                      {formatearFecha(gasto.fecha)} · Total: {formatearPesos(importeCuota)}
                      {gasto.cuotas_total && ` · Cuota ${gasto.cuota_numero}/${gasto.cuotas_total}`}
                    </span>
                    <span className="gasto-item__pagador">
                      {gasto.esMio ? 'Pagaste vos' : `Pagó ${gasto.nombrePagador}`}
                    </span>
                  </div>
                  <span className="gasto-item__importe">{formatearPesos(mitadACargo(gasto))}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <button
        className="boton-fab boton-fab--verde"
        onClick={() => { setGastoEditando(null); setFormularioAbierto(true) }}
        aria-label="Cargar gasto compartido"
      >
        <span className="boton-fab__plus">÷</span>
        <span className="boton-fab__label">Gasto</span>
      </button>

      {formularioAbierto && (
        <FormularioGasto
          onCerrar={() => { setFormularioAbierto(false); setGastoEditando(null) }}
          onGuardado={cargarGastos}
          gastoInicial={gastoEditando}
          compartidoPorDefault={true}
          titulo={gastoEditando ? null : 'Nuevo gasto compartido'}
        />
      )}

      {porCategoriaAbierto && (
        <PorCategoriaCompartidos
          gastos={gastos}
          categorias={categorias}
          onCerrar={() => setPorCategoriaAbierto(false)}
        />
      )}
    </div>
  )
}

export default Compartidos
