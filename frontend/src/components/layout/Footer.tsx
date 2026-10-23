import React from 'react';
import { Language, Role } from '../../types';
import { translations } from '../../i18n/translations';
import { Shield, Lock, MapPin, Phone, Mail, Heart } from 'lucide-react';

interface FooterProps {
  language: Language;
  onNavigate: (section: string) => void;
  onSelectRole: (role: Role) => void;
}

export const Footer: React.FC<FooterProps> = ({ language, onNavigate, onSelectRole }) => {
  const t = translations[language];

  return (
    <footer className="border-t border-[#B69A62]/35 bg-gradient-to-b from-[#182848]/85 via-[#283848]/90 to-[#121e36]/95 backdrop-blur-xl text-[#F7F3EA] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#486878]/30">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#B69A62]/50 bg-[#182848] text-[#B69A62]">
                <span className="font-serif text-xl font-bold">G</span>
              </div>
              <div>
                <span className="font-serif text-2xl font-bold text-[#F7F3EA]">{t.brandName}</span>
                <span className="block text-[10px] tracking-widest uppercase text-[#B69A62]">
                  {t.brandTagline}
                </span>
              </div>
            </div>
            <p className="text-sm text-[#88A8A8]/80 leading-relaxed">
              {language === 'ur'
                ? 'خاندانوں کے باہمی وقار، رازداری اور بھروسے کے ساتھ مناسب رشتوں کے انتخاب کا بااعتماد ادارہ۔'
                : 'A bespoke matchmaking sanctuary devoted to privacy, family honor, and meaningful life unions.'}
            </p>
            <div className="flex items-center gap-2 text-xs text-[#B69A62]">
              <Shield className="w-4 h-4 text-[#B69A62]" />
              <span>Strict Privacy & Confidentiality Policy</span>
            </div>
          </div>

          {/* Explorations */}
          <div>
            <h4 className="font-serif text-lg font-semibold text-[#B69A62] mb-4">
              {language === 'ur' ? 'رہنمائی' : 'Explore Gulistan'}
            </h4>
            <ul className="space-y-2.5 text-sm text-[#88A8A8]/80">
              <li>
                <button onClick={() => onNavigate('approach')} className="hover:text-[#F7F3EA] transition-colors">
                  {t.navOurApproach}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('how-it-works')} className="hover:text-[#F7F3EA] transition-colors">
                  {t.navHowItWorks}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('privacy')} className="hover:text-[#F7F3EA] transition-colors">
                  {t.navPrivacy}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('register')} className="hover:text-[#F7F3EA] transition-colors">
                  {t.navRegister}
                </button>
              </li>
            </ul>
          </div>

          {/* Operational Portals */}
          <div>
            <h4 className="font-serif text-lg font-semibold text-[#B69A62] mb-4">
              {language === 'ur' ? 'پورٹلز و ورک سپیس' : 'Stakeholder Access'}
            </h4>
            <ul className="space-y-2.5 text-sm text-[#88A8A8]/80">
              <li>
                <button onClick={() => onSelectRole('nadeem')} className="hover:text-[#F7F3EA] transition-colors flex items-center gap-1.5">
                  <span>{t.roleNadeem}</span>
                  <span className="text-[10px] bg-[#B69A62]/20 text-[#B69A62] px-1.5 py-0.5 rounded">Operational</span>
                </button>
              </li>
              <li>
                <button onClick={() => onSelectRole('customer')} className="hover:text-[#F7F3EA] transition-colors flex items-center gap-1.5">
                  <span>{t.roleCustomer}</span>
                  <span className="text-[10px] bg-[#B69A62]/20 text-[#B69A62] px-1.5 py-0.5 rounded">Client</span>
                </button>
              </li>
              <li>
                <button onClick={() => onSelectRole('admin')} className="hover:text-[#F7F3EA] transition-colors flex items-center gap-1.5">
                  <span>{t.roleAdmin}</span>
                  <span className="text-[10px] bg-[#B69A62]/20 text-[#B69A62] px-1.5 py-0.5 rounded">Oversight</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Contact & Hours Placeholder (no fake numbers, official placeholders as requested in 6.7) */}
          <div>
            <h4 className="font-serif text-lg font-semibold text-[#B69A62] mb-4">
              {language === 'ur' ? 'رابطہ و ملاقات' : 'Private Consultation'}
            </h4>
            <div className="space-y-3 text-xs text-[#88A8A8]/80">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#B69A62] shrink-0 mt-0.5" />
                <span>Gulistan Marriage Bureau, Gulberg III / DHA Phase 5, Lahore, Pakistan [Consultation by appointment]</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#B69A62] shrink-0" />
                <span>WhatsApp Helpline: +92 300 0000000 [Official Bureau Line]</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#B69A62] shrink-0" />
                <span>inquiries@gulistanmatchmaking.pk</span>
              </div>
              <p className="text-[11px] text-[#789898] pt-2">
                Office Hours: Monday – Saturday (10:00 AM – 7:00 PM PKT)
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#789898]">
          <p>© 2026 Gulistan Marriage Bureau. All rights reserved. Private and confidential matchmaking service.</p>
          <div className="flex items-center gap-6">
            <button onClick={() => onNavigate('privacy')} className="hover:text-[#88A8A8] transition-colors">
              Privacy Policy
            </button>
            <button onClick={() => onNavigate('privacy')} className="hover:text-[#88A8A8] transition-colors">
              Terms of Service
            </button>
            <span className="text-[#B69A62]">Crafted with dignity & precision</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
