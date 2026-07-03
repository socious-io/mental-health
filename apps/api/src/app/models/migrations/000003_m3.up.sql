ALTER TABLE users ADD COLUMN role text NOT NULL DEFAULT 'user'; -- user | provider | org

CREATE TABLE studies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_user_id uuid NOT NULL REFERENCES users(id),
  title_en text NOT NULL,
  title_ja text NOT NULL,
  description_en text NOT NULL DEFAULT '',
  description_ja text NOT NULL DEFAULT '',
  reward_lovelace bigint NOT NULL,
  target_participants int NOT NULL,
  requires_treatment_need boolean NOT NULL DEFAULT false,
  min_band text NOT NULL DEFAULT 'minimal',
  status text NOT NULL DEFAULT 'DRAFT',   -- DRAFT | FUNDING | RECRUITING | COMPLETED
  escrow_tx text,
  escrow_utxo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE participations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  study_id uuid NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'APPLIED', -- APPLIED | ACTIVE | COMPLETED | REWARDED
  bind_tx text,
  release_tx text,
  reward_address text,
  progress int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (study_id, user_id)
);

CREATE TABLE treatment_credentials (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_user_id uuid NOT NULL REFERENCES users(id),
  level text NOT NULL,
  basis text NOT NULL,
  valid_months int NOT NULL DEFAULT 6,
  shin_credential_id text,
  status text NOT NULL DEFAULT 'CREATED',
  created_at timestamptz NOT NULL DEFAULT now()
);
