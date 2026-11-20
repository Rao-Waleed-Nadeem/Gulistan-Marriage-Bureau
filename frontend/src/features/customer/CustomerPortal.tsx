import React, { useState } from 'react';
import { ProfileRecord, MatchRecommendation, Language, PartnerPreference } from '../../types';
import { translations } from '../../i18n/translations';
import { ProfileCard } from '../../components/ui/ProfileCard';
import { crmRepository, profileRepository } from '../../lib/repositories';
import { AuthSession, getCurrentSession } from '../../lib/auth';
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
  Send,
  Sliders,
  Check
} from 'lucide-react';

interface CustomerPortalProps {
  currentProfile?: ProfileRecord | null;
  recommendations: MatchRecommendation[];
  candidateProfiles: ProfileRecord[];
  language: Language;
  activeTab?: 'recommendations' | 'my-profile' | 'preferences' | 'privacy';
  onTabChange?: (tab: 'recommendations' | 'my-profile' | 'preferences' | 'privacy') => void;
  session?: AuthSession | null;
  onProfileUpdated?: (updated: ProfileRecord) => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  currentProfile,
  recommendations,
  candidateProfiles,
  language,
  activeTab: activeTabProp,
  onTabChange,
  session,
  onProfileUpdated,
}) => {
  const t = translations[language];
  const [internalTab, setInternalTab] = useState<'recommendations' | 'my-profile' | 'preferences' | 'privacy'>(
    activeTabProp || 'recommendations'
  );

  React.useEffect(() => {
    if (activeTabProp) {
      setInternalTab(activeTabProp);
    }
  }, [activeTabProp]);

  const activeTab = activeTabProp || internalTab;

  const setActiveTab = (tab: 'recommendations' | 'my-profile' | 'preferences' | 'privacy') => {
    setInternalTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };
  const [selectedCandidate, setSelectedCandidate] = useState<ProfileRecord | null>(null);

  // Privacy toggles & Customer requests
  const [photoConsent, setPhotoConsent] = useState(currentProfile?.photoPermissionGranted ?? false);
  const [contactConsent, setContactConsent] = useState(false);
  const [requestType, setRequestType] = useState<'profile_correction' | 'deactivation_request' | 'photo_consent_change'>('profile_correction');
  const [correctionNote, setCorrectionNote] = useState('');
  const [isRequestSent, setIsRequestSent] = useState(false);

  // Preference editor form states (P1-17)
  const [prefAgeMin, setPrefAgeMin] = useState<number>(currentProfile?.preferences?.ageMin || 20);
  const [prefAgeMax, setPrefAgeMax] = useState<number>(currentProfile?.preferences?.ageMax || 35);
  const [prefEducation, setPrefEducation] = useState<string>(currentProfile?.preferences?.educationMin || '');
  const [prefCaste, setPrefCaste] = useState<string>(currentProfile?.preferences?.caste || '');
  const [prefCities, setPrefCities] = useState<string>((currentProfile?.preferences?.cityPreferences || []).join(', '));
  const [prefFamily, setPrefFamily] = useState<'independent' | 'joint_family' | 'any'>(
    currentProfile?.preferences?.familyArrangement || 'any'
  );
  const [prefWeights, setPrefWeights] = useState<Record<string, string>>(() => ({
    age: 'mandatory',
    education: 'important',
    caste: 'preferred',
    city: 'preferred',
    religion: 'mandatory',
    ...(currentProfile?.preferences?.criteriaClassifications || {}),
  }));
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [preferenceSaveMessage, setPreferenceSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Synchronize state if currentProfile changes
  React.useEffect(() => {
    if (currentProfile) {
      setPhotoConsent(currentProfile.photoPermissionGranted);
      if (currentProfile.preferences) {
        setPrefAgeMin(currentProfile.preferences.ageMin || 20);
        setPrefAgeMax(currentProfile.preferences.ageMax || 35);
        setPrefEducation(currentProfile.preferences.educationMin || '');
        setPrefCaste(currentProfile.preferences.caste || '');
        setPrefCities((currentProfile.preferences.cityPreferences || []).join(', '));
        setPrefFamily(currentProfile.preferences.familyArrangement || 'any');
        if (currentProfile.preferences.criteriaClassifications) {
          setPrefWeights((prev) => ({ ...prev, ...currentProfile.preferences.criteriaClassifications }));
        }
      }
    }
  }, [currentProfile?.id, currentProfile?.photoPermissionGranted, currentProfile?.preferences]);

  // Authorized recommendations for this user (P1-16)
  const userRecs = currentProfile
    ? recommendations.filter(
        (r) =>
          (r.requestingProfileId === currentProfile.id ||
           r.candidateProfileId === currentProfile.id ||
           r.requestingProfileId === currentProfile.databaseId ||
           r.candidateProfileId === currentProfile.databaseId) &&
          (r.status === 'approved_by_nadeem' || r.status === 'shared_with_parties' || r.status === 'accepted_by_customer')
      )
    : [];

  const handleSendCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProfile || !correctionNote.trim()) return;
    setIsRequestSent(true);
    try {
      const activeSession = session || getCurrentSession();
      await crmRepository.create({
        profileId: currentProfile.id,
        personName: currentProfile.fullName,
        contactPhone: currentProfile.contactPhone,
        type: requestType,
        priority: requestType === 'deactivation_request' ? 'urgent' : 'high',
        notes: `[${requestType.toUpperCase()}] Customer Request: ${correctionNote.trim()}`,
      }, activeSession);
      setCorrectionNote('');
      setIsRequestSent(false);
      alert(
        language === 'ur'
          ? 'آپ کی درخواست بیورو کو موصول ہو گئی ہے۔ ندیم صاحب جائزہ لیں گے۔'
          : 'Your request has been submitted to bureau administration for review.'
      );
    } catch (err: any) {
      setIsRequestSent(false);
      alert(
        err?.message || (language === 'ur' ? 'درخواست بھیجنے میں خرابی پیش آئی۔' : 'Failed to submit request.')
      );
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProfile) return;
    setIsSavingPreferences(true);
    setPreferenceSaveMessage(null);
    try {
      const activeSession = session || getCurrentSession();
      const updatedPrefs: Partial<PartnerPreference> = {
        ageMin: Number(prefAgeMin),
        ageMax: Number(prefAgeMax),
        educationMin: prefEducation.trim(),
        caste: prefCaste.trim(),
        cityPreferences: prefCities.split(',').map((c) => c.trim()).filter(Boolean),
        familyArrangement: prefFamily,
        criteriaClassifications: prefWeights as any,
      };

      const saved = await profileRepository.updatePreferences(
        currentProfile.id,
        updatedPrefs,
        activeSession
      );

      setIsSavingPreferences(false);
      setPreferenceSaveMessage({
        type: 'success',
        text: language === 'ur'
          ? 'ترجیحات کامیابی کے ساتھ محفوظ ہو گئی ہیں!'
          : 'Preferences saved and updated successfully!',
      });

      if (onProfileUpdated) {
        onProfileUpdated({
          ...currentProfile,
          preferences: {
            ...currentProfile.preferences,
            ...saved,
          },
        });
      }
    } catch (err: any) {
      setIsSavingPreferences(false);
      setPreferenceSaveMessage({
        type: 'error',
        text: err?.message || (language === 'ur' ? 'ترجیحات محفوظ کرنے میں خرابی پیش آئی۔' : 'Failed to save preferences.'),
      });
    }
  };

  if (!currentProfile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="p-8 porcelain-card rounded-3xl space-y-4">
          <ShieldCheck className="w-12 h-12 text-[#B69A62] mx-auto" />
          <h3 className="font-serif text-2xl font-bold text-[#182848]">
            {language === 'ur' ? 'پروفائل زیر التواء یا غیر فعال ہے' : 'Candidate Profile Not Found or Pending Review'}
          </h3>
          <p className="text-xs sm:text-sm text-[#68716D] max-w-md mx-auto">
            {language === 'ur'
              ? 'آپ کے اکاؤنٹ کے ساتھ کوئی فعال پروفائل منسلک نہیں ہے۔ براہ کرم بیورو دفتر یا ندیم صاحب سے رابطہ کریں۔'
              : 'No verified active candidate profile is currently linked to your customer session. Please contact the bureau office for onboarding.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Customer Welcome Header */}
      <div className="mb-8 rounded-3xl border border-[#B69A62]/40 bg-gradient-to-r from-[#182848] to-[#283848] text-[#F7F3EA] p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#B69A62]/40 bg-[#182848]/80 px-3.5 py-1 text-xs text-[#B69A62] mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {t.customerProfileStatus}: {
                  currentProfile.status === 'active'
                    ? (language === 'ur' ? 'فعال و تصدیق شدہ' : 'Active & Verified')
                    : currentProfile.status === 'approved'
                    ? (language === 'ur' ? 'منظور شدہ' : 'Approved')
                    : currentProfile.status === 'pending_review'
                    ? (language === 'ur' ? 'زیرِ جائزہ' : 'Pending Review')
                    : currentProfile.status === 'introduction_authorized'
                    ? (language === 'ur' ? 'تعارف کی اجازت' : 'Introduction Authorized')
                    : (language === 'ur' ? 'غیر فعال' : 'Inactive')
                }
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
              {t.customerWelcome} {currentProfile.fullName}
            </h1>
            <p className="text-xs sm:text-sm text-[#88A8A8]/80 mt-1 max-w-xl leading-relaxed">
              {language === 'ur'
                ? 'خوش آمدید! آپ کے کوائف کی مکمل رازداری کے ساتھ مناسب رشتوں کا باوقار انتخاب کیا جا رہا ہے۔'
                : 'Your private portfolio is managed with complete family discretion and personalized matchmaker care.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-end">
              <span className="block text-[11px] text-[#88A8A8]/70">Reference ID</span>
              <span className="font-mono text-lg font-bold text-[#B69A62]">{currentProfile.id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-8 flex items-center gap-2 border-b border-[#E7E2D8] pb-3 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('recommendations'); setSelectedCandidate(null); }}
          className={`px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'recommendations' ? 'bg-[#182848] text-[#F7F3EA] shadow-sm' : 'text-[#68716D] hover:text-[#252E2C]'
          }`}
        >
          {t.customerRecommendations} ({userRecs.length})
        </button>

        <button
          onClick={() => { setActiveTab('my-profile'); setSelectedCandidate(null); }}
          className={`px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'my-profile' ? 'bg-[#182848] text-[#F7F3EA] shadow-sm' : 'text-[#68716D] hover:text-[#252E2C]'
          }`}
        >
          {language === 'ur' ? 'میرے درج شدہ کوائف' : 'My Registered Profile'}
        </button>

        <button
          onClick={() => { setActiveTab('preferences'); setSelectedCandidate(null); }}
          className={`px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'preferences' ? 'bg-[#182848] text-[#F7F3EA] shadow-sm' : 'text-[#68716D] hover:text-[#252E2C]'
          }`}
        >
          {t.customerPreferences}
        </button>

        <button
          onClick={() => { setActiveTab('privacy'); setSelectedCandidate(null); }}
          className={`px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'privacy' ? 'bg-[#182848] text-[#F7F3EA] shadow-sm' : 'text-[#68716D] hover:text-[#252E2C]'
          }`}
        >
          {t.customerPrivacyCenter}
        </button>
      </div>

      {/* TAB 1: AUTHORIZED RECOMMENDATIONS (P1-16) */}
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

          {userRecs.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-3xl bg-white border border-[#E7E2D8]">
              <Sparkles className="w-10 h-10 text-[#B69A62] mx-auto mb-3" />
              <h4 className="font-serif text-lg font-bold text-[#182848]">
                {language === 'ur' ? 'فی الوقت کوئی نئی منظور شدہ تجویز موجود نہیں' : 'No Approved Match Proposals Yet'}
              </h4>
              <p className="text-xs text-[#68716D] max-w-md mx-auto mt-1">
                {language === 'ur'
                  ? 'ندیم صاحب آپ کی ترجیحات کے مطابق رشتوں کا بغور جائزہ لے رہے ہیں۔ جیسے ہی کوئی موزوں تجویز منظور ہو گی، یہاں ظاہر ہو جائے گی۔'
                  : 'Nadeem is actively reviewing potential matches against your family preferences. Approved introductions will appear here.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {userRecs.map((rec) => {
                const otherId = rec.requestingProfileId === currentProfile.id ? rec.candidateProfileId : rec.requestingProfileId;
                const candidate =
                  (rec.candidateProfile as ProfileRecord) ||
                  candidateProfiles.find((p) => p.id === otherId || p.referenceCode === otherId) ||
                  candidateProfiles[0];

                if (!candidate) return null;

                return (
                  <div key={rec.id} className="space-y-3">
                    <ProfileCard
                      profile={candidate}
                      language={language}
                      matchScore={rec.matchScore}
                      onViewDetails={() => setSelectedCandidate(candidate)}
                    />
                    <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-xs">
                      <span className="font-semibold text-[#182848] block mb-0.5">
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
          )}

          {/* Modal / Overlay for Candidate View if selected */}
          {selectedCandidate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-md p-4 overflow-y-auto">
              <div className="relative w-full max-w-2xl rounded-3xl glass-panel-dense p-6 sm:p-8 shadow-2xl border border-[#B69A62]/40 text-xs">
                <div className="flex items-center justify-between border-b border-[#E7E2D8] pb-3 mb-4">
                  <h3 className="font-serif text-2xl font-bold text-[#182848]">
                    {selectedCandidate.displayName || selectedCandidate.fullName} ({selectedCandidate.referenceCode || selectedCandidate.id})
                  </h3>
                  <button
                    onClick={() => setSelectedCandidate(null)}
                    className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 cursor-pointer"
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
                  <div className="rounded-2xl border border-amber-200/40 bg-amber-500/10 backdrop-blur-md p-4 text-amber-950">
                    <span className="font-bold block mb-1">Introduction Step:</span>
                    <p>
                      If your family is interested in proceeding, request an introduction. Nadeem will facilitate formal communication between both elders.
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      onClick={() => setSelectedCandidate(null)}
                      className="px-4 py-2 border rounded-xl cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        alert('Introduction request sent to Nadeem. He will contact both families today.');
                        setSelectedCandidate(null);
                      }}
                      className="px-5 py-2 bg-[#182848] text-white font-semibold rounded-xl hover:bg-[#283848] transition-colors cursor-pointer"
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

      {/* TAB 3: PREFERENCES EDITOR (P1-17) */}
      {activeTab === 'preferences' && (
        <div className="glass-panel p-6 sm:p-8 space-y-6 animate-fadeIn">
          <div className="border-b border-[#E7E2D8] pb-4">
            <h3 className="font-serif text-2xl font-bold text-[#182848]">
              {t.customerPreferences}
            </h3>
            <p className="text-xs text-[#68716D] mt-1">
              {language === 'ur'
                ? 'اپنے مطلوبہ شریکِ حیات کے لیے شرائط اور معیارات کا انتخاب کریں۔ ندیم صاحب ان ترجیحات کی بنیاد پر موزوں رشتوں کا انتخاب کرتے ہیں۔'
                : 'Fine-tune your spouse expectations. Nadeem uses these weights to prioritize matches.'}
            </p>
          </div>

          {preferenceSaveMessage && (
            <div
              className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                preferenceSaveMessage.type === 'success'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-100 text-rose-900 border border-rose-300'
              }`}
            >
              {preferenceSaveMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-700" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-700" />
              )}
              <span>{preferenceSaveMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSavePreferences} className="space-y-6 text-xs">
            {/* Age Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#182848] mb-1">
                  {language === 'ur' ? 'کم از کم عمر (سال)' : 'Minimum Age (Years)'}
                </label>
                <input
                  type="number"
                  min="18"
                  max="70"
                  value={prefAgeMin}
                  onChange={(e) => setPrefAgeMin(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#E7E2D8] p-2.5 text-xs focus:border-[#182848] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">
                  {language === 'ur' ? 'زیادہ سے زیادہ عمر (سال)' : 'Maximum Age (Years)'}
                </label>
                <input
                  type="number"
                  min="18"
                  max="70"
                  value={prefAgeMax}
                  onChange={(e) => setPrefAgeMax(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#E7E2D8] p-2.5 text-xs focus:border-[#182848] focus:outline-none"
                />
              </div>
            </div>

            {/* Minimum Education & Caste Expectation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#182848] mb-1">
                  {language === 'ur' ? 'کم از کم تعلیم' : 'Minimum Education'}
                </label>
                <input
                  type="text"
                  value={prefEducation}
                  onChange={(e) => setPrefEducation(e.target.value)}
                  placeholder="e.g. Bachelors, Masters, MBBS"
                  className="w-full rounded-xl border border-[#E7E2D8] p-2.5 text-xs focus:border-[#182848] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">
                  {language === 'ur' ? 'برادری / ذات کی ترجیح' : 'Caste / Community Preference'}
                </label>
                <input
                  type="text"
                  value={prefCaste}
                  onChange={(e) => setPrefCaste(e.target.value)}
                  placeholder="e.g. Rajput, Sheikh, Arain, Any"
                  className="w-full rounded-xl border border-[#E7E2D8] p-2.5 text-xs focus:border-[#182848] focus:outline-none"
                />
              </div>
            </div>

            {/* City Preferences */}
            <div>
              <label className="block font-semibold text-[#182848] mb-1">
                {language === 'ur' ? 'مطلوبہ شہر (کوما سے الگ کریں)' : 'Preferred Cities (comma-separated)'}
              </label>
              <input
                type="text"
                value={prefCities}
                onChange={(e) => setPrefCities(e.target.value)}
                placeholder="e.g. Lahore, Islamabad, Rawalpindi"
                className="w-full rounded-xl border border-[#E7E2D8] p-2.5 text-xs focus:border-[#182848] focus:outline-none"
              />
            </div>

            {/* Family Arrangement Preference */}
            <div>
              <label className="block font-semibold text-[#182848] mb-1">
                {language === 'ur' ? 'گھریلو رہائش کی ترجیح' : 'Household Arrangement'}
              </label>
              <select
                value={prefFamily}
                onChange={(e) => setPrefFamily(e.target.value as any)}
                className="w-full rounded-xl border border-[#E7E2D8] p-2.5 text-xs focus:border-[#182848] focus:outline-none"
              >
                <option value="any">{language === 'ur' ? 'کوئی بھی قابلِ قبول' : 'Any Arrangement'}</option>
                <option value="independent">{language === 'ur' ? 'علیحدہ گھر / آزاد' : 'Independent Home'}</option>
                <option value="joint_family">{language === 'ur' ? 'مشترکہ خاندانی نظام' : 'Joint Family'}</option>
              </select>
            </div>

            {/* Criteria Importance Weights */}
            <div className="space-y-3 pt-2 border-t border-[#E7E2D8]">
              <h4 className="font-semibold text-sm text-[#182848]">
                {language === 'ur' ? 'معیارات کی ترجیحی اہمیت (وزن)' : 'Criteria Importance Weights'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['age', 'education', 'caste', 'city', 'religion'].map((criterion) => (
                  <div
                    key={criterion}
                    className="flex items-center justify-between p-3 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md"
                  >
                    <span className="font-semibold capitalize text-[#182848]">{criterion}</span>
                    <select
                      value={prefWeights[criterion] || 'preferred'}
                      onChange={(e) => setPrefWeights({ ...prefWeights, [criterion]: e.target.value })}
                      className="rounded-lg border border-[#E7E2D8] px-2 py-1 text-xs font-semibold bg-white text-[#182848]"
                    >
                      <option value="mandatory">{language === 'ur' ? 'لازمی شرط' : 'Mandatory'}</option>
                      <option value="important">{language === 'ur' ? 'اہم' : 'Important'}</option>
                      <option value="preferred">{language === 'ur' ? 'ترجیحی' : 'Preferred'}</option>
                      <option value="acceptable_range">{language === 'ur' ? 'لچکدار' : 'Flexible'}</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingPreferences}
              className="rounded-xl bg-[#182848] px-6 py-2.5 text-xs font-semibold text-[#F7F3EA] shadow hover:bg-[#283848] transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSavingPreferences
                ? (language === 'ur' ? 'محفوظ کیا جا رہا ہے...' : 'Saving Preferences...')
                : (language === 'ur' ? 'ترجیحات محفوظ کریں' : 'Save Preferences')}
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: PRIVACY & CONSENT CENTER */}
      {activeTab === 'privacy' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="glass-panel p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-[#E7E2D8] pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#182848] text-[#B69A62]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-2xl font-bold text-[#182848]">
                  {t.customerPrivacyCenter}
                </h3>
                <p className="text-xs text-[#68716D]">
                  Manage confidential information visibility, photo consent, and profile correction requests.
                </p>
              </div>
            </div>

            {/* Photo Sharing Toggle */}
            <div className="space-y-3">
              <label className="flex items-center justify-between p-4 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md cursor-pointer">
                <div>
                  <span className="font-bold text-sm text-[#182848] block">Photograph Discretion</span>
                  <span className="text-xs text-[#68716D]">
                    Allow Nadeem to share photographs only after candidate background verification.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={photoConsent}
                  onChange={(e) => setPhotoConsent(e.target.checked)}
                  className="rounded border-[#B69A62] text-[#182848] h-5 w-5"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md cursor-pointer">
                <div>
                  <span className="font-bold text-sm text-[#182848] block">Direct Family Phone Number Sharing</span>
                  <span className="text-xs text-[#68716D]">
                    Require verbal approval from family before disclosing telephone contact to prospective match.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={contactConsent}
                  onChange={(e) => setContactConsent(e.target.checked)}
                  className="rounded border-[#B69A62] text-[#182848] h-5 w-5"
                />
              </label>
            </div>

            {/* Profile Data Correction / Deactivation Request */}
            <form onSubmit={handleSendCorrection} className="pt-4 border-t border-[#E7E2D8] space-y-3">
              <h4 className="font-serif text-lg font-bold text-[#182848]">
                {language === 'ur' ? 'کوائف کی تصحیح یا پروفائل غیر فعال کرنے کی درخواست' : 'Request Profile Update, Deactivation, or Deletion'}
              </h4>
              <p className="text-xs text-[#68716D]">
                If your contact number, city, marital situation has changed, or you wish to deactivate your profile, submit a request directly to bureau administration.
              </p>

              {/* Request Type Selector */}
              <div className="flex gap-4">
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="requestType"
                    value="profile_correction"
                    checked={requestType === 'profile_correction'}
                    onChange={() => setRequestType('profile_correction')}
                    className="text-[#182848]"
                  />
                  <span>{language === 'ur' ? 'کوائف میں درستگی' : 'Data Correction'}</span>
                </label>

                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="requestType"
                    value="deactivation_request"
                    checked={requestType === 'deactivation_request'}
                    onChange={() => setRequestType('deactivation_request')}
                    className="text-[#182848]"
                  />
                  <span>{language === 'ur' ? 'پروفائل غیر فعال کریں' : 'Deactivate Profile'}</span>
                </label>

                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="requestType"
                    value="photo_consent_change"
                    checked={requestType === 'photo_consent_change'}
                    onChange={() => setRequestType('photo_consent_change')}
                    className="text-[#182848]"
                  />
                  <span>{language === 'ur' ? 'تصویر کی اجازت' : 'Photo Consent'}</span>
                </label>
              </div>

              <textarea
                value={correctionNote}
                onChange={(e) => setCorrectionNote(e.target.value)}
                placeholder={
                  requestType === 'deactivation_request'
                    ? (language === 'ur' ? 'پروفائل غیر فعال کرنے کی وجہ بیان کریں (مثلاً رشتہ طے پا گیا ہے)...' : 'Describe your reason for deactivating the profile (e.g. matched elsewhere)...')
                    : (language === 'ur' ? 'درست شدہ کوائف یا تفصیلات درج کریں...' : 'Describe your requested correction or updated details...')
                }
                rows={3}
                className="w-full rounded-2xl border border-[#E7E2D8] p-3 text-xs focus:border-[#182848] focus:outline-none"
              />
              <button
                type="submit"
                disabled={isRequestSent}
                className="inline-flex items-center gap-2 rounded-xl bg-[#182848] px-5 py-2.5 text-xs font-semibold text-[#F7F3EA] shadow hover:bg-[#283848] transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-[#B69A62]" />
                <span>
                  {isRequestSent
                    ? (language === 'ur' ? 'درخواست بھیجی جا رہی ہے...' : 'Submitting Request...')
                    : (language === 'ur' ? 'محفوظ درخواست جمع کرائیں' : 'Submit Confidential Request')}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
