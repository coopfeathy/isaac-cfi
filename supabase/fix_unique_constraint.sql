-- Fix duplicates and ensure unique constraint for upsert support

-- 1. Remove duplicate emails, keeping only the most recent one
delete from onboarding_funnel
where id in (
  select id from (
    select id, row_number() over (partition by email order by created_at desc) as rnum
    from onboarding_funnel
  ) t
  where t.rnum > 1
);

-- 2. Drop the constraint if it exists (to ensure we can recreate it cleanly)
alter table onboarding_funnel drop constraint if exists onboarding_funnel_email_key;

-- 3. Add the unique constraint to the email column
-- This is REQUIRED for the .upsert() function to work in the API
alter table onboarding_funnel add constraint onboarding_funnel_email_key unique (email);
