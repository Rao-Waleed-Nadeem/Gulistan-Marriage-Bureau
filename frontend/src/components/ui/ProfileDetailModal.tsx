import React from 'react';
import { ProfileRecord, Language } from '../../types';
import { translations } from '../../i18n/translations';
import { 
  X, 
  ShieldCheck, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Home, 
  Users, 
  Share2, 
  Search, 
  Lock, 
  Phone, 
  DollarSign, 
  Heart, 
  FileText,
  Calendar,
  Sparkles
} from 'lucide-react';
import { formatPKR } from '../../utils/finance';
import { convertMarlaToKanal } from '../../utils/units';

interface ProfileDetailModalProps {
  profile: ProfileRecord | null;
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onFindMatch?: (profile: ProfileRecord) => void;
  onShareWhatsApp?: (profile: ProfileRecord) => void;
  showInternalNotes?: boolean;
}

export const ProfileDetailModal: React.FC<ProfileDetailModalProps> = ({
  profile,
  isOpen,
  onClose,
  language,
  onFindMatch,
  onShareWhatsApp,
  showInternalNotes = true,
}) => {
  if (!isOpen || !profile) return null;

  const t = translations[language];
  const isRTL = language === 'ur';
  const landConversion = convertMarlaToKanal(profile.property.areaMarlas);

  const statusConfig = {
    pending_review: {
      label: isRTL ? 'زیرِ جائزہ' : 'Pending Review',
      badge: 'bg-amber-100 text-amber-900 border-amber-300',
    },
    approved: {
      label: isRTL ? 'منظور شدہ' : 'Approved',
      badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    },
    active: {
      label: isRTL ? 'بیورو میں فعال' : 'Active in Bureau',
      badge: 'bg-blue-100 text-blue-900 border-blue-300',
    },
    introduction_authorized: {
      label: isRTL ? 'تعارف کی اجازت یافتہ' : 'Introduction Authorized',
      badge: 'bg-[#B69A62]/25 text-[#5C4518] border-[#B69A62]/50',
    },
    inactive: {
      label: isRTL ? 'غیر فعال' : 'Inactive',
      badge: 'bg-gray-100 text-gray-700 border-gray-300',
    },
    restricted: {
      label: isRTL ? 'خفیہ / محدود' : 'Restricted',
      badge: 'bg-rose-100 text-rose-900 border-rose-300',
    },
  }[profile.status];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-detail-title"
    >
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#FFFEFA] border border-[#B69A62]/40 shadow-2xl text-[#252E2C] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Sticky Modal Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-[#FFFEFA]/95 backdrop-blur-md border-b border-[#E7E2D8]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-[#182848] text-white">
              {profile.id}
            </span>
            <span className={`px-3 py-0.5 rounded-full text-xs font-semibold border ${statusConfig.badge}`}>
              {statusConfig.label}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#68716D] hover:text-[#182848] hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Section */}
        <div className="p-6 sm:p-8 bg-gradient-to-b from-[#F7F3EA]/70 to-[#FFFEFA] border-b border-[#E7E2D8]">
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-start">
            {/* Prominent Photograph */}
            <div className="relative shrink-0">
              <div className="h-44 w-36 sm:h-52 sm:w-44 rounded-2xl overflow-hidden border-2 border-[#B69A62]/40 shadow-md bg-[#182848]/10">
                {profile.photoPermissionGranted ? (
                  <img
                    src={profile.photoUrl}
                    alt={profile.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-b from-[#182848] to-[#283848] text-white p-4">
                    <Lock className="w-8 h-8 text-[#B69A62] mb-2" />
                    <span className="text-xs font-semibold">{isRTL ? 'تصویر محفوظ ہے' : 'Photo Protected'}</span>
                    <span className="text-[10px] text-[#B69A62]">{isRTL ? 'درخواست پر دستیاب' : 'Consent Gated'}</span>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full bg-[#182848] text-[#B69A62] flex items-center justify-center border-2 border-white shadow">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>

            {/* Title & Quick Stats */}
            <div className="flex-1">
              <h2 id="profile-detail-title" className="font-serif text-2xl sm:text-3xl font-bold text-[#182848] mb-1">
                {profile.fullName}
              </h2>
              <p className="text-sm font-semibold text-[#587888] mb-3">
                {profile.caste} ({profile.subCaste || profile.aqeedah}) • {profile.maritalStatus === 'never_married' ? (isRTL ? 'غیر شادی شدہ' : 'Never Married') : profile.maritalStatus}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-[#252E2C] mb-4">
                <div className="p-2.5 rounded-xl bg-white border border-[#E7E2D8]">
                  <span className="text-[#68716D] block text-[11px]">{t.age} & {t.height}</span>
                  <span className="font-bold text-sm text-[#182848]">{profile.age} yrs • {profile.height}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#E7E2D8]">
                  <span className="text-[#68716D] block text-[11px]">{t.currentCity}</span>
                  <span className="font-bold text-sm text-[#182848]">{profile.currentCity}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#E7E2D8] col-span-2 sm:col-span-1">
                  <span className="text-[#68716D] block text-[11px]">{t.occupation}</span>
                  <span className="font-bold text-sm text-[#182848] truncate block" title={profile.occupation}>{profile.occupation}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-2">
                {onFindMatch && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onFindMatch(profile);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#182848] text-white text-xs font-semibold hover:bg-[#283848] shadow-sm cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5 text-[#B69A62]" />
                    <span>{t.actionFindMatch}</span>
                  </button>
                )}

                {onShareWhatsApp && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onShareWhatsApp(profile);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-600 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t.btnShareWhatsApp}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="p-6 sm:p-8 space-y-6 text-sm">
          {/* Section 1: Personal Details */}
          <div className="rounded-2xl border border-[#E7E2D8] bg-white p-5 space-y-3">
            <h3 className="font-serif text-lg font-bold text-[#182848] flex items-center gap-2 border-b border-[#E7E2D8] pb-2">
              <span className="h-2 w-2 rounded-full bg-[#B69A62]" />
              <span>{isRTL ? 'ذاتی تفصیلات' : 'Personal Details'}</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[#68716D] block">{t.fullName}</span>
                <span className="font-semibold text-[#182848] text-sm">{profile.fullName}</span>
              </div>
              <div>
                <span className="text-[#68716D] block">{t.displayName}</span>
                <span className="font-semibold text-[#182848] text-sm">{profile.displayName}</span>
              </div>
              <div>
                <span className="text-[#68716D] block">{t.gender}</span>
                <span className="font-semibold capitalize text-[#182848]">{profile.gender}</span>
              </div>
              <div>
                <span className="text-[#68716D] block">{t.religion} & {t.aqeedah}</span>
                <span className="font-semibold text-[#182848]">{profile.religion} ({profile.aqeedah})</span>
              </div>
              <div>
                <span className="text-[#68716D] block">{t.caste}</span>
                <span className="font-semibold text-[#182848]">{profile.caste} {profile.subCaste ? `(${profile.subCaste})` : ''}</span>
              </div>
              <div>
                <span className="text-[#68716D] block">{t.residenceArea}</span>
                <span className="font-semibold text-[#182848]">{profile.residenceArea}, {profile.currentCity}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Education & Employment */}
          <div className="rounded-2xl border border-[#E7E2D8] bg-white p-5 space-y-3">
            <h3 className="font-serif text-lg font-bold text-[#182848] flex items-center gap-2 border-b border-[#E7E2D8] pb-2">
              <GraduationCap className="w-5 h-5 text-[#B69A62]" />
              <span>{isRTL ? 'تعلیم اور روزگار' : 'Education & Employment'}</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[#68716D] block">{t.education}</span>
                <span className="font-semibold text-[#182848] text-sm">{profile.education}</span>
              </div>
              <div>
                <span className="text-[#68716D] block">{t.educationField}</span>
                <span className="font-semibold text-[#182848]">{profile.educationField}</span>
              </div>
              <div>
                <span className="text-[#68716D] block">{t.occupation}</span>
                <span className="font-semibold text-[#182848]">{profile.occupation}</span>
              </div>
              <div>
                <span className="text-[#68716D] block">{t.jobTitle}</span>
                <span className="font-semibold text-[#182848]">{profile.jobTitle}</span>
              </div>
              <div>
                <span className="text-[#68716D] block">{t.monthlyIncome}</span>
                <span className="font-semibold text-[#182848]">
                  {profile.monthlyIncomePKR ? `${formatPKR(profile.monthlyIncomePKR)} / mo` : (isRTL ? 'غیر ظاہر شدہ' : 'Undisclosed')}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Family Heritage & Parents */}
          <div className="rounded-2xl border border-[#E7E2D8] bg-white p-5 space-y-3">
            <h3 className="font-serif text-lg font-bold text-[#182848] flex items-center gap-2 border-b border-[#E7E2D8] pb-2">
              <Users className="w-5 h-5 text-[#B69A62]" />
              <span>{isRTL ? 'خاندانی پس منظر و والدین' : 'Family Background & Parents'}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#68716D] block">{t.fatherStatus} & Occupation</span>
                <span className="font-semibold text-[#182848]">
                  {profile.fatherStatus ? (profile.fatherStatus === 'alive' ? (isRTL ? 'حیات' : 'Alive') : (isRTL ? 'مرحوم' : 'Deceased')) : (isRTL ? 'غیر واضح' : 'Not Disclosed')} — {profile.fatherOccupation || (isRTL ? 'درج نہیں' : 'Not Specified')}
                </span>
              </div>
              <div>
                <span className="text-[#68716D] block">{t.motherStatus} & Occupation</span>
                <span className="font-semibold text-[#182848]">
                  {profile.motherStatus ? (profile.motherStatus === 'alive' ? (isRTL ? 'حیات' : 'Alive') : (isRTL ? 'مرحوم' : 'Deceased')) : (isRTL ? 'غیر واضح' : 'Not Disclosed')} — {profile.motherOccupation || (isRTL ? 'درج نہیں' : 'Not Specified')}
                </span>
              </div>
            </div>
            {profile.familyBackgroundNotes && (
              <div className="pt-2 text-xs text-[#252E2C] bg-[#F7F3EA]/70 p-3 rounded-xl border border-[#E7E2D8]">
                <span className="text-[#68716D] block font-semibold mb-1">{t.familyBackground}:</span>
                <p className="italic leading-relaxed">"{profile.familyBackgroundNotes}"</p>
              </div>
            )}
          </div>

          {/* Section 4: Siblings Detailed Records */}
          <div className="rounded-2xl border border-[#E7E2D8] bg-white p-5 space-y-3">
            <h3 className="font-serif text-lg font-bold text-[#182848] flex items-center justify-between border-b border-[#E7E2D8] pb-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#B69A62]" />
                <span>{isRTL ? 'بہن بھائیوں کے کوائف' : 'Siblings Detailed Records'}</span>
              </div>
              <span className="text-xs font-normal text-[#68716D]">
                Total: {profile.siblings.length}
              </span>
            </h3>
            {profile.siblings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {profile.siblings.map((sib, index) => (
                  <div key={sib.id || index} className="p-3 rounded-xl bg-[#F7F3EA]/60 border border-[#E7E2D8] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#182848] capitalize">{sib.relation}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-[#E7E2D8] capitalize">
                        {sib.maritalStatus}
                      </span>
                    </div>
                    {sib.name && <div className="text-[#252E2C]"><strong className="text-[#68716D]">Name:</strong> {sib.name}</div>}
                    {sib.age && <div className="text-[#68716D]">Age: {sib.age} yrs</div>}
                    {sib.occupation && <div className="text-[#252E2C]"><strong className="text-[#68716D]">Work:</strong> {sib.occupation}</div>}
                    {sib.marriageDetails && (
                      <div className="text-[11px] text-[#68716D] italic pt-1 border-t border-[#E7E2D8]">
                        {sib.marriageDetails}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#68716D] italic">{isRTL ? 'کوئی بہن بھائی درج نہیں' : 'No sibling records disclosed.'}</p>
            )}
          </div>

          {/* Section 5: Property and Residence */}
          <div className="rounded-2xl border border-[#E7E2D8] bg-white p-5 space-y-3">
            <h3 className="font-serif text-lg font-bold text-[#182848] flex items-center gap-2 border-b border-[#E7E2D8] pb-2">
              <Home className="w-5 h-5 text-[#B69A62]" />
              <span>{isRTL ? 'جائیداد اور رہائش' : 'Property & Housing Estate'}</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[#68716D] block">{t.propertyType}</span>
                <span className="font-semibold capitalize text-[#182848]">{profile.property.propertyType}</span>
              </div>
              <div>
                <span className="text-[#68716D] block">{t.propertyOwnership}</span>
                <span className="font-semibold capitalize text-[#182848]">{profile.property.ownership}</span>
              </div>
              <div>
                <span className="text-[#68716D] block">{t.landAreaMarla}</span>
                <span className="font-semibold text-[#182848]">
                  {isRTL ? landConversion.formattedUrdu : landConversion.formattedEn}
                </span>
              </div>
              <div>
                <span className="text-[#68716D] block">{t.approxValue}</span>
                <span className="font-semibold text-[#182848]">
                  {profile.property.approxValuePKR ? formatPKR(profile.property.approxValuePKR) : 'Undisclosed'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-[#68716D] block">{t.householdType}</span>
                <span className="font-semibold capitalize text-[#182848]">
                  {profile.property.householdArrangement.replace('_', ' ')} Family System
                </span>
              </div>
            </div>
          </div>

          {/* Section 6: Marriage Partner Preferences */}
          <div className="rounded-2xl border border-[#E7E2D8] bg-white p-5 space-y-3">
            <h3 className="font-serif text-lg font-bold text-[#182848] flex items-center gap-2 border-b border-[#E7E2D8] pb-2">
              <Heart className="w-5 h-5 text-rose-600" />
              <span>{isRTL ? 'شریکِ حیات کی ترجیحات' : 'Marriage Partner Preferences'}</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[#68716D] block">Age Range</span>
                <span className="font-semibold text-[#182848]">
                  {profile.preferences.ageMin} – {profile.preferences.ageMax} yrs
                </span>
              </div>
              <div>
                <span className="text-[#68716D] block">Education</span>
                <span className="font-semibold text-[#182848]">{profile.preferences.educationMin}</span>
              </div>
              <div>
                <span className="text-[#68716D] block">Caste Preference</span>
                <span className="font-semibold text-[#182848]">
                  {profile.preferences.caste || 'Flexible'}
                </span>
              </div>
              <div>
                <span className="text-[#68716D] block">Location</span>
                <span className="font-semibold text-[#182848]">
                  {profile.preferences.cityPreferences?.length ? profile.preferences.cityPreferences.join(', ') : 'Open'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-[#68716D] block">Career After Marriage</span>
                <span className="font-semibold capitalize text-[#182848]">
                  {profile.preferences.workAfterMarriagePreference ? profile.preferences.workAfterMarriagePreference.replace('_', ' ') : 'Not specified'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 7: Internal Bureau Notes (Staff authorized) */}
          {showInternalNotes && profile.internalNotes && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 space-y-2 text-xs">
              <span className="font-bold text-amber-950 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-700" />
                <span>Nadeem's Confidential Matchmaker Operational Notes:</span>
              </span>
              <p className="text-amber-900 leading-relaxed italic">
                "{profile.internalNotes}"
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 z-20 flex items-center justify-end gap-3 px-6 py-4 bg-[#FFFEFA]/95 backdrop-blur-md border-t border-[#E7E2D8]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-[#E7E2D8] text-xs font-semibold text-[#252E2C] hover:bg-gray-100 transition-colors cursor-pointer"
          >
            {t.btnCancel}
          </button>
        </div>
      </div>
    </div>
  );
};
