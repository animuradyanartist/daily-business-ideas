-- Shared DataForSEO budget: atomic reservations for every app that spends on the account.
--
-- Canonical copy for review. The same file is proposed to Career OS as
-- supabase/migrations/0024_dataforseo_budget.sql (the ledger lives in Career OS's Supabase).
-- Additive and idempotent. NOT applied to production by this change.
--
-- WHY. The previous guard was read-then-spend: each caller summed `dataforseo.spend` rows in
-- runtime_events, called DataForSEO, then appended its charge. Two callers (or two runs of one)
-- could both read "under the cap" and both spend; a crash or a failed write between the charge
-- and the append left spend unrecorded; a timed-out request was never recorded at all.
--
-- HOW.
--   1. reserve   — under a row lock on the project's budget row, sum this month's recorded
--                  charges + every open hold, and insert a hold only if the estimate still fits.
--                  Concurrent reservations serialize on that lock, so they cannot overspend.
--   2. call the provider (outside the database).
--   3. settle    — mark the hold charged with the provider-reported cost AND append the
--                  `dataforseo.spend` runtime event in the same transaction (existing readers of
--                  runtime_events keep working; nothing is counted twice).
--      uncertain — the request may have been charged (timeout, dropped connection): the hold
--                  stays counted at its estimate. It is never released automatically.
--      release   — the request provably was not charged (refused before sending, or an error
--                  response the provider does not bill): the hold stops counting.
--   A hold that is never settled (caller crashed) expires into `uncertain` and keeps counting.
--
-- ACCESS. Callers do not need the service-role key. Each app gets a random client token; only
-- its SHA-256 is stored. The functions are SECURITY DEFINER, check the token, and act only on
-- that client's project and holds. Tables have RLS enabled with no policies, so the anon key
-- alone can read or write nothing. Revoke an app by disabling its client row.

create table if not exists dataforseo_budget_settings (
  project_id uuid primary key references projects(id) on delete cascade,
  monthly_cap_usd numeric(10,4) not null check (monthly_cap_usd >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists dataforseo_budget_clients (
  client_id text primary key check (client_id ~ '^[a-z0-9-]{2,40}$'),
  project_id uuid not null references dataforseo_budget_settings(project_id) on delete cascade,
  token_sha256 text not null unique check (token_sha256 ~ '^[0-9a-f]{64}$'),
  max_request_usd numeric(10,4) not null default 0.10 check (max_request_usd > 0),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists dataforseo_budget_holds (
  id uuid primary key,
  project_id uuid not null references dataforseo_budget_settings(project_id) on delete cascade,
  client_id text not null references dataforseo_budget_clients(client_id),
  budget_month date not null,
  status text not null check (status in ('reserved', 'charged', 'released', 'uncertain')),
  estimated_usd numeric(10,4) not null check (estimated_usd > 0),
  actual_usd numeric(10,4) check (actual_usd >= 0),
  endpoint text not null,
  request_key text,
  note text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  settled_at timestamptz
);

create index if not exists idx_dataforseo_budget_holds_open
  on dataforseo_budget_holds (project_id, budget_month, status);

alter table dataforseo_budget_settings enable row level security;
alter table dataforseo_budget_clients enable row level security;
alter table dataforseo_budget_holds enable row level security;
revoke all on dataforseo_budget_settings, dataforseo_budget_clients, dataforseo_budget_holds from anon, authenticated;

-- Internal: the authenticated client for a token, or no row.
create or replace function dataforseo_budget__client(p_token text)
returns dataforseo_budget_clients
language sql stable security definer set search_path = public, pg_temp
as $$
  select c.* from dataforseo_budget_clients c
   where length(coalesce(p_token, '')) >= 32
     and c.enabled
     and c.token_sha256 = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
$$;

-- Internal: committed spend for a project and month (recorded charges + open holds).
create or replace function dataforseo_budget__committed(p_project uuid, p_month date)
returns table (charged_usd numeric, held_usd numeric, open_holds int, uncertain_holds int)
language sql stable security definer set search_path = public, pg_temp
as $$
  select
    coalesce((select sum(case when jsonb_typeof(e.payload -> 'cost') = 'number' then (e.payload ->> 'cost')::numeric else 0 end)
                from runtime_events e
               where e.project_id = p_project
                 and e.type = 'dataforseo.spend'
                 and e.occurred_at >= (p_month::timestamp at time zone 'utc')
                 and e.occurred_at < ((p_month + interval '1 month')::timestamp at time zone 'utc')), 0),
    coalesce((select sum(h.estimated_usd) from dataforseo_budget_holds h
               where h.project_id = p_project and h.budget_month = p_month
                 and h.status in ('reserved', 'uncertain')), 0),
    (select count(*)::int from dataforseo_budget_holds h
      where h.project_id = p_project and h.budget_month = p_month and h.status = 'reserved'),
    (select count(*)::int from dataforseo_budget_holds h
      where h.project_id = p_project and h.budget_month = p_month and h.status = 'uncertain');
$$;

create or replace function dataforseo_budget_reserve(
  p_token text,
  p_hold_id uuid,
  p_estimated_usd numeric,
  p_endpoint text,
  p_request_key text default null,
  p_max_total_usd numeric default null, -- a caller may LOWER the ceiling for itself, never raise it
  p_ttl_seconds int default 900
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  c dataforseo_budget_clients;
  s dataforseo_budget_settings;
  h dataforseo_budget_holds;
  m date := date_trunc('month', timezone('utc', now()))::date;
  k record;
  v_ceiling numeric;
begin
  c := dataforseo_budget__client(p_token);
  if c.client_id is null then return jsonb_build_object('ok', false, 'reason', 'unauthorized'); end if;
  if p_hold_id is null or p_endpoint is null or p_estimated_usd is null or p_estimated_usd <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_request');
  end if;
  if p_estimated_usd > c.max_request_usd then
    return jsonb_build_object('ok', false, 'reason', 'request_limit', 'max_request_usd', c.max_request_usd);
  end if;

  -- Serialize every budget change for this project.
  select * into s from dataforseo_budget_settings where project_id = c.project_id for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_configured'); end if;

  -- Idempotent: re-sending the same reservation never reserves twice.
  select * into h from dataforseo_budget_holds where id = p_hold_id;
  if found then
    if h.client_id <> c.client_id then return jsonb_build_object('ok', false, 'reason', 'hold_id_conflict'); end if;
    return jsonb_build_object('ok', h.status = 'reserved', 'duplicate', true, 'hold_id', h.id, 'status', h.status);
  end if;

  -- A caller that crashed never settles: its expired hold keeps counting as uncertain.
  update dataforseo_budget_holds
     set status = 'uncertain', note = concat_ws('; ', note, 'expired without settlement')
   where project_id = c.project_id and status = 'reserved' and expires_at < now();

  select * into k from dataforseo_budget__committed(c.project_id, m);
  v_ceiling := least(s.monthly_cap_usd, coalesce(p_max_total_usd, s.monthly_cap_usd));

  if k.charged_usd + k.held_usd + p_estimated_usd > v_ceiling then
    return jsonb_build_object('ok', false, 'reason', 'cap', 'month', m, 'cap_usd', s.monthly_cap_usd,
      'ceiling_usd', v_ceiling, 'charged_usd', k.charged_usd, 'held_usd', k.held_usd,
      'remaining_usd', greatest(v_ceiling - k.charged_usd - k.held_usd, 0));
  end if;

  insert into dataforseo_budget_holds (id, project_id, client_id, budget_month, status, estimated_usd, endpoint, request_key, expires_at)
  values (p_hold_id, c.project_id, c.client_id, m, 'reserved', p_estimated_usd, p_endpoint, p_request_key,
          now() + make_interval(secs => greatest(60, least(coalesce(p_ttl_seconds, 900), 3600))));

  return jsonb_build_object('ok', true, 'hold_id', p_hold_id, 'month', m, 'cap_usd', s.monthly_cap_usd,
    'ceiling_usd', v_ceiling, 'charged_usd', k.charged_usd, 'held_usd', k.held_usd + p_estimated_usd,
    'remaining_usd', v_ceiling - k.charged_usd - k.held_usd - p_estimated_usd);
end;
$$;

create or replace function dataforseo_budget_settle(
  p_token text,
  p_hold_id uuid,
  p_actual_usd numeric,
  p_payload jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  c dataforseo_budget_clients;
  h dataforseo_budget_holds;
begin
  c := dataforseo_budget__client(p_token);
  if c.client_id is null then return jsonb_build_object('ok', false, 'reason', 'unauthorized'); end if;
  if p_actual_usd is null or p_actual_usd < 0 then return jsonb_build_object('ok', false, 'reason', 'invalid_request'); end if;
  perform 1 from dataforseo_budget_settings where project_id = c.project_id for update;

  select * into h from dataforseo_budget_holds where id = p_hold_id for update;
  if not found or h.client_id <> c.client_id then return jsonb_build_object('ok', false, 'reason', 'unknown_hold'); end if;
  if h.status = 'charged' then return jsonb_build_object('ok', true, 'duplicate', true, 'hold_id', h.id); end if;
  if h.status = 'released' then return jsonb_build_object('ok', false, 'reason', 'hold_released'); end if;

  update dataforseo_budget_holds
     set status = 'charged', actual_usd = p_actual_usd, settled_at = now()
   where id = h.id;

  -- The spend row existing readers already count. Dated at reservation time so it lands in
  -- the same month the hold counted in; `cost` always comes from p_actual_usd.
  insert into runtime_events (id, project_id, type, payload, produced_by, occurred_at, processed, processed_at)
  values (h.id, h.project_id, 'dataforseo.spend',
          coalesce(p_payload, '{}'::jsonb) || jsonb_build_object('cost', p_actual_usd, 'holdId', h.id,
            'estimatedUsd', h.estimated_usd, 'client', h.client_id, 'endpoint', h.endpoint),
          h.client_id, h.created_at, true, now())
  on conflict (id) do nothing;

  return jsonb_build_object('ok', true, 'hold_id', h.id, 'actual_usd', p_actual_usd,
    'over_estimate', p_actual_usd > h.estimated_usd);
end;
$$;

create or replace function dataforseo_budget_mark_uncertain(p_token text, p_hold_id uuid, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  c dataforseo_budget_clients;
  h dataforseo_budget_holds;
begin
  c := dataforseo_budget__client(p_token);
  if c.client_id is null then return jsonb_build_object('ok', false, 'reason', 'unauthorized'); end if;
  perform 1 from dataforseo_budget_settings where project_id = c.project_id for update;
  select * into h from dataforseo_budget_holds where id = p_hold_id for update;
  if not found or h.client_id <> c.client_id then return jsonb_build_object('ok', false, 'reason', 'unknown_hold'); end if;
  if h.status in ('uncertain', 'charged') then return jsonb_build_object('ok', true, 'duplicate', true, 'status', h.status); end if;
  if h.status = 'released' then return jsonb_build_object('ok', false, 'reason', 'hold_released'); end if;
  update dataforseo_budget_holds set status = 'uncertain', note = concat_ws('; ', note, left(p_note, 300)) where id = h.id;
  return jsonb_build_object('ok', true, 'hold_id', h.id, 'status', 'uncertain');
end;
$$;

-- Only for requests that provably were not charged. An uncertain hold cannot be released by a client.
create or replace function dataforseo_budget_release(p_token text, p_hold_id uuid, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  c dataforseo_budget_clients;
  h dataforseo_budget_holds;
begin
  c := dataforseo_budget__client(p_token);
  if c.client_id is null then return jsonb_build_object('ok', false, 'reason', 'unauthorized'); end if;
  perform 1 from dataforseo_budget_settings where project_id = c.project_id for update;
  select * into h from dataforseo_budget_holds where id = p_hold_id for update;
  if not found or h.client_id <> c.client_id then return jsonb_build_object('ok', false, 'reason', 'unknown_hold'); end if;
  if h.status = 'released' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if h.status <> 'reserved' then return jsonb_build_object('ok', false, 'reason', 'not_releasable', 'status', h.status); end if;
  update dataforseo_budget_holds set status = 'released', settled_at = now(), note = concat_ws('; ', note, left(p_note, 300)) where id = h.id;
  return jsonb_build_object('ok', true, 'hold_id', h.id, 'status', 'released');
end;
$$;

create or replace function dataforseo_budget_status(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  c dataforseo_budget_clients;
  s dataforseo_budget_settings;
  m date := date_trunc('month', timezone('utc', now()))::date;
  k record;
begin
  c := dataforseo_budget__client(p_token);
  if c.client_id is null then return jsonb_build_object('ok', false, 'reason', 'unauthorized'); end if;
  select * into s from dataforseo_budget_settings where project_id = c.project_id;
  select * into k from dataforseo_budget__committed(c.project_id, m);
  return jsonb_build_object('ok', true, 'client_id', c.client_id, 'month', m, 'cap_usd', s.monthly_cap_usd,
    'charged_usd', k.charged_usd, 'held_usd', k.held_usd, 'open_holds', k.open_holds,
    'uncertain_holds', k.uncertain_holds, 'max_request_usd', c.max_request_usd,
    'remaining_usd', greatest(s.monthly_cap_usd - k.charged_usd - k.held_usd, 0));
end;
$$;

-- Owner-only recovery for uncertain holds, once the real outcome is known (e.g. from the
-- DataForSEO dashboard). Not callable with a client token.
create or replace function dataforseo_budget_admin_resolve(p_hold_id uuid, p_outcome text, p_actual_usd numeric default null, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  h dataforseo_budget_holds;
  v_project uuid;
begin
  -- Same lock order as every other function (settings row, then hold) to avoid deadlocks.
  select project_id into v_project from dataforseo_budget_holds where id = p_hold_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'unknown_hold'); end if;
  perform 1 from dataforseo_budget_settings where project_id = v_project for update;
  select * into h from dataforseo_budget_holds where id = p_hold_id for update;
  if h.status not in ('reserved', 'uncertain') then return jsonb_build_object('ok', false, 'reason', 'already_settled', 'status', h.status); end if;
  if p_outcome = 'released' then
    update dataforseo_budget_holds set status = 'released', settled_at = now(), note = concat_ws('; ', note, 'admin: ' || coalesce(p_note, 'released')) where id = h.id;
  elsif p_outcome = 'charged' and p_actual_usd is not null and p_actual_usd >= 0 then
    update dataforseo_budget_holds set status = 'charged', actual_usd = p_actual_usd, settled_at = now(), note = concat_ws('; ', note, 'admin: ' || coalesce(p_note, 'charged')) where id = h.id;
    insert into runtime_events (id, project_id, type, payload, produced_by, occurred_at, processed, processed_at)
    values (h.id, h.project_id, 'dataforseo.spend',
            jsonb_build_object('cost', p_actual_usd, 'holdId', h.id, 'estimatedUsd', h.estimated_usd, 'client', h.client_id, 'endpoint', h.endpoint, 'resolvedBy', 'admin'),
            h.client_id, h.created_at, true, now())
    on conflict (id) do nothing;
  else
    return jsonb_build_object('ok', false, 'reason', 'invalid_request');
  end if;
  return jsonb_build_object('ok', true, 'hold_id', h.id, 'outcome', p_outcome);
end;
$$;

revoke all on function dataforseo_budget__client(text) from public, anon, authenticated;
revoke all on function dataforseo_budget__committed(uuid, date) from public, anon, authenticated;
revoke all on function dataforseo_budget_reserve(text, uuid, numeric, text, text, numeric, int) from public;
revoke all on function dataforseo_budget_settle(text, uuid, numeric, jsonb) from public;
revoke all on function dataforseo_budget_mark_uncertain(text, uuid, text) from public;
revoke all on function dataforseo_budget_release(text, uuid, text) from public;
revoke all on function dataforseo_budget_status(text) from public;
revoke all on function dataforseo_budget_admin_resolve(uuid, text, numeric, text) from public, anon, authenticated;

grant execute on function dataforseo_budget_reserve(text, uuid, numeric, text, text, numeric, int) to anon, authenticated, service_role;
grant execute on function dataforseo_budget_settle(text, uuid, numeric, jsonb) to anon, authenticated, service_role;
grant execute on function dataforseo_budget_mark_uncertain(text, uuid, text) to anon, authenticated, service_role;
grant execute on function dataforseo_budget_release(text, uuid, text) to anon, authenticated, service_role;
grant execute on function dataforseo_budget_status(text) to anon, authenticated, service_role;
grant execute on function dataforseo_budget_admin_resolve(uuid, text, numeric, text) to service_role;
