-- CRM System for Flight Training
-- Customer Relationship Management features

-- Prospects table - potential clients you've met
CREATE TABLE prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  meeting_location TEXT, -- Where you met them
  meeting_date DATE,
  notes TEXT, -- Notes about the prospect
  interest_level TEXT CHECK (interest_level IN ('hot', 'warm', 'cold')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'converted', 'lost', 'inactive')),
  next_follow_up DATE, -- When to reach out next
  follow_up_frequency INTEGER DEFAULT 7, -- Days between follow-ups
  source TEXT, -- How you met them (referral, event, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Students table - current/past students with training records
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE, -- Link to their user account if they have one
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- Certificate information
  certificate_type TEXT, -- 'private', 'instrument', 'commercial', 'cfi', etc.
  certificate_number TEXT,
  medical_class TEXT CHECK (medical_class IN ('first', 'second', 'third', 'basic_med')),
  medical_expiration DATE,
  
  -- Currency requirements
  flight_review_date DATE, -- Last BFR/flight review
  flight_review_due DATE, -- When next review is due (24 months)
  ipc_date DATE, -- Last Instrument Proficiency Check
  ipc_due DATE, -- When next IPC is due (6 months)
  rental_checkout_date DATE, -- Last checkout for rental
  rental_currency_due DATE, -- When rental currency expires
  
  -- Training progress
  total_hours DECIMAL(10, 2) DEFAULT 0,
  pic_hours DECIMAL(10, 2) DEFAULT 0,
  dual_hours DECIMAL(10, 2) DEFAULT 0,
  instrument_hours DECIMAL(10, 2) DEFAULT 0,
  training_stage TEXT, -- Current stage of training
  
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'on_hold')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communication log - track all outreach
CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'phone', 'in_person', 'note')),
  subject TEXT,
  message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'sent' CHECK (status IN ('scheduled', 'sent', 'delivered', 'failed', 'opened'))
);

-- Reminders/Tasks
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  reminder_type TEXT CHECK (reminder_type IN ('follow_up', 'flight_review', 'ipc', 'medical', 'rental_currency', 'custom')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Policies for prospects (admin only)
CREATE POLICY "Admins can view all prospects"
  ON prospects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert prospects"
  ON prospects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update prospects"
  ON prospects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete prospects"
  ON prospects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policies for students
CREATE POLICY "Admins can view all students"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Students can view their own record"
  ON students FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert students"
  ON students FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update students"
  ON students FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete students"
  ON students FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policies for communications (admin only)
CREATE POLICY "Admins can view all communications"
  ON communications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert communications"
  ON communications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update communications"
  ON communications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policies for reminders (admin only)
CREATE POLICY "Admins can view all reminders"
  ON reminders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert reminders"
  ON reminders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update reminders"
  ON reminders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete reminders"
  ON reminders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Indexes for performance
CREATE INDEX idx_prospects_status ON prospects(status);
CREATE INDEX idx_prospects_next_follow_up ON prospects(next_follow_up);
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_flight_review_due ON students(flight_review_due);
CREATE INDEX idx_students_ipc_due ON students(ipc_due);
CREATE INDEX idx_communications_prospect_id ON communications(prospect_id);
CREATE INDEX idx_communications_student_id ON communications(student_id);
CREATE INDEX idx_reminders_due_date ON reminders(due_date);
CREATE INDEX idx_reminders_status ON reminders(status);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON prospects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create reminders for students
CREATE OR REPLACE FUNCTION create_student_reminders()
RETURNS TRIGGER AS $$
BEGIN
  -- Flight review reminder (30 days before due)
  IF NEW.flight_review_due IS NOT NULL THEN
    INSERT INTO reminders (student_id, title, description, due_date, reminder_type)
    VALUES (
      NEW.id,
      'Flight Review Due for ' || NEW.full_name,
      'Flight review is due on ' || NEW.flight_review_due::TEXT,
      NEW.flight_review_due - INTERVAL '30 days',
      'flight_review'
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- IPC reminder (14 days before due)
  IF NEW.ipc_due IS NOT NULL THEN
    INSERT INTO reminders (student_id, title, description, due_date, reminder_type)
    VALUES (
      NEW.id,
      'IPC Due for ' || NEW.full_name,
      'Instrument Proficiency Check is due on ' || NEW.ipc_due::TEXT,
      NEW.ipc_due - INTERVAL '14 days',
      'ipc'
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Rental currency reminder (7 days before due)
  IF NEW.rental_currency_due IS NOT NULL THEN
    INSERT INTO reminders (student_id, title, description, due_date, reminder_type)
    VALUES (
      NEW.id,
      'Rental Currency Expiring for ' || NEW.full_name,
      'Rental currency expires on ' || NEW.rental_currency_due::TEXT,
      NEW.rental_currency_due - INTERVAL '7 days',
      'rental_currency'
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER student_reminders_trigger
  AFTER INSERT OR UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION create_student_reminders();

-- Function to create follow-up reminders for prospects
CREATE OR REPLACE FUNCTION create_prospect_reminder()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.next_follow_up IS NOT NULL AND NEW.status = 'active' THEN
    INSERT INTO reminders (prospect_id, title, description, due_date, reminder_type)
    VALUES (
      NEW.id,
      'Follow up with ' || NEW.full_name,
      COALESCE(NEW.notes, 'Prospect follow-up'),
      NEW.next_follow_up,
      'follow_up'
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prospect_reminder_trigger
  AFTER INSERT OR UPDATE ON prospects
  FOR EACH ROW
  EXECUTE FUNCTION create_prospect_reminder();
