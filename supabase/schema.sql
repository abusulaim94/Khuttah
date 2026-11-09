-- Skema Pangkalan Data KHUTTAH untuk Supabase (Projek: dppepldqihxwhbrfhlku)
-- Jalankan skrip ini sekali sahaja di dalam Supabase Dashboard -> SQL Editor.

create table if not exists public.khuttah_workspaces (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'khuttah_workspaces_state_is_object'
      and conrelid = 'public.khuttah_workspaces'::regclass
  ) then
    alter table public.khuttah_workspaces
      add constraint khuttah_workspaces_state_is_object
      check (jsonb_typeof(state) = 'object');
  end if;
end $$;

-- Aktifkan dan paksa Row Level Security (RLS)
alter table public.khuttah_workspaces enable row level security;
alter table public.khuttah_workspaces force row level security;

-- Prinsip keistimewaan minimum (Least Privilege): hanya pengguna yang log masuk (authenticated) dibenarkan
revoke all on table public.khuttah_workspaces from public, anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.khuttah_workspaces to authenticated;

-- Polisi RLS dengan prestasi optimum ((select auth.uid()) dinilai sekali setiap kuiri)
drop policy if exists khuttah_workspaces_select_own on public.khuttah_workspaces;
create policy khuttah_workspaces_select_own
  on public.khuttah_workspaces
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists khuttah_workspaces_insert_own on public.khuttah_workspaces;
create policy khuttah_workspaces_insert_own
  on public.khuttah_workspaces
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists khuttah_workspaces_update_own on public.khuttah_workspaces;
create policy khuttah_workspaces_update_own
  on public.khuttah_workspaces
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists khuttah_workspaces_delete_own on public.khuttah_workspaces;
create policy khuttah_workspaces_delete_own
  on public.khuttah_workspaces
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
