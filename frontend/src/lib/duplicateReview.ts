/**
 * Duplicate Profile Review & Detection Engine — Gulistan Marriage Bureau
 * 
 * ARCHITECTURAL INVARIANTS:
 * 1. Human-Gated Deduplication: Never automatically merges or deletes candidate profiles.
 *    Provides scoring and evidence for Nadeem Ahmed's explicit review (PROF-05).
 * 2. Deterministic Matching: Matches on normalized phone numbers, contact emails, and
 *    demographic fingerprints (normalized name, gender, age, city).
 * 3. Provenance & Audit: Tracks match reasons with localized explanations.
 */

import { ProfileRecord } from '../types';

export interface DuplicateMatchReason {
  field: string;
  en: string;
  ur: string;
  weight: number;
}

export interface DuplicateDetectionResult {
  isSuspectedDuplicate: boolean;
  confidenceScore: number; // 0 - 100
  matchedProfileId?: string;
  matchedProfileName?: string;
  reasons: DuplicateMatchReason[];
}

/**
 * Normalizes Pakistani phone numbers to standard E.164 (+923001234567) or pure digits.
 */
export function normalizePhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('03') && cleaned.length === 11) {
    return `92${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith('923') && cleaned.length === 12) {
    return cleaned;
  }
  return cleaned;
}

/**
 * Normalizes names by trimming, converting to lower case, and removing honorifics.
 */
export function normalizePersonName(name?: string | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(dr|engr|mr|mrs|miss|syed|chaudhry|ch|hafiz|hafiza|advocate)\.?\b/g, '')
    .replace(/[^a-z\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export type DuplicateReviewCandidate = Pick<ProfileRecord, 'id' | 'fullName'> & Partial<ProfileRecord>;

/**
 * Checks a candidate profile against an existing registry for duplicate candidates.
 */
export function checkDuplicateProfile(
  candidate: Partial<ProfileRecord>,
  existingRegistry: Array<DuplicateReviewCandidate>
): DuplicateDetectionResult {
  const candPhone = normalizePhoneNumber(candidate.contactPhone);
  const candEmail = candidate.contactEmail?.toLowerCase().trim();
  const candName = normalizePersonName(candidate.fullName || candidate.displayName);
  const candGender = candidate.gender;
  const candAge = candidate.age;
  const candCity = candidate.currentCity?.toLowerCase().trim();

  let highestScore = 0;
  let bestMatch: DuplicateReviewCandidate | undefined;
  let bestReasons: DuplicateMatchReason[] = [];

  for (const existing of existingRegistry) {
    // Skip self-comparison if updating existing
    if (candidate.id && existing.id === candidate.id) continue;

    let score = 0;
    const reasons: DuplicateMatchReason[] = [];

    const existPhone = normalizePhoneNumber(existing.contactPhone);
    const existEmail = existing.contactEmail?.toLowerCase().trim();
    const existName = normalizePersonName(existing.fullName || existing.displayName);
    const existCity = existing.currentCity?.toLowerCase().trim();

    // 1. Phone Match (Very high signal: 60 points)
    if (candPhone && existPhone && candPhone === existPhone) {
      score += 60;
      reasons.push({
        field: 'contactPhone',
        en: `Identical contact phone number (${existing.contactPhone})`,
        ur: `رابطہ فون نمبر یکساں ہے (${existing.contactPhone})`,
        weight: 60,
      });
    }

    // 2. Email Match (High signal: 50 points)
    if (candEmail && existEmail && candEmail === existEmail) {
      score += 50;
      reasons.push({
        field: 'contactEmail',
        en: `Identical email address (${existing.contactEmail})`,
        ur: `ای میل ایڈریس یکساں ہے (${existing.contactEmail})`,
        weight: 50,
      });
    }

    // 3. Name Match (Medium signal: 35 points if exact, 20 if partial)
    if (candName && existName) {
      if (candName === existName) {
        score += 35;
        reasons.push({
          field: 'fullName',
          en: `Identical candidate name (${existing.fullName})`,
          ur: `امیدوار کا نام مکمل طور پر ملتا ہے (${existing.fullName})`,
          weight: 35,
        });
      } else if (candName.includes(existName) || existName.includes(candName)) {
        score += 20;
        reasons.push({
          field: 'fullName',
          en: `Partial candidate name overlap (${existing.fullName})`,
          ur: `امیدوار کے نام میں مماثلت ہے (${existing.fullName})`,
          weight: 20,
        });
      }
    }

    // 4. Demographic Correlation (Gender + Age + City: 30 points)
    if (candGender && existing.gender && candGender === existing.gender) {
      if (candAge && existing.age && Math.abs(candAge - existing.age) <= 1) {
        if (candCity && existCity && candCity === existCity) {
          score += 30;
          reasons.push({
            field: 'demographics',
            en: `Matching gender (${candGender}), age (~${existing.age}), and city (${existing.currentCity})`,
            ur: `جنس (${candGender})، عمر (~${existing.age}) اور شہر (${existing.currentCity}) یکساں ہیں`,
            weight: 30,
          });
        }
      }
    }

    // Cap score at 100
    const finalScore = Math.min(100, score);

    if (finalScore > highestScore) {
      highestScore = finalScore;
      bestMatch = existing;
      bestReasons = reasons;
    }
  }

  return {
    isSuspectedDuplicate: highestScore >= 50,
    confidenceScore: highestScore,
    matchedProfileId: bestMatch?.id,
    matchedProfileName: bestMatch?.fullName,
    reasons: bestReasons,
  };
}
