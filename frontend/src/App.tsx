import React, { useState, useEffect } from 'react';
import { 
  Role, 
  Language, 
  ProfileRecord, 
  MatchRecommendation, 
  FollowUpItem, 
  ExternalMatchmaker, 
  FinancialTransaction, 
  AuditLogItem 
} from './types';
import { 
  INITIAL_PROFILES, 
  INITIAL_RECOMMENDATIONS, 
  INITIAL_FOLLOW_UPS, 
  INITIAL_MATCHMAKERS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_AUDIT_LOGS 
} from './data/mockData';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { LandingPage } from './features/public/LandingPage';
import { OurApproach, HowItWorksPage, PrivacyPolicyPage, ContactPage } from './features/public/PublicPages';
import { NadeemDashboard } from './features/matchmaker/NadeemDashboard';
import { ProfileWizard } from './features/matchmaker/ProfileWizard';
import { CustomerPortal } from './features/customer/CustomerPortal';
import { AdminPortal } from './features/admin/AdminPortal';
import { ScrollAnimationBackground } from './components/ui/ScrollAnimationBackground';
import { getClientConfig } from './lib/config';
import { 
  AuthSession, 
  getCurrentSession, 
  subscribeToAuthChanges, 
  canAccessRole, 
  signOut,
  updateUserPreferredLanguage,
  initAuth
} from './lib/auth';
import { validateProfileInput, canTransitionStatus, enrichPropertyDetails } from './lib/profiles';
import { completeFollowUp } from './lib/followUps';
import { recordTransaction } from './lib/finance';
import { AuthModal } from './components/auth/AuthModal';
import { translations } from './i18n/translations';
import { 
  LANGUAGE_CHANGE_EVENT,
  resolveInitialLanguage, 
  persistLanguagePreference, 
  applyDocumentLanguage 
} from './lib/language';

export default function App() {
  const [session, setSession] = useState<AuthSession>(getCurrentSession());
  const [language, setLanguage] = useState<Language>(() => 
    resolveInitialLanguage(getCurrentSession().user?.preferredLanguage)
  );

  // Initialize activeNav and currentRole from URL hash or localStorage for refresh persistence
  const getInitialRoute = () => {
    if (typeof window !== 'undefined') {
      const hashNav = window.location.hash.replace(/^#\/?/, '').trim();
      const storedNav = window.localStorage?.getItem('gulistan_active_nav');
      const candidateNav = hashNav || storedNav || 'home';
      const storedRole = (window.localStorage?.getItem('gulistan_active_role') as Role) || 'public';
      return { candidateNav, storedRole };
    }
    return { candidateNav: 'home', storedRole: 'public' as Role };
  };

  const initialRoute = getInitialRoute();
  const [currentRole, setCurrentRole] = useState<Role>(() => {
    if (initialRoute.storedRole !== 'public' && canAccessRole(session, initialRoute.storedRole)) {
      return initialRoute.storedRole;
    }
    return 'public';
  });
  const [activeNav, setActiveNav] = useState<string>(() => initialRoute.candidateNav);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Application Data States: synthetic fixtures are strictly isolated to demo mode (CFG-05)
  const isDemo = getClientConfig().mode === 'demo';
  const [profiles, setProfiles] = useState<ProfileRecord[]>(() => isDemo ? INITIAL_PROFILES : []);
  const [recommendations, setRecommendations] = useState<MatchRecommendation[]>(() => isDemo ? INITIAL_RECOMMENDATIONS : []);
  const [followUps, setFollowUps] = useState<FollowUpItem[]>(() => isDemo ? INITIAL_FOLLOW_UPS : []);
  const [matchmakers, setMatchmakers] = useState<ExternalMatchmaker[]>(() => isDemo ? INITIAL_MATCHMAKERS : []);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(() => isDemo ? INITIAL_TRANSACTIONS : []);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => isDemo ? INITIAL_AUDIT_LOGS : []);

  // Validate public backend configuration boundary and initialize auth lifecycle at startup
  useEffect(() => {
    getClientConfig();
    initAuth().catch((err) => {
      console.error('[Gulistan] Failed to initialize authentication lifecycle:', err);
    });
  }, []);

  // Listen to authentication session changes and fail closed if session becomes invalid
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((newSession) => {
      setSession(newSession);
      if (newSession.isAuthenticated && newSession.role !== 'public') {
        if (currentRole === 'public' || !canAccessRole(newSession, currentRole)) {
          setCurrentRole(newSession.role);
          setActiveNav('dashboard');
        }
      } else if (currentRole !== 'public' && !canAccessRole(newSession, currentRole)) {
        setCurrentRole('public');
        setActiveNav('home');
      }
    });
    return unsubscribe;
  }, [currentRole]);

  // Synchronize document direction and font attributes with persistent language
  useEffect(() => {
    applyDocumentLanguage(language);
  }, [language]);

  // Synchronize language state reactively when updated by any component or window event
  useEffect(() => {
    const handleLanguageChanged = (e: Event) => {
      const customEvent = e as CustomEvent<Language>;
      if (customEvent.detail && (customEvent.detail === 'en' || customEvent.detail === 'ur')) {
        setLanguage(customEvent.detail);
      }
    };
    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChanged);
    return () => window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChanged);
  }, []);

  const handleNavigate = (sec: string) => {
    if (sec === 'login') {
      setIsAuthModalOpen(true);
      return;
    }
    setActiveNav(sec);
    if (typeof window !== 'undefined') {
      window.location.hash = sec;
      window.localStorage?.setItem('gulistan_active_nav', sec);
      window.localStorage?.setItem('gulistan_active_role', currentRole);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Gated role selection with fail-closed access control and permanent language preference retention
  const handleSelectRole = (role: Role) => {
    if (role !== 'public') {
      if (!canAccessRole(session, role)) {
        const t = translations[language];
        alert(t.unauthorizedAccess);
        setIsAuthModalOpen(true);
        return;
      }
    }
    setCurrentRole(role);
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem('gulistan_active_role', role);
    }
    // Retain and reinforce permanent language preference across all profile changes
    persistLanguagePreference(language);
    if (session && session.isAuthenticated && session.user) {
      updateUserPreferredLanguage(language);
    }
    const targetNav = role === 'public' ? 'home' : 'dashboard';
    handleNavigate(targetNav);
  };

  const handleSignOut = async () => {
    await signOut();
    setCurrentRole('public');
    handleNavigate('home');
  };

  const handleAuthSuccess = (role: Role) => {
    setCurrentRole(role);
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem('gulistan_active_role', role);
    }
    // Retain and reinforce permanent language preference for authenticated session
    persistLanguagePreference(language);
    updateUserPreferredLanguage(language);
    handleNavigate('dashboard');
  };

  const handleToggleLanguage = (newLang: Language) => {
    setLanguage(newLang);
    persistLanguagePreference(newLang);
    updateUserPreferredLanguage(newLang);
  };

  const handleSaveProfile = (newProfile: ProfileRecord) => {
    // Validate domain invariants before persisting
    const validation = validateProfileInput(newProfile);
    if (!validation.valid) {
      alert(language === 'ur' ? validation.errors[0].messageUrdu : validation.errors[0].messageEn);
      return;
    }

    const enrichedProfile = newProfile.property ? {
      ...newProfile,
      property: enrichPropertyDetails(newProfile.property),
    } : newProfile;

    setProfiles([enrichedProfile, ...profiles]);
    const newLog: AuditLogItem = {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      actor: currentRole === 'nadeem' ? 'nadeem@gulistan.pk' : 'web_registration@gulistan.pk',
      role: currentRole === 'nadeem' ? 'Nadeem (Lead Matchmaker)' : 'Self Registered Customer',
      action: 'NEW_PROFILE_SAVED',
      targetId: newProfile.id,
      details: `Registered profile for ${newProfile.fullName} (${newProfile.age} yrs, ${newProfile.occupation}) with ${newProfile.siblings.length} sibling records.`,
    };
    setAuditLogs([newLog, ...auditLogs]);

    if (currentRole === 'nadeem') {
      handleNavigate('profiles');
    } else {
      handleNavigate('dashboard');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    alert(
      language === 'ur'
        ? `پروفائل ${newProfile.id} کامیابی کے ساتھ محفوظ ہو گیا ہے!`
        : `Profile ${newProfile.id} successfully registered!`
    );
  };

  const handleUpdateFollowUpStatus = (id: string, status: 'pending' | 'completed') => {
    if (status === 'completed') {
      // Never manufacture staff identity in the client. A real authenticated
      // session is required before attempting a protected CRM operation.
      if (!canAccessRole(session, 'nadeem')) return;
      const res = completeFollowUp(id, session);
      if (res.success && res.followUp) {
        setFollowUps(followUps.map((f) => (f.id === id ? { ...f, status: 'completed' } : f)));
        return;
      }
    }
    setFollowUps(followUps.map((f) => (f.id === id ? { ...f, status } : f)));
  };

  const handleAddTransaction = (newTx: FinancialTransaction) => {
    // Never manufacture staff identity in the client. Protected finance
    // operations must wait for a real authenticated staff session.
    if (!canAccessRole(session, 'nadeem')) return;
    const res = recordTransaction(newTx, session);
    if (!res.success || !res.transaction) return;
    const recorded = res.transaction;
    setTransactions([recorded, ...transactions]);
    const newLog: AuditLogItem = {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      actor: 'nadeem@gulistan.pk',
      role: 'Nadeem (Lead Matchmaker)',
      action: 'FINANCIAL_TRANSACTION_RECORDED',
      targetId: recorded.id,
      details: `Recorded ${recorded.type} of ₨ ${recorded.amount.toLocaleString()} for ${recorded.matchmakerName}.`,
    };
    setAuditLogs([newLog, ...auditLogs]);
  };

  const handleUpdateProfileStatus = (id: string, newStatus: any) => {
    const target = profiles.find((p) => p.id === id);
    if (!target) return;

    // Enforce state machine transition rules and actor permissions
    const transitionCheck = canTransitionStatus(target.status, newStatus, currentRole);
    if (!transitionCheck.allowed) {
      alert(language === 'ur' ? transitionCheck.reasonUrdu : transitionCheck.reasonEn);
      return;
    }

    setProfiles(profiles.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
    const newLog: AuditLogItem = {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      actor: session.user?.email || (currentRole === 'admin' ? 'admin@gulistan.pk' : 'nadeem@gulistan.pk'),
      role: currentRole === 'admin' ? 'System Administrator' : 'Nadeem (Lead Matchmaker)',
      action: 'STATUS_UPDATED',
      targetId: id,
      details: `Profile status transitioned from ${target.status} to ${newStatus}.`,
    };
    setAuditLogs([newLog, ...auditLogs]);
  };

  return (
    <div className="min-h-screen flex flex-col text-[#252E2C] relative selection:bg-[#182848] selection:text-[#F7F3EA]">
      {/* High-Quality Scroll-based Background Video Animation */}
      <ScrollAnimationBackground />

      {/* Universal Top Navigation with Persona Switcher & Language Controls */}
      <Navbar
        currentRole={currentRole}
        onSelectRole={handleSelectRole}
        language={language}
        onToggleLanguage={handleToggleLanguage}
        activeNav={activeNav}
        onNavigate={handleNavigate}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        isAuthenticated={session.isAuthenticated}
        userEmail={session.user?.email}
        onSignOut={handleSignOut}
      />

      {/* Main Routed Content Area with top clearance for floating capsule navigation */}
      <main className="flex-1 relative z-10 pt-32 sm:pt-36">
        {/* PUBLIC EXPERIENCE */}
        {currentRole === 'public' && (
          <>
            {activeNav === 'home' && (
              <LandingPage
                language={language}
                onNavigate={(sec) => {
                  setActiveNav(sec);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onSelectRole={handleSelectRole}
              />
            )}
            {activeNav === 'approach' && (
              <OurApproach
                language={language}
                onNavigate={setActiveNav}
                onSelectRole={handleSelectRole}
              />
            )}
            {activeNav === 'how-it-works' && (
              <HowItWorksPage
                language={language}
                onNavigate={setActiveNav}
                onSelectRole={handleSelectRole}
              />
            )}
            {activeNav === 'privacy' && (
              <PrivacyPolicyPage
                language={language}
                onNavigate={setActiveNav}
                onSelectRole={handleSelectRole}
              />
            )}
            {activeNav === 'contact' && (
              <ContactPage
                language={language}
                onNavigate={setActiveNav}
                onSelectRole={handleSelectRole}
              />
            )}
            {activeNav === 'register' && (
              <ProfileWizard
                language={language}
                onSaveProfile={handleSaveProfile}
                onCancel={() => setActiveNav('home')}
              />
            )}
            {activeNav === 'login' && (
              <div className="max-w-md mx-auto my-16 p-8 porcelain-card rounded-3xl text-center space-y-4">
                <h3 className="font-serif text-2xl font-bold text-[#182848]">
                  {language === 'ur' ? 'محفوظ اکاؤنٹ لاگ ان' : 'Secure Account Sign In'}
                </h3>
                <p className="text-xs text-[#68716D]">
                  {language === 'ur'
                    ? 'بیورو کے محفوظ پورٹل تک رسائی کے لیے اپنے تصدیق شدہ اکاؤنٹ سے لاگ ان کریں۔'
                    : 'Sign in with your verified credentials to access your designated bureau workspace.'}
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="w-full py-3 px-4 rounded-xl bg-[#182848] text-white text-sm font-semibold hover:bg-[#283848] transition-colors shadow-md cursor-pointer"
                  >
                    {language === 'ur' ? 'لاگ ان ونڈو کھولیں' : 'Open Sign In Dialog'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* NADEEM'S MATCHMAKER WORKSPACE */}
        {currentRole === 'nadeem' && (
          <>
            {activeNav === 'create-profile' ? (
              <ProfileWizard
                language={language}
                onSaveProfile={handleSaveProfile}
                onCancel={() => setActiveNav('dashboard')}
              />
            ) : (
              <NadeemDashboard
                profiles={profiles}
                recommendations={recommendations}
                followUps={followUps}
                matchmakers={matchmakers}
                transactions={transactions}
                language={language}
                activeTab={
                  activeNav === 'profiles'
                    ? 'profiles'
                    : activeNav === 'search'
                    ? 'search'
                    : activeNav === 'followups'
                    ? 'followups'
                    : activeNav === 'finances'
                    ? 'finances'
                    : 'overview'
                }
                onTabChange={(tab) => {
                  handleNavigate(tab === 'overview' ? 'dashboard' : tab);
                }}
                onNavigateToWizard={() => {
                  handleNavigate('create-profile');
                }}
                onUpdateFollowUpStatus={handleUpdateFollowUpStatus}
                onAddTransaction={handleAddTransaction}
              />
            )}
          </>
        )}

        {/* CUSTOMER / PROFILER PORTAL */}
        {currentRole === 'customer' && (
          <>
            {activeNav === 'create-profile' ? (
              <ProfileWizard
                language={language}
                onSaveProfile={handleSaveProfile}
                onCancel={() => setActiveNav('dashboard')}
              />
            ) : (
              <CustomerPortal
                currentProfile={profiles[0]} // Dr. Fatima Tariq
                recommendations={recommendations}
                candidateProfiles={profiles}
                language={language}
                activeTab={
                  activeNav === 'preferences'
                    ? 'preferences'
                    : activeNav === 'privacy-center' || activeNav === 'privacy'
                    ? 'privacy'
                    : activeNav === 'my-profile'
                    ? 'my-profile'
                    : 'recommendations'
                }
                onTabChange={(tab) => {
                  if (tab === 'privacy') setActiveNav('privacy-center');
                  else if (tab === 'recommendations') setActiveNav('dashboard');
                  else setActiveNav(tab);
                }}
              />
            )}
          </>
        )}

        {/* SYSTEM ADMINISTRATOR PORTAL */}
        {currentRole === 'admin' && (
          <AdminPortal
            profiles={profiles}
            auditLogs={auditLogs}
            matchmakers={matchmakers}
            transactions={transactions}
            activeTab={
              activeNav === 'profiles-audit'
                ? 'profiles'
                : activeNav === 'audit-logs'
                ? 'audit'
                : activeNav === 'system-settings'
                ? 'settings'
                : activeNav === 'users'
                ? 'users'
                : 'dashboard'
            }
            onTabChange={(tab) => {
              if (tab === 'profiles') setActiveNav('profiles-audit');
              else if (tab === 'audit') setActiveNav('audit-logs');
              else if (tab === 'settings') setActiveNav('system-settings');
              else setActiveNav('dashboard');
            }}
            onUpdateProfileStatus={handleUpdateProfileStatus}
          />
        )}
      </main>

      {/* Brand Footer */}
      <Footer
        language={language}
        onNavigate={(sec) => {
          setActiveNav(sec);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSelectRole={handleSelectRole}
      />

      {/* Universal Floating Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        language={language}
        onSuccessRole={handleAuthSuccess}
      />
    </div>
  );
}
