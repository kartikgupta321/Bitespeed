import pool from './db';

const createTableQuery = `
  CREATE TABLE IF NOT EXISTS Contact (
    id SERIAL PRIMARY KEY,
    phoneNumber VARCHAR,
    email VARCHAR,
    linkedId INTEGER REFERENCES Contact(id),
    linkPrecedence VARCHAR(10) CHECK (linkPrecedence IN ('primary', 'secondary')),
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    deletedAt TIMESTAMP
  );
`;

(async () => {
  try {
    await pool.query(createTableQuery);
    console.log('✅ Contact table created (if not already).');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating table:', err);
    process.exit(1);
  }
})();
