-- Create events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create votes table
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  dates TEXT[] NOT NULL, -- Array of date strings (e.g., ['2026-05-30', '2026-05-31'])
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime for votes table
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create public access policies (for MVP simplicity)
CREATE POLICY "Allow public read for events" ON events FOR SELECT USING (true);
CREATE POLICY "Allow public insert for events" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete for events" ON events FOR DELETE USING (true);

CREATE POLICY "Allow public read for votes" ON votes FOR SELECT USING (true);
CREATE POLICY "Allow public insert for votes" ON votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete for votes" ON votes FOR DELETE USING (true);
