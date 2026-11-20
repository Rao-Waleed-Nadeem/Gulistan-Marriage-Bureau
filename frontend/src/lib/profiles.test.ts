import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseHeightToInches,
  formatInchesToHeight,
  generateReferenceCode,
  validateProfileInput,
  validateSiblingRecord,
  validatePropertyDetails,
  enrichPropertyDetails,
  canTransitionStatus,
  sanitizeProfileForRole,
  profileDTOToRow,
  profileRowToDTO,
  profilePreferencesRowToDTO,
  profilePreferencesDTOToRow,
  profileSiblingRowToDTO,
  profileSiblingDTOToRow,
  profilePropertyRowToDTO,
  profilePropertyDTOToRow,
  fetchProfiles,
  createProfile,
  updateProfileStatus,
  resetDemoProfilesForTesting,
  ProfileRow,
  ProfilePreferencesRow,
  ProfileSiblingRow,
  ProfilePropertyRow,
} from './profiles';
import { ProfileRecord } from '../types';
import { AuthSession } from './auth';

const sampleValidDTO: Partial<ProfileRecord> = {
  fullName: 'Tariq Mehmood',
  displayName: 'Tariq M.',
  gender: 'male',
  age: 28,
  height: "5'10\"",
  maritalStatus: 'never_married',
  religion: 'Islam',
  aqeedah: 'Sunni / Hanafi',
  caste: 'Rajput',
  education: 'Bachelors in Engineering',
  educationField: 'Mechanical',
  occupation: 'Design Engineer',
  jobTitle: 'Lead CAD Engineer',
  monthlyIncomePKR: 180000,
  hometown: 'Faisalabad',
  currentCity: 'Lahore',
  residenceArea: 'Model Town',
  contactPerson: 'Chaudhry Mehmood (Father)',
  contactPhone: '+92 300 1234567',
  contactEmail: 'tariq.family@example.com',
  preferredContactMethod: 'whatsapp',
  photoPermissionGranted: true,
};

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
    displayName: 'Family Representative',
    role: 'customer',
    preferredLanguage: 'ur',
  },
  role: 'customer',
  token: 'mock-customer-token',
  expiresAt: Date.now() + 3600000,
  isAuthenticated: true,
};

test('Height conversion helpers handle feet/inches strings and conversions', () => {
  assert.equal(parseHeightToInches("5'4\""), 64);
  assert.equal(parseHeightToInches("6'1\""), 73);
  assert.equal(parseHeightToInches("5'0\""), 60);
  assert.equal(formatInchesToHeight(64), "5'4\"");
  assert.equal(formatInchesToHeight(73), "6'1\"");
});

test('validateProfileInput succeeds on complete valid profile payload', () => {
  const result = validateProfileInput(sampleValidDTO);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('validateProfileInput detects invariant violations (age, gender, income, phone)', () => {
  // Age under 18
  const underAge = validateProfileInput({ ...sampleValidDTO, age: 17 });
  assert.equal(underAge.valid, false);
  assert.ok(underAge.errors.some((e) => e.field === 'age'));

  // Age over 100
  const overAge = validateProfileInput({ ...sampleValidDTO, age: 105 });
  assert.equal(overAge.valid, false);
  assert.ok(overAge.errors.some((e) => e.field === 'age'));

  // Negative Income
  const negativeIncome = validateProfileInput({ ...sampleValidDTO, monthlyIncomePKR: -5000 });
  assert.equal(negativeIncome.valid, false);
  assert.ok(negativeIncome.errors.some((e) => e.field === 'monthlyIncomePKR'));

  // Invalid Gender
  const badGender = validateProfileInput({ ...sampleValidDTO, gender: 'other' as any });
  assert.equal(badGender.valid, false);
  assert.ok(badGender.errors.some((e) => e.field === 'gender'));

  // Empty Name with Bilingual Error
  const emptyName = validateProfileInput({ ...sampleValidDTO, fullName: '' });
  assert.equal(emptyName.valid, false);
  const nameErr = emptyName.errors.find((e) => e.field === 'fullName');
  assert.ok(nameErr?.messageEn.length! > 0);
  assert.ok(nameErr?.messageUrdu.length! > 0);
});

test('profileDTOToRow and profileRowToDTO accurately translate between DTO and database row', () => {
  const row = profileDTOToRow(sampleValidDTO, 'usr-test-123');
  assert.equal(row.full_name, 'Tariq Mehmood');
  assert.equal(row.monthly_income_pkr, 180000);
  assert.equal(row.height_inches, 70); // 5'10" = 70 in
  assert.equal(row.created_by, 'usr-test-123');

  const reconstructedDTO = profileRowToDTO(row as ProfileRow);
  assert.equal(reconstructedDTO.fullName, 'Tariq Mehmood');
  assert.equal(reconstructedDTO.monthlyIncomePKR, 180000);
  assert.equal(reconstructedDTO.height, "5'10\"");
});

test('canTransitionStatus enforces state machine graph and blocks illegal transitions', () => {
  // Valid transitions for staff
  assert.equal(canTransitionStatus('pending_review', 'approved', 'nadeem').allowed, true);
  assert.equal(canTransitionStatus('approved', 'active', 'nadeem').allowed, true);
  assert.equal(canTransitionStatus('active', 'introduction_authorized', 'admin').allowed, true);
  assert.equal(canTransitionStatus('active', 'inactive', 'nadeem').allowed, true);
  assert.equal(canTransitionStatus('inactive', 'pending_review', 'admin').allowed, true);
  assert.equal(canTransitionStatus('restricted', 'pending_review', 'admin').allowed, true);

  // Illegal transitions (cannot jump straight to introduction_authorized without approval)
  const illegalJump = canTransitionStatus('pending_review', 'introduction_authorized', 'nadeem');
  assert.equal(illegalJump.allowed, false);
  assert.ok(illegalJump.reasonEn);
  assert.ok(illegalJump.reasonUrdu);

  // Non-staff actors are completely blocked from changing review status
  const customerBlocked = canTransitionStatus('pending_review', 'approved', 'customer');
  assert.equal(customerBlocked.allowed, false);

  const publicBlocked = canTransitionStatus('pending_review', 'approved', 'public');
  assert.equal(publicBlocked.allowed, false);
});

test('sanitizeProfileForRole scrubs sensitive private details for unauthorized callers', () => {
  const mockProfile: ProfileRecord = {
    ...sampleValidDTO as ProfileRecord,
    id: 'GLS-101',
    internalNotes: 'Confidential staff note: Family requires prompt follow up.',
  };

  // Staff sees everything
  const staffView = sanitizeProfileForRole(mockProfile, 'nadeem');
  assert.equal(staffView.contactPhone, '+92 300 1234567');
  assert.equal(staffView.internalNotes, 'Confidential staff note: Family requires prompt follow up.');

  // Owner sees own phone, but not internal bureau notes
  const ownerView = sanitizeProfileForRole(mockProfile, 'customer', true);
  assert.equal(ownerView.contactPhone, '+92 300 1234567');
  assert.equal(ownerView.internalNotes, undefined);

  // Third-party viewer (other customer or public) has sensitive fields completely scrubbed
  const publicView = sanitizeProfileForRole(mockProfile, 'public', false);
  assert.equal(publicView.fullName, mockProfile.displayName);
  assert.ok(publicView.contactPhone.includes('Protected Phone'));
  assert.equal(publicView.contactEmail, undefined);
  assert.equal(publicView.internalNotes, undefined);
  assert.equal(publicView.residenceArea, mockProfile.currentCity);
});

test('createProfile enforces staff role authorization and adds to demo repository', async () => {
  resetDemoProfilesForTesting();

  // Public/unauthenticated caller cannot create profiles (fails closed)
  const unauthRes = await createProfile(sampleValidDTO, null);
  assert.equal(unauthRes.success, false);
  assert.equal(unauthRes.data, null);

  // Customer cannot create profile directly (concierge intake policy)
  const custRes = await createProfile(sampleValidDTO, customerSession);
  assert.equal(custRes.success, false);

  // Staff (Nadeem) creates candidate profile
  const staffRes = await createProfile(sampleValidDTO, staffSession);
  assert.equal(staffRes.success, true);
  assert.ok(staffRes.data);
  assert.equal(staffRes.data?.fullName, 'Tariq Mehmood');
  assert.equal(staffRes.data?.status, 'pending_review');

  // Verify fetchProfiles returns the newly created profile
  const list = await fetchProfiles(staffSession);
  assert.equal(list.success, true);
  assert.ok(list.data.some((p) => p.fullName === 'Tariq Mehmood'));
});

test('updateProfileStatus enforces transition validation on repository records', async () => {
  resetDemoProfilesForTesting();

  // Initially GLS-404 is active in mockData. Transition to introduction_authorized is valid:
  const updateRes = await updateProfileStatus('GLS-404', 'introduction_authorized', staffSession);
  assert.equal(updateRes.success, true);
  assert.equal(updateRes.previousStatus, 'active');
  assert.equal(updateRes.newStatus, 'introduction_authorized');

  // Attempting an illegal transition from introduction_authorized to pending_review fails
  const illegalRes = await updateProfileStatus('GLS-404', 'pending_review', staffSession);
  assert.equal(illegalRes.success, false);
  assert.equal(illegalRes.error?.code, 'INVALID_TRANSITION');
});

test('validateSiblingRecord enforces valid Pakistani matrimonial sibling invariants (OPEN-011)', () => {
  // Valid sibling
  const validSib = validateSiblingRecord({
    relation: 'brother',
    age: 26,
    maritalStatus: 'married',
    occupation: 'Doctor',
    childrenCount: 1,
  });
  assert.equal(validSib.length, 0);

  // Invalid relation
  const invalidRel = validateSiblingRecord({ relation: 'cousin' as any });
  assert.ok(invalidRel.some((e) => e.code === 'INVALID_SIBLING_RELATION'));

  // Negative children count
  const negChildren = validateSiblingRecord({ relation: 'sister', childrenCount: -2 });
  assert.ok(negChildren.some((e) => e.code === 'INVALID_CHILDREN_COUNT'));

  // Invalid age
  const invalidAge = validateSiblingRecord({ relation: 'brother', age: 150 });
  assert.ok(invalidAge.some((e) => e.code === 'INVALID_SIBLING_AGE'));
});

test('validatePropertyDetails and enrichPropertyDetails handle Pakistani land units (OPEN-011)', () => {
  // Valid property
  const validProp = validatePropertyDetails({
    ownership: 'owned',
    propertyType: 'house',
    areaMarlas: 10,
    approxValuePKR: 35000000,
  });
  assert.equal(validProp.length, 0);

  // Negative marlas
  const negMarlas = validatePropertyDetails({ areaMarlas: -5 });
  assert.ok(negMarlas.some((e) => e.code === 'INVALID_PROPERTY_AREA'));

  // Negative PKR value
  const negVal = validatePropertyDetails({ approxValuePKR: -100000 });
  assert.ok(negVal.some((e) => e.code === 'INVALID_PROPERTY_VALUE'));

  // enrichPropertyDetails converts 25 Marlas to 1 Kanal, 5 Marla (20 Marla = 1 Kanal)
  const enriched = enrichPropertyDetails({
    ownership: 'owned',
    propertyType: 'house',
    areaMarlas: 25,
    city: 'Lahore',
    locality: 'DHA Phase 5',
    householdArrangement: 'independent',
  });
  assert.equal(enriched.areaKanalDisplay, '1 Kanal, 5 Marla');
  assert.equal(enriched.areaKanalDisplayUrdu, '1 کنال، 5 مرلہ');
});

test('sanitizeProfileForRole scrubs sibling real names and exact property values for third parties (OPEN-011)', () => {
  const fullProfile: ProfileRecord = {
    ...sampleValidDTO,
    id: 'GLS-TEST-1',
    fullName: 'Hamza Tariq',
    displayName: 'Hamza T.',
    siblings: [
      {
        id: 'sib-1',
        relation: 'brother',
        name: 'Bilal Tariq',
        maritalStatus: 'married',
        occupation: 'Software Engineer',
        marriageDetails: 'Married into Arain family in Faisalabad',
      },
    ],
    property: {
      ownership: 'owned',
      propertyType: 'house',
      areaMarlas: 10,
      approxValuePKR: 45000000,
      city: 'Lahore',
      locality: 'Johar Town Block G',
      householdArrangement: 'independent',
    },
  } as ProfileRecord;

  // Staff sees everything
  const staffView = sanitizeProfileForRole(fullProfile, 'nadeem');
  assert.equal(staffView.siblings[0].name, 'Bilal Tariq');
  assert.ok(staffView.property);
  assert.equal(staffView.property.approxValuePKR, 45000000);
  assert.equal(staffView.property.locality, 'Johar Town Block G');

  // Third-party customer has sensitive details scrubbed
  const publicView = sanitizeProfileForRole(fullProfile, 'customer', false);
  assert.equal(publicView.siblings[0].name, undefined); // Real sibling name scrubbed
  assert.equal(publicView.siblings[0].marriageDetails, undefined); // In-law details scrubbed
  assert.equal(publicView.siblings[0].relation, 'brother'); // Relation preserved
  assert.ok(publicView.property);
  assert.equal(publicView.property.approxValuePKR, undefined); // Exact net worth scrubbed
  assert.equal(publicView.property.locality, '[Disclosed upon introduction]');
});

test('generateReferenceCode produces collision-resistant identifiers (P1-14)', () => {
  const codes = new Set<string>();
  for (let i = 0; i < 500; i++) {
    const code = generateReferenceCode();
    assert.match(code, /^GLS-[0-9A-Z]{6}$/, 'Must match GLS- prefix with 6 alphanumeric chars');
    assert.equal(codes.has(code), false, `Collision detected on iteration ${i}: ${code}`);
    codes.add(code);
  }
  assert.equal(codes.size, 500);
});

test('Bidirectional child table DTO converters translate between snake_case and camelCase (P1-10, P1-11, P1-12)', () => {
  // 1. Preferences conversion
  const prefRow: ProfilePreferencesRow = {
    id: 'pref-001',
    profile_id: 'prof-001',
    age_min: 22,
    age_max: 28,
    height_min_inches: 64,
    height_max_inches: null,
    marital_status: 'never_married',
    religion: 'Islam',
    aqeedah: 'Sunni / Hanafi',
    caste: 'Rajput',
    education: 'Masters',
    occupations: ['Software Engineer', 'Data Scientist'],
    cities: ['Lahore', 'Islamabad'],
    property_expectation: 'Owned Home',
    family_arrangement: 'independent',
    lifestyle_notes: 'Values family gatherings and career development.',
    criteria_classifications: { religion: 'mandatory', caste: 'preferred' },
  };

  const prefDTO = profilePreferencesRowToDTO(prefRow);
  assert.equal(prefDTO.ageMin, 22);
  assert.equal(prefDTO.ageMax, 28);
  assert.equal(prefDTO.heightMin, '5\'4"');
  assert.deepEqual(prefDTO.maritalStatus, ['never_married']);
  assert.deepEqual(prefDTO.preferredOccupations, ['Software Engineer', 'Data Scientist']);
  assert.deepEqual(prefDTO.cityPreferences, ['Lahore', 'Islamabad']);
  assert.equal(prefDTO.familyArrangement, 'independent');
  assert.equal(prefDTO.lifestyleNotes, 'Values family gatherings and career development.');

  const reRowPref = profilePreferencesDTOToRow(prefDTO, 'prof-001');
  assert.equal(reRowPref.age_min, 22);
  assert.equal(reRowPref.age_max, 28);
  assert.equal(reRowPref.height_min_inches, 64);
  assert.equal(reRowPref.marital_status, 'never_married');
  assert.deepEqual(reRowPref.occupations, ['Software Engineer', 'Data Scientist']);
  assert.deepEqual(reRowPref.cities, ['Lahore', 'Islamabad']);

  // 2. Sibling conversion
  const sibRow: ProfileSiblingRow = {
    id: 'sib-001',
    profile_id: 'prof-001',
    relation: 'sister',
    name: 'Ayesha Tariq',
    gender: 'female',
    age: 26,
    marital_status: 'married',
    occupation: 'Dentist',
    education: 'BDS',
    marriage_details: 'Married into civil service family in Islamabad',
    spouse_family_details: 'Father-in-law retired federal secretary',
    children_count: 1,
  };

  const sibDTO = profileSiblingRowToDTO(sibRow);
  assert.equal(sibDTO.relation, 'sister');
  assert.equal(sibDTO.name, 'Ayesha Tariq');
  assert.equal(sibDTO.age, 26);
  assert.equal(sibDTO.maritalStatus, 'married');
  assert.equal(sibDTO.education, 'BDS');
  assert.equal(sibDTO.marriageDetails, 'Married into civil service family in Islamabad');
  assert.equal(sibDTO.spouseFamilyDetails, 'Father-in-law retired federal secretary');
  assert.equal(sibDTO.childrenCount, 1);

  const reRowSib = profileSiblingDTOToRow(sibDTO, 'prof-001');
  assert.equal(reRowSib.relation, 'sister');
  assert.equal(reRowSib.gender, 'female');
  assert.equal(reRowSib.age, 26);
  assert.equal(reRowSib.education, 'BDS');
  assert.equal(reRowSib.children_count, 1);

  // 3. Property conversion
  const propRow: ProfilePropertyRow = {
    id: 'prop-001',
    profile_id: 'prof-001',
    ownership: 'family_owned',
    property_type: 'house',
    area_marlas: 25,
    area_kanal_display: '1 Kanal 5 Marla',
    approx_value_pkr: 75000000,
    city: 'Rawalpindi',
    locality: 'Bahria Town Phase 4',
    household_arrangement: 'joint_family',
  };

  const propDTO = profilePropertyRowToDTO(propRow);
  assert.equal(propDTO.ownership, 'family_owned');
  assert.equal(propDTO.propertyType, 'house');
  assert.equal(propDTO.areaMarlas, 25);
  assert.equal(propDTO.approxValuePKR, 75000000);
  assert.equal(propDTO.householdArrangement, 'joint_family');

  const reRowProp = profilePropertyDTOToRow(propDTO, 'prof-001');
  assert.equal(reRowProp.ownership, 'family_owned');
  assert.equal(reRowProp.area_marlas, 25);
  assert.equal(reRowProp.approx_value_pkr, 75000000);
  assert.equal(reRowProp.household_arrangement, 'joint_family');
});

test('profileRowToDTO: strictly preserves absent property as undefined without fabrication (P1-09)', () => {
  const bareRow: ProfileRow = {
    id: '11111111-2222-3333-4444-555555555555',
    reference_code: 'GLS-999',
    account_id: 'usr-customer-123',
    created_by: 'usr-customer-123',
    full_name: 'Zainab Bibi',
    display_name: 'Zainab B.',
    gender: 'female',
    age: 23,
    dob: null,
    height_inches: 63,
    height_display: "5'3\"",
    marital_status: 'never_married',
    religion: 'Islam',
    aqeedah: 'Sunni',
    caste: 'Arain',
    sub_caste: null,
    education_level: 'Bachelors',
    education_field: 'Computer Science',
    occupation: 'Software Engineer',
    job_title: 'Frontend Engineer',
    company_or_sector: 'Tech Corp',
    monthly_income_pkr: 150000,
    hometown: 'Faisalabad',
    current_city: 'Lahore',
    residence_area: 'Model Town',
    status: 'pending_review',
    source: 'direct_web',
    assigned_matchmaker_id: null,
    contact_person: 'Self',
    contact_phone: '+92 300 1122334',
    contact_email: 'zainab@example.com',
    preferred_contact_method: 'whatsapp',
    photo_permission_granted: false,
    representative_consent_certified: true,
    internal_notes: null,
    created_at: '2026-11-20T00:00:00Z',
    updated_at: '2026-11-20T00:00:00Z',
  };

  // Convert without nested property details
  const dtoWithoutProperty = profileRowToDTO(bareRow, {
    preferences: undefined,
    property: undefined,
    siblings: [],
  });

  // Verify P1-09 invariant: property must NOT be fabricated into house/0-marla/independent
  assert.equal(dtoWithoutProperty.property, undefined, 'Absent property must remain undefined');
  assert.equal(dtoWithoutProperty.databaseId, '11111111-2222-3333-4444-555555555555');
  assert.equal(dtoWithoutProperty.referenceCode, 'GLS-999');
  assert.equal(dtoWithoutProperty.accountId, 'usr-customer-123');
  assert.equal(dtoWithoutProperty.createdBy, 'usr-customer-123');
});

