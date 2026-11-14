import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateCandidateMatch,
  rankCandidatesForProfile,
  recordMatchDecision,
  verifyPreShareEligibility,
  MATCHING_ALGORITHM_VERSION,
} from './matching';
import { ProfileRecord } from '../types';
import { AuthSession } from './auth';
import { matchRepository, resetRepositoriesForTesting } from './repositories';

function createTestProfile(overrides: Partial<ProfileRecord>): ProfileRecord {
  const base: ProfileRecord = {
    id: 'GLS-TEST',
    fullName: 'Test Candidate',
    displayName: 'Test C.',
    gender: 'female',
    age: 24,
    height: "5'4\"",
    maritalStatus: 'never_married',
    religion: 'Islam',
    aqeedah: 'Sunni / Hanafi',
    caste: 'Rajput',
    education: 'Bachelors',
    educationField: 'General',
    occupation: 'Professional',
    jobTitle: 'Officer',
    hometown: 'Lahore',
    currentCity: 'Lahore',
    residenceArea: 'Model Town',
    photoUrl: '',
    photoPermissionGranted: false,
    fatherStatus: 'alive',
    motherStatus: 'alive',
    siblings: [],
    familyBackgroundNotes: 'Respectable family.',
    property: {
      ownership: 'owned',
      propertyType: 'house',
      areaMarlas: 10,
      city: 'Lahore',
      locality: 'Model Town',
      householdArrangement: 'independent',
    },
    preferences: {
      ageMin: 22,
      ageMax: 28,
      heightMin: "5'2\"",
      maritalStatus: ['never_married'],
      religion: 'Islam',
      aqeedah: 'Sunni / Hanafi',
      caste: 'Rajput',
      educationMin: 'Bachelors',
      preferredOccupations: [],
      cityPreferences: ['Lahore'],
      propertyExpectation: 'None',
      familyArrangement: 'any',
      criteriaClassifications: {},
    },
    status: 'active',
    source: 'walk_in',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    contactPerson: 'Guardian',
    contactPhone: '+92 300 0000000',
    contactEmail: 'test@example.com',
    preferredContactMethod: 'whatsapp',
  };
  return { ...base, ...overrides };
}

const samplePrimaryGroom: ProfileRecord = createTestProfile({
  id: 'GLS-T01',
  fullName: 'Hamza Khan',
  displayName: 'Hamza K.',
  gender: 'male',
  age: 28,
  height: "5'11\"",
  maritalStatus: 'never_married',
  religion: 'Islam',
  aqeedah: 'Sunni / Hanafi',
  caste: 'Rajput',
  education: 'Masters in Computer Science',
  educationField: 'CS',
  occupation: 'Software Engineer',
  monthlyIncomePKR: 250000,
  hometown: 'Lahore',
  currentCity: 'Lahore',
  residenceArea: 'Gulberg',
  status: 'active',
  contactPerson: 'Father',
  contactPhone: '+92 300 0000001',
  contactEmail: 'father@example.com',
  preferredContactMethod: 'whatsapp',
  photoPermissionGranted: true,
  siblings: [],
  preferences: {
    ageMin: 22,
    ageMax: 26,
    heightMin: "5'2\"",
    maritalStatus: ['never_married'],
    religion: 'Islam',
    aqeedah: 'Sunni / Hanafi',
    caste: 'Rajput',
    educationMin: 'Bachelors',
    preferredOccupations: [],
    cityPreferences: ['Lahore', 'Islamabad'],
    propertyExpectation: 'Not required',
    familyArrangement: 'any',
    criteriaClassifications: {
      religion: 'mandatory',
      aqeedah: 'mandatory',
      maritalStatus: 'mandatory',
      age: 'preferred',
      city: 'preferred',
      education: 'preferred',
      caste: 'acceptable_range',
    },
  },
});

const sampleCompatibleBride: ProfileRecord = createTestProfile({
  id: 'GLS-T02',
  fullName: 'Ayesha Tariq',
  displayName: 'Ayesha T.',
  gender: 'female',
  age: 24,
  height: "5'5\"",
  maritalStatus: 'never_married',
  religion: 'Islam',
  aqeedah: 'Sunni / Hanafi',
  caste: 'Rajput',
  education: 'Bachelors in Software Engineering',
  educationField: 'SE',
  occupation: 'UI Designer',
  monthlyIncomePKR: 120000,
  hometown: 'Lahore',
  currentCity: 'Lahore',
  residenceArea: 'DHA',
  status: 'active',
  contactPerson: 'Mother',
  contactPhone: '+92 300 0000002',
  contactEmail: 'mother@example.com',
  preferredContactMethod: 'whatsapp',
  photoPermissionGranted: true,
  siblings: [],
});

const staffSession: AuthSession = {
  user: {
    id: 'usr-nadeem',
    email: 'nadeem@gulistan.pk',
    displayName: 'Nadeem Ahmed',
    role: 'nadeem',
    preferredLanguage: 'en',
  },
  role: 'nadeem',
  token: 'mock-staff-token',
  expiresAt: Date.now() + 3600 * 1000,
  isAuthenticated: true,
};

const candidateSession: AuthSession = {
  user: {
    id: 'usr-candidate',
    email: 'client@example.com',
    displayName: 'Client User',
    role: 'customer',
    preferredLanguage: 'ur',
  },
  role: 'customer',
  token: 'mock-customer-token',
  expiresAt: Date.now() + 3600 * 1000,
  isAuthenticated: true,
};

test('evaluateCandidateMatch prohibits self-pairing', () => {
  const result = evaluateCandidateMatch(samplePrimaryGroom, samplePrimaryGroom);
  assert.equal(result.isEligible, false);
  assert.equal(result.overallScore, 0);
  assert.equal(result.disqualificationReason?.code, 'SELF_PAIR_PROHIBITED');
  assert.equal(result.humanDecisionStatus, 'rejected');
  assert.equal(result.algorithmVersion, MATCHING_ALGORITHM_VERSION);
});

test('evaluateCandidateMatch enforces gender complementarity gate', () => {
  const maleCandidate: ProfileRecord = {
    ...sampleCompatibleBride,
    id: 'GLS-T03',
    gender: 'male',
  };
  const result = evaluateCandidateMatch(samplePrimaryGroom, maleCandidate);
  assert.equal(result.isEligible, false);
  assert.equal(result.overallScore, 0);
  assert.equal(result.disqualificationReason?.code, 'SAME_GENDER_PROHIBITED');
});

test('evaluateCandidateMatch scores highly compatible match with bilingual explanations', () => {
  const result = evaluateCandidateMatch(samplePrimaryGroom, sampleCompatibleBride);
  assert.equal(result.isEligible, true);
  assert.equal(result.isMandatorySatisfied, true);
  assert.ok(result.overallScore >= 80, `Expected score >= 80, got ${result.overallScore}`);
  assert.equal(result.requiresHumanApproval, true);
  assert.equal(result.humanDecisionStatus, 'pending_review');

  // Check bilingual summaries
  assert.ok(result.summaryEn.includes('compatibility match'));
  assert.ok(result.summaryUrdu.includes('مطابقت'));

  // Check individual criteria results
  const religionCheck = result.criteria.find((c) => c.id === 'religion');
  assert.ok(religionCheck);
  assert.equal(religionCheck.result, 'matched');
  assert.equal(religionCheck.reasonCode, 'RELIGION_MATCHED');
  assert.ok(religionCheck.explanationEn.length > 0);
  assert.ok(religionCheck.explanationUrdu.length > 0);

  const aqeedahCheck = result.criteria.find((c) => c.id === 'aqeedah');
  assert.ok(aqeedahCheck);
  assert.equal(aqeedahCheck.result, 'matched');
  assert.equal(aqeedahCheck.reasonCode, 'AQEEDAH_MATCHED');

  const maritalCheck = result.criteria.find((c) => c.id === 'marital_status');
  assert.ok(maritalCheck);
  assert.equal(maritalCheck.result, 'matched');
  assert.equal(maritalCheck.reasonCode, 'MARITAL_STATUS_MATCHED');
});

test('evaluateCandidateMatch hard-disqualifies religion mismatch to score 0', () => {
  const nonMuslimCandidate: ProfileRecord = {
    ...sampleCompatibleBride,
    id: 'GLS-T04',
    religion: 'Christian',
  };
  const result = evaluateCandidateMatch(samplePrimaryGroom, nonMuslimCandidate);
  assert.equal(result.isEligible, false);
  assert.equal(result.isMandatorySatisfied, false);
  assert.equal(result.overallScore, 0);
  assert.equal(result.disqualificationReason?.code, 'MANDATORY_RELIGION_MISMATCH');
  assert.ok(result.summaryEn.includes('Ineligible: Mandatory religion mismatch'));
});

test('evaluateCandidateMatch hard-disqualifies aqeedah/sect divergence to score 0', () => {
  const shiaCandidate: ProfileRecord = {
    ...sampleCompatibleBride,
    id: 'GLS-T05',
    aqeedah: 'Shia / Ithna Ashari',
  };
  const result = evaluateCandidateMatch(samplePrimaryGroom, shiaCandidate);
  assert.equal(result.isEligible, false);
  assert.equal(result.isMandatorySatisfied, false);
  assert.equal(result.overallScore, 0);
  assert.equal(result.disqualificationReason?.code, 'MANDATORY_AQEEDAH_MISMATCH');
});

test('evaluateCandidateMatch hard-disqualifies marital status mismatch to score 0', () => {
  const divorcedCandidate: ProfileRecord = {
    ...sampleCompatibleBride,
    id: 'GLS-T06',
    maritalStatus: 'divorced',
  };
  const result = evaluateCandidateMatch(samplePrimaryGroom, divorcedCandidate);
  assert.equal(result.isEligible, false);
  assert.equal(result.isMandatorySatisfied, false);
  assert.equal(result.overallScore, 0);
  assert.equal(result.disqualificationReason?.code, 'MANDATORY_MARITAL_STATUS_MISMATCH');
});

test('evaluateCandidateMatch treats unknown/undisclosed mandatory values safely without false matches', () => {
  const undisclosedReligionCandidate: ProfileRecord = {
    ...sampleCompatibleBride,
    id: 'GLS-T07',
    religion: '',
  };
  const result = evaluateCandidateMatch(samplePrimaryGroom, undisclosedReligionCandidate);
  assert.equal(result.isEligible, false);
  assert.equal(result.isMandatorySatisfied, false);
  assert.equal(result.overallScore, 0);
  assert.equal(result.disqualificationReason?.code, 'MANDATORY_RELIGION_UNVERIFIED');

  const religionCrit = result.criteria.find((c) => c.id === 'religion');
  assert.ok(religionCrit);
  assert.equal(religionCrit.result, 'unknown');
  assert.equal(religionCrit.scoreContribution, 0);
  assert.equal(religionCrit.reasonCode, 'RELIGION_UNKNOWN');
});

test('evaluateCandidateMatch handles age boundary cases and 2-year buffer correctly', () => {
  // Age 28 is 2 years outside range 22-26: eligible for 50% partial buffer credit
  const nearAgeCandidate: ProfileRecord = {
    ...sampleCompatibleBride,
    id: 'GLS-T08',
    age: 28,
  };
  const nearResult = evaluateCandidateMatch(samplePrimaryGroom, nearAgeCandidate);
  const nearAgeCrit = nearResult.criteria.find((c) => c.id === 'age');
  assert.ok(nearAgeCrit);
  assert.equal(nearAgeCrit.result, 'partial');
  assert.equal(nearAgeCrit.reasonCode, 'AGE_NEAR_RANGE');
  assert.equal(nearAgeCrit.scoreContribution, nearAgeCrit.weight * 0.5);

  // Age 35 is far outside range 22-26: receives 0 points
  const farAgeCandidate: ProfileRecord = {
    ...sampleCompatibleBride,
    id: 'GLS-T09',
    age: 35,
  };
  const farResult = evaluateCandidateMatch(samplePrimaryGroom, farAgeCandidate);
  const farAgeCrit = farResult.criteria.find((c) => c.id === 'age');
  assert.ok(farAgeCrit);
  assert.equal(farAgeCrit.result, 'mismatched');
  assert.equal(farAgeCrit.reasonCode, 'AGE_OUT_OF_RANGE');
  assert.equal(farAgeCrit.scoreContribution, 0);
});

test('evaluateCandidateMatch handles soft location and caste criteria', () => {
  const differentCityCandidate: ProfileRecord = {
    ...sampleCompatibleBride,
    id: 'GLS-T10',
    currentCity: 'Rawalpindi', // not in ['Lahore', 'Islamabad']
    caste: 'Jat', // different from 'Rajput', importance is 'acceptable_range'
  };
  const result = evaluateCandidateMatch(samplePrimaryGroom, differentCityCandidate);
  // Mandatory criteria still pass, so isMandatorySatisfied is true
  assert.equal(result.isMandatorySatisfied, true);

  const cityCrit = result.criteria.find((c) => c.id === 'city');
  assert.ok(cityCrit);
  assert.equal(cityCrit.result, 'partial');
  assert.equal(cityCrit.reasonCode, 'CITY_DIFFERENT_RELOCATION_POSSIBLE');

  const casteCrit = result.criteria.find((c) => c.id === 'caste');
  assert.ok(casteCrit);
  assert.equal(casteCrit.result, 'partial');
  assert.equal(casteCrit.reasonCode, 'CASTE_DIFFERENT');
});

test('rankCandidatesForProfile deterministically ranks by eligibility, score, criteria count, and tie-breakers', () => {
  const c1: ProfileRecord = {
    ...sampleCompatibleBride,
    id: 'GLS-C01', // Exact match
  };
  const c2: ProfileRecord = {
    ...sampleCompatibleBride,
    id: 'GLS-C02', // Different city (slightly lower score)
    currentCity: 'Multan',
  };
  const c3: ProfileRecord = {
    ...sampleCompatibleBride,
    id: 'GLS-C03', // Religion mismatch (ineligible, score 0)
    religion: 'Christian',
  };
  const c4: ProfileRecord = {
    ...sampleCompatibleBride,
    id: 'GLS-C04', // Identical to c1, but ID GLS-C04 tests tie-breaking with c1
  };

  const ranked = rankCandidatesForProfile(samplePrimaryGroom, [c3, c2, c4, c1]);

  // C3 (ineligible) must be ranked last
  assert.equal(ranked[ranked.length - 1].candidateProfileId, 'GLS-C03');

  // Eligible matches must come first
  assert.equal(ranked[0].isEligible, true);
  assert.equal(ranked[1].isEligible, true);

  // Both c1 and c4 have identical scores; tie-breaker places c1 before c4 by ID ascending
  assert.equal(ranked[0].candidateProfileId, 'GLS-C01');
  assert.equal(ranked[1].candidateProfileId, 'GLS-C04');
  assert.equal(ranked[2].candidateProfileId, 'GLS-C02');
});

test('recordMatchDecision enforces authorization and prevents approving ineligible matches', () => {
  const eligibleEval = evaluateCandidateMatch(samplePrimaryGroom, sampleCompatibleBride);

  // 1. Unauthorized customer cannot record match approval
  const unauthAttempt = recordMatchDecision(eligibleEval, 'approved_by_nadeem', candidateSession);
  assert.equal(unauthAttempt.success, false);
  assert.equal(unauthAttempt.error?.code, 'UNAUTHORIZED');

  // 2. Staff Nadeem can approve eligible match
  const staffApprove = recordMatchDecision(eligibleEval, 'approved_by_nadeem', staffSession, 'Family backgrounds verified.');
  assert.equal(staffApprove.success, true);
  assert.ok(staffApprove.evaluation);
  assert.equal(staffApprove.evaluation.humanDecisionStatus, 'approved_by_nadeem');
  assert.equal(staffApprove.evaluation.reviewedBy, 'nadeem@gulistan.pk');
  assert.equal(staffApprove.evaluation.reviewNotes, 'Family backgrounds verified.');
  assert.ok(staffApprove.evaluation.reviewedAt);

  // 3. Invariant: Staff CANNOT approve an ineligible match where mandatory criteria failed
  const ineligibleBride: ProfileRecord = {
    ...sampleCompatibleBride,
    religion: 'Other',
  };
  const ineligibleEval = evaluateCandidateMatch(samplePrimaryGroom, ineligibleBride);
  const badApproveAttempt = recordMatchDecision(ineligibleEval, 'approved_by_nadeem', staffSession);
  assert.equal(badApproveAttempt.success, false);
  assert.equal(badApproveAttempt.error?.code, 'CANNOT_APPROVE_INELIGIBLE_MATCH');

  // 4. Staff CAN mark ineligible match as deferred or rejected
  const rejectAttempt = recordMatchDecision(ineligibleEval, 'rejected', staffSession, 'Sect divergence.');
  assert.equal(rejectAttempt.success, true);
  assert.equal(rejectAttempt.evaluation?.humanDecisionStatus, 'rejected');
});

test('evaluateCandidateMatch does not fabricate religion, aqeedah, education or marital status defaults (MATCH-01)', () => {
  const unspecifiedPrimary = createTestProfile({
    id: 'GLS-UNSPEC-01',
    gender: 'male',
    religion: '',
    aqeedah: '',
    education: '',
    maritalStatus: undefined as any,
    preferences: {
      ageMin: 20,
      ageMax: 30,
      heightMin: "5'0\"",
      maritalStatus: [],
      religion: '',
      aqeedah: '',
      caste: '',
      educationMin: '',
      preferredOccupations: [],
      cityPreferences: ['Lahore'],
      propertyExpectation: '',
      familyArrangement: 'any',
      criteriaClassifications: {},
    },
  });

  const candidateWithSpecifics = createTestProfile({
    id: 'GLS-CAND-SPEC',
    gender: 'female',
    religion: 'Christian',
    aqeedah: 'Methodist',
    education: 'Matric',
    maritalStatus: 'widowed',
    caste: 'Bhatti',
  });

  const evaluation = evaluateCandidateMatch(unspecifiedPrimary, candidateWithSpecifics);

  // 1. Religion: Must NOT default to 'Islam'
  const relCrit = evaluation.criteria.find((c) => c.id === 'religion');
  assert.ok(relCrit, 'Religion criterion must exist');
  assert.equal(relCrit.primaryValue, 'Not Disclosed');
  assert.equal(relCrit.result, 'unknown');
  assert.equal(relCrit.reasonCode, 'RELIGION_UNKNOWN');
  assert.equal(relCrit.importance, 'not_disclosed');

  // 2. Aqeedah: Must NOT default to 'Sunni / Hanafi'
  const aqCrit = evaluation.criteria.find((c) => c.id === 'aqeedah');
  assert.ok(aqCrit, 'Aqeedah criterion must exist');
  assert.equal(aqCrit.primaryValue, 'Not Disclosed');
  assert.equal(aqCrit.result, 'unknown');
  assert.equal(aqCrit.reasonCode, 'AQEEDAH_UNKNOWN');
  assert.equal(aqCrit.importance, 'not_disclosed');

  // 3. Marital status: Must NOT default to ['never_married']
  const maritalCrit = evaluation.criteria.find((c) => c.id === 'marital_status');
  assert.ok(maritalCrit, 'Marital status criterion must exist');
  assert.equal(maritalCrit.primaryValue, 'Not Disclosed');
  assert.equal(maritalCrit.result, 'unknown');
  assert.equal(maritalCrit.reasonCode, 'MARITAL_STATUS_UNKNOWN');
  assert.equal(maritalCrit.importance, 'not_disclosed');

  // 4. Education: Must NOT default to 'Bachelors'
  const eduCrit = evaluation.criteria.find((c) => c.id === 'education');
  assert.ok(eduCrit, 'Education criterion must exist');
  assert.notEqual(eduCrit.primaryValue, 'Bachelors');
});

test('verifyPreShareEligibility validates all safety invariants before disclosure (MATCH-04)', () => {
  const eligibleEval = evaluateCandidateMatch(samplePrimaryGroom, sampleCompatibleBride);
  const approvedEval = {
    ...eligibleEval,
    humanDecisionStatus: 'approved_by_nadeem' as const,
  };

  // 1. Happy path: passes when active, compatible, and approved by Nadeem
  const passCheck = verifyPreShareEligibility(samplePrimaryGroom, sampleCompatibleBride, approvedEval);
  assert.equal(passCheck.isEligible, true);
  assert.equal(passCheck.details.selfPairCheck, true);
  assert.equal(passCheck.details.genderComplementCheck, true);
  assert.equal(passCheck.details.statusCheck, true);
  assert.equal(passCheck.details.mandatoryCriteriaCheck, true);
  assert.equal(passCheck.details.humanApprovalCheck, true);

  // 2. Rejects self-pairing
  const selfCheck = verifyPreShareEligibility(samplePrimaryGroom, samplePrimaryGroom, approvedEval);
  assert.equal(selfCheck.isEligible, false);
  assert.equal(selfCheck.blockReason?.code, 'SELF_PAIR_PROHIBITED');

  // 3. Rejects same-gender pairing
  const sameGenderCandidate = { ...sampleCompatibleBride, gender: 'male' as const };
  const sameGenderCheck = verifyPreShareEligibility(samplePrimaryGroom, sameGenderCandidate, approvedEval);
  assert.equal(sameGenderCheck.isEligible, false);
  assert.equal(sameGenderCheck.blockReason?.code, 'SAME_GENDER_PROHIBITED');

  // 4. Rejects non-active profile status
  const pendingPrimary = { ...samplePrimaryGroom, status: 'pending_review' as const };
  const statusCheck = verifyPreShareEligibility(pendingPrimary, sampleCompatibleBride, approvedEval);
  assert.equal(statusCheck.isEligible, false);
  assert.equal(statusCheck.blockReason?.code, 'INELIGIBLE_PROFILE_STATUS');

  // 5. Rejects when mandatory criteria failed
  const mismatchBride = { ...sampleCompatibleBride, religion: 'Hindu' };
  const mismatchEval = evaluateCandidateMatch(samplePrimaryGroom, mismatchBride);
  const mandatoryCheck = verifyPreShareEligibility(samplePrimaryGroom, mismatchBride, mismatchEval);
  assert.equal(mandatoryCheck.isEligible, false);
  assert.equal(mandatoryCheck.blockReason?.code, 'MANDATORY_RELIGION_MISMATCH');

  // 6. Rejects when human approval by Nadeem is pending or missing
  const pendingApprovalEval = {
    ...eligibleEval,
    humanDecisionStatus: 'pending_review' as const,
  };
  const unapprovedCheck = verifyPreShareEligibility(samplePrimaryGroom, sampleCompatibleBride, pendingApprovalEval);
  assert.equal(unapprovedCheck.isEligible, false);
  assert.equal(unapprovedCheck.blockReason?.code, 'HUMAN_APPROVAL_REQUIRED');

  // 7. Rejects photo disclosure if photoPermissionGranted is false
  const noPhotoBride = { ...sampleCompatibleBride, photoPermissionGranted: false };
  const photoConsentCheck = verifyPreShareEligibility(
    samplePrimaryGroom,
    noPhotoBride,
    approvedEval,
    { requirePhotoConsent: true }
  );
  assert.equal(photoConsentCheck.isEligible, false);
  assert.equal(photoConsentCheck.blockReason?.code, 'PHOTO_CONSENT_REQUIRED');
});

test('MatchRepository persists cases, evaluations, decisions, and enforces approval invariants (MATCH-03)', async () => {
  resetRepositoriesForTesting();

  // 1. Create or retrieve match case
  const matchCase = await matchRepository.getOrCreateMatchCase('GLS-T01', 'GLS-T02', staffSession);
  assert.ok(matchCase.id);
  assert.equal(matchCase.profileAId, 'GLS-T01');
  assert.equal(matchCase.profileBId, 'GLS-T02');
  assert.equal(matchCase.status, 'suggested');

  // Re-retrieving returns same case (idempotent)
  const caseAgain = await matchRepository.getOrCreateMatchCase('GLS-T02', 'GLS-T01', staffSession);
  assert.equal(caseAgain.id, matchCase.id);

  // Rejects self-pair case
  await assert.rejects(
    () => matchRepository.getOrCreateMatchCase('GLS-T01', 'GLS-T01', staffSession),
    /SELF_PAIR_PROHIBITED/
  );

  // 2. Save deterministic evaluation
  const evaluation = evaluateCandidateMatch(samplePrimaryGroom, sampleCompatibleBride);
  const savedEval = await matchRepository.saveEvaluation(matchCase.id, evaluation, staffSession);
  assert.ok(savedEval.id);
  assert.equal(savedEval.matchCaseId, matchCase.id);
  assert.equal(savedEval.compatibilityScore, evaluation.overallScore);
  assert.equal(savedEval.mandatorySatisfied, true);
  assert.equal(savedEval.algorithmVersion, MATCHING_ALGORITHM_VERSION);
  assert.equal(savedEval.criteriaBreakdown.length, evaluation.criteria.length);

  // 3. Unauthorized customer cannot record decision
  await assert.rejects(
    () => matchRepository.recordDecision(matchCase.id, 'approved', 'MUTUAL_ALIGNMENT', candidateSession),
    /UNAUTHORIZED/
  );

  // 4. Staff records approved decision
  const decision = await matchRepository.recordDecision(
    matchCase.id,
    'approved',
    'MUTUAL_ALIGNMENT',
    staffSession,
    'Family background confirmed.'
  );
  assert.ok(decision.id);
  assert.equal(decision.decision, 'approved');
  assert.equal(decision.reasonCode, 'MUTUAL_ALIGNMENT');
  assert.equal(decision.notes, 'Family background confirmed.');

  // Verify match case status updated to 'approved_by_nadeem'
  const history = await matchRepository.getCaseHistory(matchCase.id, staffSession);
  assert.ok(history);
  assert.equal(history.matchCase.status, 'approved_by_nadeem');
  assert.equal(history.evaluations.length, 1);
  assert.equal(history.decisions.length, 1);

  // 5. Invariant: Cannot approve a match case where mandatory criteria failed
  const case2 = await matchRepository.getOrCreateMatchCase('GLS-T01', 'GLS-T04', staffSession);
  const badEval = evaluateCandidateMatch(samplePrimaryGroom, {
    ...sampleCompatibleBride,
    id: 'GLS-T04',
    religion: 'Other',
  });
  await matchRepository.saveEvaluation(case2.id, badEval, staffSession);

  await assert.rejects(
    () => matchRepository.recordDecision(case2.id, 'approved', 'FORCE_APPROVE', staffSession),
    /CANNOT_APPROVE_INELIGIBLE_MATCH/
  );
});
