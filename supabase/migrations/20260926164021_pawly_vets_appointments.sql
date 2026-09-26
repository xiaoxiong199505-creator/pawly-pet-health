/*
# Pawly — Veterinarian profiles & appointments tables

1. New Tables
- `vets`: veterinarian profiles with photo, specialty, rating, clinic info, distance, fee.
  - id (uuid pk), full_name, credentials, specialty, rating, review_count, clinic_name, clinic_address, distance_km, consultation_fee, photo_url, created_at.
- `appointments`: booked vet visits.
  - id (uuid pk), pet_id (fk pets), vet_id (fk vets), appointment_date (date), time_slot (text), visit_type (text), triage_summary (text), notes (text), status (text: upcoming/cancelled/completed), created_at.

2. Security
- RLS enabled on both tables.
- Single-tenant (no auth): all CRUD allowed for anon + authenticated.

3. Seed data
- 4 veterinarian profiles with realistic names, specialties, clinic locations, fees, ratings.
- One upcoming appointment for Mochi to populate the dashboard widget.
*/

CREATE TABLE IF NOT EXISTS vets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  credentials text NOT NULL,
  specialty text NOT NULL,
  rating numeric NOT NULL DEFAULT 5.0,
  review_count int NOT NULL DEFAULT 0,
  clinic_name text NOT NULL,
  clinic_address text NOT NULL,
  distance_km numeric NOT NULL DEFAULT 0,
  consultation_fee numeric NOT NULL DEFAULT 0,
  photo_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  vet_id uuid NOT NULL REFERENCES vets(id) ON DELETE CASCADE,
  appointment_date date NOT NULL,
  time_slot text NOT NULL,
  visit_type text NOT NULL,
  triage_summary text,
  notes text,
  status text NOT NULL DEFAULT 'upcoming',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vets ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- vets policies
DROP POLICY IF EXISTS "anon_select_vets" ON vets;
CREATE POLICY "anon_select_vets" ON vets FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_vets" ON vets;
CREATE POLICY "anon_insert_vets" ON vets FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_vets" ON vets;
CREATE POLICY "anon_update_vets" ON vets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_vets" ON vets;
CREATE POLICY "anon_delete_vets" ON vets FOR DELETE TO anon, authenticated USING (true);

-- appointments policies
DROP POLICY IF EXISTS "anon_select_appointments" ON appointments;
CREATE POLICY "anon_select_appointments" ON appointments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_appointments" ON appointments;
CREATE POLICY "anon_insert_appointments" ON appointments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_appointments" ON appointments;
CREATE POLICY "anon_update_appointments" ON appointments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_appointments" ON appointments;
CREATE POLICY "anon_delete_appointments" ON appointments FOR DELETE TO anon, authenticated USING (true);

-- Seed 4 veterinarians
INSERT INTO vets (full_name, credentials, specialty, rating, review_count, clinic_name, clinic_address, distance_km, consultation_fee, photo_url)
SELECT * FROM (VALUES
  ('Dr. Sarah Jenkins'::text, 'DVM'::text, 'General Practice'::text, 4.9::numeric, 312::int, 'Greenfield Animal Clinic'::text, '142 Maple Avenue, Greenfield'::text, 1.2::numeric, 85::numeric, 'https://images.pexels.com/photos/5214958/pexels-photo-5214958.jpeg?auto=compress&cs=tinysrgb&h=400&w=400'::text),
  ('Dr. Michael Torres'::text, 'DVM, DACVD'::text, 'Dermatology'::text, 4.8::numeric, 198::int, 'Riverside Pet Hospital'::text, '88 River Road, Riverside'::text, 3.5::numeric, 120::numeric, 'https://images.pexels.com/photos/5452201/pexels-photo-5452201.jpeg?auto=compress&cs=tinysrgb&h=400&w=400'::text),
  ('Dr. Emily Chen'::text, 'DVM, DAVDC'::text, 'Dental & Oral Surgery'::text, 4.9::numeric, 241::int, 'Pawly Dental Care Center'::text, '55 Oak Street, Midtown'::text, 2.8::numeric, 150::numeric, 'https://images.pexels.com/photos/5214997/pexels-photo-5214997.jpeg?auto=compress&cs=tinysrgb&h=400&w=400'::text),
  ('Dr. James Okafor'::text, 'DVM, DACVECC'::text, 'Emergency & Critical Care'::text, 4.7::numeric, 156::int, 'Citywide Animal ER'::text, '300 Emergency Lane, Industrial District'::text, 5.1::numeric, 200::numeric, 'https://images.pexels.com/photos/6749778/pexels-photo-6749778.jpeg?auto=compress&cs=tinysrgb&h=400&w=400'::text)
) AS t(full_name, credentials, specialty, rating, review_count, clinic_name, clinic_address, distance_km, consultation_fee, photo_url)
WHERE NOT EXISTS (SELECT 1 FROM vets);

-- Seed one upcoming appointment for Mochi with Dr. Sarah Jenkins
INSERT INTO appointments (pet_id, vet_id, appointment_date, time_slot, visit_type, triage_summary, notes, status)
SELECT p.id, v.id, '2026-10-05', '11:00 AM', 'Routine Checkup', NULL, 'Annual wellness follow-up.', 'upcoming'
FROM pets p, vets v
WHERE p.name = 'Mochi' AND v.full_name = 'Dr. Sarah Jenkins'
AND NOT EXISTS (SELECT 1 FROM appointments WHERE pet_id = p.id AND vet_id = v.id);
