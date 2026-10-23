import React from 'react';
import { Language, Role } from '../../types';
import { translations } from '../../i18n/translations';
import { ArchFrame } from '../../components/ui/ArchFrame';

interface PublicPageProps {
  language: Language;
  onNavigate: (section: string) => void;
  onSelectRole: (role: Role) => void;
}

export const OurApproach: React.FC<PublicPageProps> = ({ language, onNavigate }) => {
  const t = translations[language];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs uppercase font-bold tracking-widest text-[#B69A62]">
          {language === 'ur' ? 'ہمارا طریقۂ کار' : 'Our Approach & Values'}
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#182848] drop-shadow-[0_1px_1px_rgba(247,243,234,0.9)]">
          {language === 'ur' ? 'وقار اور اعتماد کے ساتھ رشتہ داری' : 'A Higher Standard in Matchmaking'}
        </h1>
        <p className="text-sm sm:text-base text-[#252E2C] font-medium leading-relaxed">
          {language === 'ur'
            ? 'گلستان میرج بیورو جدید تقاضوں اور خاندانی روایات کا حسین امتزاج ہے۔'
            : 'We replace casual digital swiping with human-guided matchmaking, background diligence, and complete familial dignity.'}
        </p>
      </div>

      <ArchFrame>
        <div className="p-4 sm:p-8 max-w-3xl text-center space-y-4">
          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#F7F3EA]">
            Human Discernment Over Automated Algorithms
          </h3>
          <p className="text-xs sm:text-sm text-[#88A8A8]/90 leading-relaxed">
            Marriage is a covenant between two souls and two families. Algorithms cannot measure temperament, humility, family warmth, or cultural harmony. Our matchmakers provide that essential human touch.
          </p>
        </div>
      </ArchFrame>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <div className="glass-card glass-card-interactive p-8 space-y-3">
          <h3 className="font-serif text-2xl font-bold text-[#182848]">Family Discretion</h3>
          <p className="text-sm sm:text-base text-[#252E2C] leading-relaxed font-normal">
            Your daughter's or son's profile will never sit on an open public forum. Proposals are presented confidentially to vetted families only.
          </p>
        </div>

        <div className="glass-card glass-card-interactive p-8 space-y-3">
          <h3 className="font-serif text-2xl font-bold text-[#182848]">Verified Backgrounds</h3>
          <p className="text-sm sm:text-base text-[#252E2C] leading-relaxed font-normal">
            We confirm educational degrees, professional standing, and ancestral roots before recommending a candidate.
          </p>
        </div>
      </div>

      <div className="text-center pt-6">
        <button
          onClick={() => onNavigate('register')}
          className="rounded-full bg-[#182848] px-8 py-3.5 sm:py-4 text-sm font-semibold text-[#F7F3EA] shadow-xl hover:bg-[#283848] border border-[#B69A62]/35 transition-all cursor-pointer"
        >
          {t.heroCtaPrimary}
        </button>
      </div>
    </div>
  );
};

export const HowItWorksPage: React.FC<PublicPageProps> = ({ language, onNavigate }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs uppercase font-bold tracking-widest text-[#B69A62]">
          {language === 'ur' ? 'طریقۂ کار' : 'The Four Milestones'}
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#182848] drop-shadow-[0_1px_1px_rgba(247,243,234,0.9)]">
          {language === 'ur' ? 'یہ نظام کیسے کام کرتا ہے؟' : 'How the Introduction Journey Unfolds'}
        </h1>
        <p className="text-sm text-[#252E2C] font-medium leading-relaxed">
          From confidential registration to guided introductions between elders.
        </p>
      </div>

      <div className="space-y-4">
        {[
          {
            num: '01',
            title: 'Structured Profile Registration',
            desc: 'Families submit complete biographical data including educational history, career milestones, sibling records, and property details via our secure guided workflow.',
          },
          {
            num: '02',
            title: 'Personalized Preference Calibration',
            desc: 'Define your mandatory criteria (such as religious observance, sect, education) and flexible preferred criteria (height, caste, location).',
          },
          {
            num: '03',
            title: 'Matchmaker Review & Vetting',
            desc: 'Nadeem Ahmed analyzes candidate compatibility, verifies factual integrity, and produces a tailored compatibility rationale.',
          },
          {
            num: '04',
            title: 'Controlled Sharing & Facilitated Tea',
            desc: 'Proposals are shared on WhatsApp with granular field disclosure. If both families express interest, Nadeem arranges a formal meeting in a comfortable setting.',
          },
        ].map((item, idx) => (
          <div key={idx} className="glass-card glass-card-interactive p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-6">
            <span className="font-serif text-4xl font-bold text-[#B69A62] shrink-0">{item.num}</span>
            <div className="space-y-1.5">
              <h3 className="font-serif text-2xl font-bold text-[#182848]">{item.title}</h3>
              <p className="text-sm sm:text-base text-[#252E2C] leading-relaxed font-normal">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center pt-6">
        <button
          onClick={() => onNavigate('register')}
          className="rounded-full bg-[#182848] px-8 py-3.5 sm:py-4 text-sm font-semibold text-[#F7F3EA] shadow-xl hover:bg-[#283848] border border-[#B69A62]/35 transition-all cursor-pointer"
        >
          Begin Registration
        </button>
      </div>
    </div>
  );
};

export const PrivacyPolicyPage: React.FC<PublicPageProps> = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="glass-panel p-8 sm:p-12 space-y-8 border border-white/60 shadow-xl">
        <div className="border-b border-[#E7E2D8] pb-6">
          <span className="text-xs uppercase font-bold tracking-widest text-[#B69A62]">Confidentiality Policy</span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#182848] mt-1">
            Privacy, Dignity & Data Protection Principles
          </h1>
          <p className="text-sm text-[#68716D] mt-1 font-medium">Effective Date: October 2026 • Gulistan Marriage Bureau</p>
        </div>

        <div className="prose prose-sm max-w-none text-sm sm:text-base text-[#252E2C] space-y-6 leading-relaxed">
          <section className="space-y-2">
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#182848]">1. The Principle of Family Sanctity</h3>
            <p>
              Gulistan Marriage Bureau treats every client portfolio with the highest standard of familial honor. We do not operate an open, searchable public dating directory. Information is shared only with vetted prospects through matchmaker intermediation.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#182848]">2. Controlled Disclosures (WhatsApp Proposals)</h3>
            <p>
              Whenever a proposal is dispatched to a prospective candidate, the candidate or matchmaker explicitly chooses which fields are visible. Salary, residential address, and phone numbers may be withheld until initial parental assent is received.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#182848]">3. Right to Correction, Deactivation & Deletion</h3>
            <p>
              Any registered candidate or family representative may request data corrections, portfolio deactivation, or permanent deletion by submitting a request through their dedicated Customer Portal.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export const ContactPage: React.FC<PublicPageProps> = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs uppercase font-bold tracking-widest text-[#B69A62]">Private Consultation</span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#182848] drop-shadow-[0_1px_1px_rgba(247,243,234,0.9)]">
          Contact Gulistan Bureau
        </h1>
        <p className="text-sm sm:text-base text-[#252E2C] font-medium leading-relaxed">
          Consultations in Lahore and Islamabad are scheduled strictly by appointment to guarantee absolute privacy for every family.
        </p>
      </div>

      <div className="glass-panel p-8 sm:p-10 space-y-5 max-w-xl mx-auto shadow-xl border border-white/60">
        <div>
          <label className="block text-sm font-semibold text-[#182848] mb-1.5">Your Full Name</label>
          <input type="text" placeholder="e.g. Tariq Mehmood" className="glass-input w-full p-3 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#182848] mb-1.5">Contact Phone / WhatsApp</label>
          <input type="text" placeholder="+92 300 0000000" className="glass-input w-full p-3 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#182848] mb-1.5">Preferred City of Meeting</label>
          <select className="glass-input w-full p-3 text-sm">
            <option>Lahore Office (Gulberg / DHA)</option>
            <option>Islamabad Office (F-7)</option>
            <option>Confidential Video Consultation</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#182848] mb-1.5">Inquiry Details</label>
          <textarea rows={3} placeholder="Tell us about the candidate profile..." className="glass-input w-full p-3 text-sm" />
        </div>

        <button
          onClick={() => alert('Consultation request received! Our senior matchmaker will connect with you via telephone.')}
          className="w-full rounded-full bg-[#182848] py-3.5 sm:py-4 text-sm font-semibold text-[#F7F3EA] shadow-xl hover:bg-[#283848] border border-[#B69A62]/35 transition-all cursor-pointer"
        >
          Request Confidential Appointment
        </button>
      </div>
    </div>
  );
};
