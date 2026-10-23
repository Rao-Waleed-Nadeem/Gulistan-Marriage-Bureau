import React, { useState } from 'react';
import { ProfileRecord, Language } from '../../types';
import { translations } from '../../i18n/translations';
import { DisclosureOptions, generateWhatsAppMessage } from '../../utils/whatsapp';
import { X, Share2, Copy, Check, ShieldCheck, AlertCircle } from 'lucide-react';

interface ControlledSharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: ProfileRecord;
  language: Language;
  onConfirmShare?: (options: DisclosureOptions) => void;
}

export const ControlledSharingModal: React.FC<ControlledSharingModalProps> = ({
  isOpen,
  onClose,
  candidate,
  language,
  onConfirmShare,
}) => {
  const t = translations[language];

  const [options, setOptions] = useState<DisclosureOptions>({
    includeRefNumber: true,
    includeName: false, // Discretionary: default off to protect identity
    includeAge: true,
    includeHeight: true,
    includeEducation: true,
    includeOccupation: true,
    includeSalary: false, // Discretionary: default off
    includeCity: true,
    includeCaste: true,
    includeSect: true,
    includeFamilySummary: true,
    includePropertySummary: true,
    includeContactNumber: false, // Discretionary: default off
    customNote: 'Recommended by Nadeem Ahmed (Gulistan Marriage Bureau). Please review with elders.',
  });

  const [messageLang, setMessageLang] = useState<'ur' | 'en'>(language === 'ur' ? 'ur' : 'en');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const candidateData = {
    id: candidate.id,
    name: candidate.fullName,
    gender: candidate.gender,
    age: candidate.age,
    height: candidate.height,
    education: candidate.education,
    occupation: candidate.occupation,
    salary: candidate.monthlyIncomePKR ? `₨ ${candidate.monthlyIncomePKR.toLocaleString()} / month` : undefined,
    city: `${candidate.currentCity} (${candidate.residenceArea})`,
    caste: candidate.caste,
    sect: candidate.aqeedah,
    familySummary: candidate.familyBackgroundNotes,
    propertySummary: `${candidate.property.areaMarlas} Marla (${candidate.property.propertyType}) in ${candidate.property.locality}`,
    contactNumber: candidate.contactPhone,
  };

  const previewMessage = generateWhatsAppMessage(candidateData, options, messageLang);

  const handleCopy = () => {
    navigator.clipboard.writeText(previewMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggle = (key: keyof DisclosureOptions) => {
    if (typeof options[key] === 'boolean') {
      setOptions({ ...options, [key]: !options[key] });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl border border-white/20 glass-panel-dense backdrop-blur-2xl shadow-2xl overflow-hidden my-8 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E7E2D8] bg-[#182848] px-6 py-4 text-[#F7F3EA]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#283848] text-[#B69A62] border border-[#B69A62]/30">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold tracking-wide">
                {language === 'ur' ? 'واٹس ایپ پر بااختیار شیئرنگ' : 'Controlled WhatsApp Proposal Sharing'}
              </h3>
              <p className="text-xs text-[#88A8A8]">
                Candidate: {candidate.displayName} ({candidate.id})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[#88A8A8] hover:bg-[#283848] hover:text-[#F7F3EA] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Banner */}
        <div className="bg-amber-500/10 backdrop-blur-md border-b border-amber-200/40 px-6 py-2.5 text-xs text-amber-950 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#B69A62] shrink-0" />
          <span>
            {language === 'ur'
              ? 'صوابدیدی کنٹرول: صرف وہی فیلڈز منتخب کریں جو اس مرحلے پر ظاہر کرنا مناسب ہوں۔ نام اور فون نمبر پوشیدہ رکھے جا سکتے ہیں۔'
              : 'Privacy Guard: Toggle only the fields you wish to disclose. Full name and direct phone numbers can remain withheld.'}
          </span>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {/* Left: Checkboxes */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#182848] border-b border-[#E7E2D8] pb-1.5">
              {language === 'ur' ? 'ظاہر کی جانے والی تفصیلات منتخب کریں:' : 'Select Disclosed Fields:'}
            </h4>

            <div className="space-y-2 text-xs">
              {[
                { key: 'includeRefNumber', labelEn: 'Profile Reference (GLS ID)', labelUr: 'ریفرنس نمبر (لازمی)' },
                { key: 'includeName', labelEn: 'Full Legal Name (Discretionary)', labelUr: 'امید وار کا مکمل نام (اختیاری)' },
                { key: 'includeAge', labelEn: 'Candidate Age', labelUr: 'عمر' },
                { key: 'includeHeight', labelEn: 'Candidate Height', labelUr: 'قد' },
                { key: 'includeEducation', labelEn: 'Education Degree & Field', labelUr: 'تعلیم و ڈگری' },
                { key: 'includeOccupation', labelEn: 'Occupation & Profession', labelUr: 'پیشہ و ملازمت' },
                { key: 'includeSalary', labelEn: 'Monthly Income / Salary (Withhold recommended)', labelUr: 'ماہانہ آمدنی (پوشیدہ رکھنا بہتر ہے)' },
                { key: 'includeCity', labelEn: 'City & Residential Area', labelUr: 'شہر و علاقہ' },
                { key: 'includeCaste', labelEn: 'Caste & Biradari Lineage', labelUr: 'قوم و برادری' },
                { key: 'includeSect', labelEn: 'Religion & Sect / Aqeedah', labelUr: 'مذہب و مسلک' },
                { key: 'includeFamilySummary', labelEn: 'Family Background & Siblings', labelUr: 'خاندانی کوائف و بہن بھائی' },
                { key: 'includePropertySummary', labelEn: 'Property & Household Specs', labelUr: 'جائیداد و مکان کی تفصیل' },
                { key: 'includeContactNumber', labelEn: 'Family Contact Number (Withhold initially)', labelUr: 'خاندان کا رابطہ نمبر (پوشیدہ رکھنا بہتر)' },
              ].map(({ key, labelEn, labelUr }) => {
                const isChecked = options[key as keyof DisclosureOptions] as boolean;
                return (
                  <label
                    key={key}
                    className={`flex items-center justify-between p-2 rounded-xl border transition-colors cursor-pointer ${
                      isChecked ? 'bg-[#182848]/15 border-[#182848]/35 text-[#182848]' : 'bg-white/10 border-white/20 text-[#68716D]'
                    }`}
                  >
                    <span>{language === 'ur' ? labelUr : labelEn}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggle(key as keyof DisclosureOptions)}
                      className="rounded border-[#B69A62] text-[#182848] focus:ring-[#182848] h-4 w-4"
                    />
                  </label>
                );
              })}
            </div>

            {/* Custom Bureau Note */}
            <div>
              <label className="block text-xs font-semibold text-[#182848] mb-1">
                {language === 'ur' ? 'ندیم صاحب کا خصوصی نوٹ:' : 'Matchmaker Custom Note:'}
              </label>
              <textarea
                value={options.customNote}
                onChange={(e) => setOptions({ ...options, customNote: e.target.value })}
                rows={2}
                className="w-full rounded-xl border border-white/20 bg-white/10 backdrop-blur-md p-2.5 text-xs text-[#252E2C] focus:border-[#182848] focus:outline-none"
              />
            </div>
          </div>

          {/* Right: Interactive WhatsApp Message Preview */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E7E2D8] pb-2 mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#182848]">
                {language === 'ur' ? 'واٹس ایپ میسج کا لائیو پیش منظر:' : 'Live WhatsApp Message Preview:'}
              </h4>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMessageLang('ur')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    messageLang === 'ur' ? 'bg-[#182848] text-[#F7F3EA]' : 'bg-[#F7F3EA] text-[#68716D]'
                  }`}
                >
                  اردو
                </button>
                <button
                  onClick={() => setMessageLang('en')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    messageLang === 'en' ? 'bg-[#182848] text-[#F7F3EA]' : 'bg-[#F7F3EA] text-[#68716D]'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Simulated WhatsApp Chat Bubble */}
            <div
              dir={messageLang === 'ur' ? 'rtl' : 'ltr'}
              style={{ fontFamily: messageLang === 'ur' ? "'Noto Nastaliq Urdu', 'Noto Sans Arabic', Tahoma, serif" : 'inherit' }}
              className="flex-1 rounded-2xl bg-[#EFEAE2] p-4 text-xs text-[#252E2C] border border-[#E7E2D8] shadow-inner overflow-y-auto max-h-[380px] space-y-2 whitespace-pre-wrap leading-relaxed"
            >
              <div className="rounded-xl bg-[#FFFFFF] p-3.5 shadow-sm border border-[#E0D8CB] relative">
                {previewMessage}
                <div className="mt-2 text-end text-[10px] text-gray-400" dir="ltr">10:45 AM ✓✓</div>
              </div>
            </div>

            {/* Simulated WhatsApp Action */}
            <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-[#E7E2D8]">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 text-xs font-medium text-[#252E2C] hover:border-[#182848] transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[#486878]" />}
                <span>{copied ? (language === 'ur' ? 'کاپی ہو گیا!' : 'Copied!') : (language === 'ur' ? 'ٹیکسٹ کاپی کریں' : 'Copy Message')}</span>
              </button>

              <button
                onClick={() => {
                  if (onConfirmShare) onConfirmShare(options);
                  handleCopy();
                  alert(
                    language === 'ur'
                      ? 'محفوظ پیش منظر: پیغام کلپ بورڈ پر کاپی ہو گیا۔ ڈیمو میں حقیقی واٹس ایپ کے ذریعے پرائیویٹ ڈیٹا براہِ راست لیک نہیں ہوتا۔'
                      : 'Simulated Sharing: Message copied to clipboard. In production, this launches WhatsApp with your exact disclosed fields.'
                  );
                  onClose();
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#182848] px-5 py-2 text-xs font-semibold text-[#F7F3EA] shadow hover:bg-[#283848] transition-all transform active:scale-95"
              >
                <Share2 className="w-4 h-4 text-[#B69A62]" />
                <span>{language === 'ur' ? 'واٹس ایپ پر شیئر کریں (ڈیمو)' : 'Prepare for WhatsApp'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
