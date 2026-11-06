import React, { useState } from 'react';
import { Language, Role } from '../../types';
import { signInWithPassword, sendMagicLink } from '../../lib/auth';
import { Lock, Mail, Shield, KeyRound, Sparkles, X, AlertCircle, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onSuccessRole: (role: Role) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  language,
  onSuccessRole,
}) => {
  const isUrdu = language === 'ur';
  const [authMethod, setAuthMethod] = useState<'password' | 'magic_link'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const result = authMethod === 'password'
        ? await signInWithPassword(email, password)
        : await sendMagicLink(email);

      if (result.success && result.session) {
        onSuccessRole(result.session.role);
        onClose();
      } else {
        setErrorMessage(
          isUrdu
            ? (result.error?.messageUrdu || 'لاگ اِن مکمل نہیں ہو سکا۔')
            : (result.error?.messageEn || 'Authentication could not be completed.')
        );
      }
    } catch {
      setErrorMessage(isUrdu ? 'غیر متوقع خرابی پیش آئی۔' : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-[#0e1e38]/95 border border-[#486878]/40 shadow-2xl text-[#F7F3EA] p-6 sm:p-8"
        dir={isUrdu ? 'rtl' : 'ltr'}
      >
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          aria-label={isUrdu ? 'بند کریں' : 'Close'}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#182848] border border-[#B69A62]/30 text-[#B69A62] shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-[#F7F3EA] tracking-wide">
              {isUrdu ? 'محفوظ اکاؤنٹ لاگ اِن' : 'Secure Account Sign In'}
            </h2>
            <p className="text-xs text-[#98b8c8]">
              {isUrdu ? 'بیورو اسٹاف اور امیدوار خاندانوں کے لیے' : 'For bureau staff and candidate families'}
            </p>
          </div>
        </div>

        <div className="flex p-1 mb-6 rounded-xl bg-black/40 border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => { setAuthMethod('password'); setErrorMessage(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all ${authMethod === 'password' ? 'bg-[#182848] text-[#F7F3EA] shadow-sm border border-[#B69A62]/40 font-semibold' : 'text-white/60 hover:text-white'}`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            {isUrdu ? 'اسٹاف پاس ورڈ' : 'Staff Password'}
          </button>
          <button
            type="button"
            onClick={() => { setAuthMethod('magic_link'); setErrorMessage(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all ${authMethod === 'magic_link' ? 'bg-[#182848] text-[#F7F3EA] shadow-sm border border-[#B69A62]/40 font-semibold' : 'text-white/60 hover:text-white'}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isUrdu ? 'فیملی میجک لنک' : 'Family Magic Link'}
          </button>
        </div>

        {errorMessage && (
          <div role="alert" className="flex items-start gap-2.5 p-3 mb-4 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#d8e8f0] mb-1.5">
              {isUrdu ? 'ای میل پتہ' : 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="absolute top-3 inset-inline-start-3 w-4 h-4 text-white/40" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isUrdu ? 'اپنا ای میل پتہ درج کریں' : 'Enter your email address'}
                className="w-full py-2.5 ps-10 pe-3 rounded-xl bg-black/30 border border-white/15 focus:border-[#B69A62] focus:ring-1 focus:ring-[#B69A62] text-sm text-[#F7F3EA] placeholder:text-white/30 transition-all outline-none"
              />
            </div>
          </div>

          {authMethod === 'password' && (
            <div>
              <label className="block text-xs font-medium text-[#d8e8f0] mb-1.5">
                {isUrdu ? 'پاس ورڈ' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="absolute top-3 inset-inline-start-3 w-4 h-4 text-white/40" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full py-2.5 ps-10 pe-3 rounded-xl bg-black/30 border border-white/15 focus:border-[#B69A62] focus:ring-1 focus:ring-[#B69A62] text-sm text-[#F7F3EA] placeholder:text-white/30 transition-all outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#182848] to-[#243b68] hover:from-[#243b68] hover:to-[#182848] text-[#F7F3EA] font-semibold text-sm border border-[#B69A62]/40 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span aria-label={isUrdu ? 'لوڈ ہو رہا ہے' : 'Loading'} className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{authMethod === 'password' ? (isUrdu ? 'لاگ اِن کریں' : 'Sign In with Password') : (isUrdu ? 'میجک لنک بھیجیں' : 'Send Magic Link')}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </>
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-xs leading-relaxed text-white/55">
          {isUrdu
            ? 'تصدیق شدہ لاگ اِن سروس ابھی دستیاب نہیں۔ فی الحال کوئی ڈیمو اکاؤنٹ یا جعلی لاگ اِن فعال نہیں ہے۔'
            : 'Verified sign-in is not configured yet. Demo accounts and simulated sign-in are disabled.'}
        </p>
      </div>
    </div>
  );
};
