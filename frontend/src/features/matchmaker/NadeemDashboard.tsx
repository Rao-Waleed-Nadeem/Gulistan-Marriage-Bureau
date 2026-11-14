import React, { useState, useEffect } from 'react';
import { 
  ProfileRecord, 
  MatchRecommendation, 
  FollowUpItem, 
  ExternalMatchmaker, 
  DetailedExternalMatchmaker,
  FinancialTransaction, 
  Language, 
  Role 
} from '../../types';
import { translations } from '../../i18n/translations';
import { ProfileCard } from '../../components/ui/ProfileCard';
import { ProfileDetailModal } from '../../components/ui/ProfileDetailModal';
import { ControlledSharingModal } from '../../components/matching/ControlledSharingModal';
import { MatchReview } from './MatchReview';
import { FollowUpsView } from './FollowUpsView';
import { BestMatchView } from './BestMatchView';
import { formatPKR } from '../../utils/finance';
import { 
  UserPlus, 
  Search, 
  Clock, 
  Users, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  Sparkles, 
  Share2, 
  Plus, 
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  Home,
  Briefcase,
  ArrowLeft
} from 'lucide-react';

interface NadeemDashboardProps {
  profiles: ProfileRecord[];
  recommendations: MatchRecommendation[];
  followUps: FollowUpItem[];
  matchmakers: ExternalMatchmaker[];
  transactions: FinancialTransaction[];
  language: Language;
  activeTab?: 'overview' | 'profiles' | 'search' | 'followups' | 'finances';
  onTabChange?: (tab: 'overview' | 'profiles' | 'search' | 'followups' | 'finances') => void;
  onNavigateToWizard: () => void;
  onUpdateFollowUpStatus: (id: string, status: 'pending' | 'completed') => void;
  onAddTransaction: (tx: FinancialTransaction) => void;
}

export const NadeemDashboard: React.FC<NadeemDashboardProps> = ({
  profiles,
  recommendations,
  followUps,
  matchmakers,
  transactions,
  language,
  activeTab: activeTabProp,
  onTabChange,
  onNavigateToWizard,
  onUpdateFollowUpStatus,
  onAddTransaction,
}) => {
  const t = translations[language];
  const isRTL = language === 'ur';

  // Active view tab inside Nadeem workspace
  const [internalTab, setInternalTab] = useState<'overview' | 'profiles' | 'search' | 'followups' | 'finances'>(
    activeTabProp || 'overview'
  );

  useEffect(() => {
    if (activeTabProp) {
      setInternalTab(activeTabProp);
    }
  }, [activeTabProp]);

  const activeTab = activeTabProp || internalTab;

  const setActiveTab = (tab: 'overview' | 'profiles' | 'search' | 'followups' | 'finances') => {
    setInternalTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Search and Filter state for Profiles tab
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'female' | 'male'>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [casteFilter, setCasteFilter] = useState<string>('all');

  // Match review state
  const [activeMatchReview, setActiveMatchReview] = useState<{
    primary: ProfileRecord;
    candidate: ProfileRecord;
    rec?: MatchRecommendation;
  } | null>(null);

  // Controlled Sharing Modal state
  const [selectedProfileForSharing, setSelectedProfileForSharing] = useState<ProfileRecord | null>(null);

  // Full Profile Detail Modal state
  const [selectedProfileForDetails, setSelectedProfileForDetails] = useState<ProfileRecord | null>(null);

  // New Transaction Modal State
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [newTxMatchmakerId, setNewTxMatchmakerId] = useState(matchmakers[0]?.id || '');
  const [newTxAmount, setNewTxAmount] = useState(15000);
  const [newTxType, setNewTxType] = useState<'payable' | 'receivable'>('payable');
  const [newTxDesc, setNewTxDesc] = useState('Referral milestone bonus');

  // Filter profiles for profiles directory
  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.education.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.caste.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGender = genderFilter === 'all' || p.gender === genderFilter;
    const matchesCity = cityFilter === 'all' || p.currentCity === cityFilter;
    const matchesCaste = casteFilter === 'all' || p.caste.includes(casteFilter);

    return matchesSearch && matchesGender && matchesCity && matchesCaste;
  });

  const dueFollowUps = followUps.filter((f) => f.dueDate === '2026-10-23' || f.priority === 'high');

  const handleLaunchMatchReview = (profile: ProfileRecord) => {
    // Pick an opposite gender candidate
    const candidate = profiles.find((p) => p.gender !== profile.gender) || profiles[1];
    const rec = recommendations.find(
      (r) =>
        (r.requestingProfileId === profile.id && r.candidateProfileId === candidate.id) ||
        (r.requestingProfileId === candidate.id && r.candidateProfileId === profile.id)
    );
    setActiveMatchReview({
      primary: profile,
      candidate,
      rec,
    });
  };

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const mm = matchmakers.find((m) => m.id === newTxMatchmakerId) || matchmakers[0];
    const newTx: FinancialTransaction = {
      id: `TX-${Math.floor(810 + Math.random() * 90)}`,
      matchmakerId: mm.id,
      matchmakerName: mm.name,
      date: new Date().toISOString().split('T')[0],
      type: newTxType,
      amount: newTxAmount,
      description: newTxDesc,
      status: 'pending',
    };
    onAddTransaction(newTx);
    setIsAddTxModalOpen(false);
  };

  if (activeMatchReview) {
    return (
      <MatchReview
        primaryProfile={activeMatchReview.primary}
        candidateProfile={activeMatchReview.candidate}
        recommendation={activeMatchReview.rec}
        language={language}
        onApprove={() => {
          alert(isRTL ? 'تجویز منظور کر لی گئی!' : 'Proposal Approved by Nadeem!');
          setActiveMatchReview(null);
        }}
        onReject={() => {
          alert(isRTL ? 'تجویز مسترد کر دی گئی۔' : 'Proposal declined.');
          setActiveMatchReview(null);
        }}
        onOpenControlledShare={() => {
          setSelectedProfileForSharing(activeMatchReview.candidate);
        }}
        onBack={() => setActiveMatchReview(null)}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
      {/* ========================================================
          1. DASHBOARD HERO & ACTION CARDS (OVERVIEW TAB ONLY)
         ======================================================== */}
      {activeTab === 'overview' && (
        <>
          {/* Glass Capsule Hero Container — Dashboard exclusive */}
          <div className="relative mb-8 overflow-hidden rounded-3xl bg-white/40 backdrop-blur-md border border-white/60 p-6 sm:p-8 shadow-lg transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2.5">
                {/* 1. Operational Eyebrow Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-600/30 text-emerald-950 font-bold text-xs uppercase tracking-wider">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                  <span>{isRTL ? 'مرکزی آپریشنل ڈیسک' : 'Lead Matchmaker Operational Desk'}</span>
                </div>
                
                {/* 2. Main Desk Title */}
                <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#182848] tracking-tight">
                  {t.workspaceTitle}
                </h1>

                {/* 3. Subtitle / Workflow Description */}
                <p className="text-sm sm:text-base text-[#3A4B48] max-w-2xl font-medium leading-relaxed">
                  {t.workspaceSubtitle}
                </p>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={onNavigateToWizard}
                className="self-start md:self-auto inline-flex items-center gap-2.5 rounded-2xl bg-[#182848] hover:bg-[#283848] px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all transform active:scale-95 border border-[#B69A62]/40 cursor-pointer whitespace-nowrap"
              >
                <UserPlus className="w-5 h-5 text-[#B69A62]" />
                <span>{t.actionAddProfile}</span>
              </button>
            </div>
          </div>

          {/* Touch-Friendly Primary Quick Action Cards (Android Ergonomics) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            <button
              type="button"
              onClick={onNavigateToWizard}
              className="flex flex-col items-start p-4 sm:p-5 rounded-2xl border border-[#B69A62]/40 bg-[#182848] text-[#F7F3EA] shadow-sm hover:shadow-md transition-all text-start group cursor-pointer"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#283848] text-[#B69A62] border border-[#B69A62]/30 mb-3 group-hover:scale-105 transition-transform">
                <UserPlus className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm sm:text-base leading-snug">{t.actionAddProfile}</span>
              <span className="text-[11px] text-[#88A8A8]/80 mt-1">
                {isRTL ? '۷ مراحل میں نیا رشتہ' : '7-step guided workflow'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('search')}
              className="flex flex-col items-start p-4 sm:p-5 rounded-2xl bg-white/70 hover:bg-white border border-[#E7E2D8] hover:border-[#182848] text-[#252E2C] shadow-xs hover:shadow-md transition-all text-start group cursor-pointer"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-900 border border-blue-200 mb-3 group-hover:scale-105 transition-transform">
                <Search className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm sm:text-base leading-snug text-[#182848]">{t.actionFindMatch}</span>
              <span className="text-[11px] text-[#68716D] mt-1">
                {isRTL ? 'معیارات کے مطابق تلاش' : 'Criteria search & review'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('followups')}
              className="flex flex-col items-start p-4 sm:p-5 rounded-2xl bg-white/70 hover:bg-white border border-[#E7E2D8] hover:border-[#182848] text-[#252E2C] shadow-xs hover:shadow-md transition-all text-start group cursor-pointer"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-900 border border-amber-200 mb-3 group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm sm:text-base leading-snug text-[#182848]">{t.actionFollowUps}</span>
              <span className="text-[11px] text-[#68716D] mt-1">
                {dueFollowUps.length} {isRTL ? 'آج مطلوب' : 'due today'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('finances')}
              className="flex flex-col items-start p-4 sm:p-5 rounded-2xl bg-white/70 hover:bg-white border border-[#E7E2D8] hover:border-[#182848] text-[#252E2C] shadow-xs hover:shadow-md transition-all text-start group cursor-pointer"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 mb-3 group-hover:scale-105 transition-transform">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm sm:text-base leading-snug text-[#182848]">{t.actionFinances}</span>
              <span className="text-[11px] text-[#68716D] mt-1">
                {isRTL ? 'کمیشن و بیلنس کھاتہ' : 'Matchmaker ledger'}
              </span>
            </button>
          </div>

          {/* OVERVIEW CONTENT: Follow-ups Alert & Active Profiles Spotlight */}
          <div className="space-y-8 animate-fadeIn">
            {/* Follow-ups Due Alert Box */}
            <div className="rounded-3xl border border-amber-200/80 bg-amber-50/70 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm sm:text-base">
                  <Clock className="w-5 h-5 text-amber-700" />
                  <span>
                    {isRTL ? 'آج کے اہم ترین فالو اپس اور رابطے:' : 'High Priority Follow-ups Due Today:'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('followups')}
                  className="text-xs font-semibold text-amber-900 hover:underline cursor-pointer"
                >
                  View all ({followUps.length})
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dueFollowUps.map((fu) => (
                  <div key={fu.id} className="rounded-2xl border border-amber-200/40 bg-white/60 backdrop-blur-md p-4 text-xs space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#182848]">{fu.personName}</span>
                      <a href={`tel:${fu.contactPhone}`} dir="ltr" className="font-mono text-xs font-semibold text-[#182848] hover:underline">
                        {fu.contactPhone}
                      </a>
                    </div>
                    <p className="text-[#252E2C] italic">"{fu.notes}"</p>
                    <div className="flex items-center justify-between pt-2 border-t border-[#E7E2D8]">
                      <span className="text-[10px] text-amber-800 font-semibold uppercase">{fu.type.replace('_', ' ')}</span>
                      <button
                        type="button"
                        onClick={() => onUpdateFollowUpStatus(fu.id, 'completed')}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{isRTL ? 'مکمل ہو گیا' : 'Mark Done'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Profiles Spotlight */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-2xl font-bold text-[#182848]">
                  {isRTL ? 'حالیہ فعال پروفائلز' : 'Recent Active Profiles'}
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('profiles')}
                  className="text-xs font-semibold text-[#182848] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{isRTL ? 'تمام دیکھیں' : 'View all'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profiles.slice(0, 4).map((prof) => (
                  <ProfileCard
                    key={prof.id}
                    profile={prof}
                    language={language}
                    showInternalNotes={true}
                    onFindMatch={() => handleLaunchMatchReview(prof)}
                    onShareWhatsApp={() => setSelectedProfileForSharing(prof)}
                    onViewDetails={() => setSelectedProfileForDetails(prof)}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================
          2. BEST MATCH VIEW (SEARCH TAB)
         ======================================================== */}
      {activeTab === 'search' && (
        <BestMatchView
          profiles={profiles}
          recommendations={recommendations}
          language={language}
          onLaunchMatchReview={handleLaunchMatchReview}
          onShareWhatsApp={(prof) => setSelectedProfileForSharing(prof)}
          onViewDetails={(prof) => setSelectedProfileForDetails(prof)}
          onBackToDashboard={() => setActiveTab('overview')}
        />
      )}

      {/* ========================================================
          3. FOLLOW-UPS VIEW (FOLLOWUPS TAB)
         ======================================================== */}
      {activeTab === 'followups' && (
        <FollowUpsView
          followUps={followUps}
          profiles={profiles}
          language={language}
          onUpdateFollowUpStatus={onUpdateFollowUpStatus}
          onViewProfile={(prof) => setSelectedProfileForDetails(prof)}
          onBackToDashboard={() => setActiveTab('overview')}
        />
      )}

      {/* ========================================================
          4. PROFILES DIRECTORY (PROFILES TAB)
         ======================================================== */}
      {activeTab === 'profiles' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E2D8] pb-4">
            <div>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#68716D] hover:text-[#182848] transition-colors mb-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{isRTL ? 'ڈیش بورڈ پر واپس جائیں' : 'Back to Dashboard'}</span>
              </button>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#182848]">
                {isRTL ? 'تمام پروفائل ڈائریکٹری' : 'Bureau Profiles Directory'}
              </h1>
              <p className="text-xs sm:text-sm text-[#68716D] mt-1">
                {isRTL ? 'بیورو میں محفوظ تمام تصدیق شدہ اور زیرِ جائزہ امیدواروں کی مکمل فہرست۔' : 'Directory of all active and pending candidate profiles in the bureau database.'}
              </p>
            </div>

            <button
              type="button"
              onClick={onNavigateToWizard}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#182848] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-[#283848] transition-all cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4 text-[#B69A62]" />
              <span>{t.actionAddProfile}</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-5 rounded-3xl bg-white border border-[#E7E2D8] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[#486878]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    isRTL
                      ? 'نام، تعلیم، ذات، یا آئی ڈی کے ذریعے تلاش کریں...'
                      : 'Search by name, education, profession, caste, or GLS ID...'
                  }
                  className="w-full py-3 pl-10 pr-4 rounded-xl border border-[#E7E2D8] text-xs sm:text-sm text-[#252E2C] bg-[#F7F3EA]/30"
                />
              </div>

              {/* Quick Gender Filter */}
              <div className="flex items-center gap-1.5 self-center">
                <button
                  type="button"
                  onClick={() => setGenderFilter('all')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    genderFilter === 'all' ? 'bg-[#182848] text-white' : 'bg-[#F7F3EA] text-[#68716D]'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setGenderFilter('female')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    genderFilter === 'female' ? 'bg-[#182848] text-white' : 'bg-[#F7F3EA] text-[#68716D]'
                  }`}
                >
                  {isRTL ? 'خواتین' : 'Brides'}
                </button>
                <button
                  type="button"
                  onClick={() => setGenderFilter('male')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    genderFilter === 'male' ? 'bg-[#182848] text-white' : 'bg-[#F7F3EA] text-[#68716D]'
                  }`}
                >
                  {isRTL ? 'مرد' : 'Grooms'}
                </button>
              </div>
            </div>

            {/* Filter Chips & Count */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-t border-[#E7E2D8] pt-3">
              <span className="text-[#68716D]">
                Showing <strong className="text-[#182848]">{filteredProfiles.length}</strong> profiles
              </span>

              {(searchQuery || genderFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setGenderFilter('all');
                  }}
                  className="text-xs text-[#68716D] hover:text-[#182848] underline cursor-pointer"
                >
                  {t.btnResetFilters}
                </button>
              )}
            </div>
          </div>

          {/* Profile Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredProfiles.length > 0 ? (
              filteredProfiles.map((prof) => (
                <ProfileCard
                  key={prof.id}
                  profile={prof}
                  language={language}
                  showInternalNotes={true}
                  onFindMatch={() => handleLaunchMatchReview(prof)}
                  onShareWhatsApp={() => setSelectedProfileForSharing(prof)}
                  onViewDetails={() => setSelectedProfileForDetails(prof)}
                />
              ))
            ) : (
              <div className="col-span-2 py-16 text-center rounded-3xl bg-white border border-[#E7E2D8] p-8">
                <Search className="mx-auto h-12 w-12 text-[#486878] mb-3" />
                <h4 className="font-serif text-xl font-bold text-[#182848] mb-1">No Matching Profiles Found</h4>
                <p className="text-xs text-[#68716D] max-w-sm mx-auto mb-4">
                  Try broadening your search query or reset active filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setGenderFilter('all');
                  }}
                  className="rounded-full bg-[#182848] px-5 py-2 text-xs font-semibold text-white shadow-md cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          5. EXTERNAL MATCHMAKERS & FINANCIAL LEDGER (FINANCES TAB)
         ======================================================== */}
      {activeTab === 'finances' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Matchmaker Directory */}
          <div className="p-6 rounded-3xl bg-white border border-[#E7E2D8] shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[#E7E2D8] pb-4">
              <div>
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#68716D] hover:text-[#182848] transition-colors mb-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{isRTL ? 'ڈیش بورڈ پر واپس جائیں' : 'Back to Dashboard'}</span>
                </button>
                <h3 className="font-serif text-2xl font-bold text-[#182848]">
                  {isRTL ? 'بیرونی میچ میکرز و ایجنٹس ڈائریکٹری' : 'External Matchmaker Directory'}
                </h3>
                <p className="text-xs text-[#68716D]">
                  Network of collaborative marriage bureaus in Multan, Rawalpindi, Faisalabad, and Karachi.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddTxModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[#182848] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#283848] shadow-md border border-[#B69A62]/30 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#B69A62]" />
                <span>Record New Transaction</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {matchmakers.map((mm) => {
                const detailed = mm as Partial<DetailedExternalMatchmaker>;
                const activeAgr = detailed.activeAgreement;
                const feeLabel = activeAgr
                  ? activeAgr.feeType === 'percentage'
                    ? `${activeAgr.percentageRate ?? mm.commissionRatePercent}% Commission`
                    : activeAgr.feeType === 'flat_fee'
                    ? `${formatPKR(activeAgr.flatFeePKR || 0)} Flat Fee`
                    : 'Tiered Commission'
                  : `${mm.commissionRatePercent}% Commission`;

                return (
                  <div key={mm.id} className="rounded-2xl border border-[#E7E2D8] bg-[#F7F3EA]/40 p-4 text-xs space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-[#182848]">{mm.name}</span>
                        {detailed.code && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#182848]/10 text-[#182848] font-medium">
                            {detailed.code}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#68716D]">{mm.city}</span>
                    </div>
                    <p className="text-[#68716D]">{mm.agencyName}</p>

                    {/* Active Agreement Terms */}
                    <div className="rounded-lg bg-white/70 p-2 border border-[#E7E2D8]/60 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-[#182848]">{feeLabel}</span>
                        {activeAgr?.agreementCode && (
                          <span className="text-[10px] font-mono text-[#68716D]">
                            {activeAgr.agreementCode}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#68716D]">
                        <span>{mm.profilesReferredCount} referred</span>
                        <span>{mm.successfulMatchesCount} matches</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#E7E2D8] flex items-center justify-between">
                      <span className="text-[#68716D]">Balance:</span>
                      <span className={`font-bold ${mm.outstandingBalancePKR > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                        {mm.outstandingBalancePKR > 0
                          ? `Payable: ${formatPKR(mm.outstandingBalancePKR)}`
                          : mm.outstandingBalancePKR < 0
                          ? `Receivable: ${formatPKR(Math.abs(mm.outstandingBalancePKR))}`
                          : 'Settled'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Transaction Ledger Table */}
            <h4 className="font-serif text-lg font-bold text-[#182848] mb-3">
              {isRTL ? 'حالیہ مالیاتی کھاتہ جات (لیجر):' : 'Financial Ledger Activity History:'}
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-[#E7E2D8] bg-[#F7F3EA] text-[#182848]">
                    <th className="p-3 text-start">Date</th>
                    <th className="p-3 text-start">Matchmaker</th>
                    <th className="p-3 text-start">Type</th>
                    <th className="p-3 text-start">Amount (PKR)</th>
                    <th className="p-3 text-start">Description</th>
                    <th className="p-3 text-start">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E2D8]">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#F7F3EA]/40">
                      <td className="p-3 font-mono text-[#68716D]">{tx.date}</td>
                      <td className="p-3 font-semibold text-[#182848]">{tx.matchmakerName}</td>
                      <td className="p-3 uppercase font-medium">{tx.type}</td>
                      <td className="p-3 font-bold text-[#182848]">{formatPKR(tx.amount)}</td>
                      <td className="p-3 text-[#68716D] max-w-xs">{tx.description}</td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            tx.status === 'settled' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Controlled WhatsApp Sharing Modal */}
      {selectedProfileForSharing && (
        <ControlledSharingModal
          isOpen={true}
          candidate={selectedProfileForSharing}
          language={language}
          onClose={() => setSelectedProfileForSharing(null)}
        />
      )}

      {/* Full Profile Detail Modal */}
      {selectedProfileForDetails && (
        <ProfileDetailModal
          isOpen={true}
          profile={selectedProfileForDetails}
          language={language}
          onClose={() => setSelectedProfileForDetails(null)}
          onFindMatch={(prof) => handleLaunchMatchReview(prof)}
          onShareWhatsApp={(prof) => setSelectedProfileForSharing(prof)}
          showInternalNotes={true}
        />
      )}

      {/* Add Transaction Modal */}
      {isAddTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#FFFEFA] p-6 shadow-2xl border border-[#B69A62]/40 text-xs">
            <h3 className="font-serif text-xl font-bold text-[#182848] mb-4">Record Financial Entry</h3>
            <form onSubmit={handleCreateTransaction} className="space-y-4">
              <div>
                <label className="block font-semibold text-[#182848] mb-1">Matchmaker</label>
                <select
                  value={newTxMatchmakerId}
                  onChange={(e) => setNewTxMatchmakerId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E7E2D8] bg-white"
                >
                  {matchmakers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">Transaction Type</label>
                <select
                  value={newTxType}
                  onChange={(e) => setNewTxType(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-[#E7E2D8] bg-white"
                >
                  <option value="payable">Payable (We owe matchmaker)</option>
                  <option value="receivable">Receivable (Matchmaker owes us)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">Amount (PKR)</label>
                <input
                  type="number"
                  value={newTxAmount}
                  onChange={(e) => setNewTxAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#E7E2D8] p-2.5"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">Description</label>
                <input
                  type="text"
                  value={newTxDesc}
                  onChange={(e) => setNewTxDesc(e.target.value)}
                  className="w-full rounded-xl border border-[#E7E2D8] p-2.5"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddTxModalOpen(false)}
                  className="rounded-xl border border-[#E7E2D8] px-4 py-2 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#182848] px-5 py-2 font-semibold text-white cursor-pointer"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (Android phone ergonomics for Nadeem per Section 5.2) */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#FFFEFA]/95 backdrop-blur-md border-t border-[#E7E2D8] py-2 px-3 flex items-center justify-around shadow-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'overview' ? 'bg-[#182848] text-white font-semibold' : 'text-[#68716D]'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">{isRTL ? 'ہوم' : 'Home'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profiles')}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'profiles' ? 'bg-[#182848] text-white font-semibold' : 'text-[#68716D]'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px]">{isRTL ? 'پروفائلز' : 'Profiles'}</span>
        </button>

        <button
          type="button"
          onClick={onNavigateToWizard}
          aria-label={t.actionAddProfile}
          className="flex flex-col items-center -mt-5 bg-[#182848] text-white rounded-full p-3 shadow-lg border-2 border-[#F7F3EA] cursor-pointer"
        >
          <UserPlus className="w-5 h-5 text-[#B69A62]" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'search' ? 'bg-[#182848] text-white font-semibold' : 'text-[#68716D]'
          }`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px]">{isRTL ? 'تلاش' : 'Search'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('followups')}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'followups' ? 'bg-[#182848] text-white font-semibold' : 'text-[#68716D]'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px]">{isRTL ? 'فالو اپ' : 'Follow'}</span>
        </button>
      </div>
    </div>
  );
};
