/*
# Pawly Pet Health — schema and seed data

1. New Tables
- `pets`: a pet profile (single-tenant, no auth).
  - id (uuid pk), name, species, breed, age_years, weight_kg, photo_url, care_score (int), care_status (text), created_at.
- `check_ins`: daily wellness check-ins per pet.
  - id (uuid pk), pet_id (fk pets), check_date (date), energy (text), appetite (text), stool (text), mood (text), notes (text), created_at.
- `reminders`: upcoming care reminders per pet.
  - id (uuid pk), pet_id (fk pets), title, reminder_type (text), due_date (date), status (text), created_at.
- `health_events`: historical health log entries per pet.
  - id (uuid pk), pet_id (fk pets), event_date (date), title, description, category (text), created_at.
- `chat_messages`: triage chat conversation messages.
  - id (uuid pk), pet_id (fk pets), role (text: user/assistant/system), content (text), flag (text: normal/warning/emergency), triage_stage (text), created_at.

2. Security
- RLS enabled on all tables.
- Single-tenant (no sign-in): all CRUD allowed for anon + authenticated.

3. Seed data
- Pet "Mochi" (Dog, Shiba Inu, 4 yrs).
- Recent check-ins (energy/appetite/stool) for the past several days.
- Reminders: Rabies Booster due Nov 2026, Dental Cleaning, Annual Wellness.
- Health history: spay surgery, annual exam, vaccination records.
*/

CREATE TABLE IF NOT EXISTS pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  species text NOT NULL,
  breed text NOT NULL,
  age_years int NOT NULL,
  weight_kg numeric NOT NULL,
  photo_url text,
  care_score int NOT NULL DEFAULT 80,
  care_status text NOT NULL DEFAULT 'Looking cared for',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  check_date date NOT NULL,
  energy text NOT NULL,
  appetite text NOT NULL,
  stool text NOT NULL,
  mood text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  title text NOT NULL,
  reminder_type text NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'upcoming',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS health_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  event_date date NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  flag text NOT NULL DEFAULT 'normal',
  triage_stage text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- pets policies
DROP POLICY IF EXISTS "anon_select_pets" ON pets;
CREATE POLICY "anon_select_pets" ON pets FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_pets" ON pets;
CREATE POLICY "anon_insert_pets" ON pets FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_pets" ON pets;
CREATE POLICY "anon_update_pets" ON pets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_pets" ON pets;
CREATE POLICY "anon_delete_pets" ON pets FOR DELETE TO anon, authenticated USING (true);

-- check_ins policies
DROP POLICY IF EXISTS "anon_select_check_ins" ON check_ins;
CREATE POLICY "anon_select_check_ins" ON check_ins FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_check_ins" ON check_ins;
CREATE POLICY "anon_insert_check_ins" ON check_ins FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_check_ins" ON check_ins;
CREATE POLICY "anon_update_check_ins" ON check_ins FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_check_ins" ON check_ins;
CREATE POLICY "anon_delete_check_ins" ON check_ins FOR DELETE TO anon, authenticated USING (true);

-- reminders policies
DROP POLICY IF EXISTS "anon_select_reminders" ON reminders;
CREATE POLICY "anon_select_reminders" ON reminders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_reminders" ON reminders;
CREATE POLICY "anon_insert_reminders" ON reminders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_reminders" ON reminders;
CREATE POLICY "anon_update_reminders" ON reminders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_reminders" ON reminders;
CREATE POLICY "anon_delete_reminders" ON reminders FOR DELETE TO anon, authenticated USING (true);

-- health_events policies
DROP POLICY IF EXISTS "anon_select_health_events" ON health_events;
CREATE POLICY "anon_select_health_events" ON health_events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_health_events" ON health_events;
CREATE POLICY "anon_insert_health_events" ON health_events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_health_events" ON health_events;
CREATE POLICY "anon_update_health_events" ON health_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_health_events" ON health_events;
CREATE POLICY "anon_delete_health_events" ON health_events FOR DELETE TO anon, authenticated USING (true);

-- chat_messages policies
DROP POLICY IF EXISTS "anon_select_chat_messages" ON chat_messages;
CREATE POLICY "anon_select_chat_messages" ON chat_messages FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_chat_messages" ON chat_messages;
CREATE POLICY "anon_insert_chat_messages" ON chat_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_chat_messages" ON chat_messages;
CREATE POLICY "anon_update_chat_messages" ON chat_messages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_chat_messages" ON chat_messages;
CREATE POLICY "anon_delete_chat_messages" ON chat_messages FOR DELETE TO anon, authenticated USING (true);

-- Seed pet Mochi
INSERT INTO pets (name, species, breed, age_years, weight_kg, care_score, care_status)
SELECT 'Mochi', 'Dog', 'Shiba Inu', 4, 9.5, 86, 'Looking cared for'
WHERE NOT EXISTS (SELECT 1 FROM pets WHERE name = 'Mochi');

-- Seed check-ins for Mochi (past several days)
INSERT INTO check_ins (pet_id, check_date, energy, appetite, stool, mood, notes)
SELECT p.id, d::date, energy, appetite, stool, mood, notes
FROM pets p
CROSS JOIN (VALUES
  ('2026-09-26', 'Bright and playful', 'Eating well', 'Normal', 'Content', 'Morning walk, very energetic'),
  ('2026-09-25', 'Normal', 'Eating well', 'Normal', 'Content', 'Usual activity level'),
  ('2026-09-24', 'Slightly quiet', 'Eating well', 'Normal', 'Calm', 'Restful day after grooming'),
  ('2026-09-23', 'Bright and playful', 'Eating well', 'Normal', 'Happy', 'Park visit, lots of running'),
  ('2026-09-22', 'Normal', 'Slightly picky', 'Normal', 'Content', 'Ate breakfast late'),
  ('2026-09-21', 'Bright and playful', 'Eating well', 'Slightly soft', 'Content', 'Treat may have disagreed'),
  ('2026-09-20', 'Normal', 'Eating well', 'Normal', 'Happy', 'Regular routine')
) AS t(d, energy, appetite, stool, mood, notes)
WHERE p.name = 'Mochi'
AND NOT EXISTS (SELECT 1 FROM check_ins WHERE pet_id = p.id);

-- Seed reminders
INSERT INTO reminders (pet_id, title, reminder_type, due_date, status)
SELECT p.id, t.title, t.reminder_type, t.due_date::date, t.status
FROM pets p
CROSS JOIN (VALUES
  ('Rabies Booster', 'vaccine', '2026-11-15', 'upcoming'),
  ('Dental Cleaning', 'dental', '2026-10-20', 'upcoming'),
  ('Annual Wellness Exam', 'exam', '2026-12-01', 'upcoming'),
  ('Heartworm Prevention', 'medication', '2026-10-01', 'upcoming'),
  ('Bordetella Vaccine', 'vaccine', '2027-01-10', 'upcoming')
) AS t(title, reminder_type, due_date, status)
WHERE p.name = 'Mochi'
AND NOT EXISTS (SELECT 1 FROM reminders WHERE pet_id = p.id);

-- Seed health history events
INSERT INTO health_events (pet_id, event_date, title, description, category)
SELECT p.id, t.event_date::date, t.title, t.description, t.category
FROM pets p
CROSS JOIN (VALUES
  ('2026-03-12', 'Annual Wellness Exam', 'Full physical exam. All vitals within normal range. Weight stable at 9.5kg.', 'exam'),
  ('2025-11-15', 'Rabies Vaccination', 'Administered 1-year rabies vaccine. No adverse reaction.', 'vaccine'),
  ('2025-06-02', 'Spay Surgery', 'Ovariohysterectomy performed and recovered uneventfully. Sutures removed after 10 days.', 'surgery'),
  ('2025-05-10', 'Dental Cleaning', 'Professional dental scaling and polishing. Mild tartar buildup noted.', 'dental'),
  ('2024-11-20', 'DHPP Booster', 'Distemper, hepatitis, parainfluenza, parvovirus combination vaccine updated.', 'vaccine'),
  ('2024-09-01', 'Adoption Checkup', 'Initial veterinary exam after adoption. Declared healthy, started on heartworm prevention.', 'exam')
) AS t(event_date, title, description, category)
WHERE p.name = 'Mochi'
AND NOT EXISTS (SELECT 1 FROM health_events WHERE pet_id = p.id);
