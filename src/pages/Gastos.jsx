import { useState, useEffect } from 'react'
import FormularioGasto from '../components/FormularioGasto'
import PorCategoria from '../components/PorCategoria'
import PorMedioDePago from '../components/PorMedioDePago'
import RecurrentesPendientes from '../components/RecurrentesPendientes'
import { USUARIO_ACTUAL } from '../lib/datos'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

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

function normalizarGasto(g, perfil, categorias, pareja) {
  const cat = categorias.find(c => c.nombre === g.categoria_nombre)
  const esMio = g.pagador_id === perfil?.id
  return {
    ...g,
    categoria: g.categoria_nombre,
    medio_de_pago: g.medio_de_pago_nombre,
    icono: cat?.emoji ?? '📦',
    pagador: esMio ? USUARIO_ACTUAL : (pareja?.nombre ?? 'otro'),
    cuota_actual: g.cuota_numero,
  }
}

function importeUsuario(g) {
  const base = g.cuotas_total ? g.importe / g.cuotas_total : g.importe
  return g.compartido ? base / 2 : base
}

function Gastos() {
  const { perfil, pareja, categorias, recurrentes } = useAuth()
  const ahora = new Date()
  const [anio, setAnio] = useState(ahora.getFullYear())
  const [mes, setMes] = useState(ahora.getMonth())
  const [gastos, setGastos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [formularioAbierto, setFormularioAbierto] = useState(false)
  const [gastoEditando, setGastoEditando] = useState(null)
  const [porCategoriaAbierto, setPorCategoriaAbierto] = useState(false)
  const [porMedioDePagoAbierto, setPorMedioDePagoAbierto] = useState(false)
  const [recurrentesAbierto, setRecurrentesAbierto] = useState(false)

  useEffect(() => {
    if (!perfil) return
    cargarGastos()
  }, [anio, mes, perfil, pareja])

  async function cargarGastos() {
    setCargando(true)
    const desde = `${anio}-${String(mes + 1).padStart(2, '0')}-01`
    const hasta = mes === 11
      ? `${anio + 1}-01-01`
      : `${anio}-${String(mes + 2).padStart(2, '0')}-01`

    const { data: propios } = await supabase
      .from('gastos')
      .select('*')
      .eq('user_id', perfil.id)
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

    const todos = [...(propios ?? []), ...dePareja]
      .sort((a, b) => b.fecha.localeCompare(a.fecha))

    setGastos(todos.map(g => normalizarGasto(g, perfil, categorias, pareja)))
    setCargando(false)
  }

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

  const nombreMes = `${new Date(anio, mes).toLocaleString('es-AR', { month: 'long' })} ${anio}`
  const totalMes = gastos.reduce((sum, g) => sum + importeUsuario(g), 0)
  const grupos = agruparPorFecha(gastos)

  const esEsteMes = anio === ahora.getFullYear() && mes === ahora.getMonth()
  const recurrentesPendientes = esEsteMes
    ? recurrentes.filter(r => !gastos.some(g => g.recurrente_id === r.id))
    : []

  return (
    <div className="pagina gastos">

      <div className="mes-nav">
        <button className="mes-nav__flecha" onClick={mesAnterior}>‹</button>
        <span className="mes-nav__nombre">{nombreMes}</span>
        <button className="mes-nav__flecha" onClick={mesSiguiente}>›</button>
      </div>

      <div className="total-mes">
        <p className="total-mes__label">Total gastado</p>
        <p className="total-mes__monto">{cargando ? '...' : formatearPesos(totalMes)}</p>
      </div>

      <div className="botones-analisis">
        <button className="boton-analisis" onClick={() => setPorCategoriaAbierto(true)}>
          <span>📊</span> Por categoría
        </button>
        <button className="boton-analisis" onClick={() => setPorMedioDePagoAbierto(true)}>
          <span>💳</span> Por medio de pago
        </button>
      </div>

      {recurrentesPendientes.length > 0 && (
        <button
          className="banner-recurrentes"
          onClick={() => setRecurrentesAbierto(true)}
        >
          📋 {recurrentesPendientes.length} gasto{recurrentesPendientes.length > 1 ? 's' : ''} recurrente{recurrentesPendientes.length > 1 ? 's' : ''} para confirmar este mes
        </button>
      )}

      {cargando ? (
        <p className="sin-gastos">Cargando...</p>
      ) : grupos.length === 0 ? (
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

                const pagoOtro = gasto.compartido && gasto.pagador !== USUARIO_ACTUAL
                const partesSubtitulo = [pagoOtro ? `Pagó ${gasto.pagador}` : (gasto.medio_de_pago || '')]
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
                  <li key={gasto.id} className="gasto-item" onClick={() => abrirEdicion(gasto)}>
                    <span className="gasto-item__icono">{gasto.icono}</span>
                    <div className="gasto-item__info">
                      <span className="gasto-item__desc">{gasto.descripcion || gasto.categoria}</span>
                      <span className="gasto-item__fecha">{partesSubtitulo.filter(Boolean).join(' · ')}</span>
                    </div>
                    <div className="gasto-item__derecha">
                      <span className="gasto-item__importe">{formatearPesos(importeVisible)}</span>
                      {gasto.compartido && <span className="gasto-item__badge">compartido</span>}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))
      )}

      <button
        className="boton-fab"
        onClick={() => { setGastoEditando(null); setFormularioAbierto(true) }}
        aria-label="Cargar gasto"
      >
        <span className="boton-fab__plus">+</span>
        <span className="boton-fab__label">Gasto</span>
      </button>

      {recurrentesAbierto && (
        <RecurrentesPendientes
          recurrentes={recurrentesPendientes}
          onCerrar={() => setRecurrentesAbierto(false)}
          onConfirmado={cargarGastos}
        />
      )}

      {formularioAbierto && (
        <FormularioGasto
          onCerrar={cerrarFormulario}
          onGuardado={cargarGastos}
          gastoInicial={gastoEditando}
        />
      )}

      {porMedioDePagoAbierto && (
        <PorMedioDePago
          todosLosGastos={gastos}
          mesInicial={mes}
          anioInicial={anio}
          onCerrar={() => setPorMedioDePagoAbierto(false)}
        />
      )}

      {porCategoriaAbierto && (
        <PorCategoria
          todosLosGastos={gastos}
          mesInicial={mes}
          anioInicial={anio}
          onCerrar={() => setPorCategoriaAbierto(false)}
        />
      )}

    </div>
  )
}

export default Gastos
