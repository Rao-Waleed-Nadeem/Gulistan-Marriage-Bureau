import React, { useState } from 'react';
import { FollowUpItem, Language, ProfileRecord } from '../../types';
import { translations } from '../../i18n/translations';
import { 
  Clock, 
  Phone, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Calendar, 
  Search, 
  ArrowLeft,
  User,
  ExternalLink,
  Filter
} from 'lucide-react';

interface FollowUpsViewProps {
  followUps: FollowUpItem[];
  profiles: ProfileRecord[];
  language: Language;
  onUpdateFollowUpStatus: (id: string, status: 'pending' | 'completed') => void;
  onViewProfile?: (profile: ProfileRecord) => void;
  onBackToDashboard?: () => void;
}

export const FollowUpsView: React.FC<FollowUpsViewProps> = ({
  followUps,
  profiles,
  language,
  onUpdateFollowUpStatus,
  onViewProfile,
  onBackToDashboard,
}) => {
  const t = translations[language];
  const isRTL = language === 'ur';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'due_today' | 'overdue' | 'completed'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Today reference date from baseline (2026-10-23/24)
  const todayStr = '2026-10-23';

  const handleCopyPhone = (id: string, phone: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(phone);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Classify follow up date relative to today
  const getFollowUpTiming = (item: FollowUpItem) => {
    if (item.status === 'completed') {
      return { type: 'completed', label: isRTL ? 'مکمل شدہ' : 'Completed', badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
    }
    if (item.dueDate < todayStr) {
      return { 
        type: 'overdue', 
        label: isRTL ? 'تاریخ گزر چکی (فوری توجہ)' : 'Overdue — Needs Action', 
        badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 ring-1 ring-rose-400' 
      };
    }
    if (item.dueDate === todayStr) {
      return { 
        type: 'today', 
        label: isRTL ? 'آج مطلوب' : 'Due Today', 
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold ring-1 ring-amber-400' 
      };
    }
    return { 
      type: 'upcoming', 
      label: isRTL ? 'آئندہ' : 'Upcoming', 
      badgeClass: 'bg-blue-100 text-blue-900 border-blue-300' 
    };
  };

  // Filter follow-up items
  const filteredItems = followUps.filter((item) => {
    const timing = getFollowUpTiming(item);
    
    // Status filter
    if (statusFilter === 'pending' && item.status !== 'pending') return false;
    if (statusFilter === 'completed' && item.status !== 'completed') return false;
    if (statusFilter === 'overdue' && (item.status === 'completed' || timing.type !== 'overdue')) return false;
    if (statusFilter === 'due_today' && (item.status === 'completed' || timing.type !== 'today')) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.personName.toLowerCase().includes(q);
      const matchPhone = item.contactPhone.toLowerCase().includes(q);
      const matchNotes = item.notes.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchNotes) return false;
    }

    return true;
  });

  const overdueCount = followUps.filter((f) => f.status === 'pending' && f.dueDate < todayStr).length;
  const dueTodayCount = followUps.filter((f) => f.status === 'pending' && f.dueDate === todayStr).length;
  const pendingTotal = followUps.filter((f) => f.status === 'pending').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E2D8] pb-6">
        <div>
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#68716D] hover:text-[#182848] transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isRTL ? 'ڈیش بورڈ پر واپس جائیں' : 'Back to Dashboard'}</span>
            </button>
          )}
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#182848]">
            {isRTL ? 'فالو اپس اور کسٹمر رابطہ ڈیسک' : 'Customer Follow-ups & Direct Calling Desk'}
          </h1>
          <p className="text-sm sm:text-base text-[#68716D] mt-1 max-w-3xl leading-relaxed">
            {isRTL 
              ? 'صارفین اور امیدواروں سے روزمرہ رابطے، ملاقات کے نظام الاوقات اور بر وقت یاد دہانیوں کا منظم انتظام۔'
              : 'Daily operational contact logs, scheduled family meetings, verification status, and pending introductions.'}
          </p>
        </div>

        {/* Status Highlights */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs sm:text-sm font-bold shadow-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>{overdueCount} {isRTL ? 'تاریخ گزر چکی' : 'Overdue'}</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm font-bold shadow-xs">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>{dueTodayCount} {isRTL ? 'آج مطلوب' : 'Due Today'}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#E7E2D8] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-[#486878]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRTL ? 'گاہک کے نام، فون نمبر یا تفصیلات سے تلاش کریں...' : 'Search by customer name, phone number, or notes...'}
              className="w-full py-3 pl-11 pr-4 rounded-2xl border border-[#E7E2D8] text-sm text-[#252E2C] placeholder-[#88A8A8] focus:outline-none focus:ring-2 focus:ring-[#182848] bg-[#F7F3EA]/40"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0">
            {[
              { id: 'all', label: isRTL ? 'تمام' : 'All', count: followUps.length },
              { id: 'due_today', label: isRTL ? 'آج مطلوب' : 'Due Today', count: dueTodayCount },
              { id: 'overdue', label: isRTL ? 'تاریخ گزر چکی' : 'Overdue', count: overdueCount },
              { id: 'pending', label: isRTL ? 'زیرِ التواء' : 'Pending', count: pendingTotal },
              { id: 'completed', label: isRTL ? 'مکمل شدہ' : 'Completed', count: followUps.length - pendingTotal },
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#182848] text-white shadow-sm ring-1 ring-white/20'
                      : 'bg-[#F7F3EA] text-[#68716D] hover:text-[#182848] hover:bg-[#E7E2D8]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`ms-1.5 px-1.5 py-0.5 rounded-full text-[11px] ${isActive ? 'bg-white/20 text-white' : 'bg-black/5 text-[#68716D]'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cards List with Superior Typography & Ergonomics */}
      <div className="space-y-4">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const timing = getFollowUpTiming(item);
            const associatedProfile = profiles.find((p) => p.id === item.profileId);

            return (
              <div
                key={item.id}
                className={`p-5 sm:p-6 rounded-3xl border transition-all shadow-sm hover:shadow-md ${
                  timing.type === 'overdue'
                    ? 'bg-rose-50/40 border-rose-200'
                    : timing.type === 'today'
                    ? 'bg-amber-50/40 border-amber-200'
                    : 'bg-white border-[#E7E2D8]'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Left Column: Customer Name, Phone, and Notes */}
                  <div className="space-y-2.5 flex-1 min-w-0">
                    {/* Header line: Name + Status Badge + Timing */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#182848] tracking-tight">
                        {item.personName}
                      </h2>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${timing.badgeClass}`}>
                        {timing.type === 'overdue' && <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />}
                        {timing.type === 'today' && <Clock className="w-3.5 h-3.5 text-amber-700" />}
                        {timing.type === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
                        <span>{timing.label}</span>
                      </span>

                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-[#F7F3EA] text-[#587888] uppercase border border-[#E7E2D8]">
                        {item.type.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Phone Number: Large, Clickable Tel Link & Copy Button */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <a
                        href={`tel:${item.contactPhone}`}
                        dir="ltr"
                        className="inline-flex items-center gap-2 text-base sm:text-lg font-mono font-bold text-[#182848] hover:text-blue-700 hover:underline bg-[#F7F3EA] px-3.5 py-1 rounded-xl border border-[#E7E2D8]"
                        title={isRTL ? 'کال کرنے کے لیے کلک کریں' : 'Click to call via mobile dialer'}
                      >
                        <Phone className="w-4 h-4 text-[#B69A62]" />
                        <span>{item.contactPhone}</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleCopyPhone(item.id, item.contactPhone)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#68716D] hover:text-[#182848] px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                        title={isRTL ? 'نمبر کاپی کریں' : 'Copy phone number'}
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">{t.copied || 'Copied!'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-[#587888]" />
                            <span>{t.copyPhone || 'Copy'}</span>
                          </>
                        )}
                      </button>

                      {/* Due Date Display */}
                      <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#68716D]">
                        <Calendar className="w-4 h-4 text-[#B69A62]" />
                        <span>{isRTL ? 'مقررہ تاریخ:' : 'Due Date:'} <strong className="text-[#182848] font-mono">{item.dueDate}</strong></span>
                      </span>
                    </div>

                    {/* Notes: Highly Legible & Clear */}
                    <p className="text-sm sm:text-base text-[#252E2C] bg-white/70 p-3.5 rounded-2xl border border-[#E7E2D8] leading-relaxed italic">
                      "{item.notes}"
                    </p>
                  </div>

                  {/* Right Column: Obvious Action Buttons */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#E7E2D8]">
                    {/* Call Customer Button */}
                    <a
                      href={`tel:${item.contactPhone}`}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap min-w-[130px]"
                    >
                      <Phone className="w-4 h-4" />
                      <span>{t.callCustomer || (isRTL ? 'کال کریں' : 'Call Customer')}</span>
                    </a>

                    {/* Mark Completed Button */}
                    {item.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs sm:text-sm font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>{isRTL ? 'مکمل ہو گیا' : 'Completed'}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onUpdateFollowUpStatus(item.id, 'completed')}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#182848] hover:bg-[#283848] text-white text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap min-w-[130px]"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[#B69A62]" />
                        <span>{isRTL ? 'مکمل قرار دیں' : 'Mark Completed'}</span>
                      </button>
                    )}

                    {/* View Profile Link */}
                    {associatedProfile && onViewProfile && (
                      <button
                        type="button"
                        onClick={() => onViewProfile(associatedProfile)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#182848] hover:text-blue-700 hover:underline cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#B69A62]" />
                        <span>{isRTL ? 'امیدوار کا پروفائل دیکھیں' : 'View Candidate Profile'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-16 text-center rounded-3xl bg-white border border-[#E7E2D8] p-8 shadow-sm">
            <Clock className="mx-auto h-12 w-12 text-[#88A8A8] mb-3" />
            <h3 className="font-serif text-xl font-bold text-[#182848] mb-1">
              {isRTL ? 'کوئی فالو اپ ریکارڈ نہیں ملا' : 'No Matching Follow-ups Found'}
            </h3>
            <p className="text-xs sm:text-sm text-[#68716D] max-w-sm mx-auto mb-4">
              {isRTL ? 'مطلوبہ فلٹرز کو تبدیل کریں یا تمام فالو اپس دیکھنے کے لیے فلٹر ختم کریں۔' : 'Adjust your search query or reset the filter to view all bureau follow-ups.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="px-5 py-2.5 rounded-full bg-[#182848] text-white text-xs font-semibold hover:bg-[#283848] transition-colors cursor-pointer"
            >
              {t.btnResetFilters || 'Reset Filters'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
