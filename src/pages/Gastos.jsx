import { useState } from 'react'
import FormularioGasto from '../components/FormularioGasto'
import PorCategoria from '../components/PorCategoria'
import PorMedioDePago from '../components/PorMedioDePago'
import RecurrentesPendientes from '../components/RecurrentesPendientes'
import { USUARIO_ACTUAL, OTRO_USUARIO } from '../lib/datos'

// Datos de ejemplo — se reemplazan por Supabase en el Paso 4
const GASTOS_EJEMPLO = [
  // Gastos de Lucas (personales y compartidos que pagó él)
  { id: 1, descripcion: 'Supermercado Coto',  categoria: 'Víveres',           icono: '🛒', importe: 8500,  compartido: true,  pagador: 'Lucas', medio_de_pago: 'Tarjeta Visa BBVA',           fecha: '2026-06-20', cuotas_total: null, cuota_actual: null },
  { id: 2, descripcion: 'Netflix',             categoria: 'Suscripciones',     icono: '📱', importe: 15750, compartido: false, pagador: 'Lucas', medio_de_pago: 'Tarjeta Crédito Mercado Pago', fecha: '2026-06-20', cuotas_total: null, cuota_actual: null, moneda: 'USD', monto_original: 15, cotizacion: 1050 },
  { id: 3, descripcion: 'Nafta',               categoria: 'Vehículos',         icono: '🚗', importe: 15000, compartido: true,  pagador: 'Sofi',  medio_de_pago: 'Efectivo',                    fecha: '2026-06-17', cuotas_total: null, cuota_actual: null },
  { id: 4, descripcion: 'Restaurante',         categoria: 'Salidas',           icono: '🍻', importe: 12000, compartido: true,  pagador: 'Lucas', medio_de_pago: 'Tarjeta Visa BBVA',           fecha: '2026-06-15', cuotas_total: 3,    cuota_actual: 1    },
  { id: 5, descripcion: 'Farmacia',            categoria: 'Cuidado Personal',  icono: '💆', importe: 4200,  compartido: false, pagador: 'Lucas', medio_de_pago: 'Efectivo',                    fecha: '2026-06-12', cuotas_total: null, cuota_actual: null },
  { id: 6, descripcion: 'Notebook',            categoria: 'Compras personales',icono: '🛍️', importe: 90000, compartido: false, pagador: 'Lucas', medio_de_pago: 'Tarjeta Visa BBVA',           fecha: '2026-06-10', cuotas_total: 6,    cuota_actual: 2    },
  { id: 7, descripcion: 'Televisor',           categoria: 'Hogar',             icono: '🏠', importe: 120000,compartido: true,  pagador: 'Lucas', medio_de_pago: 'Tarjeta Crédito Mercado Pago', fecha: '2026-06-05', cuotas_total: 6,    cuota_actual: 1    },
  // Gastos compartidos que pagó Sofi — visibles en la lista pero agrupados como "Pagó Sofi" en Por medio de pago
  { id: 8, descripcion: 'Alquiler',            categoria: 'Hogar',             icono: '🏠', importe: 150000,compartido: true,  pagador: 'Sofi',  medio_de_pago: 'Efectivo',                    fecha: '2026-06-01', cuotas_total: null, cuota_actual: null },
  { id: 9, descripcion: 'Expensas',            categoria: 'Hogar',             icono: '🏠', importe: 28000, compartido: true,  pagador: 'Sofi',  medio_de_pago: 'Efectivo',                    fecha: '2026-06-01', cuotas_total: null, cuota_actual: null },
]

// Devuelve el importe que le corresponde al usuario para un gasto
function importeUsuario(g) {
  const base = g.cuotas_total ? g.importe / g.cuotas_total : g.importe
  return g.compartido ? base / 2 : base
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

// Agrupa una lista de gastos por fecha, devuelve array ordenado de { fecha, gastos[] }
function agruparPorFecha(gastos) {
  const mapa = {}
  gastos.forEach((g) => {
    if (!mapa[g.fecha]) mapa[g.fecha] = []
    mapa[g.fecha].push(g)
  })
  return Object.entries(mapa)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([fecha, gastos]) => ({ fecha, gastos }))
}

function formatearFecha(fechaStr) {
  const [anio, mes, dia] = fechaStr.split('-')
  const fecha = new Date(anio, mes - 1, dia)
  return fecha.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function Gastos() {
  const ahora = new Date()
  const [anio, setAnio] = useState(ahora.getFullYear())
  const [mes, setMes] = useState(ahora.getMonth()) // 0-11
  const [formularioAbierto, setFormularioAbierto] = useState(false)
  const [gastoEditando, setGastoEditando] = useState(null)
  const [porCategoriaAbierto, setPorCategoriaAbierto] = useState(false)
  const [porMedioDePagoAbierto, setPorMedioDePagoAbierto] = useState(false)
  const [recurrentesAbierto, setRecurrentesAbierto] = useState(false)

  // Simula que hay recurrentes pendientes este mes — con Supabase esto viene de la DB
  const recurrentesPendientes = 3

  function abrirEdicion(gasto) {
    setGastoEditando(gasto)
    setFormularioAbierto(true)
  }

  function cerrarFormulario() {
    setFormularioAbierto(false)
    setGastoEditando(null)
  }

  function mesAnterior() {
    if (mes === 0) { setMes(11); setAnio(a => a - 1) }
    else setMes(m => m - 1)
  }

  function mesSiguiente() {
    if (mes === 11) { setMes(0); setAnio(a => a + 1) }
    else setMes(m => m + 1)
  }

  const nombreMes = new Date(anio, mes).toLocaleString('es-AR', { month: 'long', year: 'numeric' })

  // Filtra gastos del mes seleccionado
  const gastosMes = GASTOS_EJEMPLO.filter((g) => {
    const [a, m] = g.fecha.split('-').map(Number)
    return a === anio && m === mes + 1
  })

  // Suma la parte real del usuario: mitad si es compartido, total si es personal
  const totalMes = gastosMes.reduce((sum, g) => sum + importeUsuario(g), 0)
  const grupos = agruparPorFecha(gastosMes)

  return (
    <div className="pagina gastos">

      {/* Navegación de mes */}
      <div className="mes-nav">
        <button className="mes-nav__flecha" onClick={mesAnterior}>‹</button>
        <span className="mes-nav__nombre">{nombreMes}</span>
        <button className="mes-nav__flecha" onClick={mesSiguiente}>›</button>
      </div>

      {/* Tarjeta de recurrentes pendientes */}
      {recurrentesPendientes > 0 && (
        <button className="tarjeta-recurrentes" onClick={() => setRecurrentesAbierto(true)}>
          <span className="tarjeta-recurrentes__icono">📋</span>
          <span className="tarjeta-recurrentes__texto">
            {recurrentesPendientes} gastos recurrentes para revisar
          </span>
          <span className="tarjeta-recurrentes__accion">Revisar →</span>
        </button>
      )}

      {/* Total del mes */}
      <div className="total-mes">
        <p className="total-mes__label">Total gastado</p>
        <p className="total-mes__monto">{formatearPesos(totalMes)}</p>
      </div>

      {/* Botones de análisis */}
      <div className="botones-analisis">
        <button className="boton-analisis" onClick={() => setPorCategoriaAbierto(true)}>
          <span>📊</span> Por categoría
        </button>
        <button className="boton-analisis" onClick={() => setPorMedioDePagoAbierto(true)}>
          <span>💳</span> Por medio de pago
        </button>
      </div>

      {/* Lista de gastos agrupados por fecha */}
      {grupos.length === 0 ? (
        <p className="sin-gastos">No hay gastos en este mes</p>
      ) : (
        grupos.map(({ fecha, gastos }) => (
          <div key={fecha} className="grupo-fecha">
            <p className="grupo-fecha__titulo">{formatearFecha(fecha)}</p>
            <ul className="lista-gastos">
              {gastos.map((gasto) => {
                const tieneCuotas = !!gasto.cuotas_total
                const importeCuota = tieneCuotas ? gasto.importe / gasto.cuotas_total : gasto.importe
                const importeVisible = gasto.compartido ? importeCuota / 2 : importeCuota

                // Subtítulo: medio · USD $X (si aplica) · Total: $X (si compartido o cuotas) · Cuota N/M
                const pagoSofi = gasto.compartido && gasto.pagador !== USUARIO_ACTUAL
                const partesSubtitulo = [pagoSofi ? `Pagó ${OTRO_USUARIO}` : gasto.medio_de_pago]
                if (gasto.moneda === 'USD' && gasto.monto_original) {
                  partesSubtitulo.push(`USD $${gasto.monto_original}`)
                }
                if (gasto.compartido || tieneCuotas) {
                  partesSubtitulo.push(`Total: ${formatearPesos(gasto.importe)}`)
                }
                if (tieneCuotas) {
                  partesSubtitulo.push(`Cuota ${gasto.cuota_actual}/${gasto.cuotas_total}`)
                }

                return (
                  <li key={gasto.id} className="gasto-item">
                    <span className="gasto-item__icono">{gasto.icono}</span>
                    <div className="gasto-item__info">
                      <span className="gasto-item__desc">{gasto.descripcion}</span>
                      <span className="gasto-item__fecha">{partesSubtitulo.join(' · ')}</span>
                    </div>
                    <div className="gasto-item__derecha">
                      <span className="gasto-item__importe">{formatearPesos(importeVisible)}</span>
                      {gasto.compartido && <span className="gasto-item__badge">compartido</span>}
                    </div>
                    <button
                      className="gasto-item__editar"
                      onClick={() => abrirEdicion(gasto)}
                      aria-label="Editar gasto"
                    >✏️</button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))
      )}

      <button
        className="boton-flotante boton-flotante--ancho"
        onClick={() => { setGastoEditando(null); setFormularioAbierto(true) }}
        aria-label="Cargar gasto"
      >
        + Gasto
      </button>

      {recurrentesAbierto && (
        <RecurrentesPendientes onCerrar={() => setRecurrentesAbierto(false)} />
      )}

      {formularioAbierto && (
        <FormularioGasto
          onCerrar={cerrarFormulario}
          gastoInicial={gastoEditando}
        />
      )}

      {porMedioDePagoAbierto && (
        <PorMedioDePago
          todosLosGastos={GASTOS_EJEMPLO}
          mesInicial={mes}
          anioInicial={anio}
          onCerrar={() => setPorMedioDePagoAbierto(false)}
        />
      )}

      {porCategoriaAbierto && (
        <PorCategoria
          todosLosGastos={GASTOS_EJEMPLO}
          mesInicial={mes}
          anioInicial={anio}
          onCerrar={() => setPorCategoriaAbierto(false)}
        />
      )}

    </div>
  )
}

export default Gastos
