-- =====================================================
-- TigerManPlus – הגדרת Supabase (מריצים פעם אחת ב-SQL Editor)
-- לפני ההרצה: החליפו את YOUR_ADMIN_EMAIL במייל הגוגל שלכם (האדמין).
-- =====================================================

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text unique not null,
  name          text,
  avatar        text,
  premium       boolean not null default false,
  premium_until timestamptz,            -- ריק = ללא תפוגה
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- מייל שהאדמין הוסיף כפרמיום לפני שהמשתמש נכנס בפעם הראשונה
create table if not exists public.premium_invites (
  email         text primary key,
  premium_until timestamptz,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.premium_invites enable row level security;

-- האם המשתמש המחובר הוא אדמין (security definer = בלי רקורסיה ב-RLS)
create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- פרופיל אוטומטי בהרשמה (כולל פרמיום מראש אם יש הזמנה, ואדמין לפי המייל)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  inv public.premium_invites%rowtype;
  had boolean;
begin
  select * into inv from public.premium_invites where lower(email) = lower(new.email);
  had := found;
  insert into public.profiles (id, email, name, avatar, premium, premium_until, is_admin)
  values (
    new.id, lower(new.email),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    had, case when had then inv.premium_until end,
    lower(new.email) = lower('YOUR_ADMIN_EMAIL')
  );
  delete from public.premium_invites where lower(email) = lower(new.email);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- הרשאות: משתמש רואה רק את עצמו. רק אדמין רואה/משנה את כולם.
drop policy if exists "read own or admin" on public.profiles;
create policy "read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "admin update" on public.profiles;
create policy "admin update" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin delete" on public.profiles;
create policy "admin delete" on public.profiles
  for delete using (public.is_admin());

drop policy if exists "admin invites" on public.premium_invites;
create policy "admin invites" on public.premium_invites
  for all using (public.is_admin()) with check (public.is_admin());

-- אם כבר נכנסתם לפני שהרצתם את הקובץ, הריצו גם (עם המייל שלכם):
-- insert into public.profiles (id,email,is_admin) select id,lower(email),true from auth.users where lower(email)=lower('YOUR_ADMIN_EMAIL')
--   on conflict (id) do update set is_admin = true;
