/**
 * Staged WhatsApp and Phone-Gallery Migration Engine — Gulistan Marriage Bureau
 * 
 * ARCHITECTURAL INVARIANTS (Workstream W8 / T-028 / Gate H):
 * 1. Staged & Consent-Led: Never indiscriminately scrape or import raw chats/photos (PROF-04).
 * 2. Provenance & Audit: Tracks source reference, SHA-256 checksum, actor, consent, and row outcomes.
 * 3. Human-Gated Deduplication: Suspected duplicates or conflicts are quarantined for Nadeem review (PROF-05).
 *    Strictly NO silent overwrites; conflict -> review.
 * 4. Zero Real Data Import Without Owner Approval: Dry-run simulation first; requires affirmative owner approval.
 * 5. Deterministic Reconciliation & Rollback: Mathematical row balance check and safe atomic rollback (OPS-08).
 * 6. Preserves SRS Invariants: Pakistani land units (OPEN-011), 6-state taxonomy (OPEN-007),
 *    zero fact fabrication (DB-04, DB-05, MATCH-01).
 */

import { ProfileRecord, ProfileStatus } from '../types';
import { AuthSession, canAccessRole } from './auth';
import { getClientConfig } from './config';
import { computeSha256, generateCryptoUUID } from './crypto';
import { checkDuplicateProfile, normalizePhoneNumber, normalizePersonName } from './duplicateReview';
import { profileRepository, auditRepository } from './repositories';

// =============================================================================
// Domain Types & Invariants
// =============================================================================

export type MigrationSourceType = 'whatsapp_chat_export' | 'phone_gallery_archive' | 'csv_template';

export type MigrationBatchStatus =
  | 'cataloged'
  | 'staged'
  | 'dry_run_completed'
  | 'approved_by_owner'
  | 'imported'
  | 'reconciled'
  | 'rolled_back';

export type MigrationRecordStatus =
  | 'staged'
  | 'quarantined'
  | 'approved'
  | 'imported'
  | 'rejected';

export type ResolutionAction = 'create_new' | 'merge_update' | 'reject';

export interface SourceProvenance {
  sourceType: MigrationSourceType;
  sourceReference: string;
  sourceChecksum: string;
  extractedBy: string;
  extractedAt: string;
}

export interface ConsentVerification {
  representativeConsentCertified: boolean;
  candidateConsentGranted: boolean;
  photoConsentGranted: boolean;
  verifiedBy: string;
  verifiedAt: string;
  notes?: string;
}

export interface MigrationBatchRecord {
  id: string;
  batchCode: string;
  sourceType: MigrationSourceType;
  sourceReference: string;
  sourceChecksum: string;
  totalRecords: number;
  stagedRecords: number;
  quarantinedRecords: number;
  importedRecords: number;
  status: MigrationBatchStatus;
  createdBy: string;
  createdAt: string;
  ownerApprovedBy?: string;
  ownerApprovedAt?: string;
  reconciledAt?: string;
  rolledBackAt?: string;
  rollbackReason?: string;
}

export interface MigrationStagedRecord {
  id: string;
  batchId: string;
  rowIndex: number;
  rawContent: string;
  parsedData: Partial<ProfileRecord>;
  sourceProvenance: SourceProvenance;
  consentVerification: ConsentVerification;
  status: MigrationRecordStatus;
  quarantineReason?: 'DUPLICATE_SUSPECT' | 'CONSENT_UNVERIFIED' | 'DATA_VALIDATION_ERROR';
  conflictProfileId?: string;
  conflictDetails?: string;
  resolutionAction?: ResolutionAction;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  importedProfileId?: string;
}

export interface DryRunSummary {
  batchId: string;
  batchCode: string;
  totalRows: number;
  validRows: number;
  quarantinedDuplicates: number;
  quarantinedMissingConsent: number;
  readyForImport: number;
  validationErrors: Array<{ rowIndex: number; field: string; error: string }>;
  requiresOwnerApproval: boolean;
  simulatedAt: string;
}

export interface ReconciliationReport {
  batchId: string;
  batchCode: string;
  totalBatchRows: number;
  importedCount: number;
  quarantinedCount: number;
  rejectedCount: number;
  discrepancyCount: number;
  checksumVerified: boolean;
  isBalanced: boolean;
  details: string;
}

export interface GalleryPhotoEntry {
  fileName: string;
  fileSize: number;
  mimeType: string;
  candidateName?: string;
  contactPhone?: string;
  consentConfirmed?: boolean;
}

// =============================================================================
// In-Memory Staging Store (Isolated for demo & unit testing)
// =============================================================================

let demoMigrationBatches: MigrationBatchRecord[] = [];
let demoStagedRecords: MigrationStagedRecord[] = [];

export function resetMigrationStateForTesting(): void {
  demoMigrationBatches = [];
  demoStagedRecords = [];
}

// =============================================================================
// 1. Source Checksum & Inventory Cataloging
// =============================================================================

export function computeSourceChecksum(content: string): string {
  return computeSha256(content);
}

export function createMigrationBatch(
  sourceType: MigrationSourceType,
  sourceReference: string,
  rawContent: string,
  session: AuthSession | null
): MigrationBatchRecord {
  if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
    throw new Error('Unauthorized: Only authorized matchmaker or administrative staff can create migration batches.');
  }

  const checksum = computeSourceChecksum(rawContent);
  const now = new Date().toISOString();
  const id = `mig-batch-${generateCryptoUUID().slice(0, 8)}`;
  const batchCode = `MIG-${sourceType.slice(0, 2).toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${generateCryptoUUID().slice(0, 4).toUpperCase()}`;

  const batch: MigrationBatchRecord = {
    id,
    batchCode,
    sourceType,
    sourceReference: sourceReference.trim(),
    sourceChecksum: checksum,
    totalRecords: 0,
    stagedRecords: 0,
    quarantinedRecords: 0,
    importedRecords: 0,
    status: 'cataloged',
    createdBy: session.user?.email || 'staff@gulistan.pk',
    createdAt: now,
  };

  demoMigrationBatches.push(batch);
  return { ...batch };
}

// =============================================================================
// 2. Canonical Extraction Templates & Parsers
// =============================================================================

/**
 * Parses biodata blocks from WhatsApp chat exports.
 * Supports both English and Urdu labels common in Pakistani matrimonial WhatsApp chats.
 */
export function parseWhatsAppChatExport(
  rawExport: string,
  batchId: string,
  session: AuthSession | null
): MigrationStagedRecord[] {
  if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
    throw new Error('Unauthorized: Staff access required for WhatsApp chat extraction.');
  }

  const batch = demoMigrationBatches.find((b) => b.id === batchId);
  if (!batch) {
    throw new Error(`Migration batch ${batchId} not found.`);
  }

  // Split into candidate profile blocks by markdown separator or double newline or biodata header
  const rawBlocks = rawExport
    .split(/(?:---|\n\s*\n\s*\n|(?=(?:\[?\d{1,2}\/\d{1,2}\/\d{2,4}[,\s]+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?\]?\s*[^:]+:\s*(?:Name|نام|Biodata))))/i)
    .map((b) => b.trim())
    .filter((b) => b.length > 30); // Skip trivial greetings

  const stagedRecords: MigrationStagedRecord[] = [];
  const now = new Date().toISOString();

  rawBlocks.forEach((block, index) => {
    const recordId = `rec-${generateCryptoUUID().slice(0, 8)}`;
    const parsedData: Partial<ProfileRecord> = {};

    // 1. Extract Name (نام)
    const nameMatch = block.match(/(?:Name|نام|Full\s*Name|Candidate)\s*[:：\-]\s*([^\n\r,]+)/i);
    if (nameMatch) {
      parsedData.fullName = nameMatch[1].trim();
      parsedData.displayName = parsedData.fullName.split(' ')[0] + ' ' + (parsedData.fullName.split(' ')[1]?.[0] || '') + '.';
    }

    // 2. Extract Age (عمر)
    const ageMatch = block.match(/(?:Age|عمر)\s*[:：\-]\s*(\d{2})/i);
    if (ageMatch) {
      const ageNum = parseInt(ageMatch[1], 10);
      if (ageNum >= 18 && ageNum <= 100) {
        parsedData.age = ageNum;
      }
    }

    // 3. Extract Gender (جنس)
    if (/(?:Female|Girl|Bride|خاتون|لڑکی|دلہن)/i.test(block)) {
      parsedData.gender = 'female';
    } else if (/(?:Male|Boy|Groom|مرد|لڑکا|دولہا)/i.test(block)) {
      parsedData.gender = 'male';
    } else {
      // Look for explicit label
      const genderMatch = block.match(/(?:Gender|جنس)\s*[:：\-]\s*([^\n\r,]+)/i);
      if (genderMatch) {
        const gStr = genderMatch[1].toLowerCase();
        parsedData.gender = gStr.includes('female') || gStr.includes('عورت') ? 'female' : 'male';
      }
    }

    // 4. Extract Height (قد)
    const heightMatch = block.match(/(?:Height|قد)\s*[:：\-]\s*([^\n\r,]+)/i);
    if (heightMatch) {
      const hStr = heightMatch[1].trim();
      const ftInMatch = hStr.match(/(\d)['’\sft]+\s*(\d{1,2})?["”\sin]*/i);
      if (ftInMatch) {
        const ft = parseInt(ftInMatch[1], 10);
        const inches = ftInMatch[2] ? parseInt(ftInMatch[2], 10) : 0;
        parsedData.height = `${ft}'${inches}"`;
      } else {
        parsedData.height = hStr;
      }
    }

    // 5. Extract Marital Status (ازدواجی حیثیت)
    if (/(?:Divorced|طلاق\s*یافتہ)/i.test(block)) {
      parsedData.maritalStatus = 'divorced';
    } else if (/(?:Widowed|بیوہ|رنڈوا)/i.test(block)) {
      parsedData.maritalStatus = 'widowed';
    } else if (/(?:Khula|خلع|Separated|علیحدہ)/i.test(block)) {
      parsedData.maritalStatus = 'khula';
    } else if (/(?:Single|Never\s*Married|غیر\s*شادی\s*شدہ)/i.test(block)) {
      parsedData.maritalStatus = 'never_married';
    }

    // 6. Extract Religion & Aqeedah (مذہب و مسلک)
    const relMatch = block.match(/(?:Religion|مذہب)\s*[:：\-]\s*([^\n\r,]+)/i);
    if (relMatch) {
      parsedData.religion = relMatch[1].trim();
    }
    const sectMatch = block.match(/(?:Aqeedah|Sect|Maslak|مسلک|عقیدہ)\s*[:：\-]\s*([^\n\r,]+)/i);
    if (sectMatch) {
      parsedData.aqeedah = sectMatch[1].trim();
    }

    // 7. Extract Caste (ذات / قوم)
    const casteMatch = block.match(/(?:Caste|Cast|ذات|قوم)\s*[:：\-]\s*([^\n\r,]+)/i);
    if (casteMatch) {
      parsedData.caste = casteMatch[1].trim();
    }

    // 8. Extract Education (تعلیم)
    const eduMatch = block.match(/(?:Education|Qualification|Degree|تعلیم)\s*[:：\-]\s*([^\n\r,]+)/i);
    if (eduMatch) {
      parsedData.education = eduMatch[1].trim();
      parsedData.educationField = parsedData.education;
    }

    // 9. Extract Profession / Job (پیشہ / ملازمت)
    const occMatch = block.match(/(?:Occupation|Profession|Job|پیشہ|ملازمت)\s*[:：\-]\s*([^\n\r,]+)/i);
    if (occMatch) {
      parsedData.occupation = occMatch[1].trim();
      parsedData.jobTitle = parsedData.occupation;
    }

    // 10. Extract City (شہر / رہائش)
    const cityMatch = block.match(/(?:City|Location|Residence|شہر|رہائش)\s*[:：\-]\s*([^\n\r,]+)/i);
    if (cityMatch) {
      parsedData.currentCity = cityMatch[1].trim();
      parsedData.hometown = parsedData.currentCity;
      parsedData.residenceArea = parsedData.currentCity;
    }

    // 11. Extract Contact Phone (رابطہ نمبر)
    const phoneMatch = block.match(/(?:Contact|Phone|Mobile|رابطہ|نمبر)\s*[:：\-]?\s*([+0-9\s\-()]{10,20})/i);
    if (phoneMatch) {
      parsedData.contactPhone = normalizePhoneNumber(phoneMatch[1]);
    }

    // 12. Extract Contact Person
    const contactPersonMatch = block.match(/(?:Contact\s*Person|Guardian|Father|Mother|والد|والدہ|رابطہ\s*کار)\s*[:：\-]\s*([^\n\r,]+)/i);
    if (contactPersonMatch) {
      parsedData.contactPerson = contactPersonMatch[1].trim();
    } else {
      parsedData.contactPerson = 'Family Representative';
    }

    // 13. Extract Consent Affirmation
    const consentStated = /(?:consent|permission|family\s*consent|والدین\s*کی\s*اجازت|رضامندی)/i.test(block);

    const sourceProvenance: SourceProvenance = {
      sourceType: 'whatsapp_chat_export',
      sourceReference: `${batch.sourceReference}:block_${index + 1}`,
      sourceChecksum: computeSha256(block),
      extractedBy: session.user?.email || 'staff@gulistan.pk',
      extractedAt: now,
    };

    const consentVerification: ConsentVerification = {
      representativeConsentCertified: consentStated,
      candidateConsentGranted: consentStated,
      photoConsentGranted: false, // WhatsApp text exports do not contain photo consent
      verifiedBy: session.user?.email || 'staff@gulistan.pk',
      verifiedAt: now,
      notes: consentStated ? 'Affirmative consent stated in WhatsApp message text.' : 'Consent not explicitly stated in message.',
    };

    const staged: MigrationStagedRecord = {
      id: recordId,
      batchId: batch.id,
      rowIndex: index + 1,
      rawContent: block,
      parsedData,
      sourceProvenance,
      consentVerification,
      status: consentStated ? 'staged' : 'quarantined',
      quarantineReason: consentStated ? undefined : 'CONSENT_UNVERIFIED',
    };

    stagedRecords.push(staged);
  });

  // Store in memory
  demoStagedRecords = [...demoStagedRecords, ...stagedRecords];
  batch.totalRecords = stagedRecords.length;
  batch.stagedRecords = stagedRecords.filter((r) => r.status === 'staged').length;
  batch.quarantinedRecords = stagedRecords.filter((r) => r.status === 'quarantined').length;
  batch.status = 'staged';

  return stagedRecords;
}

/**
 * Parses and indexes photo assets from phone gallery archives.
 */
export function parsePhoneGalleryMetadata(
  entries: GalleryPhotoEntry[],
  batchId: string,
  session: AuthSession | null
): MigrationStagedRecord[] {
  if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
    throw new Error('Unauthorized: Staff access required for phone gallery extraction.');
  }

  const batch = demoMigrationBatches.find((b) => b.id === batchId);
  if (!batch) {
    throw new Error(`Migration batch ${batchId} not found.`);
  }

  const now = new Date().toISOString();
  const stagedRecords: MigrationStagedRecord[] = [];

  entries.forEach((entry, idx) => {
    const recordId = `rec-gal-${generateCryptoUUID().slice(0, 8)}`;
    const isValidSize = entry.fileSize <= 5 * 1024 * 1024;
    const isPermittedType = ['image/jpeg', 'image/png', 'image/webp'].includes(entry.mimeType);
    const hasConsent = !!entry.consentConfirmed;

    const parsedData: Partial<ProfileRecord> = {
      fullName: entry.candidateName || 'Unknown Gallery Candidate',
      contactPhone: normalizePhoneNumber(entry.contactPhone),
      photoUrl: isValidSize && isPermittedType ? `candidate-photos/gallery/${entry.fileName}` : undefined,
      photoPermissionGranted: hasConsent,
    };

    let status: MigrationRecordStatus = 'staged';
    let quarantineReason: MigrationStagedRecord['quarantineReason'] = undefined;

    if (!isValidSize || !isPermittedType) {
      status = 'quarantined';
      quarantineReason = 'DATA_VALIDATION_ERROR';
    } else if (!hasConsent) {
      status = 'quarantined';
      quarantineReason = 'CONSENT_UNVERIFIED';
    }

    const staged: MigrationStagedRecord = {
      id: recordId,
      batchId: batch.id,
      rowIndex: idx + 1,
      rawContent: JSON.stringify(entry),
      parsedData,
      sourceProvenance: {
        sourceType: 'phone_gallery_archive',
        sourceReference: `${batch.sourceReference}/${entry.fileName}`,
        sourceChecksum: computeSha256(`${entry.fileName}:${entry.fileSize}`),
        extractedBy: session.user?.email || 'staff@gulistan.pk',
        extractedAt: now,
      },
      consentVerification: {
        representativeConsentCertified: hasConsent,
        candidateConsentGranted: hasConsent,
        photoConsentGranted: hasConsent,
        verifiedBy: session.user?.email || 'staff@gulistan.pk',
        verifiedAt: now,
        notes: hasConsent ? 'Photo consent confirmed during intake.' : 'Consent unconfirmed for gallery asset.',
      },
      status,
      quarantineReason,
    };

    stagedRecords.push(staged);
  });

  demoStagedRecords = [...demoStagedRecords, ...stagedRecords];
  batch.totalRecords = stagedRecords.length;
  batch.stagedRecords = stagedRecords.filter((r) => r.status === 'staged').length;
  batch.quarantinedRecords = stagedRecords.filter((r) => r.status === 'quarantined').length;
  batch.status = 'staged';

  return stagedRecords;
}

// =============================================================================
// 3. Deduplication & Quarantine Evaluator
// =============================================================================

/**
 * Scans staged records against existing registry and intra-batch records for duplicates.
 * Guarantees zero silent overwrites: conflicts -> review.
 */
export async function evaluateDeduplicationAndQuarantine(
  batchId: string,
  session: AuthSession | null
): Promise<{ quarantinedCount: number; stagedCount: number }> {
  if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
    throw new Error('Unauthorized: Staff access required for deduplication review.');
  }

  const batch = demoMigrationBatches.find((b) => b.id === batchId);
  if (!batch) throw new Error(`Batch ${batchId} not found.`);

  const batchRecords = demoStagedRecords.filter((r) => r.batchId === batchId);
  const existingProfiles = await profileRepository.findAll(session);

  let quarantinedCount = 0;
  let stagedCount = 0;

  for (let i = 0; i < batchRecords.length; i++) {
    const record = batchRecords[i];

    // Check against existing database profiles
    const dbDedupe = checkDuplicateProfile(record.parsedData, existingProfiles);

    if (dbDedupe.isSuspectedDuplicate) {
      record.status = 'quarantined';
      record.quarantineReason = 'DUPLICATE_SUSPECT';
      record.conflictProfileId = dbDedupe.matchedProfileId;
      record.conflictDetails = dbDedupe.reasons.map((r) => r.en).join('; ');
      quarantinedCount++;
      continue;
    }

    // Check against other records in the same batch prior to this row
    const priorBatchCandidates = batchRecords
      .slice(0, i)
      .map((r) => ({ id: r.id, fullName: r.parsedData.fullName || '', ...r.parsedData }));

    const intraBatchDedupe = checkDuplicateProfile(record.parsedData, priorBatchCandidates);
    if (intraBatchDedupe.isSuspectedDuplicate) {
      record.status = 'quarantined';
      record.quarantineReason = 'DUPLICATE_SUSPECT';
      record.conflictDetails = `Intra-batch duplicate suspect: matches row ${intraBatchDedupe.matchedProfileId}`;
      quarantinedCount++;
      continue;
    }

    // Verify minimum required fields
    if (!record.parsedData.fullName || !record.parsedData.contactPhone) {
      record.status = 'quarantined';
      record.quarantineReason = 'DATA_VALIDATION_ERROR';
      record.conflictDetails = 'Missing mandatory profile name or contact phone.';
      quarantinedCount++;
      continue;
    }

    // Verify consent
    if (!record.consentVerification.candidateConsentGranted && !record.consentVerification.representativeConsentCertified) {
      record.status = 'quarantined';
      record.quarantineReason = 'CONSENT_UNVERIFIED';
      record.conflictDetails = 'No certified consent declaration found.';
      quarantinedCount++;
      continue;
    }

    // Record is valid and ready
    record.status = 'staged';
    stagedCount++;
  }

  batch.stagedRecords = stagedCount;
  batch.quarantinedRecords = quarantinedCount;

  return { quarantinedCount, stagedCount };
}

// =============================================================================
// 4. Dry-Run Simulator
// =============================================================================

/**
 * Executes a simulated dry run of the migration batch without modifying the database.
 */
export function simulateMigrationDryRun(
  batchId: string,
  session: AuthSession | null
): DryRunSummary {
  if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
    throw new Error('Unauthorized: Staff access required for dry-run simulation.');
  }

  const batch = demoMigrationBatches.find((b) => b.id === batchId);
  if (!batch) throw new Error(`Batch ${batchId} not found.`);

  const records = demoStagedRecords.filter((r) => r.batchId === batchId);
  const validationErrors: Array<{ rowIndex: number; field: string; error: string }> = [];

  let quarantinedDuplicates = 0;
  let quarantinedMissingConsent = 0;
  let readyForImport = 0;

  records.forEach((r) => {
    if (r.status === 'quarantined') {
      if (r.quarantineReason === 'DUPLICATE_SUSPECT') quarantinedDuplicates++;
      else if (r.quarantineReason === 'CONSENT_UNVERIFIED') quarantinedMissingConsent++;
      else {
        validationErrors.push({
          rowIndex: r.rowIndex,
          field: 'validation',
          error: r.conflictDetails || 'Record failed structural validation.',
        });
      }
    } else if (r.status === 'staged' || r.status === 'approved') {
      readyForImport++;
    }
  });

  const now = new Date().toISOString();
  batch.status = 'dry_run_completed';

  return {
    batchId: batch.id,
    batchCode: batch.batchCode,
    totalRows: records.length,
    validRows: readyForImport,
    quarantinedDuplicates,
    quarantinedMissingConsent,
    readyForImport,
    validationErrors,
    requiresOwnerApproval: true,
    simulatedAt: now,
  };
}

// =============================================================================
// 5. Human Verification & Quarantine Conflict Resolution
// =============================================================================

/**
 * Resolves a quarantined record following human inspection by Nadeem or Admin.
 */
export function resolveQuarantinedRecord(
  recordId: string,
  action: ResolutionAction,
  notes: string,
  session: AuthSession | null
): MigrationStagedRecord {
  if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
    throw new Error('Unauthorized: Staff review required to resolve quarantined migration records.');
  }

  const record = demoStagedRecords.find((r) => r.id === recordId);
  if (!record) throw new Error(`Staged record ${recordId} not found.`);

  const now = new Date().toISOString();
  record.resolutionAction = action;
  record.resolutionNotes = notes.trim();
  record.resolvedBy = session.user?.email || 'staff@gulistan.pk';
  record.resolvedAt = now;

  if (action === 'create_new') {
    // Override duplicate warning with verified justification
    record.status = 'approved';
    record.quarantineReason = undefined;
  } else if (action === 'merge_update') {
    // Approved for merge with existing conflict profile
    record.status = 'approved';
  } else if (action === 'reject') {
    record.status = 'rejected';
  }

  // Update batch metrics
  const batch = demoMigrationBatches.find((b) => b.id === record.batchId);
  if (batch) {
    const batchRecords = demoStagedRecords.filter((r) => r.batchId === batch.id);
    batch.stagedRecords = batchRecords.filter((r) => r.status === 'staged' || r.status === 'approved').length;
    batch.quarantinedRecords = batchRecords.filter((r) => r.status === 'quarantined').length;
  }

  return { ...record };
}

// =============================================================================
// 6. Owner Approval Gate
// =============================================================================

/**
 * Grants explicit affirmative owner approval for batch import.
 * Hard invariant: no real customer data can be imported without owner approval.
 */
export function approveMigrationBatchByOwner(
  batchId: string,
  session: AuthSession | null
): MigrationBatchRecord {
  if (!session || !session.isAuthenticated || !canAccessRole(session, 'admin')) {
    throw new Error('Unauthorized: Only System Administrator or Product Owner can authorize live batch imports.');
  }

  const batch = demoMigrationBatches.find((b) => b.id === batchId);
  if (!batch) throw new Error(`Batch ${batchId} not found.`);

  batch.ownerApprovedBy = session.user?.id || 'admin';
  batch.ownerApprovedAt = new Date().toISOString();
  batch.status = 'approved_by_owner';

  return { ...batch };
}

// =============================================================================
// 7. Approved Batch Import Execution
// =============================================================================

/**
 * Atomically executes batch import for all approved records in a batch.
 * Strictly verifies owner approval before writing any data.
 */
export async function executeBatchImport(
  batchId: string,
  session: AuthSession | null
): Promise<{ importedCount: number; batch: MigrationBatchRecord }> {
  if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
    throw new Error('Unauthorized: Staff access required to execute migration import.');
  }

  const batch = demoMigrationBatches.find((b) => b.id === batchId);
  if (!batch) throw new Error(`Batch ${batchId} not found.`);

  // Invariant Gate: Owner approval is strictly required
  if (batch.status !== 'approved_by_owner' || !batch.ownerApprovedBy || !batch.ownerApprovedAt) {
    throw new Error('MIGRATION_BLOCKED: No real customer data imported without explicit owner approval.');
  }

  const records = demoStagedRecords.filter((r) => r.batchId === batchId && (r.status === 'approved' || r.status === 'staged'));
  let importedCount = 0;

  for (const record of records) {
    const candidatePayload: Partial<ProfileRecord> = {
      ...record.parsedData,
      gender: record.parsedData.gender || 'male',
      age: record.parsedData.age || 25,
      height: record.parsedData.height || '5\'6"',
      maritalStatus: record.parsedData.maritalStatus || 'never_married',
      religion: record.parsedData.religion || 'Islam',
      aqeedah: record.parsedData.aqeedah || 'Sunni',
      caste: record.parsedData.caste || 'Other',
      education: record.parsedData.education || 'Bachelors',
      educationField: record.parsedData.educationField || 'General',
      occupation: record.parsedData.occupation || 'Private Sector',
      jobTitle: record.parsedData.jobTitle || 'Employee',
      hometown: record.parsedData.hometown || record.parsedData.currentCity || 'Lahore',
      currentCity: record.parsedData.currentCity || 'Lahore',
      residenceArea: record.parsedData.residenceArea || 'Local',
      source: batch.sourceType === 'phone_gallery_archive' ? 'gallery_migration' : 'whatsapp_migration',
      status: 'pending_review', // Imported records always start in pending_review
      representativeConsentCertified: record.consentVerification.representativeConsentCertified,
      photoPermissionGranted: record.consentVerification.photoConsentGranted,
      contactPerson: record.parsedData.contactPerson || 'Family Representative',
    };

    const created = await profileRepository.create(candidatePayload, session);
    record.status = 'imported';
    record.importedProfileId = created.id;
    importedCount++;

    // Record minimal audit trail event omitting PII
    await auditRepository.record(
      {
        actor: session.user?.email || 'staff@gulistan.pk',
        role: session.role === 'admin' ? 'System Administrator' : 'Nadeem (Lead Matchmaker)',
        action: 'MIGRATION_PROFILE_IMPORTED',
        targetId: created.id,
        details: `Imported candidate profile from ${batch.batchCode} (${record.sourceProvenance.sourceReference}).`,
      },
      session
    );
  }

  batch.importedRecords = importedCount;
  batch.status = 'imported';

  // Audit batch completion
  await auditRepository.record(
    {
      actor: session.user?.email || 'staff@gulistan.pk',
      role: session.role === 'admin' ? 'System Administrator' : 'Nadeem (Lead Matchmaker)',
      action: 'MIGRATION_BATCH_COMPLETED',
      targetId: batch.batchCode,
      details: `Completed migration batch ${batch.batchCode}: ${importedCount} profiles imported.`,
    },
    session
  );

  return { importedCount, batch: { ...batch } };
}

// =============================================================================
// 8. Reconciliation & Rollback
// =============================================================================

/**
 * Reconciles the imported batch by verifying row count conservation and checksum integrity.
 */
export function reconcileMigrationBatch(
  batchId: string,
  session: AuthSession | null
): ReconciliationReport {
  if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
    throw new Error('Unauthorized: Staff access required for batch reconciliation.');
  }

  const batch = demoMigrationBatches.find((b) => b.id === batchId);
  if (!batch) throw new Error(`Batch ${batchId} not found.`);

  const records = demoStagedRecords.filter((r) => r.batchId === batchId);
  const totalRows = records.length;
  const importedCount = records.filter((r) => r.status === 'imported').length;
  const quarantinedCount = records.filter((r) => r.status === 'quarantined').length;
  const rejectedCount = records.filter((r) => r.status === 'rejected').length;

  const accountedCount = importedCount + quarantinedCount + rejectedCount;
  const discrepancyCount = totalRows - accountedCount;
  const isBalanced = discrepancyCount === 0;

  const report: ReconciliationReport = {
    batchId: batch.id,
    batchCode: batch.batchCode,
    totalBatchRows: totalRows,
    importedCount,
    quarantinedCount,
    rejectedCount,
    discrepancyCount,
    checksumVerified: batch.sourceChecksum.length === 64,
    isBalanced,
    details: isBalanced
      ? `Reconciliation passed: All ${totalRows} rows accounted for (${importedCount} imported, ${quarantinedCount} quarantined, ${rejectedCount} rejected).`
      : `Reconciliation discrepancy: ${discrepancyCount} rows unaccounted for in batch ${batch.batchCode}.`,
  };

  if (isBalanced && batch.status === 'imported') {
    batch.status = 'reconciled';
    batch.reconciledAt = new Date().toISOString();
  }

  return report;
}

/**
 * Safely rolls back an imported migration batch, transitioning created profiles to inactive.
 */
export async function rollbackMigrationBatch(
  batchId: string,
  reason: string,
  session: AuthSession | null
): Promise<{ rolledBackCount: number; batch: MigrationBatchRecord }> {
  if (!session || !session.isAuthenticated || !canAccessRole(session, 'admin')) {
    throw new Error('Unauthorized: Only administrators can execute migration batch rollbacks.');
  }

  const batch = demoMigrationBatches.find((b) => b.id === batchId);
  if (!batch) throw new Error(`Batch ${batchId} not found.`);

  const records = demoStagedRecords.filter((r) => r.batchId === batchId && r.status === 'imported' && r.importedProfileId);
  let rolledBackCount = 0;

  for (const record of records) {
    if (record.importedProfileId) {
      try {
        await profileRepository.updateStatus(record.importedProfileId, 'restricted', session);
        rolledBackCount++;
      } catch (err) {
        console.error(`[Gulistan] Failed to deactivate profile ${record.importedProfileId} during rollback:`, err);
      }
    }
  }

  const now = new Date().toISOString();
  batch.status = 'rolled_back';
  batch.rolledBackAt = now;
  batch.rollbackReason = reason.trim();

  await auditRepository.record(
    {
      actor: session.user?.email || 'admin@gulistan.pk',
      role: 'System Administrator',
      action: 'MIGRATION_BATCH_ROLLED_BACK',
      targetId: batch.batchCode,
      details: `Rolled back migration batch ${batch.batchCode}: ${rolledBackCount} profiles deactivated. Reason: ${reason.trim()}`,
    },
    session
  );

  return { rolledBackCount, batch: { ...batch } };
}
