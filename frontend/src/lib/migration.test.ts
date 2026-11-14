import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSourceChecksum,
  createMigrationBatch,
  parseWhatsAppChatExport,
  parsePhoneGalleryMetadata,
  evaluateDeduplicationAndQuarantine,
  simulateMigrationDryRun,
  resolveQuarantinedRecord,
  approveMigrationBatchByOwner,
  executeBatchImport,
  reconcileMigrationBatch,
  rollbackMigrationBatch,
  resetMigrationStateForTesting,
  GalleryPhotoEntry,
} from './migration';
import { AuthSession } from './auth';
import { profileRepository, auditRepository } from './repositories';

const adminSession: AuthSession = {
  user: {
    id: 'usr-admin',
    email: 'admin@gulistan.pk',
    displayName: 'System Admin',
    role: 'admin',
    preferredLanguage: 'en',
  },
  role: 'admin',
  token: 'mock-admin-token',
  expiresAt: Date.now() + 3600000,
  isAuthenticated: true,
};

const nadeemSession: AuthSession = {
  user: {
    id: 'usr-nadeem',
    email: 'nadeem@gulistan.pk',
    displayName: 'Nadeem Ahmed',
    role: 'nadeem',
    preferredLanguage: 'ur',
  },
  role: 'nadeem',
  token: 'mock-nadeem-token',
  expiresAt: Date.now() + 3600000,
  isAuthenticated: true,
};

const customerSession: AuthSession = {
  user: {
    id: 'usr-customer-1',
    email: 'customer@example.com',
    displayName: 'Family User',
    role: 'customer',
    preferredLanguage: 'ur',
  },
  role: 'customer',
  token: 'mock-customer-token',
  expiresAt: Date.now() + 3600000,
  isAuthenticated: true,
};

beforeEach(() => {
  resetMigrationStateForTesting();
});

test('MIG-01: computeSourceChecksum computes deterministic 64-char SHA-256 hash', () => {
  const hash1 = computeSourceChecksum('Sample chat export content');
  const hash2 = computeSourceChecksum('Sample chat export content');
  const hash3 = computeSourceChecksum('Different content');

  assert.equal(hash1.length, 64);
  assert.equal(hash1, hash2);
  assert.notEqual(hash1, hash3);
});

test('MIG-01: createMigrationBatch enforces authorization and creates cataloged batch', () => {
  // Negative test: customer or null session rejected
  assert.throws(
    () => createMigrationBatch('whatsapp_chat_export', 'Export_2026.txt', 'Raw Data', customerSession),
    /Unauthorized/
  );
  assert.throws(
    () => createMigrationBatch('whatsapp_chat_export', 'Export_2026.txt', 'Raw Data', null),
    /Unauthorized/
  );

  // Positive test: staff session creates batch
  const batch = createMigrationBatch('whatsapp_chat_export', 'WhatsApp_Chat_Family_Inquiries.txt', 'Raw Data 123', nadeemSession);

  assert.ok(batch.id.startsWith('mig-batch-'));
  assert.ok(batch.batchCode.startsWith('MIG-WH-'));
  assert.equal(batch.sourceType, 'whatsapp_chat_export');
  assert.equal(batch.sourceReference, 'WhatsApp_Chat_Family_Inquiries.txt');
  assert.equal(batch.sourceChecksum.length, 64);
  assert.equal(batch.status, 'cataloged');
  assert.equal(batch.totalRecords, 0);
  assert.equal(batch.createdBy, 'nadeem@gulistan.pk');
});

test('MIG-02: parseWhatsAppChatExport extracts Pakistani biodata and preserves consent states', () => {
  const batch = createMigrationBatch('whatsapp_chat_export', 'ChatExport.txt', 'content', adminSession);

  const rawChat = `
[12/03/2026, 10:15:20] Matchmaker: Candidate Biodata Received
Name: Zainab Fatima
Age: 26
Gender: Female
Height: 5'4"
Marital Status: Never Married
Religion: Islam
Aqeedah: Sunni Barelvi
Caste: Arain
Education: Masters in Computer Science
Occupation: Software QA Lead
City: Lahore
Contact Phone: +92 301 9876543
Contact Person: Father (Muhammad Tariq)
Note: Family has granted full permission and consent to register.
---
[12/03/2026, 11:22:10] Matchmaker: Another Biodata
نام: بلال احمد
عمر: 30
جنس: مرد
قد: 5'10"
ازدواجی حیثیت: غیر شادی شدہ
مذہب: اسلام
مسلک: سنی دیوبندی
ذات: راجپوت
تعلیم: بی ایس الیکٹریکل انجینئرنگ
پیشہ: سینئر انجینئر
شہر: فیصل آباد
رابطہ نمبر: 0321-4567890
والد: حاجی احمد حسن
`;

  const staged = parseWhatsAppChatExport(rawChat, batch.id, adminSession);

  assert.equal(staged.length, 2);

  // Candidate 1: English format with explicit consent
  const c1 = staged[0];
  assert.equal(c1.parsedData.fullName, 'Zainab Fatima');
  assert.equal(c1.parsedData.age, 26);
  assert.equal(c1.parsedData.gender, 'female');
  assert.equal(c1.parsedData.height, '5\'4"');
  assert.equal(c1.parsedData.maritalStatus, 'never_married');
  assert.equal(c1.parsedData.religion, 'Islam');
  assert.equal(c1.parsedData.aqeedah, 'Sunni Barelvi');
  assert.equal(c1.parsedData.caste, 'Arain');
  assert.equal(c1.parsedData.education, 'Masters in Computer Science');
  assert.equal(c1.parsedData.currentCity, 'Lahore');
  assert.equal(c1.parsedData.contactPhone, '923019876543');
  assert.equal(c1.consentVerification.representativeConsentCertified, true);
  assert.equal(c1.status, 'staged');
  assert.equal(c1.quarantineReason, undefined);

  // Candidate 2: Urdu format without explicit consent
  const c2 = staged[1];
  assert.equal(c2.parsedData.fullName, 'بلال احمد');
  assert.equal(c2.parsedData.age, 30);
  assert.equal(c2.parsedData.gender, 'male');
  assert.equal(c2.parsedData.height, '5\'10"');
  assert.equal(c2.parsedData.religion, 'اسلام');
  assert.equal(c2.parsedData.aqeedah, 'سنی دیوبندی');
  assert.equal(c2.parsedData.caste, 'راجپوت');
  assert.equal(c2.parsedData.currentCity, 'فیصل آباد');
  assert.equal(c2.parsedData.contactPhone, '923214567890');
  assert.equal(c2.consentVerification.representativeConsentCertified, false);
  // Quarantined due to unverified consent
  assert.equal(c2.status, 'quarantined');
  assert.equal(c2.quarantineReason, 'CONSENT_UNVERIFIED');
});

test('MIG-02: parsePhoneGalleryMetadata validates photo constraints and consent', () => {
  const batch = createMigrationBatch('phone_gallery_archive', 'Archive_Nadeem_GalaxyS22', 'dummy', adminSession);

  const photos: GalleryPhotoEntry[] = [
    {
      fileName: 'IMG_20260301_001.jpg',
      fileSize: 2.5 * 1024 * 1024, // 2.5 MB (valid)
      mimeType: 'image/jpeg',
      candidateName: 'Kamran Ali',
      contactPhone: '0300 7654321',
      consentConfirmed: true,
    },
    {
      fileName: 'IMG_20260301_002_HEAVY.png',
      fileSize: 8 * 1024 * 1024, // 8 MB (> 5 MB limit)
      mimeType: 'image/png',
      candidateName: 'Sana Tariq',
      contactPhone: '0300 1122334',
      consentConfirmed: true,
    },
    {
      fileName: 'IMG_20260301_003.webp',
      fileSize: 1.2 * 1024 * 1024,
      mimeType: 'image/webp',
      candidateName: 'Hamza Sheikh',
      contactPhone: '0300 9988776',
      consentConfirmed: false, // Missing consent
    },
    {
      fileName: 'DOCUMENT.pdf',
      fileSize: 500 * 1024,
      mimeType: 'application/pdf', // Invalid MIME type
      candidateName: 'Rashid Khan',
      contactPhone: '0300 4455667',
      consentConfirmed: true,
    },
  ];

  const staged = parsePhoneGalleryMetadata(photos, batch.id, nadeemSession);

  assert.equal(staged.length, 4);

  // Photo 1: Valid
  assert.equal(staged[0].status, 'staged');
  assert.equal(staged[0].quarantineReason, undefined);
  assert.ok(staged[0].parsedData.photoUrl?.includes('IMG_20260301_001.jpg'));

  // Photo 2: Exceeds 5MB size limit
  assert.equal(staged[1].status, 'quarantined');
  assert.equal(staged[1].quarantineReason, 'DATA_VALIDATION_ERROR');

  // Photo 3: Missing consent
  assert.equal(staged[2].status, 'quarantined');
  assert.equal(staged[2].quarantineReason, 'CONSENT_UNVERIFIED');

  // Photo 4: Invalid MIME type
  assert.equal(staged[3].status, 'quarantined');
  assert.equal(staged[3].quarantineReason, 'DATA_VALIDATION_ERROR');
});

test('MIG-04: evaluateDeduplicationAndQuarantine flags existing and intra-batch duplicates with zero silent overwrite', async () => {
  const batch = createMigrationBatch('whatsapp_chat_export', 'Export_Dupe_Test.txt', 'content', adminSession);

  // Existing database candidate has phone: +92 300 1234567 (GLS-401 / GLS-001)
  const existingProfiles = await profileRepository.findAll(adminSession);
  const knownPhone = existingProfiles[0]?.contactPhone || '923001234567';

  const rawChat = `
Name: Duplicate Candidate A
Age: 28
Gender: Male
Contact Phone: ${knownPhone}
Consent: granted by family
---
Name: Unique Candidate B
Age: 24
Gender: Female
Contact Phone: +92 333 7778899
Consent: granted by family
---
Name: Intra Batch Dupe C
Age: 24
Gender: Female
Contact Phone: +92 333 7778899
Consent: granted by family
`;

  parseWhatsAppChatExport(rawChat, batch.id, adminSession);

  const evaluation = await evaluateDeduplicationAndQuarantine(batch.id, adminSession);

  // 1 database duplicate + 1 intra-batch duplicate = 2 quarantined, 1 staged
  assert.equal(evaluation.quarantinedCount, 2);
  assert.equal(evaluation.stagedCount, 1);

  // Verify that database duplicate preserved existing record and did not overwrite it
  const postCheckProfiles = await profileRepository.findAll(adminSession);
  assert.equal(postCheckProfiles.length, existingProfiles.length);
});

test('MIG-06: simulateMigrationDryRun calculates summary without altering database', async () => {
  const batch = createMigrationBatch('whatsapp_chat_export', 'DryRunTest.txt', 'content', adminSession);

  const rawChat = `
Name: Verified Candidate
Age: 27
Gender: Male
Contact Phone: +92 345 1112233
Consent: Family consent confirmed
---
Name: Tariq Unconfirmed
Age: 23
Gender: Female
Contact Phone: +92 345 4445566
`;

  parseWhatsAppChatExport(rawChat, batch.id, adminSession);

  const profilesBefore = (await profileRepository.findAll(adminSession)).length;

  const dryRun = simulateMigrationDryRun(batch.id, adminSession);

  assert.equal(dryRun.totalRows, 2);
  assert.equal(dryRun.validRows, 1);
  assert.equal(dryRun.quarantinedMissingConsent, 1);
  assert.equal(dryRun.requiresOwnerApproval, true);

  // Ensure zero modifications were made to database
  const profilesAfter = (await profileRepository.findAll(adminSession)).length;
  assert.equal(profilesAfter, profilesBefore);
});

test('MIG-05: resolveQuarantinedRecord supports human review and resolution actions', () => {
  const batch = createMigrationBatch('whatsapp_chat_export', 'ResolveTest.txt', 'content', adminSession);

  const rawChat = `
Name: Quarantined Candidate
Age: 25
Gender: Female
Contact Phone: +92 312 9998877
`;

  const staged = parseWhatsAppChatExport(rawChat, batch.id, adminSession);
  const rec = staged[0];
  assert.equal(rec.status, 'quarantined');

  // Human review: create_new override
  const resolved = resolveQuarantinedRecord(
    rec.id,
    'create_new',
    'Nadeem spoke with wali on phone; explicit consent granted and verified.',
    nadeemSession
  );

  assert.equal(resolved.status, 'approved');
  assert.equal(resolved.resolutionAction, 'create_new');
  assert.equal(resolved.resolvedBy, 'nadeem@gulistan.pk');
  assert.equal(resolved.resolutionNotes, 'Nadeem spoke with wali on phone; explicit consent granted and verified.');
});

test('MIG-07: executeBatchImport enforces owner approval gate and fails closed without it', async () => {
  const batch = createMigrationBatch('whatsapp_chat_export', 'ApprovalGateTest.txt', 'content', adminSession);

  const rawChat = `
Name: Import Candidate
Age: 28
Gender: Male
Contact Phone: +92 321 8887766
Consent: Confirmed by guardian
`;

  parseWhatsAppChatExport(rawChat, batch.id, adminSession);

  // Attempt import without owner approval -> MUST throw MIGRATION_BLOCKED
  await assert.rejects(
    async () => executeBatchImport(batch.id, adminSession),
    /MIGRATION_BLOCKED: No real customer data imported without explicit owner approval/
  );

  // Owner approval by non-admin is rejected
  assert.throws(
    () => approveMigrationBatchByOwner(batch.id, customerSession),
    /Unauthorized/
  );

  // Affirmative owner approval by admin
  const approvedBatch = approveMigrationBatchByOwner(batch.id, adminSession);
  assert.equal(approvedBatch.status, 'approved_by_owner');

  // Now import succeeds
  const result = await executeBatchImport(batch.id, adminSession);
  assert.equal(result.importedCount, 1);
  assert.equal(result.batch.status, 'imported');

  // Verify created profile has status: pending_review and source: whatsapp_migration
  const importedProfile = await profileRepository.findById(
    (result.batch as any).id ? (result.batch as any).id : 'whatever',
    adminSession
  );
  // Find the profile by contact phone
  const allProfiles = await profileRepository.findAll(adminSession);
  const found = allProfiles.find((p) => p.contactPhone === '923218887766');
  assert.ok(found);
  assert.equal(found.status, 'pending_review');
  assert.equal(found.source, 'whatsapp_migration');
});

test('MIG-08: reconcileMigrationBatch verifies mathematical row balance', async () => {
  const batch = createMigrationBatch('whatsapp_chat_export', 'ReconcileTest.txt', 'content', adminSession);

  const rawChat = `
Name: Candidate One
Age: 25
Gender: Female
Contact Phone: +92 311 1111111
Consent: Confirmed
---
Name: Candidate Two
Age: 29
Gender: Male
Contact Phone: +92 311 2222222
`;

  parseWhatsAppChatExport(rawChat, batch.id, adminSession);
  // Candidate 1 is staged, Candidate 2 is quarantined

  // Approve batch and import
  approveMigrationBatchByOwner(batch.id, adminSession);
  await executeBatchImport(batch.id, adminSession);

  // Reconcile
  const report = reconcileMigrationBatch(batch.id, adminSession);

  assert.equal(report.totalBatchRows, 2);
  assert.equal(report.importedCount, 1);
  assert.equal(report.quarantinedCount, 1);
  assert.equal(report.rejectedCount, 0);
  assert.equal(report.discrepancyCount, 0);
  assert.equal(report.isBalanced, true);
  assert.equal(report.checksumVerified, true);
});

test('MIG-08: rollbackMigrationBatch deactivates imported profiles with audit trail', async () => {
  const batch = createMigrationBatch('whatsapp_chat_export', 'RollbackTest.txt', 'content', adminSession);

  const rawChat = `
Name: Rollback Candidate
Age: 26
Gender: Female
Contact Phone: +92 315 5556677
Consent: Confirmed
`;

  parseWhatsAppChatExport(rawChat, batch.id, adminSession);
  approveMigrationBatchByOwner(batch.id, adminSession);
  await executeBatchImport(batch.id, adminSession);

  const allBefore = await profileRepository.findAll(adminSession);
  const candidate = allBefore.find((p) => p.contactPhone === '923155556677');
  assert.ok(candidate);
  assert.equal(candidate.status, 'pending_review');

  // Negative test: non-admin cannot rollback
  await assert.rejects(
    async () => rollbackMigrationBatch(batch.id, 'Invalid batch content', nadeemSession),
    /Unauthorized/
  );

  // Positive test: admin rolls back
  const rollbackResult = await rollbackMigrationBatch(batch.id, 'Discovered contaminated source export', adminSession);

  assert.equal(rollbackResult.rolledBackCount, 1);
  assert.equal(rollbackResult.batch.status, 'rolled_back');
  assert.equal(rollbackResult.batch.rollbackReason, 'Discovered contaminated source export');

  // Verify profile status changed to restricted
  const profileAfter = await profileRepository.findById(candidate.id, adminSession);
  assert.equal(profileAfter?.status, 'restricted');
});
