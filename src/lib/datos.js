// Datos de ejemplo — se reemplazan por Supabase en el Paso 4
// Un solo lugar para que el formulario y Config. lean lo mismo

export const USUARIO_ACTUAL = 'Lucas'
export const OTRO_USUARIO = 'Sofi'

export const MEDIOS_DE_PAGO = [
  { id: 1, nombre: 'Tarjeta Visa BBVA',           icono: '💳', esCredito: true  },
  { id: 2, nombre: 'Tarjeta Crédito Mercado Pago', icono: '💳', esCredito: true  },
  { id: 3, nombre: 'Efectivo',                     icono: '💵', esCredito: false },
]

export const CATEGORIAS = [
  { id: 1,  nombre: 'Hogar',               icono: '🏠' },
  { id: 2,  nombre: 'Víveres',             icono: '🛒' },
  { id: 3,  nombre: 'Vehículos',           icono: '🚗' },
  { id: 4,  nombre: 'Salidas',             icono: '🍻' },
  { id: 5,  nombre: 'Delivery',            icono: '🛵' },
  { id: 6,  nombre: 'Suscripciones',       icono: '📱' },
  { id: 7,  nombre: 'Compras personales',  icono: '🛍️' },
  { id: 8,  nombre: 'Regalos',             icono: '🎁' },
  { id: 9,  nombre: 'Viajes',              icono: '✈️' },
  { id: 10, nombre: 'Cuidado Personal',    icono: '💆' },
  { id: 11, nombre: 'Transporte',          icono: '🚇' },
  { id: 12, nombre: 'Otros',               icono: '📦' },
]

export function iconoDeCategoria(nombre) {
  return CATEGORIAS.find(c => c.nombre === nombre)?.icono ?? '📦'
}
