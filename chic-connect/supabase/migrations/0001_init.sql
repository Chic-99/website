-- =============================================================================
-- CHIC Connect — initial schema
-- Run this once in Supabase Dashboard → SQL Editor (or via `supabase db push`
-- if you're using the Supabase CLI with this file under supabase/migrations).
-- =============================================================================

create extension if not exists pgcrypto;

-- =============================================================================
-- 1. DOCTORS
-- =============================================================================

create table if not exists public.doctors (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  telugu_name     text,
  specialty       text not null,
  qualification   text not null,
  doctor_type     text not null check (doctor_type in ('Visiting Chennai Specialist','Local Doctor')),
  hospital        text not null,
  email           text not null,
  phone           text,
  bio             text,
  active          boolean not null default true,
  display_order   integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_doctors_specialty on public.doctors (specialty);
create index if not exists idx_doctors_active    on public.doctors (active);
create index if not exists idx_doctors_type      on public.doctors (doctor_type);

-- =============================================================================
-- 2. APPOINTMENTS
-- =============================================================================

create table if not exists public.appointments (
  id                    uuid primary key default gen_random_uuid(),
  reference_number      text not null unique,
  doctor_id             uuid references public.doctors(id) on delete set null,
  doctor_name           text not null,   -- snapshot at booking time, survives doctor deletion
  specialty             text not null,
  preferred_date        date,
  preferred_time        text,
  patient_name          text not null,
  patient_phone         text not null,
  patient_age           integer check (patient_age is null or (patient_age >= 0 and patient_age <= 120)),
  patient_gender        text check (patient_gender is null or patient_gender in ('Male','Female','Other')),
  contact_preference    text check (contact_preference is null or contact_preference in ('Phone Call','WhatsApp','SMS')),
  patient_type          text check (patient_type is null or patient_type in ('New Patient','Existing Patient')),
  status                text not null default 'Request Received'
                          check (status in ('Request Received','Called','Scheduled','Confirmed','Closed')),
  email_sent            boolean not null default false,
  email_error           text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint patient_name_not_blank check (btrim(patient_name) <> ''),
  constraint patient_phone_not_blank check (btrim(patient_phone) <> '')
);

create index if not exists idx_appointments_status  on public.appointments (status);
create index if not exists idx_appointments_doctor  on public.appointments (doctor_id);
create index if not exists idx_appointments_ref     on public.appointments (reference_number);
create index if not exists idx_appointments_created on public.appointments (created_at desc);

-- Auto-generate a human-friendly, unique reference number, e.g. CHIC-2026-000042
create sequence if not exists public.appointment_ref_seq;

create or replace function public.set_appointment_reference()
returns trigger
language plpgsql
as $$
begin
  if new.reference_number is null or btrim(new.reference_number) = '' then
    new.reference_number := 'CHIC-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.appointment_ref_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_appointment_reference on public.appointments;
create trigger trg_set_appointment_reference
  before insert on public.appointments
  for each row execute function public.set_appointment_reference();

-- Generic updated_at maintenance, reused by both tables
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_doctors_updated_at on public.doctors;
create trigger trg_doctors_updated_at
  before update on public.doctors
  for each row execute function public.set_updated_at();

drop trigger if exists trg_appointments_updated_at on public.appointments;
create trigger trg_appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 3. ADMIN USERS
-- Maps Supabase Auth users to CHIC admin privileges. A row here is what makes
-- someone an admin — creating an auth user alone is NOT enough (see README
-- "Creating your first admin account").
-- =============================================================================

create table if not exists public.admin_users (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- 4. ROW LEVEL SECURITY
-- =============================================================================

alter table public.doctors     enable row level security;
alter table public.appointments enable row level security;
alter table public.admin_users  enable row level security;

-- Helper: is the currently authenticated user an admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- ---- doctors policies ----

-- Anyone (including anonymous visitors) can see active doctors.
drop policy if exists "public can view active doctors" on public.doctors;
create policy "public can view active doctors"
  on public.doctors for select
  to anon, authenticated
  using (active = true or public.is_admin());

drop policy if exists "admins can insert doctors" on public.doctors;
create policy "admins can insert doctors"
  on public.doctors for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "admins can update doctors" on public.doctors;
create policy "admins can update doctors"
  on public.doctors for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins can delete doctors" on public.doctors;
create policy "admins can delete doctors"
  on public.doctors for delete
  to authenticated
  using (public.is_admin());

-- ---- appointments policies ----

-- Anyone can SUBMIT a booking request (write-only for the public — they
-- cannot read the list back). This is intentional: patients look up their
-- own appointment through the track_appointment() RPC below, not by
-- querying the table directly.
drop policy if exists "public can create appointments" on public.appointments;
create policy "public can create appointments"
  on public.appointments for insert
  to anon, authenticated
  with check (true);

drop policy if exists "admins can view appointments" on public.appointments;
create policy "admins can view appointments"
  on public.appointments for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admins can update appointments" on public.appointments;
create policy "admins can update appointments"
  on public.appointments for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins can delete appointments" on public.appointments;
create policy "admins can delete appointments"
  on public.appointments for delete
  to authenticated
  using (public.is_admin());

-- ---- admin_users policies ----

-- A signed-in user may check their OWN row (used by the admin panel to
-- decide whether to show the dashboard). They cannot see other admins,
-- and cannot grant themselves admin access this way.
drop policy if exists "users can check own admin status" on public.admin_users;
create policy "users can check own admin status"
  on public.admin_users for select
  to authenticated
  using (user_id = auth.uid());

-- Only existing admins can manage the admin_users table itself. There is
-- deliberately no public/anon insert policy — the ONLY way to create the
-- first admin is via SQL Editor / service role, per the README.
drop policy if exists "admins can manage admin_users" on public.admin_users;
create policy "admins can manage admin_users"
  on public.admin_users for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- 5. PUBLIC APPOINTMENT TRACKER (security definer RPC)
-- Lets a patient look up THEIR OWN appointment with reference + phone,
-- without granting broad SELECT access to the appointments table.
-- =============================================================================

create or replace function public.track_appointment(p_reference text, p_phone text)
returns table (
  reference_number text,
  status text,
  doctor_name text,
  specialty text,
  preferred_date date,
  preferred_time text,
  patient_name text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select a.reference_number, a.status, a.doctor_name, a.specialty,
         a.preferred_date, a.preferred_time, a.patient_name, a.created_at
  from public.appointments a
  where upper(a.reference_number) = upper(btrim(p_reference))
    and regexp_replace(a.patient_phone, '[^0-9]', '', 'g') = regexp_replace(p_phone, '[^0-9]', '', 'g')
  limit 1;
$$;

grant execute on function public.track_appointment(text, text) to anon, authenticated;

-- =============================================================================
-- 6. SEED DATA — the 12 doctors that were previously hardcoded in index.html
-- Safe to run once; skip or edit this block if you don't want the sample
-- doctors in your live project.
-- =============================================================================

insert into public.doctors (name, telugu_name, specialty, qualification, doctor_type, hospital, email, display_order, active)
values
  ('Dr. V. Indumathy', 'డా॥ వి. ఇందుమతి', 'Fertility', 'MBBS, DGO, FRM (Fellowship in Reproductive Medicine)', 'Visiting Chennai Specialist', 'Birla Fertility & IVF, Chennai', 'contact.indumathy@example.com', 1, true),
  ('Dr. Surendhar .G', null, 'Cardiology', 'MBBS, MD, DM (Interventional Cardiology)', 'Visiting Chennai Specialist', 'Premier Interventional Cardiac Sciences, Chennai', 'contact.surendhar@example.com', 2, true),
  ('Dr. Omer Sheriff', null, 'Orthopaedics', 'MBBS, MS (Ortho), Fellowship in Robotic Joint Replacement', 'Visiting Chennai Specialist', 'Advanced Robotic Ortho & Joint Institute, Chennai', 'contact.omersheriff@example.com', 3, true),
  ('Dr. V. Rajini', null, 'Fertility', 'MBBS, DGO, Fellowship in Reproductive Medicine', 'Visiting Chennai Specialist', 'Billroth Hospitals, Chennai', 'contact.rajini@example.com', 4, true),
  ('Dr. Rajesh Menon .M', null, 'Neurosurgery', 'MBBS, MS, MCh (Neurosurgery)', 'Visiting Chennai Specialist', 'Kauvery Hospital, Chennai', 'contact.rajeshmenon@example.com', 5, true),
  ('Dr. Balaji Kirushnan', null, 'Nephrology', 'MBBS, MD, DM (Nephrology)', 'Visiting Chennai Specialist', 'Kauvery Hospital, Chennai', 'contact.balajik@example.com', 6, true),
  ('Dr. Jhansi Vanitha Kumari', null, 'Fertility', 'MBBS, DGO, Fellowship in Reproductive Medicine', 'Visiting Chennai Specialist', 'Pink Lines Fertility Clinic & Women''s Center, Chennai', 'contact.jhansi@example.com', 7, true),
  ('Dr. U.V.U. Vamsidhar Reddy', null, 'Hepatology', 'MBBS, MD, DM (Hepatology), Fellowship in Liver Transplantation', 'Visiting Chennai Specialist', 'Kauvery Hospital, Chennai', 'contact.vamsidhar@example.com', 8, true),
  ('Dr. Thejaswi N Marla', null, 'Cardiology', 'MBBS, MS, MCh (CTVS)', 'Visiting Chennai Specialist', 'Sooriya Hospital, Chennai', 'contact.thejaswi@example.com', 9, true),
  ('Dr. P. Sreedhar Reddy', null, 'General Medicine', 'MBBS, MD (General Medicine)', 'Local Doctor', 'CHIC Local Healthcare Team, Nellore', 'contact.sreedharreddy@example.com', 10, true),
  ('Dr. Satish Raja', null, 'Orthopaedics', 'MBBS, MS (Orthopaedics)', 'Local Doctor', 'CHIC Orthopaedic Clinic, Nellore', 'contact.satishraja@example.com', 11, true),
  ('Dr. Ravi Panga', 'డా॥ రవి.పంగా', 'Dental', 'M.D.S. (Orthodontics), Dental Surgeon', 'Local Doctor', 'CHIC Dental & Orthodontic Clinic, Nellore', 'contact.ravipanga@example.com', 12, true)
on conflict do nothing;

-- NOTE: the sample email addresses above are placeholders (contact.*@example.com).
-- Update them in the Admin panel (Doctors → Edit) with real addresses before
-- relying on any doctor-specific notifications.
