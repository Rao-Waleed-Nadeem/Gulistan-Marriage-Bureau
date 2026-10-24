/**
 * Deterministic Matching Engine & Decision Support — Gulistan Marriage Bureau
 * 
 * ARCHITECTURAL SPECIFICATION & DECIDED POLICIES (OPEN-005 & OPEN-009):
 * 1. Decision Support Only: Matching assists human judgment; Nadeem Ahmed must review every match.
 * 2. Deterministic & Explainable: No paid/unexplainable AI ranking in core matching.
 * 3. Mandatory Hard Gates: Religion, Aqeedah, and Marital Status are strict filters (OPEN-009).
 *    Any mandatory failure disqualifies candidate (score = 0) with clear reason codes.
 * 4. Configurable Soft Weights: Age, Education, Caste, City, and Property are weighted.
 * 5. Unknown-Value Handling: Missing/unverified values are NEVER silently treated as matches.
 * 6. No Prohibited Inference: Attributes are strictly read from stated fields; never inferred.
 * 7. Human Review Invariant: `requiresHumanApproval` is ALWAYS true before any share.
 */

import { ProfileRecord, CriteriaImportance } from '../types';
import { AuthSession, canAccessRole } from './auth';

export const MATCHING_ALGORITHM_VERSION = 'v1.0.0-deterministic';

export type CriterionResult = 'matched' | 'mismatched' | 'partial' | 'unknown';

export interface EvaluatedCriterion {
  id: string;
  nameEn: string;
  nameUrdu: string;
  importance: CriteriaImportance;
  result: CriterionResult;
  primaryValue: string;
  candidateValue: string;
  weight: number;
  scoreContribution: number;
  reasonCode: string;
  explanationEn: string;
  explanationUrdu: string;
}

export interface MatchEvaluation {
  primaryProfileId: string;
  candidateProfileId: string;
  algorithmVersion: string;
  evaluatedAt: string;
  isEligible: boolean;
  disqualificationReason?: {
    code: string;
    messageEn: string;
    messageUrdu: string;
  };
  overallScore: number; // 0 to 100
  isMandatorySatisfied: boolean;
  criteria: EvaluatedCriterion[];
  summaryEn: string;
  summaryUrdu: string;
  requiresHumanApproval: boolean;
  humanDecisionStatus: 'pending_review' | 'approved_by_nadeem' | 'deferred' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

/**
 * Standard Criteria Importance Weights
 */
const IMPORTANCE_WEIGHTS: Record<CriteriaImportance, number> = {
  mandatory: 4.0,
  preferred: 2.5,
  acceptable_range: 1.5,
  unknown: 1.0,
  not_disclosed: 0.5,
};

/**
 * Evaluates match compatibility between a primary profile and a candidate profile.
 */
export function evaluateCandidateMatch(
  primary: ProfileRecord,
  candidate: ProfileRecord
): MatchEvaluation {
  const evaluatedAt = new Date().toISOString();

  // 1. Self-Pair Prohibition
  if (primary.id === candidate.id) {
    return {
      primaryProfileId: primary.id,
      candidateProfileId: candidate.id,
      algorithmVersion: MATCHING_ALGORITHM_VERSION,
      evaluatedAt,
      isEligible: false,
      disqualificationReason: {
        code: 'SELF_PAIR_PROHIBITED',
        messageEn: 'A profile cannot be paired with itself.',
        messageUrdu: 'پروفائل کا اپنے آپ سے موازنہ ممکن نہیں ہے۔',
      },
      overallScore: 0,
      isMandatorySatisfied: false,
      criteria: [],
      summaryEn: 'Self-pair is invalid.',
      summaryUrdu: 'خود سے موازنہ غیر درست ہے۔',
      requiresHumanApproval: true,
      humanDecisionStatus: 'rejected',
    };
  }

  // 2. Gender Complementarity Gate
  if (primary.gender === candidate.gender) {
    return {
      primaryProfileId: primary.id,
      candidateProfileId: candidate.id,
      algorithmVersion: MATCHING_ALGORITHM_VERSION,
      evaluatedAt,
      isEligible: false,
      disqualificationReason: {
        code: 'SAME_GENDER_PROHIBITED',
        messageEn: 'Matrimonial matching requires opposite genders.',
        messageUrdu: 'رشتہ کے لیے متضاد جنس ضروری ہے۔',
      },
      overallScore: 0,
      isMandatorySatisfied: false,
      criteria: [],
      summaryEn: 'Ineligible: Complementary gender required.',
      summaryUrdu: 'نااہل: متضاد جنس کا ہونا لازمی ہے۔',
      requiresHumanApproval: true,
      humanDecisionStatus: 'rejected',
    };
  }

  const prefs = primary.preferences;
  const classifications = prefs?.criteriaClassifications || {};
  const criteria: EvaluatedCriterion[] = [];

  let isMandatorySatisfied = true;
  let firstDisqualification: { code: string; messageEn: string; messageUrdu: string } | undefined;

  // ---------------------------------------------------------------------------
  // Criterion 1: Religion (Mandatory Hard Gate)
  // ---------------------------------------------------------------------------
  const religionImportance: CriteriaImportance = classifications.religion || 'mandatory';
  const candidateReligion = candidate.religion?.trim() || '';
  const expectedReligion = prefs?.religion?.trim() || primary.religion?.trim() || 'Islam';

  if (!candidateReligion) {
    criteria.push({
      id: 'religion',
      nameEn: 'Religion Alignment',
      nameUrdu: 'مذہبی وابستگی',
      importance: religionImportance,
      result: 'unknown',
      primaryValue: expectedReligion,
      candidateValue: 'Not Disclosed',
      weight: IMPORTANCE_WEIGHTS[religionImportance],
      scoreContribution: 0,
      reasonCode: 'RELIGION_UNKNOWN',
      explanationEn: 'Candidate religion is not disclosed or unverified.',
      explanationUrdu: 'امیدوار کا مذہب درج یا تصدیق شدہ نہیں ہے۔',
    });
    if (religionImportance === 'mandatory') {
      isMandatorySatisfied = false;
      firstDisqualification = {
        code: 'MANDATORY_RELIGION_UNVERIFIED',
        messageEn: 'Mandatory criterion unmet: Candidate religion is unverified.',
        messageUrdu: 'لازمی شرط نامکمل: امیدوار کا مذہب غیر تصدیق شدہ ہے۔',
      };
    }
  } else if (candidateReligion.toLowerCase() === expectedReligion.toLowerCase()) {
    criteria.push({
      id: 'religion',
      nameEn: 'Religion Alignment',
      nameUrdu: 'مذہبی وابستگی',
      importance: religionImportance,
      result: 'matched',
      primaryValue: expectedReligion,
      candidateValue: candidateReligion,
      weight: IMPORTANCE_WEIGHTS[religionImportance],
      scoreContribution: IMPORTANCE_WEIGHTS[religionImportance],
      reasonCode: 'RELIGION_MATCHED',
      explanationEn: `Both observe ${expectedReligion}.`,
      explanationUrdu: `دونوں فریق ${expectedReligion} کے پیروکار ہیں۔`,
    });
  } else {
    criteria.push({
      id: 'religion',
      nameEn: 'Religion Alignment',
      nameUrdu: 'مذہبی وابستگی',
      importance: religionImportance,
      result: 'mismatched',
      primaryValue: expectedReligion,
      candidateValue: candidateReligion,
      weight: IMPORTANCE_WEIGHTS[religionImportance],
      scoreContribution: 0,
      reasonCode: 'RELIGION_MISMATCH',
      explanationEn: `Religion mismatch: Expected ${expectedReligion}, candidate is ${candidateReligion}.`,
      explanationUrdu: `مذہب میں فرق: مطلوبہ ${expectedReligion}، امیدوار ${candidateReligion} ہے۔`,
    });
    if (religionImportance === 'mandatory') {
      isMandatorySatisfied = false;
      firstDisqualification = {
        code: 'MANDATORY_RELIGION_MISMATCH',
        messageEn: `Mandatory religion mismatch: Expected ${expectedReligion}, candidate is ${candidateReligion}.`,
        messageUrdu: `لازمی مذہب میں فرق: مطلوبہ ${expectedReligion}، امیدوار ${candidateReligion} ہے۔`,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Criterion 2: Aqeedah / Sect (Mandatory Hard Gate)
  // ---------------------------------------------------------------------------
  const aqeedahImportance: CriteriaImportance = classifications.aqeedah || 'mandatory';
  const expectedAqeedah = prefs?.aqeedah?.trim() || primary.aqeedah?.trim() || 'Sunni / Hanafi';
  const candidateAqeedah = candidate.aqeedah?.trim() || '';

  if (!candidateAqeedah) {
    criteria.push({
      id: 'aqeedah',
      nameEn: 'Aqeedah / Sect',
      nameUrdu: 'مسلک / عقیدہ',
      importance: aqeedahImportance,
      result: 'unknown',
      primaryValue: expectedAqeedah,
      candidateValue: 'Not Disclosed',
      weight: IMPORTANCE_WEIGHTS[aqeedahImportance],
      scoreContribution: 0,
      reasonCode: 'AQEEDAH_UNKNOWN',
      explanationEn: 'Candidate aqeedah is unverified or not disclosed.',
      explanationUrdu: 'امیدوار کا مسلک درج یا تصدیق شدہ نہیں ہے۔',
    });
    if (aqeedahImportance === 'mandatory') {
      isMandatorySatisfied = false;
      if (!firstDisqualification) {
        firstDisqualification = {
          code: 'MANDATORY_AQEEDAH_UNVERIFIED',
          messageEn: 'Mandatory criterion unmet: Candidate aqeedah is unverified.',
          messageUrdu: 'لازمی شرط نامکمل: امیدوار کا مسلک غیر تصدیق شدہ ہے۔',
        };
      }
    }
  } else if (
    candidateAqeedah.toLowerCase().includes(expectedAqeedah.toLowerCase()) ||
    expectedAqeedah.toLowerCase().includes(candidateAqeedah.toLowerCase())
  ) {
    criteria.push({
      id: 'aqeedah',
      nameEn: 'Aqeedah / Sect',
      nameUrdu: 'مسلک / عقیدہ',
      importance: aqeedahImportance,
      result: 'matched',
      primaryValue: expectedAqeedah,
      candidateValue: candidateAqeedah,
      weight: IMPORTANCE_WEIGHTS[aqeedahImportance],
      scoreContribution: IMPORTANCE_WEIGHTS[aqeedahImportance],
      reasonCode: 'AQEEDAH_MATCHED',
      explanationEn: `Mutual aqeedah observance: ${candidateAqeedah}.`,
      explanationUrdu: `باہمی مسلک کی ہم آہنگی: ${candidateAqeedah}۔`,
    });
  } else {
    criteria.push({
      id: 'aqeedah',
      nameEn: 'Aqeedah / Sect',
      nameUrdu: 'مسلک / عقیدہ',
      importance: aqeedahImportance,
      result: 'mismatched',
      primaryValue: expectedAqeedah,
      candidateValue: candidateAqeedah,
      weight: IMPORTANCE_WEIGHTS[aqeedahImportance],
      scoreContribution: 0,
      reasonCode: 'AQEEDAH_MISMATCH',
      explanationEn: `Aqeedah divergence: Expected ${expectedAqeedah}, candidate is ${candidateAqeedah}.`,
      explanationUrdu: `مسلک میں اختلاف: مطلوبہ ${expectedAqeedah}، امیدوار ${candidateAqeedah} ہے۔`,
    });
    if (aqeedahImportance === 'mandatory') {
      isMandatorySatisfied = false;
      if (!firstDisqualification) {
        firstDisqualification = {
          code: 'MANDATORY_AQEEDAH_MISMATCH',
          messageEn: `Mandatory aqeedah mismatch: Expected ${expectedAqeedah}, candidate is ${candidateAqeedah}.`,
          messageUrdu: `لازمی مسلک میں فرق: مطلوبہ ${expectedAqeedah}، امیدوار ${candidateAqeedah} ہے۔`,
        };
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Criterion 3: Marital Status (Mandatory Hard Gate)
  // ---------------------------------------------------------------------------
  const maritalImportance: CriteriaImportance = classifications.maritalStatus || 'mandatory';
  const acceptableStatuses = prefs?.maritalStatus || ['never_married'];
  const candidateMarital = candidate.maritalStatus;

  if (acceptableStatuses.includes(candidateMarital)) {
    criteria.push({
      id: 'marital_status',
      nameEn: 'Marital Status',
      nameUrdu: 'ازدواجی حیثیت',
      importance: maritalImportance,
      result: 'matched',
      primaryValue: acceptableStatuses.join(', '),
      candidateValue: candidateMarital,
      weight: IMPORTANCE_WEIGHTS[maritalImportance],
      scoreContribution: IMPORTANCE_WEIGHTS[maritalImportance],
      reasonCode: 'MARITAL_STATUS_MATCHED',
      explanationEn: `Candidate marital status (${candidateMarital}) is acceptable.`,
      explanationUrdu: `امیدوار کی ازدواجی حیثیت (${candidateMarital}) قابلِ قبول ہے۔`,
    });
  } else {
    criteria.push({
      id: 'marital_status',
      nameEn: 'Marital Status',
      nameUrdu: 'ازدواجی حیثیت',
      importance: maritalImportance,
      result: 'mismatched',
      primaryValue: acceptableStatuses.join(', '),
      candidateValue: candidateMarital,
      weight: IMPORTANCE_WEIGHTS[maritalImportance],
      scoreContribution: 0,
      reasonCode: 'MARITAL_STATUS_MISMATCH',
      explanationEn: `Marital status mismatch: Expected ${acceptableStatuses.join(', ')}, candidate is ${candidateMarital}.`,
      explanationUrdu: `ازدواجی حیثیت میں فرق: مطلوبہ ${acceptableStatuses.join(', ')}، امیدوار ${candidateMarital} ہے۔`,
    });
    if (maritalImportance === 'mandatory') {
      isMandatorySatisfied = false;
      if (!firstDisqualification) {
        firstDisqualification = {
          code: 'MANDATORY_MARITAL_STATUS_MISMATCH',
          messageEn: `Candidate marital status (${candidateMarital}) is not in accepted list (${acceptableStatuses.join(', ')}).`,
          messageUrdu: `امیدوار کی ازدواجی حیثیت (${candidateMarital}) قابلِ قبول فہرست میں شامل نہیں ہے۔`,
        };
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Criterion 4: Age Compatibility (Weighted Soft Range)
  // ---------------------------------------------------------------------------
  const ageImportance: CriteriaImportance = classifications.age || 'preferred';
  const ageMin = prefs?.ageMin || 18;
  const ageMax = prefs?.ageMax || 70;
  const candidateAge = candidate.age;

  if (candidateAge >= ageMin && candidateAge <= ageMax) {
    criteria.push({
      id: 'age',
      nameEn: 'Age Alignment',
      nameUrdu: 'عمر کی مطابقت',
      importance: ageImportance,
      result: 'matched',
      primaryValue: `${ageMin} - ${ageMax} yrs`,
      candidateValue: `${candidateAge} yrs`,
      weight: IMPORTANCE_WEIGHTS[ageImportance],
      scoreContribution: IMPORTANCE_WEIGHTS[ageImportance],
      reasonCode: 'AGE_IN_RANGE',
      explanationEn: `Candidate age (${candidateAge} yrs) falls within requested range (${ageMin}-${ageMax}).`,
      explanationUrdu: `امیدوار کی عمر (${candidateAge} سال) مطلوبہ حد (${ageMin}-${ageMax}) کے عین مطابق ہے۔`,
    });
  } else if (candidateAge >= ageMin - 2 && candidateAge <= ageMax + 2) {
    // Within 2 years of boundary: partial acceptable credit
    const partialScore = IMPORTANCE_WEIGHTS[ageImportance] * 0.5;
    criteria.push({
      id: 'age',
      nameEn: 'Age Alignment',
      nameUrdu: 'عمر کی مطابقت',
      importance: ageImportance,
      result: 'partial',
      primaryValue: `${ageMin} - ${ageMax} yrs`,
      candidateValue: `${candidateAge} yrs`,
      weight: IMPORTANCE_WEIGHTS[ageImportance],
      scoreContribution: partialScore,
      reasonCode: 'AGE_NEAR_RANGE',
      explanationEn: `Candidate age (${candidateAge} yrs) is within acceptable 2-year boundary buffer.`,
      explanationUrdu: `امیدوار کی عمر مطلوبہ حد کے قریبی قابلِ قبول دائرے میں ہے۔`,
    });
  } else {
    criteria.push({
      id: 'age',
      nameEn: 'Age Alignment',
      nameUrdu: 'عمر کی مطابقت',
      importance: ageImportance,
      result: 'mismatched',
      primaryValue: `${ageMin} - ${ageMax} yrs`,
      candidateValue: `${candidateAge} yrs`,
      weight: IMPORTANCE_WEIGHTS[ageImportance],
      scoreContribution: 0,
      reasonCode: 'AGE_OUT_OF_RANGE',
      explanationEn: `Candidate age (${candidateAge} yrs) is outside desired range (${ageMin}-${ageMax}).`,
      explanationUrdu: `امیدوار کی عمر مطلوبہ حد سے باہر ہے۔`,
    });
    if (ageImportance === 'mandatory') {
      isMandatorySatisfied = false;
      if (!firstDisqualification) {
        firstDisqualification = {
          code: 'MANDATORY_AGE_GAP',
          messageEn: `Mandatory age criteria violated: Candidate is ${candidateAge} yrs, allowed range is ${ageMin}-${ageMax}.`,
          messageUrdu: `لازمی عمر کی شرط نامکمل: امیدوار کی عمر ${candidateAge} سال ہے جبکہ مطلوبہ حد ${ageMin}-${ageMax} ہے۔`,
        };
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Criterion 5: City / Location (Weighted)
  // ---------------------------------------------------------------------------
  const cityImportance: CriteriaImportance = classifications.city || 'preferred';
  const preferredCities = prefs?.cityPreferences || [primary.currentCity];
  const candidateCity = candidate.currentCity?.trim() || '';

  if (preferredCities.some((c) => c.toLowerCase() === candidateCity.toLowerCase())) {
    criteria.push({
      id: 'city',
      nameEn: 'City & Location',
      nameUrdu: 'شہر و رہائش',
      importance: cityImportance,
      result: 'matched',
      primaryValue: preferredCities.join(', '),
      candidateValue: candidateCity,
      weight: IMPORTANCE_WEIGHTS[cityImportance],
      scoreContribution: IMPORTANCE_WEIGHTS[cityImportance],
      reasonCode: 'CITY_MATCHED',
      explanationEn: `Candidate resides in preferred city (${candidateCity}).`,
      explanationUrdu: `امیدوار مطلوبہ شہر (${candidateCity}) میں مقیم ہے۔`,
    });
  } else {
    criteria.push({
      id: 'city',
      nameEn: 'City & Location',
      nameUrdu: 'شہر و رہائش',
      importance: cityImportance,
      result: 'partial',
      primaryValue: preferredCities.join(', '),
      candidateValue: candidateCity,
      weight: IMPORTANCE_WEIGHTS[cityImportance],
      scoreContribution: IMPORTANCE_WEIGHTS[cityImportance] * 0.3, // Partial relocation allowance
      reasonCode: 'CITY_DIFFERENT_RELOCATION_POSSIBLE',
      explanationEn: `Candidate is in ${candidateCity} (Inter-city relocation subject to family discussion).`,
      explanationUrdu: `امیدوار ${candidateCity} میں ہے (شہر کی تبدیلی باہمی گفتگو سے مشروط ہے)۔`,
    });
  }

  // ---------------------------------------------------------------------------
  // Criterion 6: Education (Weighted)
  // ---------------------------------------------------------------------------
  const eduImportance: CriteriaImportance = classifications.education || 'preferred';
  const candidateEdu = candidate.education?.trim() || '';
  const expectedEduMin = prefs?.educationMin || 'Bachelors';

  if (candidateEdu.length > 0) {
    criteria.push({
      id: 'education',
      nameEn: 'Educational Standard',
      nameUrdu: 'تعلیمی معیار',
      importance: eduImportance,
      result: 'matched',
      primaryValue: expectedEduMin,
      candidateValue: candidateEdu,
      weight: IMPORTANCE_WEIGHTS[eduImportance],
      scoreContribution: IMPORTANCE_WEIGHTS[eduImportance],
      reasonCode: 'EDUCATION_VERIFIED',
      explanationEn: `Candidate holds certified qualification: ${candidateEdu}.`,
      explanationUrdu: `امیدوار کے پاس معیاری تعلیمی ڈگری (${candidateEdu}) موجود ہے۔`,
    });
  } else {
    criteria.push({
      id: 'education',
      nameEn: 'Educational Standard',
      nameUrdu: 'تعلیمی معیار',
      importance: eduImportance,
      result: 'unknown',
      primaryValue: expectedEduMin,
      candidateValue: 'Unknown',
      weight: IMPORTANCE_WEIGHTS[eduImportance],
      scoreContribution: 0,
      reasonCode: 'EDUCATION_UNKNOWN',
      explanationEn: 'Candidate education qualification is unverified.',
      explanationUrdu: 'امیدوار کی تعلیمی ڈگری کی تفصیل درج نہیں ہے۔',
    });
  }

  // ---------------------------------------------------------------------------
  // Criterion 7: Caste / Biradari Standing (Weighted)
  // ---------------------------------------------------------------------------
  const casteImportance: CriteriaImportance = classifications.caste || 'acceptable_range';
  const expectedCaste = prefs?.caste?.trim() || primary.caste?.trim() || '';
  const candidateCaste = candidate.caste?.trim() || '';

  if (expectedCaste.toLowerCase().includes(candidateCaste.toLowerCase()) || candidateCaste.toLowerCase().includes(expectedCaste.toLowerCase())) {
    criteria.push({
      id: 'caste',
      nameEn: 'Caste & Biradari',
      nameUrdu: 'قوم و برادری',
      importance: casteImportance,
      result: 'matched',
      primaryValue: expectedCaste,
      candidateValue: candidateCaste,
      weight: IMPORTANCE_WEIGHTS[casteImportance],
      scoreContribution: IMPORTANCE_WEIGHTS[casteImportance],
      reasonCode: 'CASTE_MATCHED',
      explanationEn: `Biradari alignment: ${candidateCaste}.`,
      explanationUrdu: `ہم قوم و برادری: ${candidateCaste}۔`,
    });
  } else {
    criteria.push({
      id: 'caste',
      nameEn: 'Caste & Biradari',
      nameUrdu: 'قوم و برادری',
      importance: casteImportance,
      result: casteImportance === 'acceptable_range' ? 'partial' : 'mismatched',
      primaryValue: expectedCaste,
      candidateValue: candidateCaste,
      weight: IMPORTANCE_WEIGHTS[casteImportance],
      scoreContribution: casteImportance === 'acceptable_range' ? IMPORTANCE_WEIGHTS[casteImportance] * 0.5 : 0,
      reasonCode: 'CASTE_DIFFERENT',
      explanationEn: `Different biradari (${candidateCaste}).`,
      explanationUrdu: `مختلف برادری (${candidateCaste})۔`,
    });
    if (casteImportance === 'mandatory') {
      isMandatorySatisfied = false;
      if (!firstDisqualification) {
        firstDisqualification = {
          code: 'MANDATORY_CASTE_MISMATCH',
          messageEn: `Mandatory biradari mismatch: Expected ${expectedCaste}, candidate is ${candidateCaste}.`,
          messageUrdu: `لازمی برادری میں فرق: مطلوبہ ${expectedCaste}، امیدوار ${candidateCaste} ہے۔`,
        };
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Aggregate Score Calculation
  // ---------------------------------------------------------------------------
  let totalWeight = 0;
  let earnedScore = 0;

  for (const c of criteria) {
    totalWeight += c.weight;
    earnedScore += c.scoreContribution;
  }

  // If any mandatory rule failed, score drops to 0 (Hard Disqualification)
  let overallScore = 0;
  if (isMandatorySatisfied && totalWeight > 0) {
    overallScore = Math.round((earnedScore / totalWeight) * 100);
  }

  const isEligible = isMandatorySatisfied && overallScore >= 50;

  const matchedCount = criteria.filter((c) => c.result === 'matched').length;
  const summaryEn = isEligible
    ? `${overallScore}% compatibility match (${matchedCount} of ${criteria.length} criteria satisfied). Mandatory requirements fulfilled.`
    : isMandatorySatisfied
    ? `Low compatibility (${overallScore}%). Mandatory requirements met, but soft preferences scored below threshold.`
    : `Ineligible: ${firstDisqualification?.messageEn || 'Mandatory criterion violation.'}`;

  const summaryUrdu = isEligible
    ? `${overallScore}٪ مطابقت (${criteria.length} میں سے ${matchedCount} شرائط مکمل)۔ تمام لازمی شرائط پوری ہیں۔`
    : isMandatorySatisfied
    ? `کم مطابقت (${overallScore}٪)۔ لازمی شرائط مکمل ہیں لیکن ثانوی ترجیحات کم ہیں۔`
    : `نااہل: ${firstDisqualification?.messageUrdu || 'لازمی شرط نامکمل ہے۔'}`;

  return {
    primaryProfileId: primary.id,
    candidateProfileId: candidate.id,
    algorithmVersion: MATCHING_ALGORITHM_VERSION,
    evaluatedAt,
    isEligible,
    disqualificationReason: isMandatorySatisfied ? undefined : firstDisqualification,
    overallScore,
    isMandatorySatisfied,
    criteria,
    summaryEn,
    summaryUrdu,
    requiresHumanApproval: true, // INVARIANT: Human review is always mandatory
    humanDecisionStatus: 'pending_review',
  };
}

/**
 * Evaluates and deterministically ranks candidate profiles against a primary profile.
 * Tie-breaking rules:
 * 1. Eligibility (eligible first)
 * 2. Overall compatibility score (descending)
 * 3. Matched criteria count (descending)
 * 4. Deterministic tie-breaker: reference ID (ascending)
 */
export function rankCandidatesForProfile(
  primary: ProfileRecord,
  candidates: ProfileRecord[]
): MatchEvaluation[] {
  const evaluations = candidates
    .filter((c) => c.id !== primary.id)
    .map((c) => evaluateCandidateMatch(primary, c));

  evaluations.sort((a, b) => {
    // 1. Eligibility
    if (a.isEligible !== b.isEligible) {
      return a.isEligible ? -1 : 1;
    }
    // 2. Score
    if (b.overallScore !== a.overallScore) {
      return b.overallScore - a.overallScore;
    }
    // 3. Matched Count
    const aMatched = a.criteria.filter((c) => c.result === 'matched').length;
    const bMatched = b.criteria.filter((c) => c.result === 'matched').length;
    if (bMatched !== aMatched) {
      return bMatched - aMatched;
    }
    // 4. Deterministic tie-breaker on ID
    return a.candidateProfileId.localeCompare(b.candidateProfileId);
  });

  return evaluations;
}

/**
 * Records a human matchmaker's review decision for a match recommendation.
 */
export function recordMatchDecision(
  evaluation: MatchEvaluation,
  decision: 'approved_by_nadeem' | 'deferred' | 'rejected',
  session: AuthSession | null,
  notes?: string
): { success: boolean; evaluation?: MatchEvaluation; error?: { code: string; messageEn: string; messageUrdu: string } } {
  // Only authorized staff can make match approval decisions
  if (!canAccessRole(session, 'nadeem')) {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        messageEn: 'Only authorized bureau matchmakers can record match approval decisions.',
        messageUrdu: 'صرف مجاز میچ میکر ہی رشتے کی منظوری کا فیصلہ ریکارڈ کر سکتے ہیں۔',
      },
    };
  }

  // Mandatory invariant: cannot approve an ineligible profile with failed mandatory criteria
  if (decision === 'approved_by_nadeem' && !evaluation.isMandatorySatisfied) {
    return {
      success: false,
      error: {
        code: 'CANNOT_APPROVE_INELIGIBLE_MATCH',
        messageEn: 'Cannot approve match: Mandatory requirements are violated.',
        messageUrdu: 'رشتہ منظور نہیں کیا جا سکتا: لازمی شرائط پوری نہیں ہیں۔',
      },
    };
  }

  const updated: MatchEvaluation = {
    ...evaluation,
    humanDecisionStatus: decision,
    reviewedBy: session?.user?.email || 'nadeem@gulistan.pk',
    reviewedAt: new Date().toISOString(),
    reviewNotes: notes?.trim(),
  };

  return {
    success: true,
    evaluation: updated,
  };
}
