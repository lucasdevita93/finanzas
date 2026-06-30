import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import FormularioGasto from '../components/FormularioGasto'
import { CATEGORIAS as CATEGORIAS_INICIALES, USUARIO_ACTUAL } from '../lib/datos'

function Mas() {
  const { usuario, cerrarSesion, perfil, pareja, medios, categorias, recurrentes, agregarMedio, eliminarMedio, actualizarMedio, agregarCategoria, eliminarCategoria, actualizarCategoria, eliminarRecurrente: eliminarRecurrenteCtx, buscarPorCodigo, solicitarVinculo, aceptarVinculo, rechazarVinculo, desvincular, solicitudVinculo } = useAuth()
  const [nuevoMedio, setNuevoMedio] = useState({ nombre: '', esCredito: false })
  const [codigoPareja, setCodigoPareja] = useState('')
  const [vinculando, setVinculando] = useState(false)
  const [errorVinculo, setErrorVinculo] = useState('')
  const [parejaPreview, setParejaPreview] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [solicitudEnviada, setSolicitudEnviada] = useState(false)
  const [confirmandoDesvincular, setConfirmandoDesvincular] = useState(false)
  const [nuevaCategoria, setNuevaCategoria] = useState({ nombre: '', icono: '' })
  const [seccionAbierta, setSeccionAbierta] = useState(null)
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(null) // { tipo, id }
  const [recurrenteEditando, setRecurrenteEditando] = useState(null)
  const [editandoMedio, setEditandoMedio] = useState(null) // { id, nombre, es_credito, nombreOriginal }
  const [editandoCategoria, setEditandoCategoria] = useState(null) // { id, nombre, emoji, nombreOriginal }

  async function handleAgregarMedio() {
    if (!nuevoMedio.nombre.trim()) return
    await agregarMedio({ nombre: nuevoMedio.nombre.trim(), es_credito: nuevoMedio.esCredito })
    setNuevoMedio({ nombre: '', esCredito: false })
  }

  async function handleBuscar() {
    if (!codigoPareja.trim()) return
    setVinculando(true)
    setErrorVinculo('')
    const { data, error } = await buscarPorCodigo(codigoPareja.trim().toUpperCase())
    if (error) setErrorVinculo(error)
    else setParejaPreview(data)
    setVinculando(false)
  }

  async function handleSolicitarVinculo() {
    setVinculando(true)
    const { error } = await solicitarVinculo(parejaPreview)
    if (error) setErrorVinculo(error)
    else { setSolicitudEnviada(true); setParejaPreview(null); setCodigoPareja('') }
    setVinculando(false)
  }

  function handleCopiarCodigo() {
    navigator.clipboard.writeText(perfil.codigo_vinculacion)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function handleDesvincular() {
    await desvincular()
  }

  async function handleEliminarMedio(id) {
    await eliminarMedio(id)
    setConfirmandoEliminar(null)
  }

  async function handleGuardarMedio() {
    if (!editandoMedio?.nombre?.trim()) return
    await actualizarMedio(editandoMedio.id, { nombre: editandoMedio.nombre.trim(), es_credito: editandoMedio.es_credito }, editandoMedio.nombreOriginal)
    setEditandoMedio(null)
  }

  async function handleGuardarCategoria() {
    if (!editandoCategoria?.nombre?.trim()) return
    await actualizarCategoria(editandoCategoria.id, { nombre: editandoCategoria.nombre.trim(), emoji: editandoCategoria.emoji }, editandoCategoria.nombreOriginal)
    setEditandoCategoria(null)
  }

  async function handleAgregarCategoria() {
    if (!nuevaCategoria.nombre.trim()) return
    await agregarCategoria({ nombre: nuevaCategoria.nombre.trim(), emoji: nuevaCategoria.icono })
    setNuevaCategoria({ nombre: '', icono: '' })
  }

  async function handleEliminarCategoria(id) {
    await eliminarCategoria(id)
    setConfirmandoEliminar(null)
  }

  async function handleEliminarRecurrente(id) {
    await eliminarRecurrenteCtx(id)
    setConfirmandoEliminar(null)
  }

  function toggleSeccion(nombre) {
    setSeccionAbierta(prev => prev === nombre ? null : nombre)
  }

  return (
    <div className="pagina config">

      <h1>Configuración</h1>

      {/* Perfil */}
      <div className="config-seccion">
        <div className="config-perfil">
          <div className="config-perfil__avatar">
            {usuario?.user_metadata?.avatar_url
              ? <img src={usuario.user_metadata.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : <span>{perfil?.nombre?.[0] ?? '?'}</span>
            }
          </div>
          <div className="config-perfil__info">
            <p className="config-perfil__nombre">{perfil?.nombre ?? '...'}</p>
            {usuario?.email && <p className="config-perfil__email">{usuario.email}</p>}
            <p className="config-perfil__vinculo">
              {perfil?.pareja_id ? `Vinculado con ${pareja?.nombre ?? 'tu pareja'}` : 'Sin vincular aún'}
            </p>
            {perfil?.codigo_vinculacion && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Tu código: <strong>{perfil.codigo_vinculacion}</strong>
                </p>
                <button onClick={handleCopiarCodigo} style={{ background: 'none', border: 'none', padding: '0.1rem 0.3rem', cursor: 'pointer', color: copiado ? '#27ae60' : '#aaa', fontSize: '1rem', lineHeight: 1 }} title="Copiar código">
                  {copiado ? '✓' : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
                </button>
              </div>
            )}
          </div>
        </div>

        {solicitudVinculo && !perfil?.pareja_id && (
          <div className="vinculo-form" style={{ background: '#f0f7ff', borderRadius: '10px', padding: '0.75rem', marginTop: '0.75rem' }}>
            <p className="vinculo-form__label"><strong>{solicitudVinculo.nombre}</strong> quiere vincularse con vos</p>
            <div className="vinculo-form__fila">
              <button className="vinculo-form__boton" onClick={aceptarVinculo}>Aceptar</button>
              <button className="vinculo-activo__desvincular" onClick={rechazarVinculo}>Rechazar</button>
            </div>
          </div>
        )}

        {perfil?.pareja_id ? (
          <div className="vinculo-activo">
            <p className="vinculo-activo__texto">✓ Vinculado con {pareja?.nombre ?? 'tu pareja'}</p>
            {confirmandoDesvincular ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#666' }}>¿Desvincular?</span>
                <button className="config-confirmar-eliminar__si" onClick={() => { handleDesvincular(); setConfirmandoDesvincular(false) }}>Sí</button>
                <button className="config-confirmar-eliminar__no" onClick={() => setConfirmandoDesvincular(false)}>No</button>
              </div>
            ) : (
              <button className="vinculo-activo__desvincular" onClick={() => setConfirmandoDesvincular(true)}>
                Desvincular
              </button>
            )}
          </div>
        ) : parejaPreview ? (
          <div className="vinculo-form">
            <p className="vinculo-form__label">¿Querés vincularte con <strong>{parejaPreview.nombre}</strong>?</p>
            <div className="vinculo-form__fila">
              <button className="vinculo-form__boton" onClick={handleSolicitarVinculo} disabled={vinculando}>
                {vinculando ? '...' : 'Enviar solicitud'}
              </button>
              <button className="vinculo-activo__desvincular" onClick={() => { setParejaPreview(null); setCodigoPareja('') }}>
                Cancelar
              </button>
            </div>
          </div>
        ) : solicitudEnviada ? (
          <div className="vinculo-form">
            <p className="vinculo-form__label" style={{ color: '#27ae60' }}>✓ Solicitud enviada. La otra persona debe aceptarla desde su app.</p>
            <button className="vinculo-activo__desvincular" onClick={() => setSolicitudEnviada(false)}>
              Enviar a otra persona
            </button>
          </div>
        ) : (
          <div className="vinculo-form">
            <p className="vinculo-form__label">Ingresá el código de usuario para vincularte y compartir gastos:</p>
            <div className="vinculo-form__fila">
              <input
                type="text"
                placeholder="Ej: LUCAS-1234"
                value={codigoPareja}
                onChange={e => { setCodigoPareja(e.target.value); setErrorVinculo('') }}
                onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                className="vinculo-form__input"
              />
              <button
                className="vinculo-form__boton"
                onClick={handleBuscar}
                disabled={vinculando || !codigoPareja.trim()}
              >
                {vinculando ? '...' : 'Buscar'}
              </button>
            </div>
            {errorVinculo && <p className="vinculo-form__error">{errorVinculo}</p>}
          </div>
        )}
      </div>

      {/* Medios de pago */}
      <div className="config-seccion">
        <button
          className="config-seccion__header"
          onClick={() => toggleSeccion('medios')}
        >
          <span>💳 Medios de pago</span>
          <span>{seccionAbierta === 'medios' ? '▲' : '▼'}</span>
        </button>

        {seccionAbierta === 'medios' && (
          <div className="config-seccion__contenido">
            <ul className="config-lista">
              {medios.map(medio => (
                <li key={medio.id} className="config-lista__item">
                  {editandoMedio?.id === medio.id ? (
                    <div className="config-editar-inline">
                      <input
                        className="config-editar-inline__input"
                        value={editandoMedio.nombre}
                        onChange={e => setEditandoMedio(prev => ({ ...prev, nombre: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleGuardarMedio(); if (e.key === 'Escape') setEditandoMedio(null) }}
                        autoFocus
                      />
                      <button className="config-editar-inline__ok" onClick={handleGuardarMedio}>✓</button>
                      <button className="config-lista__eliminar" onClick={() => setEditandoMedio(null)}>✕</button>
                    </div>
                  ) : (
                    <>
                      <span
                        className="config-lista__item-texto config-lista__item-texto--editable"
                        onClick={() => { setEditandoMedio({ id: medio.id, nombre: medio.nombre, es_credito: medio.es_credito, nombreOriginal: medio.nombre }); setConfirmandoEliminar(null) }}
                      >
                        {medio.nombre}
                        {medio.es_credito && <span className="medio-badge-credito">crédito</span>}
                      </span>
                      {confirmandoEliminar?.tipo === 'medio' && confirmandoEliminar.id === medio.id ? (
                        <div className="config-confirmar-eliminar">
                          <span>¿Eliminar?</span>
                          <button className="config-confirmar-eliminar__si" onClick={() => handleEliminarMedio(medio.id)}>Sí</button>
                          <button className="config-confirmar-eliminar__no" onClick={() => setConfirmandoEliminar(null)}>No</button>
                        </div>
                      ) : (
                        <button className="config-lista__eliminar" onClick={() => setConfirmandoEliminar({ tipo: 'medio', id: medio.id })}>✕</button>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
            <div className="config-agregar">
              <input
                type="text"
                placeholder="Ej: Tarjeta Visa BBVA"
                value={nuevoMedio.nombre}
                onChange={e => setNuevoMedio(prev => ({ ...prev, nombre: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAgregarMedio()}
              />
              <div className="medio-credito-toggle">
                <label className="medio-credito-toggle__label">
                  <input
                    type="checkbox"
                    checked={nuevoMedio.esCredito}
                    onChange={e => setNuevoMedio(prev => ({ ...prev, esCredito: e.target.checked }))}
                  />
                  <span>💳 Es tarjeta de crédito</span>
                </label>
                <p className="medio-credito-toggle__info">
                  Al activarlo, cuando cargues un gasto con esta tarjeta podés ingresar el total una sola vez y dividirlo en la cantidad de cuotas que pagaste. Waldo registra automáticamente una cuota por mes.
                </p>
              </div>
              <button onClick={handleAgregarMedio}>+ Agregar</button>
            </div>
          </div>
        )}
      </div>

      {/* Categorías */}
      <div className="config-seccion">
        <button
          className="config-seccion__header"
          onClick={() => toggleSeccion('categorias')}
        >
          <span>📊 Categorías</span>
          <span>{seccionAbierta === 'categorias' ? '▲' : '▼'}</span>
        </button>

        {seccionAbierta === 'categorias' && (
          <div className="config-seccion__contenido">
            <ul className="config-lista">
              {categorias.map(cat => (
                <li key={cat.id} className="config-lista__item">
                  {editandoCategoria?.id === cat.id ? (
                    <div className="config-editar-inline">
                      <input
                        className="config-editar-inline__emoji"
                        value={editandoCategoria.emoji}
                        onChange={e => setEditandoCategoria(prev => ({ ...prev, emoji: e.target.value }))}
                        maxLength={2}
                      />
                      <input
                        className="config-editar-inline__input"
                        value={editandoCategoria.nombre}
                        onChange={e => setEditandoCategoria(prev => ({ ...prev, nombre: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleGuardarCategoria(); if (e.key === 'Escape') setEditandoCategoria(null) }}
                        autoFocus
                      />
                      <button className="config-editar-inline__ok" onClick={handleGuardarCategoria}>✓</button>
                      <button className="config-lista__eliminar" onClick={() => setEditandoCategoria(null)}>✕</button>
                    </div>
                  ) : (
                    <>
                      <span
                        className={`config-lista__item-texto${cat.tipo === 'personal' ? ' config-lista__item-texto--editable' : ''}`}
                        onClick={() => cat.tipo === 'personal' && (setEditandoCategoria({ id: cat.id, nombre: cat.nombre, emoji: cat.emoji, nombreOriginal: cat.nombre }), setConfirmandoEliminar(null))}
                      >
                        {cat.emoji} {cat.nombre}
                        {cat.tipo === 'compartida' && <span className="medio-badge-credito">compartida</span>}
                      </span>
                      {cat.tipo === 'personal' && (
                        confirmandoEliminar?.tipo === 'categoria' && confirmandoEliminar.id === cat.id ? (
                          <div className="config-confirmar-eliminar">
                            <span>¿Eliminar?</span>
                            <button className="config-confirmar-eliminar__si" onClick={() => handleEliminarCategoria(cat.id)}>Sí</button>
                            <button className="config-confirmar-eliminar__no" onClick={() => setConfirmandoEliminar(null)}>No</button>
                          </div>
                        ) : (
                          <button className="config-lista__eliminar" onClick={() => setConfirmandoEliminar({ tipo: 'categoria', id: cat.id })}>✕</button>
                        )
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
            <div className="config-agregar config-agregar--categoria">
              <input
                type="text"
                placeholder="Ícono (ej: 🏋️)"
                value={nuevaCategoria.icono}
                onChange={e => setNuevaCategoria(prev => ({ ...prev, icono: e.target.value }))}
              />
              <input
                type="text"
                placeholder="Nombre de categoría"
                value={nuevaCategoria.nombre}
                onChange={e => setNuevaCategoria(prev => ({ ...prev, nombre: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAgregarCategoria()}
              />
              <button onClick={handleAgregarCategoria}>+ Agregar</button>
            </div>
          </div>
        )}
      </div>

      {/* Gastos recurrentes */}
      <div className="config-seccion">
        <button className="config-seccion__header" onClick={() => toggleSeccion('recurrentes')}>
          <span>📋 Gastos recurrentes</span>
          <span>{seccionAbierta === 'recurrentes' ? '▲' : '▼'}</span>
        </button>
        {seccionAbierta === 'recurrentes' && (
          <div className="config-seccion__contenido">
            {recurrentes.length === 0 ? (
              <p className="sin-gastos">No tenés gastos recurrentes configurados</p>
            ) : (
              <ul className="config-lista">
                {recurrentes.map(r => {
                  const cat = categorias.find(c => c.nombre === r.categoria_nombre)
                  return (
                    <li key={r.id} className="config-lista__item">
                      <span className="config-lista__item-texto">
                        {cat?.emoji ?? '📦'} {r.descripcion || r.categoria_nombre}
                        {r.compartido && <span className="medio-badge-credito">compartido</span>}
                      </span>
                      <div className="config-lista__acciones">
                        <button className="config-lista__editar" onClick={() => setRecurrenteEditando(r)}>✏️</button>
                        {confirmandoEliminar?.tipo === 'recurrente' && confirmandoEliminar.id === r.id ? (
                          <div className="config-confirmar-eliminar">
                            <span>¿Eliminar?</span>
                            <button className="config-confirmar-eliminar__si" onClick={() => handleEliminarRecurrente(r.id)}>Sí</button>
                            <button className="config-confirmar-eliminar__no" onClick={() => setConfirmandoEliminar(null)}>No</button>
                          </div>
                        ) : (
                          <button className="config-lista__eliminar" onClick={() => setConfirmandoEliminar({ tipo: 'recurrente', id: r.id })}>✕</button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            <button
              className="boton-guardar"
              style={{ marginTop: '0.75rem' }}
              onClick={() => setRecurrenteEditando({})}
            >
              + Agregar recurrente
            </button>
          </div>
        )}
      </div>

      {/* Cerrar sesión */}
      <button className="boton-cerrar-sesion" onClick={cerrarSesion}>
        Cerrar sesión
      </button>

      {recurrenteEditando !== null && (
        <FormularioGasto
          onCerrar={() => setRecurrenteEditando(null)}
          onGuardado={() => setRecurrenteEditando(null)}
          modoRecurrente={true}
          gastoInicial={recurrenteEditando?.id ? {
            id: recurrenteEditando.id,
            importe: recurrenteEditando.importe,
            categoria: recurrenteEditando.categoria_nombre,
            descripcion: recurrenteEditando.descripcion,
            medio_de_pago: recurrenteEditando.medio_de_pago_nombre,
            compartido: recurrenteEditando.compartido,
          } : null}
        />
      )}

    </div>
  )
}

export default Mas
