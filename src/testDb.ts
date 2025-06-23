import pool from './db';

(async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ DB Connected! Current time is:', res.rows[0].now);
    process.exit(0); // exit cleanly
  } catch (err) {
    console.error('❌ DB Connection Error:', err);
    process.exit(1);
  }
})();
