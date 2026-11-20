import React, { useState, useEffect } from 'react';
import { Language } from '../../types';
import { translations } from '../../i18n/translations';
import { redeemShareGrantAsync, AuthorizedDisclosureSnapshot } from '../../lib/disclosure';
import { resolveCandidatePhotoUrl } from '../../lib/photos';
import { ShieldCheck, ShieldAlert, Clock, ArrowLeft, Lock } from 'lucide-react';

interface SecurePhotoViewerProps {
  token: string;
  scope?: string;
  language: Language;
  onClose: () => void;
}

export const SecurePhotoViewer: React.FC<SecurePhotoViewerProps> = ({
  token,
  scope,
  language,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<AuthorizedDisclosureSnapshot | null>(null);
  const [resolvedPhotoUrl, setResolvedPhotoUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    async function verifyAndLoad() {
      setLoading(true);
      try {
        const result = await redeemShareGrantAsync(token);
        if (!isMounted) return;

        if (result.valid && result.snapshot) {
          setIsValid(true);
          setSnapshot(result.snapshot);
          setExpiresAt(result.snapshot.expiresAt);

          const rawPhoto = result.snapshot.disclosedData.photoGrantUrl;
          if (rawPhoto) {
            const signed = await resolveCandidatePhotoUrl(rawPhoto);
            if (isMounted) setResolvedPhotoUrl(signed);
          }
        } else {
          setIsValid(false);
          setReason(result.reason || 'missing');
        }
      } catch (err) {
        if (isMounted) {
          setIsValid(false);
          setReason('validation_error');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (token) {
      verifyAndLoad();
    } else {
      setLoading(false);
      setIsValid(false);
      setReason('missing');
    }

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Expiration countdown
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const remainingMs = new Date(expiresAt).getTime() - Date.now();
      if (remainingMs <= 0) {
        setTimeRemaining('Expired');
        setIsValid(false);
        setReason('expired');
        clearInterval(interval);
      } else {
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`${hours}h ${minutes}m`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const candidateId = snapshot?.candidateId || scope || 'Confidential';

  return (
    <div className="min-h-screen bg-[#0F1B29] text-[#F7F3EA] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#182848]/90 border border-[#B69A62]/30 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Anti-tamper header badge */}
        <div className="flex items-center justify-between border-b border-[#B69A62]/20 pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-[#B69A62]" />
            <div>
              <h2 className="text-sm font-bold tracking-wider uppercase text-[#B69A62]">
                Gulistan Marriage Bureau
              </h2>
              <p className="text-[11px] text-[#A69C8A]">
                {language === 'ur'
                  ? 'محفوظ تعارفی فوٹو پورٹل (OPEN-006)'
                  : 'Protected Introduction Photo Portal'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs text-[#A69C8A] hover:text-[#F7F3EA] transition-colors p-1.5 rounded-lg border border-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{language === 'ur' ? 'واپس' : 'Return'}</span>
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[#B69A62] border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-xs text-[#A69C8A]">
              {language === 'ur'
                ? 'اجازت نامہ اور سیکیورٹی کی تصدیق کی جا رہی ہے...'
                : 'Verifying cryptographic grant & candidate consent...'}
            </p>
          </div>
        ) : isValid ? (
          <div className="space-y-6">
            {/* Countdown and Candidate Badge */}
            <div className="flex items-center justify-between bg-black/30 rounded-2xl p-3 border border-white/10 text-xs">
              <div>
                <span className="text-[#A69C8A] block text-[10px]">Candidate ID:</span>
                <span className="font-mono font-bold text-[#F7F3EA]">{candidateId}</span>
              </div>
              {timeRemaining && (
                <div className="flex items-center gap-1.5 text-amber-300">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-mono font-medium">{timeRemaining} remaining</span>
                </div>
              )}
            </div>

            {/* Candidate Photo Container */}
            <div className="relative rounded-2xl overflow-hidden border border-[#B69A62]/40 bg-black/40 aspect-[3/4] flex items-center justify-center group shadow-inner">
              {resolvedPhotoUrl ? (
                <img
                  src={resolvedPhotoUrl}
                  alt={`Candidate ${candidateId}`}
                  className="w-full h-full object-cover select-none pointer-events-none"
                  onContextMenu={(e) => e.preventDefault()}
                />
              ) : (
                <div className="text-center p-6 text-gray-400">
                  <Lock className="w-8 h-8 mx-auto mb-2 text-[#B69A62]" />
                  <p className="text-xs">
                    {language === 'ur'
                      ? 'تصویر لوڈ نہیں ہو سکی یا صرف باہمی منظوری پر دستیاب ہے۔'
                      : 'Photo preview unavailable or gated behind mutual consent.'}
                  </p>
                </div>
              )}

              {/* Watermark Overlay for anti-leak protection */}
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 bg-gradient-to-t from-black/60 via-transparent to-black/30 text-[10px] text-white/50 select-none">
                <span className="tracking-widest uppercase">GMB Confidential • {candidateId}</span>
                <span className="text-center tracking-wider opacity-75">
                  Family Introduction View Only • Do Not Disclose
                </span>
              </div>
            </div>

            {/* Candidate Metadata Summary */}
            {snapshot && (
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2 text-xs">
                {snapshot.disclosedData.name && (
                  <div className="flex justify-between">
                    <span className="text-[#A69C8A]">Candidate:</span>
                    <span className="font-medium text-[#F7F3EA]">{snapshot.disclosedData.name}</span>
                  </div>
                )}
                {snapshot.disclosedData.age && (
                  <div className="flex justify-between">
                    <span className="text-[#A69C8A]">Age & Height:</span>
                    <span className="font-medium text-[#F7F3EA]">
                      {snapshot.disclosedData.age} yrs • {snapshot.disclosedData.height || '—'}
                    </span>
                  </div>
                )}
                {snapshot.disclosedData.education && (
                  <div className="flex justify-between">
                    <span className="text-[#A69C8A]">Education:</span>
                    <span className="font-medium text-[#F7F3EA]">{snapshot.disclosedData.education}</span>
                  </div>
                )}
                {snapshot.disclosedData.city && (
                  <div className="flex justify-between">
                    <span className="text-[#A69C8A]">Location:</span>
                    <span className="font-medium text-[#F7F3EA]">{snapshot.disclosedData.city}</span>
                  </div>
                )}
              </div>
            )}

            {/* Privacy Guarantee Notice */}
            <p className="text-[11px] text-center text-[#A69C8A] leading-relaxed">
              {language === 'ur'
                ? 'یہ تصویر رازداری کے اصولوں (OPEN-006) کے تحت جاری کی گئی ہے اور ۴۸ گھنٹوں بعد خودکار طور پر غیر فعال ہو جائے گی۔'
                : 'This photograph is shared under strict 48-hour privacy constraints (OPEN-006) and will automatically deactivate after expiration.'}
            </p>
          </div>
        ) : (
          /* Invalid / Expired / Revoked Notice */
          <div className="py-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-red-200">
                {language === 'ur' ? 'لنک دستیاب نہیں ہے' : 'Photo Link Unavailable'}
              </h3>
              <p className="text-xs text-[#A69C8A] mt-2 max-w-sm mx-auto leading-relaxed">
                {reason === 'expired'
                  ? language === 'ur'
                    ? 'خاندانی وقار اور رازداری کے تحفظ کی خاطر یہ تعارفی لنک اپنی ۴۸ گھنٹے کی مدت پوری ہونے پر غیر فعال ہو چکا ہے۔'
                    : 'To protect family dignity and privacy, this introduction link has expired after its 48-hour validity period.'
                  : reason === 'revoked'
                  ? language === 'ur'
                    ? 'امیدوار کے خاندان کی درخواست پر یہ تعارفی لنک منسوخ کر دیا گیا ہے۔'
                    : 'This introduction link has been revoked upon request by the candidate family.'
                  : reason === 'consent_withdrawn'
                  ? language === 'ur'
                    ? 'امیدوار کی جانب سے تصویر شیئر کرنے کی اجازت واپس لے لی گئی ہے۔'
                    : 'Candidate photo sharing consent has been withdrawn.'
                  : language === 'ur'
                  ? 'غلط یا نامکمل لنک۔ براہِ کرم ندیم احمد صاحب یا بیورو کے دفتر سے رابطہ فرمائیں۔'
                  : 'Invalid or missing link. Please contact Nadeem Ahmed or Gulistan Marriage Bureau concierge.'}
              </p>
            </div>

            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-xl bg-[#B69A62] text-[#0F1B29] font-semibold text-xs hover:bg-[#C9AE76] transition-colors"
            >
              {language === 'ur' ? 'مرکزی صفحہ پر جائیں' : 'Go to Homepage'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
