-- Public order numbers without a full-table scan or a race.
--
-- Before this, the API read `select config from orders limit 1000`, took the max
-- `publicOrderNumber` and added one. Two concurrent checkouts produced the same
-- number, and the scan silently broke past 1000 orders.
--
-- Safe to run more than once.

-- 1. Sequence, seeded past whatever the JSON scan has already handed out.
do $$
declare
  current_max bigint;
begin
  if not exists (select 1 from pg_class where relname = 'public_order_number_seq') then
    select coalesce(max((config ->> 'publicOrderNumber')::bigint), 99)
      into current_max
      from public.orders
     where config ? 'publicOrderNumber'
       and (config ->> 'publicOrderNumber') ~ '^[0-9]+$';

    execute format(
      'create sequence public.public_order_number_seq start with %s increment by 1 minvalue 100',
      greatest(coalesce(current_max, 99) + 1, 100)
    );
  end if;
end
$$;

-- 2. RPC the API calls instead of scanning. One round trip, atomic.
create or replace function public.next_public_order_number()
returns bigint
language sql
volatile
security definer
set search_path = public
as $$
  select nextval('public.public_order_number_seq');
$$;

revoke all on function public.next_public_order_number() from public;
grant execute on function public.next_public_order_number() to service_role;
