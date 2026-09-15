import { supabase } from './supabase'
import { USUARIO_ACTUAL } from './datos'

export function normalizarGasto(g, perfil, categorias, pareja) {
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

// Trae los gastos (propios + compartidos del otro usuario) de un mes puntual,
// ya normalizados. Usado por Gastos y por los modales de análisis (Categoría,
// Medio de pago) para que su propia navegación de mes traiga dato real.
export async function cargarGastosDelMes({ perfil, pareja, categorias, anio, mes }) {
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

  return todos.map(g => normalizarGasto(g, perfil, categorias, pareja))
}
