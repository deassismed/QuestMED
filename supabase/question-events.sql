create table if not exists public.question_events (
  event_id text primary key,
  anonymous_session_id text not null,
  occurred_at timestamptz not null,
  local_day date not null,
  question_id text not null,
  area text not null,
  tema text not null,
  selected_option_id text,
  correct_option_id text not null,
  is_correct boolean not null,
  used_hint boolean not null,
  expired boolean not null,
  score numeric(3, 1) not null,
  created_at timestamptz not null default now()
);

alter table public.question_events enable row level security;

drop policy if exists "Allow anonymous question event inserts" on public.question_events;

create policy "Allow anonymous question event inserts"
on public.question_events
for insert
to anon
with check (true);

grant insert on public.question_events to anon;

create index if not exists question_events_local_day_idx
on public.question_events (local_day);

create or replace view public.daily_question_stats as
select
  local_day,
  count(*)::integer as total_questions,
  count(*) filter (where is_correct)::integer as correct_questions,
  count(*) filter (where not is_correct and not expired)::integer as incorrect_questions,
  count(*) filter (where expired)::integer as expired_questions,
  round(
    100 * count(*) filter (where is_correct)::numeric / nullif(count(*), 0),
    1
  ) as correct_percent,
  round(avg(score), 2) as average_score
from public.question_events
group by local_day
order by local_day desc;

grant select on public.daily_question_stats to authenticated;
