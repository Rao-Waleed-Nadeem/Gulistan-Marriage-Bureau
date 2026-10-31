import React, { useState, useMemo } from 'react';
import { ProfileRecord, Language, MatchRecommendation } from '../../types';
import { translations } from '../../i18n/translations';
import { ProfileCard } from '../../components/ui/ProfileCard';
import { 
  Search, 
  Filter, 
  X, 
  RotateCcw, 
  SlidersHorizontal, 
  ChevronDown, 
  Sparkles, 
  MapPin, 
  User, 
  GraduationCap, 
  Calendar,
  Check,
  ArrowLeft
} from 'lucide-react';

interface BestMatchViewProps {
  profiles: ProfileRecord[];
  recommendations: MatchRecommendation[];
  language: Language;
  onLaunchMatchReview: (profile: ProfileRecord) => void;
  onShareWhatsApp: (profile: ProfileRecord) => void;
  onViewDetails: (profile: ProfileRecord) => void;
  onBackToDashboard?: () => void;
}

export const BestMatchView: React.FC<BestMatchViewProps> = ({
  profiles,
  recommendations,
  language,
  onLaunchMatchReview,
  onShareWhatsApp,
  onViewDetails,
  onBackToDashboard,
}) => {
  const t = translations[language];
  const isRTL = language === 'ur';

  // Search query state
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-Filter states
  const [selectedGender, setSelectedGender] = useState<'all' | 'female' | 'male'>('all');
  const [minAge, setMinAge] = useState<number | ''>('');
  const [maxAge, setMaxAge] = useState<number | ''>('');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedMaritalStatuses, setSelectedMaritalStatuses] = useState<string[]>([]);
  const [selectedEducation, setSelectedEducation] = useState<string>('all');
  const [isFilterPanelExpanded, setIsFilterPanelExpanded] = useState(false);

  // Available unique cities in the data
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    profiles.forEach((p) => {
      if (p.currentCity) set.add(p.currentCity);
    });
    return Array.from(set).sort();
  }, [profiles]);

  // Toggle city selection
  const handleToggleCity = (city: string) => {
    setSelectedCities((prev) => 
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  };

  // Toggle marital status selection
  const handleToggleMaritalStatus = (status: string) => {
    setSelectedMaritalStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  // Reset all filters and search query
  const handleResetAll = () => {
    setSearchQuery('');
    setSelectedGender('all');
    setMinAge('');
    setMaxAge('');
    setSelectedCities([]);
    setSelectedMaritalStatuses([]);
    setSelectedEducation('all');
  };

  // Filter application logic
  const filteredCandidates = useMemo(() => {
    return profiles.filter((p) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.fullName.toLowerCase().includes(q) || p.displayName.toLowerCase().includes(q);
        const matchCity = p.currentCity.toLowerCase().includes(q) || p.residenceArea.toLowerCase().includes(q);
        const matchId = p.id.toLowerCase().includes(q);
        const matchOccupation = p.occupation.toLowerCase().includes(q);
        const matchEducation = p.education.toLowerCase().includes(q);
        const matchCaste = p.caste.toLowerCase().includes(q) || (p.subCaste && p.subCaste.toLowerCase().includes(q));

        if (!matchName && !matchCity && !matchId && !matchOccupation && !matchEducation && !matchCaste) {
          return false;
        }
      }

      // 2. Gender Filter
      if (selectedGender !== 'all' && p.gender !== selectedGender) {
        return false;
      }

      // 3. Min Age
      if (minAge !== '' && p.age < Number(minAge)) {
        return false;
      }

      // 4. Max Age
      if (maxAge !== '' && p.age > Number(maxAge)) {
        return false;
      }

      // 5. Selected Cities (OR within selected cities)
      if (selectedCities.length > 0 && !selectedCities.includes(p.currentCity)) {
        return false;
      }

      // 6. Selected Marital Statuses (OR within selected statuses)
      if (selectedMaritalStatuses.length > 0 && !selectedMaritalStatuses.includes(p.maritalStatus)) {
        return false;
      }

      // 7. Education
      if (selectedEducation !== 'all' && !p.education.toLowerCase().includes(selectedEducation.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [
    profiles,
    searchQuery,
    selectedGender,
    minAge,
    maxAge,
    selectedCities,
    selectedMaritalStatuses,
    selectedEducation,
  ]);

  // Construct list of active filter chips for selective removal
  const activeChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; onRemove: () => void }> = [];

    if (selectedGender !== 'all') {
      chips.push({
        id: 'gender',
        label: selectedGender === 'female' ? (isRTL ? 'صرف خواتین (دلہن)' : 'Brides Only') : (isRTL ? 'صرف مرد (دولہا)' : 'Grooms Only'),
        onRemove: () => setSelectedGender('all'),
      });
    }

    if (minAge !== '') {
      chips.push({
        id: 'minAge',
        label: `${isRTL ? 'کم از کم عمر:' : 'Min Age:'} ${minAge}`,
        onRemove: () => setMinAge(''),
      });
    }

    if (maxAge !== '') {
      chips.push({
        id: 'maxAge',
        label: `${isRTL ? 'زیادہ سے زیادہ عمر:' : 'Max Age:'} ${maxAge}`,
        onRemove: () => setMaxAge(''),
      });
    }

    selectedCities.forEach((city) => {
      chips.push({
        id: `city-${city}`,
        label: `${isRTL ? 'شہر:' : 'City:'} ${city}`,
        onRemove: () => handleToggleCity(city),
      });
    });

    selectedMaritalStatuses.forEach((status) => {
      chips.push({
        id: `marital-${status}`,
        label: status === 'never_married' ? (isRTL ? 'غیر شادی شدہ' : 'Never Married') : status,
        onRemove: () => handleToggleMaritalStatus(status),
      });
    });

    if (selectedEducation !== 'all') {
      chips.push({
        id: 'education',
        label: `${isRTL ? 'تعلیم:' : 'Education:'} ${selectedEducation}`,
        onRemove: () => setSelectedEducation('all'),
      });
    }

    return chips;
  }, [
    selectedGender,
    minAge,
    maxAge,
    selectedCities,
    selectedMaritalStatuses,
    selectedEducation,
    isRTL,
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Page Title & Operational Eyebrow */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E2D8] pb-4">
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
            {isRTL ? 'مناسب ترین رشتہ جات کی تلاش' : 'Best Match & Advanced Profile Search'}
          </h1>
          <p className="text-sm sm:text-base text-[#68716D] mt-1 leading-relaxed">
            {isRTL 
              ? 'تخصیص شدہ معیارات، عمر، تعلیم، شہر اور ازدواجی حیثیت کی بیک وقت چھان بین۔' 
              : 'Multi-criteria screening by age, location, education, and marital background with live filtering.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-full bg-[#182848] text-white text-xs sm:text-sm font-semibold shadow-xs">
            {filteredCandidates.length} {isRTL ? 'امیدوار دستیاب' : 'Candidates Found'}
          </span>
        </div>
      </div>

      {/* STICKY SEARCH & FILTER TOOLBAR */}
      <div 
        className="sticky top-20 sm:top-24 z-30 bg-[#FFFEFA]/95 backdrop-blur-md border border-[#E7E2D8] shadow-lg rounded-3xl p-4 sm:p-5 transition-all space-y-3"
      >
        {/* Main Search Row */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-[#486878]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRTL ? 'نام، شہر، تعلیم، پیشے، قوم یا آئی ڈی سے تلاش کریں...' : 'Search by name, city, education, profession, caste, or ID...'}
              className="w-full py-3 pl-11 pr-4 rounded-2xl border border-[#E7E2D8] text-xs sm:text-sm text-[#252E2C] placeholder-[#88A8A8] focus:outline-none focus:ring-2 focus:ring-[#182848] bg-[#F7F3EA]/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3.5 text-[#68716D] hover:text-[#182848] p-0.5 rounded-full cursor-pointer"
                title={isRTL ? 'تلاش کا متن ختم کریں' : 'Clear search text only'}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Gender Toggle */}
          <div className="flex items-center gap-1 bg-[#F7F3EA] p-1 rounded-2xl border border-[#E7E2D8] shrink-0 self-center sm:self-auto">
            <button
              type="button"
              onClick={() => setSelectedGender('all')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedGender === 'all' ? 'bg-[#182848] text-white shadow-xs' : 'text-[#68716D] hover:text-[#182848]'
              }`}
            >
              {isRTL ? 'سب' : 'All'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedGender('female')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedGender === 'female' ? 'bg-[#182848] text-white shadow-xs' : 'text-[#68716D] hover:text-[#182848]'
              }`}
            >
              {isRTL ? 'دلہن' : 'Brides'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedGender('male')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedGender === 'male' ? 'bg-[#182848] text-white shadow-xs' : 'text-[#68716D] hover:text-[#182848]'
              }`}
            >
              {isRTL ? 'دولہا' : 'Grooms'}
            </button>
          </div>

          {/* Advanced Filters Expand/Collapse Trigger */}
          <button
            type="button"
            onClick={() => setIsFilterPanelExpanded(!isFilterPanelExpanded)}
            className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
              isFilterPanelExpanded || activeChips.length > 0
                ? 'bg-[#182848] text-white border-[#182848]'
                : 'bg-white text-[#182848] border-[#E7E2D8] hover:bg-[#F7F3EA]'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-[#B69A62]" />
            <span>{isRTL ? 'اضافی فلٹرز' : 'Filters'}</span>
            {activeChips.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#B69A62] text-[#182848] text-[10px] font-bold">
                {activeChips.length}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isFilterPanelExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* EXPANDABLE MULTI-FILTER DRAWER */}
        {isFilterPanelExpanded && (
          <div className="pt-3 border-t border-[#E7E2D8] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs animate-in fade-in duration-150">
            {/* Age Range Filter */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#182848] block">
                {isRTL ? 'عمر کی حد (سال)' : 'Age Range (Years)'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minAge}
                  onChange={(e) => setMinAge(e.target.value === '' ? '' : Number(e.target.value))}
                  min={18}
                  max={70}
                  className="w-full p-2.5 rounded-xl border border-[#E7E2D8] bg-[#F7F3EA]/30 text-xs focus:ring-1 focus:ring-[#182848]"
                />
                <span className="text-[#68716D] font-bold">—</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxAge}
                  onChange={(e) => setMaxAge(e.target.value === '' ? '' : Number(e.target.value))}
                  min={18}
                  max={70}
                  className="w-full p-2.5 rounded-xl border border-[#E7E2D8] bg-[#F7F3EA]/30 text-xs focus:ring-1 focus:ring-[#182848]"
                />
              </div>
            </div>

            {/* City Selection Multi-Chips */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#182848] block">
                {isRTL ? 'شہر منتخب کریں' : 'City / Locations'}
              </label>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-[#F7F3EA]/30 rounded-xl border border-[#E7E2D8]">
                {availableCities.map((city) => {
                  const isSelected = selectedCities.includes(city);
                  return (
                    <button
                      type="button"
                      key={city}
                      onClick={() => handleToggleCity(city)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#182848] text-white font-semibold'
                          : 'bg-white text-[#252E2C] border border-[#E7E2D8] hover:bg-gray-100'
                      }`}
                    >
                      {city}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Marital Status Filter */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#182848] block">
                {isRTL ? 'ازدواجی حیثیت' : 'Marital Status'}
              </label>
              <div className="flex flex-wrap gap-1">
                {[
                  { id: 'never_married', label: isRTL ? 'غیر شادی شدہ' : 'Never Married' },
                  { id: 'divorced', label: isRTL ? 'طلاق یافتہ' : 'Divorced' },
                  { id: 'widowed', label: isRTL ? 'بیوہ / رنڈوا' : 'Widowed' },
                ].map((item) => {
                  const isSelected = selectedMaritalStatuses.includes(item.id);
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => handleToggleMaritalStatus(item.id)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#182848] text-white font-semibold'
                          : 'bg-white text-[#252E2C] border border-[#E7E2D8] hover:bg-gray-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Education Degree Filter */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#182848] block">
                {isRTL ? 'تعلیمی قابلیت' : 'Education Level'}
              </label>
              <select
                value={selectedEducation}
                onChange={(e) => setSelectedEducation(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E7E2D8] bg-[#F7F3EA]/30 text-xs focus:ring-1 focus:ring-[#182848]"
              >
                <option value="all">{isRTL ? 'تمام تعلیمی درجات' : 'All Education Levels'}</option>
                <option value="postgraduate">{isRTL ? 'پوسٹ گریجویٹ / ماسٹرز' : 'Postgraduate / Masters / MBBS'}</option>
                <option value="bachelor">{isRTL ? 'گریجویشن / بیچلرز' : 'Bachelors'}</option>
                <option value="phd">PhD / Doctorate</option>
              </select>
            </div>
          </div>
        )}

        {/* SELECTIVE REMOVAL CHIPS ROW & RESET ALL */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E7E2D8]/60 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[#68716D] font-medium text-[11px] me-1">
              {isRTL ? 'فعال فلٹرز:' : 'Active Filters:'}
            </span>

            {activeChips.length > 0 ? (
              activeChips.map((chip) => (
                <span
                  key={chip.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#182848]/10 text-[#182848] border border-[#182848]/20 text-xs font-medium"
                >
                  <span>{chip.label}</span>
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    className="p-0.5 rounded-full hover:bg-[#182848]/20 transition-colors cursor-pointer"
                    title={`Remove ${chip.label}`}
                    aria-label={`Remove filter ${chip.label}`}
                  >
                    <X className="w-3 h-3 text-[#182848]" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-[#88A8A8] text-[11px] italic">
                {isRTL ? 'کوئی اضافی فلٹر لاگو نہیں' : 'None (Showing all candidate records)'}
              </span>
            )}
          </div>

          {/* Reset All Button */}
          {(activeChips.length > 0 || searchQuery.trim()) && (
            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold border border-rose-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-rose-600" />
              <span>{t.btnResetAll || (isRTL ? 'تمام فلٹرز ختم کریں' : 'Reset All')}</span>
            </button>
          )}
        </div>
      </div>

      {/* CANDIDATES RESULTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {filteredCandidates.length > 0 ? (
          filteredCandidates.map((candidate) => {
            const rec = recommendations.find(
              (r) => r.candidateProfileId === candidate.id || r.requestingProfileId === candidate.id
            );
            return (
              <ProfileCard
                key={candidate.id}
                profile={candidate}
                language={language}
                showInternalNotes={true}
                matchScore={rec?.matchScore}
                onFindMatch={() => onLaunchMatchReview(candidate)}
                onShareWhatsApp={() => onShareWhatsApp(candidate)}
                onViewDetails={() => onViewDetails(candidate)}
              />
            );
          })
        ) : (
          <div className="col-span-2 py-20 text-center rounded-3xl bg-white border border-[#E7E2D8] p-8 shadow-sm">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#F7F3EA] text-[#486878]">
              <Search className="h-7 w-7" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#182848] mb-1">
              {isRTL ? 'کوئی موزوں رشتہ نہیں ملا' : 'No Matching Candidates Found'}
            </h3>
            <p className="text-xs sm:text-sm text-[#68716D] max-w-md mx-auto mb-5 leading-relaxed">
              {isRTL 
                ? 'آپ کے منتخب کردہ معیارات کے مطابق فی الوقت کوئی امیدوار دستیاب نہیں ہے۔ براہ کرم عمر یا شہر کے فلٹرز کو وسعت دیں۔'
                : 'No registered bureau candidates matched your exact combination of search and filter criteria. Try expanding the age range or removing selected city filters.'}
            </p>
            <button
              type="button"
              onClick={handleResetAll}
              className="px-6 py-2.5 rounded-full bg-[#182848] text-white text-xs sm:text-sm font-semibold hover:bg-[#283848] shadow-md transition-all cursor-pointer"
            >
              {t.btnResetAll || (isRTL ? 'تمام فلٹرز ختم کریں' : 'Reset All Filters')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
