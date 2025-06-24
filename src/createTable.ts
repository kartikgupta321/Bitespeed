import pool from './db';

const createTableQuery = `
  CREATE TABLE IF NOT EXISTS contact (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR,
    email VARCHAR,
    linked_id INTEGER REFERENCES contact(id),
    link_precedence VARCHAR(10) NOT NULL CHECK (link_precedence IN ('primary', 'secondary')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
  );
`;

(async () => {
  try {
    await pool.query(createTableQuery);
    console.log('✅ contact table created (if not already).');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating table:', err);
    process.exit(1);
  }
})();
