import { useState, useRef } from 'react'
import { MEDIOS_DE_PAGO, CATEGORIAS, USUARIO_ACTUAL, OTRO_USUARIO } from '../lib/datos'

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

function FormularioGasto({ onCerrar, compartidoPorDefault = false, gastoInicial = null }) {
  const [mostrarOpcionMes, setMostrarOpcionMes] = useState(false)
  const [avisoIncompatible, setAvisoIncompatible] = useState(false)
  const [intentoEnvio, setIntentoEnvio] = useState(false)
  const fechaOriginal = useRef(gastoInicial?.fecha ?? hoy())

  const [form, setForm] = useState(gastoInicial ? {
    fecha: gastoInicial.fecha,
    importe: gastoInicial.importe,
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
    categoria: '',
    descripcion: '',
    medio_de_pago: '',
    tiene_cuotas: false,
    cuotas: '',
    compartido: compartidoPorDefault,
    recurrente: false,
    responsable: '',
  })

  const medioSeleccionado = MEDIOS_DE_PAGO.find(m => m.nombre === form.medio_de_pago)
  const esCredito = medioSeleccionado?.esCredito ?? false

  function actualizar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function seleccionarMedio(nombre) {
    const medio = MEDIOS_DE_PAGO.find(m => m.nombre === nombre)
    actualizar('medio_de_pago', nombre)
    // Si deja de ser crédito, resetea la opción de mes
    if (!medio?.esCredito) setMostrarOpcionMes(false)
  }

  function elegirMesQueViene() {
    actualizar('fecha', primeroDeMesQueViene(fechaOriginal.current))
  }

  function elegirMesCorriente() {
    actualizar('fecha', fechaOriginal.current)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.categoria) { setIntentoEnvio(true); return }
    console.log('Gasto a guardar:', form)
    alert('¡Gasto cargado! (todavía no se guarda en la base de datos)')
    onCerrar()
  }

  return (
    <>
      {/* Fondo oscuro detrás del panel */}
      <div className="modal-overlay" onClick={onCerrar} />

      {/* Panel que sube desde abajo */}
      <div className="modal-panel">
        <div className="modal-header">
          <h2>{gastoInicial ? 'Editar gasto' : 'Nuevo gasto'}</h2>
          <button className="modal-cerrar" onClick={onCerrar}>✕</button>
        </div>

        <form className="formulario" onSubmit={handleSubmit}>

          <div className="campo">
            <label>Importe</label>
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

          <div className="campo">
            <label>Fecha</label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => actualizar('fecha', e.target.value)}
              required
            />
          </div>

          <div className="campo">
            <label>Categoría {intentoEnvio && !form.categoria && <span className="campo-error">— seleccioná una</span>}</label>
            <div className={`grilla-categorias ${intentoEnvio && !form.categoria ? 'grilla-categorias--error' : ''}`}>
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat.nombre}
                  type="button"
                  className={`cat-item ${form.categoria === cat.nombre ? 'cat-item--activo' : ''}`}
                  onClick={() => actualizar('categoria', cat.nombre)}
                >
                  <span className="cat-item__icono">{cat.icono}</span>
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
            <label>Medio de pago</label>
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

            {/* Link discreto — solo aparece si el medio es crédito */}
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

          <div className="campo campo--toggle">
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
          </div>

          {avisoIncompatible && (
            <p className="aviso-incompatible">
              Un gasto en cuotas tiene fecha de fin, no puede repetirse cada mes. Solo podés elegir uno.
            </p>
          )}

          {form.tiene_cuotas && (
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
              {form.cuotas >= 2 && form.importe > 0 && (
                <p className="preview-cuota">
                  {form.cuotas} cuotas de {formatearPesos(form.importe / form.cuotas)}/mes
                  {form.compartido && ` · ${formatearPesos(form.importe / form.cuotas / 2)} tu parte`}
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

          <div className="campo campo--toggle">
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
          </div>

          {/* Solo aparece si es recurrente Y compartido */}
          {form.recurrente && form.compartido && (
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

          <button type="submit" className="boton-guardar">
            {gastoInicial ? 'Guardar cambios' : 'Guardar gasto'}
          </button>

        </form>
      </div>
    </>
  )
}

export default FormularioGasto
