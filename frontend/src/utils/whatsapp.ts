/**
 * Controlled WhatsApp Proposal Message Generator
 * Formats polite, culturally refined message proposals with granular field disclosures.
 */

export interface DisclosureOptions {
  includeRefNumber: boolean;
  includeName: boolean;
  includeAge: boolean;
  includeHeight: boolean;
  includeEducation: boolean;
  includeOccupation: boolean;
  includeSalary: boolean;
  includeCity: boolean;
  includeCaste: boolean;
  includeSect: boolean;
  includeFamilySummary: boolean;
  includePropertySummary: boolean;
  includeContactNumber: boolean;
  customNote?: string;
}

export interface CandidateProfileData {
  id: string;
  name: string;
  gender: 'female' | 'male';
  age: number;
  height: string;
  education: string;
  occupation: string;
  salary?: string;
  city: string;
  caste: string;
  sect: string;
  familySummary: string;
  propertySummary: string;
  contactNumber: string;
}

export function generateWhatsAppMessage(
  candidate: CandidateProfileData,
  options: DisclosureOptions,
  lang: 'ur' | 'en' = 'ur'
): string {
  if (lang === 'ur') {
    const lines: string[] = [];
    lines.push('السلام علیکم ورحمۃ اللہ،');
    lines.push('گلستان میرج بیورو کی جانب سے ایک مناسب اور معزز رشتے کی تفصیلات درج ذیل ہیں:');
    lines.push('----------------------------------');

    if (options.includeRefNumber) lines.push(`*ریفرنس نمبر:* ${candidate.id}`);
    if (options.includeName) lines.push(`*نام:* ${candidate.name}`);
    if (options.includeAge) lines.push(`*عمر:* ${candidate.age} سال`);
    if (options.includeHeight) lines.push(`*قد:* ${candidate.height}`);
    if (options.includeEducation) lines.push(`*تعلیم:* ${candidate.education}`);
    if (options.includeOccupation) lines.push(`*پیشہ / ملازمت:* ${candidate.occupation}`);
    if (options.includeSalary && candidate.salary) lines.push(`*آمدنی:* ${candidate.salary}`);
    if (options.includeCity) lines.push(`*شہر / رہائش:* ${candidate.city}`);
    if (options.includeCaste) lines.push(`*قوم / برادری:* ${candidate.caste}`);
    if (options.includeSect) lines.push(`*مسلک / عقیدہ:* ${candidate.sect}`);
    if (options.includeFamilySummary) lines.push(`*خاندانی کوائف:* ${candidate.familySummary}`);
    if (options.includePropertySummary) lines.push(`*جائیداد / رہائش:* ${candidate.propertySummary}`);
    if (options.includeContactNumber) lines.push(`*رابطہ نمبر:* ${candidate.contactNumber}`);

    if (options.customNote) {
      lines.push('----------------------------------');
      lines.push(`*اضافی نوٹ:* ${options.customNote}`);
    }

    lines.push('----------------------------------');
    lines.push('براہ کرم تفصیلات کا جائزہ لے کر مطلع فرمائیں۔ آپ کے خاندان کا وقار اور رازداری ہماری اولین ترجیح ہے۔');
    lines.push('نئے آغاز کے لیے نیک تمنائیں — ندیم (گلستان میرج بیورو)');

    return lines.join('\n');
  }

  // English
  const lines: string[] = [];
  lines.push('Assalamu Alaikum,');
  lines.push('Proposal recommendation from Gulistan Marriage Bureau:');
  lines.push('----------------------------------');

  if (options.includeRefNumber) lines.push(`*Reference:* ${candidate.id}`);
  if (options.includeName) lines.push(`*Name:* ${candidate.name}`);
  if (options.includeAge) lines.push(`*Age:* ${candidate.age} Years`);
  if (options.includeHeight) lines.push(`*Height:* ${candidate.height}`);
  if (options.includeEducation) lines.push(`*Education:* ${candidate.education}`);
  if (options.includeOccupation) lines.push(`*Profession:* ${candidate.occupation}`);
  if (options.includeSalary && candidate.salary) lines.push(`*Income:* ${candidate.salary}`);
  if (options.includeCity) lines.push(`*City / Residence:* ${candidate.city}`);
  if (options.includeCaste) lines.push(`*Caste / Biradari:* ${candidate.caste}`);
  if (options.includeSect) lines.push(`*Sect / Aqeedah:* ${candidate.sect}`);
  if (options.includeFamilySummary) lines.push(`*Family Background:* ${candidate.familySummary}`);
  if (options.includePropertySummary) lines.push(`*Property:* ${candidate.propertySummary}`);
  if (options.includeContactNumber) lines.push(`*Contact:* ${candidate.contactNumber}`);

  if (options.customNote) {
    lines.push('----------------------------------');
    lines.push(`*Note:* ${options.customNote}`);
  }

  lines.push('----------------------------------');
  lines.push('Please review the confidential details and let us know your decision. Privacy and family dignity are our utmost priority.');
  lines.push('Warm regards, Nadeem — Gulistan Marriage Bureau');

  return lines.join('\n');
}
