import React from 'react';
import { Language, Role } from '../../types';
import { translations } from '../../i18n/translations';
import { ArchFrame } from '../../components/ui/ArchFrame';
import { 
  ShieldCheck, 
  Sparkles, 
  Heart, 
  Lock, 
  ArrowRight, 
  Users, 
  CheckCircle2, 
  Compass, 
  FileCheck,
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
    <div className="space-y-24 sm:space-y-32 pb-20">
      {/* SECTION 1: LUXURY HERO WITH ARCHITECTURAL PASSAGE REFERENCE */}
      <section className="relative pt-12 sm:pt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#B69A62]/40 bg-[#164E4A]/10 px-4 py-1.5 text-xs uppercase tracking-widest text-[#164E4A] mb-6">
            <Sparkles className="w-3.5 h-3.5 text-[#B69A62]" />
            <span>{language === 'ur' ? 'معیاری اور نجی رشتہ داری خدمات' : 'Bespoke Private Matchmaking'}</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#164E4A] leading-[1.15] mb-6 drop-shadow-[0_1px_2px_rgba(247,243,234,0.95)]">
            {t.heroTitle}
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg text-[#252E2C] font-medium leading-relaxed mb-8 drop-shadow-[0_1px_1px_rgba(247,243,234,0.9)]">
            {t.heroSubtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('register')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#164E4A] px-8 py-4 text-sm font-semibold text-[#F7F3EA] shadow-xl hover:bg-[#103B39] transition-all transform active:scale-95 border border-[#B69A62]/30"
            >
              <span>{t.heroCtaPrimary}</span>
              <ArrowRight className="w-4 h-4 text-[#B69A62]" />
            </button>

            <button
              onClick={() => onNavigate('how-it-works')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-[#B69A62]/50 bg-[#FFFEFA] px-8 py-4 text-sm font-semibold text-[#164E4A] shadow-sm hover:bg-[#F7F3EA] transition-all"
            >
              <span>{t.heroCtaSecondary}</span>
            </button>
          </div>
        </div>

        {/* Visual Showcase: Architectural Arch Frame & Future Video Placeholder */}
        <ArchFrame showVideoPlaceholder={true} badgeText="Architectural Sanctuary • Inspired by the Reference">
          <div className="max-w-xl text-center py-6">
            <h3 className="font-serif text-2xl sm:text-3xl font-medium text-[#F7F3EA] mb-3">
              Where Dignity Meets Human Discernment
            </h3>
            <p className="text-xs sm:text-sm text-[#DCE6DE]/80 leading-relaxed">
              Every profile is carefully vetted through personal consultation. No swiping, no algorithmic noise, and absolute confidentiality for your family.
            </p>
          </div>
        </ArchFrame>
      </section>

      {/* SECTION 2: OUR CORE PILLARS & APPROACH */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs uppercase font-bold tracking-widest text-[#B69A62]">
            {language === 'ur' ? 'ہماری امتیازی اقدار' : 'The Gulistan Philosophy'}
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#164E4A] mt-2 mb-4">
            {language === 'ur' ? 'روایت، وقار اور جدید احتیاط' : 'Tradition, Dignity, and Modern Discretion'}
          </h2>
          <p className="text-sm sm:text-base text-[#68716D] leading-relaxed">
            {language === 'ur'
              ? 'ہم رشتے کے مقدس سفر کو ایک بااعتماد نجی خدمت کے طور پر سرانجام دیتے ہیں۔'
              : 'Matchmaking is not a transaction; it is a sacred life milestone guided by discretion, deep family respect, and verified background integrity.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="porcelain-card rounded-3xl p-8 transition-transform hover:-translate-y-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#164E4A] text-[#B69A62] mb-6">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#164E4A] mb-3">
              {language === 'ur' ? 'مکمل رازداری و حفاظت' : 'Uncompromising Privacy'}
            </h3>
            <p className="text-xs sm:text-sm text-[#68716D] leading-relaxed">
              {language === 'ur'
                ? 'امید واروں کی تصاویر اور خاندانی نمبرز عام نہیں کیے جاتے۔ معلومات صرف باہمی رضامندی اور میچ میکر کی تصدیق کے بعد شیئر ہوتی ہیں۔'
                : 'Photographs, current compensation, and direct family contact numbers are strictly guarded and disclosed exclusively with your explicit authorization.'}
            </p>
          </div>

          <div className="porcelain-card rounded-3xl p-8 transition-transform hover:-translate-y-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#164E4A] text-[#B69A62] mb-6">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#164E4A] mb-3">
              {language === 'ur' ? 'انفرادی توجہ و رہنمائی' : 'Personal Matchmaker Care'}
            </h3>
            <p className="text-xs sm:text-sm text-[#68716D] leading-relaxed">
              {language === 'ur'
                ? 'ندیم صاحب اور ان کی ٹیم ہر خاندان سے تفصیلی رابطہ کر کے تعلیمی، خاندانی اور اخلاقی معیارات کا ذاتی طور پر جائزہ لیتے ہیں۔'
                : 'Nadeem Ahmed and our experienced consultants personally review every profile, understanding nuance, family temperament, and spiritual harmony.'}
            </p>
          </div>

          <div className="porcelain-card rounded-3xl p-8 transition-transform hover:-translate-y-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#164E4A] text-[#B69A62] mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#164E4A] mb-3">
              {language === 'ur' ? 'مصدقہ خاندانی کوائف' : 'Verified Family Credentials'}
            </h3>
            <p className="text-xs sm:text-sm text-[#68716D] leading-relaxed">
              {language === 'ur'
                ? 'تعلیمی اسناد، پیشے کی سچائی، رہائشی اسٹیٹس اور خاندانی وقار کی آزادانہ تصدیق بیورو کے ضوابط کا لازمی حصہ ہے۔'
                : 'Educational pedigrees, professional affiliations, and family backgrounds are thoroughly verified prior to arranging formal introductions.'}
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 3: HOW IT WORKS (4-STEP VISUAL SEQUENCE) */}
      <section className="bg-[#103B39] text-[#F7F3EA] py-20 px-4 sm:px-6 lg:px-8 border-y border-[#B69A62]/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs uppercase font-bold tracking-widest text-[#B69A62]">
              {language === 'ur' ? 'سہل اور باوقار عمل' : 'A Seamless Four-Step Journey'}
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#F7F3EA] mt-2 mb-4">
              {language === 'ur' ? 'رشتے کے آغاز کا طریقۂ کار' : 'How Gulistan Facilitates Introductions'}
            </h2>
            <p className="text-sm sm:text-base text-[#DCE6DE]/80 leading-relaxed">
              Designed to eliminate awkwardness, respect family honor, and ensure meaningful mutual alignment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
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
              <div key={idx} className="relative p-6 rounded-3xl bg-[#164E4A]/60 border border-[#B69A62]/30 space-y-3">
                <span className="font-serif text-3xl font-bold text-[#B69A62] block">{st.step}</span>
                <h4 className="font-serif text-xl font-bold text-[#F7F3EA]">
                  {language === 'ur' ? st.titleUr : st.titleEn}
                </h4>
                <p className="text-xs text-[#DCE6DE]/80 leading-relaxed">
                  {language === 'ur' ? st.descUr : st.descEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: DEMO PERSONA EXPLORATION CALLOUT */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="porcelain-card rounded-3xl p-8 sm:p-12 border-2 border-[#B69A62]/40 shadow-xl text-center space-y-6">
          <span className="text-xs uppercase font-bold tracking-widest text-[#164E4A]">
            Prototype Demonstration Portals
          </span>
          <h3 className="font-serif text-3xl sm:text-4xl font-bold text-[#164E4A]">
            Experience All Three Stakeholder Workspaces
          </h3>
          <p className="text-xs sm:text-sm text-[#68716D] max-w-xl mx-auto leading-relaxed">
            Switch between Nadeem (lead matchmaker operational desk), Candidates (client portal), and Admin (system oversight) to evaluate the end-to-end frontend experience.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => onSelectRole('nadeem')}
              className="rounded-2xl bg-[#164E4A] px-6 py-3.5 text-xs font-semibold text-[#F7F3EA] shadow-md hover:bg-[#103B39] transition-all flex items-center gap-2"
            >
              <span>{t.roleNadeem}</span>
              <ChevronRight className="w-4 h-4 text-[#B69A62]" />
            </button>

            <button
              onClick={() => onSelectRole('customer')}
              className="rounded-2xl border border-[#164E4A] bg-[#FFFEFA] px-6 py-3.5 text-xs font-semibold text-[#164E4A] hover:bg-[#F7F3EA] transition-all flex items-center gap-2"
            >
              <span>{t.roleCustomer}</span>
              <ChevronRight className="w-4 h-4 text-[#B69A62]" />
            </button>

            <button
              onClick={() => onSelectRole('admin')}
              className="rounded-2xl border border-[#E7E2D8] bg-[#F7F3EA] px-6 py-3.5 text-xs font-semibold text-[#252E2C] hover:border-[#164E4A] transition-all flex items-center gap-2"
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
