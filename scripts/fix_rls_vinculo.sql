-- Reemplaza la vinculacion de pareja por funciones security definer,
-- para poder eliminar la policy "permitir solicitud de vinculo" (USING true)
-- que hoy permite a cualquier usuario autenticado modificar CUALQUIER perfil.

create or replace function public.solicitar_vinculo(destino_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if destino_id = auth.uid() then
    raise exception 'No podés vincularte con vos mismo';
  end if;

  if exists (select 1 from perfiles where id = auth.uid() and pareja_id is not null) then
    raise exception 'Ya estás vinculado con alguien';
  end if;

  update perfiles
  set vinculo_pendiente_de = auth.uid()
  where id = destino_id
    and pareja_id is null;

  if not found then
    raise exception 'No se pudo enviar la solicitud';
  end if;
end;
$$;

create or replace function public.aceptar_vinculo()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  solicitante_id uuid;
begin
  select vinculo_pendiente_de into solicitante_id
  from perfiles
  where id = auth.uid();

  if solicitante_id is null then
    raise exception 'No hay solicitud pendiente';
  end if;

  if exists (select 1 from perfiles where id = solicitante_id and pareja_id is not null) then
    raise exception 'Esa persona ya está vinculada con alguien';
  end if;

  update perfiles
  set pareja_id = solicitante_id, vinculo_pendiente_de = null
  where id = auth.uid();

  update perfiles
  set pareja_id = auth.uid()
  where id = solicitante_id;
end;
$$;

create or replace function public.desvincular_pareja()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pareja_actual uuid;
begin
  select pareja_id into pareja_actual
  from perfiles
  where id = auth.uid();

  if pareja_actual is null then
    raise exception 'No tenés pareja vinculada';
  end if;

  update perfiles set pareja_id = null where id = auth.uid();
  update perfiles set pareja_id = null where id = pareja_actual;
end;
$$;

revoke execute on function public.solicitar_vinculo(uuid) from public;
revoke execute on function public.aceptar_vinculo() from public;
revoke execute on function public.desvincular_pareja() from public;
grant execute on function public.solicitar_vinculo(uuid) to authenticated;
grant execute on function public.aceptar_vinculo() to authenticated;
grant execute on function public.desvincular_pareja() to authenticated;

-- Este es el paso que cierra el agujero: sin esta policy, nadie puede
-- tocar el perfil de otro usuario salvo a traves de las funciones de arriba.
drop policy if exists "permitir solicitud de vinculo" on public.perfiles;
