import { useState, useRef } from 'react'
import { CATEGORIAS, USUARIO_ACTUAL, OTRO_USUARIO } from '../lib/datos'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function sumarMeses(fechaStr, meses) {
  const [anio, mes, dia] = fechaStr.split('-').map(Number)
  const d = new Date(anio, mes - 1 + meses, dia)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function primeroDeMesQueViene(fechaActual) {
  const [anio, mes] = fechaActual.split('-').map(Number)
  if (mes === 12) return `${anio + 1}-01-01`
  return `${anio}-${String(mes + 1).padStart(2, '0')}-01`
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

function hoy() {
  const ahora = new Date()
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`
}

function FormularioGasto({ onCerrar, onGuardado, compartidoPorDefault = false, gastoInicial = null, modoRecurrente = false }) {
  const { perfil, medios: MEDIOS_DE_PAGO, categorias: todasCategorias, agregarRecurrente, actualizarRecurrente } = useAuth()
  const [mostrarOpcionMes, setMostrarOpcionMes] = useState(false)
  const [avisoIncompatible, setAvisoIncompatible] = useState(false)
  const [intentoEnvio, setIntentoEnvio] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false)
  const fechaOriginal = useRef(gastoInicial?.fecha ?? hoy())

  const [form, setForm] = useState(gastoInicial ? {
    fecha: gastoInicial.fecha,
    importe: gastoInicial.monto_original ?? gastoInicial.importe,
    moneda: gastoInicial.moneda ?? 'ARS',
    cotizacion: gastoInicial.cotizacion ?? '',
    categoria: gastoInicial.categoria,
    descripcion: gastoInicial.descripcion,
    medio_de_pago: gastoInicial.medio_de_pago,
    tiene_cuotas: false,
    cuotas: '',
    compartido: gastoInicial.compartido,
    recurrente: gastoInicial.recurrente || false,
    responsable: gastoInicial.responsable || '',
  } : {
    fecha: hoy(),
    importe: '',
    moneda: 'ARS',
    cotizacion: '',
    categoria: '',
    descripcion: '',
    medio_de_pago: '',
    tiene_cuotas: false,
    cuotas: '',
    compartido: compartidoPorDefault,
    recurrente: false,
    responsable: '',
  })

  const categoriasVisibles = form.compartido
    ? todasCategorias.filter(c => c.tipo === 'compartida')
    : todasCategorias

  const importeEnPesos = form.moneda === 'USD' && parseFloat(form.cotizacion) > 0
    ? parseFloat(form.importe || 0) * parseFloat(form.cotizacion)
    : parseFloat(form.importe || 0)

  const esUSD = form.moneda === 'USD'
  const medioSeleccionado = MEDIOS_DE_PAGO.find(m => m.nombre === form.medio_de_pago)
  const esCredito = medioSeleccionado?.es_credito ?? false

  function actualizar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function seleccionarMedio(nombre) {
    const medio = MEDIOS_DE_PAGO.find(m => m.nombre === nombre)
    actualizar('medio_de_pago', nombre)
    if (!medio?.es_credito) setMostrarOpcionMes(false)
  }

  function elegirMesQueViene() {
    actualizar('fecha', primeroDeMesQueViene(fechaOriginal.current))
  }

  function elegirMesCorriente() {
    actualizar('fecha', fechaOriginal.current)
  }

  async function handleEliminar() {
    setGuardando(true)
    try {
      if (gastoInicial.cuotas_total) {
        const padreId = gastoInicial.gasto_padre_id || gastoInicial.id
        await supabase.from('gastos').delete().or(`id.eq.${padreId},gasto_padre_id.eq.${padreId}`)
      } else {
        await supabase.from('gastos').delete().eq('id', gastoInicial.id)
      }
      onGuardado?.()
      onCerrar()
    } catch (err) {
      setError('No se pudo eliminar el gasto.')
    } finally {
      setGuardando(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.categoria || !form.medio_de_pago) { setIntentoEnvio(true); return }
    if (!perfil) { setError('No se encontró el perfil de usuario'); return }

    setGuardando(true)
    setError('')

    try {
      if (modoRecurrente) {
        const datos = {
          descripcion: form.descripcion || null,
          importe: parseFloat(form.importe),
          categoria_nombre: form.categoria,
          medio_de_pago_nombre: form.medio_de_pago || null,
          compartido: form.compartido,
        }
        if (gastoInicial?.id) {
          const result = await actualizarRecurrente(gastoInicial.id, datos)
          if (!result) throw new Error('no result')
        } else {
          const result = await agregarRecurrente(datos)
          if (!result) throw new Error('no result')
        }
        onGuardado?.()
        onCerrar()
        return
      }

      let recurrenteId = null
      if (form.recurrente && !gastoInicial) {
        const nr = await agregarRecurrente({
          descripcion: form.descripcion || null,
          importe: importeEnPesos,
          categoria_nombre: form.categoria,
          medio_de_pago_nombre: form.medio_de_pago || null,
          compartido: form.compartido,
        })
        recurrenteId = nr?.id ?? null
      }

      const gastoBase = {
        user_id: perfil.id,
        pagador_id: perfil.id,
        importe: importeEnPesos,
        moneda: form.moneda,
        cotizacion: esUSD ? parseFloat(form.cotizacion) : null,
        monto_original: esUSD ? parseFloat(form.importe) : null,
        fecha: form.fecha,
        descripcion: form.descripcion || null,
        categoria_nombre: form.categoria,
        medio_de_pago_nombre: form.medio_de_pago || null,
        compartido: form.compartido,
        cuotas_total: form.tiene_cuotas ? parseInt(form.cuotas) : null,
        cuota_numero: form.tiene_cuotas ? 1 : null,
        recurrente_id: recurrenteId,
      }

      if (gastoInicial) {
        const { error } = await supabase.from('gastos').update(gastoBase).eq('id', gastoInicial.id)
        if (error) throw error
      } else if (form.tiene_cuotas && parseInt(form.cuotas) > 1) {
        const cuotas = parseInt(form.cuotas)
        const { data: primeraCuota, error: err1 } = await supabase
          .from('gastos').insert(gastoBase).select().single()
        if (err1) throw err1

        const restantes = []
        for (let i = 2; i <= cuotas; i++) {
          restantes.push({ ...gastoBase, fecha: sumarMeses(form.fecha, i - 1), cuota_numero: i, gasto_padre_id: primeraCuota.id })
        }
        const { error: err2 } = await supabase.from('gastos').insert(restantes)
        if (err2) throw err2
      } else {
        const { error } = await supabase.from('gastos').insert(gastoBase)
        if (error) throw error
      }

      onGuardado?.()
      onCerrar()
    } catch (err) {
      setError('No se pudo guardar. Intentá de nuevo.')
      console.error(err)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <div className="modal-overlay" onClick={onCerrar} />

      <div className="modal-panel">
        <div className="modal-header">
          <h2>{gastoInicial ? 'Editar gasto' : 'Nuevo gasto'}</h2>
          <button className="modal-cerrar" onClick={onCerrar}>✕</button>
        </div>

        <form className="formulario" onSubmit={handleSubmit}>

          {modoRecurrente && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textAlign: 'center' }}>
              Importe estimado — cada mes podés ajustarlo antes de confirmar
            </p>
          )}

          <div className="campo">
            <label>{esUSD ? 'Importe en USD' : 'Importe'}</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={form.importe}
              onChange={(e) => actualizar('importe', e.target.value)}
              required
            />
          </div>

          <div className="campo campo--toggle">
            <label>
              <input
                type="checkbox"
                checked={esUSD}
                onChange={(e) => {
                  actualizar('moneda', e.target.checked ? 'USD' : 'ARS')
                  if (!e.target.checked) actualizar('cotizacion', '')
                }}
              />
              Gasto en dólares (USD)
            </label>
          </div>

          {esUSD && (
            <div className="campo">
              <label>Cotización ($ por dólar)</label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="Ej: 1050"
                min="1"
                step="1"
                value={form.cotizacion}
                onChange={(e) => actualizar('cotizacion', e.target.value)}
                required
              />
              {parseFloat(form.importe) > 0 && parseFloat(form.cotizacion) > 0 && (
                <p className="preview-cuota">= {formatearPesos(importeEnPesos)} ARS</p>
              )}
            </div>
          )}

          {!modoRecurrente && (
            <div className="campo">
              <label>Fecha</label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => actualizar('fecha', e.target.value)}
                required
              />
            </div>
          )}

          <div className="campo">
            <label>Categoría {intentoEnvio && !form.categoria && <span className="campo-error">— seleccioná una</span>}</label>
            <div className={`grilla-categorias ${intentoEnvio && !form.categoria ? 'grilla-categorias--error' : ''}`}>
              {categoriasVisibles.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`cat-item ${form.categoria === cat.nombre ? 'cat-item--activo' : ''}`}
                  onClick={() => actualizar('categoria', cat.nombre)}
                >
                  <span className="cat-item__icono">{cat.emoji}</span>
                  <span className="cat-item__nombre">{cat.nombre}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="campo">
            <label>Descripción</label>
            <input
              type="text"
              placeholder="Ej: Supermercado Coto"
              value={form.descripcion}
              onChange={(e) => actualizar('descripcion', e.target.value)}
            />
          </div>

          <div className="campo">
            <label>Medio de pago {intentoEnvio && !form.medio_de_pago && <span className="campo-error">— seleccioná uno</span>}</label>
            <div className="chips">
              {MEDIOS_DE_PAGO.map((medio) => (
                <button
                  key={medio.nombre}
                  type="button"
                  className={`chip ${form.medio_de_pago === medio.nombre ? 'chip--activo' : ''}`}
                  onClick={() => seleccionarMedio(medio.nombre)}
                >
                  {medio.icono} {medio.nombre}
                </button>
              ))}
            </div>

            {esCredito && !mostrarOpcionMes && (
              <button
                type="button"
                className="link-otro-mes"
                onClick={() => setMostrarOpcionMes(true)}
              >
                Este gasto se cobra en otro mes
              </button>
            )}

            {esCredito && mostrarOpcionMes && (
              <div className="selector-mes-impacto">
                <button
                  type="button"
                  className={`chip ${!form.fecha.startsWith(primeroDeMesQueViene(hoy()).slice(0, 7)) ? 'chip--activo' : ''}`}
                  onClick={elegirMesCorriente}
                >
                  Este mes
                </button>
                <button
                  type="button"
                  className={`chip ${form.fecha.startsWith(primeroDeMesQueViene(hoy()).slice(0, 7)) ? 'chip--activo' : ''}`}
                  onClick={elegirMesQueViene}
                >
                  Mes que viene
                </button>
              </div>
            )}
          </div>

          {!modoRecurrente && <div className="campo campo--toggle">
            <label>
              <input
                type="checkbox"
                checked={form.tiene_cuotas}
                onChange={(e) => {
                  actualizar('tiene_cuotas', e.target.checked)
                  if (!e.target.checked) { actualizar('cuotas', ''); setAvisoIncompatible(false) }
                  if (e.target.checked && form.recurrente) {
                    actualizar('recurrente', false)
                    actualizar('responsable', '')
                    setAvisoIncompatible(true)
                  }
                }}
              />
              Pago en cuotas
            </label>
          </div>}

          {avisoIncompatible && !modoRecurrente && (
            <p className="aviso-incompatible">
              Un gasto en cuotas tiene fecha de fin, no puede repetirse cada mes. Solo podés elegir uno.
            </p>
          )}

          {form.tiene_cuotas && !modoRecurrente && (
            <div className="campo">
              <label>Número de cuotas</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Ej: 3"
                min="2"
                max="48"
                value={form.cuotas}
                onChange={(e) => actualizar('cuotas', e.target.value)}
                required
              />
              {form.cuotas >= 2 && importeEnPesos > 0 && (
                <p className="preview-cuota">
                  {form.cuotas} cuotas de {formatearPesos(importeEnPesos / form.cuotas)}/mes
                  {form.compartido && ` · ${formatearPesos(importeEnPesos / form.cuotas / 2)} tu parte`}
                </p>
              )}
            </div>
          )}

          <div className="campo campo--toggle">
            <label>
              <input
                type="checkbox"
                checked={form.compartido}
                onChange={(e) => actualizar('compartido', e.target.checked)}
              />
              Gasto compartido
            </label>
          </div>

          {!modoRecurrente && <div className="campo campo--toggle">
            <label>
              <input
                type="checkbox"
                checked={form.recurrente}
                onChange={(e) => {
                  actualizar('recurrente', e.target.checked)
                  if (!e.target.checked) { actualizar('responsable', ''); setAvisoIncompatible(false) }
                  if (e.target.checked && form.tiene_cuotas) {
                    actualizar('tiene_cuotas', false)
                    actualizar('cuotas', '')
                    setAvisoIncompatible(true)
                  }
                }}
              />
              Gasto recurrente (se repite cada mes)
            </label>
          </div>}

          {!modoRecurrente && form.recurrente && form.compartido && (
            <div className="campo">
              <label>¿Quién suele pagarlo?</label>
              <div className="chips">
                <button
                  type="button"
                  className={`chip ${form.responsable === USUARIO_ACTUAL ? 'chip--activo' : ''}`}
                  onClick={() => actualizar('responsable', USUARIO_ACTUAL)}
                >
                  Yo
                </button>
                <button
                  type="button"
                  className={`chip ${form.responsable === OTRO_USUARIO ? 'chip--activo' : ''}`}
                  onClick={() => actualizar('responsable', OTRO_USUARIO)}
                >
                  {OTRO_USUARIO}
                </button>
              </div>
            </div>
          )}

          {error && <p style={{ color: '#e74c3c', fontSize: '0.85rem', textAlign: 'center' }}>{error}</p>}

          <button type="submit" className="boton-guardar" disabled={guardando}>
            {guardando ? 'Guardando...' : gastoInicial ? 'Guardar cambios' : 'Guardar gasto'}
          </button>

          {gastoInicial && (
            confirmandoEliminar ? (
              <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  ¿Eliminar "{gastoInicial.descripcion || gastoInicial.categoria}"?
                  {gastoInicial.cuotas_total ? ' (todas las cuotas)' : ''}
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button type="button" className="chip chip--activo" onClick={handleEliminar}>Eliminar</button>
                  <button type="button" className="chip" onClick={() => setConfirmandoEliminar(false)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmandoEliminar(true)}
                style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '0.9rem', marginTop: '0.25rem', width: '100%' }}
              >
                Eliminar gasto
              </button>
            )
          )}

        </form>
      </div>
    </>
  )
}

export default FormularioGasto
