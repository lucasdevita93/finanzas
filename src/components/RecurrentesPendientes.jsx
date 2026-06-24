import { useState } from 'react'
import { USUARIO_ACTUAL } from '../lib/datos'

// Datos de ejemplo — se reemplazan por Supabase en el Paso 4
const RECURRENTES_EJEMPLO = [
  { id: 1, descripcion: 'Netflix',  icono: '📱', categoria: 'Suscripciones',   importe: 3200,   medio_de_pago: 'Tarjeta Crédito Mercado Pago', compartido: true,  responsable: 'Lucas' },
  { id: 2, descripcion: 'Gym',      icono: '💆', categoria: 'Cuidado Personal', importe: 8000,   medio_de_pago: 'Efectivo',                    compartido: false, responsable: 'Lucas' },
  { id: 3, descripcion: 'Alquiler', icono: '🏠', categoria: 'Hogar',            importe: 150000, medio_de_pago: 'Efectivo',                    compartido: true,  responsable: 'Sofi'  },
]

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

// Ítem que el usuario debe confirmar (es el responsable)
function ItemConfirmar({ r, importe, onCambiarImporte, confirmado, onConfirmar, onDesconfirmar }) {
  return (
    <li className={`recurrente-item ${confirmado ? 'recurrente-item--confirmado' : ''}`}>
      <div className="recurrente-item__header">
        <span className="recurrente-item__icono">{r.icono}</span>
        <div className="recurrente-item__info">
          <span className="recurrente-item__nombre">
            {r.descripcion}
            {r.compartido && <span className="gasto-item__badge" style={{marginLeft: '0.4rem'}}>compartido</span>}
          </span>
          <span className="recurrente-item__detalle">{r.categoria} · {r.medio_de_pago}</span>
        </div>
        {confirmado && <span className="recurrente-item__ok">✓</span>}
      </div>

      {!confirmado ? (
        <div className="recurrente-item__acciones">
          <input
            type="number"
            inputMode="decimal"
            value={importe}
            onChange={e => onCambiarImporte(Number(e.target.value))}
            className="recurrente-item__input"
          />
          <button className="recurrente-item__confirmar" onClick={onConfirmar}>
            Confirmar
          </button>
        </div>
      ) : (
        <div className="recurrente-item__monto-ok">
          {formatearPesos(importe)}
          <button className="recurrente-item__editar-link" onClick={onDesconfirmar}>
            Editar
          </button>
        </div>
      )}
    </li>
  )
}

// Ítem que el otro paga — solo lectura + botón recordar
function ItemRecordar({ r }) {
  const [recordado, setRecordado] = useState(false)

  return (
    <li className="recurrente-item recurrente-item--otro">
      <div className="recurrente-item__header">
        <span className="recurrente-item__icono">{r.icono}</span>
        <div className="recurrente-item__info">
          <span className="recurrente-item__nombre">{r.descripcion}</span>
          <span className="recurrente-item__detalle">
            {r.categoria} · Lo paga {r.responsable} · {formatearPesos(r.importe / 2)} tu parte
          </span>
        </div>
      </div>
      <button
        className={`recurrente-item__recordar ${recordado ? 'recurrente-item__recordar--enviado' : ''}`}
        onClick={() => setRecordado(true)}
        disabled={recordado}
      >
        {recordado ? '✓ Recordatorio enviado' : `Recordar a ${r.responsable}`}
      </button>
    </li>
  )
}

function RecurrentesPendientes({ onCerrar }) {
  const misRecurrentes = RECURRENTES_EJEMPLO.filter(r => r.responsable === USUARIO_ACTUAL)
  const deOtros = RECURRENTES_EJEMPLO.filter(r => r.compartido && r.responsable !== USUARIO_ACTUAL)

  const [importes, setImportes] = useState(
    Object.fromEntries(RECURRENTES_EJEMPLO.map(r => [r.id, r.importe]))
  )
  const [confirmados, setConfirmados] = useState({})

  function todosConfirmados() {
    return misRecurrentes.every(r => confirmados[r.id])
  }

  function guardarTodos() {
    console.log('Gastos recurrentes a guardar:', misRecurrentes.map(r => ({
      ...r, importe: importes[r.id]
    })))
    alert('¡Gastos recurrentes confirmados! (todavía no se guardan en la base de datos)')
    onCerrar()
  }

  return (
    <>
      <div className="modal-overlay" onClick={onCerrar} />
      <div className="modal-panel">
        <div className="modal-header">
          <h2>Gastos recurrentes</h2>
          <button className="modal-cerrar" onClick={onCerrar}>✕</button>
        </div>

        {/* Mis recurrentes — para confirmar */}
        {misRecurrentes.length > 0 && (
          <>
            <p className="recurrentes__seccion-titulo">Para confirmar este mes</p>
            <ul className="recurrentes-lista">
              {misRecurrentes.map(r => (
                <ItemConfirmar
                  key={r.id}
                  r={r}
                  importe={importes[r.id]}
                  onCambiarImporte={val => setImportes(prev => ({ ...prev, [r.id]: val }))}
                  confirmado={!!confirmados[r.id]}
                  onConfirmar={() => setConfirmados(prev => ({ ...prev, [r.id]: true }))}
                  onDesconfirmar={() => setConfirmados(prev => ({ ...prev, [r.id]: false }))}
                />
              ))}
            </ul>
          </>
        )}

        {/* Recurrentes de la otra persona — para recordar */}
        {deOtros.length > 0 && (
          <>
            <p className="recurrentes__seccion-titulo">Compartidos — paga la otra persona</p>
            <ul className="recurrentes-lista">
              {deOtros.map(r => (
                <ItemRecordar key={r.id} r={r} />
              ))}
            </ul>
          </>
        )}

        {todosConfirmados() && (
          <button className="boton-guardar" onClick={guardarTodos}>
            Cargar todos al mes
          </button>
        )}

      </div>
    </>
  )
}

export default RecurrentesPendientes
