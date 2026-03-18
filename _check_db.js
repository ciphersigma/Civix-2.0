const { Pool } = require('pg');
const pool = new Pool({ connectionString: "postgresql://neondb_owner:npg_Sfx1AdsV0MIo@ep-orange-fog-a1hq8gwg-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" });

pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position")
  .then(r => {
    console.log("COLUMNS:");
    r.rows.forEach(c => console.log("  " + c.column_name + " (" + c.data_type + ")"));
    // Also try a test insert to see the actual error
    return pool.query(
      "INSERT INTO users (phone_number, full_name, email, verification_code, verification_expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      ["+919876543210", "Test Debug", "debug@test.com", "123456", new Date(Date.now() + 600000)]
    );
  })
  .then(r => {
    console.log("INSERT OK, id:", r.rows[0].id);
    // Clean up
    return pool.query("DELETE FROM users WHERE phone_number = $1", ["+919876543210"]);
  })
  .then(() => { console.log("Cleanup done"); pool.end(); })
  .catch(e => { console.error("ERROR:", e.message); pool.end(); });
