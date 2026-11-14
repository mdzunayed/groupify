exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE rides DROP CONSTRAINT rides_state_check;
    ALTER TABLE rides
      ADD COLUMN started_at timestamptz,
      ADD COLUMN ended_at timestamptz,
      ADD COLUMN started_by uuid REFERENCES accounts(id) ON DELETE RESTRICT,
      ADD COLUMN ended_by uuid REFERENCES accounts(id) ON DELETE RESTRICT,
      ADD CONSTRAINT rides_state_check CHECK (state IN ('draft', 'active', 'completed')),
      ADD CONSTRAINT rides_lifecycle_check CHECK (
        (state = 'draft' AND started_at IS NULL AND ended_at IS NULL AND started_by IS NULL AND ended_by IS NULL) OR
        (state = 'active' AND started_at IS NOT NULL AND started_by IS NOT NULL AND started_at >= created_at AND ended_at IS NULL AND ended_by IS NULL) OR
        (state = 'completed' AND started_at IS NOT NULL AND started_by IS NOT NULL AND started_at >= created_at AND ended_at IS NOT NULL AND ended_by IS NOT NULL AND ended_at >= started_at)
      );
    CREATE INDEX rides_started_by_idx ON rides(started_by);
    CREATE INDEX rides_ended_by_idx ON rides(ended_by);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    LOCK TABLE rides IN ACCESS EXCLUSIVE MODE;
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM rides WHERE state <> 'draft') THEN
        RAISE EXCEPTION 'Lifecycle rollback requires only draft rides';
      END IF;
    END $$;
    ALTER TABLE rides DROP CONSTRAINT rides_lifecycle_check, DROP CONSTRAINT rides_state_check;
    ALTER TABLE rides DROP COLUMN started_at, DROP COLUMN ended_at, DROP COLUMN started_by, DROP COLUMN ended_by;
    ALTER TABLE rides ADD CONSTRAINT rides_state_check CHECK (state = 'draft');
  `);
};
