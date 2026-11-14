exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE communities (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
      created_by uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp()
    );
    CREATE INDEX communities_creator_idx ON communities(created_by);
    CREATE TABLE community_memberships (
      community_id uuid NOT NULL REFERENCES communities(id) ON DELETE RESTRICT,
      account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
      role text NOT NULL CHECK (role IN ('Leader', 'Co-leader', 'Member')),
      joined_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      PRIMARY KEY (community_id, account_id)
    );
    CREATE INDEX community_memberships_account_idx ON community_memberships(account_id);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    LOCK TABLE communities, community_memberships IN ACCESS EXCLUSIVE MODE;
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM communities) OR EXISTS (SELECT 1 FROM community_memberships) THEN
        RAISE EXCEPTION 'Community rollback requires empty tables';
      END IF;
    END $$;
    DROP TABLE community_memberships;
    DROP TABLE communities;
  `);
};
