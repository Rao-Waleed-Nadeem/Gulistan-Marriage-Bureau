import React, { useEffect, useRef, useState } from 'react';

const TOTAL_FRAMES = 300;
const FRAME_PATH_PREFIX = '/frames/frame_';
const FRAME_EXT = '.jpg';

export const ScrollAnimationBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [clarityMode, setClarityMode] = useState<'clear' | 'ultra' | 'soft'>('clear');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const images: HTMLImageElement[] = new Array(TOTAL_FRAMES);
    const loadedFlags = new Uint8Array(TOTAL_FRAMES);

    let currentScroll = 0;
    let targetScroll = 0;
    let lastRenderedIndex = -1;
    let needsResize = true;
    let animationFrameId: number;

    const getFrameUrl = (index: number) => {
      const frameNum = String(index + 1).padStart(4, '0');
      return `${FRAME_PATH_PREFIX}${frameNum}${FRAME_EXT}`;
    };

    const updateDimensions = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;

      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        needsResize = true;
      }
    };

    const drawFrame = (index: number) => {
      let img = images[index];

      // If target frame is not loaded, find closest loaded frame
      if (!img || !loadedFlags[index] || !img.complete || img.naturalWidth === 0) {
        for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
          const prev = index - offset;
          if (prev >= 0 && loadedFlags[prev] && images[prev]?.complete && images[prev]?.naturalWidth > 0) {
            img = images[prev];
            break;
          }
          const next = index + offset;
          if (next < TOTAL_FRAMES && loadedFlags[next] && images[next]?.complete && images[next]?.naturalWidth > 0) {
            img = images[next];
            break;
          }
        }
      }

      if (!img || !img.complete || img.naturalWidth === 0) return;

      const cw = canvas.width;
      const ch = canvas.height;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;

      // Cover scaling math
      const scale = Math.max(cw / nw, ch / nh);
      const dw = nw * scale;
      const dh = nh * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, nw, nh, dx, dy, dw, dh);

      lastRenderedIndex = img === images[index] ? index : -1;
    };

    const onScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll > 0) {
        targetScroll = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
      } else {
        targetScroll = 0;
      }
    };

    const renderLoop = () => {
      updateDimensions();

      const diff = targetScroll - currentScroll;
      if (Math.abs(diff) > 0.0001) {
        currentScroll += diff * 0.12;
      } else {
        currentScroll = targetScroll;
      }

      const frameFloat = currentScroll * (TOTAL_FRAMES - 1);
      const frameIndex = Math.min(Math.max(Math.round(frameFloat), 0), TOTAL_FRAMES - 1);

      if (frameIndex !== lastRenderedIndex || needsResize) {
        drawFrame(frameIndex);
        needsResize = false;
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    // Preload first frame immediately
    const firstImg = new Image();
    firstImg.src = getFrameUrl(0);
    firstImg.onload = () => {
      loadedFlags[0] = 1;
      images[0] = firstImg;
      needsResize = true;
    };
    images[0] = firstImg;

    // Asynchronously preload all remaining frames
    for (let i = 1; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFrameUrl(i);
      img.onload = () => {
        loadedFlags[i] = 1;
        if (i === Math.round(currentScroll * (TOTAL_FRAMES - 1))) {
          needsResize = true;
        }
      };
      images[i] = img;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { needsResize = true; });

    updateDimensions();
    onScroll();
    renderLoop();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', () => { needsResize = true; });
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const overlayClass = {
    clear: 'bg-[#F7F3EA]/18',
    ultra: 'bg-[#F7F3EA]/5',
    soft: 'bg-[#F7F3EA]/35',
  }[clarityMode];

  return (
    <>
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <canvas 
          ref={canvasRef} 
          className="w-full h-full block filter contrast-[1.05] brightness-[1.02]" 
        />
        {/* Crystal Clear Overlay - dramatically reduced from 75% to 18% with blur removed so background video is vivid and crisp */}
        <div className={`absolute inset-0 ${overlayClass} pointer-events-none transition-all duration-300`} />
      </div>

      {/* Floating Background Clarity Controller */}
      <div className="fixed bottom-5 end-5 z-40">
        <button
          onClick={() => {
            const nextMode = clarityMode === 'clear' ? 'ultra' : clarityMode === 'ultra' ? 'soft' : 'clear';
            setClarityMode(nextMode);
          }}
          className="flex items-center gap-2 rounded-full border border-[#B69A62]/60 bg-[#103B39]/90 px-3.5 py-1.5 text-xs font-medium text-[#F7F3EA] shadow-xl backdrop-blur-md transition-all hover:bg-[#164E4A] hover:border-[#B69A62] cursor-pointer"
          title="Click to toggle background animation clarity (Clear / Ultra / Soft)"
        >
          <span className="h-2 w-2 rounded-full bg-[#B69A62] animate-pulse" />
          <span>
            {clarityMode === 'clear' && 'Animation: Clear (82%)'}
            {clarityMode === 'ultra' && 'Animation: Ultra Clear (95%)'}
            {clarityMode === 'soft' && 'Animation: Soft (65%)'}
          </span>
        </button>
      </div>
    </>
  );
};
