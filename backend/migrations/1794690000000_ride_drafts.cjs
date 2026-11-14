exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE rides (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      community_id uuid NOT NULL REFERENCES communities(id) ON DELETE RESTRICT,
      created_by uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
      mode text NOT NULL CHECK (mode IN ('immediate', 'scheduled')),
      scheduled_for timestamptz,
      state text NOT NULL DEFAULT 'draft' CHECK (state = 'draft'),
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      CHECK ((mode = 'immediate' AND scheduled_for IS NULL) OR
             (mode = 'scheduled' AND scheduled_for IS NOT NULL AND scheduled_for > created_at))
    );
    CREATE INDEX rides_community_created_idx ON rides(community_id, created_at, id);
    CREATE INDEX rides_creator_idx ON rides(created_by);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    LOCK TABLE rides IN ACCESS EXCLUSIVE MODE;
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM rides) THEN
        RAISE EXCEPTION 'Ride rollback requires an empty table';
      END IF;
    END $$;
    DROP TABLE rides;
  `);
};
