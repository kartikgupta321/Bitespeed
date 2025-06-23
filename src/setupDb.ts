import pool from './db';

const createTriggerFunction = `
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW."updatedat" = now();
    RETURN NEW;
  END;
  $$ language 'plpgsql';
`;

const createTrigger = `
  DROP TRIGGER IF EXISTS update_contact_updated_at ON "contact";

  CREATE TRIGGER update_contact_updated_at
  BEFORE UPDATE ON "contact"
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();
`;

(async () => {
  try {
    await pool.query(createTriggerFunction);
    await pool.query(createTrigger);
    console.log('✅ Trigger for updatedAt successfully set up.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error setting up trigger:', err);
    process.exit(1);
  }
})();
