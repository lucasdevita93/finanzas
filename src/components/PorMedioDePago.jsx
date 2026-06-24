import { useState } from 'react'
import { MEDIOS_DE_PAGO, USUARIO_ACTUAL, OTRO_USUARIO } from '../lib/datos'

const LABEL_OTRO = `Pagó ${OTRO_USUARIO}`

function iconoDeMedio(nombre) {
  return MEDIOS_DE_PAGO.find(m => m.nombre === nombre)?.icono ?? '💳'
}

function aCargo(gasto) {
  const base = gasto.cuotas_total ? gasto.importe / gasto.cuotas_total : gasto.importe
  return gasto.compartido ? base / 2 : base
}

function subtituloGasto(gasto) {
  const partes = []
  if (gasto.moneda === 'USD' && gasto.monto_original) partes.push(`USD $${gasto.monto_original}`)
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

function DetalleMedioDePago({ medio, gastos, onVolver }) {
  const gastosMedio = medio === LABEL_OTRO
    ? gastos.filter(g => g.compartido && g.pagador !== USUARIO_ACTUAL)
    : gastos.filter(g => g.medio_de_pago === medio && g.pagador === USUARIO_ACTUAL)

  const totalMedio = gastosMedio.reduce((sum, g) => sum + aCargo(g), 0)

  return (
    <div className="panel-interior">
      <div className="panel-interior__header">
        <button className="boton-volver" onClick={onVolver}>← Volver</button>
        <h3>{medio === LABEL_OTRO ? '🤝' : iconoDeMedio(medio)} {medio}</h3>
      </div>
      <p className="detalle-total">Total: {formatearPesos(totalMedio)}</p>
      <ul className="lista-gastos">
        {gastosMedio.map((gasto) => (
          <li key={gasto.id} className="gasto-item">
            <span className="gasto-item__icono">{gasto.icono}</span>
            <div className="gasto-item__info">
              <span className="gasto-item__desc">{gasto.descripcion}</span>
              <span className="gasto-item__fecha">
                {formatearFecha(gasto.fecha)} · {gasto.categoria}
                {subtituloGasto(gasto) && ` · ${subtituloGasto(gasto)}`}
              </span>
            </div>
            <div className="gasto-item__derecha">
              <span className="gasto-item__importe">{formatearPesos(aCargo(gasto))}</span>
              {gasto.compartido && <span className="gasto-item__badge">compartido</span>}
            </div>
          </li>
        ))}
        {gastosMedio.length === 0 && (
          <p className="sin-gastos">No hay gastos en este mes</p>
        )}
      </ul>
    </div>
  )
}

function PorMedioDePago({ todosLosGastos, mesInicial, anioInicial, onCerrar }) {
  const [anio, setAnio] = useState(anioInicial)
  const [mes, setMes] = useState(mesInicial)
  const [medioSeleccionado, setMedioSeleccionado] = useState(null)

  function mesAnterior() {
    if (mes === 0) { setMes(11); setAnio(a => a - 1) }
    else setMes(m => m - 1)
    setMedioSeleccionado(null)
  }

  function mesSiguiente() {
    if (mes === 11) { setMes(0); setAnio(a => a + 1) }
    else setMes(m => m + 1)
    setMedioSeleccionado(null)
  }

  const nombreMes = new Date(anio, mes).toLocaleString('es-AR', { month: 'long', year: 'numeric' })

  const gastosMes = todosLosGastos.filter(g => {
    const [a, m] = g.fecha.split('-').map(Number)
    return a === anio && m === mes + 1
  })

  // Solo los gastos que pagó el usuario actual
  const gastosLucas = gastosMes.filter(g => g.pagador === USUARIO_ACTUAL)

  // Gastos compartidos que pagó Sofi (para el grupo especial)
  const gastosSofi = gastosMes.filter(g => g.compartido && g.pagador !== USUARIO_ACTUAL)
  const totalSofi = gastosSofi.reduce((sum, g) => sum + aCargo(g), 0)

  // Agrupación por medio de pago (solo los de Lucas)
  const porMedioMap = gastosLucas.reduce((acc, g) => {
    if (!acc[g.medio_de_pago]) acc[g.medio_de_pago] = 0
    acc[g.medio_de_pago] += aCargo(g)
    return acc
  }, {})

  const porMedio = Object.entries(porMedioMap)
    .map(([medio, total]) => ({ medio, total }))
    .sort((a, b) => b.total - a.total)

  // Si hay gastos de Sofi, agregar el grupo al final
  if (totalSofi > 0) {
    porMedio.push({ medio: LABEL_OTRO, total: totalSofi })
  }

  const totalGeneral = porMedio.reduce((sum, { total }) => sum + total, 0)

  return (
    <>
      <div className="modal-overlay" onClick={onCerrar} />
      <div className="modal-panel">

        <div className="modal-header">
          <h2>Por medio de pago</h2>
          <button className="modal-cerrar" onClick={onCerrar}>✕</button>
        </div>

        <div className="mes-nav mes-nav--panel">
          <button className="mes-nav__flecha" onClick={mesAnterior}>‹</button>
          <span className="mes-nav__nombre">{nombreMes}</span>
          <button className="mes-nav__flecha" onClick={mesSiguiente}>›</button>
        </div>

        {medioSeleccionado ? (
          <DetalleMedioDePago
            medio={medioSeleccionado}
            gastos={gastosMes}
            onVolver={() => setMedioSeleccionado(null)}
          />
        ) : porMedio.length === 0 ? (
          <p className="sin-gastos">No hay gastos en este mes</p>
        ) : (
          <ul className="lista-categorias">
            {porMedio.map(({ medio, total }) => {
              const porcentaje = totalGeneral > 0 ? Math.round((total / totalGeneral) * 100) : 0
              const esSofi = medio === LABEL_OTRO
              return (
                <li key={medio} className="categoria-item" onClick={() => setMedioSeleccionado(medio)}>
                  <span className="categoria-item__icono">{esSofi ? '🤝' : iconoDeMedio(medio)}</span>
                  <div className="categoria-item__info">
                    <span className="categoria-item__nombre">{medio}</span>
                    <div className="categoria-item__barra-wrap">
                      <div className={`categoria-item__barra ${esSofi ? 'categoria-item__barra--sofi' : ''}`} style={{ width: `${porcentaje}%` }} />
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

export default PorMedioDePago
