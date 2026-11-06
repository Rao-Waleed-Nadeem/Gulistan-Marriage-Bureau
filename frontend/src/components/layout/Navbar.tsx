import React, { useState, useEffect, useRef } from 'react';
import { Role, Language } from '../../types';
import { translations } from '../../i18n/translations';
import { 
  Globe, 
  Shield, 
  User, 
  Users, 
  Menu, 
  X, 
  Check, 
  ChevronDown, 
  LogIn, 
  LogOut, 
  Sparkles
} from 'lucide-react';
import { getClientConfig } from '../../lib/config';
import { 
  resolveInitialClarity, 
  persistClarityPreference, 
  CLARITY_CHANGE_EVENT, 
  ClarityMode 
} from '../../lib/appearance';

interface NavbarProps {
  currentRole: Role;
  onSelectRole: (role: Role) => void;
  language: Language;
  onToggleLanguage: (lang: Language) => void;
  activeNav: string;
  onNavigate: (section: string) => void;
  onOpenAuthModal?: () => void;
  isAuthenticated?: boolean;
  userEmail?: string | null;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onSelectRole,
  language,
  onToggleLanguage,
  activeNav,
  onNavigate,
  onOpenAuthModal,
  isAuthenticated = false,
  userEmail = null,
  onSignOut,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [clarityMode, setClarityMode] = useState<ClarityMode>(resolveInitialClarity);
  const [isScrolled, setIsScrolled] = useState(false);

  const roleDropdownRef = useRef<HTMLDivElement | null>(null);

  const t = translations[language];
  const isRTL = language === 'ur';
  const clientConfig = getClientConfig();
  const isDemoMode = clientConfig.mode === 'demo';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClarityChange = (e: Event) => {
      const customEvent = e as CustomEvent<ClarityMode>;
      if (customEvent.detail) {
        setClarityMode(customEvent.detail);
      }
    };
    window.addEventListener(CLARITY_CHANGE_EVENT, handleClarityChange);
    return () => window.removeEventListener(CLARITY_CHANGE_EVENT, handleClarityChange);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleChange = (role: Role) => {
    onSelectRole(role);
    setIsRoleDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleSelectClarity = (mode: ClarityMode) => {
    setClarityMode(mode);
    persistClarityPreference(mode);
  };

  const roleLabels: Record<Role, string> = {
    public: t.rolePublic,
    nadeem: t.roleNadeem,
    customer: t.roleCustomer,
    admin: t.roleAdmin,
  };

  const clarityLabels: Record<ClarityMode, string> = {
    clear: t.clarityClear || (isRTL ? 'صاف (۸۲٪)' : 'Clear (82%)'),
    ultra: t.clarityUltra || (isRTL ? 'نہایت شفاف (۹۵٪)' : 'Ultra (95%)'),
    soft: t.claritySoft || (isRTL ? 'ہلکا مدھم (۶۵٪)' : 'Soft (65%)'),
  };

  return (
    <header className="fixed top-2 sm:top-3 inset-x-0 z-50 flex flex-col items-center pointer-events-none px-3 sm:px-6 transition-all duration-300">
      {/* FLOATING GLASS CAPSULE — TWO-TIER ERGONOMIC LAYOUT */}
      <div 
        className={`pointer-events-auto w-full max-w-7xl nav-capsule px-4 sm:px-6 py-2.5 sm:py-3 flex flex-col gap-2.5 transition-all duration-300 ${
          isScrolled ? 'nav-capsule-scrolled shadow-xl py-2 sm:py-2.5' : ''
        }`}
      >
        {/* TIER 1: BRAND LOGO, PRIMARY NAVIGATION, AND KEY CTAS */}
        <div className="flex items-center justify-between gap-3 w-full">
          {/* Brand Logo & Monogram */}
          <button
            type="button"
            onClick={() => {
              if (currentRole === 'public') onNavigate('home');
              else onNavigate('dashboard');
            }}
            className="flex items-center gap-3 group text-start focus:outline-none cursor-pointer shrink-0"
            aria-label="Gulistan Home"
          >
            <div className="relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-[#182848] text-[#B69A62] shadow-sm transition-transform group-hover:scale-105 shrink-0">
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-wider text-[#F7F3EA] select-none">گ</span>
              <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#B69A62] ring-2 ring-white/80" />
            </div>
            <div className="leading-tight">
              <span className="block font-serif text-lg sm:text-xl font-bold tracking-tight text-[#182848]">
                {t.brandName}
              </span>
              <span className="hidden sm:block text-[10px] font-semibold tracking-widest uppercase text-[#587888]">
                {t.brandTagline}
              </span>
            </div>
          </button>

          {/* Desktop Navigation Links — Centered with Full Breathing Room */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 flex-nowrap">
            {currentRole === 'public' && (
              <>
                {[
                  { id: 'home', label: t.navHome },
                  { id: 'approach', label: t.navOurApproach },
                  { id: 'how-it-works', label: t.navHowItWorks },
                  { id: 'privacy', label: t.navPrivacy },
                  { id: 'contact', label: t.navContact },
                ].map((item) => {
                  const isActive = activeNav === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`relative px-4 py-2 rounded-full text-sm whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-[#182848] text-white shadow-md font-bold ring-1 ring-white/20'
                          : 'text-[#182848]/80 hover:text-[#182848] hover:bg-white/60 font-medium'
                      }`}
                    >
                      <span className="whitespace-nowrap">{item.label}</span>
                      {isActive && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-[#B69A62] pointer-events-none" />
                      )}
                    </button>
                  );
                })}
              </>
            )}

            {currentRole === 'nadeem' && (
              <>
                {[
                  { id: 'dashboard', label: isRTL ? 'ڈیش بورڈ' : 'Dashboard' },
                  { id: 'profiles', label: isRTL ? 'تمام پروفائلز' : 'Profiles Directory' },
                  { id: 'search', label: t.actionFindMatch },
                  { id: 'followups', label: t.actionFollowUps },
                  { id: 'finances', label: t.actionFinances },
                ].map((item) => {
                  const isActive = activeNav === item.id || (item.id === 'dashboard' && activeNav === 'overview');
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`relative px-4 py-2 rounded-full text-sm whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-[#182848] text-white shadow-md font-bold ring-1 ring-white/20'
                          : 'text-[#182848]/80 hover:text-[#182848] hover:bg-white/60 font-medium'
                      }`}
                    >
                      <span className="whitespace-nowrap">{item.label}</span>
                      {isActive && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-[#B69A62] pointer-events-none" />
                      )}
                    </button>
                  );
                })}
              </>
            )}

            {currentRole === 'customer' && (
              <>
                {[
                  { id: 'dashboard', label: isRTL ? 'میرا ڈیش بورڈ' : 'My Dashboard' },
                  { id: 'recommendations', label: t.customerRecommendations },
                  { id: 'preferences', label: t.customerPreferences },
                  { id: 'privacy-center', label: t.customerPrivacyCenter },
                ].map((item) => {
                  const isActive = activeNav === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`relative px-4 py-2 rounded-full text-sm whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-[#182848] text-white shadow-md font-bold ring-1 ring-white/20'
                          : 'text-[#182848]/80 hover:text-[#182848] hover:bg-white/60 font-medium'
                      }`}
                    >
                      <span className="whitespace-nowrap">{item.label}</span>
                      {isActive && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-[#B69A62] pointer-events-none" />
                      )}
                    </button>
                  );
                })}
              </>
            )}

            {currentRole === 'admin' && (
              <>
                {[
                  { id: 'dashboard', label: 'System Dashboard' },
                  { id: 'profiles-audit', label: 'Profile Oversight' },
                  { id: 'audit-logs', label: 'Audit Activity' },
                  { id: 'system-settings', label: 'Settings' },
                ].map((item) => {
                  const isActive = activeNav === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`relative px-4 py-2 rounded-full text-sm whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-[#182848] text-white shadow-md font-bold ring-1 ring-white/20'
                          : 'text-[#182848]/80 hover:text-[#182848] hover:bg-white/60 font-medium'
                      }`}
                    >
                      <span className="whitespace-nowrap">{item.label}</span>
                      {isActive && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-[#B69A62] pointer-events-none" />
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </nav>

          {/* Right Action Controls: CTA, Sign In / Sign Out, and Mobile Trigger */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Authentication Action Trigger */}
            {!isAuthenticated ? (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#182848] hover:bg-[#283848] text-[#F7F3EA] border border-[#B69A62]/30 px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
                title={t.navSignIn}
              >
                <LogIn className="w-3.5 h-3.5 text-[#B69A62]" />
                <span>{t.navSignIn}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-950/20 hover:bg-red-950/35 border border-red-500/30 px-3 py-2 text-xs sm:text-sm font-semibold text-red-700 hover:text-red-800 transition-all shadow-xs cursor-pointer whitespace-nowrap"
                title={userEmail ? `${userEmail} (${t.navSignOut})` : t.navSignOut}
              >
                <LogOut className="w-3.5 h-3.5 text-red-600" />
                <span className="hidden sm:inline">{t.navSignOut}</span>
              </button>
            )}

            {/* Primary Action Button */}
            <div className="hidden sm:flex items-center">
              {currentRole === 'public' ? (
                <button
                  type="button"
                  onClick={() => onNavigate('register')}
                  className="rounded-full bg-[#182848] px-5 py-2 text-xs sm:text-sm font-semibold text-[#F7F3EA] shadow-md hover:bg-[#283848] transition-all transform active:scale-95 border border-[#B69A62]/30 cursor-pointer whitespace-nowrap"
                >
                  {t.navRegister}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate('create-profile')}
                  className="rounded-full bg-[#182848] px-4.5 py-2 text-xs sm:text-sm font-semibold text-[#F7F3EA] shadow-md hover:bg-[#283848] transition-all flex items-center gap-1.5 border border-[#B69A62]/30 cursor-pointer whitespace-nowrap"
                >
                  <span className="text-base font-bold leading-none text-[#B69A62]">+</span>
                  <span>{t.actionAddProfile}</span>
                </button>
              )}
            </div>

            {/* Hamburger Menu Trigger on Smaller Screens */}
            <div className="flex lg:hidden items-center">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="rounded-full bg-white/60 hover:bg-white/90 border border-[#182848]/15 p-2 text-[#182848] transition-colors cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* TIER 2 (NEW LINE): PROFILE CHANGING, CLARITY & BACKGROUND CHANGING, LANGUAGE CHANGING */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 w-full pt-2 border-t border-[#182848]/10 text-xs">
          {/* Start Side: Profile Changing Button (Persona Switcher) */}
          <div className="relative" ref={roleDropdownRef}>
            <button
              type="button"
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="inline-flex items-center gap-2 rounded-full bg-white/70 hover:bg-white border border-[#182848]/20 px-3.5 py-1.5 text-xs font-semibold text-[#182848] transition-all shadow-xs cursor-pointer whitespace-nowrap"
              aria-expanded={isRoleDropdownOpen}
              title={isRTL ? 'کردار / پروفائل تبدیل کریں' : 'Switch Stakeholder Persona'}
            >
              <span className="text-[#587888] font-normal hidden sm:inline">
                {isRTL ? 'پروفائل:' : 'Profile:'}
              </span>
              <div className="flex items-center gap-1.5">
                {currentRole === 'nadeem' && <Users className="w-3.5 h-3.5 text-[#B69A62]" />}
                {currentRole === 'customer' && <User className="w-3.5 h-3.5 text-[#B69A62]" />}
                {currentRole === 'admin' && <Shield className="w-3.5 h-3.5 text-[#B69A62]" />}
                {currentRole === 'public' && <Globe className="w-3.5 h-3.5 text-[#B69A62]" />}
                <span className="font-bold text-[#182848]">{roleLabels[currentRole]}</span>
              </div>
              {isDemoMode && (
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#B69A62]/20 text-[#182848] font-bold">
                  {t.demoModeBadge || 'Demo'}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-[#B69A62] transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isRoleDropdownOpen && (
              <div className="absolute start-0 mt-2 w-64 rounded-2xl bg-[#182848]/95 text-[#F7F3EA] p-2 shadow-2xl backdrop-blur-2xl z-50 border border-[#B69A62]/30 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#88A8A8] border-b border-white/10 mb-1">
                  {isRTL ? 'کردار منتخب کریں' : 'Select Stakeholder Experience'}
                </div>
                {(['public', 'nadeem', 'customer', 'admin'] as Role[]).map((role) => (
                  <button
                    type="button"
                    key={role}
                    onClick={() => handleRoleChange(role)}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      currentRole === role
                        ? 'bg-white/15 text-white font-bold'
                        : 'hover:bg-white/10 text-[#88A8A8] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {role === 'nadeem' && <Users className="w-4 h-4 text-[#B69A62]" />}
                      {role === 'customer' && <User className="w-4 h-4 text-[#B69A62]" />}
                      {role === 'admin' && <Shield className="w-4 h-4 text-[#B69A62]" />}
                      {role === 'public' && <Globe className="w-4 h-4 text-[#B69A62]" />}
                      <span>{roleLabels[role]}</span>
                    </div>
                    {currentRole === role && <Check className="w-4 h-4 text-[#B69A62]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* End Side: Clarity & Background Changing Controls + Language Changing */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Background Changing & Clarity Controls */}
            <div className="flex items-center gap-1 bg-[#182848]/5 p-1 rounded-full border border-[#182848]/10">
              <span className="hidden md:inline-flex items-center gap-1 px-2 text-[11px] font-semibold text-[#587888]">
                <Sparkles className="w-3.5 h-3.5 text-[#B69A62]" />
                <span>{isRTL ? 'پس منظر:' : 'Background:'}</span>
              </span>

              {(['clear', 'ultra', 'soft'] as ClarityMode[]).map((mode) => {
                const isSelected = clarityMode === mode;
                return (
                  <button
                    type="button"
                    key={mode}
                    onClick={() => handleSelectClarity(mode)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#182848] text-white shadow-xs font-bold'
                        : 'text-[#182848]/75 hover:text-[#182848] hover:bg-white/60'
                    }`}
                    title={clarityLabels[mode]}
                  >
                    {mode === 'clear' && (isRTL ? 'صاف (۸۲٪)' : 'Clear (82%)')}
                    {mode === 'ultra' && (isRTL ? 'شفاف (۹۵٪)' : 'Ultra (95%)')}
                    {mode === 'soft' && (isRTL ? 'مدھم (۶۵٪)' : 'Soft (65%)')}
                  </button>
                );
              })}
            </div>

            {/* Language Changing Button */}
            <button
              type="button"
              onClick={() => onToggleLanguage(language === 'en' ? 'ur' : 'en')}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/70 hover:bg-white border border-[#182848]/20 px-3.5 py-1.5 text-xs font-bold text-[#182848] transition-all shadow-xs cursor-pointer whitespace-nowrap min-w-[50px] justify-center"
              title={language === 'en' ? 'Switch to Urdu (اردو)' : 'انگریزی میں تبدیل کریں (English)'}
            >
              <Globe className="w-3.5 h-3.5 text-[#B69A62]" />
              <span className="text-[#182848]">{language === 'en' ? 'اردو' : 'English'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* FLOATING GLASS DRAWER MENU (MOBILE & TABLET) */}
      {isMobileMenuOpen && (
        <div className="pointer-events-auto w-full max-w-7xl mt-2 rounded-3xl glass-panel p-5 shadow-2xl space-y-3 lg:hidden animate-in fade-in zoom-in-95 duration-200 border border-white/60 max-h-[85vh] overflow-y-auto">
          <div className="flex flex-col space-y-2">
            {currentRole === 'public' && (
              <>
                {[
                  { id: 'home', label: t.navHome },
                  { id: 'approach', label: t.navOurApproach },
                  { id: 'how-it-works', label: t.navHowItWorks },
                  { id: 'privacy', label: t.navPrivacy },
                  { id: 'contact', label: t.navContact },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => { onNavigate(item.id); setIsMobileMenuOpen(false); }}
                    className={`text-start px-4 py-3 rounded-2xl text-sm font-medium transition-colors cursor-pointer ${
                      activeNav === item.id
                        ? 'bg-[#182848] text-white font-bold shadow-sm'
                        : 'text-[#182848] hover:bg-[#182848]/10'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => { onNavigate('register'); setIsMobileMenuOpen(false); }}
                    className="w-full text-center rounded-full bg-[#182848] py-3 text-sm font-semibold text-[#F7F3EA] shadow-md border border-[#B69A62]/30 cursor-pointer"
                  >
                    {t.navRegister}
                  </button>
                </div>
              </>
            )}

            {currentRole === 'nadeem' && (
              <>
                {[
                  { id: 'dashboard', label: isRTL ? 'ڈیش بورڈ' : 'Dashboard' },
                  { id: 'profiles', label: isRTL ? 'تمام پروفائلز' : 'All Profiles' },
                  { id: 'create-profile', label: t.actionAddProfile },
                  { id: 'search', label: t.actionFindMatch },
                  { id: 'followups', label: t.actionFollowUps },
                  { id: 'finances', label: t.actionFinances },
                ].map((item) => {
                  const isActive = activeNav === item.id || (item.id === 'dashboard' && activeNav === 'overview');
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => { onNavigate(item.id); setIsMobileMenuOpen(false); }}
                      className={`text-start px-4 py-3 rounded-2xl text-sm font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#182848] text-white font-bold shadow-sm'
                          : 'text-[#182848] hover:bg-[#182848]/10'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </>
            )}

            {currentRole === 'customer' && (
              <>
                {[
                  { id: 'dashboard', label: isRTL ? 'میرا ڈیش بورڈ' : 'My Dashboard' },
                  { id: 'recommendations', label: t.customerRecommendations },
                  { id: 'preferences', label: t.customerPreferences },
                  { id: 'privacy-center', label: t.customerPrivacyCenter },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => { onNavigate(item.id); setIsMobileMenuOpen(false); }}
                    className={`text-start px-4 py-3 rounded-2xl text-sm font-medium transition-colors cursor-pointer ${
                      activeNav === item.id
                        ? 'bg-[#182848] text-white font-bold shadow-sm'
                        : 'text-[#182848] hover:bg-[#182848]/10'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </>
            )}

            {currentRole === 'admin' && (
              <>
                {[
                  { id: 'dashboard', label: 'System Dashboard' },
                  { id: 'profiles-audit', label: 'Profile Oversight' },
                  { id: 'audit-logs', label: 'Audit Activity' },
                  { id: 'system-settings', label: 'Settings & Conventions' },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => { onNavigate(item.id); setIsMobileMenuOpen(false); }}
                    className={`text-start px-4 py-3 rounded-2xl text-sm font-medium transition-colors cursor-pointer ${
                      activeNav === item.id
                        ? 'bg-[#182848] text-white font-bold shadow-sm'
                        : 'text-[#182848] hover:bg-[#182848]/10'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </>
            )}

            {/* Mobile Auth Button */}
            <div className="pt-3 mt-1 border-t border-[#182848]/15">
              {!isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAuthModal?.();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#182848] py-3 text-sm font-semibold text-[#F7F3EA] shadow-md border border-[#B69A62]/30 cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-[#B69A62]" />
                  <span>{t.navSignIn}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onSignOut?.();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-950/15 hover:bg-red-950/25 py-3 text-sm font-semibold text-red-700 border border-red-500/30 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-600" />
                  <span>{t.navSignOut}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
