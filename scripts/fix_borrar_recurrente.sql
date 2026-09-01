-- Permite borrar una plantilla de gastos_recurrentes aunque ya tenga
-- gastos confirmados en meses anteriores que la referencian.
--
-- Hoy la relacion gastos.recurrente_id -> gastos_recurrentes.id probablemente
-- bloquea el DELETE (violacion de foreign key) si existen gastos ya cargados
-- desde esa plantilla. El fix cambia el comportamiento a ON DELETE SET NULL:
-- al borrar la plantilla, los gastos ya confirmados quedan intactos (con su
-- importe, fecha, categoria, etc.) pero pierden el vinculo a la plantilla
-- eliminada — que es exactamente lo que se espera: dejaste de pagar esa
-- suscripcion, pero el historial de lo que ya pagaste no debe desaparecer.
--
-- Ajustar el nombre de la constraint si difiere (verificar antes con el
-- SELECT de abajo).

-- 1) Verificar el nombre real de la constraint:
select conname
from pg_constraint
where conrelid = 'public.gastos'::regclass
  and confrelid = 'public.gastos_recurrentes'::regclass;

-- 2) Si el nombre coincide con "gastos_recurrente_id_fkey" (el default de
--    Postgres), correr esto. Si el SELECT de arriba dio otro nombre,
--    reemplazarlo en la linea "drop constraint".
alter table public.gastos
  drop constraint if exists gastos_recurrente_id_fkey;

alter table public.gastos
  add constraint gastos_recurrente_id_fkey
  foreign key (recurrente_id)
  references public.gastos_recurrentes(id)
  on delete set null;
