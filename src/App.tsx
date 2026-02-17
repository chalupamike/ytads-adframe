import React, { useState, useEffect, useRef } from 'react';
import { DeviceType, Scene, AdFormatType } from './types';
import { SceneBuilder } from './components/SceneBuilder';
import { DeviceFrame } from './components/DeviceFrame';
import { YouTubePlayer } from './components/YouTubePlayer';
import { 
  Play, RotateCcw, Share2, ExternalLink, Pause, SkipBack, 
  SkipForward as SkipNext, Volume2, VolumeX, Circle, Square,
  Pizza, Car, Trophy, Gamepad2, Smartphone, Laptop, Tv, Coffee, IceCream, Dumbbell, Activity, Puzzle,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const INITIAL_SCENES: Scene[] = [
  {
    id: 'ad-initial',
    type: 'AD',
    youtubeUrl: 'https://www.youtube.com/watch?v=Dr5b_venGHQ',
    startTime: 0,
    skipOffset: 5,
    adFormat: AdFormatType.SKIPPABLE_BRAND,
  },
];

export default function App() {
  const [scenes, setScenes] = useState<Scene[]>(INITIAL_SCENES);
  const [device, setDevice] = useState<DeviceType>(DeviceType.TV);
  const [currentSceneIndex, setCurrentSceneIndex] = useState<number>(0); // Start with the first scene selected
  const [isFinished, setIsFinished] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false); // Start paused (blank preview)
  const [isMuted, setIsMuted] = useState(true);
  const [videoScale, setVideoScale] = useState(1.0);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [resetKey, setResetKey] = useState(0); // Used to force re-mount of player on reset
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [isLdapCopied, setIsLdapCopied] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAppLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const copyLdap = () => {
    navigator.clipboard.writeText('chalupamike');
    setIsLdapCopied(true);
    setTimeout(() => setIsLdapCopied(false), 2000);
  };

  const startPreview = () => {
    lastHandledIndexRef.current = -1;
    setCurrentSceneIndex(0);
    setIsFinished(false);
    setIsPlaying(true);
    setResetKey(prev => prev + 1);
  };

  const resetPreview = () => {
    lastHandledIndexRef.current = -1;
    setCurrentSceneIndex(0);
    setIsFinished(false);
    setIsPlaying(false);
    setResetKey(prev => prev + 1);
  };

  const lastHandledIndexRef = useRef<number>(-1);

  const handleSceneEnd = (sceneId: string) => {
    if (sceneId !== currentScene?.id) return;
    if (lastHandledIndexRef.current === currentSceneIndex) return;
    lastHandledIndexRef.current = currentSceneIndex;

    if (currentSceneIndex < scenes.length - 1) {
      setCurrentSceneIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  const skipAdPod = () => {
    lastHandledIndexRef.current = -1;
    let nextIndex = currentSceneIndex + 1;
    while (nextIndex < scenes.length && scenes[nextIndex].type === 'AD') {
      nextIndex++;
    }
    
    if (nextIndex < scenes.length) {
      setCurrentSceneIndex(nextIndex);
    } else {
      setIsFinished(true);
    }
  };

  const prevScene = () => {
    lastHandledIndexRef.current = -1;
    if (currentSceneIndex > 0) {
      setCurrentSceneIndex(prev => prev - 1);
    }
  };

  const nextScene = () => {
    lastHandledIndexRef.current = -1;
    if (currentSceneIndex < scenes.length - 1) {
      setCurrentSceneIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const currentScene = scenes[currentSceneIndex];

  // Calculate remaining time in the current ad pod (up to the last skippable ad's skip point)
  const getPodRemainingTime = () => {
    if (!currentScene || currentScene.type !== 'AD') return 0;
    
    let remainingDuration = 0;
    
    // Find the last ad in the pod
    let lastAdIndexInPod = currentSceneIndex;
    while (lastAdIndexInPod + 1 < scenes.length && scenes[lastAdIndexInPod + 1].type === 'AD') {
      lastAdIndexInPod++;
    }

    // Find the last skippable ad in the pod
    let lastSkippableIndex = -1;
    for (let i = currentSceneIndex; i <= lastAdIndexInPod; i++) {
      if (scenes[i].adFormat === AdFormatType.SKIPPABLE_BRAND || 
          scenes[i].adFormat === AdFormatType.SKIPPABLE_PERFORMANCE ||
          scenes[i].adFormat === AdFormatType.SQUEEZEBACK_QR) {
        lastSkippableIndex = i;
      }
    }
    
    // If no skippable ads, count to the end of the pod
    const targetIndex = lastSkippableIndex !== -1 ? lastSkippableIndex : lastAdIndexInPod;

    // Sum up durations of subsequent ads in the pod up to the target
    for (let i = currentSceneIndex + 1; i <= targetIndex; i++) {
      const scene = scenes[i];
      const sceneDuration = scene.duration || scene.contentDuration || 15;
      if (i === targetIndex) {
        remainingDuration += scene.skipOffset || 5;
      } else {
        remainingDuration += sceneDuration;
      }
    }
    
    return remainingDuration;
  };

  const getAdPodInfo = () => {
    if (!currentScene || currentScene.type !== 'AD') return { index: 0, total: 0, hasSkippable: false, totalSkipDuration: 0, remainingSkipDuration: 0, isLastSkippable: false };
    
    let total = 0;
    let index = 0;
    let hasSkippable = false;
    
    // Find the start of the current ad pod
    let start = currentSceneIndex;
    while (start > 0 && scenes[start - 1].type === 'AD') {
      start--;
    }
    
    // Find the last ad in the pod
    let lastAdIndexInPod = currentSceneIndex;
    while (lastAdIndexInPod + 1 < scenes.length && scenes[lastAdIndexInPod + 1].type === 'AD') {
      lastAdIndexInPod++;
    }

    // Find the last skippable ad in the pod
    let lastSkippableIndex = -1;
    for (let i = start; i <= lastAdIndexInPod; i++) {
      if (scenes[i].adFormat === AdFormatType.SKIPPABLE_BRAND || 
          scenes[i].adFormat === AdFormatType.SKIPPABLE_PERFORMANCE ||
          scenes[i].adFormat === AdFormatType.SQUEEZEBACK_QR) {
        lastSkippableIndex = i;
        hasSkippable = true;
      }
    }
    
    const targetIndex = lastSkippableIndex !== -1 ? lastSkippableIndex : lastAdIndexInPod;
    
    // Total skip duration for the whole pod (from start of pod to skip point of target)
    let totalSkipDuration = 0;
    for (let i = start; i <= targetIndex; i++) {
      const scene = scenes[i];
      const sceneDuration = scene.duration || 15;
      if (i === targetIndex) {
        totalSkipDuration += (scene.adFormat === AdFormatType.NON_SKIPPABLE_BRAND) ? sceneDuration : (scene.skipOffset || 5);
      } else {
        totalSkipDuration += sceneDuration;
      }
    }

    // Remaining skip duration from AFTER the current ad up to the target's skip point
    let remainingSkipDuration = 0;
    for (let i = currentSceneIndex + 1; i <= targetIndex; i++) {
      const scene = scenes[i];
      const sceneDuration = scene.duration || 15;
      if (i === targetIndex) {
        remainingSkipDuration += (scene.adFormat === AdFormatType.NON_SKIPPABLE_BRAND) ? sceneDuration : (scene.skipOffset || 5);
      } else {
        remainingSkipDuration += sceneDuration;
      }
    }

    // Count ads
    let i = start;
    while (i < scenes.length && scenes[i].type === 'AD') {
      total++;
      if (i === currentSceneIndex) {
        index = total;
      }
      i++;
    }
    
    return { 
      index, 
      total, 
      hasSkippable, 
      totalSkipDuration, 
      remainingSkipDuration,
      totalPodDurationRemaining: (() => {
        let remaining = 0;
        for (let i = currentSceneIndex + 1; i <= lastAdIndexInPod; i++) {
          remaining += (scenes[i].duration || 15);
        }
        return remaining;
      })(),
      isLastSkippable: currentSceneIndex === lastSkippableIndex
    };
  };

  const adPodInfo = getAdPodInfo();

  const startRecording = async () => {
    const element = document.getElementById('preview-player-container');
    if (!element || isRecording) return;

    try {
      // 1. Request display media
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          displaySurface: 'browser',
          cursor: 'never'
        },
        // These options help show "This Tab" prominently in the dialog
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
        systemAudio: 'include',
        audio: false
      } as any);

      streamRef.current = stream;
      setIsRecording(true);
      setRecordingTime(0);
      chunksRef.current = [];

      // 2. Setup Canvas Flattening
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvasRef.current = canvas;
      const rect = element.getBoundingClientRect();
      
      // Use document.documentElement for more accurate viewport dimensions
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      
      // Calculate scale between stream and viewport
      const scaleX = video.videoWidth / viewportWidth;
      const scaleY = video.videoHeight / viewportHeight;
      
      // Set canvas size to the element's size in the stream's resolution
      canvas.width = rect.width * scaleX;
      canvas.height = rect.height * scaleY;
      const ctx = canvas.getContext('2d', { alpha: false });

      const drawFrame = () => {
        if (ctx && video && element) {
          const currentRect = element.getBoundingClientRect();
          
          // Clear with black background
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw the specific region from the video stream
          ctx.drawImage(
            video,
            currentRect.left * scaleX, 
            currentRect.top * scaleY, 
            currentRect.width * scaleX, 
            currentRect.height * scaleY,
            0, 0, canvas.width, canvas.height
          );
          requestRef.current = requestAnimationFrame(drawFrame);
        }
      };
      requestRef.current = requestAnimationFrame(drawFrame);

      // 3. Setup MediaRecorder
      const recorderStream = canvas.captureStream(30);
      const mimeType = 'video/webm;codecs=vp9';
      const options = MediaRecorder.isTypeSupported(mimeType) 
        ? { mimeType, videoBitsPerSecond: 5000000 } 
        : { mimeType: 'video/webm' };

      const recorder = new MediaRecorder(recorderStream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `youtube-ad-recording-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };

      recorder.start(1000); // Collect data every second

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Handle user stopping share via browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

    } catch (err: any) {
      console.error('Failed to start recording:', err);
      setIsRecording(false);
      
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
        setRecordingError('Permission denied. Please allow screen sharing to record.');
      } else {
        setRecordingError('Failed to start recording. Please try again.');
      }
      
      setTimeout(() => setRecordingError(null), 4000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    setIsRecording(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-black overflow-hidden font-sans text-slate-100 min-w-[320px] min-h-[500px]">
      {/* Main Content - Preview Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-[74px] bg-[#111111] border-b border-white/5 flex items-center justify-between px-4 lg:px-9 shrink-0">
          <div className="flex items-center gap-4 lg:gap-5">
            <svg viewBox="0 0 24 24" fill="#FF0000" className="w-7 h-7 lg:w-8 lg:h-8 shrink-0">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <div className="flex flex-col">
              <h1 className="text-sm lg:text-lg font-bold tracking-tight text-white leading-tight">YouTube AdFrame Studio</h1>
              <span className="text-[10px] lg:text-[11px] font-medium text-slate-400 tracking-wider">Ad experience preview</span>
            </div>
            <div className="h-5 w-px bg-white/10" />
            <div className="relative group">
              <button 
                onClick={copyLdap}
                className="flex items-center justify-center w-7 h-7 rounded-full border border-white/20 text-slate-400 hover:text-white hover:border-white/40 transition-all active:scale-90"
              >
                <span className="text-sm">?</span>
              </button>
              
              {/* Hover Popup */}
              <div className="absolute left-0 top-full mt-3 w-64 p-4 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] pointer-events-none">
                <div className="absolute -top-1.5 left-3 w-3 h-3 bg-[#1A1A1A] border-t border-l border-white/10 rotate-45" />
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isLdapCopied ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      LDAP "chalupamike" copied!
                    </span>
                  ) : (
                    <>
                      Please contact <span className="text-white font-bold">@chalupamike</span> for any issues and requests
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 lg:gap-4">
            {isFinished && (
              <div className="hidden md:flex items-center gap-2.5 border-r border-white/10 pr-3.5 mr-1.5">
                <button
                  onClick={startPreview}
                  className="flex items-center gap-2.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs lg:text-sm font-bold transition-all active:scale-95"
                >
                  <RotateCcw size={16} />
                  Replay
                </button>
                <button
                  onClick={resetPreview}
                  className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-white/5 text-slate-400 rounded-lg text-xs lg:text-sm font-bold transition-all"
                >
                  Back to Editor
                </button>
              </div>
            )}
            <button
              onClick={resetPreview}
              className="p-2.5 hover:bg-white/5 rounded-lg text-slate-400 transition-colors"
              title="Reset Preview"
            >
              <RotateCcw size={21} />
            </button>
            <button className="hidden sm:flex items-center gap-2.5 px-3.5 lg:px-5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-xs lg:text-sm font-semibold text-slate-200 hover:bg-white/10 transition-colors">
              <Share2 size={16} />
              Share
            </button>
            <button
              onClick={startPreview}
              disabled={scenes.length === 0}
              className="flex items-center gap-2.5 px-5 lg:px-7 py-2.5 bg-[#3F8AE2] text-white rounded-lg text-xs lg:text-sm font-bold hover:bg-[#3F8AE2]/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={16} fill="currentColor" />
              Play
            </button>
          </div>
        </header>

        {/* Preview Container */}
        <div className="flex-1 relative overflow-hidden bg-black flex flex-col min-h-[300px]">
          <div className="flex-1 relative flex items-center justify-center p-4 min-h-0">
            <AnimatePresence mode="wait">
              {isAppLoading ? (
                <motion.div
                  key="loader"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black z-50 overflow-hidden"
                >
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="flex flex-col items-center gap-8"
                  >
                    <div className="relative">
                      <motion.div
                        animate={{ 
                          scale: [1, 1.1, 1],
                          opacity: [0.3, 0.6, 0.3]
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -inset-8 bg-red-600/20 rounded-full blur-3xl"
                      />
                      <svg viewBox="0 0 24 24" fill="#FF0000" className="w-20 h-20 relative z-10 drop-shadow-[0_0_15px_rgba(255,0,0,0.5)]">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </div>
                    
                    <div className="flex flex-col items-center gap-3">
                      <h2 className="text-2xl font-bold tracking-tighter text-white">AdFrame Studio</h2>
                      <div className="flex items-center gap-2">
                        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ x: "-100%" }}
                            animate={{ x: "100%" }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            className="w-full h-full bg-red-600"
                          />
                        </div>
                      </div>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Initializing Preview Engine</p>
                    </div>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="player-main"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full h-full flex items-center justify-center p-2 sm:p-4 min-h-0"
                  id="preview-player-container"
                >
                  <DeviceFrame device={device}>
                    <YouTubePlayer
                      key={`main-player-${resetKey}`}
                      scene={isFinished ? (scenes[scenes.length - 1] || scenes[0]) : (currentScene || scenes[0])}
                      device={device}
                      onEnded={handleSceneEnd}
                      onSkipPod={skipAdPod}
                      isPlaying={isPlaying && !isFinished}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      isMuted={isMuted}
                      podRemainingTime={adPodInfo.remainingSkipDuration}
                      totalPodRemainingTime={adPodInfo.totalPodDurationRemaining}
                      isLastSkippableInPod={adPodInfo.isLastSkippable}
                      videoScale={videoScale}
                      adIndex={adPodInfo.index}
                      adTotal={adPodInfo.total}
                      hasSkippableInPod={adPodInfo.hasSkippable}
                      hasNextSkippableAd={(() => {
                        if (isFinished) return false;
                        let nextAdIndex = currentSceneIndex + 1;
                        while (nextAdIndex < scenes.length && scenes[nextAdIndex].type === 'AD') {
                          const nextScene = scenes[nextAdIndex];
                          if (nextScene.adFormat === AdFormatType.SKIPPABLE_BRAND || 
                              nextScene.adFormat === AdFormatType.SKIPPABLE_PERFORMANCE || 
                              nextScene.adFormat === AdFormatType.SQUEEZEBACK_QR) {
                            return true;
                          }
                          nextAdIndex++;
                        }
                        return false;
                      })()}
                      podSkipTotalDuration={adPodInfo.totalSkipDuration}
                      isFinished={isFinished}
                    />
                  </DeviceFrame>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Dedicated Control Bar */}
          {currentScene && (
            <div className={`h-auto min-h-[5.75rem] lg:h-[92px] bg-[#111111] border-t border-white/5 flex flex-col lg:flex-row items-center justify-between px-4 lg:px-9 py-4 lg:py-0 shrink-0 z-50 gap-4 lg:gap-0 ${isFinished ? 'opacity-50 pointer-events-none' : ''}`}>
              {/* Left Side: Scene Info */}
              <div className="flex items-center gap-5 lg:gap-7 w-full lg:w-auto justify-center lg:justify-start overflow-x-auto no-scrollbar">
                <div className="flex flex-col shrink-0">
                  <span className="text-[10px] lg:text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">Current Scene</span>
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span className="text-sm lg:text-base font-bold text-white whitespace-nowrap">
                      {currentScene.type === 'AD' 
                        ? `Ad ${adPodInfo.index} of ${adPodInfo.total}` 
                        : `Scene ${currentSceneIndex + 1} of ${scenes.length}`}
                    </span>
                  </div>
                </div>
                <div className="w-px h-9 bg-white/10 shrink-0" />
                <div className="flex flex-col shrink-0">
                  <span className="text-[10px] lg:text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">Type</span>
                  <span className="text-sm lg:text-base font-bold text-white uppercase">{currentScene.type}</span>
                </div>
                {currentScene.type === 'AD' && (
                  <>
                    <div className="w-px h-9 bg-white/10 shrink-0" />
                    <div className="flex flex-col shrink-0">
                      <span className="text-[10px] lg:text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">Format</span>
                      <span className="text-sm lg:text-base font-bold text-white whitespace-nowrap">
                        {currentScene.adFormat === AdFormatType.SKIPPABLE_PERFORMANCE 
                          ? 'Skippable Brand Extension' 
                          : currentScene.adFormat?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Center: Playback Controls */}
              <div className="flex items-center gap-7 lg:gap-9 lg:absolute lg:left-1/2 lg:-translate-x-1/2">
                <button
                  onClick={prevScene}
                  disabled={currentSceneIndex === 0}
                  className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all disabled:opacity-20 disabled:hover:bg-transparent"
                  title="Previous Scene"
                >
                  <SkipBack size={21} fill="currentColor" />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-11 h-11 lg:w-14 lg:h-14 bg-[#3F8AE2] text-white rounded-full flex items-center justify-center hover:bg-[#3F8AE2]/90 shadow-lg transition-all active:scale-90"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={23} fill="currentColor" /> : <Play size={23} fill="currentColor" className="ml-1" />}
                </button>
                <button
                  onClick={nextScene}
                  className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
                  title="Next Scene"
                >
                  <SkipNext size={21} fill="currentColor" />
                </button>
              </div>

              {/* Right Side: Volume & Tools */}
              <div className="flex items-center gap-2.5 lg:gap-5 w-full lg:w-auto justify-center lg:justify-end">
                <AnimatePresence>
                  {recordingError && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="absolute bottom-full mb-4 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-[60]"
                    >
                      {recordingError}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex items-center gap-2 bg-white/5 rounded-full px-2 py-1 border border-white/10 relative">
                  {isRecording && (
                    <span className="text-[10px] font-mono font-bold text-red-500 px-2 animate-pulse">
                      REC {formatTime(recordingTime)}
                    </span>
                  )}
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`p-2 rounded-full transition-all flex items-center justify-center ${
                      isRecording 
                        ? 'bg-red-500 text-white hover:bg-red-600' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                    title={isRecording ? "Stop Recording" : "Start Recording"}
                  >
                    {isRecording ? <Square size={18} fill="currentColor" /> : <Circle size={18} fill="currentColor" />}
                  </button>
                </div>
                <button
                  onClick={toggleMute}
                  className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX size={21} /> : <Volume2 size={21} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Sidebar - Scene Builder */}
      <div className="flex-none h-[45vh] lg:h-full lg:w-[437px] border-t lg:border-t-0 lg:border-l border-white/5 overflow-hidden">
        <SceneBuilder
          scenes={scenes}
          setScenes={setScenes}
          device={device}
          setDevice={setDevice}
          videoScale={videoScale}
          setVideoScale={setVideoScale}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          setCurrentSceneIndex={setCurrentSceneIndex}
          setIsFinished={setIsFinished}
          setIsPlaying={setIsPlaying}
          setResetKey={setResetKey}
        />
      </div>
    </div>
  );
}
