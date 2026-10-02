-- Havenly production PostgreSQL baseline.
-- The zero-config demo uses server/data.json; this schema is the migration target
-- for a managed Postgres deployment.

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  role text not null check (role in ('owner','manager','front_desk','finance','mess_staff','resident')),
  password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  timezone text not null default 'Asia/Kolkata',
  currency char(3) not null default 'INR',
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  user_id uuid not null references users(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  role text not null,
  primary key (user_id, property_id)
);

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  code text not null,
  floor integer not null default 1,
  room_type text not null default 'standard',
  status text not null default 'available' check (status in ('available','partial','full','maintenance')),
  unique (property_id, code)
);

create table if not exists beds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  label text not null,
  status text not null default 'available' check (status in ('available','occupied','maintenance')),
  unique (room_id, label)
);

create table if not exists residents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id),
  user_id uuid references users(id),
  name text not null,
  email text,
  phone text,
  emergency_contact jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','active','notice','checked_out')),
  joined_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bed_assignments (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references residents(id),
  bed_id uuid not null references beds(id),
  starts_on date not null,
  ends_on date,
  rent_minor integer not null default 0,
  deposit_minor integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists active_bed_assignment on bed_assignments (bed_id) where ends_on is null;
create unique index if not exists active_resident_assignment on bed_assignments (resident_id) where ends_on is null;

create table if not exists complaints (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id),
  resident_id uuid references residents(id),
  title text not null,
  description text not null,
  category text not null default 'general',
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  assignee_id uuid references users(id),
  sla_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists complaints_property_status on complaints(property_id, status);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references residents(id),
  number text not null unique,
  due_on date not null,
  currency char(3) not null default 'INR',
  total_minor integer not null check (total_minor >= 0),
  status text not null default 'issued' check (status in ('draft','issued','partially_paid','paid','overdue','void')),
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references residents(id),
  invoice_id uuid references invoices(id),
  amount_minor integer not null check (amount_minor > 0),
  method text not null,
  provider_reference text,
  idempotency_key text unique,
  status text not null default 'paid' check (status in ('pending','paid','failed','refunded')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists visitors (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references residents(id),
  visitor_name text not null,
  phone text,
  purpose text not null,
  expected_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','checked_in','checked_out')),
  pass_token_hash text unique,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists mess_menus (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id),
  service_date date not null,
  breakfast text,
  lunch text,
  snacks text,
  dinner text,
  unique (property_id, service_date)
);

create table if not exists meal_attendance (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references residents(id),
  service_date date not null,
  meal text not null check (meal in ('breakfast','lunch','snacks','dinner')),
  status text not null check (status in ('present','absent','excused')),
  marked_at timestamptz not null default now(),
  unique (resident_id, service_date, meal)
);

create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id),
  author_id uuid not null references users(id),
  title text not null,
  content text not null,
  audience text not null default 'all',
  priority text not null default 'general',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists audit_events (
  id bigserial primary key,
  actor_id uuid references users(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_state jsonb,
  after_state jsonb,
  request_id text,
  created_at timestamptz not null default now()
);
