import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

function hoy() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function ItemConfirmar({ r, importe, onCambiarImporte, confirmado, onConfirmar, onDesconfirmar, emoji }) {
  return (
    <li className={`recurrente-item ${confirmado ? 'recurrente-item--confirmado' : ''}`}>
      <div className="recurrente-item__header">
        <span className="recurrente-item__icono">{emoji}</span>
        <div className="recurrente-item__info">
          <span className="recurrente-item__nombre">
            {r.descripcion || r.categoria_nombre}
            {r.compartido && <span className="gasto-item__badge" style={{ marginLeft: '0.4rem' }}>compartido</span>}
          </span>
          <span className="recurrente-item__detalle">{r.categoria_nombre} · {r.medio_de_pago_nombre || 'Sin medio'}</span>
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

function RecurrentesPendientes({ recurrentes, onCerrar, onConfirmado }) {
  const { perfil, categorias } = useAuth()
  const [importes, setImportes] = useState(
    Object.fromEntries(recurrentes.map(r => [r.id, r.importe]))
  )
  const [confirmados, setConfirmados] = useState({})
  const [guardando, setGuardando] = useState(false)

  function todosConfirmados() {
    return recurrentes.length > 0 && recurrentes.every(r => confirmados[r.id])
  }

  async function guardarTodos() {
    if (!perfil) return
    setGuardando(true)
    try {
      const gastos = recurrentes.map(r => ({
        user_id: perfil.id,
        pagador_id: perfil.id,
        importe: importes[r.id],
        moneda: 'ARS',
        fecha: hoy(),
        descripcion: r.descripcion || null,
        categoria_nombre: r.categoria_nombre,
        medio_de_pago_nombre: r.medio_de_pago_nombre || null,
        compartido: r.compartido,
        recurrente_id: r.id,
      }))
      const { error } = await supabase.from('gastos').insert(gastos)
      if (error) throw error
      onConfirmado?.()
      onCerrar()
    } catch (err) {
      console.error(err)
      alert('No se pudieron guardar los gastos. Intentá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  if (recurrentes.length === 0) {
    return (
      <>
        <div className="modal-overlay" onClick={onCerrar} />
        <div className="modal-panel">
          <div className="modal-header">
            <h2>Gastos recurrentes</h2>
            <button className="modal-cerrar" onClick={onCerrar}>✕</button>
          </div>
          <p className="sin-gastos">No hay recurrentes pendientes este mes.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="modal-overlay" onClick={onCerrar} />
      <div className="modal-panel">
        <div className="modal-header">
          <h2>Gastos recurrentes</h2>
          <button className="modal-cerrar" onClick={onCerrar}>✕</button>
        </div>

        <p className="recurrentes__seccion-titulo">Confirmá el importe de este mes</p>
        <ul className="recurrentes-lista">
          {recurrentes.map(r => {
            const cat = categorias.find(c => c.nombre === r.categoria_nombre)
            return (
              <ItemConfirmar
                key={r.id}
                r={r}
                emoji={cat?.emoji ?? '📦'}
                importe={importes[r.id]}
                onCambiarImporte={val => setImportes(prev => ({ ...prev, [r.id]: val }))}
                confirmado={!!confirmados[r.id]}
                onConfirmar={() => setConfirmados(prev => ({ ...prev, [r.id]: true }))}
                onDesconfirmar={() => setConfirmados(prev => ({ ...prev, [r.id]: false }))}
              />
            )
          })}
        </ul>

        {todosConfirmados() && (
          <button className="boton-guardar" onClick={guardarTodos} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Cargar todos al mes'}
          </button>
        )}
      </div>
    </>
  )
}

export default RecurrentesPendientes
