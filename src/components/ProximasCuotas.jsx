import { useEffect, useState } from 'react'
import { OTRO_USUARIO } from '../lib/datos'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

// Lo que le toca al usuario actual de este gasto (cuota si tiene, o el total)
function miParte(g) {
  const base = g.cuotas_total ? g.importe / g.cuotas_total : g.importe
  return g.compartido ? base / 2 : base
}

// Mes en que se paga la última cuota de este gasto (ej: "jun 2027")
function mesFin(g) {
  const [anio, mes] = g.fecha.split('-').map(Number)
  const restantes = g.cuotas_total - g.cuota_numero
  const d = new Date(anio, mes - 1 + restantes, 1)
  return d.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })
}

function ProximasCuotas({ onCerrar }) {
  const { perfil, pareja, categorias, recurrentes } = useAuth()
  const ahora = new Date()
  const [anio, setAnio] = useState(ahora.getFullYear())
  const [mes, setMes] = useState(ahora.getMonth()) // 0-index
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [medioExpandido, setMedioExpandido] = useState(null)
  const [recurrentesAbierto, setRecurrentesAbierto] = useState(false)
  const [cuotasAbierto, setCuotasAbierto] = useState(false)

  useEffect(() => {
    if (!perfil) return
    let vigente = true
    const desde = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-01`

    async function cargar() {
      setCargando(true)

      const propias = supabase
        .from('gastos')
        .select('*')
        .eq('user_id', perfil.id)
        .not('cuotas_total', 'is', null)
        .gte('fecha', desde)

      // Del otro usuario traemos cuotas Y recurrentes ya confirmados (no gastos
      // sueltos): son los compromisos, no cualquier compra compartida del mes.
      const delOtro = pareja?.id
        ? supabase
            .from('gastos')
            .select('*')
            .eq('user_id', pareja.id)
            .eq('compartido', true)
            .or('cuotas_total.not.is.null,recurrente_id.not.is.null')
            .gte('fecha', desde)
        : Promise.resolve({ data: [] })

      const [r1, r2] = await Promise.all([propias, delOtro])
      if (!vigente) return
      setFilas([...(r1.data ?? []), ...(r2.data ?? [])])
      setCargando(false)
    }

    cargar()
    return () => { vigente = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id, pareja?.id])

  function emojiCat(nombre) {
    return categorias.find(c => c.nombre === nombre)?.emoji ?? '📦'
  }

  const claveHoy = ahora.getFullYear() * 12 + ahora.getMonth()
  const claveActual = anio * 12 + mes
  const claveUltima = filas.length
    ? Math.max(...filas.map(g => {
        const [a, m] = g.fecha.split('-').map(Number)
        return a * 12 + (m - 1)
      }))
    : claveHoy

  const puedeAtras = claveActual > claveHoy
  const puedeAdelante = claveActual < claveUltima

  function mesAnterior() {
    if (!puedeAtras) return
    if (mes === 0) { setMes(11); setAnio(a => a - 1) }
    else setMes(m => m - 1)
    setMedioExpandido(null)
  }

  function mesSiguiente() {
    if (!puedeAdelante) return
    if (mes === 11) { setMes(0); setAnio(a => a + 1) }
    else setMes(m => m + 1)
    setMedioExpandido(null)
  }

  const nombreMes = `${new Date(anio, mes).toLocaleString('es-AR', { month: 'long' })} ${anio}`

  const filasMes = filas.filter(g => {
    const [a, m] = g.fecha.split('-').map(Number)
    return a === anio && m === mes + 1
  })

  const propiasMes = filasMes.filter(g => g.user_id === perfil?.id)
  const otroMes = filasMes
    .filter(g => g.user_id === pareja?.id)
    .sort((a, b) => miParte(b) - miParte(a))

  const totalMes = propiasMes.reduce((sum, g) => sum + miParte(g), 0)
  const totalOtro = otroMes.reduce((sum, g) => sum + miParte(g), 0)

  // Gastos recurrentes: estimado fijo mes a mes (se lee del AuthContext, mismo
  // cálculo que Configuración). Es tu parte: mitad si el recurrente es compartido.
  const parteRecurrente = (r) => (r.compartido ? r.importe / 2 : r.importe)
  const totalRecurrentes = recurrentes.reduce((sum, r) => sum + parteRecurrente(r), 0)

  // Total comprometido del mes = cuotas de tus medios + recurrentes estimados.
  // La sección "compartidas pagadas por el otro" queda aparte, no suma acá.
  const totalComprometido = totalMes + totalRecurrentes

  // Agrupar lo propio por medio de pago
  const porMedioMap = {}
  propiasMes.forEach(g => {
    const clave = g.medio_de_pago_nombre || 'Sin medio'
    if (!porMedioMap[clave]) porMedioMap[clave] = []
    porMedioMap[clave].push(g)
  })
  const porMedio = Object.entries(porMedioMap)
    .map(([medio, items]) => ({
      medio,
      items,
      total: items.reduce((sum, g) => sum + miParte(g), 0),
    }))
    .sort((a, b) => b.total - a.total)

  const sinNada = porMedio.length === 0 && otroMes.length === 0 && recurrentes.length === 0

  return (
    <>
      <div className="modal-overlay" onClick={onCerrar} />
      <div className="modal-panel">

        <div className="modal-header">
          <h2>Proyección</h2>
          <button className="modal-cerrar" onClick={onCerrar}>✕</button>
        </div>

        <div className="mes-nav mes-nav--panel">
          <button className="mes-nav__flecha" onClick={mesAnterior} disabled={!puedeAtras}>‹</button>
          <span className="mes-nav__nombre">{nombreMes}</span>
          <button className="mes-nav__flecha" onClick={mesSiguiente} disabled={!puedeAdelante}>›</button>
        </div>

        {cargando ? (
          <p className="sin-gastos">Cargando...</p>
        ) : (
          <>
            <div className="cuotas-total">
              <span className="cuotas-total__label">Total comprometido</span>
              <span className="cuotas-total__monto">{formatearPesos(totalComprometido)}</span>
            </div>

            {sinNada ? (
              <p className="sin-gastos">No tenés nada comprometido este mes</p>
            ) : (
              <>
                {recurrentes.length > 0 && (
                  <ul className="lista-categorias">
                    <li>
                      <div className="categoria-item" onClick={() => setRecurrentesAbierto(v => !v)}>
                        <span className="categoria-item__icono">🔁</span>
                        <div className="categoria-item__info">
                          <span className="categoria-item__nombre">Gastos recurrentes</span>
                          <span className="categoria-item__nota">estimado, igual todos los meses</span>
                        </div>
                        <div className="categoria-item__derecha">
                          <span className="categoria-item__total">{formatearPesos(totalRecurrentes)}</span>
                        </div>
                      </div>
                      {recurrentesAbierto && (
                        <ul className="lista-gastos cuotas-detalle">
                          {[...recurrentes]
                            .sort((a, b) => parteRecurrente(b) - parteRecurrente(a))
                            .map(r => (
                              <li key={r.id} className="gasto-item">
                                <span className="gasto-item__icono">{emojiCat(r.categoria_nombre)}</span>
                                <div className="gasto-item__info">
                                  <span className="gasto-item__desc">{r.descripcion || r.categoria_nombre}</span>
                                  <span className="gasto-item__fecha">
                                    {r.medio_de_pago_nombre || 'Sin medio'}
                                    {r.compartido && ' · compartido'}
                                  </span>
                                </div>
                                <div className="gasto-item__derecha">
                                  <span className="gasto-item__importe">{formatearPesos(parteRecurrente(r))}</span>
                                </div>
                              </li>
                            ))}
                        </ul>
                      )}
                    </li>
                  </ul>
                )}

                {porMedio.length > 0 && (
                  <ul className="lista-categorias">
                    <li>
                      <div className="categoria-item" onClick={() => setCuotasAbierto(v => !v)}>
                        <span className="categoria-item__icono">🧾</span>
                        <div className="categoria-item__info">
                          <span className="categoria-item__nombre">Gastos en cuotas</span>
                        </div>
                        <div className="categoria-item__derecha">
                          <span className="categoria-item__total">{formatearPesos(totalMes)}</span>
                        </div>
                      </div>

                      {cuotasAbierto && (
                        <ul className="lista-categorias">
                          {porMedio.map(({ medio, items, total }) => (
                            <li key={medio}>
                              <div className="categoria-item" onClick={() => setMedioExpandido(m => m === medio ? null : medio)}>
                                <span className="categoria-item__icono">💳</span>
                                <div className="categoria-item__info">
                                  <span className="categoria-item__nombre">{medio}</span>
                                </div>
                                <div className="categoria-item__derecha">
                                  <span className="categoria-item__total">{formatearPesos(total)}</span>
                                </div>
                              </div>
                              {medioExpandido === medio && (
                                <ul className="lista-gastos cuotas-detalle">
                                  {items.map(g => (
                                    <li key={g.id} className="gasto-item">
                                      <span className="gasto-item__icono">{emojiCat(g.categoria_nombre)}</span>
                                      <div className="gasto-item__info">
                                        <span className="gasto-item__desc">{g.descripcion || g.categoria_nombre}</span>
                                        <span className="gasto-item__fecha">
                                          Cuota {g.cuota_numero}/{g.cuotas_total} · {formatearPesos(miParte(g))}/mes · termina {mesFin(g)}
                                        </span>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  </ul>
                )}

                {otroMes.length > 0 && (
                  <>
                    <p className="cuotas-seccion">Compartidas pagadas por {pareja?.nombre ?? OTRO_USUARIO}</p>
                    <ul className="lista-gastos">
                      {otroMes.map(g => (
                        <li key={g.id} className="gasto-item">
                          <span className="gasto-item__icono">{emojiCat(g.categoria_nombre)}</span>
                          <div className="gasto-item__info">
                            <span className="gasto-item__desc">{g.descripcion || g.categoria_nombre}</span>
                            <span className="gasto-item__fecha">
                              {g.cuotas_total
                                ? `Cuota ${g.cuota_numero}/${g.cuotas_total} · termina ${mesFin(g)}`
                                : g.recurrente_id
                                  ? 'Recurrente'
                                  : ''}
                            </span>
                          </div>
                          <div className="gasto-item__derecha">
                            <span className="gasto-item__importe">{formatearPesos(miParte(g))}</span>
                            <span className="gasto-item__badge">tu parte</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <p className="detalle-total">Subtotal: {formatearPesos(totalOtro)}</p>
                  </>
                )}
              </>
            )}
          </>
        )}

      </div>
    </>
  )
}

export default ProximasCuotas
