-- Future adapter starting point. NOT used by the running SQLite implementation.
-- Apply through a versioned migration system when introducing PostgreSQL.
CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text UNIQUE,
  password_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  expires_at timestamptz NOT NULL
);
CREATE TABLE rooms (
  id uuid PRIMARY KEY,
  code text UNIQUE NOT NULL,
  host_id uuid NOT NULL REFERENCES users(id),
  revision bigint NOT NULL DEFAULT 0,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE commands (
  room_id uuid NOT NULL REFERENCES rooms(id),
  command_id uuid NOT NULL,
  actor_id uuid NOT NULL REFERENCES users(id),
  revision bigint NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY(room_id, command_id)
);
CREATE TABLE saves (
  user_id uuid NOT NULL REFERENCES users(id),
  slot text NOT NULL,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, slot)
);
CREATE TABLE characters (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE INDEX rooms_updated_at ON rooms(updated_at DESC);
-- Use UPDATE ... WHERE id=$id AND revision=$expected in the SAME transaction as
-- INSERT commands and UPDATE characters. Affected rows must equal one.
