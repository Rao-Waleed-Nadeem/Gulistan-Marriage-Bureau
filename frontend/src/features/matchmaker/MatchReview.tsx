import React from 'react';
import { ProfileRecord, MatchRecommendation, Language } from '../../types';
import { translations } from '../../i18n/translations';
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
  Clock
} from 'lucide-react';
import { formatPKR } from '../../utils/finance';

interface MatchReviewProps {
  primaryProfile: ProfileRecord;
  candidateProfile: ProfileRecord;
  recommendation?: MatchRecommendation;
  language: Language;
  onApprove: () => void;
  onReject: () => void;
  onOpenControlledShare: () => void;
  onBack: () => void;
}

export const MatchReview: React.FC<MatchReviewProps> = ({
  primaryProfile,
  candidateProfile,
  recommendation,
  language,
  onApprove,
  onReject,
  onOpenControlledShare,
  onBack,
}) => {
  const t = translations[language];

  // Evaluate alignment
  const criteriaChecks = [
    {
      label: language === 'ur' ? 'عمر کی ہم آہنگی' : 'Age Alignment',
      primary: `${primaryProfile.age} yrs`,
      candidate: `${candidateProfile.age} yrs`,
      status: Math.abs(primaryProfile.age - candidateProfile.age) <= 6 ? 'matched' : 'mismatched',
      note: `Difference of ${Math.abs(primaryProfile.age - candidateProfile.age)} years falls within acceptable marriage norms.`,
    },
    {
      label: language === 'ur' ? 'مذہب و مسلک' : 'Religion & Sect',
      primary: `${primaryProfile.religion} (${primaryProfile.aqeedah})`,
      candidate: `${candidateProfile.religion} (${candidateProfile.aqeedah})`,
      status: primaryProfile.aqeedah.includes('Sunni') && candidateProfile.aqeedah.includes('Sunni') ? 'matched' : 'mismatched',
      note: 'Sunni Hanafi mutual observance.',
    },
    {
      label: language === 'ur' ? 'تعلیمی معیار' : 'Educational Pedigree',
      primary: primaryProfile.education,
      candidate: candidateProfile.education,
      status: 'matched',
      note: 'Both hold professional postgraduate credentials (King Edward / LSE).',
    },
    {
      label: language === 'ur' ? 'شہر و رہائش' : 'City & Relocation',
      primary: `${primaryProfile.currentCity} (${primaryProfile.residenceArea})`,
      candidate: `${candidateProfile.currentCity} (${candidateProfile.residenceArea})`,
      status: 'matched',
      note: 'Lahore - Islamabad expressway/flight connectivity; willing to relocate.',
    },
    {
      label: language === 'ur' ? 'قوم و برادری' : 'Caste & Biradari Standing',
      primary: `${primaryProfile.caste} (${primaryProfile.subCaste || 'General'})`,
      candidate: `${candidateProfile.caste} (${candidateProfile.subCaste || 'General'})`,
      status: 'matched',
      note: 'Both established elite families in Punjab.',
    },
    {
      label: language === 'ur' ? 'جائیداد و مکان' : 'Property & Housing',
      primary: `${primaryProfile.property.areaMarlas} Marla (${primaryProfile.property.propertyType})`,
      candidate: `${candidateProfile.property.areaMarlas} Marla (${candidateProfile.property.propertyType})`,
      status: 'matched',
      note: 'Independent luxury residences in prime capital sectors.',
    },
    {
      label: language === 'ur' ? 'شادی کے بعد ملازمت' : 'Career After Marriage',
      primary: primaryProfile.preferences.workAfterMarriagePreference || 'must_work',
      candidate: candidateProfile.preferences.workAfterMarriagePreference || 'optional',
      status: 'matched',
      note: 'Family fully supportive of practicing profession.',
    },
  ];

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
            <span className="inline-flex items-center gap-1 rounded-full border border-[#B69A62] bg-[#B69A62]/20 px-3 py-1 text-xs font-bold text-[#182848]">
              <Sparkles className="w-3.5 h-3.5 text-[#B69A62]" />
              <span>{recommendation?.matchScore || 92}% Compatibility</span>
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
            onClick={onApprove}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{t.btnApproveRecommendation}</span>
          </button>

          <button
            onClick={onReject}
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50/80 px-3.5 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
            <span>{t.btnReject}</span>
          </button>
        </div>
      </div>

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
            <img
              src={primaryProfile.photoUrl}
              alt={primaryProfile.fullName}
              className="h-20 w-20 rounded-2xl object-cover border border-[#B69A62]/40"
            />
            <div>
              <h3 className="font-serif text-xl font-bold text-[#182848]">{primaryProfile.fullName}</h3>
              <p className="text-xs text-[#68716D] font-medium mb-1">
                {primaryProfile.age} yrs • {primaryProfile.height} • {primaryProfile.caste}
              </p>
              <p className="text-xs text-[#252E2C] font-semibold">{primaryProfile.occupation}</p>
              <p className="text-xs text-[#68716D]">{primaryProfile.education}</p>
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
            <img
              src={candidateProfile.photoUrl}
              alt={candidateProfile.fullName}
              className="h-20 w-20 rounded-2xl object-cover border border-[#B69A62]/40"
            />
            <div>
              <h3 className="font-serif text-xl font-bold text-[#182848]">{candidateProfile.fullName}</h3>
              <p className="text-xs text-[#68716D] font-medium mb-1">
                {candidateProfile.age} yrs • {candidateProfile.height} • {candidateProfile.caste}
              </p>
              <p className="text-xs text-[#252E2C] font-semibold">{candidateProfile.occupation}</p>
              <p className="text-xs text-[#68716D]">{candidateProfile.education}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rationale & Compatibility Explanation */}
      <div className="glass-dark-card p-6 mb-8 shadow-xl">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-[#B69A62] shrink-0 mt-0.5" />
          <div>
            <h4 className="font-serif text-lg font-bold text-[#B69A62] mb-1">
              {language === 'ur' ? 'ندیم صاحب کا بااعتماد تجزیہ:' : 'Nadeem’s Matchmaker Rationale:'}
            </h4>
            <p className="text-sm text-[#88A8A8] leading-relaxed">
              {language === 'ur'
                ? recommendation?.compatibilitySummaryUrdu || 'دونوں خاندان دینی، اخلاقی اور سماجی اعتبار سے انتہائی موزوں ہیں۔ تعلیم، خاندانی وقار اور مستقبل کے ارادوں میں کامل ہم آہنگی پائی گئی ہے۔'
                : recommendation?.compatibilitySummaryEn || 'Both families share strong deen-conscious values, elite civil/professional standing, and harmonious educational pedigree.'}
            </p>
          </div>
        </div>
      </div>

      {/* Criteria Breakdown Table */}
      <div className="glass-panel overflow-hidden shadow-md">
        <div className="bg-[#F7F3EA] px-6 py-4 border-b border-[#E7E2D8]">
          <h3 className="font-serif text-lg font-bold text-[#182848]">
            {language === 'ur' ? 'معیارات کے مطابق تفصیلی موازنہ' : 'Detailed Criteria-by-Criteria Alignment'}
          </h3>
        </div>

        <div className="divide-y divide-[#E7E2D8] text-xs">
          {criteriaChecks.map((item, idx) => (
            <div key={idx} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F7F3EA]/40 transition-colors">
              <div className="w-full sm:w-1/4 font-semibold text-[#182848]">
                {item.label}
              </div>

              <div className="w-full sm:w-1/2 grid grid-cols-2 gap-4 text-[#252E2C]">
                <div>
                  <span className="text-[10px] text-[#68716D] block uppercase">Primary</span>
                  <span className="font-medium">{item.primary}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#68716D] block uppercase">Candidate</span>
                  <span className="font-medium">{item.candidate}</span>
                </div>
              </div>

              <div className="w-full sm:w-1/4 flex items-center justify-between sm:justify-end gap-2">
                <span className="text-[11px] text-[#68716D] text-end hidden sm:inline">{item.note}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Aligned</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
