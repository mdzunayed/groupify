exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE rider_profiles (
      id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
      account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE RESTRICT,
      display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
      rider_type text NOT NULL CHECK (rider_type IN ('motorcycle', 'bicycle')),
      vehicle_description text CHECK (vehicle_description IS NULL OR char_length(vehicle_description) BETWEEN 1 AND 160),
      version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    LOCK TABLE rider_profiles IN ACCESS EXCLUSIVE MODE;
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM rider_profiles) THEN
        RAISE EXCEPTION 'Profile rollback requires an empty table';
      END IF;
    END $$;
    DROP TABLE rider_profiles;
  `);
};
