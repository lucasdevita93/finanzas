import { useState } from 'react'
import FormularioGasto from '../components/FormularioGasto'

// Datos de ejemplo — se reemplazan por datos reales de Supabase en el Paso 4
const GASTOS_MES_EJEMPLO = 42900
const SALDO_COMPARTIDO_EJEMPLO = -3750

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

function nombreMesActual() {
  return new Date().toLocaleString('es-AR', { month: 'long', year: 'numeric' })
}

function Inicio() {
  const [formularioAbierto, setFormularioAbierto] = useState(false)
  const saldoPositivo = SALDO_COMPARTIDO_EJEMPLO >= 0

  return (
    <div className="pagina inicio">

      <h2 className="inicio__mes">{nombreMesActual()}</h2>

      {/* Total gastado */}
      <div className="tarjeta">
        <p className="tarjeta__label">Total gastado</p>
        <p className="tarjeta__monto">{formatearPesos(GASTOS_MES_EJEMPLO)}</p>
      </div>

      {/* Botón flotante para cargar gasto desde Inicio */}
      <button
        className="boton-flotante boton-flotante--ancho"
        onClick={() => setFormularioAbierto(true)}
        aria-label="Cargar gasto"
      >
        + Gasto
      </button>

      {formularioAbierto && (
        <FormularioGasto onCerrar={() => setFormularioAbierto(false)} />
      )}

      {/* Saldo compartido al pie */}
      <div className="saldo-compartido">
        <span className="saldo-compartido__label">Gastos compartidos</span>
        <span className={`saldo-compartido__monto ${saldoPositivo ? 'saldo--positivo' : 'saldo--negativo'}`}>
          {saldoPositivo ? '+' : '-'}{formatearPesos(Math.abs(SALDO_COMPARTIDO_EJEMPLO))}
        </span>
      </div>

    </div>
  )
}

export default Inicio
