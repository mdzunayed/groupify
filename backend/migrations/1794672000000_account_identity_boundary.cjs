exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE accounts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      state text NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'deactivated')),
      created_at timestamptz NOT NULL DEFAULT clock_timestamp()
    );
    CREATE TABLE external_identities (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
      provider text COLLATE "C" NOT NULL CHECK (length(provider) > 0),
      issuer text COLLATE "C" NOT NULL CHECK (length(issuer) > 0),
      subject text COLLATE "C" NOT NULL CHECK (length(subject) > 0),
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      UNIQUE (provider, issuer, subject)
    );
    CREATE INDEX external_identities_account_idx ON external_identities(account_id);
  `);
};

// Never discard identity mappings as a rollback shortcut on a populated database.
// A rollback with data needs an explicit export/transition plan instead.
exports.down = (pgm) => {
  pgm.sql(`
    LOCK TABLE accounts, external_identities IN ACCESS EXCLUSIVE MODE;
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM accounts) OR EXISTS (SELECT 1 FROM external_identities) THEN
        RAISE EXCEPTION 'Account identity rollback requires empty tables';
      END IF;
    END $$;
    DROP TABLE external_identities;
    DROP TABLE accounts;
  `);
};
