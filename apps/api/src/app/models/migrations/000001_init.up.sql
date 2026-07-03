CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  handle text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  identity_verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  locale text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE providers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug text UNIQUE NOT NULL,
  name_en text NOT NULL,
  name_ja text NOT NULL,
  modality text NOT NULL,          -- online | in_person | either
  languages text[] NOT NULL,
  cost_band text NOT NULL,         -- research_covered | low_cost | standard
  bands text[] NOT NULL,           -- severity bands served
  description_en text NOT NULL DEFAULT '',
  description_ja text NOT NULL DEFAULT '',
  anonymous_booking boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE screenings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score int NOT NULL,
  band text NOT NULL,              -- minimal | mild | moderate | moderately_severe | severe
  item9_flag boolean NOT NULL DEFAULT false,
  credential_id text,              -- shin credential id once issued
  credential_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES providers(id),
  band text NOT NULL,
  preferences jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'REQUESTED',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE verifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shin_verification_id text,
  status text NOT NULL DEFAULT 'CREATED',
  connect_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
