/**
 * Profile Matching and Criteria Classification Engine
 */

export type CriteriaImportance = 'mandatory' | 'preferred' | 'acceptable_range' | 'unknown' | 'not_disclosed';

export interface CriterionCheck {
  id: string;
  nameEn: string;
  nameUrdu: string;
  candidateValue: string;
  expectedValue: string;
  importance: CriteriaImportance;
  isSatisfied: boolean;
  status: 'matched' | 'unverified' | 'mismatched' | 'not_disclosed';
  note?: string;
}

export interface MatchAnalysisResult {
  scorePercentage: number;
  isMandatorySatisfied: boolean;
  totalCriteria: number;
  matchedCount: number;
  unverifiedCount: number;
  mismatchedCount: number;
  criteria: CriterionCheck[];
  summaryEn: string;
  summaryUrdu: string;
}

export function evaluateMatchCriteria(criteria: CriterionCheck[]): MatchAnalysisResult {
  if (!criteria || criteria.length === 0) {
    return {
      scorePercentage: 0,
      isMandatorySatisfied: true,
      totalCriteria: 0,
      matchedCount: 0,
      unverifiedCount: 0,
      mismatchedCount: 0,
      criteria: [],
      summaryEn: 'No criteria specified',
      summaryUrdu: 'کوئی معیار فراہم نہیں کیا گیا',
    };
  }

  let matchedWeight = 0;
  let totalWeight = 0;
  let isMandatorySatisfied = true;
  let matchedCount = 0;
  let unverifiedCount = 0;
  let mismatchedCount = 0;

  for (const c of criteria) {
    let weight = 1;
    if (c.importance === 'mandatory') weight = 3;
    else if (c.importance === 'preferred') weight = 2;
    else if (c.importance === 'acceptable_range') weight = 1.5;

    totalWeight += weight;

    if (c.status === 'matched') {
      matchedWeight += weight;
      matchedCount++;
    } else if (c.status === 'unverified') {
      matchedWeight += weight * 0.5; // partial credit with unverified flag
      unverifiedCount++;
    } else if (c.status === 'mismatched') {
      mismatchedCount++;
      if (c.importance === 'mandatory') {
        isMandatorySatisfied = false;
      }
    } else if (c.status === 'not_disclosed') {
      unverifiedCount++;
    }
  }

  const scorePercentage = Math.round((matchedWeight / Math.max(totalWeight, 1)) * 100);

  const summaryEn = isMandatorySatisfied
    ? `${matchedCount} of ${criteria.length} criteria satisfied (${scorePercentage}% compatibility match). Mandatory requirements met.`
    : `Mandatory requirement gap detected. ${matchedCount} criteria satisfied.`;

  const summaryUrdu = isMandatorySatisfied
    ? `${criteria.length} میں سے ${matchedCount} معیارات مکمل ہیں (${scorePercentage}٪ مطابقت)۔ تمام لازمی شرائط پوری ہیں۔`
    : `لازمی شرط میں فرق پایا گیا۔ ${matchedCount} معیارات مکمل ہیں۔`;

  return {
    scorePercentage,
    isMandatorySatisfied,
    totalCriteria: criteria.length,
    matchedCount,
    unverifiedCount,
    mismatchedCount,
    criteria,
    summaryEn,
    summaryUrdu,
  };
}
