import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  profileRepository,
  financeRepository,
  crmRepository,
  matchmakerRepository,
  settingsRepository,
  auditRepository,
  resetRepositoriesForTesting,
} from './repositories';
import {
  profileRowToDTO,
  profileDTOToRow,
  ProfileRow,
} from './profiles';
import { AuthSession } from './auth';
import { ProfileRecord, SiblingRecord, PropertyDetails, PartnerPreference } from '../types';

const staffSession: AuthSession = {
  user: {
    id: 'usr-nadeem',
    email: 'nadeem@gulistan.pk',
    displayName: 'Nadeem Ahmed',
    role: 'nadeem',
    preferredLanguage: 'ur',
  },
  role: 'nadeem',
  token: 'mock-staff-token',
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

test('ProfileRepository: findAll returns candidate profiles and supports filters', async () => {
  resetRepositoriesForTesting();
  const all = await profileRepository.findAll(staffSession);
  assert.ok(all.length > 0, 'Should return demo profiles in demo mode');

  const males = await profileRepository.findAll(staffSession, { gender: 'male' });
  assert.ok(males.every((p) => p.gender === 'male'), 'Gender filter must only return males');

  const pending = await profileRepository.findAll(staffSession, { status: 'pending_review' });
  assert.ok(pending.every((p) => p.status === 'pending_review'), 'Status filter must only return pending');
});

test('ProfileRepository: findById retrieves and sanitizes profile according to role', async () => {
  resetRepositoriesForTesting();
  const profile = await profileRepository.findById('GLS-401', staffSession);
  assert.ok(profile, 'Profile GLS-401 must exist');
  assert.ok(profile.contactPhone, 'Staff can view full contact phone');

  // Customer view (third-party): contact details must be scrubbed
  const customerView = await profileRepository.findById('GLS-401', customerSession);
  assert.ok(customerView, 'Customer can view profile');
  assert.match(customerView.contactPhone, /Protected/);
});

test('ProfileRepository: create enforces validation and role authorization', async () => {
  resetRepositoriesForTesting();

  // 1. Unauthenticated caller fails closed
  await assert.rejects(
    async () => {
      await profileRepository.create(
        {
          fullName: 'Test Candidate',
          gender: 'female',
          age: 24,
          contactPhone: '+92 300 1112233',
        },
        null
      );
    },
    /UNAUTHORIZED/
  );

  // 2. Customer self-service intake: allowed, but forces pending_review & direct_web (GMB-DEC-004 / PROF-03)
  const customerCreated = await profileRepository.create(
    {
      fullName: 'Fatima Zahra',
      displayName: 'Fatima Z.',
      gender: 'female',
      age: 26,
      maritalStatus: 'never_married',
      religion: 'Islam',
      aqeedah: 'Sunni',
      caste: 'Ansari',
      education: 'MSc Computer Science',
      educationField: 'Computer Science',
      occupation: 'Software Engineer',
      jobTitle: 'Frontend Engineer',
      hometown: 'Lahore',
      currentCity: 'Lahore',
      residenceArea: 'Johar Town',
      contactPerson: 'Father (Mr. Ansari)',
      contactPhone: '+92 321 4455667',
      // Attacker/customer attempts to bypass review or claim walk-in:
      status: 'active',
      source: 'walk_in',
    },
    customerSession
  );

  assert.ok(customerCreated.id.startsWith('GLS-'), 'Should assign GLS ID');
  assert.equal(customerCreated.status, 'pending_review', 'Customer intake MUST force status to pending_review');
  assert.equal(customerCreated.source, 'direct_web', 'Customer intake MUST force source to direct_web');
  assert.equal(customerCreated.fullName, 'Fatima Zahra');

  // 3. Staff can create profile with assisted intake
  const created = await profileRepository.create(
    {
      fullName: 'Ayesha Siddiqua',
      displayName: 'Ayesha S.',
      gender: 'female',
      age: 25,
      height: "5'4\"",
      maritalStatus: 'never_married',
      religion: 'Islam',
      aqeedah: 'Sunni / Hanafi',
      caste: 'Siddiqui',
      education: 'Pharm D',
      educationField: 'Pharmacy',
      occupation: 'Pharmacist',
      jobTitle: 'Hospital Pharmacist',
      hometown: 'Islamabad',
      currentCity: 'Islamabad',
      residenceArea: 'F-8',
      contactPerson: 'Father (Dr. Siddiqui)',
      contactPhone: '+92 300 9988776',
      source: 'walk_in',
    },
    staffSession
  );

  assert.ok(created.id.startsWith('GLS-'));
  assert.equal(created.status, 'pending_review');
  assert.equal(created.source, 'walk_in');
  assert.equal(created.fullName, 'Ayesha Siddiqua');
});

test('ProfileRepository: updateStatus enforces state machine lifecycle', async () => {
  resetRepositoriesForTesting();

  // Valid transition: approved -> active
  const updated = await profileRepository.updateStatus('GLS-401', 'active', staffSession);
  assert.equal(updated.status, 'active');

  // Invalid transition: customer cannot transition
  await assert.rejects(
    async () => {
      await profileRepository.updateStatus('GLS-401', 'active', customerSession);
    },
    /UNAUTHORIZED/
  );

  // Invalid jump: active -> approved is not in PERMITTED_STATUS_TRANSITIONS (active can go to introduction_authorized or inactive)
  await assert.rejects(
    async () => {
      await profileRepository.updateStatus('GLS-401', 'approved', staffSession);
    },
    /INVALID_TRANSITION/
  );
});

test('FinanceRepository: enforces role security, records transactions, reversals, partner summaries, and reconciliation (OPEN-010, FIN-01..FIN-05)', async () => {
  resetRepositoriesForTesting();

  // Customer denied access
  await assert.rejects(
    async () => {
      await financeRepository.findAll(customerSession);
    },
    /UNAUTHORIZED/
  );

  // Staff can read all
  const txs = await financeRepository.findAll(staffSession);
  assert.ok(txs.length > 0);

  // Staff can find by ID
  const firstTx = txs[0];
  const found = await financeRepository.findById(firstTx.id, staffSession);
  assert.ok(found);
  assert.equal(found.id, firstTx.id);

  // Staff can append transaction
  const newTx = await financeRepository.record(
    {
      matchmakerId: 'mm-rep-test',
      matchmakerName: 'Rawalpindi Associates',
      type: 'receivable',
      amount: 45000,
      description: 'Match commission for case MC-440',
    },
    staffSession
  );
  assert.ok(newTx.id);
  assert.equal(newTx.amount, 45000);

  // getPartnerSummary computes OPEN-010 formula (Receivable - Payable)
  const summaryBefore = await financeRepository.getPartnerSummary('mm-rep-test', staffSession);
  assert.equal(summaryBefore.totalPendingReceivable, 45000);
  assert.equal(summaryBefore.totalPendingPayable, 0);
  assert.equal(summaryBefore.netBalance, 45000, 'OPEN-010: Receivable 45k - Payable 0 = +45k asset');

  // Staff can reverse transaction
  const reversal = await financeRepository.reverse(newTx.id, 'Duplicate entry correction', staffSession);
  assert.equal(reversal.type, 'reversal');
  assert.equal(reversal.reversalOf, newTx.id);

  // Reversing again fails with ALREADY_REVERSED
  await assert.rejects(
    async () => {
      await financeRepository.reverse(newTx.id, 'Duplicate reversal attempt', staffSession);
    },
    /ALREADY_REVERSED/
  );

  // getPartnerSummary after reversal reconciles to 0
  const summaryAfter = await financeRepository.getPartnerSummary('mm-rep-test', staffSession);
  assert.equal(summaryAfter.netBalance, 0);
  assert.equal(summaryAfter.reversedTransactionCount, 1);

  // Bureau reconciliation
  const recon = await financeRepository.reconcile(staffSession);
  assert.equal(recon.currency, 'PKR');
  assert.equal(recon.reconciled, true);
});

test('CRMRepository: enforces role security, creates and completes follow-ups (CRM-01, CRM-03)', async () => {
  resetRepositoriesForTesting();

  // Customer denied general findAll
  await assert.rejects(
    async () => {
      await crmRepository.findAll(customerSession);
    },
    /UNAUTHORIZED/
  );

  // Staff can create follow-up
  const created = await crmRepository.create(
    {
      profileId: 'GLS-101',
      personName: 'Uncle Tariq',
      contactPhone: '+92 300 5544332',
      type: 'proposal_decision',
      priority: 'high',
      notes: 'Call family regarding proposal feedback.',
    },
    staffSession
  );
  assert.equal(created.status, 'pending');

  // Customer CAN submit profile_correction request without staff credentials (CRM-01)
  const correction = await crmRepository.create(
    {
      profileId: 'GLS-101',
      personName: 'Zahid Khan',
      contactPhone: '+92 300 1122334',
      type: 'profile_correction',
      priority: 'high',
      notes: 'Please correct family residential city.',
    },
    customerSession
  );
  assert.equal(correction.status, 'pending');
  assert.equal(correction.type, 'profile_correction');

  // findById retrieves the item
  const found = await crmRepository.findById(created.id, staffSession);
  assert.ok(found);
  assert.equal(found.id, created.id);

  // Staff can complete follow-up with resolution notes (CRM-03)
  const completed = await crmRepository.complete(
    created.id,
    staffSession,
    'Family confirmed tea meeting for Sunday.'
  );
  assert.equal(completed.status, 'completed');
  assert.ok(completed.notes.includes('Family confirmed tea meeting'));

  // Idempotent retry: completing again returns the item without failing
  const retried = await crmRepository.complete(created.id, staffSession);
  assert.equal(retried.status, 'completed');
});

test('MatchmakerRepository: enforces role security, manages partner lifecycle, versioned agreements, and referral attribution (CRM-02)', async () => {
  resetRepositoriesForTesting();

  // 1. Customer denied
  await assert.rejects(
    async () => {
      await matchmakerRepository.findAll(customerSession);
    },
    /UNAUTHORIZED/
  );

  // 2. Staff can query partners
  const partners = await matchmakerRepository.findAll(staffSession);
  assert.ok(partners.length >= 3);
  const quran = partners.find((p) => p.id === 'mm-101');
  assert.ok(quran);
  assert.equal(quran.code, 'MM-MUL-01');
  assert.ok(quran.activeAgreement);
  assert.equal(quran.activeAgreement.feeType, 'percentage');
  assert.equal(quran.activeAgreement.percentageRate, 20);

  // findByCode
  const byCode = await matchmakerRepository.findByCode('MM-MUL-01', staffSession);
  assert.ok(byCode);
  assert.equal(byCode.id, 'mm-101');

  // 3. Register a new flat-fee agreement (supersedes active percentage agreement)
  const newAgreement = await matchmakerRepository.createAgreement(
    'mm-101',
    {
      feeType: 'flat_fee',
      flatFeePKR: 60000,
      termsText: 'PKR 60,000 flat honorarium per finalized nikah.',
      isActive: true,
    },
    staffSession
  );
  assert.equal(newAgreement.feeType, 'flat_fee');
  assert.equal(newAgreement.flatFeePKR, 60000);
  assert.equal(newAgreement.isActive, true);

  // Verify superseded agreement is deactivated
  const agreements = await matchmakerRepository.getAgreements('mm-101', staffSession);
  assert.ok(agreements.length >= 2);
  const activeCount = agreements.filter((a) => a.isActive).length;
  assert.equal(activeCount, 1, 'Exactly one active agreement per partner');
  assert.equal(agreements[0].feeType, 'flat_fee');

  // 4. Attribution: attribute profile referral
  const initialReferrals = quran.profilesReferredCount;
  const attrRes = await matchmakerRepository.attributeReferral(
    'mm-101',
    'GLS-205',
    staffSession,
    'Client referred by Multan bureau.'
  );
  assert.equal(attrRes.success, true);
  assert.equal(attrRes.matchmaker.profilesReferredCount, initialReferrals + 1);

  // 5. Status update: suspend partner
  const suspended = await matchmakerRepository.updateStatus('mm-101', 'suspended', staffSession);
  assert.equal(suspended.status, 'suspended');

  // Attribution must now fail because partner is suspended
  await assert.rejects(
    async () => {
      await matchmakerRepository.attributeReferral('mm-101', 'GLS-206', staffSession);
    },
    /MATCHMAKER_INACTIVE/
  );
});

test('Lossless DTO/Row mapping: does not manufacture parent facts, property, or unsplash photos (DB-04, DB-05, DB-06)', () => {
  const bareRow: ProfileRow = {
    id: '00000000-0000-0000-0000-000000000001',
    reference_code: 'GLS-TEST',
    full_name: 'Zahid Khan',
    display_name: 'Zahid K.',
    gender: 'male',
    age: 30,
    dob: null,
    height_inches: 69,
    height_display: "5'9\"",
    marital_status: 'never_married',
    religion: 'Islam',
    aqeedah: 'Ahle Hadith',
    caste: 'Pathan',
    sub_caste: null,
    education_level: 'Masters',
    education_field: 'Computer Science',
    occupation: 'Software Architect',
    job_title: 'Principal Engineer',
    company_or_sector: 'Tech Co',
    monthly_income_pkr: 350000,
    hometown: 'Peshawar',
    current_city: 'Islamabad',
    residence_area: 'G-11',
    status: 'pending_review',
    source: 'walk_in',
    assigned_matchmaker_id: null,
    contact_person: 'Zahid Khan',
    contact_phone: '+92 300 1239876',
    contact_email: null,
    preferred_contact_method: 'whatsapp',
    photo_permission_granted: false,
    representative_consent_certified: false,
    internal_notes: null,
    created_by: null,
    created_at: '2026-11-13T00:00:00Z',
    updated_at: '2026-11-13T00:00:00Z',
  };

  const dto = profileRowToDTO(bareRow);

  // Must NOT manufacture facts
  assert.equal(dto.fatherStatus, undefined, 'Must not manufacture alive father');
  assert.equal(dto.motherStatus, undefined, 'Must not manufacture alive mother');
  assert.equal(dto.familyBackgroundNotes, undefined, 'Must not manufacture family notes');
  assert.equal(dto.photoUrl, '', 'Must not manufacture unsplash photo URL');
  assert.equal(dto.photoPermissionGranted, false, 'Must preserve false consent');
  assert.equal(dto.representativeConsentCertified, false, 'Must preserve false consent');

  // Test profileDTOToRow does not default religion/aqeedah/caste to Islam/Sunni/General
  const blankDTO: Partial<ProfileRecord> = {
    fullName: 'Unknown Candidate',
    gender: 'female',
    age: 22,
    maritalStatus: 'never_married',
    religion: '',
    aqeedah: '',
    caste: '',
  };

  const row = profileDTOToRow(blankDTO);
  assert.equal(row.religion, '', 'Must not default to Islam');
  assert.equal(row.aqeedah, '', 'Must not default to Sunni / Hanafi');
  assert.equal(row.caste, '', 'Must not default to General');
  assert.equal(row.representative_consent_certified, false, 'Must not default consent to true');
});

test('Lossless DTO/Row mapping: preserves nested siblings, property, and preferences without data loss (DB-07)', () => {
  const siblings: SiblingRecord[] = [
    {
      id: 'sib-01',
      relation: 'brother',
      name: 'Usman Khan',
      gender: 'male',
      age: 32,
      maritalStatus: 'married',
      occupation: 'Doctor',
      marriageDetails: 'Married into Niazi family',
      childrenCount: 2,
    } as any,
  ];

  const property: PropertyDetails = {
    ownership: 'owned',
    propertyType: 'house',
    areaMarlas: 20,
    areaKanalDisplay: '1 Kanal',
    areaKanalDisplayUrdu: '۱ کنال',
    approxValuePKR: 45000000,
    city: 'Islamabad',
    locality: 'F-8/2',
    householdArrangement: 'independent',
  };

  const preferences: PartnerPreference = {
    ageMin: 22,
    ageMax: 27,
    heightMin: "5'2\"",
    maritalStatus: ['never_married'],
    religion: 'Islam',
    aqeedah: 'Ahle Hadith',
    caste: 'Pathan',
    educationMin: 'Masters',
    preferredOccupations: ['Doctor', 'Engineer'],
    cityPreferences: ['Islamabad', 'Rawalpindi'],
    propertyExpectation: 'Owned Home',
    familyArrangement: 'independent',
    criteriaClassifications: { religion: 'mandatory', caste: 'preferred' },
  };

  const bareRow: ProfileRow = {
    id: '00000000-0000-0000-0000-000000000002',
    reference_code: 'GLS-102',
    full_name: 'Imran Khan',
    display_name: 'Imran K.',
    gender: 'male',
    age: 29,
    dob: null,
    height_inches: 71,
    height_display: "5'11\"",
    marital_status: 'never_married',
    religion: 'Islam',
    aqeedah: 'Ahle Hadith',
    caste: 'Pathan',
    sub_caste: null,
    education_level: 'Masters',
    education_field: 'Economics',
    occupation: 'Financial Analyst',
    job_title: 'Senior Analyst',
    company_or_sector: 'Bank',
    monthly_income_pkr: 250000,
    hometown: 'Mardan',
    current_city: 'Islamabad',
    residence_area: 'F-8/2',
    status: 'approved',
    source: 'direct_web',
    assigned_matchmaker_id: null,
    contact_person: 'Father',
    contact_phone: '+92 300 7766554',
    contact_email: 'khan.family@example.com',
    preferred_contact_method: 'phone',
    photo_permission_granted: true,
    representative_consent_certified: true,
    internal_notes: null,
    created_by: null,
    created_at: '2026-11-13T00:00:00Z',
    updated_at: '2026-11-13T00:00:00Z',
  };

  const dto = profileRowToDTO(bareRow, {
    siblings,
    property,
    preferences,
    photoUrl: 'https://storage.gulistan.pk/candidate-photos/imran.jpg',
    fatherStatus: 'alive',
    motherStatus: 'alive',
    familyBackgroundNotes: 'Respected military background.',
  });

  assert.equal(dto.siblings.length, 1);
  assert.equal(dto.siblings[0].name, 'Usman Khan');
  assert.equal(dto.property.areaMarlas, 20);
  assert.equal(dto.property.approxValuePKR, 45000000);
  assert.equal(dto.preferences.caste, 'Pathan');
  assert.equal(dto.preferences.criteriaClassifications.religion, 'mandatory');
  assert.equal(dto.fatherStatus, 'alive');
  assert.equal(dto.familyBackgroundNotes, 'Respected military background.');
  assert.equal(dto.photoUrl, 'https://storage.gulistan.pk/candidate-photos/imran.jpg');
});

test('SettingsRepository: enforces admin role security and manages regional land conventions', async () => {
  resetRepositoriesForTesting();

  // 1. Unauthorized callers cannot update settings
  await assert.rejects(
    async () => {
      await settingsRepository.updateRegionalConventions({ marlaPerKanal: 18, sqFtPerMarla: 272 }, customerSession);
    },
    /Unauthorized/
  );

  await assert.rejects(
    async () => {
      await settingsRepository.updateRegionalConventions({ marlaPerKanal: 18, sqFtPerMarla: 272 }, staffSession);
    },
    /Unauthorized/
  );

  // 2. Fetch default settings
  const defaults = await settingsRepository.getSettings(staffSession);
  assert.equal(defaults.regionalConventions.marlaPerKanal, 20);
  assert.equal(defaults.regionalConventions.sqFtPerMarla, 225);

  // 3. Validation rejection on invalid numbers
  await assert.rejects(
    async () => {
      await settingsRepository.updateRegionalConventions({ marlaPerKanal: -5, sqFtPerMarla: 225 }, adminSession);
    },
    /Validation failed/
  );

  // 4. Admin updates regional conventions successfully
  const updated = await settingsRepository.updateRegionalConventions(
    { marlaPerKanal: 18, sqFtPerMarla: 272 },
    adminSession
  );
  assert.equal(updated.regionalConventions.marlaPerKanal, 18);
  assert.equal(updated.regionalConventions.sqFtPerMarla, 272);

  // 5. Subsequent getSettings reflects updated conventions
  const reloaded = await settingsRepository.getSettings(staffSession);
  assert.equal(reloaded.regionalConventions.marlaPerKanal, 18);
  assert.equal(reloaded.regionalConventions.sqFtPerMarla, 272);
});

test('AuditRepository: enforces staff role security, records events, and queries trails', async () => {
  resetRepositoriesForTesting();

  // 1. Unauthorized customer cannot view audit trail
  await assert.rejects(
    async () => {
      await auditRepository.findAll(customerSession);
    },
    /Unauthorized/
  );

  // 2. Staff can query audit trail
  const logs = await auditRepository.findAll(staffSession);
  assert.ok(Array.isArray(logs));
  assert.ok(logs.length > 0);

  // 3. Record new audit event
  const initialCount = logs.length;
  const newLog = await auditRepository.record(
    {
      actor: 'nadeem@gulistan.pk',
      role: 'Nadeem (Lead Matchmaker)',
      action: 'TEST_AUDIT_ACTION',
      targetId: 'GLS-401',
      details: 'Audit verification test event.',
    },
    staffSession
  );
  assert.ok(newLog.id.startsWith('AUD-'));
  assert.equal(newLog.action, 'TEST_AUDIT_ACTION');

  // 4. Trail contains the recorded event
  const updatedLogs = await auditRepository.findAll(staffSession);
  assert.equal(updatedLogs.length, initialCount + 1);
  assert.equal(updatedLogs[0].action, 'TEST_AUDIT_ACTION');
});
