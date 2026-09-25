-- Bu Gece: profiles, chats, and same-mood pairing.
-- Email confirmation must be off so signup returns a session.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  created_at timestamptz not null default now(),
  mood text,
  mood_updated_at timestamptz,
  match_status text not null default 'idle' check (match_status in ('idle', 'waiting', 'matched')),
  matched_with uuid,
  match_id text,
  free_messages_remaining integer not null default 10,
  is_pro boolean not null default false,
  provider text not null default 'password'
);

create table if not exists public.chats (
  id text primary key,
  last_message text,
  last_at timestamptz,
  last_sender_id text
);

create table if not exists public.chat_members (
  chat_id text not null references public.chats (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (chat_id, user_id)
);

create table if not exists public.messages (
  id text primary key,
  chat_id text not null references public.chats (id) on delete cascade,
  sender_id text not null,
  sender_type text not null check (sender_type in ('user', 'bot')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  type text not null default 'text',
  status text not null default 'sent'
);

create table if not exists public.match_queue (
  uid uuid primary key references public.profiles (id) on delete cascade,
  mood text not null,
  joined_at timestamptz not null default now(),
  status text not null default 'waiting'
);

create table if not exists public.matches (
  id text primary key,
  users uuid[] not null,
  mood text not null,
  created_at timestamptz not null default now(),
  chat_id text not null,
  status text not null default 'active'
);

alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages enable row level security;
alter table public.match_queue enable row level security;
alter table public.matches enable row level security;

-- Helper security definer function to avoid recursive RLS checks
create or replace function public.is_chat_member(p_chat_id text, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.chat_members
    where chat_id = p_chat_id and user_id = p_user_id
  );
$$;

revoke all on function public.is_chat_member(text, uuid) from public;
grant execute on function public.is_chat_member(text, uuid) to authenticated;

create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and match_status in ('idle', 'waiting')
    and matched_with is not distinct from (select p.matched_with from public.profiles p where p.id = auth.uid())
    and match_id is not distinct from (select p.match_id from public.profiles p where p.id = auth.uid())
  );

create policy chats_read on public.chats for select to authenticated
  using (public.is_chat_member(id, auth.uid()));
create policy chats_write on public.chats for insert to authenticated with check (true);
create policy chats_update on public.chats for update to authenticated
  using (public.is_chat_member(id, auth.uid()));

create policy members_read on public.chat_members for select to authenticated
  using (user_id = auth.uid() or public.is_chat_member(chat_id, auth.uid()));
create policy members_write on public.chat_members for insert to authenticated
  with check (user_id = auth.uid() or public.is_chat_member(chat_id, auth.uid()));

create policy messages_read on public.messages for select to authenticated
  using (public.is_chat_member(chat_id, auth.uid()));
create policy messages_insert on public.messages for insert to authenticated
  with check (
    public.is_chat_member(chat_id, auth.uid())
    and (
      (sender_type = 'user' and sender_id = auth.uid()::text)
      or (sender_type = 'bot' and sender_id like 'bot-%')
    )
  );

create policy queue_own on public.match_queue for all to authenticated
  using (uid = auth.uid()) with check (uid = auth.uid() and status = 'waiting');

create policy matches_read on public.matches for select to authenticated
  using (auth.uid() = any (users));

create or replace function public.join_match(p_mood text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  peer uuid;
  pair text;
  mid text;
  cid text;
  label text;
begin
  if me is null then
    raise exception 'auth';
  end if;
  if p_mood not in ('mutlu', 'uzgun', 'kizgin', 'sakin', 'heyecanli', 'yalniz', 'flort', 'sohbet') then
    raise exception 'mood';
  end if;
  if (select match_status from public.profiles where id = me) = 'matched' then
    raise exception 'already-matched';
  end if;

  update public.profiles
    set mood = p_mood, mood_updated_at = now(), match_status = 'waiting'
    where id = me;

  insert into public.match_queue (uid, mood, joined_at, status)
    values (me, p_mood, now(), 'waiting')
    on conflict (uid) do update set mood = excluded.mood, joined_at = now(), status = 'waiting';

  select uid into peer
    from public.match_queue
    where mood = p_mood and status = 'waiting' and uid <> me
    order by joined_at
    for update skip locked
    limit 1;
  if peer is null then
    return;
  end if;

  if me::text < peer::text then
    pair := me::text || '_' || peer::text;
  else
    pair := peer::text || '_' || me::text;
  end if;
  mid := 'm_' || pair;
  cid := pair;
  label := case p_mood
    when 'mutlu' then 'Mutlu'
    when 'uzgun' then 'Üzgün'
    when 'kizgin' then 'Kızgın'
    when 'sakin' then 'Sakin'
    when 'heyecanli' then 'Heyecanlı'
    when 'yalniz' then 'Yalnız'
    when 'flort' then 'Flört'
    else 'Sohbet'
  end;

  insert into public.matches (id, users, mood, chat_id, status)
    values (mid, array[me, peer], p_mood, cid, 'active')
    on conflict (id) do nothing;

  insert into public.chats (id, last_message, last_at, last_sender_id)
    values (cid, 'İkiniz de ' || label || ' modundasınız.', now(), 'bot-eslesme')
    on conflict (id) do update set last_message = excluded.last_message, last_at = now(), last_sender_id = 'bot-eslesme';

  insert into public.chat_members (chat_id, user_id) values (cid, me) on conflict do nothing;
  insert into public.chat_members (chat_id, user_id) values (cid, peer) on conflict do nothing;

  insert into public.messages (id, chat_id, sender_id, sender_type, body)
    values ('sys_' || mid, cid, 'bot-eslesme', 'bot', 'İkiniz de ' || label || ' modundasınız.')
    on conflict (id) do nothing;

  update public.match_queue set status = 'matched' where uid in (me, peer);
  update public.profiles
    set match_status = 'matched',
        matched_with = case when id = me then peer else me end,
        match_id = mid,
        mood = p_mood
    where id in (me, peer);
end;
$$;

create or replace function public.leave_match()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    return;
  end if;
  delete from public.match_queue where uid = me and status = 'waiting';
  update public.profiles set match_status = 'idle' where id = me and match_status = 'waiting';
end;
$$;

revoke all on function public.join_match(text) from public;
revoke all on function public.leave_match() from public;
grant execute on function public.join_match(text) to authenticated;
grant execute on function public.leave_match() to authenticated;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.profiles;
