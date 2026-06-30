import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { registrarse, iniciarSesion, loginConGoogle, sesionRecuperacion, recuperarPassword, actualizarPassword } = useAuth()
  const [modo, setModo] = useState('inicio')
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')

  function resetForm() {
    setError('')
    setMensajeExito('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    resetForm()
    setCargando(true)

    if (modo === 'recuperar') {
      const { error } = await recuperarPassword(email)
      if (error) setError('No se pudo enviar el email. Verificá que esté bien escrito.')
      else setMensajeExito('Te enviamos un link para restablecer tu contraseña.')
      setCargando(false)
      return
    }

    if (modo === 'registro') {
      if (!nombre.trim()) { setError('Ingresá tu nombre'); setCargando(false); return }
      const nombreCompleto = apellido.trim() ? `${nombre.trim()} ${apellido.trim()}` : nombre.trim()
      const { error } = await registrarse({ nombre: nombreCompleto, email, password })
      if (error) setError(traducirError(error.message))
      else setMensajeExito('¡Cuenta creada! Revisá tu email para confirmar.')
    } else {
      const { error } = await iniciarSesion({ email, password })
      if (error) setError(traducirError(error.message))
    }

    setCargando(false)
  }

  async function handleGoogle() {
    resetForm()
    const { error } = await loginConGoogle()
    if (error) setError('No se pudo conectar con Google')
  }

  function traducirError(msg) {
    if (msg.includes('Invalid login credentials')) return 'Email o contraseña incorrectos'
    if (msg.includes('Email not confirmed')) return 'Confirmá tu email antes de ingresar'
    if (msg.includes('User already registered')) return 'Ya existe una cuenta con ese email'
    if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 8 caracteres'
    return 'Algo salió mal, intentá de nuevo'
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', paddingTop: '15vh', paddingBottom: '2rem', paddingLeft: '2rem', paddingRight: '2rem', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>

        {/* Pantalla de recuperación de contraseña (flujo especial) */}
        {sesionRecuperacion && (
          <>
            <h1 style={estiloTitulo}>Waldo</h1>
            <p style={estiloSubtitulo}>Ingresá tu nueva contraseña</p>
            <form onSubmit={async e => {
              e.preventDefault()
              setError(''); setCargando(true)
              const { error } = await actualizarPassword(nuevaPassword)
              if (error) setError('No se pudo actualizar la contraseña.')
              setCargando(false)
            }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={estiloGrupo}>
                <label style={estiloLabel}>Nueva contraseña</label>
                <input type="password" value={nuevaPassword} onChange={e => setNuevaPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres" required minLength={8} style={estiloInput} />
              </div>
              {error && <p style={estiloError}>{error}</p>}
              <button type="submit" disabled={cargando} className="boton-guardar" style={{ opacity: cargando ? 0.7 : 1, width: '100%' }}>
                {cargando ? 'Guardando...' : 'Guardar contraseña'}
              </button>
            </form>
          </>
        )}

        {/* Pantalla inicial — dos botones */}
        {!sesionRecuperacion && modo === 'inicio' && (
          <>
            <h1 style={estiloTitulo}>Waldo</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button onClick={handleGoogle} style={estiloBoton}>
                <IconGoogle />
                Ingresá con Google
              </button>

              <button onClick={() => { setModo('login'); resetForm() }} style={estiloBoton}>
                <IconEmail />
                Ingresá con tu email
              </button>
            </div>

          </>
        )}

        {/* Pantalla de login con email */}
        {!sesionRecuperacion && modo === 'login' && (
          <>
            <button onClick={() => { setModo('inicio'); resetForm() }} style={estiloVolver}>
              <IconVolver />
            </button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', lineHeight: '1.2' }}>
              Ingresá con<br />tu email
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={estiloGrupo}>
                <label style={estiloLabel}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com" required style={estiloInput} />
              </div>
              <div style={estiloGrupo}>
                <label style={estiloLabel}>Contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres" required style={estiloInput} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <button type="button" onClick={() => { setModo('recuperar'); resetForm() }}
                  style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '0.82rem' }}>
                  Olvidé mi contraseña
                </button>
              </div>
              {error && <p style={estiloError}>{error}</p>}
              {mensajeExito && <p style={estiloExito}>{mensajeExito}</p>}
              <button type="submit" disabled={cargando} className="boton-guardar"
                style={{ opacity: cargando ? 0.7 : 1, cursor: cargando ? 'not-allowed' : 'pointer', width: '100%' }}>
                {cargando ? 'Cargando...' : 'Ingresar'}
              </button>
            </form>
            <p style={estiloFooter}>
              ¿No tenés cuenta?{' '}
              <button onClick={() => { setModo('registro'); resetForm() }} style={estiloLink}>
                Registrate
              </button>
            </p>
          </>
        )}

        {/* Pantalla de registro */}
        {!sesionRecuperacion && modo === 'registro' && (
          <>
            <button onClick={() => { setModo('inicio'); resetForm() }} style={estiloVolver}>
              <IconVolver />
            </button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>Creá tu cuenta</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={estiloGrupo}>
                <label style={estiloLabel}>Nombre</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="Tu nombre" required style={estiloInput} />
              </div>
              <div style={estiloGrupo}>
                <label style={estiloLabel}>Apellido</label>
                <input type="text" value={apellido} onChange={e => setApellido(e.target.value)}
                  placeholder="Tu apellido" style={estiloInput} />
              </div>
              <div style={estiloGrupo}>
                <label style={estiloLabel}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com" required style={estiloInput} />
              </div>
              <div style={estiloGrupo}>
                <label style={estiloLabel}>Contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres" required style={estiloInput} />
              </div>
              {error && <p style={estiloError}>{error}</p>}
              {mensajeExito && <p style={estiloExito}>{mensajeExito}</p>}
              <button type="submit" disabled={cargando} className="boton-guardar"
                style={{ opacity: cargando ? 0.7 : 1, cursor: cargando ? 'not-allowed' : 'pointer', width: '100%' }}>
                {cargando ? 'Cargando...' : 'Crear cuenta'}
              </button>
            </form>
            <p style={estiloFooter}>
              ¿Ya tenés cuenta?{' '}
              <button onClick={() => { setModo('login'); resetForm() }} style={estiloLink}>
                Iniciá sesión
              </button>
            </p>
          </>
        )}

        {/* Pantalla de recuperar contraseña */}
        {!sesionRecuperacion && modo === 'recuperar' && (
          <>
            <button onClick={() => { setModo('login'); resetForm() }} style={estiloVolver}>
              <IconVolver />
            </button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>Recuperar contraseña</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Te enviamos un link a tu email para restablecerla.
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={estiloGrupo}>
                <label style={estiloLabel}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com" required style={estiloInput} />
              </div>
              {error && <p style={estiloError}>{error}</p>}
              {mensajeExito && <p style={estiloExito}>{mensajeExito}</p>}
              <button type="submit" disabled={cargando} className="boton-guardar"
                style={{ opacity: cargando ? 0.7 : 1, cursor: cargando ? 'not-allowed' : 'pointer', width: '100%' }}>
                {cargando ? 'Enviando...' : 'Enviar link'}
              </button>
            </form>
          </>
        )}

      </div>

      {/* Footer fijo abajo — solo en pantalla inicial */}
      {!sesionRecuperacion && modo === 'inicio' && (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
          ¿No tenés cuenta?{' '}
          <button onClick={() => { setModo('registro'); resetForm() }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}>
            Registrate
          </button>
        </p>
      )}
    </div>
  )
}

function IconGoogle() {
  return (
    <svg width="15" height="15" viewBox="0 0 48 48" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8 20-20 0-1.3-.1-2.7-.4-4z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.5 5C9.5 40.2 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.2C40.5 35.8 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/>
    </svg>
  )
}

function IconEmail() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m2 7 10 7 10-7"/>
    </svg>
  )
}

function IconVolver() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 5l-7 7 7 7"/>
    </svg>
  )
}

const estiloTitulo = {
  textAlign: 'center',
  marginBottom: '0.25rem',
  fontSize: '3.8rem',
  fontWeight: '700',
  lineHeight: '1',
}

const estiloSubtitulo = {
  textAlign: 'center',
  color: 'var(--text-secondary)',
  fontSize: '0.7rem',
}

const estiloBoton = {
  width: '100%',
  padding: '11px 16px',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: '11.5px',
  fontWeight: '500',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '7px',
}

const estiloInput = {
  padding: '0.8rem 1rem',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: '1rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const estiloGrupo = { display: 'flex', flexDirection: 'column', gap: '0.4rem' }
const estiloLabel = { fontSize: '0.85rem', color: 'var(--text-secondary)' }
const estiloError = { color: '#e74c3c', fontSize: '0.85rem', textAlign: 'center' }
const estiloExito = { color: '#27ae60', fontSize: '0.85rem', textAlign: 'center' }
const estiloFooter = { textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }
const estiloLink = { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' }
const estiloVolver = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', padding: '0', marginBottom: '1.5rem', display: 'block' }
