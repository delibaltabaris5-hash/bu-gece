-- Fix infinite recursion in chat_members and dependent tables
drop policy if exists members_read on public.chat_members;
drop policy if exists members_write on public.chat_members;
drop policy if exists chats_read on public.chats;
drop policy if exists chats_update on public.chats;
drop policy if exists messages_read on public.messages;
drop policy if exists messages_insert on public.messages;

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

-- Direct non-recursive chat_members policy
create policy members_read on public.chat_members for select to authenticated
  using (user_id = auth.uid() or public.is_chat_member(chat_id, auth.uid()));

create policy members_write on public.chat_members for insert to authenticated
  with check (user_id = auth.uid() or public.is_chat_member(chat_id, auth.uid()));

-- Chats policy using helper function
create policy chats_read on public.chats for select to authenticated
  using (public.is_chat_member(id, auth.uid()));

create policy chats_update on public.chats for update to authenticated
  using (public.is_chat_member(id, auth.uid()));

-- Messages policy using helper function
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
