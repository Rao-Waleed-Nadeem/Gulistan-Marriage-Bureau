import React from 'react';
import { Language, Role } from '../../types';
import { translations } from '../../i18n/translations';
import { ArchFrame } from '../../components/ui/ArchFrame';
import { 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  ArrowRight, 
  Users, 
  ChevronRight
} from 'lucide-react';

interface LandingPageProps {
  language: Language;
  onNavigate: (section: string) => void;
  onSelectRole: (role: Role) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  language,
  onNavigate,
  onSelectRole,
}) => {
  const t = translations[language];

  return (
    <div className="space-y-20 sm:space-y-28 pb-20">
      {/* SECTION 1: LUXURY HERO WITH ARCHITECTURAL PASSAGE REFERENCE */}
      <section className="relative pt-6 sm:pt-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center mb-10 sm:mb-16">
          {/* Subtle Accent Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#B69A62]/45 bg-[#182848]/10 px-4 py-1.5 text-xs uppercase tracking-widest text-[#182848] mb-6 shadow-xs backdrop-blur-sm animate-in fade-in duration-500">
            <Sparkles className="w-3.5 h-3.5 text-[#B69A62]" />
            <span>{language === 'ur' ? 'معیاری اور نجی رشتہ داری خدمات' : 'Bespoke Private Matchmaking'}</span>
          </div>

          {/* Hero Headline — Clear, Elegant Serif with Soft Readability Shadow */}
          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#182848] leading-[1.18] mb-6 drop-shadow-[0_1px_2px_rgba(247,243,234,0.95)] animate-in fade-in slide-in-from-bottom-2 duration-700">
            {t.heroTitle}
          </h1>

          {/* Supporting Headline Copy */}
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-[#252E2C] font-medium leading-relaxed mb-8 drop-shadow-[0_1px_1px_rgba(247,243,234,0.9)] animate-in fade-in slide-in-from-bottom-3 duration-700 delay-150">
            {t.heroSubtitle}
          </p>

          {/* Primary & Secondary Glass Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <button
              onClick={() => onNavigate('register')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#182848] px-8 py-3.5 sm:py-4 text-sm font-semibold text-[#F7F3EA] shadow-xl hover:bg-[#283848] transition-all transform active:scale-95 border border-[#B69A62]/35 cursor-pointer"
            >
              <span>{t.heroCtaPrimary}</span>
              <ArrowRight className="w-4 h-4 text-[#B69A62]" />
            </button>

            <button
              onClick={() => onNavigate('how-it-works')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-[#B69A62]/40 bg-white/10 hover:bg-white/20 backdrop-blur-md px-8 py-3.5 sm:py-4 text-sm font-semibold text-[#182848] shadow-xs transition-all cursor-pointer"
            >
              <span>{t.heroCtaSecondary}</span>
            </button>
          </div>
        </div>

        {/* Visual Showcase: Architectural Arch Frame & Presentation Sanctuary */}
        <ArchFrame showVideoPlaceholder={true} badgeText="Architectural Sanctuary • Inspired by the Reference">
          <div className="max-w-xl text-center py-6">
            <h3 className="font-serif text-2xl sm:text-3xl font-medium text-[#F7F3EA] mb-3">
              Where Dignity Meets Human Discernment
            </h3>
            <p className="text-xs sm:text-sm text-[#88A8A8]/85 leading-relaxed">
              Every profile is carefully vetted through personal consultation. No swiping, no algorithmic noise, and absolute confidentiality for your family.
            </p>
          </div>
        </ArchFrame>
      </section>

      {/* SECTION 2: OUR CORE PILLARS & APPROACH (Glass Cards) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs uppercase font-bold tracking-widest text-[#B69A62]">
            {language === 'ur' ? 'ہماری امتیازی اقدار' : 'The Gulistan Philosophy'}
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#182848] mt-2 mb-4 drop-shadow-[0_1px_1px_rgba(247,243,234,0.9)]">
            {language === 'ur' ? 'روایت، وقار اور جدید احتیاط' : 'Tradition, Dignity, and Modern Discretion'}
          </h2>
          <p className="text-sm sm:text-base text-[#252E2C] font-medium leading-relaxed">
            {language === 'ur'
              ? 'ہم رشتے کے مقدس سفر کو ایک بااعتماد نجی خدمت کے طور پر سرانجام دیتے ہیں۔'
              : 'Matchmaking is not a transaction; it is a sacred life milestone guided by discretion, deep family respect, and verified background integrity.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card glass-card-interactive p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#182848] text-[#B69A62] mb-6 shadow-sm">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#182848] mb-3">
              {language === 'ur' ? 'مکمل رازداری و حفاظت' : 'Uncompromising Privacy'}
            </h3>
            <p className="text-xs sm:text-sm text-[#252E2C]/80 leading-relaxed font-normal">
              {language === 'ur'
                ? 'امید واروں کی تصاویر اور خاندانی نمبرز عام نہیں کیے جاتے۔ معلومات صرف باہمی رضامندی اور میچ میکر کی تصدیق کے بعد شیئر ہوتی ہیں۔'
                : 'Photographs, current compensation, and direct family contact numbers are strictly guarded and disclosed exclusively with your explicit authorization.'}
            </p>
          </div>

          <div className="glass-card glass-card-interactive p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#182848] text-[#B69A62] mb-6 shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#182848] mb-3">
              {language === 'ur' ? 'انفرادی توجہ و رہنمائی' : 'Personal Matchmaker Care'}
            </h3>
            <p className="text-xs sm:text-sm text-[#252E2C]/80 leading-relaxed font-normal">
              {language === 'ur'
                ? 'ندیم صاحب اور ان کی ٹیم ہر خاندان سے تفصیلی رابطہ کر کے تعلیمی، خاندانی اور اخلاقی معیارات کا ذاتی طور پر جائزہ لیتے ہیں۔'
                : 'Nadeem Ahmed and our experienced consultants personally review every profile, understanding nuance, family temperament, and spiritual harmony.'}
            </p>
          </div>

          <div className="glass-card glass-card-interactive p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#182848] text-[#B69A62] mb-6 shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#182848] mb-3">
              {language === 'ur' ? 'مصدقہ خاندانی کوائف' : 'Verified Family Credentials'}
            </h3>
            <p className="text-xs sm:text-sm text-[#252E2C]/80 leading-relaxed font-normal">
              {language === 'ur'
                ? 'تعلیمی اسناد، پیشے کی سچائی، رہائشی اسٹیٹس اور خاندانی وقار کی آزادانہ تصدیق بیورو کے ضوابط کا لازمی حصہ ہے۔'
                : 'Educational pedigrees, professional affiliations, and family backgrounds are thoroughly verified prior to arranging formal introductions.'}
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 3: HOW IT WORKS — FLOATING TRANSLUCENT ARCHITECTURAL SANCTUARY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-dark-card p-8 sm:p-14 border border-[#B69A62]/35 shadow-2xl relative overflow-hidden">
          {/* Subtle Ambient Decorative Glow */}
          <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-[#182848]/40 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-xs uppercase font-bold tracking-widest text-[#B69A62]">
                {language === 'ur' ? 'سہل اور باوقار عمل' : 'A Seamless Four-Step Journey'}
              </span>
              <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#F7F3EA] mt-2 mb-4">
                {language === 'ur' ? 'رشتے کے آغاز کا طریقۂ کار' : 'How Gulistan Facilitates Introductions'}
              </h2>
              <p className="text-sm sm:text-base text-[#88A8A8]/85 leading-relaxed">
                Designed to eliminate awkwardness, respect family honor, and ensure meaningful mutual alignment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                {
                  step: '01',
                  titleEn: 'Register Profile',
                  titleUr: 'پروفائل کا اندراج',
                  descEn: 'Share confidential details through our structured 7-step guided workflow.',
                  descUr: 'ہمارے آسان ۷ مراحل کے ذریعے اپنے خاندانی اور تعلیمی کوائف درج فرمائیں۔',
                },
                {
                  step: '02',
                  titleEn: 'Define Preferences',
                  titleUr: 'ترجیحات کا تعین',
                  descEn: 'Set mandatory, preferred, and acceptable spouse criteria with complete clarity.',
                  descUr: 'اپنے مطلوبہ شریکِ حیات کے لیے لازمی اور ترجیحی معیارات طے کریں۔',
                },
                {
                  step: '03',
                  titleEn: 'Review Proposals',
                  titleUr: 'تجاویز کا جائزہ',
                  descEn: 'Receive hand-selected proposals pre-screened by Nadeem Ahmed.',
                  descUr: 'ندیم صاحب کی جانب سے ذاتی طور پر منتخب کردہ موزوں تجاویز کا معائنہ فرمائیں۔',
                },
                {
                  step: '04',
                  titleEn: 'Thoughtful Introduction',
                  titleUr: 'باہمی تعارف و ملاقات',
                  descEn: 'Proceed to formal tea or meeting with mutual parental consent and blessing.',
                  descUr: 'باہمی رضامندی کے بعد دونوں خاندانوں کے باوقار تعارف کا اہتمام۔',
                },
              ].map((st, idx) => (
                <div key={idx} className="relative p-6 rounded-2xl bg-[#182848]/50 backdrop-blur-md border border-[#B69A62]/30 space-y-3 transition-transform hover:-translate-y-1">
                  <span className="font-serif text-3xl font-bold text-[#B69A62] block">{st.step}</span>
                  <h4 className="font-serif text-xl font-bold text-[#F7F3EA]">
                    {language === 'ur' ? st.titleUr : st.titleEn}
                  </h4>
                  <p className="text-xs text-[#88A8A8]/80 leading-relaxed font-normal">
                    {language === 'ur' ? st.descUr : st.descEn}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: DEMO PERSONA EXPLORATION CALLOUT (Refined Glass Panel) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel p-8 sm:p-12 border border-[#B69A62]/40 shadow-xl text-center space-y-6">
          <span className="text-xs uppercase font-bold tracking-widest text-[#182848]">
            Prototype Demonstration Portals
          </span>
          <h3 className="font-serif text-3xl sm:text-4xl font-bold text-[#182848] drop-shadow-[0_1px_1px_rgba(247,243,234,0.9)]">
            Experience All Three Stakeholder Workspaces
          </h3>
          <p className="text-xs sm:text-sm text-[#252E2C]/80 max-w-xl mx-auto leading-relaxed font-medium">
            Switch between Nadeem (lead matchmaker operational desk), Candidates (client portal), and Admin (system oversight) to evaluate the end-to-end frontend experience.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => onSelectRole('nadeem')}
              className="rounded-full bg-[#182848] px-6 py-3 text-xs font-semibold text-[#F7F3EA] shadow-md hover:bg-[#283848] transition-all flex items-center gap-2 border border-[#B69A62]/30 cursor-pointer"
            >
              <span>{t.roleNadeem}</span>
              <ChevronRight className="w-4 h-4 text-[#B69A62]" />
            </button>

            <button
              onClick={() => onSelectRole('customer')}
              className="rounded-full border border-[#B69A62]/40 bg-white/10 hover:bg-white/20 backdrop-blur-md px-6 py-3 text-xs font-semibold text-[#182848] shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>{t.roleCustomer}</span>
              <ChevronRight className="w-4 h-4 text-[#B69A62]" />
            </button>

            <button
              onClick={() => onSelectRole('admin')}
              className="rounded-full border border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur-md px-6 py-3 text-xs font-semibold text-[#252E2C] transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>{t.roleAdmin}</span>
              <ChevronRight className="w-4 h-4 text-[#B69A62]" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
