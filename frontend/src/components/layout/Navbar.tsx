import React, { useState, useEffect } from 'react';
import { Role, Language } from '../../types';
import { translations } from '../../i18n/translations';
import { Globe, Shield, User, Users, Menu, X, Check, ChevronDown } from 'lucide-react';

interface NavbarProps {
  currentRole: Role;
  onSelectRole: (role: Role) => void;
  language: Language;
  onToggleLanguage: (lang: Language) => void;
  activeNav: string;
  onNavigate: (section: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onSelectRole,
  language,
  onToggleLanguage,
  activeNav,
  onNavigate,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const t = translations[language];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleRoleChange = (role: Role) => {
    onSelectRole(role);
    setIsRoleDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  const roleLabels: Record<Role, string> = {
    public: t.rolePublic,
    nadeem: t.roleNadeem,
    customer: t.roleCustomer,
    admin: t.roleAdmin,
  };

  const isRTL = language === 'ur';

  return (
    <header className="fixed top-2.5 sm:top-4 inset-x-0 z-50 flex flex-col items-center pointer-events-none px-3 sm:px-6 transition-all duration-300">
      {/* FLOATING GLASS CAPSULE — Generous Vertical Height, Spacious Padding & Frosted Contrast */}
      <div 
        className={`pointer-events-auto w-full max-w-7xl nav-capsule px-4 sm:px-7 py-3 sm:py-3.5 min-h-[62px] sm:min-h-[68px] flex items-center justify-between transition-all duration-300 ${
          isScrolled ? 'nav-capsule-scrolled shadow-xl py-2.5 sm:py-3 min-h-[58px] sm:min-h-[64px]' : ''
        }`}
      >
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

        {/* Desktop Navigation Links — Strictly Single-Line with Whitespace-Nowrap */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 flex-nowrap shrink-0">
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
                    className={`relative px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-[#182848] text-[#F7F3EA] shadow-sm font-semibold'
                        : 'text-[#182848]/85 hover:text-[#182848] hover:bg-[#182848]/8'
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
                    className={`relative px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-[#182848] text-[#F7F3EA] shadow-sm font-semibold'
                        : 'text-[#182848]/85 hover:text-[#182848] hover:bg-[#182848]/8'
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
                    className={`relative px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-[#182848] text-[#F7F3EA] shadow-sm font-semibold'
                        : 'text-[#182848]/85 hover:text-[#182848] hover:bg-[#182848]/8'
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
                    className={`relative px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-[#182848] text-[#F7F3EA] shadow-sm font-semibold'
                        : 'text-[#182848]/85 hover:text-[#182848] hover:bg-[#182848]/8'
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

        {/* Right Action Controls: Persona Switcher, Language Toggle, and CTA */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Persona Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/60 hover:bg-white/90 border border-[#182848]/15 px-3 py-2 text-xs sm:text-sm font-semibold text-[#182848] transition-all shadow-xs cursor-pointer whitespace-nowrap"
              aria-expanded={isRoleDropdownOpen}
              title="Select Stakeholder Experience"
            >
              {currentRole === 'nadeem' && <Users className="w-4 h-4 text-[#B69A62]" />}
              {currentRole === 'customer' && <User className="w-4 h-4 text-[#B69A62]" />}
              {currentRole === 'admin' && <Shield className="w-4 h-4 text-[#B69A62]" />}
              {currentRole === 'public' && <Globe className="w-4 h-4 text-[#B69A62]" />}
              <span className="hidden sm:inline max-w-[120px] truncate">{roleLabels[currentRole]}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#B69A62]" />
            </button>

            {isRoleDropdownOpen && (
              <div className="absolute end-0 mt-2 w-60 rounded-2xl bg-[#182848]/95 text-[#F7F3EA] p-1.5 shadow-2xl backdrop-blur-2xl z-50 border border-[#B69A62]/30 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#88A8A8] border-b border-white/10">
                  Select Stakeholder Persona
                </div>
                {(['public', 'nadeem', 'customer', 'admin'] as Role[]).map((role) => (
                  <button
                    type="button"
                    key={role}
                    onClick={() => handleRoleChange(role)}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                      currentRole === role
                        ? 'bg-white/15 text-[#F7F3EA] font-semibold'
                        : 'hover:bg-white/10 text-[#88A8A8] hover:text-[#F7F3EA]'
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

          {/* Language Toggle Pill */}
          <button
            type="button"
            onClick={() => onToggleLanguage(language === 'en' ? 'ur' : 'en')}
            className="inline-flex items-center justify-center rounded-full bg-white/60 hover:bg-white/90 border border-[#182848]/15 px-3 py-2 text-xs sm:text-sm font-bold text-[#182848] transition-all shadow-xs cursor-pointer whitespace-nowrap min-w-[42px]"
            title="Switch Language (Urdu / English)"
          >
            <span className="text-[#B69A62]">{language === 'en' ? 'اردو' : 'EN'}</span>
          </button>

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

          {/* Mobile Menu Trigger */}
          <div className="flex lg:hidden items-center">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="rounded-full bg-white/60 hover:bg-white/90 border border-[#182848]/15 p-2 text-[#182848] transition-colors cursor-pointer"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE FLOATING GLASS DRAWER MENU */}
      {isMobileMenuOpen && (
        <div className="pointer-events-auto w-full max-w-7xl mt-2 rounded-3xl glass-panel p-5 shadow-2xl space-y-3 lg:hidden animate-in fade-in zoom-in-95 duration-200 border border-white/60">
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
                        ? 'bg-[#182848] text-[#F7F3EA] font-semibold'
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
                ].map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => { onNavigate(item.id); setIsMobileMenuOpen(false); }}
                    className={`text-start px-4 py-3 rounded-2xl text-sm font-medium transition-colors cursor-pointer ${
                      activeNav === item.id
                        ? 'bg-[#182848] text-[#F7F3EA] font-semibold'
                        : 'text-[#182848] hover:bg-[#182848]/10'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
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
                        ? 'bg-[#182848] text-[#F7F3EA] font-semibold'
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
                        ? 'bg-[#182848] text-[#F7F3EA] font-semibold'
                        : 'text-[#182848] hover:bg-[#182848]/10'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
