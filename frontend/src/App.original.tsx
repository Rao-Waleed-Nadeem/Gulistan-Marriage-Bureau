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

export default function App() {
  const [currentRole, setCurrentRole] = useState<Role>('public');
  const [language, setLanguage] = useState<Language>('ur');
  const [activeNav, setActiveNav] = useState<string>('home');

  // Application Data States
  const [profiles, setProfiles] = useState<ProfileRecord[]>(INITIAL_PROFILES);
  const [recommendations, setRecommendations] = useState<MatchRecommendation[]>(INITIAL_RECOMMENDATIONS);
  const [followUps, setFollowUps] = useState<FollowUpItem[]>(INITIAL_FOLLOW_UPS);
  const [matchmakers, setMatchmakers] = useState<ExternalMatchmaker[]>(INITIAL_MATCHMAKERS);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(INITIAL_TRANSACTIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);

  // Synchronize document direction and font attributes with language
  useEffect(() => {
    document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // When switching to Admin, force English per prompt requirement 5.1 ("The admin experience is English-only")
  const handleSelectRole = (role: Role) => {
    setCurrentRole(role);
    if (role === 'admin') {
      setLanguage('en');
    } else if (role === 'nadeem') {
      // Default to Urdu per requirement 5.2
      setLanguage('ur');
    }
    setActiveNav(role === 'public' ? 'home' : 'dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleLanguage = (newLang: Language) => {
    // If admin, enforce English
    if (currentRole === 'admin') {
      alert('The Administrative System Oversight Portal operates in English.');
      return;
    }
    setLanguage(newLang);
  };

  const handleSaveProfile = (newProfile: ProfileRecord) => {
    setProfiles([newProfile, ...profiles]);
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
      setActiveNav('profiles');
    } else {
      setActiveNav('dashboard');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    alert(
      language === 'ur'
        ? `پروفائل ${newProfile.id} کامیابی کے ساتھ محفوظ ہو گیا ہے!`
        : `Profile ${newProfile.id} successfully registered!`
    );
  };

  const handleUpdateFollowUpStatus = (id: string, status: 'pending' | 'completed') => {
    setFollowUps(followUps.map((f) => (f.id === id ? { ...f, status } : f)));
  };

  const handleAddTransaction = (newTx: FinancialTransaction) => {
    setTransactions([newTx, ...transactions]);
    const newLog: AuditLogItem = {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      actor: 'nadeem@gulistan.pk',
      role: 'Nadeem (Lead Matchmaker)',
      action: 'FINANCIAL_TRANSACTION_RECORDED',
      targetId: newTx.id,
      details: `Recorded ${newTx.type} of ₨ ${newTx.amount.toLocaleString()} for ${newTx.matchmakerName}.`,
    };
    setAuditLogs([newLog, ...auditLogs]);
  };

  const handleUpdateProfileStatus = (id: string, newStatus: any) => {
    setProfiles(profiles.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
    const newLog: AuditLogItem = {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      actor: 'admin@gulistan.pk',
      role: 'System Administrator',
      action: 'STATUS_UPDATED',
      targetId: id,
      details: `Profile status updated to ${newStatus}.`,
    };
    setAuditLogs([newLog, ...auditLogs]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F3EA] text-[#252E2C]">
      {/* Universal Top Navigation with Persona Switcher & Language Controls */}
      <Navbar
        currentRole={currentRole}
        onSelectRole={handleSelectRole}
        language={language}
        onToggleLanguage={handleToggleLanguage}
        activeNav={activeNav}
        onNavigate={(sec) => {
          setActiveNav(sec);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Main Routed Content Area */}
      <main className="flex-1">
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
                <h3 className="font-serif text-2xl font-bold text-[#164E4A]">Gulistan Sign In</h3>
                <p className="text-xs text-[#68716D]">
                  Select your intended stakeholder experience to explore the platform:
                </p>
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => handleSelectRole('nadeem')}
                    className="w-full py-3 px-4 rounded-xl bg-[#164E4A] text-white text-xs font-semibold"
                  >
                    Enter as Nadeem (Lead Matchmaker)
                  </button>
                  <button
                    onClick={() => handleSelectRole('customer')}
                    className="w-full py-3 px-4 rounded-xl border border-[#164E4A] text-[#164E4A] text-xs font-semibold"
                  >
                    Enter as Candidate / Customer
                  </button>
                  <button
                    onClick={() => handleSelectRole('admin')}
                    className="w-full py-3 px-4 rounded-xl border border-[#E7E2D8] text-[#252E2C] text-xs font-semibold"
                  >
                    Enter as System Administrator
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
                onNavigateToWizard={() => {
                  setActiveNav('create-profile');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onUpdateFollowUpStatus={handleUpdateFollowUpStatus}
                onAddTransaction={handleAddTransaction}
              />
            )}
          </>
        )}

        {/* CUSTOMER / PROFILER PORTAL */}
        {currentRole === 'customer' && (
          <CustomerPortal
            currentProfile={profiles[0]} // Dr. Fatima Tariq
            recommendations={recommendations}
            candidateProfiles={profiles}
            language={language}
          />
        )}

        {/* SYSTEM ADMINISTRATOR PORTAL */}
        {currentRole === 'admin' && (
          <AdminPortal
            profiles={profiles}
            auditLogs={auditLogs}
            matchmakers={matchmakers}
            transactions={transactions}
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
    </div>
  );
}
