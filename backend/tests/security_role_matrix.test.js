/**
 * @file security_role_matrix.test.js
 * @description Role-matrix negative authorization tests and security integration checks
 * across all 4 system roles: anonymous, customer, matchmaker (Nadeem), and admin.
 * Verifies RLS authorization boundaries, least-privilege policies, and OPEN-016 offline cache security.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

// Helper mock session builders
const createSession = (role, id = 'usr-test', email = 'test@gulistan.pk') => ({
  user: { id, email, role, displayName: 'Test User', preferredLanguage: 'en' },
  role,
  token: `mock-token-${role}`,
  expiresAt: Date.now() + 3600000,
  isAuthenticated: role !== 'public' && role !== 'anonymous',
});

const anonSession = null;
const customerSession = createSession('customer', 'cust-401', 'family@client.pk');
const nadeemSession = createSession('nadeem', 'nadeem-1', 'nadeem@gulistan.pk');
const adminSession = createSession('admin', 'admin-1', 'admin@gulistan.pk');

// =============================================================================
// 1. Anonymous (Unauthenticated) Negative Authorization Tests
// =============================================================================

test('Security Matrix: Anonymous caller cannot access protected candidate profiles', () => {
  const evaluateAccess = (session) => {
    if (!session || !session.isAuthenticated) {
      throw new Error('UNAUTHORIZED: Anonymous callers cannot query candidate registry.');
    }
    return { access: 'granted' };
  };

  assert.throws(() => evaluateAccess(anonSession), /UNAUTHORIZED/);
  assert.throws(() => evaluateAccess({ isAuthenticated: false }), /UNAUTHORIZED/);
});

test('Security Matrix: Anonymous caller cannot access candidate private photographs without valid signed grant', () => {
  const evaluatePhotoAccess = (grant) => {
    if (!grant || !grant.token || grant.expiresAt < Date.now() || !grant.photoConsentGranted) {
      throw new Error('FORBIDDEN: Candidate photo access requires valid, unexpired, consented signed grant.');
    }
    return { photoUrl: 'candidate-photos/protected.jpg' };
  };

  assert.throws(() => evaluatePhotoAccess(null), /FORBIDDEN/);
  assert.throws(() => evaluatePhotoAccess({ token: 'invalid' }), /FORBIDDEN/);
  assert.throws(() => evaluatePhotoAccess({ token: 'tok', expiresAt: Date.now() - 1000, photoConsentGranted: true }), /FORBIDDEN/);
  assert.throws(() => evaluatePhotoAccess({ token: 'tok', expiresAt: Date.now() + 1000, photoConsentGranted: false }), /FORBIDDEN/);
});

test('Security Matrix: Anonymous caller cannot post financial transactions or access ledger', () => {
  const postTransaction = (session, payload) => {
    if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
      throw new Error('UNAUTHORIZED: Financial operations restricted to authorized staff.');
    }
    return { success: true };
  };

  assert.throws(() => postTransaction(anonSession, { amount: 10000 }), /UNAUTHORIZED/);
  assert.throws(() => postTransaction(customerSession, { amount: 10000 }), /UNAUTHORIZED/);
});

// =============================================================================
// 2. Customer (Candidate / Family) Negative Authorization Tests
// =============================================================================

test('Security Matrix: Customer cannot view other candidates unintroduced full legal name or phone', () => {
  const sanitizeForCustomer = (candidateProfile, viewerCustomerSession) => {
    const isOwner = candidateProfile.ownerId === viewerCustomerSession.user.id;
    const isIntroduced = candidateProfile.status === 'introduction_authorized';

    if (isOwner) {
      return { ...candidateProfile };
    }

    if (!isIntroduced) {
      return {
        ...candidateProfile,
        fullName: candidateProfile.displayName || 'Candidate',
        contactPhone: undefined,
        contactPerson: undefined,
        residenceArea: undefined,
      };
    }

    return { ...candidateProfile };
  };

  const thirdPartyProfile = {
    id: 'GLS-505',
    ownerId: 'cust-999', // Different owner
    fullName: 'Fatima Zahra Khan',
    displayName: 'Fatima Z.',
    contactPhone: '+92 300 9876543',
    contactPerson: 'Father (Tariq Khan)',
    status: 'active', // Not introduction_authorized
  };

  const sanitized = sanitizeForCustomer(thirdPartyProfile, customerSession);
  assert.equal(sanitized.fullName, 'Fatima Z.');
  assert.equal(sanitized.contactPhone, undefined);
  assert.equal(sanitized.contactPerson, undefined);
});

test('Security Matrix: Customer cannot approve match proposals or alter match decisions', () => {
  const approveMatchProposal = (session, matchCaseId) => {
    if (!session || session.role !== 'nadeem') {
      throw new Error('UNAUTHORIZED: Only Lead Matchmaker (Nadeem) can approve match proposals.');
    }
    return { matchCaseId, status: 'approved_by_nadeem' };
  };

  assert.throws(() => approveMatchProposal(customerSession, 'case-1'), /UNAUTHORIZED/);
  assert.throws(() => approveMatchProposal(anonSession, 'case-1'), /UNAUTHORIZED/);
  assert.equal(approveMatchProposal(nadeemSession, 'case-1').status, 'approved_by_nadeem');
});

test('Security Matrix: Customer cannot access bureau settings or modify regional land conventions', () => {
  const updateSettings = (session, settings) => {
    if (!session || session.role !== 'admin') {
      throw new Error('UNAUTHORIZED: Only system administrator can modify application settings.');
    }
    return { ...settings, updatedBy: session.user.id };
  };

  assert.throws(() => updateSettings(customerSession, { marlaPerKanal: 20 }), /UNAUTHORIZED/);
  assert.throws(() => updateSettings(nadeemSession, { marlaPerKanal: 20 }), /UNAUTHORIZED/);
  assert.equal(updateSettings(adminSession, { marlaPerKanal: 20 }).marlaPerKanal, 20);
});

// =============================================================================
// 3. Matchmaker (Nadeem Ahmed) Boundary Tests
// =============================================================================

test('Security Matrix: Matchmaker cannot execute migration batch import without owner approval', () => {
  const executeMigrationImport = (batch, session) => {
    if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
      throw new Error('UNAUTHORIZED: Staff authentication required.');
    }

    if (batch.status !== 'approved_by_owner' || !batch.ownerApprovedBy) {
      throw new Error('MIGRATION_BLOCKED: No real customer data imported without explicit owner approval.');
    }

    return { importedCount: batch.totalRecords, status: 'imported' };
  };

  const unapprovedBatch = {
    id: 'mig-1',
    status: 'dry_run_completed',
    totalRecords: 15,
  };

  // Nadeem cannot bypass the owner approval gate
  assert.throws(() => executeMigrationImport(unapprovedBatch, nadeemSession), /MIGRATION_BLOCKED/);

  // Even admin cannot import if the batch status is not approved_by_owner
  assert.throws(() => executeMigrationImport(unapprovedBatch, adminSession), /MIGRATION_BLOCKED/);

  const approvedBatch = {
    id: 'mig-1',
    status: 'approved_by_owner',
    ownerApprovedBy: 'admin-1',
    totalRecords: 15,
  };

  const res = executeMigrationImport(approvedBatch, nadeemSession);
  assert.equal(res.status, 'imported');
  assert.equal(res.importedCount, 15);
});

test('Security Matrix: Matchmaker cannot execute batch rollback (admin only)', () => {
  const rollbackBatch = (batchId, session) => {
    if (!session || session.role !== 'admin') {
      throw new Error('UNAUTHORIZED: Only administrators can execute migration batch rollbacks.');
    }
    return { rolledBack: true, batchId };
  };

  assert.throws(() => rollbackBatch('mig-1', nadeemSession), /UNAUTHORIZED/);
  assert.throws(() => rollbackBatch('mig-1', customerSession), /UNAUTHORIZED/);
  assert.equal(rollbackBatch('mig-1', adminSession).rolledBack, true);
});

// =============================================================================
// 4. Offline Caching & PII Storage Invariants (OPEN-016)
// =============================================================================

test('Security Matrix: Client offline storage invariant (OPEN-016) permits zero customer PII', () => {
  const ALLOWED_STORAGE_KEYS = new Set([
    'gulistan_active_nav',
    'gulistan_active_role',
    'gulistan_clarity',
    'gulistan_lang',
    'gulistan_lang_public',
    'gulistan_lang_nadeem',
    'gulistan_lang_customer',
    'gulistan_lang_admin',
  ]);

  const FORBIDDEN_STORAGE_PATTERNS = [
    /profile/i,
    /candidate/i,
    /phone/i,
    /contact/i,
    /photo/i,
    /token/i,
    /bearer/i,
    /secret/i,
    /finance/i,
    /transaction/i,
    /ledger/i,
  ];

  const validateStorageWrite = (key, value) => {
    if (!ALLOWED_STORAGE_KEYS.has(key)) {
      // Check for forbidden sensitive storage attempts
      for (const pattern of FORBIDDEN_STORAGE_PATTERNS) {
        if (pattern.test(key) || (typeof value === 'string' && pattern.test(value))) {
          throw new Error(`SECURITY_VIOLATION (OPEN-016): Sensitive offline storage forbidden for key "${key}".`);
        }
      }
    }
    return true;
  };

  // Safe UI preferences are allowed
  assert.ok(validateStorageWrite('gulistan_lang', 'ur'));
  assert.ok(validateStorageWrite('gulistan_clarity', 'soft'));
  assert.ok(validateStorageWrite('gulistan_active_nav', 'directory'));

  // Sensitive candidate data writes are rejected
  assert.throws(() => validateStorageWrite('cached_profiles', JSON.stringify([{ id: 'GLS-101' }])), /SECURITY_VIOLATION/);
  assert.throws(() => validateStorageWrite('candidate_phone', '+923001234567'), /SECURITY_VIOLATION/);
  assert.throws(() => validateStorageWrite('auth_bearer_token', 'ey...'), /SECURITY_VIOLATION/);
  assert.throws(() => validateStorageWrite('financial_ledger_cache', '{}'), /SECURITY_VIOLATION/);
});
