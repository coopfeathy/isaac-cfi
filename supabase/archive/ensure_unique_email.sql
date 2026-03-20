-- Ensure email is unique (required for upsert)
do $$
begin
  -- Check if a unique constraint already exists on email
  if not exists (
    select 1 from pg_constraint
    where conname = 'onboarding_funnel_email_key'
  ) then
    -- If not, check if a unique index exists (sometimes created implicitly) and matches
    if not exists (
        select 1 from pg_indexes
        where tablename = 'onboarding_funnel'
        and indexdef like '%UNIQUE%email%'
    ) then
        -- Add the constraint
        alter table onboarding_funnel add constraint onboarding_funnel_email_key unique (email);
    end if;
  end if;
end $$;
