import React from 'react';
import { ProfileRecord, MatchRecommendation, Language } from '../../types';
import { translations } from '../../i18n/translations';
import {
  evaluateCandidateMatch,
  MatchEvaluation,
  EvaluatedCriterion,
} from '../../lib/matching';
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Share2, 
  ArrowLeft, 
  Sparkles, 
  ShieldCheck, 
  Briefcase, 
  GraduationCap, 
  Home, 
  MapPin,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { formatPKR } from '../../utils/finance';

interface MatchReviewProps {
  primaryProfile: ProfileRecord;
  candidateProfile: ProfileRecord;
  evaluation?: MatchEvaluation;
  recommendation?: MatchRecommendation;
  language: Language;
  onApprove: (evaluation?: MatchEvaluation) => void;
  onReject: (evaluation?: MatchEvaluation) => void;
  onOpenControlledShare: () => void;
  onBack: () => void;
}

export const MatchReview: React.FC<MatchReviewProps> = ({
  primaryProfile,
  candidateProfile,
  evaluation,
  recommendation,
  language,
  onApprove,
  onReject,
  onOpenControlledShare,
  onBack,
}) => {
  const t = translations[language];

  // MATCH-02: Derive or use true persisted deterministic evaluation.
  // Never fabricate comparisons, reason codes, or fallback scores (92%).
  const effectiveEvaluation: MatchEvaluation =
    evaluation || evaluateCandidateMatch(primaryProfile, candidateProfile);

  const getStatusBadge = (criterion: EvaluatedCriterion) => {
    switch (criterion.result) {
      case 'matched':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{language === 'ur' ? 'ہم آہنگ' : 'Aligned'}</span>
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>{language === 'ur' ? 'جزوی' : 'Partial'}</span>
          </span>
        );
      case 'mismatched':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-0.5 text-xs font-semibold">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>{language === 'ur' ? 'غیر ہم آہنگ' : 'Mismatched'}</span>
          </span>
        );
      case 'unknown':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-0.5 text-xs font-semibold">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>{language === 'ur' ? 'غیر واضح' : 'Unknown'}</span>
          </span>
        );
    }
  };

  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case 'mandatory':
        return (
          <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700 bg-rose-100/70 border border-rose-200 px-1.5 py-0.5 rounded">
            {language === 'ur' ? 'لازمی' : 'Mandatory'}
          </span>
        );
      case 'preferred':
        return (
          <span className="text-[10px] uppercase font-medium tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
            {language === 'ur' ? 'ترجیحی' : 'Preferred'}
          </span>
        );
      case 'acceptable_range':
        return (
          <span className="text-[10px] uppercase font-medium tracking-wider text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
            {language === 'ur' ? 'قابلِ قبول' : 'Acceptable'}
          </span>
        );
      case 'not_disclosed':
        return (
          <span className="text-[10px] uppercase font-medium tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
            {language === 'ur' ? 'غیر درج' : 'Not Disclosed'}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E2D8] pb-4">
        <div>
          <button
            onClick={onBack}
            className="mb-2 inline-flex items-center gap-1.5 text-xs text-[#68716D] hover:text-[#182848]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{language === 'ur' ? 'واپس رشتہ جات پر جائیں' : 'Back to Matches'}</span>
          </button>
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#182848]">
              {language === 'ur' ? 'باہمی مطابقت کا تفصیلی جائزہ' : 'Match Compatibility Review'}
            </h2>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${
                effectiveEvaluation.isEligible
                  ? 'border-[#B69A62] bg-[#B69A62]/20 text-[#182848]'
                  : 'border-rose-300 bg-rose-50 text-rose-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B69A62]" />
              <span>{effectiveEvaluation.overallScore}% Compatibility</span>
            </span>
          </div>
        </div>

        {/* Quick Decision Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenControlledShare}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#B69A62]/40 bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 text-xs font-semibold text-[#182848] transition-colors shadow-xs cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-[#B69A62]" />
            <span>{t.btnShareWhatsApp}</span>
          </button>

          <button
            onClick={() => onApprove(effectiveEvaluation)}
            disabled={!effectiveEvaluation.isMandatorySatisfied}
            title={
              !effectiveEvaluation.isMandatorySatisfied
                ? language === 'ur'
                  ? 'لازمی شرائط پوری نہ ہونے کے باعث منظور نہیں کیا جا سکتا'
                  : 'Cannot approve match: Mandatory criteria failed'
                : undefined
            }
            className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-semibold text-white transition-all shadow-md ${
              effectiveEvaluation.isMandatorySatisfied
                ? 'bg-emerald-700 hover:bg-emerald-800 active:scale-95 cursor-pointer'
                : 'bg-emerald-700/50 opacity-60 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{t.btnApproveRecommendation}</span>
          </button>

          <button
            onClick={() => onReject(effectiveEvaluation)}
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50/80 px-3.5 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
            <span>{t.btnReject}</span>
          </button>
        </div>
      </div>

      {/* Disqualification / Ineligibility Notice (MATCH-02) */}
      {!effectiveEvaluation.isEligible && (
        <div className="mb-6 rounded-xl border border-rose-300 bg-rose-50/90 p-4 text-xs text-rose-900 shadow-xs">
          <div className="flex items-center gap-2 font-bold mb-1">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="text-sm">
              {language === 'ur'
                ? 'نااہل رشتہ: لازمی شرائط پوری نہیں ہیں'
                : 'Ineligible Match: Mandatory Criteria Disqualification'}
            </span>
            {effectiveEvaluation.disqualificationReason && (
              <span className="font-mono text-[10px] bg-rose-200/80 text-rose-800 px-2 py-0.5 rounded font-bold">
                {effectiveEvaluation.disqualificationReason.code}
              </span>
            )}
          </div>
          <p className="mt-1 text-rose-800 leading-relaxed">
            {language === 'ur'
              ? effectiveEvaluation.disqualificationReason?.messageUrdu || effectiveEvaluation.summaryUrdu
              : effectiveEvaluation.disqualificationReason?.messageEn || effectiveEvaluation.summaryEn}
          </p>
        </div>
      )}

      {/* Side-by-Side Candidate Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Requesting Party */}
        <div className="glass-card p-6 border-t-4 border-[#182848]">
          <div className="flex items-center justify-between mb-4 border-b border-[#E7E2D8] pb-3">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#182848]">
              {language === 'ur' ? 'سائل امیدوار' : 'Seeking Candidate'}
            </span>
            <span className="font-mono text-xs text-[#68716D]">{primaryProfile.id}</span>
          </div>

          <div className="flex gap-4">
            {primaryProfile.photoUrl ? (
              <img
                src={primaryProfile.photoUrl}
                alt={primaryProfile.fullName}
                className="h-20 w-20 rounded-2xl object-cover border border-[#B69A62]/40"
              />
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-[#E7E2D8] flex items-center justify-center font-bold text-[#68716D]">
                {primaryProfile.displayName.slice(0, 2)}
              </div>
            )}
            <div>
              <h3 className="font-serif text-xl font-bold text-[#182848]">{primaryProfile.fullName}</h3>
              <p className="text-xs text-[#68716D] font-medium mb-1">
                {primaryProfile.age} yrs • {primaryProfile.height} • {primaryProfile.caste || 'Caste Unspecified'}
              </p>
              <p className="text-xs text-[#252E2C] font-semibold">{primaryProfile.occupation}</p>
              <p className="text-xs text-[#68716D]">{primaryProfile.education || 'Education Unspecified'}</p>
            </div>
          </div>
        </div>

        {/* Proposed Candidate */}
        <div className="glass-card p-6 border-t-4 border-[#B69A62]">
          <div className="flex items-center justify-between mb-4 border-b border-[#E7E2D8] pb-3">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#B69A62]">
              {language === 'ur' ? 'تجویز کردہ امیدوار' : 'Proposed Candidate'}
            </span>
            <span className="font-mono text-xs text-[#68716D]">{candidateProfile.id}</span>
          </div>

          <div className="flex gap-4">
            {candidateProfile.photoUrl ? (
              <img
                src={candidateProfile.photoUrl}
                alt={candidateProfile.fullName}
                className="h-20 w-20 rounded-2xl object-cover border border-[#B69A62]/40"
              />
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-[#E7E2D8] flex items-center justify-center font-bold text-[#68716D]">
                {candidateProfile.displayName.slice(0, 2)}
              </div>
            )}
            <div>
              <h3 className="font-serif text-xl font-bold text-[#182848]">{candidateProfile.fullName}</h3>
              <p className="text-xs text-[#68716D] font-medium mb-1">
                {candidateProfile.age} yrs • {candidateProfile.height} • {candidateProfile.caste || 'Caste Unspecified'}
              </p>
              <p className="text-xs text-[#252E2C] font-semibold">{candidateProfile.occupation}</p>
              <p className="text-xs text-[#68716D]">{candidateProfile.education || 'Education Unspecified'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rationale & Compatibility Explanation */}
      <div className="glass-dark-card p-6 mb-8 shadow-xl">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-[#B69A62] shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-serif text-lg font-bold text-[#B69A62]">
                {language === 'ur' ? 'ندیم صاحب کا بااعتماد تجزیہ:' : 'Nadeem’s Matchmaker Rationale:'}
              </h4>
              <span className="font-mono text-[10px] text-[#A6C0C0]">
                {effectiveEvaluation.algorithmVersion}
              </span>
            </div>
            <p className="text-sm text-[#E7E2D8] leading-relaxed">
              {language === 'ur'
                ? (recommendation?.compatibilitySummaryUrdu || effectiveEvaluation.summaryUrdu)
                : (recommendation?.compatibilitySummaryEn || effectiveEvaluation.summaryEn)}
            </p>
            <div className="mt-3 flex items-center gap-3 text-[11px] text-[#A6C0C0]">
              <span>
                Status: <strong className="text-white capitalize">{effectiveEvaluation.humanDecisionStatus.replace(/_/g, ' ')}</strong>
              </span>
              <span>•</span>
              <span>Evaluated: {new Date(effectiveEvaluation.evaluatedAt).toLocaleDateString()}</span>
              {effectiveEvaluation.reviewedBy && (
                <>
                  <span>•</span>
                  <span>Reviewed By: {effectiveEvaluation.reviewedBy}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Criteria Breakdown Table (MATCH-02: Render persisted criteria & reason codes) */}
      <div className="glass-panel overflow-hidden shadow-md">
        <div className="bg-[#F7F3EA] px-6 py-4 border-b border-[#E7E2D8] flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-[#182848]">
            {language === 'ur' ? 'معیارات کے مطابق تفصیلی موازنہ' : 'Detailed Criteria-by-Criteria Alignment'}
          </h3>
          <span className="text-xs text-[#68716D]">
            {effectiveEvaluation.criteria.length} {language === 'ur' ? 'معیارات زیرِ غور' : 'criteria evaluated'}
          </span>
        </div>

        <div className="divide-y divide-[#E7E2D8] text-xs">
          {effectiveEvaluation.criteria.map((item) => (
            <div
              key={item.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F7F3EA]/40 transition-colors"
            >
              <div className="w-full sm:w-1/4">
                <div className="font-semibold text-[#182848] flex items-center gap-2">
                  <span>{language === 'ur' ? item.nameUrdu : item.nameEn}</span>
                  {getImportanceBadge(item.importance)}
                </div>
                <div className="font-mono text-[10px] text-[#68716D] mt-0.5">
                  Code: {item.reasonCode}
                </div>
              </div>

              <div className="w-full sm:w-1/2 grid grid-cols-2 gap-4 text-[#252E2C]">
                <div>
                  <span className="text-[10px] text-[#68716D] block uppercase">Primary Preference</span>
                  <span className="font-medium">{item.primaryValue}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#68716D] block uppercase">Candidate Value</span>
                  <span className="font-medium">{item.candidateValue}</span>
                </div>
              </div>

              <div className="w-full sm:w-1/4 flex flex-col sm:items-end gap-1">
                {getStatusBadge(item)}
                <span className="text-[11px] text-[#68716D] text-start sm:text-end">
                  {language === 'ur' ? item.explanationUrdu : item.explanationEn}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
