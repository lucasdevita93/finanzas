import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import FormularioGasto from './FormularioGasto'

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

function hoy() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fechaParaConfirmar(anio, mes) {
  const ahora = new Date()
  const esMesActual = anio === ahora.getFullYear() && mes === ahora.getMonth()
  if (esMesActual) return hoy()
  return `${anio}-${String(mes + 1).padStart(2, '0')}-01`
}

function ItemConfirmar({ r, importe, onCambiarImporte, guardado, guardando, onConfirmar, onEditar, emoji, perfil, pareja, pagadorId, onCambiarPagador }) {
  return (
    <li className={`recurrente-item ${guardado ? 'recurrente-item--confirmado' : ''}`}>
      <div className="recurrente-item__header" onClick={onEditar} style={{ cursor: 'pointer' }}>
        <span className="recurrente-item__icono">{emoji}</span>
        <div className="recurrente-item__info">
          <span className="recurrente-item__nombre">
            {r.descripcion || r.categoria_nombre}
            {r.compartido && <span className="gasto-item__badge" style={{ marginLeft: '0.4rem' }}>compartido</span>}
          </span>
          <span className="recurrente-item__detalle">{r.categoria_nombre} · {r.medio_de_pago_nombre || 'Sin medio'}</span>
        </div>
        {guardado && <span className="recurrente-item__ok">✓</span>}
      </div>

      {r.compartido && pareja && !guardado && (
        <div className="chips" style={{ marginBottom: '0.5rem' }}>
          <button
            type="button"
            className={`chip ${pagadorId === perfil.id ? 'chip--activo' : ''}`}
            onClick={() => onCambiarPagador(perfil.id)}
          >
            Pagué yo
          </button>
          <button
            type="button"
            className={`chip ${pagadorId === pareja.id ? 'chip--activo' : ''}`}
            onClick={() => onCambiarPagador(pareja.id)}
          >
            Pagó {pareja.nombre}
          </button>
        </div>
      )}

      {!guardado ? (
        <div className="recurrente-item__acciones">
          <input
            type="number"
            inputMode="decimal"
            value={importe}
            onChange={e => onCambiarImporte(Number(e.target.value))}
            className="recurrente-item__input"
          />
          <button className="recurrente-item__confirmar" onClick={onConfirmar} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Confirmar'}
          </button>
        </div>
      ) : (
        <div className="recurrente-item__monto-ok">
          {formatearPesos(importe)}
        </div>
      )}
    </li>
  )
}

function RecurrentesPendientes({ recurrentes, anio, mes, nombreMes, onCerrar, onConfirmado }) {
  const { perfil, pareja, categorias, actualizarRecurrente } = useAuth()
  const [importes, setImportes] = useState(
    Object.fromEntries(recurrentes.map(r => [r.id, r.importe]))
  )
  const [pagadores, setPagadores] = useState(
    Object.fromEntries(recurrentes.map(r => [r.id, perfil?.id]))
  )
  const [guardados, setGuardados] = useState({})
  const [guardandoId, setGuardandoId] = useState(null)
  const [editando, setEditando] = useState(null)

  async function confirmarUno(r) {
    if (!perfil) return
    setGuardandoId(r.id)
    try {
      const { error } = await supabase.from('gastos').insert({
        user_id: perfil.id,
        pagador_id: pagadores[r.id] ?? perfil.id,
        importe: importes[r.id],
        moneda: 'ARS',
        fecha: fechaParaConfirmar(anio, mes),
        descripcion: r.descripcion || null,
        categoria_nombre: r.categoria_nombre,
        medio_de_pago_nombre: r.medio_de_pago_nombre || null,
        compartido: r.compartido,
        recurrente_id: r.id,
      })
      if (error) throw error
      if (importes[r.id] !== r.importe) {
        await actualizarRecurrente(r.id, { importe: importes[r.id] })
      }
      setGuardados(prev => ({ ...prev, [r.id]: true }))
      onConfirmado?.()
    } catch (err) {
      console.error(err)
      alert('No se pudo guardar el gasto. Intentá de nuevo.')
    } finally {
      setGuardandoId(null)
    }
  }

  if (recurrentes.length === 0 && !editando) {
    return (
      <>
        <div className="modal-overlay" onClick={onCerrar} />
        <div className="modal-panel">
          <div className="modal-header">
            <h2>Gastos recurrentes</h2>
            <button className="modal-cerrar" onClick={onCerrar}>✕</button>
          </div>
          <p className="sin-gastos">No hay recurrentes pendientes{nombreMes ? ` en ${nombreMes}` : ' este mes'}.</p>
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

        <p className="recurrentes__seccion-titulo">
          Confirmá el importe{nombreMes ? ` de ${nombreMes}` : ' de este mes'}
        </p>
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
                guardado={!!guardados[r.id]}
                guardando={guardandoId === r.id}
                onConfirmar={() => confirmarUno(r)}
                onEditar={() => setEditando(r)}
                perfil={perfil}
                pareja={pareja}
                pagadorId={pagadores[r.id]}
                onCambiarPagador={val => setPagadores(prev => ({ ...prev, [r.id]: val }))}
              />
            )
          })}
        </ul>
      </div>

      {editando && (
        <FormularioGasto
          modoRecurrente
          gastoInicial={editando}
          titulo="Editar gasto recurrente"
          onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); onConfirmado?.() }}
        />
      )}
    </>
  )
}

export default RecurrentesPendientes
