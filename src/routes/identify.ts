import express, { Request, Response } from 'express';
import pool from '../db';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
  const { email, phoneNumber } = req.body;
  
  if (!email && !phoneNumber) {
    res.status(400).json({ message: 'Either email or phoneNumber must be present' });
    return;
  }
  
  try {
    // Find all contacts that match either email or phone_number
    const matchingContacts = await findMatchingContacts(email, phoneNumber);
    
    if (matchingContacts.length === 0) {
      // No existing contacts, create new primary contact
      const newContact = await createPrimaryContact(email, phoneNumber);
      const consolidatedContact = await getConsolidatedContact(newContact.id);
      res.status(200).json({ contact: consolidatedContact });
      return;
    }
    
    // Get all primary contact IDs from matching contacts
    const primaryIds = await getPrimaryContactIds(matchingContacts);
    
    if (primaryIds.length > 1) {
      // Multiple primary contacts need to be merged
      const oldestPrimaryId = await mergePrimaryContacts(primaryIds);
      
      // Check if we need to create a new contact for this specific combination
      const needsNew = await needsNewSecondaryContact(oldestPrimaryId, email, phoneNumber);
      if (needsNew) {
        await createSecondaryContact(email, phoneNumber, oldestPrimaryId);
      }
      
      const consolidatedContact = await getConsolidatedContact(oldestPrimaryId);
      res.status(200).json({ contact: consolidatedContact });
      return;
    }
    
    // Single primary contact chain
    const primaryId = primaryIds[0];
    
    // Check if we need to create a new secondary contact
    const needsNewContact = await needsNewSecondaryContact(primaryId, email, phoneNumber);
    
    if (needsNewContact) {
      await createSecondaryContact(email, phoneNumber, primaryId);
    }
    
    const consolidatedContact = await getConsolidatedContact(primaryId);
    res.status(200).json({ contact: consolidatedContact });
    
  } catch (error) {
    console.error('Error in identify endpoint:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

async function findMatchingContacts(email: string | null, phoneNumber: string | null) {
  let query = 'SELECT * FROM contact WHERE deleted_at IS NULL AND (';
  const params: any[] = [];
  const conditions: string[] = [];
  
  if (email) {
    conditions.push(`email = $${params.length + 1}`);
    params.push(email);
  }
  
  if (phoneNumber) {
    conditions.push(`phone_number = $${params.length + 1}`);
    params.push(phoneNumber);
  }
  
  query += conditions.join(' OR ') + ')';
  
  const result = await pool.query(query, params);
  return result.rows;
}

async function createPrimaryContact(email: string | null, phoneNumber: string | null) {
  const result = await pool.query(
    `INSERT INTO contact (email, phone_number, link_precedence, created_at, updated_at) 
     VALUES ($1, $2, 'primary', NOW(), NOW()) RETURNING *`,
    [email, phoneNumber]
  );
  return result.rows[0];
}

async function createSecondaryContact(email: string | null, phoneNumber: string | null, primaryId: number) {
  await pool.query(
    `INSERT INTO contact (email, phone_number, linked_id, link_precedence, created_at, updated_at) 
     VALUES ($1, $2, $3, 'secondary', NOW(), NOW())`,
    [email, phoneNumber, primaryId]
  );
}

async function getPrimaryContactIds(contacts: any[]): Promise<number[]> {
  const primaryIds = new Set<number>();
  
  for (const contact of contacts) {
    if (contact.link_precedence === 'primary') {
      primaryIds.add(contact.id);
    } else if (contact.linked_id) {
      primaryIds.add(contact.linked_id);
    }
  }
  
  return Array.from(primaryIds);
}

async function mergePrimaryContacts(primaryIds: number[]): Promise<number> {
  // Get all primary contacts to find the oldest one
  const result = await pool.query(
    `SELECT * FROM contact WHERE id = ANY($1) ORDER BY created_at`,
    [primaryIds]
  );
  
  const primaryContacts = result.rows;
  const oldestPrimary = primaryContacts[0]; // First one is oldest due to ORDER BY created_at
  const otherPrimaries = primaryContacts.slice(1);
  
  // Update other primaries to be secondary
  for (const primary of otherPrimaries) {
    await pool.query(
      `UPDATE contact SET link_precedence = 'secondary', linked_id = $1, updated_at = NOW() 
       WHERE id = $2`,
      [oldestPrimary.id, primary.id]
    );
    
    // Update all contacts that were linked to this primary to now link to the oldest primary
    await pool.query(
      `UPDATE contact SET linked_id = $1, updated_at = NOW() 
       WHERE linked_id = $2`,
      [oldestPrimary.id, primary.id]
    );
  }
  
  return oldestPrimary.id;
}

async function needsNewSecondaryContact(primaryId: number, email: string | null, phoneNumber: string | null): Promise<boolean> {
  // Get all contacts in this chain (primary + all secondaries)
  const result = await pool.query(
    `SELECT * FROM contact WHERE (id = $1 OR linked_id = $1) AND deleted_at IS NULL`,
    [primaryId]
  );
  
  const allContacts = result.rows;
  
  // Check if exact combination already exists
  const exactMatch = allContacts.find(contact => 
    contact.email === email && contact.phone_number === phoneNumber
  );
  
  return !exactMatch;
}

async function getConsolidatedContact(primaryId: number) {
  // Get primary contact
  const primaryResult = await pool.query(
    `SELECT * FROM contact WHERE id = $1 AND deleted_at IS NULL`,
    [primaryId]
  );
  
  if (primaryResult.rows.length === 0) {
    throw new Error('Primary contact not found');
  }
  
  const primary = primaryResult.rows[0];
  
  // Get all secondary contacts
  const secondariesResult = await pool.query(
    `SELECT * FROM contact WHERE linked_id = $1 AND deleted_at IS NULL ORDER BY created_at`,
    [primaryId]
  );
  
  const secondaries = secondariesResult.rows;
  
  // Collect unique emails and phone numbers
  const emails: string[] = [];
  const phoneNumbers: string[] = [];
  
  // Add primary contact info first
  if (primary.email) emails.push(primary.email);
  if (primary.phone_number) phoneNumbers.push(primary.phone_number);
  
  // Add secondary contact info (avoid duplicates)
  for (const secondary of secondaries) {
    if (secondary.email && !emails.includes(secondary.email)) {
      emails.push(secondary.email);
    }
    if (secondary.phone_number && !phoneNumbers.includes(secondary.phone_number)) {
      phoneNumbers.push(secondary.phone_number);
    }
  }
  
  return {
    primaryContatctId: primary.id,
    emails: emails,
    phoneNumbers: phoneNumbers,
    secondaryContactIds: secondaries.map(s => s.id)
  };
}

export default router;