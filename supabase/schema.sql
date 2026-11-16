-- Levy Games - סכימת הסנכרון.
-- להריץ פעם אחת: Supabase Dashboard > SQL Editor > New query > Run.
--
-- טבלה אחת, key-value, שמשקפת את מפתחות 'levygames.*' של המכשיר.
-- אין סכימה פר-משחק: משחק חדש מסתנכרן בלי לגעת כאן.

create table if not exists public.kv (
  account_id uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  key        text        not null,
  value      jsonb,                          -- null = המפתח נמחק במכשיר
  client_ts  bigint      not null default 0, -- מתי השתנה במכשיר (ms) - להכרעה בקונפליקט
  updated_at timestamptz not null default now(), -- זמן שרת - למשיכה מצטברת
  primary key (account_id, key)
);

create index if not exists kv_account_updated on public.kv (account_id, updated_at);

-- updated_at תמיד בזמן השרת, כדי ששעון שגוי במכשיר לא ישבור משיכה מצטברת
create or replace function public.kv_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists kv_touch on public.kv;
create trigger kv_touch before insert or update on public.kv
  for each row execute function public.kv_touch();

-- Row Level Security: כל חשבון רואה ונוגע רק בשורות שלו.
-- זה מה שמאפשר לשים את ה-anon key בקוד הציבורי.
alter table public.kv enable row level security;

drop policy if exists kv_select on public.kv;
drop policy if exists kv_insert on public.kv;
drop policy if exists kv_update on public.kv;
drop policy if exists kv_delete on public.kv;

create policy kv_select on public.kv for select to authenticated using (account_id = auth.uid());
create policy kv_insert on public.kv for insert to authenticated with check (account_id = auth.uid());
create policy kv_update on public.kv for update to authenticated using (account_id = auth.uid()) with check (account_id = auth.uid());
create policy kv_delete on public.kv for delete to authenticated using (account_id = auth.uid());
