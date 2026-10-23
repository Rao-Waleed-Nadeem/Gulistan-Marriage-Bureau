import React, { useState } from 'react';
import { Role, Language } from '../../types';
import { translations } from '../../i18n/translations';
import { Globe, Shield, User, Users, Menu, X, Check, Lock, ChevronDown } from 'lucide-react';

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
  const t = translations[language];

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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E7E2D8] bg-[#F7F3EA]/95 backdrop-blur-md transition-all">
      {/* Top Prototype / Role Switcher Banner */}
      <div className="bg-[#103B39] text-[#F7F3EA] px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[#B69A62] animate-pulse"></span>
            <span className="font-medium tracking-wide text-[#DCE6DE]">
              {t.demoNotice}
            </span>
          </div>

          {/* Quick Role Persona Switcher */}
          <div className="relative flex items-center gap-1.5 sm:gap-3">
            <span className="text-[#6D9189] hidden sm:inline">
              {language === 'ur' ? 'فعال کردار:' : 'Active Experience:'}
            </span>
            <div className="relative">
              <button
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#B69A62]/40 bg-[#164E4A] px-3 py-1 text-xs font-medium text-[#F7F3EA] hover:border-[#B69A62] transition-colors"
                aria-expanded={isRoleDropdownOpen}
              >
                {currentRole === 'nadeem' && <Users className="w-3.5 h-3.5 text-[#B69A62]" />}
                {currentRole === 'customer' && <User className="w-3.5 h-3.5 text-[#B69A62]" />}
                {currentRole === 'admin' && <Shield className="w-3.5 h-3.5 text-[#B69A62]" />}
                {currentRole === 'public' && <Globe className="w-3.5 h-3.5 text-[#B69A62]" />}
                <span>{roleLabels[currentRole]}</span>
                <ChevronDown className="w-3 h-3 text-[#B69A62]" />
              </button>

              {isRoleDropdownOpen && (
                <div className="absolute end-0 mt-1.5 w-60 rounded-xl border border-[#B69A62]/30 bg-[#FFFEFA] p-1.5 text-[#252E2C] shadow-xl z-50">
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#68716D] border-b border-[#E7E2D8]">
                    Select Demo Persona
                  </div>
                  {(['public', 'nadeem', 'customer', 'admin'] as Role[]).map((role) => (
                    <button
                      key={role}
                      onClick={() => handleRoleChange(role)}
                      className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        currentRole === role
                          ? 'bg-[#164E4A] text-[#F7F3EA]'
                          : 'hover:bg-[#DCE6DE]/40 text-[#252E2C]'
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

            {/* Language Toggle */}
            <button
              onClick={() => onToggleLanguage(language === 'en' ? 'ur' : 'en')}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#B69A62]/40 bg-[#164E4A] px-2.5 py-1 text-xs font-medium text-[#F7F3EA] hover:border-[#B69A62] transition-colors"
              title="Switch Language (Urdu / English)"
            >
              <Globe className="w-3.5 h-3.5 text-[#B69A62]" />
              <span>{language === 'en' ? 'اردو (RTL)' : 'English (LTR)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo & Monogram */}
          <button
            onClick={() => {
              if (currentRole === 'public') onNavigate('home');
              else onNavigate('dashboard');
            }}
            className="flex items-center gap-3 group text-start focus:outline-none"
          >
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[#B69A62]/40 bg-[#164E4A] text-[#B69A62] shadow-md group-hover:border-[#B69A62] transition-colors">
              <span className="font-serif text-2xl font-semibold tracking-wider">G</span>
              <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#B69A62]"></div>
            </div>
            <div>
              <span className="block font-serif text-2xl font-bold tracking-tight text-[#164E4A]">
                {t.brandName}
              </span>
              <span className="block text-[11px] font-medium tracking-widest uppercase text-[#68716D]">
                {t.brandTagline}
              </span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7">
            {currentRole === 'public' && (
              <>
                <button
                  onClick={() => onNavigate('home')}
                  className={`text-sm font-medium transition-colors ${activeNav === 'home' ? 'text-[#164E4A] font-semibold border-b-2 border-[#164E4A] pb-1' : 'text-[#68716D] hover:text-[#164E4A]'}`}
                >
                  {t.navHome}
                </button>
                <button
                  onClick={() => onNavigate('approach')}
                  className={`text-sm font-medium transition-colors ${activeNav === 'approach' ? 'text-[#164E4A] font-semibold border-b-2 border-[#164E4A] pb-1' : 'text-[#68716D] hover:text-[#164E4A]'}`}
                >
                  {t.navOurApproach}
                </button>
                <button
                  onClick={() => onNavigate('how-it-works')}
                  className={`text-sm font-medium transition-colors ${activeNav === 'how-it-works' ? 'text-[#164E4A] font-semibold border-b-2 border-[#164E4A] pb-1' : 'text-[#68716D] hover:text-[#164E4A]'}`}
                >
                  {t.navHowItWorks}
                </button>
                <button
                  onClick={() => onNavigate('privacy')}
                  className={`text-sm font-medium transition-colors ${activeNav === 'privacy' ? 'text-[#164E4A] font-semibold border-b-2 border-[#164E4A] pb-1' : 'text-[#68716D] hover:text-[#164E4A]'}`}
                >
                  {t.navPrivacy}
                </button>
                <button
                  onClick={() => onNavigate('contact')}
                  className={`text-sm font-medium transition-colors ${activeNav === 'contact' ? 'text-[#164E4A] font-semibold border-b-2 border-[#164E4A] pb-1' : 'text-[#68716D] hover:text-[#164E4A]'}`}
                >
                  {t.navContact}
                </button>
              </>
            )}

            {currentRole === 'nadeem' && (
              <>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={`text-sm font-medium transition-colors ${activeNav === 'dashboard' ? 'text-[#164E4A] font-semibold border-b-2 border-[#164E4A] pb-1' : 'text-[#68716D] hover:text-[#164E4A]'}`}
                >
                  {language === 'ur' ? 'ڈیش بورڈ' : 'Dashboard'}
                </button>
                <button
                  onClick={() => onNavigate('profiles')}
                  className={`text-sm font-medium transition-colors ${activeNav === 'profiles' ? 'text-[#164E4A] font-semibold border-b-2 border-[#164E4A] pb-1' : 'text-[#68716D] hover:text-[#164E4A]'}`}
                >
                  {language === 'ur' ? 'تمام پروفائلز' : 'Profiles'}
                </button>
                <button
                  onClick={() => onNavigate('search-match')}
                  className={`text-sm font-medium transition-colors ${activeNav === 'search-match' ? 'text-[#164E4A] font-semibold border-b-2 border-[#164E4A] pb-1' : 'text-[#68716D] hover:text-[#164E4A]'}`}
                >
                  {t.actionFindMatch}
                </button>
                <button
                  onClick={() => onNavigate('followups')}
                  className={`text-sm font-medium transition-colors ${activeNav === 'followups' ? 'text-[#164E4A] font-semibold border-b-2 border-[#164E4A] pb-1' : 'text-[#68716D] hover:text-[#164E4A]'}`}
                >
                  {t.actionFollowUps}
                </button>
                <button
                  onClick={() => onNavigate('finances')}
                  className={`text-sm font-medium transition-colors ${activeNav === 'finances' ? 'text-[#164E4A] font-semibold border-b-2 border-[#164E4A] pb-1' : 'text-[#68716D] hover:text-[#164E4A]'}`}
                >
                  {t.actionFinances}
                </button>
              </>
            )}

            {currentRole === 'customer' && (
              <>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={`text-sm font-medium transition-colors ${activeNav === 'dashboard' ? 'text-[#164E4A] font-semibold border-b-2 border-[#164E4A] pb-1' : 'text-[#68716D] hover:text-[#164E4A]'}`}
                >
                  {language === 'ur' ? 'میرا ڈیش بورڈ' : 'My Dashboard'}
                </button>
                <button
                  onClick={() => onNavigate('recommendations')}
                  className={`text-sm font-medium transition-colors ${activeNav === 'recommendations' ? 'text-[#164E4A] font-semibold border-b-2 border-[#164E4A] pb-1' : 'text-[#68716D] hover:text-[#164E4A]'}`}
                >
                  {t.customerRecommendations}
                </button>
                <button
                  onClick={() => onNavigate('preferences')}
                  className={`text-sm font-medium transition-colors ${activeNav === 'preferences' ? 'text-[#164E4A] font-semibold border-b-2 border-[#164E4A] pb-1' : 'text-[#68716D] hover:text-[#164E4A]'}`}
                >
                  {t.customerPreferences}
                </button>
                <button
                  onClick={() => onNavigate('privacy-center')}
                  className={`text-sm font-medium transition-colors ${activeNav === 'privacy-center' ? 'text-[#164E4A] font-semibold border-b-2 border-[#164E4A] pb-1' : 'text-[#68716D] hover:text-[#164E4A]'}`}
                >
                  {t.customerPrivacyCenter}
                </button>
              </>
            )}

            {currentRole === 'admin' && (
              <>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={`text-sm font-medium transition-colors ${activeNav === 'dashboard' ? 'text-[#164E4A] font-semibold border-b-2 border-[#164E4A] pb-1' : 'text-[#68716D] hover:text-[#164E4A]'}`}
                >
                  System Dashboard
                </button>
                <button
                  onClick={() => onNavigate('profiles-audit')}
                  className={`text-sm font-medium transition-colors ${activeNav === 'profiles-audit' ? 'text-[#164E4A] font-semibold border-b-2 border-[#164E4A] pb-1' : 'text-[#68716D] hover:text-[#164E4A]'}`}
                >
                  Profile Oversight
                </button>
                <button
                  onClick={() => onNavigate('audit-logs')}
                  className={`text-sm font-medium transition-colors ${activeNav === 'audit-logs' ? 'text-[#164E4A] font-semibold border-b-2 border-[#164E4A] pb-1' : 'text-[#68716D] hover:text-[#164E4A]'}`}
                >
                  Audit Activity
                </button>
                <button
                  onClick={() => onNavigate('system-settings')}
                  className={`text-sm font-medium transition-colors ${activeNav === 'system-settings' ? 'text-[#164E4A] font-semibold border-b-2 border-[#164E4A] pb-1' : 'text-[#68716D] hover:text-[#164E4A]'}`}
                >
                  Settings & Conventions
                </button>
              </>
            )}
          </nav>

          {/* Action Button */}
          <div className="hidden md:flex items-center gap-3">
            {currentRole === 'public' ? (
              <>
                <button
                  onClick={() => onNavigate('login')}
                  className="rounded-xl border border-[#E7E2D8] bg-[#FFFEFA] px-4 py-2.5 text-xs font-medium text-[#252E2C] hover:border-[#164E4A] transition-colors"
                >
                  {t.navSignIn}
                </button>
                <button
                  onClick={() => onNavigate('register')}
                  className="rounded-xl bg-[#164E4A] px-5 py-2.5 text-xs font-semibold text-[#F7F3EA] shadow-md hover:bg-[#103B39] transition-all transform active:scale-95"
                >
                  {t.navRegister}
                </button>
              </>
            ) : (
              <button
                onClick={() => onNavigate('create-profile')}
                className="rounded-xl bg-[#164E4A] px-5 py-2.5 text-xs font-semibold text-[#F7F3EA] shadow-md hover:bg-[#103B39] transition-all flex items-center gap-2"
              >
                <span>+</span>
                <span>{t.actionAddProfile}</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="rounded-xl border border-[#E7E2D8] bg-[#FFFEFA] p-2.5 text-[#164E4A]"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-[#E7E2D8] bg-[#FFFEFA] px-4 pt-3 pb-6 space-y-3 shadow-xl">
          <div className="flex flex-col space-y-2">
            {currentRole === 'public' && (
              <>
                <button
                  onClick={() => { onNavigate('home'); setIsMobileMenuOpen(false); }}
                  className="text-start py-2 text-sm font-medium text-[#252E2C]"
                >
                  {t.navHome}
                </button>
                <button
                  onClick={() => { onNavigate('approach'); setIsMobileMenuOpen(false); }}
                  className="text-start py-2 text-sm font-medium text-[#252E2C]"
                >
                  {t.navOurApproach}
                </button>
                <button
                  onClick={() => { onNavigate('how-it-works'); setIsMobileMenuOpen(false); }}
                  className="text-start py-2 text-sm font-medium text-[#252E2C]"
                >
                  {t.navHowItWorks}
                </button>
                <button
                  onClick={() => { onNavigate('privacy'); setIsMobileMenuOpen(false); }}
                  className="text-start py-2 text-sm font-medium text-[#252E2C]"
                >
                  {t.navPrivacy}
                </button>
                <button
                  onClick={() => { onNavigate('contact'); setIsMobileMenuOpen(false); }}
                  className="text-start py-2 text-sm font-medium text-[#252E2C]"
                >
                  {t.navContact}
                </button>
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => { onNavigate('register'); setIsMobileMenuOpen(false); }}
                    className="w-full text-center rounded-xl bg-[#164E4A] py-3 text-sm font-semibold text-[#F7F3EA]"
                  >
                    {t.navRegister}
                  </button>
                </div>
              </>
            )}

            {currentRole === 'nadeem' && (
              <>
                <button
                  onClick={() => { onNavigate('dashboard'); setIsMobileMenuOpen(false); }}
                  className="text-start py-2 text-sm font-medium text-[#252E2C]"
                >
                  {language === 'ur' ? 'ڈیش بورڈ' : 'Dashboard'}
                </button>
                <button
                  onClick={() => { onNavigate('profiles'); setIsMobileMenuOpen(false); }}
                  className="text-start py-2 text-sm font-medium text-[#252E2C]"
                >
                  {language === 'ur' ? 'تمام پروفائلز' : 'All Profiles'}
                </button>
                <button
                  onClick={() => { onNavigate('create-profile'); setIsMobileMenuOpen(false); }}
                  className="text-start py-2 text-sm font-medium text-[#164E4A] font-semibold"
                >
                  {t.actionAddProfile}
                </button>
                <button
                  onClick={() => { onNavigate('search-match'); setIsMobileMenuOpen(false); }}
                  className="text-start py-2 text-sm font-medium text-[#252E2C]"
                >
                  {t.actionFindMatch}
                </button>
                <button
                  onClick={() => { onNavigate('followups'); setIsMobileMenuOpen(false); }}
                  className="text-start py-2 text-sm font-medium text-[#252E2C]"
                >
                  {t.actionFollowUps}
                </button>
                <button
                  onClick={() => { onNavigate('finances'); setIsMobileMenuOpen(false); }}
                  className="text-start py-2 text-sm font-medium text-[#252E2C]"
                >
                  {t.actionFinances}
                </button>
              </>
            )}

            {currentRole === 'customer' && (
              <>
                <button
                  onClick={() => { onNavigate('dashboard'); setIsMobileMenuOpen(false); }}
                  className="text-start py-2 text-sm font-medium text-[#252E2C]"
                >
                  {language === 'ur' ? 'میرا ڈیش بورڈ' : 'My Dashboard'}
                </button>
                <button
                  onClick={() => { onNavigate('recommendations'); setIsMobileMenuOpen(false); }}
                  className="text-start py-2 text-sm font-medium text-[#252E2C]"
                >
                  {t.customerRecommendations}
                </button>
                <button
                  onClick={() => { onNavigate('preferences'); setIsMobileMenuOpen(false); }}
                  className="text-start py-2 text-sm font-medium text-[#252E2C]"
                >
                  {t.customerPreferences}
                </button>
                <button
                  onClick={() => { onNavigate('privacy-center'); setIsMobileMenuOpen(false); }}
                  className="text-start py-2 text-sm font-medium text-[#252E2C]"
                >
                  {t.customerPrivacyCenter}
                </button>
              </>
            )}

            {currentRole === 'admin' && (
              <>
                <button
                  onClick={() => { onNavigate('dashboard'); setIsMobileMenuOpen(false); }}
                  className="text-start py-2 text-sm font-medium text-[#252E2C]"
                >
                  System Dashboard
                </button>
                <button
                  onClick={() => { onNavigate('profiles-audit'); setIsMobileMenuOpen(false); }}
                  className="text-start py-2 text-sm font-medium text-[#252E2C]"
                >
                  Profile Oversight
                </button>
                <button
                  onClick={() => { onNavigate('audit-logs'); setIsMobileMenuOpen(false); }}
                  className="text-start py-2 text-sm font-medium text-[#252E2C]"
                >
                  Audit Activity
                </button>
                <button
                  onClick={() => { onNavigate('system-settings'); setIsMobileMenuOpen(false); }}
                  className="text-start py-2 text-sm font-medium text-[#252E2C]"
                >
                  Settings & Conventions
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
