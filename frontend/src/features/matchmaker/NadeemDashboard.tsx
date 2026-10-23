import React, { useState } from 'react';
import { 
  ProfileRecord, 
  MatchRecommendation, 
  FollowUpItem, 
  ExternalMatchmaker, 
  FinancialTransaction, 
  Language, 
  Role 
} from '../../types';
import { translations } from '../../i18n/translations';
import { ProfileCard } from '../../components/ui/ProfileCard';
import { ControlledSharingModal } from '../../components/matching/ControlledSharingModal';
import { MatchReview } from './MatchReview';
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
  Briefcase
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

  // Active view tab inside Nadeem workspace
  const [internalTab, setInternalTab] = useState<'overview' | 'profiles' | 'search' | 'followups' | 'finances'>(
    activeTabProp || 'overview'
  );

  React.useEffect(() => {
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
  };
  
  // Search and Filter state
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

  // New Transaction Modal State
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [newTxMatchmakerId, setNewTxMatchmakerId] = useState(matchmakers[0]?.id || '');
  const [newTxAmount, setNewTxAmount] = useState(15000);
  const [newTxType, setNewTxType] = useState<'payable' | 'receivable'>('payable');
  const [newTxDesc, setNewTxDesc] = useState('Referral milestone bonus');

  // Filter profiles
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
          alert(language === 'ur' ? 'تجویز منظور کر لی گئی!' : 'Proposal Approved by Nadeem!');
          setActiveMatchReview(null);
        }}
        onReject={() => {
          alert(language === 'ur' ? 'تجویز مسترد کر دی گئی۔' : 'Proposal declined.');
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-12">
      {/* Top Welcome & Subtitle */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E7E2D8] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
            <span className="text-xs uppercase font-bold tracking-widest text-[#B69A62]">
              {language === 'ur' ? 'مرکزی آپریشنل ڈیسک' : 'Lead Matchmaker Operational Desk'}
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#182848]">
            {t.workspaceTitle}
          </h1>
          <p className="text-xs sm:text-sm text-[#68716D] max-w-2xl mt-1 leading-relaxed">
            {t.workspaceSubtitle}
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={onNavigateToWizard}
          className="self-start md:self-auto inline-flex items-center gap-2 rounded-2xl bg-[#182848] px-6 py-3 text-sm font-semibold text-[#F7F3EA] shadow-md hover:bg-[#283848] transition-all transform active:scale-95 border border-[#B69A62]/30"
        >
          <UserPlus className="w-4 h-4 text-[#B69A62]" />
          <span>{t.actionAddProfile}</span>
        </button>
      </div>

      {/* Touch-Friendly Primary Quick Action Cards (Android Ergonomics) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <button
          onClick={onNavigateToWizard}
          className="flex flex-col items-start p-4 sm:p-5 rounded-2xl border border-[#B69A62]/40 bg-[#182848] text-[#F7F3EA] shadow-sm hover:shadow-md transition-all text-start group"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#283848] text-[#B69A62] border border-[#B69A62]/30 mb-3 group-hover:scale-105 transition-transform">
            <UserPlus className="w-5 h-5" />
          </div>
          <span className="font-bold text-sm sm:text-base leading-snug">{t.actionAddProfile}</span>
          <span className="text-[11px] text-[#88A8A8]/80 mt-1">
            {language === 'ur' ? '۷ مراحل میں نیا رشتہ' : '7-step guided workflow'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('search')}
          className="flex flex-col items-start p-4 sm:p-5 rounded-2xl glass-card glass-card-interactive bg-white/10 text-[#252E2C] shadow-xs hover:border-[#182848] transition-all text-start group cursor-pointer"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-[#182848] border border-white/20 mb-3 group-hover:scale-105 transition-transform">
            <Search className="w-5 h-5" />
          </div>
          <span className="font-bold text-sm sm:text-base leading-snug text-[#182848]">{t.actionFindMatch}</span>
          <span className="text-[11px] text-[#68716D] mt-1">
            {language === 'ur' ? 'معیارات کے مطابق تلاش' : 'Criteria search & review'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('followups')}
          className="flex flex-col items-start p-4 sm:p-5 rounded-2xl glass-card glass-card-interactive bg-white/10 text-[#252E2C] shadow-xs hover:border-[#182848] transition-all text-start group cursor-pointer"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50/50 text-amber-800 border border-amber-200/50 mb-3 group-hover:scale-105 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
          <span className="font-bold text-sm sm:text-base leading-snug text-[#182848]">{t.actionFollowUps}</span>
          <span className="text-[11px] text-[#68716D] mt-1">
            {dueFollowUps.length} {language === 'ur' ? 'آج مطلوب' : 'due today'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('finances')}
          className="flex flex-col items-start p-4 sm:p-5 rounded-2xl glass-card glass-card-interactive bg-white/10 text-[#252E2C] shadow-xs hover:border-[#182848] transition-all text-start group cursor-pointer"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50/50 text-emerald-800 border border-emerald-200/50 mb-3 group-hover:scale-105 transition-transform">
            <DollarSign className="w-5 h-5" />
          </div>
          <span className="font-bold text-sm sm:text-base leading-snug text-[#182848]">{t.actionFinances}</span>
          <span className="text-[11px] text-[#68716D] mt-1">
            {language === 'ur' ? 'کمیشن و بیلنس کھاتہ' : 'Matchmaker ledger'}
          </span>
        </button>
      </div>

      {/* Desktop Workspace Navigation Tabs */}
      <div className="mb-6 hidden md:flex items-center gap-2 border-b border-[#E7E2D8] pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'overview' ? 'bg-[#182848] text-[#F7F3EA]' : 'text-[#68716D] hover:text-[#252E2C]'
          }`}
        >
          {language === 'ur' ? 'خلاصۂ آپریشن' : 'Operational Overview'}
        </button>
        <button
          onClick={() => setActiveTab('profiles')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'profiles' ? 'bg-[#182848] text-[#F7F3EA]' : 'text-[#68716D] hover:text-[#252E2C]'
          }`}
        >
          {language === 'ur' ? 'تمام پروفائل ڈائریکٹری' : 'Profile Directory'} ({profiles.length})
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'search' ? 'bg-[#182848] text-[#F7F3EA]' : 'text-[#68716D] hover:text-[#252E2C]'
          }`}
        >
          {t.actionFindMatch}
        </button>
        <button
          onClick={() => setActiveTab('followups')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'followups' ? 'bg-[#182848] text-[#F7F3EA]' : 'text-[#68716D] hover:text-[#252E2C]'
          }`}
        >
          {t.actionFollowUps} ({followUps.filter((f) => f.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('finances')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'finances' ? 'bg-[#182848] text-[#F7F3EA]' : 'text-[#68716D] hover:text-[#252E2C]'
          }`}
        >
          {t.actionFinances} & Matchmakers
        </button>
      </div>

      {/* TAB CONTENT: 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Follow-ups Due Alert Box */}
          <div className="rounded-3xl border border-amber-200/80 bg-amber-50/70 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm sm:text-base">
                <Clock className="w-5 h-5 text-amber-700" />
                <span>
                  {language === 'ur' ? 'آج کے اہم ترین فالو اپس اور رابطے:' : 'High Priority Follow-ups Due Today:'}
                </span>
              </div>
              <button
                onClick={() => setActiveTab('followups')}
                className="text-xs font-semibold text-amber-900 hover:underline"
              >
                View all ({followUps.length})
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dueFollowUps.map((fu) => (
                <div key={fu.id} className="rounded-2xl border border-amber-200/40 bg-white/10 backdrop-blur-md p-4 text-xs space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#182848]">{fu.personName}</span>
                    <span dir="ltr" className="font-mono text-[11px] text-[#68716D]">{fu.contactPhone}</span>
                  </div>
                  <p className="text-[#252E2C] italic">"{fu.notes}"</p>
                  <div className="flex items-center justify-between pt-2 border-t border-[#E7E2D8]">
                    <span className="text-[10px] text-amber-800 font-semibold uppercase">{fu.type.replace('_', ' ')}</span>
                    <button
                      onClick={() => onUpdateFollowUpStatus(fu.id, 'completed')}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>{language === 'ur' ? 'مکمل ہو گیا' : 'Mark Done'}</span>
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
                {language === 'ur' ? 'حالیہ فعال پروفائلز' : 'Recent Active Profiles'}
              </h3>
              <button
                onClick={() => setActiveTab('profiles')}
                className="text-xs font-semibold text-[#182848] hover:underline flex items-center gap-1"
              >
                <span>{language === 'ur' ? 'تمام دیکھیں' : 'View all'}</span>
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
                  onViewDetails={() => handleLaunchMatchReview(prof)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. PROFILES & SEARCH */}
      {(activeTab === 'profiles' || activeTab === 'search') && (
        <div className="space-y-6 animate-fadeIn">
          {/* Search & Filter Bar */}
          <div className="glass-panel p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[#486878]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    language === 'ur'
                      ? 'نام، تعلیم، ذات، یا آئی ڈی کے ذریعے تلاش کریں...'
                      : 'Search by name, education, profession, caste, or GLS ID...'
                  }
                  className="glass-input w-full py-3 pl-10 pr-4 text-xs sm:text-sm text-[#252E2C]"
                />
              </div>

              {/* Quick Gender Filter */}
              <div className="flex items-center gap-1.5 self-center">
                <button
                  onClick={() => setGenderFilter('all')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    genderFilter === 'all' ? 'bg-[#182848] text-[#F7F3EA]' : 'bg-[#F7F3EA] text-[#68716D]'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setGenderFilter('female')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    genderFilter === 'female' ? 'bg-[#182848] text-[#F7F3EA]' : 'bg-[#F7F3EA] text-[#68716D]'
                  }`}
                >
                  {language === 'ur' ? 'خواتین' : 'Brides'}
                </button>
                <button
                  onClick={() => setGenderFilter('male')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    genderFilter === 'male' ? 'bg-[#182848] text-[#F7F3EA]' : 'bg-[#F7F3EA] text-[#68716D]'
                  }`}
                >
                  {language === 'ur' ? 'مرد' : 'Grooms'}
                </button>
              </div>
            </div>

            {/* Filter Chips & Count */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-t border-[#E7E2D8] pt-3">
              <div className="flex items-center gap-2">
                <span className="text-[#68716D]">
                  Showing <strong className="text-[#182848]">{filteredProfiles.length}</strong> matching candidate records
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setGenderFilter('all');
                    setCityFilter('all');
                    setCasteFilter('all');
                  }}
                  className="text-xs text-[#68716D] hover:text-[#182848] underline"
                >
                  {t.btnResetFilters}
                </button>
              </div>
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
                  onViewDetails={() => handleLaunchMatchReview(prof)}
                />
              ))
            ) : (
              <div className="col-span-2 py-16 text-center glass-panel p-8">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/60 text-[#486878]">
                  <Search className="h-6 w-6" />
                </div>
                <h4 className="font-serif text-xl font-bold text-[#182848] mb-1">No Matching Profiles Found</h4>
                <p className="text-xs text-[#68716D] max-w-sm mx-auto mb-4">
                  Try broadening your search query or reset active filters to view all bureau candidates.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setGenderFilter('all');
                  }}
                  className="rounded-full bg-[#182848] px-5 py-2 text-xs font-semibold text-[#F7F3EA] shadow-md hover:bg-[#283848] transition-all cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 3. FOLLOW-UPS */}
      {activeTab === 'followups' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="glass-panel p-6 shadow-sm">
            <h3 className="font-serif text-2xl font-bold text-[#182848] mb-2">
              {language === 'ur' ? 'فالو اپس اور انتظامی یاد دہانیاں' : 'Follow-up Management Desk'}
            </h3>
            <p className="text-xs text-[#68716D] mb-6">
              Track communication status, scheduled family meetings, photo verification, and pending decisions.
            </p>

            <div className="divide-y divide-[#E7E2D8]">
              {followUps.map((fu) => (
                <div key={fu.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-[#182848]">{fu.personName}</span>
                      <span className="font-mono text-[#68716D]">({fu.contactPhone})</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          fu.priority === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {fu.priority} priority
                      </span>
                    </div>
                    <p className="text-[#252E2C] leading-relaxed italic">"{fu.notes}"</p>
                    <span className="text-[11px] text-[#68716D] block mt-1">Due Date: {fu.dueDate}</span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {fu.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => onUpdateFollowUpStatus(fu.id, 'completed')}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#182848] px-4 py-2 text-xs font-semibold text-[#F7F3EA] hover:bg-[#283848] transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#B69A62]" />
                        <span>{language === 'ur' ? 'مکمل قرار دیں' : 'Mark Completed'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 4. EXTERNAL MATCHMAKERS & FINANCIAL LEDGER */}
      {activeTab === 'finances' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Matchmaker Directory */}
          <div className="glass-panel p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[#E7E2D8] pb-4">
              <div>
                <h3 className="font-serif text-2xl font-bold text-[#182848]">
                  {language === 'ur' ? 'بیرونی میچ میکرز و ایجنٹس ڈائریکٹری' : 'External Matchmaker Directory'}
                </h3>
                <p className="text-xs text-[#68716D]">
                  Network of collaborative marriage bureaus in Multan, Rawalpindi, Faisalabad, and Karachi.
                </p>
              </div>

              <button
                onClick={() => setIsAddTxModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[#182848] px-5 py-2.5 text-xs font-semibold text-[#F7F3EA] hover:bg-[#283848] shadow-md border border-[#B69A62]/30 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#B69A62]" />
                <span>Record New Transaction</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {matchmakers.map((mm) => (
                <div key={mm.id} className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-4 text-xs space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#182848]">{mm.name}</span>
                    <span className="text-[10px] text-[#68716D]">{mm.city}</span>
                  </div>
                  <p className="text-[#68716D]">{mm.agencyName}</p>
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
              ))}
            </div>

            {/* Transaction Ledger Table */}
            <h4 className="font-serif text-lg font-bold text-[#182848] mb-3">
              {language === 'ur' ? 'حالیہ مالیاتی کھاتہ جات (لیجر):' : 'Financial Ledger Activity History:'}
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

      {/* Add Transaction Modal */}
      {isAddTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-3xl glass-panel-dense p-6 shadow-2xl border border-[#B69A62]/40 text-xs">
            <h3 className="font-serif text-xl font-bold text-[#182848] mb-4">Record Financial Entry</h3>
            <form onSubmit={handleCreateTransaction} className="space-y-4">
              <div>
                <label className="block font-semibold text-[#182848] mb-1">Matchmaker</label>
                <select
                  value={newTxMatchmakerId}
                  onChange={(e) => setNewTxMatchmakerId(e.target.value)}
                  className="glass-input w-full p-2.5"
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
                  className="glass-input w-full p-2.5"
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
                  className="rounded-xl border border-[#E7E2D8] px-4 py-2 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#182848] px-5 py-2 font-semibold text-[#F7F3EA]"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (Android phone ergonomics for Nadeem per Section 5.2) */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#FFFEFA] border-t border-[#E7E2D8] py-2 px-3 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'overview' ? 'text-[#182848]' : 'text-[#68716D]'}`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium">{language === 'ur' ? 'ہوم' : 'Home'}</span>
        </button>

        <button
          onClick={() => setActiveTab('profiles')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'profiles' ? 'text-[#182848]' : 'text-[#68716D]'}`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-medium">{language === 'ur' ? 'پروفائلز' : 'Profiles'}</span>
        </button>

        <button
          onClick={onNavigateToWizard}
          aria-label={t.actionAddProfile}
          className="flex flex-col items-center -mt-5 bg-[#182848] text-[#F7F3EA] rounded-full p-3 shadow-lg border-2 border-[#F7F3EA]"
        >
          <UserPlus className="w-5 h-5 text-[#B69A62]" />
        </button>

        <button
          onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'search' ? 'text-[#182848]' : 'text-[#68716D]'}`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-medium">{language === 'ur' ? 'تلاش' : 'Search'}</span>
        </button>

        <button
          onClick={() => setActiveTab('followups')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'followups' ? 'text-[#182848]' : 'text-[#68716D]'}`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px] font-medium">{language === 'ur' ? 'فالو اپ' : 'Follow'}</span>
        </button>
      </div>
    </div>
  );
};
