create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null default 'RoadIQ Driver',
  avatar_url text,
  timezone text not null default 'UTC',
  road_iq_score integer not null default 100 check (road_iq_score between 40 and 160),
  xp integer not null default 0 check (xp >= 0),
  rank text not null default 'Rookie',
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_daily_completion_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.challenges (
  id text primary key,
  slug text not null unique,
  question text not null,
  image_url text not null,
  image_alt text not null,
  image_position text not null default '50% 50%',
  image_creator text not null,
  image_source_url text not null,
  category text not null,
  difficulty text not null check (difficulty in ('Easy','Medium','Hard','Expert')),
  challenge_type text not null check (challenge_type in ('objective','community')),
  explanation text not null,
  region text not null default 'global',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists challenges_published_idx on public.challenges(status, published_at desc);
create index if not exists challenges_category_idx on public.challenges(category, difficulty);
create index if not exists challenges_region_idx on public.challenges(region);

create table if not exists public.challenge_answers (
  id text primary key,
  challenge_id text not null references public.challenges(id) on delete cascade,
  answer_text text not null,
  sort_order integer not null check (sort_order >= 0),
  unique (challenge_id, sort_order)
);

-- The Data API can expose answer copy without exposing correctness.
-- No anon/authenticated grants or policies exist for this table.
create table if not exists public.objective_answer_keys (
  challenge_id text primary key references public.challenges(id) on delete cascade,
  answer_id text not null references public.challenge_answers(id) on delete cascade
);

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id text not null references public.challenges(id) on delete cascade,
  answer_id text not null references public.challenge_answers(id),
  idempotency_key text not null,
  is_correct boolean,
  xp_awarded integer not null check (xp_awarded >= 0),
  answered_at timestamptz not null default now(),
  unique (profile_id, challenge_id),
  unique (profile_id, idempotency_key)
);

create index if not exists responses_challenge_idx on public.responses(challenge_id, answered_at);
create index if not exists responses_profile_time_idx on public.responses(profile_id, answered_at desc);

create table if not exists public.challenge_reactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id text not null references public.challenges(id) on delete cascade,
  reaction text not null check (reaction in ('positive','negative')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, challenge_id)
);

create table if not exists public.challenge_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id text references public.challenges(id) on delete cascade,
  event_type text not null check (event_type in ('viewed','skipped','answered','shared')),
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists challenge_events_aggregate_idx on public.challenge_events(challenge_id, event_type, created_at);

create table if not exists public.user_category_scores (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  attempted integer not null default 0,
  correct integer not null default 0,
  score integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (profile_id, category)
);

create table if not exists public.daily_challenges (
  challenge_date date not null,
  challenge_id text not null references public.challenges(id) on delete cascade,
  sort_order integer not null check (sort_order between 1 and 5),
  primary key (challenge_date, sort_order),
  unique (challenge_date, challenge_id)
);

create table if not exists public.daily_completions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  challenge_date date not null,
  completed_at timestamptz not null default now(),
  xp_awarded integer not null default 50,
  unique (profile_id, challenge_date)
);

create table if not exists public.achievements (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  icon_identifier text not null,
  criteria_type text not null,
  criteria_value integer not null check (criteria_value > 0)
);

create table if not exists public.user_achievements (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (profile_id, achievement_id)
);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, 'Driver ' || upper(left(new.id::text, 4)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

create or replace function public.calculate_road_iq(p_profile_id uuid)
returns integer
language sql
stable
security definer set search_path = public, pg_temp
as $$
  with objective as (
    select
      r.is_correct,
      c.category,
      case c.difficulty when 'Easy' then 1.0 when 'Medium' then 1.25 when 'Hard' then 1.5 else 2.0 end as weight,
      case c.category
        when 'Driver IQ' then 'Driving judgement'
        when 'Parking IQ' then 'Parking IQ'
        when 'Road IQ' then 'Road awareness'
        when 'Who''s Wrong?' then 'Driving judgement'
        when 'Car IQ' then 'Car knowledge'
        else 'Hazard detection'
      end as dimension
    from public.responses r
    join public.challenges c on c.id = r.challenge_id
    where r.profile_id = p_profile_id and c.challenge_type = 'objective'
  ), aggregate as (
    select
      count(*)::integer as attempts,
      coalesce(sum(weight), 0) as weighted_attempts,
      coalesce(sum(case when is_correct then weight else 0 end), 0) as weighted_correct,
      count(distinct dimension)::integer as dimensions
    from objective
  )
  select least(160, greatest(40, round(
    100 + ((((weighted_correct + 4.8) / (weighted_attempts + 8)) - 0.6) * 100)
    + least(10, greatest(0, dimensions - 1) * 2)
    + least(10, floor(attempts / 10.0))
  )))::integer from aggregate;
$$;

create or replace function public.road_iq_rank(p_score integer, p_attempts integer)
returns text language sql immutable as $$
  select case
    when p_attempts < 5 then 'Rookie'
    when p_score >= 150 then 'Elite'
    when p_score >= 140 then 'Road Master'
    when p_score >= 125 then 'Expert'
    when p_score >= 115 then 'Advanced'
    when p_score >= 105 then 'Experienced'
    when p_score >= 90 then 'Road Ready'
    else 'Rookie'
  end;
$$;

create or replace function public.evaluate_achievements(p_profile_id uuid)
returns void
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_current_streak integer;
  v_total integer;
  v_parking integer;
  v_spot integer;
  v_last_ten_correct integer;
begin
  select current_streak into v_current_streak from public.profiles where id = p_profile_id;
  select count(*) into v_total from public.responses where profile_id = p_profile_id;
  select count(*) into v_parking from public.responses r join public.challenges c on c.id = r.challenge_id where r.profile_id = p_profile_id and c.category = 'Parking IQ' and r.is_correct;
  select count(*) into v_spot from public.responses r join public.challenges c on c.id = r.challenge_id where r.profile_id = p_profile_id and c.category = 'Spot It' and r.is_correct;
  select case when count(*) = 10 and bool_and(is_correct) then 10 else 0 end into v_last_ten_correct
  from (select r.is_correct from public.responses r join public.challenges c on c.id = r.challenge_id where r.profile_id = p_profile_id and c.challenge_type = 'objective' order by r.answered_at desc limit 10) recent;

  insert into public.user_achievements (profile_id, achievement_id)
  select p_profile_id, a.id from public.achievements a
  where case a.criteria_type
    when 'parking_correct' then v_parking >= a.criteria_value
    when 'spot_correct' then v_spot >= a.criteria_value
    when 'objective_correct_streak' then v_last_ten_correct >= a.criteria_value
    when 'challenges_answered' then v_total >= a.criteria_value
    when 'daily_streak' then v_current_streak >= a.criteria_value
    else false end
  on conflict do nothing;
end;
$$;

create or replace function public.submit_challenge_response(
  p_challenge_id text,
  p_answer_id text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid := auth.uid();
  v_challenge public.challenges%rowtype;
  v_response public.responses%rowtype;
  v_correct_answer text;
  v_is_correct boolean;
  v_xp integer;
  v_inserted boolean := false;
  v_score integer;
  v_previous_score integer;
  v_attempts integer;
  v_total_xp integer;
  v_percentages jsonb;
  v_total integer;
  v_majority text;
  v_selected_percentage integer;
begin
  if v_profile_id is null then raise exception 'authentication required'; end if;
  select * into v_challenge from public.challenges where id = p_challenge_id and status = 'published';
  if not found then raise exception 'challenge unavailable'; end if;
  if not exists (select 1 from public.challenge_answers where id = p_answer_id and challenge_id = p_challenge_id) then raise exception 'answer unavailable'; end if;
  select answer_id into v_correct_answer from public.objective_answer_keys where challenge_id = p_challenge_id;
  v_is_correct := case when v_challenge.challenge_type = 'objective' then p_answer_id = v_correct_answer else null end;
  v_xp := case when v_challenge.challenge_type = 'community' then 5 when v_challenge.difficulty = 'Easy' then 5 when v_challenge.difficulty = 'Medium' then 10 when v_challenge.difficulty = 'Hard' then 15 else 25 end;
  v_previous_score := public.calculate_road_iq(v_profile_id);

  insert into public.responses (profile_id, challenge_id, answer_id, idempotency_key, is_correct, xp_awarded)
  values (v_profile_id, p_challenge_id, p_answer_id, p_idempotency_key, v_is_correct, v_xp)
  on conflict do nothing returning * into v_response;
  v_inserted := found;
  if not v_inserted then select * into v_response from public.responses where profile_id = v_profile_id and (challenge_id = p_challenge_id or idempotency_key = p_idempotency_key) limit 1; end if;

  if v_inserted then
    update public.profiles set xp = xp + v_xp, updated_at = now() where id = v_profile_id;
    insert into public.user_category_scores (profile_id, category, attempted, correct, score)
    values (v_profile_id, v_challenge.category, 1, case when v_is_correct then 1 else 0 end, case when v_is_correct then v_xp else 0 end)
    on conflict (profile_id, category) do update set attempted = public.user_category_scores.attempted + 1, correct = public.user_category_scores.correct + case when v_is_correct then 1 else 0 end, score = public.user_category_scores.score + case when v_is_correct then v_xp else 0 end, updated_at = now();
    insert into public.challenge_events (event_id, profile_id, challenge_id, event_type) values ('answered:' || v_response.id::text, v_profile_id, p_challenge_id, 'answered') on conflict do nothing;
  end if;

  v_score := public.calculate_road_iq(v_profile_id);
  select count(*) into v_attempts from public.responses r join public.challenges c on c.id = r.challenge_id where r.profile_id = v_profile_id and c.challenge_type = 'objective';
  update public.profiles set road_iq_score = v_score, rank = public.road_iq_rank(v_score, v_attempts), updated_at = now() where id = v_profile_id;
  perform public.evaluate_achievements(v_profile_id);

  with counts as (
    select a.id as answer_id, a.sort_order, count(r.id)::integer as answer_count
    from public.challenge_answers a left join public.responses r on r.answer_id = a.id
    where a.challenge_id = p_challenge_id group by a.id, a.sort_order
  ), raw as (
    select *, sum(answer_count) over ()::integer as total,
      floor(answer_count * 100.0 / nullif(sum(answer_count) over (), 0))::integer as base,
      (answer_count * 100.0 / nullif(sum(answer_count) over (), 0)) - floor(answer_count * 100.0 / nullif(sum(answer_count) over (), 0)) as fraction
    from counts
  ), apportioned as (
    select *, row_number() over (order by fraction desc, sort_order) as fraction_rank, 100 - sum(base) over () as remainder from raw
  ), final as (
    select answer_id, answer_count, case when total = 0 then 0 else base + case when fraction_rank <= remainder then 1 else 0 end end as percentage, sort_order from apportioned
  )
  select
    jsonb_agg(jsonb_build_object('answerId', answer_id, 'count', answer_count, 'percentage', percentage) order by sort_order),
    coalesce(sum(answer_count), 0),
    (array_agg(answer_id order by percentage desc, sort_order))[1],
    coalesce(max(percentage) filter (where answer_id = v_response.answer_id), 0)
  into v_percentages, v_total, v_majority, v_selected_percentage from final;
  select xp into v_total_xp from public.profiles where id = v_profile_id;

  return jsonb_build_object(
    'response', jsonb_build_object('id', v_response.id, 'idempotencyKey', v_response.idempotency_key, 'challengeId', v_response.challenge_id, 'answerId', v_response.answer_id, 'challengeType', v_challenge.challenge_type, 'category', v_challenge.category, 'difficulty', v_challenge.difficulty, 'isCorrect', v_response.is_correct, 'xpAwarded', v_response.xp_awarded, 'answeredAt', v_response.answered_at),
    'selectedAnswerId', v_response.answer_id,
    'correctAnswerId', case when v_challenge.challenge_type = 'objective' then v_correct_answer else null end,
    'isCorrect', v_response.is_correct,
    'percentages', coalesce(v_percentages, '[]'::jsonb),
    'totalResponses', v_total,
    'majorityAnswerId', v_majority,
    'majorityAgreement', case when v_response.answer_id = v_majority then v_selected_percentage else 100 - v_selected_percentage end,
    'xpAwarded', case when v_inserted then v_response.xp_awarded else 0 end,
    'totalXp', v_total_xp,
    'roadIqScore', v_score,
    'previousRoadIqScore', v_previous_score,
    'rank', jsonb_build_object('name', public.road_iq_rank(v_score, v_attempts), 'threshold', 0, 'nextName', null, 'nextThreshold', null, 'progress', 0, 'calibrated', v_attempts >= 5),
    'newlyEarnedAchievements', '[]'::jsonb
  );
end;
$$;

create or replace function public.complete_daily(p_challenge_date date)
returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
  v_completed integer;
  v_inserted boolean;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_profile from public.profiles where id = auth.uid() for update;
  if p_challenge_date <> timezone(v_profile.timezone, now())::date then raise exception 'daily date does not match profile timezone'; end if;
  select count(*) into v_completed from public.daily_challenges d join public.responses r on r.challenge_id = d.challenge_id and r.profile_id = v_profile.id where d.challenge_date = p_challenge_date;
  if v_completed < 5 then raise exception 'daily set incomplete'; end if;
  insert into public.daily_completions (profile_id, challenge_date) values (v_profile.id, p_challenge_date) on conflict do nothing;
  v_inserted := found;
  if v_inserted then
    update public.profiles set xp = xp + 50,
      current_streak = case when last_daily_completion_date = p_challenge_date - 1 then current_streak + 1 else 1 end,
      longest_streak = greatest(longest_streak, case when last_daily_completion_date = p_challenge_date - 1 then current_streak + 1 else 1 end),
      last_daily_completion_date = p_challenge_date, updated_at = now()
    where id = v_profile.id;
    perform public.evaluate_achievements(v_profile.id);
  end if;
  return jsonb_build_object('completed', true, 'bonusAwarded', v_inserted, 'xpAwarded', case when v_inserted then 50 else 0 end);
end;
$$;

alter table public.profiles enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_answers enable row level security;
alter table public.objective_answer_keys enable row level security;
alter table public.responses enable row level security;
alter table public.challenge_reactions enable row level security;
alter table public.challenge_events enable row level security;
alter table public.user_category_scores enable row level security;
alter table public.daily_challenges enable row level security;
alter table public.daily_completions enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

create policy "published challenges are readable" on public.challenges for select to authenticated using (status = 'published');
create policy "published answer copy is readable" on public.challenge_answers for select to authenticated using (exists (select 1 from public.challenges c where c.id = challenge_id and c.status = 'published'));
create policy "profiles can read self" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles can update self" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "responses can read self" on public.responses for select to authenticated using (profile_id = auth.uid());
create policy "reactions can read self" on public.challenge_reactions for select to authenticated using (profile_id = auth.uid());
create policy "reactions can insert self" on public.challenge_reactions for insert to authenticated with check (profile_id = auth.uid());
create policy "reactions can update self" on public.challenge_reactions for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "category scores can read self" on public.user_category_scores for select to authenticated using (profile_id = auth.uid());
create policy "daily assignments are readable" on public.daily_challenges for select to authenticated using (true);
create policy "daily completions can read self" on public.daily_completions for select to authenticated using (profile_id = auth.uid());
create policy "achievement definitions are readable" on public.achievements for select to authenticated using (true);
create policy "earned achievements can read self" on public.user_achievements for select to authenticated using (profile_id = auth.uid());

revoke all on public.objective_answer_keys from anon, authenticated;
revoke insert, update, delete on public.profiles, public.challenges, public.challenge_answers, public.responses, public.challenge_events, public.user_category_scores, public.daily_challenges, public.daily_completions, public.achievements, public.user_achievements from anon, authenticated;
grant select on public.challenges, public.challenge_answers, public.achievements, public.daily_challenges to authenticated;
grant select on public.profiles, public.responses, public.challenge_reactions, public.user_category_scores, public.daily_completions, public.user_achievements to authenticated;
grant update (username, avatar_url, timezone, updated_at) on public.profiles to authenticated;
grant insert, update (reaction, updated_at) on public.challenge_reactions to authenticated;
grant execute on function public.submit_challenge_response(text, text, text) to authenticated;
grant execute on function public.complete_daily(date) to authenticated;
grant all on public.profiles, public.challenges, public.challenge_answers, public.objective_answer_keys, public.responses, public.challenge_reactions, public.challenge_events, public.user_category_scores, public.daily_challenges, public.daily_completions, public.achievements, public.user_achievements to service_role;

insert into public.achievements (id, slug, name, description, icon_identifier, criteria_type, criteria_value) values
  ('achievement-parking-pro','parking-pro','Parking Pro','Get 20 Parking IQ challenges correct.','parking','parking_correct',20),
  ('achievement-eagle-eye','eagle-eye','Eagle Eye','Get 10 Spot It challenges correct.','eye','spot_correct',10),
  ('achievement-perfect-ten','perfect-ten','Perfect Ten','Answer 10 objective challenges correctly in a row.','target','objective_correct_streak',10),
  ('achievement-road-scholar','road-scholar','Road Scholar','Answer 100 challenges.','book-open','challenges_answered',100),
  ('achievement-veteran','veteran','Veteran','Answer 1,000 challenges.','medal','challenges_answered',1000),
  ('achievement-untouchable','untouchable','Untouchable','Reach a 30-day Daily streak.','flame','daily_streak',30)
on conflict (id) do update set name = excluded.name, description = excluded.description, criteria_value = excluded.criteria_value;
