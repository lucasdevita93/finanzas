import { useState } from 'react'
import { iconoDeCategoria, USUARIO_ACTUAL, OTRO_USUARIO } from '../lib/datos'

function aCargo(gasto) {
  const base = gasto.cuotas_total ? gasto.importe / gasto.cuotas_total : gasto.importe
  return gasto.compartido ? base / 2 : base
}

function subtituloGasto(gasto) {
  const partes = []
  if (gasto.cuotas_total || gasto.compartido) partes.push(`Total: ${formatearPesos(gasto.importe)}`)
  if (gasto.cuotas_total) partes.push(`Cuota ${gasto.cuota_actual}/${gasto.cuotas_total}`)
  return partes.join(' · ')
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

function formatearFecha(fechaStr) {
  const [anio, mes, dia] = fechaStr.split('-')
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function DetalleCategoria({ categoria, gastos, onVolver }) {
  const gastosCategoria = gastos.filter(g => g.categoria === categoria)
  const totalCategoria = gastosCategoria.reduce((sum, g) => sum + aCargo(g), 0)

  return (
    <div className="panel-interior">
      <div className="panel-interior__header">
        <button className="boton-volver" onClick={onVolver}>← Volver</button>
        <h3>{iconoDeCategoria(categoria)} {categoria}</h3>
      </div>
      <p className="detalle-total">Total: {formatearPesos(totalCategoria)}</p>
      <ul className="lista-gastos">
        {gastosCategoria.map((gasto) => (
          <li key={gasto.id} className="gasto-item">
            <span className="gasto-item__icono">{gasto.icono}</span>
            <div className="gasto-item__info">
              <span className="gasto-item__desc">{gasto.descripcion}</span>
              <span className="gasto-item__fecha">
                {formatearFecha(gasto.fecha)} · {gasto.compartido && gasto.pagador !== USUARIO_ACTUAL ? `Pagó ${OTRO_USUARIO}` : gasto.medio_de_pago}
                {subtituloGasto(gasto) && ` · ${subtituloGasto(gasto)}`}
              </span>
            </div>
            <div className="gasto-item__derecha">
              <span className="gasto-item__importe">{formatearPesos(aCargo(gasto))}</span>
              {gasto.compartido && <span className="gasto-item__badge">compartido</span>}
            </div>
          </li>
        ))}
        {gastosCategoria.length === 0 && (
          <p className="sin-gastos">No hay gastos en este mes</p>
        )}
      </ul>
    </div>
  )
}

function PorCategoria({ todosLosGastos, mesInicial, anioInicial, onCerrar }) {
  const [anio, setAnio] = useState(anioInicial)
  const [mes, setMes] = useState(mesInicial)
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null)

  function mesAnterior() {
    if (mes === 0) { setMes(11); setAnio(a => a - 1) }
    else setMes(m => m - 1)
    setCategoriaSeleccionada(null)
  }

  function mesSiguiente() {
    if (mes === 11) { setMes(0); setAnio(a => a + 1) }
    else setMes(m => m + 1)
    setCategoriaSeleccionada(null)
  }

  const nombreMes = new Date(anio, mes).toLocaleString('es-AR', { month: 'long', year: 'numeric' })

  const gastosMes = todosLosGastos.filter(g => {
    const [a, m] = g.fecha.split('-').map(Number)
    return a === anio && m === mes + 1
  })

  const totalGeneral = gastosMes.reduce((sum, g) => sum + aCargo(g), 0)

  const porCategoria = Object.entries(
    gastosMes.reduce((acc, g) => {
      if (!acc[g.categoria]) acc[g.categoria] = 0
      acc[g.categoria] += aCargo(g)
      return acc
    }, {})
  )
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total)

  return (
    <>
      <div className="modal-overlay" onClick={onCerrar} />
      <div className="modal-panel">

        <div className="modal-header">
          <h2>Por categoría</h2>
          <button className="modal-cerrar" onClick={onCerrar}>✕</button>
        </div>

        {/* Navegación de mes propia del panel */}
        <div className="mes-nav mes-nav--panel">
          <button className="mes-nav__flecha" onClick={mesAnterior}>‹</button>
          <span className="mes-nav__nombre">{nombreMes}</span>
          <button className="mes-nav__flecha" onClick={mesSiguiente}>›</button>
        </div>

        {categoriaSeleccionada ? (
          <DetalleCategoria
            categoria={categoriaSeleccionada}
            gastos={gastosMes}
            onVolver={() => setCategoriaSeleccionada(null)}
          />
        ) : porCategoria.length === 0 ? (
          <p className="sin-gastos">No hay gastos en este mes</p>
        ) : (
          <ul className="lista-categorias">
            {porCategoria.map(({ categoria, total }) => {
              const porcentaje = totalGeneral > 0 ? Math.round((total / totalGeneral) * 100) : 0
              return (
                <li key={categoria} className="categoria-item" onClick={() => setCategoriaSeleccionada(categoria)}>
                  <span className="categoria-item__icono">{iconoDeCategoria(categoria)}</span>
                  <div className="categoria-item__info">
                    <span className="categoria-item__nombre">{categoria}</span>
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

export default PorCategoria
