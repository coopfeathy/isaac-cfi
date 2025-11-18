-- Merlin Flight Training - Seed Data
-- Run this SQL after running schema.sql

-- Insert sample slots for December 2025
-- Note: Adjust timestamps to your timezone as needed

-- Training slots (1-hour sessions)
insert into slots (start_time, end_time, type, price, description)
values
  ('2025-12-03 10:00:00+00', '2025-12-03 11:00:00+00', 'training', 9900, 'Introductory Flight Lesson'),
  ('2025-12-04 14:00:00+00', '2025-12-04 15:00:00+00', 'training', 14900, 'Advanced Flight Training'),
  ('2025-12-07 12:00:00+00', '2025-12-07 13:00:00+00', 'training', 12900, 'Instrument Rating Lesson'),
  ('2025-12-10 09:00:00+00', '2025-12-10 10:00:00+00', 'training', 9900, 'Introductory Flight Lesson'),
  ('2025-12-12 15:00:00+00', '2025-12-12 16:00:00+00', 'training', 14900, 'Cross-Country Training');

-- NYC Flight Tour slots (45-minute tours)
insert into slots (start_time, end_time, type, price, description)
values
  ('2025-12-05 09:00:00+00', '2025-12-05 09:45:00+00', 'tour', 19900, 'NYC Skyline Tour'),
  ('2025-12-06 16:00:00+00', '2025-12-06 16:45:00+00', 'tour', 19900, 'Statue of Liberty & Manhattan Tour'),
  ('2025-12-08 11:00:00+00', '2025-12-08 11:45:00+00', 'tour', 24900, 'Extended NYC Landmarks Tour'),
  ('2025-12-11 10:00:00+00', '2025-12-11 10:45:00+00', 'tour', 19900, 'NYC Skyline Tour'),
  ('2025-12-13 14:00:00+00', '2025-12-13 14:45:00+00', 'tour', 24900, 'Brooklyn Bridge & Harbor Tour');

-- Note: Remember to set is_admin = true for your owner account in the profiles table
-- after the owner creates their account. Run this SQL replacing 'owner-uuid':
-- 
-- update profiles set is_admin = true where id = 'owner-uuid';
-- 
-- Or use the owner's email:
-- 
-- update profiles set is_admin = true 
-- where id = (select id from auth.users where email = 'owner@example.com');
