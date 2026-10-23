import React, { useState } from 'react';
import { ProfileRecord, Language } from '../../types';
import { translations } from '../../i18n/translations';
import { 
  ShieldCheck, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Home, 
  Users, 
  Share2, 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  CheckCircle,
  Eye
} from 'lucide-react';
import { formatPKR } from '../../utils/finance';
import { convertMarlaToKanal } from '../../utils/units';

interface ProfileCardProps {
  profile: ProfileRecord;
  language: Language;
  onViewDetails?: (profile: ProfileRecord) => void;
  onFindMatch?: (profile: ProfileRecord) => void;
  onShareWhatsApp?: (profile: ProfileRecord) => void;
  showInternalNotes?: boolean;
  matchScore?: number;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  language,
  onViewDetails,
  onFindMatch,
  onShareWhatsApp,
  showInternalNotes = false,
  matchScore,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = translations[language];

  const landConversion = convertMarlaToKanal(profile.property.areaMarlas);

  const statusConfig = {
    pending_review: {
      label: language === 'ur' ? 'زیرِ جائزہ' : 'Pending Review',
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    approved: {
      label: language === 'ur' ? 'منظور شدہ' : 'Approved',
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    active: {
      label: language === 'ur' ? 'بیورو میں فعال' : 'Active in Bureau',
      bg: 'bg-[#182848]/10 text-[#182848] border-[#182848]/30',
    },
    introduction_authorized: {
      label: language === 'ur' ? 'تعارف کی اجازت' : 'Intro Authorized',
      bg: 'bg-[#B69A62]/20 text-[#674F20] border-[#B69A62]/40',
    },
    inactive: {
      label: language === 'ur' ? 'غیر فعال' : 'Inactive',
      bg: 'bg-gray-100 text-gray-600 border-gray-200',
    },
    restricted: {
      label: language === 'ur' ? 'خفیہ / محدود' : 'Restricted',
      bg: 'bg-rose-50 text-rose-800 border-rose-200',
    },
  }[profile.status];

  return (
    <div className="glass-card overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-[#B69A62]/60 group">
      {/* Top Banner & Status */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 backdrop-blur-md px-5 py-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold tracking-wider text-[#182848] bg-[#182848]/10 px-2.5 py-0.5 rounded-full border border-[#182848]/20">
            {profile.id}
          </span>
          <span className="text-[10px] text-[#68716D] uppercase tracking-wider hidden sm:inline">
            {profile.gender === 'female' ? (language === 'ur' ? 'خاتون امید وار' : 'Bride Candidate') : (language === 'ur' ? 'مرد امید وار' : 'Groom Candidate')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {matchScore !== undefined && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#B69A62] bg-[#B69A62]/15 px-2.5 py-0.5 text-xs font-semibold text-[#182848]">
              <span>★ {matchScore}%</span>
              <span className="text-[10px] font-normal text-[#674F20]">Match</span>
            </span>
          )}

          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusConfig.bg}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
            <span>{statusConfig.label}</span>
          </span>
        </div>
      </div>

      {/* Main Card Body */}
      <div className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-5">
          {/* Avatar / Portrait Frame with Architectural Arch */}
          <div className="relative shrink-0 mx-auto sm:mx-0">
            <div className="relative h-28 w-24 sm:h-32 sm:w-28 overflow-hidden rounded-t-full rounded-b-xl border border-[#B69A62]/40 bg-[#182848]/10 shadow-sm">
              {profile.photoPermissionGranted ? (
                <img
                  src={profile.photoUrl}
                  alt={profile.displayName}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-[#182848] to-[#283848] text-[#F7F3EA] p-2 text-center">
                  <Lock className="w-5 h-5 text-[#B69A62] mb-1" />
                  <span className="text-[10px] text-[#88A8A8] leading-tight">Photo Protected</span>
                  <span className="text-[9px] text-[#B69A62]/90">On Request</span>
                </div>
              )}
            </div>

            {/* Verified Crest */}
            <div
              className="absolute -bottom-2 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#182848] text-[#B69A62] border border-[#F7F3EA] shadow"
              title="Verified Bureau Credentials"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Core Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-1 mb-1">
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#182848] leading-snug">
                {profile.displayName}
              </h3>
              <div className="text-sm text-[#182848] font-semibold" dir="ltr">
                <span>{profile.age} yrs</span> • <span>{profile.height}</span>
              </div>
            </div>

            <p className="text-sm text-[#486878] mb-3 font-medium">
              <span className="text-[#182848] font-semibold">{profile.caste}</span> ({profile.subCaste || profile.aqeedah})
              <span className="mx-1.5">•</span>
              <span>{profile.maritalStatus === 'never_married' ? (language === 'ur' ? 'غیر شادی شدہ' : 'Never Married') : profile.maritalStatus}</span>
            </p>

            {/* Key Attribute Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-[#252E2C] mb-4">
              <div className="flex items-center gap-2 truncate">
                <GraduationCap className="w-4 h-4 text-[#486878] shrink-0" />
                <span className="truncate" title={profile.education}>{profile.education}</span>
              </div>
              <div className="flex items-center gap-2 truncate">
                <Briefcase className="w-4 h-4 text-[#486878] shrink-0" />
                <span className="truncate" title={profile.occupation}>{profile.occupation}</span>
              </div>
              <div className="flex items-center gap-2 truncate">
                <MapPin className="w-4 h-4 text-[#486878] shrink-0" />
                <span className="truncate">{profile.currentCity} ({profile.residenceArea})</span>
              </div>
              <div className="flex items-center gap-2 truncate">
                <Home className="w-4 h-4 text-[#486878] shrink-0" />
                <span>
                  {language === 'ur' ? landConversion.formattedUrdu : landConversion.formattedEn}
                  <span className="text-[#68716D] text-xs"> ({profile.property.propertyType})</span>
                </span>
              </div>
            </div>

            {/* Sibling Overview Line */}
            <div className="flex items-center gap-2 text-sm text-[#252E2C] bg-[#F7F3EA] rounded-xl px-3.5 py-2 border border-[#E7E2D8]">
              <Users className="w-4 h-4 text-[#182848] shrink-0" />
              <span>
                {language === 'ur'
                  ? `${profile.siblings.length} بہن بھائی (${profile.siblings.filter(s => s.relation === 'brother').length} بھائی، ${profile.siblings.filter(s => s.relation === 'sister').length} بہنیں)`
                  : `${profile.siblings.length} Siblings (${profile.siblings.filter(s => s.relation === 'brother').length} Brothers, ${profile.siblings.filter(s => s.relation === 'sister').length} Sisters)`}
              </span>
            </div>
          </div>
        </div>

        {/* Expandable Family & Property Details */}
        {isExpanded && (
          <div className="mt-5 pt-4 border-t border-[#E7E2D8] space-y-4 text-xs animate-fadeIn">
            {/* Family Details */}
            <div className="bg-[#FFFEFA] rounded-xl border border-[#E7E2D8] p-3.5 space-y-2">
              <h4 className="font-semibold text-[#182848] flex items-center justify-between">
                <span>{language === 'ur' ? 'خاندانی پس منظر' : 'Family Background & Lineage'}</span>
                <span className="text-[10px] text-[#68716D]">
                  Father: {profile.fatherStatus === 'alive' ? 'Alive' : 'Deceased'} ({profile.fatherOccupation})
                </span>
              </h4>
              <p className="text-[#252E2C] leading-relaxed italic">
                "{profile.familyBackgroundNotes}"
              </p>

              {/* Sibling Detailed Records */}
              <div className="pt-2">
                <span className="font-medium text-[#182848] block mb-1">
                  {language === 'ur' ? 'بہن بھائیوں کے کوائف:' : 'Detailed Sibling Records:'}
                </span>
                <div className="space-y-1.5">
                  {profile.siblings.map((sib) => (
                    <div key={sib.id} className="flex items-start justify-between bg-[#F7F3EA]/70 p-2 rounded-lg text-[11px]">
                      <div>
                        <span className="font-semibold capitalize text-[#182848]">{sib.relation}</span>
                        {sib.name && <span>: {sib.name}</span>}
                        {sib.age && <span className="text-[#68716D]"> ({sib.age} yrs)</span>}
                        <span className="text-[#68716D] block">{sib.occupation || 'Not disclosed'}</span>
                      </div>
                      <div className="text-end">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] bg-[#789898]/20 text-[#182848] font-medium capitalize">
                          {sib.maritalStatus}
                        </span>
                        {sib.marriageDetails && (
                          <span className="block text-[10px] text-[#68716D] max-w-[180px] truncate" title={sib.marriageDetails}>
                            {sib.marriageDetails}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Property Breakdown */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/15 p-3.5 text-[11px] grid grid-cols-2 gap-2">
              <div>
                <span className="text-[#68716D] block">Property Ownership:</span>
                <span className="font-semibold text-[#182848] capitalize">{profile.property.ownership}</span>
              </div>
              <div>
                <span className="text-[#68716D] block">Estimated Valuation:</span>
                <span className="font-semibold text-[#182848]">
                  {profile.property.approxValuePKR ? formatPKR(profile.property.approxValuePKR) : 'Undisclosed'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-[#68716D] block">Household Type:</span>
                <span className="capitalize">{profile.property.householdArrangement.replace('_', ' ')} family system</span>
              </div>
            </div>

            {/* Internal Notes if authorized */}
            {showInternalNotes && profile.internalNotes && (
              <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-2.5 text-[11px] text-amber-900">
                <span className="font-semibold block mb-0.5">Nadeem's Matchmaker Internal Note:</span>
                <p>{profile.internalNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* Card Footer Actions */}
        <div className="mt-5 pt-3.5 border-t border-[#E7E2D8] flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#182848] hover:text-[#B69A62] transition-colors"
          >
            <span>{isExpanded ? (language === 'ur' ? 'کم تفصیلات' : 'Hide Details') : (language === 'ur' ? 'مزید خاندانی تفصیلات' : 'Family Details')}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <div className="flex items-center gap-2">
            {onShareWhatsApp && (
              <button
                onClick={() => onShareWhatsApp(profile)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#B69A62]/40 bg-white/10 hover:bg-white/25 backdrop-blur-md px-3 py-1.5 text-xs font-medium text-[#182848] shadow-xs transition-colors cursor-pointer"
                title="Prepare Controlled WhatsApp Proposal"
              >
                <Share2 className="w-3.5 h-3.5 text-[#B69A62]" />
                <span className="hidden sm:inline">{t.btnShareWhatsApp}</span>
              </button>
            )}

            {onFindMatch && (
              <button
                onClick={() => onFindMatch(profile)}
                className="inline-flex items-center gap-1 rounded-full bg-[#182848] px-4 py-1.5 text-xs font-semibold text-[#F7F3EA] shadow-md hover:bg-[#283848] transition-colors cursor-pointer"
              >
                <span>{t.actionFindMatch}</span>
              </button>
            )}

            {onViewDetails && (
              <button
                onClick={() => onViewDetails(profile)}
                className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur-md px-3 py-1.5 text-xs font-medium text-[#252E2C] transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-[#486878]" />
                <span>{language === 'ur' ? 'مکمل کوائف' : 'View'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
