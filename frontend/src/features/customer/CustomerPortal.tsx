import React, { useState } from 'react';
import { ProfileRecord, MatchRecommendation, Language } from '../../types';
import { translations } from '../../i18n/translations';
import { ProfileCard } from '../../components/ui/ProfileCard';
import { 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  Eye, 
  Heart, 
  FileEdit, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  HelpCircle,
  Camera,
  Trash2,
  Send
} from 'lucide-react';

interface CustomerPortalProps {
  currentProfile: ProfileRecord;
  recommendations: MatchRecommendation[];
  candidateProfiles: ProfileRecord[];
  language: Language;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  currentProfile,
  recommendations,
  candidateProfiles,
  language,
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'recommendations' | 'my-profile' | 'preferences' | 'privacy'>('recommendations');
  const [selectedCandidate, setSelectedCandidate] = useState<ProfileRecord | null>(null);

  // Privacy toggles
  const [photoConsent, setPhotoConsent] = useState(currentProfile.photoPermissionGranted);
  const [contactConsent, setContactConsent] = useState(false);
  const [correctionNote, setCorrectionNote] = useState('');
  const [isRequestSent, setIsRequestSent] = useState(false);

  // Authorized recommendations for this user
  const userRecs = recommendations.filter(
    (r) => r.requestingProfileId === currentProfile.id || r.candidateProfileId === currentProfile.id
  );

  const handleSendCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionNote.trim()) return;
    setIsRequestSent(true);
    setTimeout(() => {
      setCorrectionNote('');
      setIsRequestSent(false);
      alert(language === 'ur' ? 'آپ کی درخواست بیورو کو موصول ہو گئی ہے۔' : 'Your correction request has been submitted to Nadeem.');
    }, 1500);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Customer Welcome Header */}
      <div className="mb-8 rounded-3xl border border-[#B69A62]/40 bg-gradient-to-r from-[#164E4A] to-[#103B39] text-[#F7F3EA] p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#B69A62]/40 bg-[#103B39]/80 px-3.5 py-1 text-xs text-[#B69A62] mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.customerProfileStatus}: Active & Verified</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
              {t.customerWelcome} {currentProfile.fullName}
            </h1>
            <p className="text-xs sm:text-sm text-[#DCE6DE]/80 mt-1 max-w-xl leading-relaxed">
              {language === 'ur'
                ? 'خوش آمدید! آپ کے کوائف کی مکمل رازداری کے ساتھ مناسب رشتوں کا باوقار انتخاب کیا جا رہا ہے۔'
                : 'Your private portfolio is managed with complete family discretion and personalized matchmaker care.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-end">
              <span className="block text-[11px] text-[#DCE6DE]/70">Reference ID</span>
              <span className="font-mono text-lg font-bold text-[#B69A62]">{currentProfile.id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-8 flex items-center gap-2 border-b border-[#E7E2D8] pb-3 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('recommendations'); setSelectedCandidate(null); }}
          className={`px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'recommendations' ? 'bg-[#164E4A] text-[#F7F3EA] shadow-sm' : 'text-[#68716D] hover:text-[#252E2C]'
          }`}
        >
          {t.customerRecommendations} ({userRecs.length})
        </button>

        <button
          onClick={() => { setActiveTab('my-profile'); setSelectedCandidate(null); }}
          className={`px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'my-profile' ? 'bg-[#164E4A] text-[#F7F3EA] shadow-sm' : 'text-[#68716D] hover:text-[#252E2C]'
          }`}
        >
          {language === 'ur' ? 'میرے درج شدہ کوائف' : 'My Registered Profile'}
        </button>

        <button
          onClick={() => { setActiveTab('preferences'); setSelectedCandidate(null); }}
          className={`px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'preferences' ? 'bg-[#164E4A] text-[#F7F3EA] shadow-sm' : 'text-[#68716D] hover:text-[#252E2C]'
          }`}
        >
          {t.customerPreferences}
        </button>

        <button
          onClick={() => { setActiveTab('privacy'); setSelectedCandidate(null); }}
          className={`px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'privacy' ? 'bg-[#164E4A] text-[#F7F3EA] shadow-sm' : 'text-[#68716D] hover:text-[#252E2C]'
          }`}
        >
          {t.customerPrivacyCenter}
        </button>
      </div>

      {/* TAB 1: AUTHORIZED RECOMMENDATIONS */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-900 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">
                {language === 'ur' ? 'محفوظ و بااختیار رسائی:' : 'Discreet Authorized Proposals:'}
              </span>
              <p>
                {language === 'ur'
                  ? 'یہاں صرف وہ تجاویز دکھائی جاتی ہیں جن کا ندیم صاحب نے تفصیلی جائزہ لے کر آپ کی ترجیحات کے عین مطابق پایا ہے۔ دیگر امیدواروں کی تصاویر باہمی اجازت کے بغیر ظاہر نہیں کی جاتیں۔'
                  : 'These proposals have been personally vetted and authorized by Nadeem based on your exact family preferences. Candidate photographs and direct numbers remain protected until mutual consent.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {userRecs.map((rec) => {
              const otherId = rec.requestingProfileId === currentProfile.id ? rec.candidateProfileId : rec.requestingProfileId;
              const candidate = candidateProfiles.find((p) => p.id === otherId) || candidateProfiles[1];

              return (
                <div key={rec.id} className="space-y-3">
                  <ProfileCard
                    profile={candidate}
                    language={language}
                    matchScore={rec.matchScore}
                    onViewDetails={() => setSelectedCandidate(candidate)}
                  />
                  <div className="p-3 bg-[#F7F3EA] rounded-xl border border-[#E7E2D8] text-xs">
                    <span className="font-semibold text-[#164E4A] block mb-0.5">
                      {language === 'ur' ? 'تجویز کی مطابقت کا خلاصہ:' : 'Match Rationale:'}
                    </span>
                    <p className="text-[#68716D] leading-relaxed italic">
                      "{language === 'ur' ? rec.compatibilitySummaryUrdu : rec.compatibilitySummaryEn}"
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal / Overlay for Candidate View if selected */}
          {selectedCandidate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="relative w-full max-w-2xl rounded-3xl bg-[#FFFEFA] p-6 sm:p-8 shadow-2xl border border-[#B69A62]/40 text-xs">
                <div className="flex items-center justify-between border-b border-[#E7E2D8] pb-3 mb-4">
                  <h3 className="font-serif text-2xl font-bold text-[#164E4A]">
                    {selectedCandidate.displayName} ({selectedCandidate.id})
                  </h3>
                  <button
                    onClick={() => setSelectedCandidate(null)}
                    className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-[#68716D] leading-relaxed">
                    Education: <strong>{selectedCandidate.education}</strong>
                  </p>
                  <p className="text-[#68716D] leading-relaxed">
                    Profession: <strong>{selectedCandidate.occupation} ({selectedCandidate.jobTitle})</strong>
                  </p>
                  <p className="text-[#68716D] leading-relaxed">
                    Location: <strong>{selectedCandidate.currentCity} ({selectedCandidate.residenceArea})</strong>
                  </p>
                  <p className="text-[#68716D] leading-relaxed">
                    Family: <strong>{selectedCandidate.familyBackgroundNotes}</strong>
                  </p>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                    <span className="font-bold block mb-1">Introduction Step:</span>
                    <p>
                      If your family is interested in proceeding, request an introduction. Nadeem will facilitate formal communication between both elders.
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      onClick={() => setSelectedCandidate(null)}
                      className="px-4 py-2 border rounded-xl"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        alert('Introduction request sent to Nadeem. He will contact both families today.');
                        setSelectedCandidate(null);
                      }}
                      className="px-5 py-2 bg-[#164E4A] text-white font-semibold rounded-xl"
                    >
                      Request Formal Introduction
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY REGISTERED PROFILE */}
      {activeTab === 'my-profile' && (
        <div className="space-y-6 animate-fadeIn">
          <ProfileCard profile={currentProfile} language={language} />
        </div>
      )}

      {/* TAB 3: PREFERENCES EDITOR */}
      {activeTab === 'preferences' && (
        <div className="porcelain-card rounded-3xl p-6 sm:p-8 space-y-6 animate-fadeIn">
          <div className="border-b border-[#E7E2D8] pb-4">
            <h3 className="font-serif text-2xl font-bold text-[#164E4A]">
              {t.customerPreferences}
            </h3>
            <p className="text-xs text-[#68716D] mt-1">
              {language === 'ur'
                ? 'اپنے مطلوبہ شریکِ حیات کے لیے شرائط اور معیارات کا انتخاب کریں۔'
                : 'Fine-tune your spouse expectations. Nadeem uses these weights to prioritize matches.'}
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {Object.entries(currentProfile.preferences.criteriaClassifications).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between p-3.5 rounded-2xl border border-[#E7E2D8] bg-[#F7F3EA]/50">
                <span className="font-semibold text-sm capitalize text-[#164E4A]">{key.replace(/([A-Z])/g, ' $1')}</span>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#164E4A] text-white capitalize">
                  {val.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => alert('Preferences saved!')}
            className="rounded-xl bg-[#164E4A] px-6 py-2.5 text-xs font-semibold text-[#F7F3EA] shadow"
          >
            Update Preferences
          </button>
        </div>
      )}

      {/* TAB 4: PRIVACY & CONSENT CENTER */}
      {activeTab === 'privacy' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="porcelain-card rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-[#E7E2D8] pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#164E4A] text-[#B69A62]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-2xl font-bold text-[#164E4A]">
                  {t.customerPrivacyCenter}
                </h3>
                <p className="text-xs text-[#68716D]">
                  Manage confidential information visibility, photo consent, and profile correction requests.
                </p>
              </div>
            </div>

            {/* Photo Sharing Toggle */}
            <div className="space-y-3">
              <label className="flex items-center justify-between p-4 rounded-2xl border border-[#E7E2D8] bg-[#F7F3EA]/50 cursor-pointer">
                <div>
                  <span className="font-bold text-sm text-[#164E4A] block">Photograph Discretion</span>
                  <span className="text-xs text-[#68716D]">
                    Allow Nadeem to share photographs only after candidate background verification.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={photoConsent}
                  onChange={(e) => setPhotoConsent(e.target.checked)}
                  className="rounded border-[#B69A62] text-[#164E4A] h-5 w-5"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl border border-[#E7E2D8] bg-[#F7F3EA]/50 cursor-pointer">
                <div>
                  <span className="font-bold text-sm text-[#164E4A] block">Direct Family Phone Number Sharing</span>
                  <span className="text-xs text-[#68716D]">
                    Require verbal approval from family before disclosing telephone contact to prospective match.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={contactConsent}
                  onChange={(e) => setContactConsent(e.target.checked)}
                  className="rounded border-[#B69A62] text-[#164E4A] h-5 w-5"
                />
              </label>
            </div>

            {/* Profile Data Correction / Deactivation Request */}
            <form onSubmit={handleSendCorrection} className="pt-4 border-t border-[#E7E2D8] space-y-3">
              <h4 className="font-serif text-lg font-bold text-[#164E4A]">
                {language === 'ur' ? 'کوائف کی تصحیح یا پروفائل غیر فعال کرنے کی درخواست' : 'Request Profile Update, Deactivation, or Deletion'}
              </h4>
              <p className="text-xs text-[#68716D]">
                If your contact number, city, or marital situation has changed, submit a note directly to bureau administration.
              </p>
              <textarea
                value={correctionNote}
                onChange={(e) => setCorrectionNote(e.target.value)}
                placeholder="Describe your requested correction or reason for profile deactivation..."
                rows={3}
                className="w-full rounded-2xl border border-[#E7E2D8] p-3 text-xs focus:border-[#164E4A] focus:outline-none"
              />
              <button
                type="submit"
                disabled={isRequestSent}
                className="inline-flex items-center gap-2 rounded-xl bg-[#164E4A] px-5 py-2.5 text-xs font-semibold text-[#F7F3EA] shadow"
              >
                <Send className="w-3.5 h-3.5 text-[#B69A62]" />
                <span>Submit Confidential Request</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
