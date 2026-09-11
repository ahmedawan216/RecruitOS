-- RecruitOS Phase 3C: Paddle Sandbox billing foundation.
-- This migration is intentionally additive. It is proposed for review and must
-- not be applied to production until separately approved.

create table public.recruitos_paddle_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  paddle_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recruitos_paddle_customers_customer_id_check
    check (paddle_customer_id ~ '^ctm_[a-z0-9]+$'),
  constraint recruitos_paddle_customers_user_customer_unique
    unique (user_id, paddle_customer_id)
);

create table public.recruitos_paddle_subscriptions (
  paddle_subscription_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  paddle_customer_id text not null,
  paddle_price_id text not null,
  paddle_product_id text,
  plan text,
  status text not null,
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  next_billed_at timestamptz,
  scheduled_change_action text,
  scheduled_change_effective_at timestamptz,
  canceled_at timestamptz,
  last_event_id text not null,
  last_event_occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recruitos_paddle_subscriptions_subscription_id_check
    check (paddle_subscription_id ~ '^sub_[a-z0-9]+$'),
  constraint recruitos_paddle_subscriptions_customer_id_check
    check (paddle_customer_id ~ '^ctm_[a-z0-9]+$'),
  constraint recruitos_paddle_subscriptions_plan_check
    check (plan is null or plan in ('standard', 'pro')),
  constraint recruitos_paddle_subscriptions_status_check
    check (status in ('active', 'trialing', 'past_due', 'paused', 'canceled')),
  constraint recruitos_paddle_subscriptions_scheduled_action_check
    check (scheduled_change_action is null or scheduled_change_action in ('cancel', 'pause', 'resume')),
  constraint recruitos_paddle_subscriptions_customer_fkey
    foreign key (user_id, paddle_customer_id)
    references public.recruitos_paddle_customers(user_id, paddle_customer_id)
    on delete cascade
);

create table public.recruitos_paddle_webhook_events (
  event_id text primary key,
  notification_id text,
  event_type text not null,
  occurred_at timestamptz not null,
  paddle_subscription_id text,
  outcome text not null,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint recruitos_paddle_webhook_events_event_id_check
    check (event_id ~ '^evt_[a-z0-9]+$'),
  constraint recruitos_paddle_webhook_events_notification_id_check
    check (notification_id is null or notification_id ~ '^ntf_[a-z0-9]+$'),
  constraint recruitos_paddle_webhook_events_outcome_check
    check (outcome in ('subscription_synced', 'subscription_synced_unrecognized_price', 'ignored_unmapped_customer', 'ignored_stale_event'))
);

-- Composite uniqueness on the customer table lets the subscription FK prove
-- both the user and Paddle customer mapping without trusting webhook user data.
create index recruitos_paddle_subscriptions_user_status_idx
  on public.recruitos_paddle_subscriptions(user_id, status, last_event_occurred_at desc);
create index recruitos_paddle_subscriptions_customer_idx
  on public.recruitos_paddle_subscriptions(paddle_customer_id, updated_at desc);
create index recruitos_paddle_webhook_events_subscription_idx
  on public.recruitos_paddle_webhook_events(paddle_subscription_id, occurred_at desc);

alter table public.recruitos_paddle_customers enable row level security;
alter table public.recruitos_paddle_subscriptions enable row level security;
alter table public.recruitos_paddle_webhook_events enable row level security;

-- Existing projects may grant broad privileges to new public tables by default.
-- Billing rows are never writable by browser roles.
revoke all on table public.recruitos_paddle_customers from public, anon, authenticated;
revoke all on table public.recruitos_paddle_subscriptions from public, anon, authenticated;
revoke all on table public.recruitos_paddle_webhook_events from public, anon, authenticated;
grant select on table public.recruitos_paddle_customers to authenticated;
grant select on table public.recruitos_paddle_subscriptions to authenticated;
grant all on table public.recruitos_paddle_customers to service_role;
grant all on table public.recruitos_paddle_subscriptions to service_role;
grant all on table public.recruitos_paddle_webhook_events to service_role;

create policy "Users can view their own Paddle customer mapping"
  on public.recruitos_paddle_customers for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view their own Paddle subscriptions"
  on public.recruitos_paddle_subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No client policy exists for webhook events. No browser role receives write
-- privileges for any billing table.

create or replace function public.sync_recruitos_paddle_subscription_event(
  p_event_id text,
  p_notification_id text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_paddle_subscription_id text,
  p_paddle_customer_id text,
  p_paddle_price_id text,
  p_paddle_product_id text,
  p_plan text,
  p_status text,
  p_current_period_starts_at timestamptz,
  p_current_period_ends_at timestamptz,
  p_next_billed_at timestamptz,
  p_scheduled_change_action text,
  p_scheduled_change_effective_at timestamptz,
  p_canceled_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_existing_event_id text;
  v_existing_occurred_at timestamptz;
  v_outcome text;
begin
  -- Serialize duplicate deliveries by event_id. If another delivery already
  -- completed, return its outcome without repeating subscription writes.
  select event_id into v_existing_event_id
  from public.recruitos_paddle_webhook_events
  where event_id = p_event_id
  for update;

  if found then
    return jsonb_build_object('ok', true, 'duplicate', true, 'eventId', p_event_id);
  end if;

  select user_id into v_user_id
  from public.recruitos_paddle_customers
  where paddle_customer_id = p_paddle_customer_id
  for update;

  if not found then
    insert into public.recruitos_paddle_webhook_events (
      event_id, notification_id, event_type, occurred_at,
      paddle_subscription_id, outcome
    ) values (
      p_event_id, p_notification_id, p_event_type, p_occurred_at,
      p_paddle_subscription_id, 'ignored_unmapped_customer'
    );
    return jsonb_build_object('ok', true, 'duplicate', false, 'outcome', 'ignored_unmapped_customer');
  end if;

  select last_event_occurred_at into v_existing_occurred_at
  from public.recruitos_paddle_subscriptions
  where paddle_subscription_id = p_paddle_subscription_id
  for update;

  if found and v_existing_occurred_at > p_occurred_at then
    insert into public.recruitos_paddle_webhook_events (
      event_id, notification_id, event_type, occurred_at,
      paddle_subscription_id, outcome
    ) values (
      p_event_id, p_notification_id, p_event_type, p_occurred_at,
      p_paddle_subscription_id, 'ignored_stale_event'
    );
    return jsonb_build_object('ok', true, 'duplicate', false, 'outcome', 'ignored_stale_event');
  end if;

  v_outcome := case when p_plan in ('standard', 'pro')
    then 'subscription_synced'
    else 'subscription_synced_unrecognized_price'
  end;

  insert into public.recruitos_paddle_subscriptions (
    paddle_subscription_id,
    user_id,
    paddle_customer_id,
    paddle_price_id,
    paddle_product_id,
    plan,
    status,
    current_period_starts_at,
    current_period_ends_at,
    next_billed_at,
    scheduled_change_action,
    scheduled_change_effective_at,
    canceled_at,
    last_event_id,
    last_event_occurred_at,
    updated_at
  ) values (
    p_paddle_subscription_id,
    v_user_id,
    p_paddle_customer_id,
    p_paddle_price_id,
    p_paddle_product_id,
    case when p_plan in ('standard', 'pro') then p_plan else null end,
    p_status,
    p_current_period_starts_at,
    p_current_period_ends_at,
    p_next_billed_at,
    p_scheduled_change_action,
    p_scheduled_change_effective_at,
    p_canceled_at,
    p_event_id,
    p_occurred_at,
    now()
  )
  on conflict (paddle_subscription_id) do update set
    user_id = excluded.user_id,
    paddle_customer_id = excluded.paddle_customer_id,
    paddle_price_id = excluded.paddle_price_id,
    paddle_product_id = excluded.paddle_product_id,
    plan = excluded.plan,
    status = excluded.status,
    current_period_starts_at = excluded.current_period_starts_at,
    current_period_ends_at = excluded.current_period_ends_at,
    next_billed_at = excluded.next_billed_at,
    scheduled_change_action = excluded.scheduled_change_action,
    scheduled_change_effective_at = excluded.scheduled_change_effective_at,
    canceled_at = excluded.canceled_at,
    last_event_id = excluded.last_event_id,
    last_event_occurred_at = excluded.last_event_occurred_at,
    updated_at = now();

  insert into public.recruitos_paddle_webhook_events (
    event_id, notification_id, event_type, occurred_at,
    paddle_subscription_id, outcome
  ) values (
    p_event_id, p_notification_id, p_event_type, p_occurred_at,
    p_paddle_subscription_id, v_outcome
  );

  return jsonb_build_object('ok', true, 'duplicate', false, 'outcome', v_outcome);
end;
$$;

revoke all on function public.sync_recruitos_paddle_subscription_event(
  text, text, text, timestamptz, text, text, text, text, text, text,
  timestamptz, timestamptz, timestamptz, text, timestamptz, timestamptz
) from public, anon, authenticated;
grant execute on function public.sync_recruitos_paddle_subscription_event(
  text, text, text, timestamptz, text, text, text, text, text, text,
  timestamptz, timestamptz, timestamptz, text, timestamptz, timestamptz
) to service_role;
