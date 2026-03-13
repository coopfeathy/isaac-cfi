-- Flight Circle Style Schema Extension

-- 1. Updates to Profiles (for balance calculation, though transactions are source of truth)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS balance_cents integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_instructor boolean DEFAULT false;

-- 2. Aircraft Table
CREATE TABLE IF NOT EXISTS aircraft (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration text NOT NULL UNIQUE, -- e.g. N12345
  model text NOT NULL, -- e.g. Cessna 172
  year integer,
  equipment text, -- e.g. G1000
  rate_per_hour_cents integer NOT NULL DEFAULT 0,
  status text DEFAULT 'active', -- active, maintenance, inactive
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- 3. Groups Table
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, user_id)
);

-- 4. Instructors (Resource details)
CREATE TABLE IF NOT EXISTS instructor_details (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  rate_per_hour_cents integer DEFAULT 0,
  license_number text,
  approval_status text DEFAULT 'pending', -- pending, approved
  bio text
);

-- 5. Items (for billing line items)
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL, -- 'service', 'product', 'fee'
  rate_cents integer, -- Default rate, can be overridden
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 6. Transactions (Adjustments & Payments & Charges)
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL, -- Positive for payment/credit, Negative for charge
  type text NOT NULL, -- 'payment', 'charge', 'adjustment', 'flight_charge'
  description text,
  related_schedule_id uuid, -- If linked to a flight
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- 7. Schedules (The core scheduling table)
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- The main pilot/renter
  aircraft_id uuid REFERENCES aircraft(id) ON DELETE SET NULL,
  instructor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  title text,
  notes text,
  status text DEFAULT 'scheduled', -- scheduled, canceled, completed
  check_out_time timestamptz,
  check_in_time timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT check_dates CHECK (end_time > start_time)
);

-- 8. Enable RLS on new tables (Simple policies for now)
ALTER TABLE aircraft ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Adjust as needed for strictness)
-- Aircraft: Public read, Admin write
CREATE POLICY "Public Read Aircraft" ON aircraft FOR SELECT USING (true);
CREATE POLICY "Admin Write Aircraft" ON aircraft FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- Schedules: Read all (for availability), Auth user create, Admin all
CREATE POLICY "Read All Schedules" ON schedules FOR SELECT USING (true);
CREATE POLICY "User Create Schedules" ON schedules FOR INSERT WITH CHECK (auth.uid() = user_id OR exists (select 1 from profiles where id = auth.uid() and is_admin = true));
CREATE POLICY "User Update Own Schedules" ON schedules FOR UPDATE USING (auth.uid() = user_id OR exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- Transactions: User read own, Admin read all, Admin write
CREATE POLICY "User Read Own Transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin Read All Transactions" ON transactions FOR SELECT USING (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
CREATE POLICY "Admin Write Transactions" ON transactions FOR ALL USING (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- Items/Groups: similar...
CREATE POLICY "Read Items" ON items FOR SELECT USING (true);
CREATE POLICY "Admin Write Items" ON items FOR ALL USING (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

