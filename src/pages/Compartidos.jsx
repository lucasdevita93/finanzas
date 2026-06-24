import { useState } from 'react'
import FormularioGasto from '../components/FormularioGasto'
import { iconoDeCategoria, USUARIO_ACTUAL, OTRO_USUARIO } from '../lib/datos'

// Datos de ejemplo — se reemplazan por Supabase en el Paso 4
const GASTOS_COMPARTIDOS_EJEMPLO = [
  { id: 1, descripcion: 'Supermercado Coto', categoria: 'Víveres',  icono: '🛒', importe: 8500,  medio_de_pago: 'Tarjeta Visa BBVA',           fecha: '2026-06-20', pagador: 'Lucas', cuotas_total: null },
  { id: 3, descripcion: 'Nafta',              categoria: 'Vehículos',icono: '🚗', importe: 15000, medio_de_pago: 'Efectivo',                    fecha: '2026-06-17', pagador: 'Sofi',  cuotas_total: null },
  { id: 4, descripcion: 'Restaurante',        categoria: 'Salidas',  icono: '🍻', importe: 12000, medio_de_pago: 'Tarjeta Visa BBVA',           fecha: '2026-06-15', pagador: 'Lucas', cuotas_total: 3, cuota_actual: 1 },
  { id: 7, descripcion: 'Televisor',          categoria: 'Hogar',    icono: '🏠', importe: 120000,medio_de_pago: 'Tarjeta Crédito Mercado Pago', fecha: '2026-06-05', pagador: 'Lucas', cuotas_total: 6, cuota_actual: 1 },
  { id: 8, descripcion: 'Alquiler',           categoria: 'Hogar',    icono: '🏠', importe: 150000,medio_de_pago: 'Efectivo',                    fecha: '2026-06-01', pagador: 'Sofi',  cuotas_total: null },
  { id: 9, descripcion: 'Expensas',           categoria: 'Hogar',    icono: '🏠', importe: 28000, medio_de_pago: 'Efectivo',                    fecha: '2026-06-01', pagador: 'Sofi',  cuotas_total: null },
]

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

function cantidadPagada(g) {
  return g.cuotas_total ? g.importe / g.cuotas_total : g.importe
}

// Panel de categorías dentro de Compartidos
function PorCategoriaCompartidos({ gastos, onCerrar }) {
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null)

  const totalGeneral = gastos.reduce((sum, g) => sum + mitadACargo(g), 0)

  const porCategoria = Object.entries(
    gastos.reduce((acc, g) => {
      if (!acc[g.categoria]) acc[g.categoria] = 0
      acc[g.categoria] += mitadACargo(g)
      return acc
    }, {})
  )
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total)

  const gastosCat = categoriaSeleccionada
    ? gastos.filter(g => g.categoria === categoriaSeleccionada)
    : []

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
              <h3>{iconoDeCategoria(categoriaSeleccionada)} {categoriaSeleccionada}</h3>
            </div>
            <p className="detalle-total">
              Total: {formatearPesos(gastosCat.reduce((sum, g) => sum + mitadACargo(g), 0))}
            </p>
            <ul className="lista-gastos">
              {gastosCat.map((gasto) => (
                <li key={gasto.id} className="gasto-item">
                  <span className="gasto-item__icono">{gasto.icono}</span>
                  <div className="gasto-item__info">
                    <span className="gasto-item__desc">{gasto.descripcion}</span>
                    <span className="gasto-item__fecha">
                      {formatearFecha(gasto.fecha)} · Total: {formatearPesos(gasto.importe)}
                      {gasto.cuotas_total && ` · Cuota ${gasto.cuota_actual}/${gasto.cuotas_total}`}
                    </span>
                    <span className="gasto-item__pagador">
                      {gasto.pagador === USUARIO_ACTUAL ? 'Pagaste vos' : `Pagó ${OTRO_USUARIO}`}
                    </span>
                  </div>
                  <span className="gasto-item__importe">{formatearPesos(mitadACargo(gasto))}</span>
                </li>
              ))}
            </ul>
          </div>
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

function Compartidos() {
  const [formularioAbierto, setFormularioAbierto] = useState(false)
  const [porCategoriaAbierto, setPorCategoriaAbierto] = useState(false)
  const [confirmandoSaldar, setConfirmandoSaldar] = useState(false)

  const totalLucas = GASTOS_COMPARTIDOS_EJEMPLO
    .filter(g => g.pagador === USUARIO_ACTUAL)
    .reduce((sum, g) => sum + cantidadPagada(g), 0)

  const totalSofi = GASTOS_COMPARTIDOS_EJEMPLO
    .filter(g => g.pagador === OTRO_USUARIO)
    .reduce((sum, g) => sum + cantidadPagada(g), 0)

  const totalCompartido = totalLucas + totalSofi
  // Positivo: Lucas pagó más → Sofi le debe | Negativo: Sofi pagó más → Lucas le debe
  const saldo = (totalLucas - totalSofi) / 2
  const saldoPositivo = saldo > 0
  const saldoNegativo = saldo < 0

  return (
    <div className="pagina compartidos">

      <h1>Compartidos</h1>

      {/* Total gastado entre los dos */}
      <div className="tarjeta">
        <p className="tarjeta__label">Total gastado entre los dos</p>
        <p className="tarjeta__monto">{formatearPesos(totalCompartido)}</p>
        <p className="tarjeta__detalle">cada uno debería haber puesto {formatearPesos(totalCompartido / 2)}</p>
      </div>

      {/* Saldo neto */}
      <div className={`tarjeta ${saldoPositivo ? 'tarjeta--verde' : saldoNegativo ? 'tarjeta--rojo' : ''}`}>
        <p className="tarjeta__label">
          {saldoPositivo ? 'Te deben' : saldoNegativo ? 'Debés' : 'Están a mano'}
        </p>
        <p className={`tarjeta__monto ${saldoPositivo ? 'saldo--positivo' : saldoNegativo ? 'saldo--negativo' : ''}`}>
          {saldo === 0 ? '🤝' : formatearPesos(Math.abs(saldo))}
        </p>
        <p className="tarjeta__detalle">
          {saldoPositivo
            ? `${OTRO_USUARIO} te debe ${formatearPesos(Math.abs(saldo))}`
            : saldoNegativo
              ? `Le debés ${formatearPesos(Math.abs(saldo))} a ${OTRO_USUARIO}`
              : 'Cada uno gastó lo mismo'}
        </p>
      </div>

      {/* Saldar o Reclamar según quién debe — no aparece si están a mano */}
      {saldoPositivo && (
        <button className="boton-saldar boton-saldar--reclamar" onClick={() => setConfirmandoSaldar(true)}>
          Reclamar deuda
        </button>
      )}
      {saldoNegativo && (
        <button className="boton-saldar" onClick={() => setConfirmandoSaldar(true)}>
          Saldar deuda
        </button>
      )}

      {/* Modal de confirmación */}
      {confirmandoSaldar && (
        <>
          <div className="modal-overlay" onClick={() => setConfirmandoSaldar(false)} />
          <div className="modal-panel modal-panel--chico">
            <div className="modal-header">
              <h2>{saldoPositivo ? 'Reclamar deuda' : 'Saldar deuda'}</h2>
              <button className="modal-cerrar" onClick={() => setConfirmandoSaldar(false)}>✕</button>
            </div>
            <p className="saldar-confirmacion__texto">
              {saldoPositivo
                ? `Le vas a avisar a ${OTRO_USUARIO} que te debe ${formatearPesos(Math.abs(saldo))}.`
                : `Confirmás que le pagaste ${formatearPesos(Math.abs(saldo))} a ${OTRO_USUARIO} y el balance vuelve a cero.`}
            </p>
            <div className="saldar-confirmacion__botones">
              <button className="saldar-confirmacion__cancelar" onClick={() => setConfirmandoSaldar(false)}>
                Cancelar
              </button>
              <button
                className="saldar-confirmacion__confirmar"
                onClick={() => { alert('¡Listo! (el balance real se limpia cuando conectemos Supabase)'); setConfirmandoSaldar(false) }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </>
      )}

      {/* Análisis por categoría */}
      <div className="botones-analisis">
        <button className="boton-analisis" onClick={() => setPorCategoriaAbierto(true)}>
          <span>📊</span> Por categoría
        </button>
      </div>

      {/* Lista de gastos compartidos */}
      <div className="seccion">
        <h3 className="seccion__titulo">Detalle</h3>
        <ul className="lista-gastos">
          {[...GASTOS_COMPARTIDOS_EJEMPLO].sort((a, b) => b.fecha.localeCompare(a.fecha)).map((gasto) => (
            <li key={gasto.id} className="gasto-item">
              <span className="gasto-item__icono">{gasto.icono}</span>
              <div className="gasto-item__info">
                <span className="gasto-item__desc">{gasto.descripcion}</span>
                <span className="gasto-item__fecha">
                  {formatearFecha(gasto.fecha)} · Total: {formatearPesos(gasto.importe)}
                  {gasto.cuotas_total && ` · Cuota ${gasto.cuota_actual}/${gasto.cuotas_total}`}
                </span>
                <span className="gasto-item__pagador">
                  {gasto.pagador === USUARIO_ACTUAL ? 'Pagaste vos' : `Pagó ${OTRO_USUARIO}`}
                </span>
              </div>
              <span className="gasto-item__importe">{formatearPesos(mitadACargo(gasto))}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Botón flotante */}
      <button
        className="boton-flotante boton-flotante--ancho"
        onClick={() => setFormularioAbierto(true)}
      >
        + Gasto compartido
      </button>

      {formularioAbierto && (
        <FormularioGasto
          onCerrar={() => setFormularioAbierto(false)}
          compartidoPorDefault={true}
        />
      )}

      {porCategoriaAbierto && (
        <PorCategoriaCompartidos
          gastos={GASTOS_COMPARTIDOS_EJEMPLO}
          onCerrar={() => setPorCategoriaAbierto(false)}
        />
      )}

    </div>
  )
}

export default Compartidos
