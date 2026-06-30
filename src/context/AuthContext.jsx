import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const MEDIOS_DEFAULT = [
  { nombre: 'Efectivo',    es_credito: false },
  { nombre: 'Débito',      es_credito: false },
  { nombre: 'Crédito',     es_credito: true  },
]

const CATEGORIAS_PERSONALES_DEFAULT = [
  { nombre: 'Suscripciones',      emoji: '📱', tipo: 'personal' },
  { nombre: 'Compras personales', emoji: '🛍️', tipo: 'personal' },
  { nombre: 'Regalos',            emoji: '🎁', tipo: 'personal' },
  { nombre: 'Cuidado Personal',   emoji: '💆', tipo: 'personal' },
  { nombre: 'Transporte',         emoji: '🚇', tipo: 'personal' },
]

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [medios, setMedios] = useState([])
  const [categorias, setCategorias] = useState([])
  const [recurrentes, setRecurrentes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [sesionRecuperacion, setSesionRecuperacion] = useState(false)
  const [pareja, setPareja] = useState(null)
  const parejaRef = useRef(null)
  const desvinculandoRef = useRef(false)
  const perfilRef = useRef(null)
  const [solicitudVinculo, setSolicitudVinculo] = useState(null)
  const [avisoDesvinculado, setAvisoDesvinculado] = useState(null)
  const [avisoSaldado, setAvisoSaldado] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUsuario(session?.user ?? null)
      if (session?.user) cargarPerfil(session.user.id)
      else setCargando(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'INITIAL_SESSION') return
      if (_event === 'PASSWORD_RECOVERY') { setSesionRecuperacion(true); return }
      setSesionRecuperacion(false)
      setUsuario(session?.user ?? null)
      if (session?.user) cargarPerfil(session.user.id)
      else { setPerfil(null); setMedios([]); setCategorias([]); setRecurrentes([]); setCargando(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!perfil?.id) return
    const channel = supabase
      .channel(`saldo_${perfil.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'pagos_saldo',
        filter: `receptor_id=eq.${perfil.id}`,
      }, ({ new: pago }) => {
        if (pago.tipo === 'pago') {
          const nombre = parejaRef.current?.nombre ?? 'El otro usuario'
          setAvisoSaldado({ tipo: 'pago', nombre, id: null })
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificaciones',
        filter: `para_user_id=eq.${perfil.id}`,
      }, ({ new: notif }) => {
        const nombre = parejaRef.current?.nombre ?? 'El otro usuario'
        setAvisoSaldado({ tipo: notif.tipo, nombre, id: notif.id })
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [perfil?.id])

  useEffect(() => {
    if (!perfil?.id) return
    const channel = supabase
      .channel(`perfil_${perfil.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'perfiles',
        filter: `id=eq.${perfil.id}`,
      }, ({ new: nuevo }) => {
        if (perfilRef.current?.pareja_id && !nuevo.pareja_id && !desvinculandoRef.current) {
          setAvisoDesvinculado(parejaRef.current?.nombre ?? null)
        }
        perfilRef.current = nuevo
        setPerfil(nuevo)
        if (nuevo.vinculo_pendiente_de) {
          supabase.from('perfiles').select('id, nombre').eq('id', nuevo.vinculo_pendiente_de).single()
            .then(({ data }) => { if (data) setSolicitudVinculo(data) })
        } else {
          setSolicitudVinculo(null)
        }
        if (nuevo.pareja_id) {
          supabase.from('perfiles').select('id, nombre').eq('id', nuevo.pareja_id).single()
            .then(({ data }) => { if (data) { setPareja(data); parejaRef.current = data } })
        } else {
          setPareja(null); parejaRef.current = null
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [perfil?.id])

  async function cargarPerfil(userId) {
    const { data } = await supabase.from('perfiles').select('*').eq('id', userId).single()
    let perfilFinal = data
    if (!data) {
      const { data: { user } } = await supabase.auth.getUser()
      const nombre = user?.user_metadata?.full_name
        || user?.user_metadata?.name
        || user?.email?.split('@')[0]
        || 'Usuario'
      const codigo = nombre.substring(0, 5).toUpperCase().replace(/\s/g, '') + '-' + Math.floor(Math.random() * 9000 + 1000)
      const { data: nuevo } = await supabase
        .from('perfiles')
        .insert({ id: userId, nombre, codigo_vinculacion: codigo })
        .select()
        .single()
      perfilFinal = nuevo
    }
    setPerfil(perfilFinal)
    perfilRef.current = perfilFinal
    if (perfilFinal) {
      const promesas = [
        cargarMedios(perfilFinal.id),
        cargarCategorias(perfilFinal.id),
        cargarRecurrentes(perfilFinal.id),
      ]
      if (perfilFinal.pareja_id) {
        promesas.push(
          supabase.from('perfiles').select('id, nombre').eq('id', perfilFinal.pareja_id).single()
            .then(({ data }) => { if (data) { setPareja(data); parejaRef.current = data } })
        )
      }
      if (perfilFinal.vinculo_pendiente_de) {
        promesas.push(
          supabase.from('perfiles').select('id, nombre').eq('id', perfilFinal.vinculo_pendiente_de).single()
            .then(({ data }) => { if (data) setSolicitudVinculo(data) })
        )
      }
      await Promise.all(promesas)
      await cargarNotificaciones(perfilFinal.id)
    }
    setCargando(false)
  }

  async function cargarNotificaciones(userId) {
    const { data } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('para_user_id', userId)
      .eq('leida', false)
      .order('created_at', { ascending: false })
      .limit(1)
    if (data && data.length > 0) {
      const notif = data[0]
      const nombre = parejaRef.current?.nombre ?? 'El otro usuario'
      setAvisoSaldado({ tipo: notif.tipo, nombre, id: notif.id })
    }
  }

  async function marcarNotificacionLeida(id) {
    await supabase.from('notificaciones').update({ leida: true }).eq('id', id)
  }

  async function cargarMedios(userId) {
    const { data } = await supabase
      .from('medios_de_pago')
      .select('*')
      .eq('user_id', userId)
      .order('created_at')

    if (data && data.length === 0) {
      // Primera vez — sembrar medios por defecto
      const { data: sembrados } = await supabase
        .from('medios_de_pago')
        .insert(MEDIOS_DEFAULT.map(m => ({ ...m, user_id: userId })))
        .select()
      setMedios(sembrados ?? [])
    } else {
      setMedios(data ?? [])
    }
  }

  async function cargarRecurrentes(userId) {
    const { data } = await supabase
      .from('gastos_recurrentes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at')
    setRecurrentes(data ?? [])
  }

  async function agregarRecurrente(datos) {
    if (!perfil) return null
    const { data } = await supabase
      .from('gastos_recurrentes')
      .insert({ ...datos, user_id: perfil.id })
      .select()
      .single()
    if (data) setRecurrentes(prev => [...prev, data])
    return data
  }

  async function actualizarRecurrente(id, datos) {
    const { data } = await supabase
      .from('gastos_recurrentes')
      .update(datos)
      .eq('id', id)
      .select()
      .single()
    if (data) setRecurrentes(prev => prev.map(r => r.id === id ? data : r))
    return data
  }

  async function eliminarRecurrente(id) {
    await supabase.from('gastos_recurrentes').delete().eq('id', id)
    setRecurrentes(prev => prev.filter(r => r.id !== id))
  }

  async function cargarCategorias(userId) {
    const { data } = await supabase
      .from('categorias')
      .select('*')
      .or(`tipo.eq.compartida,user_id.eq.${userId}`)
      .order('tipo')
      .order('nombre')

    if (data && data.filter(c => c.tipo === 'personal').length === 0) {
      const { data: sembradas } = await supabase
        .from('categorias')
        .insert(CATEGORIAS_PERSONALES_DEFAULT.map(c => ({ ...c, user_id: userId })))
        .select()
      setCategorias([...(data ?? []), ...(sembradas ?? [])])
    } else {
      setCategorias(data ?? [])
    }
  }

  async function agregarCategoria({ nombre, emoji }) {
    if (!perfil) return
    const { data } = await supabase
      .from('categorias')
      .insert({ nombre, emoji, tipo: 'personal', user_id: perfil.id })
      .select()
      .single()
    if (data) setCategorias(prev => [...prev, data])
  }

  async function eliminarCategoria(id) {
    await supabase.from('categorias').delete().eq('id', id)
    setCategorias(prev => prev.filter(c => c.id !== id))
  }

  async function actualizarCategoria(id, { nombre, emoji }, nombreAnterior) {
    const { data } = await supabase
      .from('categorias')
      .update({ nombre, emoji })
      .eq('id', id)
      .select()
      .single()
    if (data) {
      setCategorias(prev => prev.map(c => c.id === id ? data : c))
      if (nombre !== nombreAnterior) {
        await supabase
          .from('gastos')
          .update({ categoria_nombre: nombre })
          .eq('user_id', perfil.id)
          .eq('categoria_nombre', nombreAnterior)
        await supabase
          .from('gastos_recurrentes')
          .update({ categoria_nombre: nombre })
          .eq('user_id', perfil.id)
          .eq('categoria_nombre', nombreAnterior)
      }
    }
  }

  async function agregarMedio({ nombre, es_credito }) {
    if (!perfil) return
    const { data } = await supabase
      .from('medios_de_pago')
      .insert({ nombre, es_credito, user_id: perfil.id })
      .select()
      .single()
    if (data) setMedios(prev => [...prev, data])
  }

  async function eliminarMedio(id) {
    await supabase.from('medios_de_pago').delete().eq('id', id)
    setMedios(prev => prev.filter(m => m.id !== id))
  }

  async function actualizarMedio(id, { nombre, es_credito }, nombreAnterior) {
    const { data } = await supabase
      .from('medios_de_pago')
      .update({ nombre, es_credito })
      .eq('id', id)
      .select()
      .single()
    if (data) {
      setMedios(prev => prev.map(m => m.id === id ? data : m))
      if (nombre !== nombreAnterior) {
        await supabase
          .from('gastos')
          .update({ medio_de_pago_nombre: nombre })
          .eq('user_id', perfil.id)
          .eq('medio_de_pago_nombre', nombreAnterior)
      }
    }
  }

  async function recuperarPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    return { error }
  }

  async function actualizarPassword(nuevaPassword) {
    const { error } = await supabase.auth.updateUser({ password: nuevaPassword })
    if (!error) setSesionRecuperacion(false)
    return { error }
  }

  async function buscarPorCodigo(codigo) {
    if (!perfil) return { data: null, error: 'No hay perfil cargado' }
    if (codigo === perfil.codigo_vinculacion) return { data: null, error: 'Ese es tu propio código' }

    const { data, error } = await supabase
      .from('perfiles')
      .select('id, nombre, pareja_id')
      .eq('codigo_vinculacion', codigo)
      .single()

    if (error || !data) return { data: null, error: 'Código no encontrado. Verificá que esté bien escrito.' }
    if (data.pareja_id) return { data: null, error: `${data.nombre} ya está vinculado con alguien.` }
    return { data, error: null }
  }

  async function solicitarVinculo(parejaData) {
    if (!perfil) return { error: 'No hay perfil cargado' }
    const { error } = await supabase
      .from('perfiles')
      .update({ vinculo_pendiente_de: perfil.id })
      .eq('id', parejaData.id)
    if (error) return { error: 'No se pudo enviar la solicitud. Intentá de nuevo.' }
    return { error: null }
  }

  async function aceptarVinculo() {
    if (!perfil?.vinculo_pendiente_de) return { error: 'No hay solicitud pendiente' }
    const solicitanteId = perfil.vinculo_pendiente_de
    const { error: e1 } = await supabase.from('perfiles').update({ pareja_id: solicitanteId, vinculo_pendiente_de: null }).eq('id', perfil.id)
    const { error: e2 } = await supabase.from('perfiles').update({ pareja_id: perfil.id }).eq('id', solicitanteId)
    if (e1 || e2) return { error: 'No se pudo vincular. Intentá de nuevo.' }
    const { data: perfilActualizado } = await supabase.from('perfiles').select('*').eq('id', perfil.id).single()
    setPerfil(perfilActualizado)
    setPareja(solicitudVinculo)
    parejaRef.current = solicitudVinculo
    setSolicitudVinculo(null)
    return { error: null }
  }

  async function rechazarVinculo() {
    if (!perfil) return
    await supabase.from('perfiles').update({ vinculo_pendiente_de: null }).eq('id', perfil.id)
    setPerfil(prev => ({ ...prev, vinculo_pendiente_de: null }))
    setSolicitudVinculo(null)
  }

  async function desvincular() {
    if (!perfil?.pareja_id) return
    desvinculandoRef.current = true
    await supabase.from('perfiles').update({ pareja_id: null }).eq('id', perfil.id)
    await supabase.from('perfiles').update({ pareja_id: null }).eq('id', perfil.pareja_id)
    setPerfil(prev => ({ ...prev, pareja_id: null }))
    setPareja(null)
    parejaRef.current = null
    setTimeout(() => { desvinculandoRef.current = false }, 2000)
  }

  async function registrarse({ nombre, email, password }) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } }
    })
    return { error }
  }

  async function iniciarSesion({ email, password }) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function loginConGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    return { error }
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      usuario, perfil, pareja, medios, categorias, recurrentes, cargando,
      registrarse, iniciarSesion, loginConGoogle, cerrarSesion,
      cargarPerfil, cargarMedios, agregarMedio, eliminarMedio, actualizarMedio,
      cargarCategorias, agregarCategoria, eliminarCategoria, actualizarCategoria,
      cargarRecurrentes, agregarRecurrente, actualizarRecurrente, eliminarRecurrente,
      buscarPorCodigo, solicitarVinculo, aceptarVinculo, rechazarVinculo, desvincular,
      solicitudVinculo, avisoDesvinculado, setAvisoDesvinculado,
      avisoSaldado, setAvisoSaldado, marcarNotificacionLeida,
      sesionRecuperacion, recuperarPassword, actualizarPassword,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
