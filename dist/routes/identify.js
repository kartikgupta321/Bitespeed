"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../db"));
const router = express_1.default.Router();
router.post('/', async (req, res) => {
    const { email, phoneNumber } = req.body;
    if (!email && !phoneNumber) {
        res.status(400).json({ message: 'Either email or phoneNumber must be present' });
        return;
    }
    try {
        const matchingContacts = await findMatchingContacts(email, phoneNumber);
        if (matchingContacts.length === 0) {
            const newContact = await createPrimaryContact(email, phoneNumber);
            const consolidatedContact = await getConsolidatedContact(newContact.id);
            res.status(200).json({ contact: consolidatedContact });
            return;
        }
        const primaryIds = await getPrimaryContactIds(matchingContacts);
        if (primaryIds.length > 1) {
            const oldestPrimaryId = await mergePrimaryContacts(primaryIds);
            const needsNew = await needsNewSecondaryContact(oldestPrimaryId, email, phoneNumber);
            if (needsNew) {
                await createSecondaryContact(email, phoneNumber, oldestPrimaryId);
            }
            const consolidatedContact = await getConsolidatedContact(oldestPrimaryId);
            res.status(200).json({ contact: consolidatedContact });
            return;
        }
        const primaryId = primaryIds[0];
        const needsNewContact = await needsNewSecondaryContact(primaryId, email, phoneNumber);
        if (needsNewContact) {
            await createSecondaryContact(email, phoneNumber, primaryId);
        }
        const consolidatedContact = await getConsolidatedContact(primaryId);
        res.status(200).json({ contact: consolidatedContact });
    }
    catch (error) {
        console.error('Error in identify endpoint:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
async function findMatchingContacts(email, phoneNumber) {
    let query = 'SELECT * FROM contact WHERE deleted_at IS NULL AND (';
    const params = [];
    const conditions = [];
    if (email) {
        conditions.push(`email = $${params.length + 1}`);
        params.push(email);
    }
    if (phoneNumber) {
        conditions.push(`phone_number = $${params.length + 1}`);
        params.push(phoneNumber);
    }
    query += conditions.join(' OR ') + ')';
    const result = await db_1.default.query(query, params);
    return result.rows;
}
async function createPrimaryContact(email, phoneNumber) {
    const result = await db_1.default.query(`INSERT INTO contact (email, phone_number, link_precedence, created_at, updated_at) 
     VALUES ($1, $2, 'primary', NOW(), NOW()) RETURNING *`, [email, phoneNumber]);
    return result.rows[0];
}
async function createSecondaryContact(email, phoneNumber, primaryId) {
    await db_1.default.query(`INSERT INTO contact (email, phone_number, linked_id, link_precedence, created_at, updated_at) 
     VALUES ($1, $2, $3, 'secondary', NOW(), NOW())`, [email, phoneNumber, primaryId]);
}
async function getPrimaryContactIds(contacts) {
    const primaryIds = new Set();
    for (const contact of contacts) {
        if (contact.link_precedence === 'primary') {
            primaryIds.add(contact.id);
        }
        else if (contact.linked_id) {
            primaryIds.add(contact.linked_id);
        }
    }
    return Array.from(primaryIds);
}
async function mergePrimaryContacts(primaryIds) {
    const result = await db_1.default.query(`SELECT * FROM contact WHERE id = ANY($1) ORDER BY created_at`, [primaryIds]);
    const primaryContacts = result.rows;
    const oldestPrimary = primaryContacts[0]; // First one is oldest due to ORDER BY created_at
    const otherPrimaries = primaryContacts.slice(1);
    for (const primary of otherPrimaries) {
        await db_1.default.query(`UPDATE contact SET link_precedence = 'secondary', linked_id = $1, updated_at = NOW() 
       WHERE id = $2`, [oldestPrimary.id, primary.id]);
        await db_1.default.query(`UPDATE contact SET linked_id = $1, updated_at = NOW() 
       WHERE linked_id = $2`, [oldestPrimary.id, primary.id]);
    }
    return oldestPrimary.id;
}
async function needsNewSecondaryContact(primaryId, email, phoneNumber) {
    const result = await db_1.default.query(`SELECT * FROM contact WHERE (id = $1 OR linked_id = $1) AND deleted_at IS NULL`, [primaryId]);
    const allContacts = result.rows;
    const existingEmails = new Set(allContacts.map(c => c.email).filter(e => e !== null));
    const existingPhoneNumbers = new Set(allContacts.map(c => c.phone_number).filter(p => p !== null));
    let hasNewInfo = false;
    if (email && !existingEmails.has(email)) {
        hasNewInfo = true;
    }
    if (phoneNumber && !existingPhoneNumbers.has(phoneNumber)) {
        hasNewInfo = true;
    }
    return hasNewInfo;
}
async function getConsolidatedContact(primaryId) {
    const primaryResult = await db_1.default.query(`SELECT * FROM contact WHERE id = $1 AND deleted_at IS NULL`, [primaryId]);
    if (primaryResult.rows.length === 0) {
        throw new Error('Primary contact not found');
    }
    const primary = primaryResult.rows[0];
    const secondariesResult = await db_1.default.query(`SELECT * FROM contact WHERE linked_id = $1 AND deleted_at IS NULL ORDER BY created_at`, [primaryId]);
    const secondaries = secondariesResult.rows;
    const emails = [];
    const phoneNumbers = [];
    if (primary.email)
        emails.push(primary.email);
    if (primary.phone_number)
        phoneNumbers.push(primary.phone_number);
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
exports.default = router;
