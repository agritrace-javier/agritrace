-- AgriTrace V2: explicitly published public lot details.
begin;

alter table public.lots
  add column is_public boolean not null default false;

alter table public.lots
  add constraint lots_public_scope_valid
  check (
    not is_public
    or (
      organization_id is not null
      and harvest_id is not null
    )
  );

-- Existing UPDATE policies continue to require Owner/Admin/Operator.
grant update (is_public)
on table public.lots
to authenticated;

create function public.get_public_lot(p_lot_id text)
returns table (
  id text,
  product_en text,
  product_es text,
  origin text,
  harvest_date text,
  batch text,
  photos text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    l.id,
    l.product_en,
    l.product_es,
    l.origin,
    l.harvest_date,
    l.batch,
    l.photos
  from public.lots l
  where l.id = upper(trim(p_lot_id))
    and l.is_public = true
    and l.is_active = true
    and l.organization_id is not null
    and l.harvest_id is not null
  limit 1;
$$;

revoke all privileges
on function public.get_public_lot(text)
from public, anon, authenticated;

grant execute
on function public.get_public_lot(text)
to anon, authenticated;

comment on column public.lots.is_public is
'Explicit publication flag. Public lookup also requires an active V2 lot.';

comment on function public.get_public_lot(text) is
'Returns selected public fields for one published active lot; no direct anonymous table access.';

commit;
