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
      setIsScrolled(window.scrollY > 30);
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
      {/* FLOATING GLASS CAPSULE — Seamless & Borderless with Frosted Blur (No White Wash, No Border Color) */}
      <div 
        className={`pointer-events-auto w-full max-w-6xl nav-capsule border-none px-3.5 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between transition-all duration-300 ${
          isScrolled ? 'nav-capsule-scrolled shadow-xl py-2' : ''
        }`}
      >
        {/* Brand Logo & Monogram */}
        <button
          onClick={() => {
            if (currentRole === 'public') onNavigate('home');
            else onNavigate('dashboard');
          }}
          className="flex items-center gap-2.5 group text-start focus:outline-none"
          aria-label="Gulistan Home"
        >
          <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-[#182848] text-[#B69A62] shadow-sm transition-transform group-hover:scale-105">
            <span className="font-serif text-lg sm:text-xl font-bold tracking-wider text-[#F7F3EA]">گ</span>
            <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#B69A62]"></div>
          </div>
          <div>
            <span className="block font-serif text-lg sm:text-xl font-bold tracking-tight text-[#182848] leading-tight">
              {t.brandName}
            </span>
            <span className="hidden sm:block text-[9px] font-semibold tracking-widest uppercase text-[#68716D]">
              {t.brandTagline}
            </span>
          </div>
        </button>

        {/* Desktop Navigation Links — Transparent Pill Items with subtle gold active indicator */}
        <nav className="hidden lg:flex items-center gap-1">
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
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`relative px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-[#182848] text-[#F7F3EA] shadow-sm font-semibold'
                        : 'text-[#243238] hover:text-[#182848] hover:bg-white/15'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full bg-[#B69A62]" />
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
                { id: 'profiles', label: isRTL ? 'تمام پروفائلز' : 'Profiles' },
                { id: 'search-match', label: t.actionFindMatch },
                { id: 'followups', label: t.actionFollowUps },
                { id: 'finances', label: t.actionFinances },
              ].map((item) => {
                const isActive = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`relative px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-[#182848] text-[#F7F3EA] shadow-sm font-semibold'
                        : 'text-[#243238] hover:text-[#182848] hover:bg-white/15'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full bg-[#B69A62]" />
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
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`relative px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-[#182848] text-[#F7F3EA] shadow-sm font-semibold'
                        : 'text-[#243238] hover:text-[#182848] hover:bg-white/15'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full bg-[#B69A62]" />
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
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`relative px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-[#182848] text-[#F7F3EA] shadow-sm font-semibold'
                        : 'text-[#243238] hover:text-[#182848] hover:bg-white/15'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full bg-[#B69A62]" />
                    )}
                  </button>
                );
              })}
            </>
          )}
        </nav>

        {/* Right Action Controls: Persona Switcher, Language Toggle, and CTA */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Persona Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="inline-flex items-center gap-1.5 rounded-full border-none bg-white/10 hover:bg-white/20 backdrop-blur-md px-2.5 sm:px-3 py-1.5 text-xs font-medium text-[#182848] transition-all shadow-xs cursor-pointer"
              aria-expanded={isRoleDropdownOpen}
              title="Select Stakeholder Experience"
            >
              {currentRole === 'nadeem' && <Users className="w-3.5 h-3.5 text-[#B69A62]" />}
              {currentRole === 'customer' && <User className="w-3.5 h-3.5 text-[#B69A62]" />}
              {currentRole === 'admin' && <Shield className="w-3.5 h-3.5 text-[#B69A62]" />}
              {currentRole === 'public' && <Globe className="w-3.5 h-3.5 text-[#B69A62]" />}
              <span className="hidden sm:inline max-w-[110px] truncate">{roleLabels[currentRole]}</span>
              <ChevronDown className="w-3 h-3 text-[#B69A62]" />
            </button>

            {isRoleDropdownOpen && (
              <div className="absolute end-0 mt-2 w-56 rounded-2xl border-none bg-[#182848]/95 text-[#F7F3EA] p-1.5 shadow-2xl backdrop-blur-2xl z-50">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#88A8A8]/70 border-b border-white/10">
                  Select Stakeholder Persona
                </div>
                {(['public', 'nadeem', 'customer', 'admin'] as Role[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRoleChange(role)}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      currentRole === role
                        ? 'bg-[#182848] text-[#F7F3EA] font-semibold'
                        : 'hover:bg-white/10 text-[#88A8A8]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {role === 'nadeem' && <Users className="w-3.5 h-3.5" />}
                      {role === 'customer' && <User className="w-3.5 h-3.5" />}
                      {role === 'admin' && <Shield className="w-3.5 h-3.5" />}
                      {role === 'public' && <Globe className="w-3.5 h-3.5" />}
                      <span>{roleLabels[role]}</span>
                    </div>
                    {currentRole === role && <Check className="w-3.5 h-3.5 text-[#B69A62]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Language Toggle Pill */}
          <button
            onClick={() => onToggleLanguage(language === 'en' ? 'ur' : 'en')}
            className="inline-flex items-center gap-1 rounded-full border-none bg-white/10 hover:bg-white/20 backdrop-blur-md px-2.5 py-1.5 text-xs font-medium text-[#182848] transition-all shadow-xs cursor-pointer"
            title="Switch Language (Urdu / English)"
          >
            <span className="font-bold text-[11px] text-[#B69A62]">{language === 'en' ? 'اردو' : 'EN'}</span>
          </button>

          {/* Primary Action Button */}
          <div className="hidden sm:flex items-center">
            {currentRole === 'public' ? (
              <button
                onClick={() => onNavigate('register')}
                className="rounded-full bg-[#182848] px-4 py-1.5 text-xs font-semibold text-[#F7F3EA] shadow-md hover:bg-[#283848] transition-all transform active:scale-95 border-none cursor-pointer"
              >
                {t.navRegister}
              </button>
            ) : (
              <button
                onClick={() => onNavigate('create-profile')}
                className="rounded-full bg-[#182848] px-3.5 py-1.5 text-xs font-semibold text-[#F7F3EA] shadow-md hover:bg-[#283848] transition-all flex items-center gap-1.5 border-none cursor-pointer"
              >
                <span className="text-sm font-bold leading-none">+</span>
                <span>{t.actionAddProfile}</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex lg:hidden items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="rounded-full border-none bg-white/10 hover:bg-white/20 backdrop-blur-md p-1.5 text-[#182848] transition-colors cursor-pointer"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE FLOATING GLASS DRAWER MENU */}
      {isMobileMenuOpen && (
        <div className="pointer-events-auto w-full max-w-6xl mt-2 rounded-3xl glass-panel border-none p-4 shadow-2xl space-y-3 lg:hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col space-y-1.5">
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
                    key={item.id}
                    onClick={() => { onNavigate(item.id); setIsMobileMenuOpen(false); }}
                    className={`text-start px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeNav === item.id
                        ? 'bg-[#182848] text-[#F7F3EA] font-semibold'
                        : 'text-[#252E2C] hover:bg-white/15'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                <div className="pt-2">
                  <button
                    onClick={() => { onNavigate('register'); setIsMobileMenuOpen(false); }}
                    className="w-full text-center rounded-full bg-[#182848] py-2.5 text-xs font-semibold text-[#F7F3EA] shadow-md border-none"
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
                  { id: 'search-match', label: t.actionFindMatch },
                  { id: 'followups', label: t.actionFollowUps },
                  { id: 'finances', label: t.actionFinances },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { onNavigate(item.id); setIsMobileMenuOpen(false); }}
                    className={`text-start px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeNav === item.id
                        ? 'bg-[#182848] text-[#F7F3EA] font-semibold'
                        : 'text-[#252E2C] hover:bg-white/15'
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
                    key={item.id}
                    onClick={() => { onNavigate(item.id); setIsMobileMenuOpen(false); }}
                    className={`text-start px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeNav === item.id
                        ? 'bg-[#182848] text-[#F7F3EA] font-semibold'
                        : 'text-[#252E2C] hover:bg-white/15'
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
                    key={item.id}
                    onClick={() => { onNavigate(item.id); setIsMobileMenuOpen(false); }}
                    className={`text-start px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeNav === item.id
                        ? 'bg-[#182848] text-[#F7F3EA] font-semibold'
                        : 'text-[#252E2C] hover:bg-white/15'
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
