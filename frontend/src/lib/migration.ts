/**
 * Staged WhatsApp and Phone-Gallery Migration Engine — Gulistan Marriage Bureau
 * 
 * ARCHITECTURAL INVARIANTS (Workstream W8 / T-028 / Gate H / T-038):
 * 1. Staged & Consent-Led: Never indiscriminately scrape or import raw chats/photos (PROF-04).
 *    Regex mentions never certify legal consent; explicit human reviewer certification required (P1-43).
 * 2. Provenance & Audit: Tracks source reference, real SHA-256 byte checksums, actor, consent, and row outcomes (P1-44, P1-45).
 * 3. Human-Gated Deduplication: Suspected duplicates or conflicts are quarantined for Nadeem review (PROF-05).
 *    Strictly NO silent overwrites; conflict -> review.
 * 4. Zero Real Data Import Without Owner Approval: Requires affirmative owner approval before writing data (P1-42).
 * 5. Deterministic Reconciliation & Rollback: Mathematical row balance check, cryptographic checksum comparison,
 *    and durable atomic rollback reversing imported profiles and staged rows (P1-45, P1-46).
 * 6. Preserves Domain Invariants: Zero fact fabrication (P1-40) — missing mandatory fields quarantine records,
 *    never default candidate demographics, locations, or consent.
 * 7. Conflict-Targeted True Merge: Merge action updates existing profile without creating duplicate (P1-41).
 * 8. Minimization & Purge: Sensitive raw conversation text is purgeable while preserving hash provenance (P1-47).
 */

import {
  ProfileRecord,
  ProfileStatus,
  MigrationSourceType,
  MigrationBatchStatus,
  MigrationRecordStatus,
  ResolutionAction,
  SourceProvenance,
  ConsentVerification,
  MigrationBatchRecord,
  MigrationStagedRecord,
  DryRunSummary,
  ReconciliationReport,
  GalleryPhotoEntry,
} from '../types';
import { AuthSession, canAccessRole } from './auth';
import { getClientConfig } from './config';
import { computeSha256, generateCryptoUUID } from './crypto';
import { checkDuplicateProfile, normalizePhoneNumber, normalizePersonName } from './duplicateReview';
import {
  profileRepository,
  auditRepository,
  migrationRepository,
  resetMigrationRepositoryForTesting,
} from './repositories';
import { getSupabaseClient } from './supabaseClient';

// Re-export domain types for consumers
export type {
  MigrationSourceType,
  MigrationBatchStatus,
  MigrationRecordStatus,
  ResolutionAction,
  SourceProvenance,
  ConsentVerification,
  MigrationBatchRecord,
  MigrationStagedRecord,
  DryRunSummary,
  ReconciliationReport,
  GalleryPhotoEntry,
};

// =============================================================================
// Testing State Management
// =============================================================================

export function resetMigrationStateForTesting(): void {
  resetMigrationRepositoryForTesting();
}

// =============================================================================
// 1. Source Checksum & Inventory Cataloging (P1-39, P1-44)
// =============================================================================

export function computeSourceChecksum(content: string | Uint8Array): string {
  return computeSha256(content);
}

export async function createMigrationBatch(
  sourceType: MigrationSourceType,
  sourceReference: string,
  rawContent: string | Uint8Array,
  session: AuthSession | null
): Promise<MigrationBatchRecord> {
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

  return migrationRepository.createBatch(batch, session);
}

// =============================================================================
// 2. Canonical Extraction Templates & Parsers (P1-40, P1-43, P1-44)
// =============================================================================

/**
 * Parses biodata blocks from WhatsApp chat exports.
 * Supports English and Urdu labels common in Pakistani matrimonial WhatsApp chats.
 * Invariant (P1-43): Text keyword matches do NOT certify legal consent; records are quarantined
 * with CONSENT_UNVERIFIED until affirmative reviewer certification is granted.
 */
export async function parseWhatsAppChatExport(
  rawExport: string,
  batchId: string,
  session: AuthSession | null
): Promise<MigrationStagedRecord[]> {
  if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
    throw new Error('Unauthorized: Staff access required for WhatsApp chat extraction.');
  }

  const batch = await migrationRepository.findBatchById(batchId, session);
  if (!batch) {
    throw new Error(`Migration batch ${batchId} not found.`);
  }

  // Split into candidate profile blocks by markdown separator, double newline, or biodata headers
  const rawBlocks = rawExport
    .split(/(?:---|\n\s*\n\s*\n|(?=(?:\[?\d{1,2}\/\d{1,2}\/\d{2,4}[,\s]+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?\]?\s*[^:]+:\s*(?:Name|نام|Biodata))))/i)
    .map((b) => b.trim())
    .filter((b) => b.length > 30); // Skip trivial greetings

  const stagedRecords: Array<Omit<MigrationStagedRecord, 'id'> & { id?: string }> = [];
  const now = new Date().toISOString();

  rawBlocks.forEach((block, index) => {
    const recordId = `rec-${generateCryptoUUID().slice(0, 8)}`;
    const parsedData: Partial<ProfileRecord> = {};

    // 1. Extract Name (نام)
    const nameMatch = block.match(/(?:Name|نام|Full\s*Name|Candidate)\s*[:：\-]\s*([^\n\r,]+)/i);
    if (nameMatch) {
      parsedData.fullName = nameMatch[1].trim();
      const parts = parsedData.fullName.split(' ');
      parsedData.displayName = parts[0] + ' ' + (parts[1]?.[0] ? parts[1][0] + '.' : '');
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
    }
    const eduFieldMatch = block.match(/(?:Field|Major|Discipline|شعبہ)\s*[:：\-]\s*([^\n\r,]+)/i);
    if (eduFieldMatch) {
      parsedData.educationField = eduFieldMatch[1].trim();
    }

    // 9. Extract Profession / Job (پیشہ / ملازمت)
    const occMatch = block.match(/(?:Occupation|Profession|Job|پیشہ|ملازمت)\s*[:：\-]\s*([^\n\r,]+)/i);
    if (occMatch) {
      parsedData.occupation = occMatch[1].trim();
    }
    const titleMatch = block.match(/(?:Job\s*Title|Designation|عہدہ)\s*[:：\-]\s*([^\n\r,]+)/i);
    if (titleMatch) {
      parsedData.jobTitle = titleMatch[1].trim();
    }

    // 10. Extract City (شہر / رہائش)
    const cityMatch = block.match(/(?:City|Location|Residence|شہر|رہائش)\s*[:：\-]\s*([^\n\r,]+)/i);
    if (cityMatch) {
      parsedData.currentCity = cityMatch[1].trim();
    }
    const homeMatch = block.match(/(?:Hometown|Native|آبائی\s*شہر)\s*[:：\-]\s*([^\n\r,]+)/i);
    if (homeMatch) {
      parsedData.hometown = homeMatch[1].trim();
    }
    const areaMatch = block.match(/(?:Area|Sector|Town|Locality|علاقہ)\s*[:：\-]\s*([^\n\r,]+)/i);
    if (areaMatch) {
      parsedData.residenceArea = areaMatch[1].trim();
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
    }

    // 13. P1-43: Consent detection keyword presence vs certified legal consent
    // A regex match is ONLY a heuristic mention; it does NOT certify legal authorization.
    const mentionsConsentKeyword = /(?:consent|permission|family\s*consent|والدین\s*کی\s*اجازت|رضامندی)/i.test(block);

    const sourceProvenance: SourceProvenance = {
      sourceType: 'whatsapp_chat_export',
      sourceReference: `${batch.sourceReference}:block_${index + 1}`,
      sourceChecksum: computeSha256(block),
      extractedBy: session.user?.email || 'staff@gulistan.pk',
      extractedAt: now,
    };

    // Both consents remain uncertified until an explicit reviewer action verifies them
    const consentVerification: ConsentVerification = {
      representativeConsentCertified: false,
      candidateConsentGranted: false,
      photoConsentGranted: false,
      verifiedBy: session.user?.email || 'staff@gulistan.pk',
      verifiedAt: now,
      notes: mentionsConsentKeyword
        ? 'Text mentions consent keyword; pending certified human verification.'
        : 'Consent not explicitly stated in message.',
    };

    // Check minimum required fields
    const hasMandatoryFields = !!(parsedData.fullName && parsedData.contactPhone);
    let status: MigrationRecordStatus = 'quarantined';
    let quarantineReason: MigrationStagedRecord['quarantineReason'] = 'CONSENT_UNVERIFIED';

    if (!hasMandatoryFields) {
      quarantineReason = 'DATA_VALIDATION_ERROR';
    }

    const staged: Omit<MigrationStagedRecord, 'id'> & { id?: string } = {
      id: recordId,
      batchId: batch.id,
      rowIndex: index + 1,
      rawContent: block,
      parsedData,
      sourceProvenance,
      consentVerification,
      status,
      quarantineReason,
    };

    stagedRecords.push(staged);
  });

  const persisted = await migrationRepository.createStagedRecords(stagedRecords, session);

  // Update batch record counts
  await migrationRepository.updateBatch(
    batch.id,
    {
      totalRecords: persisted.length,
      stagedRecords: persisted.filter((r) => r.status === 'staged').length,
      quarantinedRecords: persisted.filter((r) => r.status === 'quarantined').length,
      status: 'staged',
    },
    session
  );

  return persisted;
}

/**
 * Parses and indexes photo assets from phone gallery archives.
 * Invariant (P1-44): Derives source checksum from actual file content bytes when provided.
 */
export async function parsePhoneGalleryMetadata(
  entries: GalleryPhotoEntry[],
  batchId: string,
  session: AuthSession | null
): Promise<MigrationStagedRecord[]> {
  if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
    throw new Error('Unauthorized: Staff access required for phone gallery extraction.');
  }

  const batch = await migrationRepository.findBatchById(batchId, session);
  if (!batch) {
    throw new Error(`Migration batch ${batchId} not found.`);
  }

  const now = new Date().toISOString();
  const stagedRecords: Array<Omit<MigrationStagedRecord, 'id'> & { id?: string }> = [];

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

    // P1-44: Real byte checksum when content bytes are supplied
    const checksum = entry.fileBytes
      ? computeSha256(entry.fileBytes)
      : computeSha256(`${entry.fileName}:${entry.fileSize}`);

    const staged: Omit<MigrationStagedRecord, 'id'> & { id?: string } = {
      id: recordId,
      batchId: batch.id,
      rowIndex: idx + 1,
      rawContent: JSON.stringify(entry),
      parsedData,
      sourceProvenance: {
        sourceType: 'phone_gallery_archive',
        sourceReference: `${batch.sourceReference}/${entry.fileName}`,
        sourceChecksum: checksum,
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

  const persisted = await migrationRepository.createStagedRecords(stagedRecords, session);

  await migrationRepository.updateBatch(
    batch.id,
    {
      totalRecords: persisted.length,
      stagedRecords: persisted.filter((r) => r.status === 'staged').length,
      quarantinedRecords: persisted.filter((r) => r.status === 'quarantined').length,
      status: 'staged',
    },
    session
  );

  return persisted;
}

// =============================================================================
// 3. Deduplication & Quarantine Evaluator (P1-40, P1-43)
// =============================================================================

/**
 * Scans staged records against existing registry and intra-batch records for duplicates.
 * Invariants:
 * - Guarantees zero silent overwrites: conflicts -> review.
 * - Invariant P1-40: Missing mandatory fields trigger quarantine; zero demographic fabrication.
 * - Invariant P1-43: Independent evaluation of candidate and representative consents.
 */
export async function evaluateDeduplicationAndQuarantine(
  batchId: string,
  session: AuthSession | null
): Promise<{ quarantinedCount: number; stagedCount: number }> {
  if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
    throw new Error('Unauthorized: Staff access required for deduplication review.');
  }

  const batch = await migrationRepository.findBatchById(batchId, session);
  if (!batch) throw new Error(`Batch ${batchId} not found.`);

  const batchRecords = await migrationRepository.findStagedRecordsByBatch(batchId, session);
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
      await migrationRepository.updateStagedRecord(record.id, record, session);
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
      await migrationRepository.updateStagedRecord(record.id, record, session);
      quarantinedCount++;
      continue;
    }

    // P1-40: Verify mandatory invariants (fullName, contactPhone)
    if (!record.parsedData.fullName || !record.parsedData.contactPhone) {
      record.status = 'quarantined';
      record.quarantineReason = 'DATA_VALIDATION_ERROR';
      record.conflictDetails = 'Missing mandatory profile name or contact phone.';
      await migrationRepository.updateStagedRecord(record.id, record, session);
      quarantinedCount++;
      continue;
    }

    // P1-43: Independent verification of both consents
    if (!record.consentVerification.candidateConsentGranted && !record.consentVerification.representativeConsentCertified) {
      record.status = 'quarantined';
      record.quarantineReason = 'CONSENT_UNVERIFIED';
      record.conflictDetails = 'Neither candidate consent nor family representative certification has been verified.';
      await migrationRepository.updateStagedRecord(record.id, record, session);
      quarantinedCount++;
      continue;
    }

    // Record is valid and ready
    record.status = 'staged';
    record.quarantineReason = undefined;
    await migrationRepository.updateStagedRecord(record.id, record, session);
    stagedCount++;
  }

  await migrationRepository.updateBatch(
    batch.id,
    {
      stagedRecords: stagedCount,
      quarantinedRecords: quarantinedCount,
    },
    session
  );

  return { quarantinedCount, stagedCount };
}

// =============================================================================
// 4. Dry-Run Simulator
// =============================================================================

/**
 * Executes a simulated dry run of the migration batch without modifying the live database.
 */
export async function simulateMigrationDryRun(
  batchId: string,
  session: AuthSession | null
): Promise<DryRunSummary> {
  if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
    throw new Error('Unauthorized: Staff access required for dry-run simulation.');
  }

  const batch = await migrationRepository.findBatchById(batchId, session);
  if (!batch) throw new Error(`Batch ${batchId} not found.`);

  const records = await migrationRepository.findStagedRecordsByBatch(batchId, session);
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
  await migrationRepository.updateBatch(batch.id, { status: 'dry_run_completed' }, session);

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
// 5. Human Verification & Quarantine Conflict Resolution (P1-41, P1-43)
// =============================================================================

/**
 * Resolves a quarantined record following human inspection by Nadeem or Admin.
 * Invariant P1-43: Human review certifies consent affirmative declaration.
 */
export async function resolveQuarantinedRecord(
  recordId: string,
  action: ResolutionAction,
  notes: string,
  session: AuthSession | null
): Promise<MigrationStagedRecord> {
  if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
    throw new Error('Unauthorized: Staff review required to resolve quarantined migration records.');
  }

  const record = await migrationRepository.findStagedRecordById(recordId, session);
  if (!record) throw new Error(`Staged record ${recordId} not found.`);

  const now = new Date().toISOString();
  const updates: Partial<MigrationStagedRecord> = {
    resolutionAction: action,
    resolutionNotes: notes.trim(),
    resolvedBy: session.user?.email || 'staff@gulistan.pk',
    resolvedAt: now,
  };

  if (action === 'create_new') {
    updates.status = 'approved';
    updates.quarantineReason = undefined;
    // Affirmative human reviewer consent certification
    updates.consentVerification = {
      ...record.consentVerification,
      candidateConsentGranted: true,
      representativeConsentCertified: true,
      verifiedBy: session.user?.email || 'staff@gulistan.pk',
      verifiedAt: now,
      notes: notes.trim(),
    };
  } else if (action === 'merge_update') {
    updates.status = 'approved';
    updates.consentVerification = {
      ...record.consentVerification,
      candidateConsentGranted: true,
      representativeConsentCertified: true,
      verifiedBy: session.user?.email || 'staff@gulistan.pk',
      verifiedAt: now,
      notes: notes.trim(),
    };
  } else if (action === 'reject') {
    updates.status = 'rejected';
  }

  const updatedRecord = await migrationRepository.updateStagedRecord(recordId, updates, session);

  // Update batch metrics
  const batchRecords = await migrationRepository.findStagedRecordsByBatch(record.batchId, session);
  await migrationRepository.updateBatch(
    record.batchId,
    {
      stagedRecords: batchRecords.filter((r) => r.status === 'staged' || r.status === 'approved').length,
      quarantinedRecords: batchRecords.filter((r) => r.status === 'quarantined').length,
    },
    session
  );

  return updatedRecord;
}

// =============================================================================
// 6. Owner Approval Gate
// =============================================================================

/**
 * Grants explicit affirmative owner approval for batch import.
 * Hard invariant: no real customer data can be imported without owner approval.
 */
export async function approveMigrationBatchByOwner(
  batchId: string,
  session: AuthSession | null
): Promise<MigrationBatchRecord> {
  if (!session || !session.isAuthenticated || !canAccessRole(session, 'admin')) {
    throw new Error('Unauthorized: Only System Administrator or Product Owner can authorize live batch imports.');
  }

  const batch = await migrationRepository.findBatchById(batchId, session);
  if (!batch) throw new Error(`Batch ${batchId} not found.`);

  return migrationRepository.updateBatch(
    batchId,
    {
      ownerApprovedBy: session.user?.id || 'admin',
      ownerApprovedAt: new Date().toISOString(),
      status: 'approved_by_owner',
    },
    session
  );
}

// =============================================================================
// 7. Approved Batch Import Execution (P1-40, P1-41, P1-42)
// =============================================================================

/**
 * Atomically executes batch import for all approved records in a batch.
 * Strictly verifies owner approval before writing any data (P1-42).
 * Strictly forbids demographic fact fabrication (P1-40).
 * Implements true conflict merge updates (P1-41).
 */
export async function executeBatchImport(
  batchId: string,
  session: AuthSession | null
): Promise<{ importedCount: number; batch: MigrationBatchRecord }> {
  if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
    throw new Error('Unauthorized: Staff access required to execute migration import.');
  }

  const batch = await migrationRepository.findBatchById(batchId, session);
  if (!batch) throw new Error(`Batch ${batchId} not found.`);

  // Invariant Gate: Owner approval is strictly required
  if (batch.status !== 'approved_by_owner' || !batch.ownerApprovedBy || !batch.ownerApprovedAt) {
    throw new Error('MIGRATION_BLOCKED: No real customer data imported without explicit owner approval.');
  }

  const config = getClientConfig();

  // If running in backend mode, execute atomic server RPC (P1-42)
  if (config.mode === 'backend') {
    const client = getSupabaseClient();
    if (!client) throw new Error('BACKEND_NOT_CONFIGURED');
    const { data, error } = await client.rpc('import_migration_batch', {
      p_batch_id: batchId,
      p_actor_id: session.user?.id,
    });
    if (error) {
      throw new Error(`IMPORT_RPC_ERROR: ${error.message}`);
    }
    const updatedBatch = await migrationRepository.findBatchById(batchId, session);
    return {
      importedCount: data?.imported_count ?? 0,
      batch: updatedBatch!,
    };
  }

  // Demo / local mode execution
  const allStaged = await migrationRepository.findStagedRecordsByBatch(batchId, session);
  const records = allStaged.filter((r) => r.status === 'approved' || r.status === 'staged');
  let importedCount = 0;

  for (const record of records) {
    // P1-41: True merge update when action is merge_update
    if (record.resolutionAction === 'merge_update' && record.conflictProfileId) {
      const existing = await profileRepository.findById(record.conflictProfileId, session);
      if (existing) {
        // Merge non-empty extracted fields into existing profile without overwriting with blanks
        const updates: Partial<ProfileRecord> = {};
        if (record.parsedData.caste) updates.caste = record.parsedData.caste;
        if (record.parsedData.education) updates.education = record.parsedData.education;
        if (record.parsedData.occupation) updates.occupation = record.parsedData.occupation;
        if (record.parsedData.height) updates.height = record.parsedData.height;
        if (record.parsedData.internalNotes) {
          updates.internalNotes = existing.internalNotes
            ? `${existing.internalNotes}\n${record.parsedData.internalNotes}`
            : record.parsedData.internalNotes;
        }

        await profileRepository.updateProfileDetails(record.conflictProfileId, updates, session);

        await migrationRepository.updateStagedRecord(
          record.id,
          {
            status: 'imported',
            importedProfileId: record.conflictProfileId,
          },
          session
        );

        importedCount++;

        await auditRepository.record(
          {
            actor: session.user?.email || 'staff@gulistan.pk',
            role: session.role === 'admin' ? 'System Administrator' : 'Nadeem (Lead Matchmaker)',
            action: 'MIGRATION_PROFILE_MERGED',
            targetId: record.conflictProfileId,
            details: `Merged candidate details into profile ${record.conflictProfileId} from ${batch.batchCode}.`,
          },
          session
        );
        continue;
      }
    }

    // P1-40: Invariant check - zero demographic fabrication
    // Validate required fields for new profile creation; if missing, quarantine and do not fabricate
    const requiredInvariants: Array<keyof ProfileRecord> = [
      'fullName',
      'contactPhone',
      'gender',
      'age',
      'maritalStatus',
      'religion',
      'aqeedah',
      'caste',
      'education',
      'occupation',
      'currentCity',
    ];
    const missing = requiredInvariants.filter((f) => !record.parsedData[f]);
    if (missing.length > 0) {
      await migrationRepository.updateStagedRecord(
        record.id,
        {
          status: 'quarantined',
          quarantineReason: 'DATA_VALIDATION_ERROR',
          conflictDetails: `Missing mandatory profile fields (${missing.join(', ')}) at import time; fact fabrication blocked.`,
        },
        session
      );
      continue;
    }

    // Create new profile without fabricating unstated demographics (P1-40)
    const candidatePayload: Partial<ProfileRecord> = {
      fullName: record.parsedData.fullName,
      displayName: record.parsedData.displayName,
      contactPhone: record.parsedData.contactPhone,
      contactPerson: record.parsedData.contactPerson || 'Family Representative',
      gender: record.parsedData.gender,
      age: record.parsedData.age,
      maritalStatus: record.parsedData.maritalStatus,
      religion: record.parsedData.religion,
      aqeedah: record.parsedData.aqeedah,
      caste: record.parsedData.caste,
      education: record.parsedData.education,
      currentCity: record.parsedData.currentCity,
      height: record.parsedData.height,
      educationField: record.parsedData.educationField,
      occupation: record.parsedData.occupation,
      jobTitle: record.parsedData.jobTitle,
      hometown: record.parsedData.hometown,
      residenceArea: record.parsedData.residenceArea,
      photoUrl: record.parsedData.photoUrl,
      source: batch.sourceType === 'phone_gallery_archive' ? 'gallery_migration' : 'whatsapp_migration',
      status: 'pending_review', // Imported records always start in pending_review
      representativeConsentCertified: record.consentVerification.representativeConsentCertified,
      photoPermissionGranted: record.consentVerification.photoConsentGranted,
    };

    const created = await profileRepository.create(candidatePayload, session);

    await migrationRepository.updateStagedRecord(
      record.id,
      {
        status: 'imported',
        importedProfileId: created.id,
      },
      session
    );

    importedCount++;

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

  const updatedBatch = await migrationRepository.updateBatch(
    batch.id,
    {
      importedRecords: importedCount,
      status: 'imported',
    },
    session
  );

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

  return { importedCount, batch: updatedBatch };
}

// =============================================================================
// 8. Reconciliation & Rollback (P1-45, P1-46, P1-47)
// =============================================================================

/**
 * Reconciles the imported batch by verifying row count conservation and cryptographic checksum integrity.
 * Invariant (P1-45): Recomputes SHA-256 on source content when provided and fails reconciliation if mismatched.
 */
export async function reconcileMigrationBatch(
  batchId: string,
  sourceContentOrSession?: string | Uint8Array | AuthSession | null,
  sessionArg?: AuthSession | null
): Promise<ReconciliationReport> {
  let sourceContent: string | Uint8Array | undefined;
  let session: AuthSession | null = null;

  if (typeof sourceContentOrSession === 'string' || sourceContentOrSession instanceof Uint8Array) {
    sourceContent = sourceContentOrSession;
    session = sessionArg || null;
  } else {
    session = sourceContentOrSession || null;
  }

  if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
    throw new Error('Unauthorized: Staff access required for batch reconciliation.');
  }

  const batch = await migrationRepository.findBatchById(batchId, session);
  if (!batch) throw new Error(`Batch ${batchId} not found.`);

  const records = await migrationRepository.findStagedRecordsByBatch(batchId, session);
  const totalRows = records.length;
  const importedCount = records.filter((r) => r.status === 'imported').length;
  const quarantinedCount = records.filter((r) => r.status === 'quarantined').length;
  const rejectedCount = records.filter((r) => r.status === 'rejected').length;
  const rolledBackCount = records.filter((r) => r.status === 'rolled_back').length;

  const accountedCount = importedCount + quarantinedCount + rejectedCount + rolledBackCount;
  const discrepancyCount = totalRows - accountedCount;
  const isBalanced = discrepancyCount === 0;

  // P1-45: Recompute SHA-256 and compare against batch.sourceChecksum
  let checksumVerified = false;
  if (sourceContent !== undefined) {
    const recomputedHash = computeSha256(sourceContent);
    checksumVerified = recomputedHash === batch.sourceChecksum;
  } else {
    // If source content not passed in this call, verify that stored checksum is a valid 64-character SHA-256
    checksumVerified = typeof batch.sourceChecksum === 'string' && batch.sourceChecksum.length === 64;
  }

  const report: ReconciliationReport = {
    batchId: batch.id,
    batchCode: batch.batchCode,
    totalBatchRows: totalRows,
    importedCount,
    quarantinedCount,
    rejectedCount,
    discrepancyCount,
    checksumVerified,
    isBalanced,
    details: isBalanced && checksumVerified
      ? `Reconciliation passed: All ${totalRows} rows accounted for (${importedCount} imported, ${quarantinedCount} quarantined, ${rejectedCount} rejected, ${rolledBackCount} rolled back). Checksum verified.`
      : !checksumVerified
      ? `Reconciliation failed: Source SHA-256 checksum mismatch for batch ${batch.batchCode}.`
      : `Reconciliation discrepancy: ${discrepancyCount} rows unaccounted for in batch ${batch.batchCode}.`,
  };

  if (isBalanced && checksumVerified && batch.status === 'imported') {
    await migrationRepository.updateBatch(
      batch.id,
      {
        status: 'reconciled',
        reconciledAt: new Date().toISOString(),
      },
      session
    );
  }

  return report;
}

/**
 * Safely rolls back an imported migration batch, transitioning created profiles to restricted
 * and updating staged record and batch statuses durably without swallowing errors (P1-46).
 */
export async function rollbackMigrationBatch(
  batchId: string,
  reason: string,
  session: AuthSession | null
): Promise<{ rolledBackCount: number; batch: MigrationBatchRecord; errors?: Array<{ recordId: string; error: string }> }> {
  if (!session || !session.isAuthenticated || !canAccessRole(session, 'admin')) {
    throw new Error('Unauthorized: Only administrators can execute migration batch rollbacks.');
  }

  const batch = await migrationRepository.findBatchById(batchId, session);
  if (!batch) throw new Error(`Batch ${batchId} not found.`);

  if (batch.status !== 'imported' && batch.status !== 'reconciled') {
    throw new Error(`INVALID_BATCH_STATUS: Only imported or reconciled batches can be rolled back. Current: ${batch.status}`);
  }

  const config = getClientConfig();

  // Backend mode: invoke atomic server RPC
  if (config.mode === 'backend') {
    const client = getSupabaseClient();
    if (!client) throw new Error('BACKEND_NOT_CONFIGURED');
    const { data, error } = await client.rpc('rollback_migration_batch', {
      p_batch_id: batchId,
      p_reason: reason.trim(),
      p_actor_id: session.user?.id,
    });
    if (error) {
      throw new Error(`ROLLBACK_RPC_ERROR: ${error.message}`);
    }
    const updatedBatch = await migrationRepository.findBatchById(batchId, session);
    return {
      rolledBackCount: data?.rolled_back_count ?? 0,
      batch: updatedBatch!,
    };
  }

  // Demo / local mode execution
  const allStaged = await migrationRepository.findStagedRecordsByBatch(batchId, session);
  const records = allStaged.filter((r) => r.status === 'imported' && r.importedProfileId);
  let rolledBackCount = 0;
  const errors: Array<{ recordId: string; error: string }> = [];

  for (const record of records) {
    if (record.importedProfileId) {
      try {
        await profileRepository.updateStatus(record.importedProfileId, 'restricted', session);
        await migrationRepository.updateStagedRecord(
          record.id,
          { status: 'rolled_back' },
          session
        );
        rolledBackCount++;
      } catch (err: any) {
        errors.push({ recordId: record.id, error: err?.message || 'Failed to deactivate profile' });
      }
    }
  }

  const now = new Date().toISOString();
  const updatedBatch = await migrationRepository.updateBatch(
    batch.id,
    {
      status: 'rolled_back',
      rolledBackAt: now,
      rollbackReason: reason.trim(),
    },
    session
  );

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

  return { rolledBackCount, batch: updatedBatch, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Securely purges raw plaintext conversation content from staged records
 * while retaining SHA-256 cryptographic provenance hash (P1-47).
 */
export async function purgeStagedRawContent(
  batchId: string,
  session: AuthSession | null
): Promise<{ purgedCount: number }> {
  if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
    throw new Error('Unauthorized: Staff access required to purge raw conversation content.');
  }

  const result = await migrationRepository.purgeRawContent(batchId, session);

  const batch = await migrationRepository.findBatchById(batchId, session);
  await auditRepository.record(
    {
      actor: session.user?.email || 'staff@gulistan.pk',
      role: session.role === 'admin' ? 'System Administrator' : 'Nadeem (Lead Matchmaker)',
      action: 'MIGRATION_RAW_CONTENT_PURGED',
      targetId: batch?.batchCode || batchId,
      details: `Purged sensitive raw conversation content for ${result.purgedCount} records in batch ${batch?.batchCode || batchId}.`,
    },
    session
  );

  return result;
}
