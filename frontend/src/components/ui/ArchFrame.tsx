import React from 'react';
import { Sparkles, Film } from 'lucide-react';

interface ArchFrameProps {
  children?: React.ReactNode;
  showVideoPlaceholder?: boolean;
  className?: string;
  badgeText?: string;
}

export const ArchFrame: React.FC<ArchFrameProps> = ({
  children,
  showVideoPlaceholder = false,
  className = '',
  badgeText = 'Bespoke Matchmaking Concierge',
}) => {
  return (
    <div className={`relative mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-[#B69A62]/30 bg-gradient-to-b from-[#103B39] via-[#164E4A] to-[#0D2D2B] p-4 sm:p-8 text-[#F7F3EA] shadow-2xl shadow-[#103B39]/30 ${className}`}>
      {/* Decorative Botanical & Architectural Vector Arches in Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
        <svg
          className="absolute -top-12 left-1/2 -translate-x-1/2 w-[700px] h-[700px] text-[#B69A62]"
          viewBox="0 0 500 500"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          {/* Layered Architectural Multi-Arches inspired by the Gulistan reference */}
          <path d="M50,450 C50,220 140,50 250,50 C360,50 450,220 450,450" />
          <path d="M80,450 C80,240 160,90 250,90 C340,90 420,240 420,450" />
          <path d="M110,450 C110,260 180,130 250,130 C320,130 390,260 390,450" />
          <path d="M140,450 C140,280 190,170 250,170 C310,170 360,280 360,450" />
          {/* Center luminous keystone ornament */}
          <circle cx="250" cy="50" r="8" fill="#B69A62" />
          <path d="M250,30 L250,70 M230,50 L270,50" />
          {/* Botanical foliate lines */}
          <path d="M250,170 Q230,220 180,250 Q230,280 250,330 Q270,280 320,250 Q270,220 250,170 Z" fill="#B69A62" fillOpacity="0.1" />
        </svg>
      </div>

      {/* Foreground Container with Arch Silhouette */}
      <div className="relative z-10 flex flex-col items-center">
        {badgeText && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#B69A62]/50 bg-[#103B39]/80 px-4 py-1.5 text-xs uppercase tracking-widest text-[#B69A62] shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-[#B69A62]" />
            <span>{badgeText}</span>
          </div>
        )}

        {children}

        {/* Future Video Asset Placeholder (Clearly identified per requirement 2.2 & 6.2) */}
        {showVideoPlaceholder && (
          <div className="mt-8 w-full max-w-3xl overflow-hidden rounded-2xl border border-[#B69A62]/40 bg-[#0D2D2B]/90 backdrop-blur-sm p-6 sm:p-8 text-center transition-all hover:border-[#B69A62]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#B69A62]/50 bg-[#164E4A] text-[#B69A62] shadow-lg">
              <Film className="h-6 w-6" />
            </div>
            <h4 className="font-serif text-xl sm:text-2xl font-medium text-[#F7F3EA] mb-2 tracking-wide">
              Architectural Passage Presentation
            </h4>
            <p className="mx-auto max-w-lg text-sm text-[#DCE6DE]/80 leading-relaxed mb-4">
              A designated visual sanctuary: The high-definition 4K architectural animation walkthrough sequence will be integrated here in the upcoming release.
            </p>
            <div className="inline-flex items-center gap-2 text-xs text-[#B69A62] border border-[#B69A62]/30 bg-[#103B39] px-3.5 py-1.5 rounded-full font-mono">
              <span className="h-2 w-2 rounded-full bg-[#B69A62] animate-pulse"></span>
              Future Video Container Ready • Aspect Ratio 16:9 • Optimized Stills Active
            </div>
          </div>
        )}
      </div>

      {/* Golden Corner Accents */}
      <div className="pointer-events-none absolute top-3 left-3 h-5 w-5 border-t border-l border-[#B69A62]/60"></div>
      <div className="pointer-events-none absolute top-3 right-3 h-5 w-5 border-t border-r border-[#B69A62]/60"></div>
      <div className="pointer-events-none absolute bottom-3 left-3 h-5 w-5 border-b border-l border-[#B69A62]/60"></div>
      <div className="pointer-events-none absolute bottom-3 right-3 h-5 w-5 border-b border-r border-[#B69A62]/60"></div>
    </div>
  );
};
