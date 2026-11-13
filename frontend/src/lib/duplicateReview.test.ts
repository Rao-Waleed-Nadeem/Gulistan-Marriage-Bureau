import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePhoneNumber,
  normalizePersonName,
  checkDuplicateProfile,
  DuplicateReviewCandidate,
} from './duplicateReview';
import { ProfileRecord } from '../types';

test('normalizePhoneNumber: normalizes varied Pakistani phone formats', () => {
  assert.equal(normalizePhoneNumber('0300 1234567'), '923001234567');
  assert.equal(normalizePhoneNumber('0300-1234567'), '923001234567');
  assert.equal(normalizePhoneNumber('+92 300 1234567'), '923001234567');
  assert.equal(normalizePhoneNumber('00923001234567'), '00923001234567');
  assert.equal(normalizePhoneNumber(''), '');
  assert.equal(normalizePhoneNumber(null), '');
});

test('normalizePersonName: strips common Pakistani honorifics and punctuation', () => {
  assert.equal(normalizePersonName('Dr. Muhammad Ali'), 'muhammad ali');
  assert.equal(normalizePersonName('Engr. Bilal Chaudhry'), 'bilal');
  assert.equal(normalizePersonName('Hafiz Usman'), 'usman');
  assert.equal(normalizePersonName('Syed Farhan'), 'farhan');
  assert.equal(normalizePersonName('Advocate Ch. Tariq'), 'tariq');
  assert.equal(normalizePersonName('  Zahra   Batool  '), 'zahra batool');
  assert.equal(normalizePersonName(undefined), '');
});

test('checkDuplicateProfile: detects suspected duplicate by identical phone number', () => {
  const existing: DuplicateReviewCandidate[] = [
    {
      id: 'GLS-401',
      fullName: 'Ayesha Khan',
      displayName: 'Ayesha K.',
      gender: 'female',
      age: 25,
      maritalStatus: 'never_married',
      religion: 'Islam',
      aqeedah: 'Sunni',
      caste: 'Rajput',
      education: 'Bachelors',
      educationField: 'CS',
      occupation: 'Software Engineer',
      jobTitle: 'Developer',
      hometown: 'Lahore',
      currentCity: 'Lahore',
      residenceArea: 'Gulberg',
      contactPerson: 'Father',
      contactPhone: '+92 300 1234567',
      status: 'active',
    },
  ];

  const candidate: Partial<ProfileRecord> = {
    fullName: 'Ayesha K.',
    contactPhone: '0300-1234567', // Same normalized phone
    gender: 'female',
    age: 25,
    currentCity: 'Lahore',
  };

  const result = checkDuplicateProfile(candidate, existing);
  assert.equal(result.isSuspectedDuplicate, true);
  assert.ok(result.confidenceScore >= 60, 'Should have score >= 60 due to phone match');
  assert.equal(result.matchedProfileId, 'GLS-401');
  assert.ok(result.reasons.some((r) => r.field === 'contactPhone'));
  assert.ok(result.reasons.some((r) => r.en.includes('Identical contact phone')));
});

test('checkDuplicateProfile: detects suspected duplicate by demographic fingerprint', () => {
  const existing: DuplicateReviewCandidate[] = [
    {
      id: 'GLS-402',
      fullName: 'Muhammad Usman Tariq',
      displayName: 'Usman T.',
      gender: 'male',
      age: 28,
      maritalStatus: 'never_married',
      religion: 'Islam',
      aqeedah: 'Sunni',
      caste: 'Arain',
      education: 'Masters',
      educationField: 'Engineering',
      occupation: 'Engineer',
      jobTitle: 'Civil Engineer',
      hometown: 'Faisalabad',
      currentCity: 'Faisalabad',
      residenceArea: 'Peoples Colony',
      contactPerson: 'Brother',
      contactPhone: '+92 321 9876543',
      status: 'active',
    },
  ];

  // Different phone, but matching normalized name, gender, age (+/- 1 yr), and city
  const candidate: Partial<ProfileRecord> = {
    fullName: 'Usman Tariq',
    gender: 'male',
    age: 28,
    currentCity: 'Faisalabad',
    contactPhone: '+92 333 1122334',
  };

  const result = checkDuplicateProfile(candidate, existing);
  assert.equal(result.isSuspectedDuplicate, true);
  assert.ok(result.confidenceScore >= 50, 'Demographic match should score >= 50');
  assert.equal(result.matchedProfileId, 'GLS-402');
  assert.ok(result.reasons.some((r) => r.field === 'fullName'));
  assert.ok(result.reasons.some((r) => r.field === 'demographics'));
});

test('checkDuplicateProfile: passes cleanly for unique candidates', () => {
  const existing: DuplicateReviewCandidate[] = [
    {
      id: 'GLS-401',
      fullName: 'Ayesha Khan',
      displayName: 'Ayesha K.',
      gender: 'female',
      age: 25,
      maritalStatus: 'never_married',
      religion: 'Islam',
      aqeedah: 'Sunni',
      caste: 'Rajput',
      education: 'Bachelors',
      educationField: 'CS',
      occupation: 'Software Engineer',
      jobTitle: 'Developer',
      hometown: 'Lahore',
      currentCity: 'Lahore',
      residenceArea: 'Gulberg',
      contactPerson: 'Father',
      contactPhone: '+92 300 1234567',
      status: 'active',
    },
  ];

  const uniqueCandidate: Partial<ProfileRecord> = {
    fullName: 'Bilal Ahmed',
    gender: 'male',
    age: 30,
    currentCity: 'Islamabad',
    contactPhone: '+92 345 5566778',
  };

  const result = checkDuplicateProfile(uniqueCandidate, existing);
  assert.equal(result.isSuspectedDuplicate, false);
  assert.equal(result.confidenceScore, 0);
  assert.equal(result.matchedProfileId, undefined);
  assert.equal(result.reasons.length, 0);
});

test('checkDuplicateProfile: ignores self-comparison when updating existing profile', () => {
  const existing: DuplicateReviewCandidate[] = [
    {
      id: 'GLS-401',
      fullName: 'Ayesha Khan',
      displayName: 'Ayesha K.',
      gender: 'female',
      age: 25,
      maritalStatus: 'never_married',
      religion: 'Islam',
      aqeedah: 'Sunni',
      caste: 'Rajput',
      education: 'Bachelors',
      educationField: 'CS',
      occupation: 'Software Engineer',
      jobTitle: 'Developer',
      hometown: 'Lahore',
      currentCity: 'Lahore',
      residenceArea: 'Gulberg',
      contactPerson: 'Father',
      contactPhone: '+92 300 1234567',
      status: 'active',
    },
  ];

  const updatingCandidate: Partial<ProfileRecord> = {
    id: 'GLS-401',
    fullName: 'Ayesha Khan',
    contactPhone: '+92 300 1234567',
  };

  const result = checkDuplicateProfile(updatingCandidate, existing);
  assert.equal(result.isSuspectedDuplicate, false);
  assert.equal(result.confidenceScore, 0);
});
