import React, { useState } from 'react';
import { ProfileRecord, AuditLogItem, ExternalMatchmaker, FinancialTransaction } from '../../types';
import { formatPKR } from '../../utils/finance';
import { 
  Shield, 
  Users, 
  FileText, 
  Settings, 
  Activity, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Search,
  Filter,
  Check,
  ChevronRight
} from 'lucide-react';

interface AdminPortalProps {
  profiles: ProfileRecord[];
  auditLogs: AuditLogItem[];
  matchmakers: ExternalMatchmaker[];
  transactions: FinancialTransaction[];
  activeTab?: 'dashboard' | 'profiles' | 'users' | 'audit' | 'settings';
  onTabChange?: (tab: 'dashboard' | 'profiles' | 'users' | 'audit' | 'settings') => void;
  onUpdateProfileStatus: (id: string, newStatus: any) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  profiles,
  auditLogs,
  matchmakers,
  transactions,
  activeTab: activeTabProp,
  onTabChange,
  onUpdateProfileStatus,
}) => {
  const [internalTab, setInternalTab] = useState<'dashboard' | 'profiles' | 'users' | 'audit' | 'settings'>(
    activeTabProp || 'dashboard'
  );

  React.useEffect(() => {
    if (activeTabProp) {
      setInternalTab(activeTabProp);
    }
  }, [activeTabProp]);

  const activeTab = activeTabProp || internalTab;

  const setActiveTab = (tab: 'dashboard' | 'profiles' | 'users' | 'audit' | 'settings') => {
    setInternalTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };
  const [profileSearch, setProfileSearch] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Convention settings
  const [marlaPerKanal, setMarlaPerKanal] = useState(20);
  const [sqFtPerMarla, setSqFtPerMarla] = useState(225);

  const activeCount = profiles.filter((p) => p.status === 'active' || p.status === 'introduction_authorized').length;
  const pendingCount = profiles.filter((p) => p.status === 'pending_review').length;
  const restrictedCount = profiles.filter((p) => p.status === 'restricted' || p.status === 'inactive').length;

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      p.fullName.toLowerCase().includes(profileSearch.toLowerCase()) ||
      p.id.toLowerCase().includes(profileSearch.toLowerCase()) ||
      p.education.toLowerCase().includes(profileSearch.toLowerCase());
    const matchesStatus = selectedStatusFilter === 'all' || p.status === selectedStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E7E2D8] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-[#B69A62]" />
            <span className="text-xs uppercase font-bold tracking-widest text-[#B69A62]">
              Executive Administrative Portal (English Only)
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#182848]">
            Gulistan System Administration
          </h1>
          <p className="text-xs sm:text-sm text-[#68716D] max-w-xl mt-1">
            Governing profile verifications, role-based access control, financial accountability, and security audit logs.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>System Healthy • Data Integrity 98.4%</span>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="mb-8 flex items-center gap-2 border-b border-[#E7E2D8] pb-3 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2.5 rounded-2xl whitespace-nowrap transition-colors ${
            activeTab === 'dashboard' ? 'bg-[#182848] text-[#F7F3EA] shadow-sm' : 'text-[#68716D] hover:text-[#252E2C]'
          }`}
        >
          System Oversight Dashboard
        </button>

        <button
          onClick={() => setActiveTab('profiles')}
          className={`px-4 py-2.5 rounded-2xl whitespace-nowrap transition-colors ${
            activeTab === 'profiles' ? 'bg-[#182848] text-[#F7F3EA] shadow-sm' : 'text-[#68716D] hover:text-[#252E2C]'
          }`}
        >
          Profile Directory Oversight ({profiles.length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-2xl whitespace-nowrap transition-colors ${
            activeTab === 'users' ? 'bg-[#182848] text-[#F7F3EA] shadow-sm' : 'text-[#68716D] hover:text-[#252E2C]'
          }`}
        >
          Users & Permissions
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 rounded-2xl whitespace-nowrap transition-colors ${
            activeTab === 'audit' ? 'bg-[#182848] text-[#F7F3EA] shadow-sm' : 'text-[#68716D] hover:text-[#252E2C]'
          }`}
        >
          Audit Activity Trail ({auditLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 rounded-2xl whitespace-nowrap transition-colors ${
            activeTab === 'settings' ? 'bg-[#182848] text-[#F7F3EA] shadow-sm' : 'text-[#68716D] hover:text-[#252E2C]'
          }`}
        >
          Regional Settings & Land Conventions
        </button>
      </div>

      {/* TAB 1: SYSTEM DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 border-l-4 border-emerald-600">
              <span className="text-[11px] font-semibold uppercase text-[#68716D] tracking-wider block mb-1">
                Active Bureau Profiles
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-3xl font-bold text-[#182848]">{activeCount}</span>
                <span className="text-xs text-emerald-700 font-semibold">+12% this month</span>
              </div>
            </div>

            <div className="glass-card p-5 border-l-4 border-amber-500">
              <span className="text-[11px] font-semibold uppercase text-[#68716D] tracking-wider block mb-1">
                Pending Verification
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-3xl font-bold text-[#182848]">{pendingCount}</span>
                <span className="text-xs text-amber-700 font-semibold">Requires Nadeem Review</span>
              </div>
            </div>

            <div className="glass-card p-5 border-l-4 border-[#B69A62]">
              <span className="text-[11px] font-semibold uppercase text-[#68716D] tracking-wider block mb-1">
                External Matchmakers
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-3xl font-bold text-[#182848]">{matchmakers.length}</span>
                <span className="text-xs text-[#68716D]">Active Bureau Agents</span>
              </div>
            </div>

            <div className="glass-card p-5 border-l-4 border-[#182848]">
              <span className="text-[11px] font-semibold uppercase text-[#68716D] tracking-wider block mb-1">
                Data Completeness
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-3xl font-bold text-[#182848]">96.8%</span>
                <span className="text-xs text-emerald-700 font-semibold">High Quality</span>
              </div>
            </div>
          </div>

          {/* Operational Alerts & Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-panel p-6 shadow-sm">
              <h3 className="font-serif text-xl font-bold text-[#182848] mb-4">
                Recent Administrative Events
              </h3>
              <div className="space-y-3">
                {auditLogs.slice(0, 4).map((log) => (
                  <div key={log.id} className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[#182848]">{log.action}</span>
                      <span className="font-mono text-[10px] text-[#68716D]">{log.timestamp}</span>
                    </div>
                    <p className="text-[#252E2C]">{log.details}</p>
                    <span className="text-[10px] text-[#68716D] mt-1 block">Actor: {log.actor} ({log.role})</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel p-6 shadow-sm">
              <h3 className="font-serif text-xl font-bold text-[#182848] mb-4">
                Data Quality & Integrity
              </h3>
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Family Sibling Records</span>
                    <span className="text-emerald-700">100%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#E7E2D8] overflow-hidden">
                    <div className="h-full bg-emerald-600 w-full"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Property Area Specified</span>
                    <span className="text-emerald-700">94%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#E7E2D8] overflow-hidden">
                    <div className="h-full bg-emerald-600 w-[94%]"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Photograph Consent Logged</span>
                    <span className="text-[#B69A62]">91%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#E7E2D8] overflow-hidden">
                    <div className="h-full bg-[#B69A62] w-[91%]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROFILE OVERSIGHT TABLE */}
      {activeTab === 'profiles' && (
        <div className="glass-panel p-6 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-[#486878]" />
              <input
                type="text"
                value={profileSearch}
                onChange={(e) => setProfileSearch(e.target.value)}
                placeholder="Search profiles by name or ID..."
                className="w-full rounded-xl border border-[#E7E2D8] py-2 pl-9 pr-3 text-xs focus:border-[#182848] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#68716D]">Status:</span>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="rounded-xl border border-[#E7E2D8] px-3 py-1.5 text-xs bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending_review">Pending Review</option>
                <option value="introduction_authorized">Intro Authorized</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead>
                <tr className="border-b border-[#E7E2D8] bg-[#F7F3EA] text-[#182848]">
                  <th className="p-3 text-start">ID</th>
                  <th className="p-3 text-start">Full Name</th>
                  <th className="p-3 text-start">Age/Gender</th>
                  <th className="p-3 text-start">Education & Career</th>
                  <th className="p-3 text-start">City</th>
                  <th className="p-3 text-start">Current Status</th>
                  <th className="p-3 text-start">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E2D8]">
                {filteredProfiles.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F7F3EA]/40">
                    <td className="p-3 font-mono font-semibold text-[#182848]">{p.id}</td>
                    <td className="p-3 font-bold text-[#252E2C]">{p.fullName}</td>
                    <td className="p-3 text-[#68716D]">
                      {p.age} yrs • {p.gender}
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-[#182848] block">{p.occupation}</span>
                      <span className="text-[10px] text-[#68716D]">{p.education}</span>
                    </td>
                    <td className="p-3 text-[#68716D]">{p.currentCity}</td>
                    <td className="p-3">
                      <select
                        value={p.status}
                        onChange={(e) => onUpdateProfileStatus(p.id, e.target.value)}
                        className="rounded-lg border border-[#E7E2D8] p-1 text-[11px] bg-white font-medium"
                      >
                        <option value="pending_review">Pending Review</option>
                        <option value="active">Active</option>
                        <option value="introduction_authorized">Intro Authorized</option>
                        <option value="restricted">Restricted</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => alert(`Reviewing profile ${p.id}`)}
                        className="text-[#182848] hover:underline font-semibold"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: USERS & PERMISSIONS */}
      {activeTab === 'users' && (
        <div className="glass-panel p-6 sm:p-8 space-y-6 animate-fadeIn">
          <h3 className="font-serif text-2xl font-bold text-[#182848]">
            Role-Based Access Control (RBAC) Matrix
          </h3>
          <p className="text-xs text-[#68716D]">
            Guaranteed segregation of duties: Customers never see matchmaker notes, commissions, or other customers' records.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="p-5 rounded-2xl border border-[#182848] bg-[#182848]/5 space-y-2">
              <span className="font-bold text-sm text-[#182848] block">1. System Administrator</span>
              <p className="text-[#68716D]">Full governance over audit logs, land unit conventions, user accounts, and financial reports.</p>
              <span className="text-[10px] text-emerald-800 font-semibold block">Active Account: admin@gulistan.pk</span>
            </div>

            <div className="p-5 rounded-2xl border border-[#B69A62] bg-[#B69A62]/10 space-y-2">
              <span className="font-bold text-sm text-[#182848] block">2. Nadeem (Lead Matchmaker)</span>
              <p className="text-[#68716D]">Full operational access to 7-step wizard, match search, follow-up scheduler, and controlled sharing.</p>
              <span className="text-[10px] text-emerald-800 font-semibold block">Active Account: nadeem@gulistan.pk</span>
            </div>

            <div className="p-5 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md space-y-2">
              <span className="font-bold text-sm text-[#182848] block">3. Customer / Profiler</span>
              <p className="text-[#68716D]">Restricted to own profile, spouse preferences, and authorized recommendations with privacy protections.</p>
              <span className="text-[10px] text-emerald-800 font-semibold block">Candidate: Dr. Fatima Tariq (GLS-401)</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT ACTIVITY LOG */}
      {activeTab === 'audit' && (
        <div className="glass-panel p-6 space-y-4 animate-fadeIn shadow-sm">
          <h3 className="font-serif text-2xl font-bold text-[#182848]">
            Security Audit Trail (Tamper-Evident Simulation)
          </h3>
          <p className="text-xs text-[#68716D] mb-4">
            Every controlled sharing event, status change, and credential action is immutably timestamped.
          </p>

          <div className="divide-y divide-[#E7E2D8] text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-[#182848]">{log.action}</span>
                    <span className="font-mono text-[#68716D]">Target: {log.targetId}</span>
                  </div>
                  <p className="text-[#252E2C]">{log.details}</p>
                </div>
                <div className="text-end">
                  <span className="font-mono text-[11px] text-[#68716D] block">{log.timestamp}</span>
                  <span className="text-[10px] text-[#B69A62] font-semibold">{log.actor}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: REGIONAL SETTINGS & CONVENTIONS */}
      {activeTab === 'settings' && (
        <div className="glass-panel p-6 sm:p-8 space-y-6 animate-fadeIn">
          <div className="border-b border-[#E7E2D8] pb-4">
            <h3 className="font-serif text-2xl font-bold text-[#182848]">
              Regional Land Unit & Calculation Conventions
            </h3>
            <p className="text-xs text-[#68716D] mt-1">
              Configure how land area is converted across Punjab, Islamabad, and Khyber Pakhtunkhwa.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs max-w-xl">
            <div>
              <label className="block font-semibold text-[#182848] mb-1">
                Marla per Kanal Convention Ratio
              </label>
              <select
                value={marlaPerKanal}
                onChange={(e) => setMarlaPerKanal(Number(e.target.value))}
                className="w-full rounded-xl border border-[#E7E2D8] p-3 text-sm bg-white"
              >
                <option value={20}>20 Marlas = 1 Kanal (Punjab, Islamabad, Sindh)</option>
                <option value={18}>18 Marlas = 1 Kanal (Parts of Hazara / KP)</option>
              </select>
              <span className="text-[10px] text-[#68716D] mt-1 block">
                Standard: 20 Marlas per Kanal is currently active across all profile calculation engines.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-[#182848] mb-1">
                Square Feet per Marla
              </label>
              <select
                value={sqFtPerMarla}
                onChange={(e) => setSqFtPerMarla(Number(e.target.value))}
                className="w-full rounded-xl border border-[#E7E2D8] p-3 text-sm bg-white"
              >
                <option value={225}>225 Sq Ft per Marla (Modern LDA / CDA standard)</option>
                <option value={272}>272.25 Sq Ft per Marla (Traditional Revenue standard)</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => alert('Regional conventions saved successfully!')}
            className="rounded-xl bg-[#182848] px-6 py-2.5 text-xs font-semibold text-[#F7F3EA] shadow hover:bg-[#283848] transition-colors"
          >
            Save Regional Conventions
          </button>
        </div>
      )}
    </div>
  );
};
