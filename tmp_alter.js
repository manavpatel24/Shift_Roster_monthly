import pg from 'pg';
const pool = new pg.Pool({ connectionString: "postgresql://postgres:mind@172.16.12.223:5432/postgres" });
const run = async () => {
   try {
     await pool.query(`ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_shift_type_check;`);
     await pool.query(`ALTER TABLE shifts ADD CONSTRAINT shifts_shift_type_check CHECK (shift_type IN ('Morning', 'Normal', 'Noon', 'Extra Day', '-'));`);
     console.log("Database constraint updated successfully.");
   } catch(e) {
     console.error(e);
   }
   process.exit(0);
};
run();
