import test from 'node:test';
import assert from 'node:assert/strict';
import { convertMarlaToKanal } from './units';
import { evaluateMatchCriteria, CriterionCheck } from './matchmaker';
import { generateWhatsAppMessage, CandidateProfileData, DisclosureOptions } from './whatsapp';
import { calculateMatchmakerLedger, FinancialTransaction, formatPKR } from './finance';

test('convertMarlaToKanal handles standard 25 marla conversion (20 marla per kanal)', () => {
  const result = convertMarlaToKanal(25, 20);
  assert.equal(result.kanal, 1);
  assert.equal(result.remainingMarla, 5);
  assert.equal(result.formattedEn, '1 Kanal, 5 Marla');
  assert.equal(result.formattedUrdu, '1 کنال، 5 مرلہ');
  assert.equal(result.sqFtEquivalent, 25 * 225);
});

test('convertMarlaToKanal handles exact kanal division', () => {
  const result = convertMarlaToKanal(40, 20);
  assert.equal(result.kanal, 2);
  assert.equal(result.remainingMarla, 0);
  assert.equal(result.formattedEn, '2 Kanal');
});

test('convertMarlaToKanal handles sub-kanal values', () => {
  const result = convertMarlaToKanal(10, 20);
  assert.equal(result.kanal, 0);
  assert.equal(result.remainingMarla, 10);
  assert.equal(result.formattedEn, '10 Marla');
});

test('evaluateMatchCriteria computes weighted score and mandatory satisfaction', () => {
  const criteria: CriterionCheck[] = [
    {
      id: 'c1',
      nameEn: 'Religion / Sect',
      nameUrdu: 'مذہب و مسلک',
      candidateValue: 'Sunni / Hanafi',
      expectedValue: 'Sunni / Hanafi',
      importance: 'mandatory',
      isSatisfied: true,
      status: 'matched',
    },
    {
      id: 'c2',
      nameEn: 'Education',
      nameUrdu: 'تعلیم',
      candidateValue: 'MSc Computer Science',
      expectedValue: 'Masters',
      importance: 'preferred',
      isSatisfied: true,
      status: 'matched',
    },
    {
      id: 'c3',
      nameEn: 'City',
      nameUrdu: 'شہر',
      candidateValue: 'Lahore',
      expectedValue: 'Islamabad',
      importance: 'acceptable_range',
      isSatisfied: false,
      status: 'mismatched',
    },
  ];

  const analysis = evaluateMatchCriteria(criteria);
  assert.equal(analysis.isMandatorySatisfied, true);
  assert.equal(analysis.matchedCount, 2);
  assert.equal(analysis.mismatchedCount, 1);
  assert.ok(analysis.scorePercentage > 50);
});

test('evaluateMatchCriteria detects failed mandatory criterion', () => {
  const criteria: CriterionCheck[] = [
    {
      id: 'c1',
      nameEn: 'Marital Status',
      nameUrdu: 'ازدواجی حیثیت',
      candidateValue: 'Divorced',
      expectedValue: 'Never Married',
      importance: 'mandatory',
      isSatisfied: false,
      status: 'mismatched',
    },
  ];

  const analysis = evaluateMatchCriteria(criteria);
  assert.equal(analysis.isMandatorySatisfied, false);
  assert.ok(analysis.summaryEn.includes('Mandatory requirement gap'));
});

test('generateWhatsAppMessage omits sensitive fields when unchecked', () => {
  const candidate: CandidateProfileData = {
    id: 'GLS-409',
    name: 'Dr. Fatima Tariq',
    gender: 'female',
    age: 26,
    height: "5'4\"",
    education: 'MBBS, King Edward',
    occupation: 'Doctor / Medical Officer',
    salary: '₨ 250,000 / month',
    city: 'Lahore (DHA Phase 5)',
    caste: 'Sheikh',
    sect: 'Sunni',
    familySummary: 'Father Chief Engineer (Retd), 2 Brothers both software engineers',
    propertySummary: '1 Kanal independent house in DHA',
    contactNumber: '+92 300 1234567',
  };

  const options: DisclosureOptions = {
    includeRefNumber: true,
    includeName: false, // Hidden for initial discretion
    includeAge: true,
    includeHeight: true,
    includeEducation: true,
    includeOccupation: true,
    includeSalary: false, // Withheld
    includeCity: true,
    includeCaste: true,
    includeSect: true,
    includeFamilySummary: true,
    includePropertySummary: true,
    includeContactNumber: false, // Discretionary
  };

  const urduMsg = generateWhatsAppMessage(candidate, options, 'ur');
  assert.ok(urduMsg.includes('GLS-409'));
  assert.ok(!urduMsg.includes('Dr. Fatima Tariq'), 'Name should be concealed');
  assert.ok(!urduMsg.includes('250,000'), 'Salary should be withheld');
  assert.ok(!urduMsg.includes('+92 300 1234567'), 'Contact should be withheld');
  assert.ok(urduMsg.includes('Lahore'), 'City should be present');

  const enMsg = generateWhatsAppMessage(candidate, options, 'en');
  assert.ok(enMsg.includes('GLS-409'));
  assert.ok(!enMsg.includes('Dr. Fatima Tariq'));
  assert.ok(enMsg.includes('MBBS, King Edward'));
});

test('calculateMatchmakerLedger accurately computes pending payable and receivable', () => {
  const transactions: FinancialTransaction[] = [
    {
      id: 'tx-1',
      matchmakerId: 'mm-101',
      matchmakerName: 'Haji Aslam (Multan)',
      date: '2026-10-15',
      type: 'payable',
      amount: 15000,
      description: 'Referral commission for candidate proposal',
      status: 'pending',
    },
    {
      id: 'tx-2',
      matchmakerId: 'mm-101',
      matchmakerName: 'Haji Aslam (Multan)',
      date: '2026-10-18',
      type: 'receivable',
      amount: 5000,
      description: 'Shared bureau registration fee share',
      status: 'pending',
    },
    {
      id: 'tx-3',
      matchmakerId: 'mm-101',
      matchmakerName: 'Haji Aslam (Multan)',
      date: '2026-10-01',
      type: 'payable',
      amount: 20000,
      description: 'Old settlement',
      status: 'settled', // Should be ignored in pending
    },
  ];

  const ledger = calculateMatchmakerLedger('mm-101', 'Haji Aslam (Multan)', transactions);
  assert.equal(ledger.totalOwedToAgent, 15000);
  assert.equal(ledger.totalOwedByAgent, 5000);
  assert.equal(ledger.netBalance, 10000);
  assert.equal(formatPKR(10000), '₨ 10,000');
});
