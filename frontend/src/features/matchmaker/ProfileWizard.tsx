import React, { useState } from 'react';
import { ProfileRecord, SiblingRecord, Language, MaritalStatus, Gender } from '../../types';
import { translations } from '../../i18n/translations';
import { convertMarlaToKanal } from '../../utils/units';
import { 
  User, 
  Briefcase, 
  Users, 
  Home, 
  Camera, 
  Heart, 
  CheckCircle, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface ProfileWizardProps {
  language: Language;
  onSaveProfile: (profile: ProfileRecord) => void;
  onCancel: () => void;
}

export const ProfileWizard: React.FC<ProfileWizardProps> = ({
  language,
  onSaveProfile,
  onCancel,
}) => {
  const t = translations[language];
  const [currentStep, setCurrentStep] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<ProfileRecord>>({
    fullName: '',
    displayName: '',
    gender: 'female',
    age: 25,
    height: "5'4\"",
    maritalStatus: 'never_married',
    religion: 'Islam',
    aqeedah: 'Sunni / Hanafi',
    caste: 'Sheikh',
    subCaste: '',
    education: 'Masters',
    educationField: 'Information Technology',
    occupation: 'Software Engineer',
    jobTitle: 'Senior Developer',
    monthlyIncomePKR: 200000,
    hometown: 'Lahore',
    currentCity: 'Lahore',
    residenceArea: 'Gulberg III',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    photoPermissionGranted: true,
    fatherStatus: 'alive',
    fatherOccupation: 'Businessman',
    motherStatus: 'alive',
    motherOccupation: 'Homemaker',
    siblings: [
      {
        id: 'sib-new-1',
        relation: 'brother',
        name: '',
        age: 28,
        maritalStatus: 'married',
        occupation: 'Engineer',
        marriageDetails: 'Married in Lahore',
      },
    ],
    familyBackgroundNotes: 'Dignified, practicing educated family with ancestral roots in Punjab.',
    property: {
      ownership: 'owned',
      propertyType: 'house',
      areaMarlas: 20, // 1 Kanal
      approxValuePKR: 65000000,
      city: 'Lahore',
      locality: 'Gulberg III',
      householdArrangement: 'independent',
      homeSizeDescription: 'Double-storey residence',
    },
    preferences: {
      ageMin: 26,
      ageMax: 32,
      heightMin: "5'9\"",
      maritalStatus: ['never_married'],
      religion: 'Islam',
      aqeedah: 'Sunni / Hanafi',
      caste: 'Open / Any Respectable Family',
      educationMin: 'Graduation / Masters',
      preferredOccupations: ['Engineer', 'Doctor', 'Civil Servant', 'Business Owner'],
      cityPreferences: ['Lahore', 'Islamabad'],
      propertyExpectation: 'Own home preferred',
      familyArrangement: 'independent',
      relocationPreference: 'willing_to_relocate',
      workAfterMarriagePreference: 'optional',
      criteriaClassifications: {
        religion: 'mandatory',
        aqeedah: 'mandatory',
        maritalStatus: 'mandatory',
        education: 'mandatory',
        caste: 'preferred',
        height: 'acceptable_range',
      },
    },
    contactPerson: 'Father',
    contactPhone: '+92 300 0000000',
    preferredContactMethod: 'whatsapp',
    source: 'direct_web',
    status: 'pending_review',
  });

  // Land calculation preview
  const marlaInput = formData.property?.areaMarlas || 0;
  const landCalc = convertMarlaToKanal(marlaInput);

  // Sibling management
  const handleAddSibling = () => {
    const newSib: SiblingRecord = {
      id: `sib-${Date.now()}`,
      relation: 'brother',
      name: '',
      age: 24,
      maritalStatus: 'never_married',
      occupation: '',
      marriageDetails: '',
    };
    setFormData({
      ...formData,
      siblings: [...(formData.siblings || []), newSib],
    });
  };

  const handleRemoveSibling = (id: string) => {
    setFormData({
      ...formData,
      siblings: (formData.siblings || []).filter((s) => s.id !== id),
    });
  };

  const handleUpdateSibling = (id: string, field: keyof SiblingRecord, value: any) => {
    setFormData({
      ...formData,
      siblings: (formData.siblings || []).map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    });
  };

  // Preference criteria classification updater
  const handleUpdateClassification = (
    key: string,
    importance: 'mandatory' | 'preferred' | 'acceptable_range' | 'unknown' | 'not_disclosed'
  ) => {
    const prefs = formData.preferences || ({} as any);
    const classifications = { ...(prefs.criteriaClassifications || {}), [key]: importance };
    setFormData({
      ...formData,
      preferences: {
        ...prefs,
        criteriaClassifications: classifications,
      },
    });
  };

  // Step Validation
  const validateStep = (step: number): boolean => {
    setValidationError(null);
    if (step === 1) {
      if (!formData.fullName || formData.fullName.trim().length < 2) {
        setValidationError(language === 'ur' ? 'براہ کرم امیدوار کا پورا نام درج فرمائیں۔' : 'Please provide full name.');
        return false;
      }
      if (!formData.age || formData.age < 18 || formData.age > 75) {
        setValidationError(language === 'ur' ? 'براہ کرم موزوں عمر درج فرمائیں (۱۸ سے ۷۵ سال)۔' : 'Please provide a valid age between 18 and 75.');
        return false;
      }
    } else if (step === 2) {
      if (!formData.education || !formData.occupation) {
        setValidationError(language === 'ur' ? 'براہ کرم تعلیم اور موجودہ پیشے کا اندراج فرمائیں۔' : 'Please enter education and occupation.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 7));
    }
  };

  const handleBack = () => {
    setValidationError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinalSubmit = () => {
    if (!validateStep(1) || !validateStep(2)) return;

    const newProfileId = `GLS-${Math.floor(410 + Math.random() * 90)}`;
    const finalProfile: ProfileRecord = {
      id: newProfileId,
      fullName: formData.fullName || 'Candidate Name',
      displayName: formData.displayName || `${formData.fullName} (${formData.occupation})`,
      gender: formData.gender as Gender,
      age: formData.age || 25,
      height: formData.height || "5'4\"",
      maritalStatus: (formData.maritalStatus as MaritalStatus) || 'never_married',
      religion: formData.religion || 'Islam',
      aqeedah: formData.aqeedah || 'Sunni / Hanafi',
      caste: formData.caste || 'Sheikh',
      subCaste: formData.subCaste || '',
      education: formData.education || 'Masters',
      educationField: formData.educationField || 'General',
      occupation: formData.occupation || 'Professional',
      jobTitle: formData.jobTitle || 'Executive',
      monthlyIncomePKR: formData.monthlyIncomePKR,
      hometown: formData.hometown || 'Lahore',
      currentCity: formData.currentCity || 'Lahore',
      residenceArea: formData.residenceArea || 'Cantt',
      photoUrl: formData.photoUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
      photoPermissionGranted: formData.photoPermissionGranted !== false,
      fatherName: formData.fatherName || 'Father',
      fatherStatus: formData.fatherStatus || 'alive',
      fatherOccupation: formData.fatherOccupation || 'Retired',
      motherStatus: formData.motherStatus || 'alive',
      motherOccupation: formData.motherOccupation || 'Homemaker',
      siblings: formData.siblings || [],
      familyBackgroundNotes: formData.familyBackgroundNotes || 'Educated family.',
      property: {
        ownership: formData.property?.ownership || 'owned',
        propertyType: formData.property?.propertyType || 'house',
        areaMarlas: formData.property?.areaMarlas || 20,
        approxValuePKR: formData.property?.approxValuePKR || 50000000,
        city: formData.property?.city || 'Lahore',
        locality: formData.property?.locality || 'Cantt',
        householdArrangement: formData.property?.householdArrangement || 'independent',
        homeSizeDescription: formData.property?.homeSizeDescription || 'Independent house',
      },
      preferences: formData.preferences || ({} as any),
      status: 'pending_review',
      source: 'direct_web',
      assignedMatchmakerId: 'nadeem',
      assignedMatchmakerName: 'Nadeem Ahmed',
      contactPerson: formData.contactPerson || 'Candidate',
      contactPhone: formData.contactPhone || '+92 300 0000000',
      preferredContactMethod: 'whatsapp',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      internalNotes: 'New profile registered via guided workflow. Initial phone verification pending.',
    };

    onSaveProfile(finalProfile);
  };

  const stepsList = [
    { num: 1, title: language === 'ur' ? 'ذاتی کوائف' : 'Personal', icon: User },
    { num: 2, title: language === 'ur' ? 'تعلیم و ملازمت' : 'Career', icon: Briefcase },
    { num: 3, title: language === 'ur' ? 'خاندانی تفصیل' : 'Family', icon: Users },
    { num: 4, title: language === 'ur' ? 'جائیداد و مکان' : 'Property', icon: Home },
    { num: 5, title: language === 'ur' ? 'تصاویر و اجازت' : 'Consent', icon: Camera },
    { num: 6, title: language === 'ur' ? 'ترجیحات' : 'Preferences', icon: Heart },
    { num: 7, title: language === 'ur' ? 'جائزہ و تصدیق' : 'Review', icon: CheckCircle },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Wizard Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E2D8] pb-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#B69A62] font-semibold">
            {language === 'ur' ? '۷ مراحل پر مشتمل رہنمائی' : '7-Step Guided Profile Workflow'}
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#182848]">
            {language === 'ur' ? 'نیا پروفائل شامل کریں' : 'Add New Profile'}
          </h2>
          <p className="text-xs text-[#68716D]">
            {language === 'ur'
              ? 'موبائل اور ڈیسک ٹاپ کے لیے مرحلہ وار آسان رجسٹریشن۔ لازمی فیلڈز مکمل کریں۔'
              : 'Designed for comfortable operation on mobile and desktop. Complete key steps and review.'}
          </p>
        </div>

        <button
          onClick={onCancel}
          className="self-start rounded-full border border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 text-xs font-medium text-[#252E2C] transition-colors"
        >
          {t.btnCancel}
        </button>
      </div>

      {/* Progress Stepper Bar */}
      <div className="mb-8 overflow-x-auto pb-2">
        <div className="flex items-center min-w-[580px] justify-between">
          {stepsList.map((st, idx) => {
            const Icon = st.icon;
            const isCompleted = currentStep > st.num;
            const isActive = currentStep === st.num;
            return (
              <div key={st.num} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => {
                    if (st.num < currentStep || validateStep(currentStep)) {
                      setCurrentStep(st.num);
                    }
                  }}
                  className={`flex flex-col items-center group focus:outline-none`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl border text-xs font-semibold transition-all ${
                      isActive
                        ? 'border-[#182848] bg-[#182848] text-[#F7F3EA] shadow-md ring-4 ring-[#182848]/10'
                        : isCompleted
                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-700'
                        : 'border-white/15 bg-white/10 backdrop-blur-md text-[#68716D]'
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span
                    className={`mt-1.5 text-[11px] whitespace-nowrap transition-all duration-300 ${
                      isActive 
                        ? 'px-3 py-1 rounded-full bg-[#182848] text-[#F7F3EA] font-bold shadow-md border border-[#B69A62]/40 tracking-wide scale-105' 
                        : isCompleted 
                        ? 'text-emerald-800 font-medium px-1' 
                        : 'text-[#68716D] font-medium px-1'
                    }`}
                  >
                    {st.title}
                  </span>
                </button>
                {idx < stepsList.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 transition-colors ${
                      currentStep > st.num ? 'bg-emerald-500' : 'bg-[#E7E2D8]'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Validation Alert */}
      {validationError && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-3 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Form Content Container — Dense Glass Panel for Maximum Readability */}
      <div className="glass-panel-dense p-6 sm:p-8 mb-8 shadow-xl border border-white/20">
        {/* STEP 1: Personal Information */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-fadeIn">
            <h3 className="font-serif text-xl font-bold text-[#182848] border-b border-[#E7E2D8] pb-2">
              {t.stepPersonal}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[#182848] mb-1">
                  {t.fullName} *
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Fatima Tariq"
                  className="w-full rounded-xl border border-[#E7E2D8] p-3 text-sm focus:border-[#182848] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">
                  {t.displayName}
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="e.g. Dr. Fatima (Physician)"
                  className="w-full rounded-xl border border-[#E7E2D8] p-3 text-sm focus:border-[#182848] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">{t.gender} *</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                  className="w-full rounded-xl border border-[#E7E2D8] p-3 text-sm focus:border-[#182848] focus:outline-none bg-white"
                >
                  <option value="female">{language === 'ur' ? 'خاتون (دلہن)' : 'Female (Bride)'}</option>
                  <option value="male">{language === 'ur' ? 'مرد (دولہا)' : 'Male (Groom)'}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">{t.age} *</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                  className="w-full rounded-xl border border-[#E7E2D8] p-3 text-sm focus:border-[#182848] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">{t.height} *</label>
                <input
                  type="text"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  placeholder="e.g. 5'4&quot;"
                  className="w-full rounded-xl border border-[#E7E2D8] p-3 text-sm focus:border-[#182848] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">{t.maritalStatus} *</label>
                <select
                  value={formData.maritalStatus}
                  onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value as MaritalStatus })}
                  className="w-full rounded-xl border border-[#E7E2D8] p-3 text-sm focus:border-[#182848] focus:outline-none bg-white"
                >
                  <option value="never_married">{language === 'ur' ? 'غیر شادی شدہ' : 'Never Married'}</option>
                  <option value="divorced">{language === 'ur' ? 'مطلقہ' : 'Divorced'}</option>
                  <option value="widowed">{language === 'ur' ? 'بیوہ / رنڈوا' : 'Widowed'}</option>
                  <option value="khula">{language === 'ur' ? 'خلع شدہ' : 'Khula'}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">{t.caste} *</label>
                <input
                  type="text"
                  value={formData.caste}
                  onChange={(e) => setFormData({ ...formData, caste: e.target.value })}
                  placeholder="e.g. Sheikh / Rajput / Arain / Syed"
                  className="w-full rounded-xl border border-[#E7E2D8] p-3 text-sm focus:border-[#182848] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">{t.aqeedah}</label>
                <input
                  type="text"
                  value={formData.aqeedah}
                  onChange={(e) => setFormData({ ...formData, aqeedah: e.target.value })}
                  placeholder="e.g. Sunni / Hanafi"
                  className="w-full rounded-xl border border-[#E7E2D8] p-3 text-sm focus:border-[#182848] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">{t.currentCity} *</label>
                <input
                  type="text"
                  value={formData.currentCity}
                  onChange={(e) => setFormData({ ...formData, currentCity: e.target.value })}
                  placeholder="e.g. Lahore / Islamabad"
                  className="w-full rounded-xl border border-[#E7E2D8] p-3 text-sm focus:border-[#182848] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">{t.residenceArea}</label>
                <input
                  type="text"
                  value={formData.residenceArea}
                  onChange={(e) => setFormData({ ...formData, residenceArea: e.target.value })}
                  placeholder="e.g. DHA Phase 5 / Gulberg"
                  className="w-full rounded-xl border border-[#E7E2D8] p-3 text-sm focus:border-[#182848] focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Education and Work */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-fadeIn">
            <h3 className="font-serif text-xl font-bold text-[#182848] border-b border-[#E7E2D8] pb-2">
              {t.stepEducation}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[#182848] mb-1">{t.education} *</label>
                <input
                  type="text"
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                  placeholder="e.g. MBBS / MS Computer Science / CA"
                  className="w-full rounded-xl border border-[#E7E2D8] p-3 text-sm focus:border-[#182848] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">{t.educationField}</label>
                <input
                  type="text"
                  value={formData.educationField}
                  onChange={(e) => setFormData({ ...formData, educationField: e.target.value })}
                  placeholder="e.g. Medicine / Software Engineering"
                  className="w-full rounded-xl border border-[#E7E2D8] p-3 text-sm focus:border-[#182848] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">{t.occupation} *</label>
                <input
                  type="text"
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  placeholder="e.g. Physician / Software Architect"
                  className="w-full rounded-xl border border-[#E7E2D8] p-3 text-sm focus:border-[#182848] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">{t.jobTitle}</label>
                <input
                  type="text"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  placeholder="e.g. Senior Resident / Lead Consultant"
                  className="w-full rounded-xl border border-[#E7E2D8] p-3 text-sm focus:border-[#182848] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">
                  {t.monthlyIncome} (PKR) - {language === 'ur' ? 'صوابدیدی' : 'Optional / Withheld by default'}
                </label>
                <input
                  type="number"
                  value={formData.monthlyIncomePKR || ''}
                  onChange={(e) => setFormData({ ...formData, monthlyIncomePKR: Number(e.target.value) })}
                  placeholder="e.g. 250000"
                  className="w-full rounded-xl border border-[#E7E2D8] p-3 text-sm focus:border-[#182848] focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Family Details & Sibling Records */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="font-serif text-xl font-bold text-[#182848] border-b border-[#E7E2D8] pb-2">
              {t.stepFamily}
            </h3>

            {/* Parents */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
              <div>
                <label className="block font-semibold text-[#182848] mb-1">{t.fatherStatus}</label>
                <select
                  value={formData.fatherStatus}
                  onChange={(e) => setFormData({ ...formData, fatherStatus: e.target.value as any })}
                  className="w-full rounded-xl border border-[#E7E2D8] p-2.5 text-sm bg-white"
                >
                  <option value="alive">Alive</option>
                  <option value="deceased">Deceased</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">{t.fatherOccupation}</label>
                <input
                  type="text"
                  value={formData.fatherOccupation}
                  onChange={(e) => setFormData({ ...formData, fatherOccupation: e.target.value })}
                  placeholder="e.g. Chief Engineer (Retd)"
                  className="w-full rounded-xl border border-[#E7E2D8] p-2.5 text-sm bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">{t.motherStatus}</label>
                <select
                  value={formData.motherStatus}
                  onChange={(e) => setFormData({ ...formData, motherStatus: e.target.value as any })}
                  className="w-full rounded-xl border border-[#E7E2D8] p-2.5 text-sm bg-white"
                >
                  <option value="alive">Alive</option>
                  <option value="deceased">Deceased</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">{t.motherOccupation}</label>
                <input
                  type="text"
                  value={formData.motherOccupation}
                  onChange={(e) => setFormData({ ...formData, motherOccupation: e.target.value })}
                  placeholder="e.g. Homemaker / Educator"
                  className="w-full rounded-xl border border-[#E7E2D8] p-2.5 text-sm bg-white"
                />
              </div>
            </div>

            {/* Dynamic Sibling Records */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="font-semibold text-sm text-[#182848]">
                  {language === 'ur' ? 'بہن بھائیوں کے انفرادی ریکارڈز:' : 'Individual Sibling Detailed Records:'}
                </label>
                <button
                  type="button"
                  onClick={handleAddSibling}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#182848] px-3 py-1.5 text-xs font-medium text-[#F7F3EA] hover:bg-[#283848] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#B69A62]" />
                  <span>{t.addSibling}</span>
                </button>
              </div>

              <div className="space-y-3">
                {(formData.siblings || []).map((sib, index) => (
                  <div key={sib.id} className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-4 text-xs space-y-3 shadow-sm">
                    <div className="flex items-center justify-between border-b border-[#E7E2D8] pb-2">
                      <span className="font-bold text-[#182848]">
                        {language === 'ur' ? `اندراج نمبر ${index + 1}` : `Sibling Entry #${index + 1}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSibling(sib.id)}
                        className="text-rose-600 hover:text-rose-800 p-1"
                        title={t.removeSibling}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[#68716D] mb-1">{t.relation}</label>
                        <select
                          value={sib.relation}
                          onChange={(e) => handleUpdateSibling(sib.id, 'relation', e.target.value)}
                          className="w-full rounded-xl border border-[#E7E2D8] p-2 text-xs bg-white"
                        >
                          <option value="brother">{language === 'ur' ? 'بھائی' : 'Brother'}</option>
                          <option value="sister">{language === 'ur' ? 'بہن' : 'Sister'}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[#68716D] mb-1">Name / Initial</label>
                        <input
                          type="text"
                          value={sib.name || ''}
                          onChange={(e) => handleUpdateSibling(sib.id, 'name', e.target.value)}
                          placeholder="e.g. Hamza"
                          className="w-full rounded-xl border border-[#E7E2D8] p-2 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[#68716D] mb-1">{t.siblingMaritalStatus}</label>
                        <select
                          value={sib.maritalStatus}
                          onChange={(e) => handleUpdateSibling(sib.id, 'maritalStatus', e.target.value)}
                          className="w-full rounded-xl border border-[#E7E2D8] p-2 text-xs bg-white"
                        >
                          <option value="never_married">Single / Never Married</option>
                          <option value="married">Married</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[#68716D] mb-1">{t.siblingOccupation}</label>
                        <input
                          type="text"
                          value={sib.occupation || ''}
                          onChange={(e) => handleUpdateSibling(sib.id, 'occupation', e.target.value)}
                          placeholder="e.g. Software Architect (LUMS / Remote)"
                          className="w-full rounded-xl border border-[#E7E2D8] p-2 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[#68716D] mb-1">{t.marriageDetails}</label>
                        <input
                          type="text"
                          value={sib.marriageDetails || ''}
                          onChange={(e) => handleUpdateSibling(sib.id, 'marriageDetails', e.target.value)}
                          placeholder="e.g. Married in Lahore"
                          className="w-full rounded-xl border border-[#E7E2D8] p-2 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#182848] mb-1">{t.familyBackground}</label>
              <textarea
                value={formData.familyBackgroundNotes}
                onChange={(e) => setFormData({ ...formData, familyBackgroundNotes: e.target.value })}
                rows={3}
                placeholder="Mention ancestral hometown, lineage standing, values..."
                className="w-full rounded-xl border border-[#E7E2D8] p-3 text-xs focus:border-[#182848] focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* STEP 4: Property and Household */}
        {currentStep === 4 && (
          <div className="space-y-5 animate-fadeIn">
            <h3 className="font-serif text-xl font-bold text-[#182848] border-b border-[#E7E2D8] pb-2">
              {t.stepProperty}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[#182848] mb-1">{t.propertyOwnership}</label>
                <select
                  value={formData.property?.ownership}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      property: { ...(formData.property as any), ownership: e.target.value },
                    })
                  }
                  className="w-full rounded-xl border border-[#E7E2D8] p-3 text-sm bg-white"
                >
                  <option value="owned">Owned</option>
                  <option value="family_owned">Family Owned Estate</option>
                  <option value="rented">Rented</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">{t.propertyType}</label>
                <select
                  value={formData.property?.propertyType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      property: { ...(formData.property as any), propertyType: e.target.value },
                    })
                  }
                  className="w-full rounded-xl border border-[#E7E2D8] p-3 text-sm bg-white"
                >
                  <option value="house">House / Villa</option>
                  <option value="apartment">Apartment</option>
                  <option value="plot">Plot / Farmhouse</option>
                  <option value="agricultural">Agricultural Land</option>
                </select>
              </div>

              {/* Dynamic Marla <-> Kanal Conversion Live Preview */}
              <div className="sm:col-span-2 bg-[#182848]/5 border border-[#182848]/20 rounded-2xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-[#182848] mb-1">
                      {t.landAreaMarla} (e.g. 25 Marla)
                    </label>
                    <input
                      type="number"
                      value={formData.property?.areaMarlas || 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          property: { ...(formData.property as any), areaMarlas: Number(e.target.value) },
                        })
                      }
                      className="w-full rounded-xl border border-[#E7E2D8] p-2.5 text-sm bg-white focus:border-[#182848] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#B69A62] mb-1">
                      {t.landAreaKanalEquiv} (Automatic Conversion)
                    </label>
                    <div className="rounded-xl border border-[#B69A62]/30 bg-white p-2.5 text-sm font-semibold text-[#182848]">
                      {language === 'ur' ? landCalc.formattedUrdu : landCalc.formattedEn}
                      <span className="block text-[10px] text-[#68716D] font-normal">
                        Convention: 20 Marla = 1 Kanal ({landCalc.sqFtEquivalent.toLocaleString()} sq ft)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">{t.approxValue} (PKR)</label>
                <input
                  type="number"
                  value={formData.property?.approxValuePKR || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      property: { ...(formData.property as any), approxValuePKR: Number(e.target.value) },
                    })
                  }
                  placeholder="e.g. 85000000"
                  className="w-full rounded-xl border border-[#E7E2D8] p-3 text-sm focus:border-[#182848] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">{t.householdType}</label>
                <select
                  value={formData.property?.householdArrangement}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      property: { ...(formData.property as any), householdArrangement: e.target.value },
                    })
                  }
                  className="w-full rounded-xl border border-[#E7E2D8] p-3 text-sm bg-white"
                >
                  <option value="independent">Independent Family Residence</option>
                  <option value="joint_family">Joint Family System</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Photographs and Consent */}
        {currentStep === 5 && (
          <div className="space-y-5 animate-fadeIn">
            <h3 className="font-serif text-xl font-bold text-[#182848] border-b border-[#E7E2D8] pb-2">
              {t.stepPhotos}
            </h3>

            <div className="rounded-2xl border border-[#B69A62]/40 bg-white/10 backdrop-blur-md p-5 text-xs text-[#252E2C] space-y-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#B69A62] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#182848]">{t.customerPrivacyCenter}</h4>
                  <p className="text-[#68716D] leading-relaxed">
                    {t.photoPrivacyNotice}
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.photoPermissionGranted}
                  onChange={(e) => setFormData({ ...formData, photoPermissionGranted: e.target.checked })}
                  className="rounded border-[#B69A62] text-[#182848] h-4 w-4"
                />
                <span className="font-medium text-[#182848]">
                  {language === 'ur'
                    ? 'تصویر شیئر کرنے کی اجازت ہے (صرف ندیم صاحب کی تصدیق اور باہمی رضامندی کے بعد)'
                    : 'Authorize photo sharing exclusively upon mutual interest and matchmaker verification'}
                </span>
              </label>

              <div>
                <label className="block font-semibold text-[#182848] mb-1">
                  Candidate Safe Demonstration Photo URL
                </label>
                <input
                  type="text"
                  value={formData.photoUrl}
                  onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                  className="w-full rounded-xl border border-[#E7E2D8] p-2.5 text-xs bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Marriage Preferences with Runtime Classification */}
        {currentStep === 6 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-[#E7E2D8] pb-2">
              <h3 className="font-serif text-xl font-bold text-[#182848]">
                {t.stepPreferences}
              </h3>
              <p className="text-xs text-[#68716D]">
                {language === 'ur'
                  ? 'ہر معیار کو لازمی (Mandatory)، ترجیحی (Preferred)، یا قابلِ قبول (Acceptable Range) کے طور پر منتخب کریں۔'
                  : 'Classify each partner requirement at runtime: Mandatory, Preferred, or Acceptable Range.'}
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {[
                { key: 'age', labelEn: 'Age Preference (24 - 32)', labelUr: 'عمر کی ترجیح (۲۴ تا ۳۲ سال)' },
                { key: 'religion', labelEn: 'Religion (Islam)', labelUr: 'مذہب (اسلام)' },
                { key: 'aqeedah', labelEn: 'Aqeedah / Sect (Sunni / Hanafi)', labelUr: 'مسلک و عقیدہ' },
                { key: 'education', labelEn: 'Minimum Education (Graduation/Masters)', labelUr: 'کم از کم تعلیم' },
                { key: 'caste', labelEn: 'Caste / Biradari Standing', labelUr: 'قوم و برادری' },
                { key: 'height', labelEn: 'Height Requirement', labelUr: 'قد کی شرط' },
                { key: 'workAfterMarriage', labelEn: 'Work After Marriage', labelUr: 'شادی کے بعد ملازمت' },
              ].map(({ key, labelEn, labelUr }) => {
                const currentClassification =
                  formData.preferences?.criteriaClassifications?.[key] || 'preferred';
                return (
                  <div
                    key={key}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md gap-3"
                  >
                    <div>
                      <span className="font-semibold text-sm text-[#182848] block">
                        {language === 'ur' ? labelUr : labelEn}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(['mandatory', 'preferred', 'acceptable_range', 'unknown'] as const).map((imp) => (
                        <button
                          key={imp}
                          type="button"
                          onClick={() => handleUpdateClassification(key, imp)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                            currentClassification === imp
                              ? imp === 'mandatory'
                                ? 'bg-rose-700 text-white font-bold'
                                : imp === 'preferred'
                                ? 'bg-[#182848] text-white font-bold'
                                : 'bg-[#B69A62] text-white font-bold'
                              : 'bg-[#F7F3EA] text-[#68716D] hover:text-[#252E2C]'
                          }`}
                        >
                          {imp === 'mandatory' ? 'Mandatory' : imp === 'preferred' ? 'Preferred' : imp === 'acceptable_range' ? 'Range' : 'Unknown'}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 7: Review & Final Save */}
        {currentStep === 7 && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="font-serif text-xl font-bold text-[#182848] border-b border-[#E7E2D8] pb-2">
              {t.stepReview}
            </h3>

            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[#68716D] block">Candidate:</span>
                  <span className="font-bold text-sm text-[#182848]">{formData.fullName} ({formData.age} yrs)</span>
                </div>
                <div>
                  <span className="text-[#68716D] block">Education & Career:</span>
                  <span className="font-bold text-sm text-[#182848]">{formData.education} • {formData.occupation}</span>
                </div>
                <div>
                  <span className="text-[#68716D] block">Caste & Location:</span>
                  <span className="font-bold text-sm text-[#182848]">{formData.caste} • {formData.currentCity}</span>
                </div>
                <div>
                  <span className="text-[#68716D] block">Property:</span>
                  <span className="font-bold text-sm text-[#182848]">
                    {landCalc.formattedEn} ({formData.property?.propertyType})
                  </span>
                </div>
                <div>
                  <span className="text-[#68716D] block">Siblings:</span>
                  <span className="font-bold text-sm text-[#182848]">
                    {formData.siblings?.length} records entered
                  </span>
                </div>
                <div>
                  <span className="text-[#68716D] block">Photo Privacy:</span>
                  <span className="font-bold text-sm text-emerald-700">
                    {formData.photoPermissionGranted ? 'Consent Granted for Matchmaker' : 'Withheld'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                {language === 'ur'
                  ? 'تمام کوائف محفوظ کرنے کے لیے تیار ہیں۔ رجسٹریشن کے بعد یہ پروفائل بیورو ڈائریکٹری میں شامل ہو جائے گا۔'
                  : 'Ready to register. Profile will be instantly available in Nadeem’s Matchmaker Directory for matchmaking comparisons.'}
              </span>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="mt-8 pt-4 border-t border-[#E7E2D8] flex items-center justify-between">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={handleBack}
            className={`inline-flex items-center gap-1.5 rounded-xl border border-white/20 px-4 py-2.5 text-xs font-medium transition-colors ${
              currentStep === 1 ? 'opacity-40 cursor-not-allowed text-[#68716D]' : 'bg-white/10 hover:bg-white/20 backdrop-blur-md text-[#252E2C] hover:border-[#182848]'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.btnPrevious}</span>
          </button>

          {currentStep < 7 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#182848] px-6 py-2.5 text-xs font-semibold text-[#F7F3EA] shadow-md hover:bg-[#283848] transition-all transform active:scale-95"
            >
              <span>{t.btnNext}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-7 py-3 text-xs font-bold text-white shadow-lg hover:bg-emerald-800 transition-all transform active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{t.btnSave}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
