import React, { useEffect, useRef, useState, useCallback } from 'react';

const TOTAL_FRAMES = 300;
const FRAME_PATH_PREFIX = '/frames/frame_';
const FRAME_EXT = '.jpg';
const INITIAL_PRELOAD_COUNT = 24; // Immediate concurrent preload batch
const LERP_FACTOR = 0.24; // Snappy, silky interpolation without sluggish lag

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
    const loadingPromises: { [key: number]: Promise<void> | undefined } = {};

    let currentScroll = 0;
    let targetScroll = 0;
    let lastRenderedIndex = -1;
    let animationFrameId: number | null = null;
    let isCancelled = false;
    let isPageVisible = !document.hidden;

    // Cached dimensions to prevent layout thrashing on every frame
    let cachedW = 0;
    let cachedH = 0;
    let cachedMaxScroll = 1;

    // Check reduced motion preference
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = motionQuery.matches;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches;
      if (prefersReducedMotion) {
        targetScroll = 0;
        currentScroll = 0;
        drawFrame(0);
      }
    };
    motionQuery.addEventListener('change', handleMotionChange);

    const getFrameUrl = (index: number) => {
      const frameNum = String(index + 1).padStart(4, '0');
      return `${FRAME_PATH_PREFIX}${frameNum}${FRAME_EXT}`;
    };

    // Calculate canvas resolution and max scroll only when window resizes
    const updateDimensions = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;

      const targetW = Math.round(w * dpr);
      const targetH = Math.round(h * dpr);

      cachedW = targetW;
      cachedH = targetH;
      cachedMaxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        lastRenderedIndex = -1; // Force repaint
      }
    };

    // Robust frame drawing with sub-millisecond closest-frame fallback
    const drawFrame = (index: number) => {
      let img = images[index];

      // If requested frame is not yet fully decoded, find nearest available neighbor
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

      // Cover scaling calculation with centered alignment
      const scale = Math.max(cw / nw, ch / nh);
      const dw = nw * scale;
      const dh = nh * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      ctx.drawImage(img, 0, 0, nw, nh, dx, dy, dw, dh);

      lastRenderedIndex = img === images[index] ? index : -1;
    };

    // Frame loader with async decode and duplicate-request deduplication
    const loadFrame = (index: number): Promise<void> => {
      if (index < 0 || index >= TOTAL_FRAMES) return Promise.resolve();
      if (loadedFlags[index] && images[index]) return Promise.resolve();
      const existing = loadingPromises[index];
      if (existing) return existing;

      const p = new Promise<void>((resolve) => {
        const img = new Image();
        img.src = getFrameUrl(index);
        images[index] = img;

        img.onload = () => {
          if (isCancelled) return resolve();
          if ('decode' in img) {
            img.decode()
              .then(() => {
                if (!isCancelled) {
                  loadedFlags[index] = 1;
                  // If we are currently needing this frame, trigger a redraw
                  if (lastRenderedIndex === -1 || Math.abs(currentScroll * (TOTAL_FRAMES - 1) - index) < 1.5) {
                    drawFrame(index);
                  }
                }
                resolve();
              })
              .catch(() => {
                if (!isCancelled) {
                  loadedFlags[index] = 1;
                }
                resolve();
              });
          } else {
            loadedFlags[index] = 1;
            resolve();
          }
        };

        img.onerror = () => {
          resolve();
        };
      });

      loadingPromises[index] = p;
      return p;
    };

    // Prioritize loading frames in the vicinity of target frame
    const requestFrameNeighborhood = (targetIdx: number) => {
      const radius = 6;
      for (let i = -2; i <= radius; i++) {
        const idx = targetIdx + i;
        if (idx >= 0 && idx < TOTAL_FRAMES && !loadedFlags[idx]) {
          loadFrame(idx);
        }
      }
    };

    // Loop execution driven by scroll movement
    const step = () => {
      if (!isPageVisible || isCancelled) return;

      let isMoving = false;

      if (prefersReducedMotion) {
        currentScroll = 0;
      } else {
        const diff = targetScroll - currentScroll;
        if (Math.abs(diff) > 0.0001) {
          currentScroll += diff * LERP_FACTOR;
          isMoving = true;
        } else {
          currentScroll = targetScroll;
        }
      }

      const frameFloat = currentScroll * (TOTAL_FRAMES - 1);
      const frameIndex = Math.min(Math.max(Math.round(frameFloat), 0), TOTAL_FRAMES - 1);

      // Preload upcoming frames in scroll direction
      requestFrameNeighborhood(frameIndex);

      if (frameIndex !== lastRenderedIndex) {
        drawFrame(frameIndex);
      }

      if (isMoving) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        animationFrameId = null;
      }
    };

    const scheduleStep = () => {
      if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    const onScroll = () => {
      if (prefersReducedMotion) {
        targetScroll = 0;
        return;
      }
      const scrollY = window.scrollY;
      targetScroll = Math.min(Math.max(scrollY / cachedMaxScroll, 0), 1);
      scheduleStep();
    };

    const onResize = () => {
      updateDimensions();
      onScroll();
      drawFrame(Math.min(Math.max(Math.round(currentScroll * (TOTAL_FRAMES - 1)), 0), TOTAL_FRAMES - 1));
    };

    // Visibility change handler (pause when tab is hidden)
    const onVisibilityChange = () => {
      isPageVisible = !document.hidden;
      if (isPageVisible) {
        updateDimensions();
        scheduleStep();
      } else if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };

    // 1. Initial immediate parallel preload of hero frames (0..INITIAL_PRELOAD_COUNT)
    const initialBatch = Array.from({ length: INITIAL_PRELOAD_COUNT }, (_, i) => i);
    Promise.all(initialBatch.map(loadFrame)).then(() => {
      if (!isCancelled) {
        drawFrame(0);
      }
    });

    // 2. Idle background preloading for remaining frames in progressive batches
    let idleCursor = INITIAL_PRELOAD_COUNT;
    const preloadRemaining = () => {
      if (isCancelled || idleCursor >= TOTAL_FRAMES) return;
      const batch: number[] = [];
      for (let i = 0; i < 8 && idleCursor < TOTAL_FRAMES; i++, idleCursor++) {
        batch.push(idleCursor);
      }
      Promise.all(batch.map(loadFrame)).then(() => {
        if (!isCancelled && idleCursor < TOTAL_FRAMES) {
          if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(preloadRemaining);
          } else {
            setTimeout(preloadRemaining, 40);
          }
        }
      });
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(preloadRemaining);
    } else {
      setTimeout(preloadRemaining, 200);
    }

    updateDimensions();
    onScroll();
    scheduleStep();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      isCancelled = true;
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      motionQuery.removeEventListener('change', handleMotionChange);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
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
          className="w-full h-full block" 
        />
        {/* Crystal Clear Overlay with frosted balance */}
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
