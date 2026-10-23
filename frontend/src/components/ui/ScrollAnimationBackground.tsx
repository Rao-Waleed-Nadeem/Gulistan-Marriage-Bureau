import React, { useEffect, useRef, useState } from 'react';

const TOTAL_FRAMES = 300;
const FRAME_PATH_PREFIX = '/frames/frame_';
const FRAME_EXT = '.jpg';
const INITIAL_PRELOAD_COUNT = 30; // Preload hero frames immediately for instant smoothness

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
    let isPageVisible = true;
    let isCancelled = false;

    // Check reduced motion preference (agent-prompt.md Section 13)
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = motionQuery.matches;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches;
    };
    motionQuery.addEventListener('change', handleMotionChange);

    const getFrameUrl = (index: number) => {
      const frameNum = String(index + 1).padStart(4, '0');
      return `${FRAME_PATH_PREFIX}${frameNum}${FRAME_EXT}`;
    };

    const updateDimensions = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;

      const targetW = Math.round(w * dpr);
      const targetH = Math.round(h * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        needsResize = true;
      }
    };

    const drawFrame = (index: number) => {
      let img = images[index];

      // If target frame is not ready, locate the closest available loaded frame
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

      // Cover scaling calculation with deliberate centering
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
      if (prefersReducedMotion) {
        targetScroll = 0; // Stable view for reduced motion
        return;
      }
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll > 0) {
        targetScroll = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
      } else {
        targetScroll = 0;
      }
    };

    const renderLoop = () => {
      if (!isPageVisible) return;

      updateDimensions();

      if (prefersReducedMotion) {
        currentScroll = 0;
      } else {
        const diff = targetScroll - currentScroll;
        // Restrained smooth damping (lerp) prevents jerky jumps during rapid scrolls
        if (Math.abs(diff) > 0.0001) {
          currentScroll += diff * 0.10;
        } else {
          currentScroll = targetScroll;
        }
      }

      const frameFloat = currentScroll * (TOTAL_FRAMES - 1);
      const frameIndex = Math.min(Math.max(Math.round(frameFloat), 0), TOTAL_FRAMES - 1);

      if (frameIndex !== lastRenderedIndex || needsResize) {
        drawFrame(frameIndex);
        needsResize = false;
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    // Helper to safely load and decode a frame off the main thread
    const loadFrame = (index: number): Promise<void> => {
      return new Promise((resolve) => {
        if (isCancelled || images[index]) {
          resolve();
          return;
        }
        const img = new Image();
        img.src = getFrameUrl(index);
        img.onload = () => {
          if (isCancelled) return;
          if ('decode' in img) {
            img.decode().then(() => {
              if (isCancelled) return;
              loadedFlags[index] = 1;
              images[index] = img;
              needsResize = true;
              resolve();
            }).catch(() => {
              loadedFlags[index] = 1;
              images[index] = img;
              needsResize = true;
              resolve();
            });
          } else {
            loadedFlags[index] = 1;
            images[index] = img;
            needsResize = true;
            resolve();
          }
        };
        img.onerror = () => resolve();
        images[index] = img;
      });
    };

    // 1. Preload initial priority window (0..INITIAL_PRELOAD_COUNT)
    const preloadInitialFrames = async () => {
      for (let i = 0; i < Math.min(INITIAL_PRELOAD_COUNT, TOTAL_FRAMES); i++) {
        if (isCancelled) break;
        await loadFrame(i);
      }

      // 2. Progressive background batching for remaining frames
      let currentIdx = INITIAL_PRELOAD_COUNT;
      const batchSize = 8;

      const loadNextBatch = () => {
        if (isCancelled || currentIdx >= TOTAL_FRAMES) return;
        const promises = [];
        for (let i = 0; i < batchSize && currentIdx < TOTAL_FRAMES; i++, currentIdx++) {
          promises.push(loadFrame(currentIdx));
        }
        Promise.all(promises).then(() => {
          if (!isCancelled && currentIdx < TOTAL_FRAMES) {
            if ('requestIdleCallback' in window) {
              (window as any).requestIdleCallback(loadNextBatch);
            } else {
              setTimeout(loadNextBatch, 25);
            }
          }
        });
      };

      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(loadNextBatch);
      } else {
        setTimeout(loadNextBatch, 50);
      }
    };

    // Visibility change handler (pause animation when tab is inactive)
    const onVisibilityChange = () => {
      isPageVisible = !document.hidden;
      if (isPageVisible) {
        needsResize = true;
        animationFrameId = requestAnimationFrame(renderLoop);
      } else {
        cancelAnimationFrame(animationFrameId);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { needsResize = true; });
    document.addEventListener('visibilitychange', onVisibilityChange);

    updateDimensions();
    onScroll();
    preloadInitialFrames();
    renderLoop();

    return () => {
      isCancelled = true;
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', () => { needsResize = true; });
      document.removeEventListener('visibilitychange', onVisibilityChange);
      motionQuery.removeEventListener('change', handleMotionChange);
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
          className="flex items-center gap-2 rounded-full border border-[#B69A62]/60 bg-[#182848]/90 px-3.5 py-1.5 text-xs font-medium text-[#F7F3EA] shadow-xl backdrop-blur-md transition-all hover:bg-[#283848] hover:border-[#B69A62] cursor-pointer"
          title="Click to toggle background animation clarity (Clear / Ultra / Soft)"
        >
          <span className="h-2 w-2 rounded-full bg-[#B69A62] animate-pulse" />
          <span>
            {clarityMode === 'clear' && 'Background: Clear (82%)'}
            {clarityMode === 'ultra' && 'Background: Ultra Clear (95%)'}
            {clarityMode === 'soft' && 'Background: Soft (65%)'}
          </span>
        </button>
      </div>
    </>
  );
};
