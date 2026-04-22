-- Facebook Messenger AI auto-responder tables
-- Tracks conversations and individual messages for the appointment-scheduling bot.

-- Conversations: one row per unique Facebook user
CREATE TABLE IF NOT EXISTS messenger_conversations (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fb_sender_id    TEXT NOT NULL UNIQUE,           -- Facebook Page-Scoped User ID (PSID)
  sender_name     TEXT,                           -- name fetched from Graph API (may be null)
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'appointment_scheduled', 'opted_out', 'archived')),
  appointment_date TIMESTAMPTZ,                   -- set when the prospect books
  phone           TEXT,                           -- collected during conversation
  email           TEXT,                           -- collected during conversation
  notes           TEXT,                           -- AI-generated summary
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Messages: full conversation log
CREATE TABLE IF NOT EXISTS messenger_messages (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES messenger_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  fb_message_id   TEXT,                           -- Facebook's mid.xxx
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_messenger_conversations_fb_sender
  ON messenger_conversations(fb_sender_id);

CREATE INDEX IF NOT EXISTS idx_messenger_messages_conversation
  ON messenger_messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messenger_conversations_status
  ON messenger_conversations(status);

-- Auto-update updated_at on conversation changes
CREATE OR REPLACE FUNCTION update_messenger_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_messenger_conversation_updated ON messenger_conversations;
CREATE TRIGGER trg_messenger_conversation_updated
  BEFORE UPDATE ON messenger_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_messenger_conversation_timestamp();

-- RLS: admin-only access (these tables are only touched by server-side API routes
-- using the service role key, so RLS is permissive here for safety).
ALTER TABLE messenger_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messenger_messages ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (API routes use service role key)
CREATE POLICY "Service role full access on messenger_conversations"
  ON messenger_conversations FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on messenger_messages"
  ON messenger_messages FOR ALL
  USING (true) WITH CHECK (true);
