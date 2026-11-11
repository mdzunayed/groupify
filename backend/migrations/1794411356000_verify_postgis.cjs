exports.up = (pgm) => {
  pgm.sql("SELECT postgis_full_version();");
};

// This baseline does not create or own the PostGIS extension or product data.
exports.down = () => {};
