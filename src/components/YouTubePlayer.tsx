import React, { useEffect, useRef, useState } from 'react';
import { Scene, AdFormatType, DeviceType } from '../types';
import { Play, SkipForward, Info, Bell, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';

interface YouTubePlayerProps {
  scene: Scene;
  device: DeviceType;
  onEnded: (sceneId: string) => void;
  onSkipPod?: () => void;
  isLastInPod?: boolean;
  isLastSkippableInPod?: boolean;
  podRemainingTime?: number;
  isPlaying?: boolean;
  isMuted?: boolean;
  videoScale?: number;
  adIndex?: number;
  adTotal?: number;
  hasSkippableInPod?: boolean;
  hasNextSkippableAd?: boolean;
  podSkipTotalDuration?: number;
  totalPodRemainingTime?: number;
  onPlay?: () => void;
  onPause?: () => void;
  isFinished?: boolean;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  scene,
  device,
  onEnded,
  onSkipPod,
  isLastInPod,
  isLastSkippableInPod = false,
  podRemainingTime = 0,
  isPlaying = true,
  isMuted = true,
  videoScale = 1.0,
  adIndex = 0,
  adTotal = 0,
  hasSkippableInPod = false,
  hasNextSkippableAd = false,
  podSkipTotalDuration = 0,
  totalPodRemainingTime = 0,
  onPlay,
  onPause,
  isFinished = false,
}) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isApiReady, setIsApiReady] = useState(!!(window.YT && window.YT.Player));
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [isCtaHovered, setIsCtaHovered] = useState(false);
  const [uiScale, setUiScale] = useState(1);
  const [hasStarted, setHasStarted] = useState(false);
  const [bgGradientTop, setBgGradientTop] = useState<string>('#082833');
  const [bgGradientBottom, setBgGradientBottom] = useState<string>('#020A0D');
  const [qrMatrix, setQrMatrix] = useState<number[][] | null>(null);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setHasStarted(false);
  }, [scene.id]);

  // Use refs for callbacks to avoid stale closures in YT events and intervals
  const onEndedRef = useRef(onEnded);
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  const onSkipPodRef = useRef(onSkipPod);
  const sceneRef = useRef(scene);

  useEffect(() => {
    onEndedRef.current = onEnded;
    onPlayRef.current = onPlay;
    onPauseRef.current = onPause;
    onSkipPodRef.current = onSkipPod;
    sceneRef.current = scene;
  }, [onEnded, onPlay, onPause, onSkipPod, scene]);

  // Extract Video ID
  const getVideoId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (!scene) return null;

  const videoId = getVideoId(scene.youtubeUrl);

  useEffect(() => {
    const generateQR = async () => {
      try {
        const url = scene.displayUrl ? (scene.displayUrl.startsWith('http') ? scene.displayUrl : `https://${scene.displayUrl}`) : 'https://www.youtube.com';
        const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
        const size = qr.modules.size;
        const data = qr.modules.data;
        const matrix: number[][] = [];
        for (let i = 0; i < size; i++) {
          const row: number[] = [];
          for (let j = 0; j < size; j++) {
            row.push(data[i * size + j]);
          }
          matrix.push(row);
        }
        setQrMatrix(matrix);
      } catch (err) {
        console.error('QR Generation Error:', err);
      }
    };
    generateQR();
  }, [scene.youtubeUrl, scene.displayUrl]);

  useEffect(() => {
    if (!scene.advertiserLogoUrl) {
      setBgGradientTop('#082833');
      setBgGradientBottom('#020A0D');
      return;
    }

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = scene.advertiserLogoUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      canvas.width = 1;
      canvas.height = 1;
      ctx.drawImage(img, 0, 0, 1, 1);
      
      try {
        const data = ctx.getImageData(0, 0, 1, 1).data;
        const r = data[0] / 255;
        const g = data[1] / 255;
        const b = data[2] / 255;
        
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s, l = (max + min) / 2;

        if (max === min) {
          h = s = 0;
        } else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }

        const hue = h * 360;
        const saturation = s * 100;
        setBgGradientTop(`hsl(${hue}, ${Math.min(100, saturation * 1.2)}%, 12%)`);
        setBgGradientBottom(`hsl(${hue}, ${Math.min(100, saturation * 1.5)}%, 4%)`);
      } catch (e) {
        setBgGradientTop('#082833');
        setBgGradientBottom('#020A0D');
      }
    };
    img.onerror = () => {
      setBgGradientTop('#082833');
      setBgGradientBottom('#020A0D');
    };
  }, [scene.advertiserLogoUrl]);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateScale = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.offsetWidth;
      const newScale = Math.min(1.31, Math.max(0.44, (width / 1280) * 1.09));
      setUiScale(newScale);
    };

    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    updateScale();
    
    return () => observer.disconnect();
  }, []);

  const elapsedTime = Math.max(0, currentTime - (scene.startTime || 0));
  const isSqueezeback = scene.adFormat === AdFormatType.SQUEEZEBACK_QR;
  const isSqueezed = isSqueezeback && elapsedTime >= 5;

  useEffect(() => {
    if (isPlaying && isPlayerReady && !hasStarted) {
      setHasStarted(true);
    }
  }, [isPlaying, isPlayerReady, hasStarted]);

  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsApiReady(true);
      return;
    }

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        setIsApiReady(true);
      };
    } else {
      const checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          setIsApiReady(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }
  }, []);

  // Initialize Player (Once)
  useEffect(() => {
    if (!isApiReady || !videoId || !containerRef.current || playerRef.current) return;

    const playerElementId = 'main-youtube-player';
    const element = document.getElementById(playerElementId);
    if (!element) return;

    playerRef.current = new window.YT.Player(playerElementId, {
      height: '100%',
      width: '100%',
      videoId: videoId,
      playerVars: {
        autoplay: isPlaying ? 1 : 0,
        mute: isMuted ? 1 : 0,
        controls: 0,
        rel: 0,
        showinfo: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        disablekb: 1,
        fs: 0,
        start: scene.startTime || 0,
        enablejsapi: 1,
        origin: window.location.origin,
        widget_referrer: window.location.href,
      },
      events: {
        onReady: (event: any) => {
          if (!event.target) return;
          setIsPlayerReady(true);
          try {
            setDuration(event.target.getDuration?.() || 0);
            setCurrentVideoId(videoId);
            if (isMuted) event.target.mute?.();
            else event.target.unMute?.();
            if (isPlaying) event.target.playVideo?.();
          } catch (e) {}
        },
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.PAUSED) {
            onPauseRef.current?.();
          }
          if (event.data === window.YT.PlayerState.PLAYING) {
            onPlayRef.current?.();
            setHasStarted(true);
          }
          if (event.data === window.YT.PlayerState.ENDED) {
            onEndedRef.current(sceneRef.current.id);
          }
        },
        onError: () => onEndedRef.current(sceneRef.current.id),
      },
    });

    const interval = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const time = playerRef.current.getCurrentTime();
          if (typeof time === 'number' && !isNaN(time)) {
            setCurrentTime(time);
          }
          
          const videoDuration = playerRef.current.getDuration?.();
          if (typeof videoDuration === 'number' && videoDuration > 0) {
            setDuration(prev => prev !== videoDuration ? videoDuration : prev);
          }

          const currentScene = sceneRef.current;
          if (currentScene.type === 'CONTENT' && currentScene.contentDuration && currentScene.contentDuration > 0) {
            const elapsed = time - (currentScene.startTime || 0);
            if (elapsed >= currentScene.contentDuration) {
              onEndedRef.current(currentScene.id);
            }
          }
        } catch (e) {}
      }
    }, 100);

    return () => {
      clearInterval(interval);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
      }
    };
  }, [isApiReady]);

  useEffect(() => {
    if (isPlayerReady && playerRef.current && videoId) {
      try {
        if (isPlaying && typeof playerRef.current.loadVideoById === 'function') {
          playerRef.current.loadVideoById({
            videoId: videoId,
            startSeconds: scene.startTime || 0,
          });
          setHasStarted(true);
        } else if (typeof playerRef.current.cueVideoById === 'function') {
          playerRef.current.cueVideoById({
            videoId: videoId,
            startSeconds: scene.startTime || 0,
          });
        }
        
        setCurrentVideoId(videoId);
        setDuration(0);
        setCurrentTime(scene.startTime || 0);
      } catch (e) {
        console.error('Error changing video:', e);
      }
    }
  }, [scene.id, isPlayerReady, videoId]); // Removed isPlaying from deps to avoid double-loading, handled by sync effect

  // Sync Play/Pause/Mute
  useEffect(() => {
    if (playerRef.current && isPlayerReady) {
      try {
        const state = typeof playerRef.current.getPlayerState === 'function' ? playerRef.current.getPlayerState() : null;
        if (isPlaying && state !== window.YT.PlayerState.PLAYING) {
          playerRef.current.playVideo?.();
          // If we are playing, we should eventually see the video
          if (!hasStarted) {
            const checkStarted = setTimeout(() => {
              if (isPlaying && playerRef.current) {
                const curState = typeof playerRef.current.getPlayerState === 'function' ? playerRef.current.getPlayerState() : null;
                if (curState === window.YT.PlayerState.PLAYING) {
                  setHasStarted(true);
                }
              }
            }, 500);
            return () => clearTimeout(checkStarted);
          }
        } else if (!isPlaying && state === window.YT.PlayerState.PLAYING) {
          playerRef.current.pauseVideo?.();
        }
        
        if (isMuted) playerRef.current.mute?.();
        else playerRef.current.unMute?.();
      } catch (e) {}
    }
  }, [isPlaying, isMuted, isPlayerReady, hasStarted]);

  const handleSkip = () => {
    if (hasNextSkippableAd) {
      onEndedRef.current(sceneRef.current.id);
    } else if (onSkipPodRef.current) {
      onSkipPodRef.current();
    } else {
      onEndedRef.current(sceneRef.current.id);
    }
  };

  const renderOverlays = () => {
    if (scene.type !== 'AD') return null;

    const skipOffset = scene.skipOffset || 5;
    const canSkip = elapsedTime >= skipOffset;
    
    // Use a fallback duration for initial render to prevent "flash to 5"
    const displayDuration = duration > 0 ? duration : (scene.duration || 15);

    // Calculate pod-level progress if applicable
    let podProgress = 0;
    const actualDuration = duration > 0 ? duration : (scene.duration || 15);
    const safeElapsedTime = isNaN(elapsedTime) ? 0 : elapsedTime;
    
    if (podSkipTotalDuration > 0) {
      const timeRemainingInCurrent = isLastSkippableInPod
        ? (skipOffset - safeElapsedTime)
        : (actualDuration - safeElapsedTime);
      const totalRemaining = Math.max(0, (isNaN(timeRemainingInCurrent) ? 0 : timeRemainingInCurrent) + (podRemainingTime || 0));
      podProgress = ((podSkipTotalDuration - totalRemaining) / podSkipTotalDuration) * 100;
    } else {
      podProgress = skipOffset > 0 ? (safeElapsedTime / skipOffset) * 100 : 0;
    }

    // For Squeezeback QR, we still want to use pod progress if it's part of a pod sequence
    const rawTimerProgress = (podSkipTotalDuration > 0)
      ? podProgress
      : (skipOffset > 0 ? (safeElapsedTime / skipOffset) * 100 : 0);
    
    const timerCircleProgress = isNaN(rawTimerProgress) ? 0 : rawTimerProgress;

    const showNonSkippable = scene.adFormat === AdFormatType.NON_SKIPPABLE_BRAND;
    const showSkippable = scene.adFormat === AdFormatType.SKIPPABLE_BRAND || scene.adFormat === AdFormatType.SKIPPABLE_PERFORMANCE || scene.adFormat === AdFormatType.SQUEEZEBACK_QR;

    const formatTimer = (seconds: number) => {
      if (typeof seconds !== 'number' || isNaN(seconds)) return "0";
      const val = Math.max(0, Math.ceil(seconds));
      return val > 90 ? "90+" : val.toString();
    };

    const yellowColor = "#FBC02D";

    return (
      <div className="absolute inset-0 pointer-events-none select-none font-sans">
        {/* Bottom Scrim - Always full width */}
        {(scene.adFormat === AdFormatType.SKIPPABLE_PERFORMANCE || (isSqueezeback && !isSqueezed)) && (
          <div className="absolute bottom-0 left-0 right-0 h-[260px] bg-gradient-to-t from-black/80 via-black/50 to-transparent pointer-events-none" />
        )}

        {/* QR Code Area */}
        <AnimatePresence>
          {isSqueezed && (
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.05, 0, 0, 1] }}
              className="absolute right-[2.8rem] top-[19.5%] w-[26.1%] flex flex-col items-center"
              style={{ transform: `scale(${uiScale})`, transformOrigin: 'top right' }}
            >
              <div className="w-full aspect-square bg-white rounded-[1.5rem] p-4 shadow-2xl flex items-center justify-center relative overflow-hidden">
                {/* Dynamic QR Code Pattern matching PNG exactly */}
                {qrMatrix ? (
                  <svg viewBox="0 0 100 100" className="w-full h-full text-black">
                    {(() => {
                      const size = qrMatrix.length;
                      const cellSize = 100 / size;
                      const dots: React.ReactNode[] = [];
                      
                      const isFinder = (r: number, c: number) => {
                        return (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
                      };

                      const isLogoArea = (r: number, c: number) => {
                        const center = size / 2;
                        const radius = size * 0.18; // Adjust logo exclusion zone
                        return Math.sqrt(Math.pow(r - center + 0.5, 2) + Math.pow(c - center + 0.5, 2)) < radius;
                      };

                      qrMatrix.forEach((row, r) => {
                        row.forEach((cell, c) => {
                          if (cell && !isFinder(r, c) && !isLogoArea(r, c)) {
                            dots.push(
                              <circle
                                key={`dot-${r}-${c}`}
                                cx={c * cellSize + cellSize / 2}
                                cy={r * cellSize + cellSize / 2}
                                r={cellSize / 2.3}
                                fill="currentColor"
                              />
                            );
                          }
                        });
                      });

                      const renderFinder = (x: number, y: number) => {
                        const s = cellSize * 7;
                        const innerS = cellSize * 3;
                        const outerR = cellSize * 1.8;
                        const innerR = cellSize * 0.8;
                        const strokeW = cellSize * 1.1;
                        
                        return (
                          <g key={`finder-${x}-${y}`} transform={`translate(${x * cellSize}, ${y * cellSize})`}>
                            <rect
                              x={strokeW / 2}
                              y={strokeW / 2}
                              width={s - strokeW}
                              height={s - strokeW}
                              rx={outerR}
                              ry={outerR}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={strokeW}
                            />
                            <rect
                              x={cellSize * 2}
                              y={cellSize * 2}
                              width={innerS}
                              height={innerS}
                              rx={innerR}
                              ry={innerR}
                              fill="currentColor"
                            />
                          </g>
                        );
                      };

                      return (
                        <>
                          {dots}
                          {renderFinder(0, 0)}
                          {renderFinder(size - 7, 0)}
                          {renderFinder(0, size - 7)}
                        </>
                      );
                    })()}
                  </svg>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <QrCode className="animate-pulse text-gray-300" size={48} />
                  </div>
                )}
                
                {/* Logo Overlay in Center of QR */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[34%] aspect-square bg-white rounded-full border-[6px] border-white flex items-center justify-center relative">
                    {/* Black Ring with padding */}
                    <div className="absolute inset-0 rounded-full border-[3px] border-black m-[2px]" />
                    
                    <div className="w-[72%] h-[72%] rounded-full bg-[#7D7D7D] overflow-hidden flex items-center justify-center relative z-10">
                      {scene.advertiserLogoUrl ? (
                        <img src={scene.advertiserLogoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-[#7D7D7D]" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex flex-col items-center text-center max-w-[280px]">
                {scene.advertiserName && (
                  <span className="text-white text-lg font-bold drop-shadow-md mb-1">
                    {scene.advertiserName}
                  </span>
                )}
                <span className="text-white/80 text-sm font-medium leading-snug drop-shadow-md">
                  Learn more by scanning or sending to your phone
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Left Group */}
        <div 
          className="absolute bottom-[44px] left-[2.8rem] flex flex-col items-start transition-all duration-500"
          style={{ 
            transform: `scale(${uiScale})`, 
            transformOrigin: 'bottom left'
          }}
        >
          {/* Sponsored Label (Standard Brand Ads) */}
          {scene.adFormat !== AdFormatType.SKIPPABLE_PERFORMANCE && !isSqueezeback && (
            <div className="h-9 flex flex-col items-start">
              {scene.advertiserName && (
                <span className="text-white text-lg font-bold drop-shadow-perf leading-none mb-1">
                  {scene.advertiserName}
                </span>
              )}
              <span className="text-white text-sm font-bold drop-shadow-perf opacity-80">
                Sponsored
              </span>
            </div>
          )}

          {/* Performance Ad Advertiser Overlay */}
          {(scene.adFormat === AdFormatType.SKIPPABLE_PERFORMANCE || isSqueezeback) && (
            <div className="flex items-center gap-[12px] pointer-events-auto">
              <div className={`w-[40px] h-[40px] rounded-full flex items-center justify-center shadow-lg overflow-hidden ${scene.advertiserLogoUrl ? 'bg-[#00A3E0]' : 'bg-neutral-600'}`}>
                {scene.advertiserLogoUrl ? (
                  <img 
                    src={scene.advertiserLogoUrl} 
                    alt="Logo" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
              </div>
              <div className="flex flex-col">
                <span className="text-white text-base font-bold tracking-tight drop-shadow-perf">
                  {scene.advertiserName || scene.displayUrl || 'example.com'}
                </span>
                <div className="flex items-center gap-1.5 text-white/70 text-[12.5px] drop-shadow-perf">
                  <span className="font-bold">Sponsored</span>
                  <span className="w-1 h-1 rounded-full bg-white/40" />
                  <span className="opacity-80 font-normal">{scene.headline || 'Visit advertiser'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Right Group */}
        <div 
          className="absolute bottom-[44px] right-[2.8rem] flex flex-col items-end"
          style={{ transform: `scale(${uiScale})`, transformOrigin: 'bottom right' }}
        >
          {/* Ad Format Specifics */}
          <div className="flex items-center gap-[1.1rem]">
            {(scene.adFormat === AdFormatType.SKIPPABLE_PERFORMANCE || isSqueezeback) && (
              <button 
                onMouseEnter={() => setIsCtaHovered(true)}
                onMouseLeave={() => setIsCtaHovered(false)}
                className={`h-[44px] w-[152px] justify-center rounded-full flex items-center gap-[9px] transition-all shadow-xl backdrop-blur-md group pointer-events-auto ${
                  isCtaHovered
                    ? 'bg-white text-[#0F0F0F]' 
                    : 'bg-white/10 text-[#F1F1F1]'
                }`}
              >
                <Bell size={18} className={isCtaHovered ? 'text-[#0F0F0F]' : 'text-[#F1F1F1]'} />
                <span className="text-sm font-bold tracking-tight">
                  {scene.ctaText || 'Send to phone'}
                </span>
              </button>
            )}

            {showNonSkippable && (
              <div className="pointer-events-auto flex items-center gap-3">
                <div className="flex items-center gap-3 text-white">
                  {hasSkippableInPod && adTotal > 1 && (
                    <span className="text-sm font-medium drop-shadow-perf">Skip in</span>
                  )}
                  <div className="relative w-[44px] h-[44px] flex items-center justify-center bg-black/60 rounded-full shadow-lg">
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 36 36">
                      <circle
                        cx="18"
                        cy="18"
                        r="17"
                        fill="none"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="2"
                      />
                      <path
                        d="M 18 1 a 17 17 0 1 0 0 34 a 17 17 0 1 0 0 -34"
                        fill="none"
                        stroke={yellowColor}
                        strokeWidth="2"
                        strokeDasharray="106.81 106.81"
                        strokeDashoffset={106.81 * (Math.min(100, Math.max(0, timerCircleProgress)) / 100)}
                        strokeLinecap="butt"
                        className="transition-all duration-200"
                      />
                    </svg>
                    <span className="text-[13.5px] font-bold text-[#FBC02D]">
                      {formatTimer((actualDuration - safeElapsedTime) + (podRemainingTime || 0))}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {showSkippable && (
              <div className="pointer-events-auto flex items-center gap-3">
                {canSkip && (
                  <button
                    onClick={handleSkip}
                    className={`h-[44px] ${hasNextSkippableAd ? 'px-6' : 'pl-5 pr-1'} rounded-full flex items-center gap-2 transition-all shadow-2xl group pointer-events-auto ${
                      isCtaHovered
                        ? 'bg-black/40 text-white backdrop-blur-md'
                        : 'bg-white text-[#0F0F0F]'
                    }`}
                  >
                    <span className="text-sm font-bold tracking-tight">
                      {hasNextSkippableAd ? 'Next' : 'Skip'}
                    </span>
                    {!hasNextSkippableAd && (
                      <>
                        <SkipForward 
                          size={14} 
                          fill="currentColor" 
                          className={isCtaHovered ? 'text-white' : 'text-[#0F0F0F]'} 
                        />
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold ml-1 ${
                          isCtaHovered ? 'bg-white/20 text-white/70' : 'bg-black/60 text-white/70'
                        }`}>
                          {formatTimer(actualDuration - safeElapsedTime)}
                        </div>
                      </>
                    )}
                  </button>
                )}

                {(!canSkip || hasNextSkippableAd) && (
                  <div className="flex items-center gap-3 text-white">
                    <span className={`text-sm font-medium ${scene.adFormat !== AdFormatType.SKIPPABLE_PERFORMANCE ? 'drop-shadow-perf' : 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]'}`}>Skip in</span>
                    <div className="relative w-[44px] h-[44px] flex items-center justify-center bg-black/60 rounded-full shadow-lg">
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 36 36">
                        <circle
                          cx="18"
                          cy="18"
                          r="17"
                          fill="none"
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth="2"
                        />
                        <path
                          d="M 18 1 a 17 17 0 1 0 0 34 a 17 17 0 1 0 0 -34"
                          fill="none"
                          stroke={yellowColor}
                          strokeWidth="2"
                          strokeDasharray="106.81 106.81"
                          strokeDashoffset={106.81 * (Math.min(100, Math.max(0, timerCircleProgress)) / 100)}
                          strokeLinecap="butt"
                          className="transition-all duration-200"
                        />
                      </svg>
                      <span className="text-[13.5px] font-bold text-[#FBC02D]">
                        {formatTimer(podSkipTotalDuration > 0
                          ? Math.max(0, (isLastSkippableInPod ? skipOffset - safeElapsedTime : actualDuration - safeElapsedTime)) + (podRemainingTime || 0)
                          : skipOffset - safeElapsedTime)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden" ref={containerRef}>
      {isFinished ? (
        <div className="w-full h-full relative" ref={videoContainerRef}>
            <img 
              src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`} 
              alt="Thumbnail" 
              className="w-full h-full object-contain opacity-60"
              referrerPolicy="no-referrer"
            />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-[#3F8AE2]/20 backdrop-blur-md rounded-full flex items-center justify-center border border-[#3F8AE2]/30">
              <Play size={40} className="text-[#3F8AE2] ml-1" fill="currentColor" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Squeezeback Background Elements - Placed behind video */}
          <AnimatePresence>
            {isSqueezed && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.05, 0, 0, 1] }}
                className="absolute inset-0 bg-[#0F0F0F] z-0"
              >
                <div className="absolute inset-0 transition-colors duration-1000" style={{ backgroundColor: bgGradientBottom }} />
                <div 
                  className="absolute top-0 left-0 right-0 h-[19.1%] transition-colors duration-1000" 
                  style={{ 
                    background: `linear-gradient(to bottom, ${bgGradientTop}, ${bgGradientBottom})` 
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="w-full h-full relative z-10">
            {/* Main Video Player */}
            <motion.div 
              ref={videoContainerRef}
              className="w-full h-full relative" 
              style={{ 
                transformOrigin: 'center center',
                willChange: 'transform, opacity',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'translateZ(0)',
              }}
              animate={{
                scale: isSqueezed ? 0.597 : videoScale,
                x: isSqueezed ? '-17.025%' : '0%',
                y: isSqueezed ? '0.25%' : '0%',
              }}
              transition={{ duration: 0.6, ease: [0.05, 0, 0, 1] }}
            >
              <div 
                className="w-full h-full relative"
                style={{ 
                  borderRadius: isSqueezed ? '1.5rem' : '0px',
                  overflow: 'hidden',
                  transform: 'translateZ(0)', // Force layer for clipping
                }}
              >
                {!hasStarted && !isFinished && (
                  <div 
                    className="absolute inset-0 bg-black z-10 flex items-center justify-center cursor-pointer pointer-events-auto"
                    onClick={() => {
                      if (!isPlaying) onPlay?.();
                    }}
                  >
                    <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center border border-white/20 hover:scale-110 transition-transform duration-300">
                      {isPlaying ? (
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              animate={{ scaleY: [1, 2, 1] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                              className="w-1 h-4 bg-white rounded-full"
                            />
                          ))}
                        </div>
                      ) : (
                        <Play size={32} className="text-white ml-1" fill="currentColor" />
                      )}
                    </div>
                  </div>
                )}
                <div 
                  id="main-youtube-player" 
                  className="w-full h-full" 
                />
              </div>
            </motion.div>
          </div>
          
          {/* Absolute UI Overlay Layer - Always matches container bounds to stay visible */}
          <div className="absolute inset-0 pointer-events-none z-30">
            {renderOverlays()}
          </div>
        </>
      )}
    </div>
  );
};
