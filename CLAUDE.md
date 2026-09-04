# Waldo — app de gastos compartidos

App de finanzas personales para Lucas y Sofi. Reemplaza una planilla Excel con una app
mobile-first que las dos personas puedan usar juntas para cargar y compartir gastos.

Stack: React + Vite + PWA + Supabase + Vercel.

## Producción

- **URL**: `https://waldo-gastos.vercel.app`
- **Vercel project**: `finanzas`
- **Supabase project**: `rdkiwrckyanjwcudqutw` (región us-west-2)
- **GitHub repo**: conectado a Vercel — push a `main` = redeploy automático
- **Google OAuth**: configurado y funcionando en producción
- Credenciales de Supabase van en `.env` (no está en git, hay que crearlo a mano en cada
  PC — ver `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`)

## Pantallas y componentes

- **Gastos** (`src/pages/Gastos.jsx`) — navegación por mes, gastos propios + compartidos
  del otro usuario mezclados, "Por categoría", "Por medio de pago", "Proyección", banner
  de recurrentes pendientes (funciona para cualquier mes, no solo el actual), botón
  "+ Gasto"
- **Compartidos** (`src/pages/Compartidos.jsx`) — total compartido gastado, saldo neto
  con mascota Waldo Debe/Acreedor/Compartidos según estado, "Por categoría". No tiene
  botón de saldar/reclamar deuda (se sacó, no encajaba con el uso real mes a mes)
- **Más / Configuración** (`src/pages/Mas.jsx`) — perfil, vinculación de cuentas, medios
  de pago, categorías, recurrentes (con total mensual mostrado), cerrar sesión
- `FormularioGasto` — modal compartido para crear/editar gastos normales y plantillas de
  recurrentes (`modoRecurrente`); el mismo componente se abre desde Configuración y desde
  la confirmación mensual de recurrentes
- `RecurrentesPendientes` — confirmación mensual de gastos recurrentes; permite editar/
  eliminar la plantilla desde ahí mismo (reutiliza `FormularioGasto`). Si el recurrente es
  compartido, antes de confirmar se elige "Pagué yo" / "Pagó <nombre>" (sin valor por
  defecto, se elige cada mes)
- `ProximasCuotas` — modal abierto desde Gastos (botón "Proyección"). Proyección de
  compromisos hacia adelante: navegación de mes (del actual hasta la última cuota).
  "Total comprometido" = recurrentes estimados + cuotas de tus medios de pago. Bloques:
  1) fila apretable "Gastos recurrentes" (estimado fijo mes a mes, leído de `recurrentes`
  del AuthContext, misma "tu parte" que Configuración; se despliega al detalle);
  2) fila apretable "Gastos en cuotas" (total del mes); adentro, desglose por medio de
  pago y cada medio se abre al detalle por compra (cuota X/N, importe/mes, mes de fin);
  3) sección aparte "Compartidas pagadas por <nombre>" con la parte propia y su subtotal
  (NO suma al total de arriba). Todo acordeón, sin sangrías. Las cuotas se traen de
  Supabase (`gastos` con `cuotas_total` y `fecha >=` mes actual); los recurrentes ya
  están en el contexto
- `AuthContext` (`src/context/AuthContext.jsx`) — fuente de verdad del estado global:
  usuario, perfil, pareja, medios, categorías, recurrentes, notificaciones, vinculación

## Tablas en Supabase

- `perfiles` — id, nombre, codigo_vinculacion, pareja_id, vinculo_pendiente_de
- `gastos` — user_id, pagador_id, importe, fecha, categoria_nombre, medio_de_pago_nombre,
  compartido, cuotas_total, cuota_numero, moneda, cotizacion, monto_original, recurrente_id
- `medios_de_pago` — user_id, nombre, es_credito
- `categorias` — user_id, nombre, emoji, tipo ('compartida'|'personal'). Las 'compartida'
  tienen `user_id = NULL` y son fijas/administradas a mano por Lucas — RLS ya bloquea que
  cualquier usuario las edite o borre
- `gastos_recurrentes` — user_id, descripcion, importe, categoria_nombre,
  medio_de_pago_nombre, compartido (son plantillas; cada mes se confirma y genera una
  fila en `gastos` con `recurrente_id` apuntando a esta tabla)
- `pagos_saldo`, `notificaciones` — quedaron de la función de saldar deuda que se sacó de
  la UI; las tablas siguen existiendo pero no se usan activamente

## Notas de arquitectura

- `gastos.pagador_id` puede diferir de `gastos.user_id`: la fila la crea/edita siempre su
  dueño (`user_id`, así no hace falta tocar RLS), pero al cargar un gasto compartido se
  puede elegir "¿Quién pagó?" y adjudicárselo al otro usuario. El saldo de Compartidos y
  las etiquetas "Pagó X" se calculan por `pagador_id`; poder editar/borrar depende de
  `user_id` (ser dueño de la fila)

- Nombres de categoría/medio de pago se guardan como texto (`categoria_nombre`,
  `medio_de_pago_nombre`), no como FK — renombrar en Configuración actualiza en cascada
  los `gastos` y `gastos_recurrentes` existentes (`actualizarMedio`/`actualizarCategoria`
  en AuthContext)
- Saldo de Compartidos: `(totalMio - totalOtro) / 2`, recalculado por mes (no se acumula
  entre meses — decisión consciente, ver más abajo)
- Confirmar un recurrente actualiza también el importe de la plantilla si se editó al
  confirmar, para que el mes siguiente sugiera el último valor usado
- `gastos.recurrente_id -> gastos_recurrentes.id` es `ON DELETE SET NULL`: al borrar una
  plantilla de recurrente, los gastos ya confirmados quedan intactos, solo pierden el
  vínculo a la plantilla eliminada (fix aplicado 02/09/2026, antes bloqueaba el borrado)

## Pendiente

- **Seguridad — fix RLS de `perfiles` (prioritario, ya preparado, no aplicado)**: la
  policy "permitir solicitud de vinculo" tiene `USING (true)` — cualquier usuario
  autenticado puede modificar el perfil de cualquier otro (nombre, pareja_id, etc.) vía
  API directa. El arreglo ya está escrito en `scripts/fix_rls_vinculo.sql` (funciones
  `solicitar_vinculo`/`aceptar_vinculo`/`desvincular_pareja` como RPC security definer +
  borra la policy insegura). Pasos: 1) correr ese SQL en el SQL Editor de Supabase,
  2) recién ahí adaptar `AuthContext.jsx` para usar `supabase.rpc(...)` en vez de
  `update` directo (si se sube el código antes del SQL, se rompe la vinculación en
  producción), 3) probar el flujo completo de vincular/aceptar/rechazar/desvincular.
- Estética: colores, tipografía, logo — pendiente de definir más a fondo
- Cuotas: falta validar auto-generación de las N filas al guardar un gasto en cuotas
- Ingresos: pendiente de definir dónde se cargan
- Botón "Editar perfil" en Configuración: no funcional todavía
- Balance de Compartidos no se acumula entre meses (si no se salda en el momento, no hay
  arrastre) — decisión consciente por ahora, revisar si se vuelve un problema real

## Cómo trabajar en este proyecto

- Lucas trabaja desde dos PCs (laburo y personal) — antes de tocar código, chequear
  `git status`/hacer `git pull`; después de cada cambio, commitear y pushear en el
  momento, no acumular cambios sin subir
- Construir fase por fase, nunca dejar el proyecto en estado roto entre pasos
- Plantear el plan antes de tocar código si el cambio no es trivial
- Comentarios en el código en español, cuando hagan falta
- Nunca decir "la pareja" ni "tu pareja" (ni en el chat ni en textos de la UI) — usar
  "usuario", "el otro usuario", o el nombre real si se conoce
- No crear tablas nuevas en Supabase sin pedido explícito
- Credenciales de Supabase siempre en `.env`, nunca hardcodeadas
- El código en disco es la fuente de verdad — si algo de este archivo lo contradice,
  creer el código y actualizar este archivo
