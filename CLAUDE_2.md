# Proyecto: App de Finanzas Personales (nombre provisional "Wally")

## Sobre mí (Lucas) — cómo quiero que trabajes

- No tengo experiencia previa en programación. Explicame el "por qué" de cada decisión, no solo el "qué".
- Construí fase por fase. En cada fase quiero tener algo que funcione — nunca me dejes en un estado roto.
- Antes de tocar código, confirmame el alcance completo de lo que vas a hacer.
- Soy metódico, no apurado. Prefiero entender bien antes de avanzar.
- Puedo trabajar en español o inglés indistintamente.
- El diseño visual (colores, tipografía, logo) lo definimos en otra conversación de chat, todavía no en Code. Por ahora arrancá con un estilo neutro/funcional — no inventes paleta ni tipografías definitivas, lo vamos a traer después.

## Qué es esta app

App de finanzas personales de uso real y diario para dos personas: **Lucas** y **Sofi** (pareja). Cada uno entra con su propio usuario. Hay gastos personales (de cada uno) y gastos compartidos (se dividen y generan un saldo entre ambos). Nació de una planilla Excel (`Gastos_Personales_Lucas.xlsx`) que usé como prototipo de la estructura de datos — esa planilla la diseñé desde la perspectiva de un solo usuario (yo), así que tiene un problema de diseño que abajo explico cómo resolver en la app real.

## Stack técnico

- **Frontend:** React (PWA — instalable en el celular), mobile-first
- **Base de datos:** Supabase (PostgreSQL + Auth + Realtime), capa gratuita
- **Sin backend propio** — Supabase actúa como backend
- **Deploy:** Vercel, capa gratuita

## Estado de infraestructura (YA HECHO)

- Node.js y Git instalados (Windows 10)
- GitHub: usuario `lucasdevita93`, repo `github.com/lucasdevita93/finanzas`
- Proyecto React + Vite llamado "finanzas", deployado en `finanzas-six-sigma.vercel.app`
- Proyecto de Supabase creado — **las tablas todavía NO están creadas a propósito.** Quedó acordado que la creación de tablas se hace recién cuando la UI esté validada con uso real, no antes. No crear tablas en Supabase hasta que yo lo pida explícitamente, aunque parezca el paso "lógico" siguiente.

---

## ⚠️ PUNTO CRÍTICO DE ARQUITECTURA: usuarios relativos vs. absolutos

En la planilla de Excel, la columna "¿Quién pagó?" tenía como opciones **"Yo" / "Sofi"**, porque la planilla es mía y "Yo" siempre significaba Lucas.

**Esto NO puede pasar así a la app**, porque Sofi también va a tener su propia sesión, y para ella "Yo" significaría Sofi, no Lucas. Si guardamos literalmente el string "Yo" en la base de datos, el dato pierde sentido apenas lo mira la otra persona.

**Solución:** en la base de datos, el campo de quién pagó debe guardar el **nombre absoluto** del usuario: `'Lucas'` o `'Sofi'` (o mejor aún, el `user_id` de Supabase Auth). La UI de cada usuario puede *mostrar* "Yo pagué" / "Pagó Sofi" traduciendo ese valor absoluto contra el usuario logueado, pero el dato guardado siempre es absoluto.

Esto aplica a **toda** la lógica de automatización descrita abajo: la regla no es "si pagó Sofi", es **"si pagó la otra persona (no el usuario actualmente logueado)"**. Esa regla tiene que funcionar simétrica para ambos usuarios.

---

## Lógica de negocio: gastos

### Campos del formulario de carga
- fecha (default: hoy)
- monto — **siempre el monto TOTAL del gasto, nunca la mitad**
- categoría (ver lista abajo)
- subcategoría (solo aplica a Vehículos y Viajes; el resto queda "—")
- descripción
- quién pagó: usuario actual o el otro usuario (selección simple, no texto libre)
- medio de pago
- cuotas (número, opcional)
- vencimiento de cuota (fecha, opcional)
- ¿compartido? Sí/No

### Automatización cuando paga "la otra persona" (no el usuario logueado)

Cuando el usuario logueado registra un gasto y marca que **pagó la otra persona**, automáticamente:

1. **Medio de pago queda vacío** — el usuario logueado no tiene por qué saber con qué tarjeta pagó la otra persona
2. **Cuotas y vencimiento quedan vacíos** — mismo motivo
3. **¿Compartido? se marca "Sí" automáticamente** — si la otra persona pagó algo que el usuario está cargando, se asume compartido por default
4. **"A mi cargo" se calcula como monto/2**

Cuando paga el usuario logueado (uno mismo), **nada se autocompleta** — el usuario llena medio de pago, cuotas y decide manualmente si es compartido o no (puede ser un gasto 100% personal).

### Cálculo de "a mi cargo"
```
a_mi_cargo = compartido == 'Sí'
  ? (monto / cuotas_o_1) / 2
  : (monto / cuotas_o_1)
```
Donde `cuotas_o_1` es el número de cuotas si hay, o 1 si no hay cuotas (gasto de pago único).

### Categorías de gastos (12, fijas por ahora — evitar sobre-categorización)
```
Hogar, Víveres, Vehículos, Salidas, Delivery, Suscripciones,
Compras personales, Regalos, Viajes, Cuidado Personal, Otros, Transporte
```
(Ya pasamos por el proceso de afinar esta lista — Salidas y Delivery están separados a propósito porque tienen patrones de gasto distintos; "Compras personales" existe para evitar que todo caiga en "Otros".)

---

## Lógica de negocio: gastos compartidos (el core de la app, estilo Splitwise)

- El split es **50/50 fijo por ahora**, pero la arquitectura debe permitir cambiar el % en el futuro (no hardcodear "/2" en 30 lugares distintos — centralizarlo en una función o constante de configuración)
- El usuario SIEMPRE ingresa el monto total, nunca la mitad
- Cuando alguien paga un gasto compartido, ambos lo ven en su propio historial, cada uno con su mitad calculada

### Fórmula del saldo neto (entre 2 personas)
```
total_pagado_Lucas   = suma de montos de gastos compartidos donde pagó_por = Lucas (no saldados)
total_pagado_Sofi    = suma de montos de gastos compartidos donde pagó_por = Sofi (no saldados)
total_compartido     = total_pagado_Lucas + total_pagado_Sofi
parte_justa_cada_uno = total_compartido / 2

saldo = (total_pagado_Sofi - total_pagado_Lucas) / 2

si saldo > 0  → Lucas le debe `saldo` a Sofi
si saldo < 0  → Sofi le debe `abs(saldo)` a Lucas
si saldo == 0 → están a mano
```

### Saldar deuda
- Marca todos los gastos compartidos **no saldados** como saldados (agregar campo `saldado: boolean` y `fecha_saldado: timestamp` a la tabla de gastos — no hace falta una tabla separada de "saldos")
- El cálculo de saldo neto **solo considera registros con `saldado = false`**
- Los registros saldados quedan en el historial para poder ver períodos anteriores, pero no afectan el saldo actual

---

## Lógica de negocio: ahorro

- Registro de compra de USD: fecha, monto USD, precio de compra en ARS
- Total USD acumulado = suma de todas las compras
- Equivalente en ARS al precio actual: consumir una API pública del dólar blue (ej. bluelytics.com.ar). **Verificar el endpoint y formato de respuesta exactos al momento de implementar** — no asumir una estructura de JSON sin chequearla primero, las APIs públicas cambian.
- Solo visible para Lucas (no es un dato compartido con Sofi)

## Lógica de negocio: inversiones

- Registro: fecha, tipo (FCI / Crypto / CEDEAR / Plazo Fijo / Caución), instrumento, monto ARS, plataforma, notas
- Total invertido agrupado por tipo
- Solo visible para Lucas

## Cuotas (instalments)

- Por ahora, carga manual de cada cuota — no hay generación automática de filas futuras
- Es una mejora a futuro, no para la primera versión

---

## Orden de construcción acordado

1. ✅ Cimientos (React + Supabase + Vercel) — YA HECHO
2. Esqueleto y navegación (tab bar inferior: Inicio / Gastos / Compartidos / Más)
3. **Formulario de carga de gasto (el core)** — debe ser rápido y simple, es la pantalla más usada. Implementar la automatización de "paga la otra persona" descrita arriba.
4. Lógica de compartidos (cálculo de saldo neto, botón saldar deuda, historial de períodos saldados)
5. Dashboard y vistas (resumen del mes, vista histórica, gráfico de gastos por categoría)
6. Ahorro e inversiones
7. Pulido final (diseño visual definitivo, responsividad, feedback visual al guardar)

## Reglas que no quiero que se rompan

- Nunca dejar el proyecto en estado roto entre pasos
- Explicar antes de ejecutar, no después
- No saltear fases ni adelantarse sin avisar
- Comentar el código en español
- Variables de entorno para credenciales de Supabase (`.env`, nunca hardcodeadas, y `.env` en `.gitignore`)
- Manejo de errores amigable — si algo falla, que el usuario lo sepa con un mensaje claro, no una pantalla en blanco o un error técnico crudo
- El dato de "quién pagó" siempre se guarda de forma absoluta (Lucas/Sofi), nunca relativa ("Yo")
