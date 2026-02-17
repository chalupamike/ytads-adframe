import React, { useState, useEffect } from 'react';
import { Scene, AdFormatType, DeviceType } from '../types';
import { Plus, GripVertical, Settings2, Video, Tv, Monitor, Smartphone, X, Youtube } from 'lucide-react';
import { motion, Reorder } from 'motion/react';

const getVideoId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const YoutubeMetadata: React.FC<{ url: string }> = ({ url }) => {
  const [title, setTitle] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const videoId = getVideoId(url);

  useEffect(() => {
    if (!url || !videoId) {
      setTitle(null);
      setError(false);
      return;
    }
    
    const fetchMetadata = async () => {
      setError(false);
      try {
        // Try YouTube oEmbed first
        const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
        if (response.ok) {
          const data = await response.json();
          setTitle(data.title);
        } else {
          throw new Error('YouTube oEmbed failed');
        }
      } catch (e) {
        // Fallback to noembed.com which is more CORS-friendly
        try {
          const fallbackResponse = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json();
            setTitle(data.title || 'Untitled Video');
          } else {
            setError(true);
            setTitle('Metadata Unavailable');
          }
        } catch (err) {
          setError(true);
          setTitle('Metadata Unavailable');
        }
      }
    };

    fetchMetadata();
  }, [url, videoId]);

  if (!videoId) return null;

  return (
    <div className="flex items-center gap-3 mt-2 mb-1">
      <div className="relative flex-none w-20 aspect-video rounded-md overflow-hidden bg-black/40 border border-white/10 group-hover:border-white/20 transition-colors">
        <img 
          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} 
          alt="Thumbnail"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/error/160/90';
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <Youtube size={12} className={error ? "text-red-500/60" : "text-white/60"} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[11px] font-medium truncate leading-tight ${error ? 'text-slate-500' : 'text-slate-300'}`}>
          {title || 'Loading metadata...'}
        </p>
        <p className="text-[9px] text-slate-500 font-mono mt-0.5">
          ID: {videoId}
        </p>
      </div>
    </div>
  );
};

interface SceneBuilderProps {
  scenes: Scene[];
  setScenes: (scenes: Scene[]) => void;
  device: DeviceType;
  setDevice: (device: DeviceType) => void;
  videoScale: number;
  setVideoScale: (scale: number) => void;
  isMuted: boolean;
  setIsMuted: (isMuted: boolean) => void;
  setCurrentSceneIndex: (index: number) => void;
  setIsFinished: (isFinished: boolean) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setResetKey: React.Dispatch<React.SetStateAction<number>>;
}

export const SceneBuilder: React.FC<SceneBuilderProps> = ({
  scenes,
  setScenes,
  device,
  setDevice,
  videoScale,
  setVideoScale,
  isMuted,
  setIsMuted,
  setCurrentSceneIndex,
  setIsFinished,
  setIsPlaying,
  setResetKey,
}) => {
  const addScene = (type: 'CONTENT' | 'AD') => {
    const newScene: Scene = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      youtubeUrl: type === 'CONTENT' ? 'https://www.youtube.com/watch?v=36oRiPAn4Tw' : 'https://www.youtube.com/watch?v=Dr5b_venGHQ',
      startTime: 0,
      skipOffset: 5,
      adFormat: type === 'AD' ? AdFormatType.SKIPPABLE_BRAND : undefined,
    };
    setScenes([...scenes, newScene]);
  };

  const updateScene = (id: string, updates: Partial<Scene>) => {
    setScenes(scenes.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeScene = (id: string) => {
    setScenes(scenes.filter((s) => s.id !== id));
  };

  const clearScenes = () => {
    const defaultAd: Scene = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'AD',
      youtubeUrl: 'https://www.youtube.com/watch?v=Dr5b_venGHQ',
      startTime: 0,
      skipOffset: 5,
      adFormat: AdFormatType.SKIPPABLE_BRAND,
    };
    setScenes([defaultAd]);
    setCurrentSceneIndex(0);
    setIsFinished(false);
    setIsPlaying(false);
    setResetKey(prev => prev + 1);
  };

  return (
    <div className="flex flex-col h-full bg-[#111111] w-full overflow-hidden">
      <div className="p-7 border-b border-white/5">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <Settings2 size={23} className="text-white" />
          Scene Builder
        </h2>
        <p className="text-base text-slate-500 mt-1.5">Configure your YouTube ad sequence</p>
      </div>

      <div className="p-7 space-y-7 overflow-y-auto flex-1">
        {/* Device Selection */}
        <section className="space-y-5">
          <div>
            <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate-600 mb-3.5 block">
              Preview Device
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: DeviceType.TV, icon: Tv, label: 'TV', disabled: false },
                { id: DeviceType.DESKTOP, icon: Monitor, label: 'Desktop', disabled: true },
                { id: DeviceType.MOBILE, icon: Smartphone, label: 'Mobile', disabled: true },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => !d.disabled && setDevice(d.id)}
                  disabled={d.disabled}
                  className={`flex flex-col items-center gap-2.5 p-3.5 rounded-xl border transition-all ${
                    device === d.id
                      ? 'border-white bg-white/10 text-white'
                      : d.disabled 
                        ? 'border-white/5 opacity-20 cursor-not-allowed text-slate-600'
                        : 'border-white/5 hover:border-white/10 text-slate-500'
                  }`}
                >
                  <d.icon size={21} />
                  <span className="text-[11.5px] font-medium uppercase tracking-tighter">{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Video Scale Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-white/5">
            <div className="flex flex-col">
              <span className="text-[11.5px] font-bold text-white uppercase tracking-tighter">Video Scale to 1.3</span>
              <span className="text-[10.5px] text-slate-500">Default is 1.0</span>
            </div>
            <button
              onClick={() => setVideoScale(videoScale === 1.3 ? 1.0 : 1.3)}
              className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors focus:outline-none ${
                videoScale === 1.3 ? 'bg-white' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-black transition-transform ${
                  videoScale === 1.3 ? 'translate-x-5.5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Mute Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-white/5">
            <div className="flex flex-col">
              <span className="text-[11.5px] font-bold text-white uppercase tracking-tighter">Mute Video</span>
              <span className="text-[10.5px] text-slate-500">{isMuted ? 'Audio is disabled' : 'Audio is enabled'}</span>
            </div>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors focus:outline-none ${
                isMuted ? 'bg-white' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-black transition-transform ${
                  isMuted ? 'translate-x-5.5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Scenes List */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate-600">
              Sequence
            </label>
            <div className="flex gap-2.5">
              <button
                onClick={clearScenes}
                className="text-[11.5px] font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2.5 py-1.5 rounded uppercase tracking-tighter transition-colors border border-red-500/20 flex items-center gap-1.5 mr-2"
                title="Clear all and start over"
              >
                <X size={12} />
                Clear
              </button>
              <button
                onClick={() => addScene('CONTENT')}
                className="text-[11.5px] font-bold bg-white/5 hover:bg-white/10 text-slate-300 px-2.5 py-1.5 rounded uppercase tracking-tighter transition-colors border border-white/5"
              >
                + Content
              </button>
              <button
                onClick={() => addScene('AD')}
                className="text-[11.5px] font-bold bg-white hover:bg-slate-200 text-black px-2.5 py-1.5 rounded uppercase tracking-tighter transition-colors"
              >
                + Ad
              </button>
            </div>
          </div>

          <Reorder.Group axis="y" values={scenes} onReorder={setScenes} className="space-y-3.5">
            {scenes.map((scene, index) => {
              const adIndex = scenes.slice(0, index + 1).filter(s => s.type === 'AD').length;
              
              return (
                <Reorder.Item
                  key={scene.id}
                  value={scene}
                  className={`p-5 rounded-xl border border-white/5 bg-[#181818] shadow-sm hover:shadow-md transition-shadow ${
                    scene.type === 'AD' ? 'border-l-2 border-l-[#FBC02D]' : 'border-l-2 border-l-[#FF0033]'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="mt-1.5 cursor-grab active:cursor-grabbing text-slate-700">
                      <GripVertical size={16} />
                    </div>
                    <div className="flex-1 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                          scene.type === 'AD' ? 'bg-white text-black' : 'bg-white/10 text-slate-300'
                        }`}>
                          {scene.type === 'CONTENT' ? 'CONTENT' : `AD ${adIndex}`}
                        </span>
                        <button
                          onClick={() => removeScene(scene.id)}
                          className="text-slate-600 hover:text-white transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <YoutubeMetadata url={scene.youtubeUrl} />

                    <div className="space-y-2.5">
                      {scene.type === 'AD' && (
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-tighter">Format</label>
                          <select
                            value={scene.adFormat}
                            onChange={(e) => updateScene(scene.id, { adFormat: e.target.value as AdFormatType })}
                            className="w-full text-sm p-2.5 bg-black border border-white/5 rounded text-slate-200 focus:outline-none focus:border-white/20 appearance-none"
                          >
                            <option value={AdFormatType.NON_SKIPPABLE_BRAND}>Non-Skippable Brand</option>
                            <option value={AdFormatType.SKIPPABLE_BRAND}>Skippable Brand</option>
                            <option value={AdFormatType.SKIPPABLE_PERFORMANCE}>Skippable Brand Extension</option>
                            <option value={AdFormatType.SQUEEZEBACK_QR}>Squeezeback QR</option>
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-tighter">YouTube URL</label>
                        <input
                          type="text"
                          value={scene.youtubeUrl}
                          onChange={(e) => updateScene(scene.id, { youtubeUrl: e.target.value })}
                          className="w-full text-sm p-2.5 bg-black border border-white/5 rounded text-slate-200 focus:outline-none focus:border-white/20"
                        />
                      </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-tighter">Start (s)</label>
                            <input
                              type="number"
                              value={scene.startTime}
                              onChange={(e) => updateScene(scene.id, { startTime: parseInt(e.target.value) || 0 })}
                              className="w-full text-sm p-2.5 bg-black border border-white/5 rounded text-slate-200 focus:outline-none focus:border-white/20"
                            />
                          </div>
                          {scene.type === 'AD' ? (
                            <div>
                              <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-tighter">Duration (s)</label>
                              <input
                                type="number"
                                value={scene.duration || ''}
                                placeholder="Auto"
                                onChange={(e) => updateScene(scene.id, { duration: parseInt(e.target.value) || 0 })}
                                className="w-full text-sm p-2.5 bg-black border border-white/5 rounded text-slate-200 focus:outline-none focus:border-white/20"
                              />
                            </div>
                          ) : (
                            <div>
                              <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-tighter">Play For (s)</label>
                              <input
                                type="number"
                                value={scene.contentDuration || ''}
                                placeholder="Full video"
                                onChange={(e) => updateScene(scene.id, { contentDuration: parseInt(e.target.value) || 0 })}
                                className="w-full text-sm p-2.5 bg-black border border-white/5 rounded text-slate-200 focus:outline-none focus:border-white/20"
                              />
                            </div>
                          )}
                        </div>

                        {scene.type === 'AD' && scene.adFormat !== AdFormatType.NON_SKIPPABLE_BRAND && (
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-tighter">Skip After (s)</label>
                              <input
                                type="number"
                                value={scene.skipOffset}
                                onChange={(e) => updateScene(scene.id, { skipOffset: parseInt(e.target.value) || 0 })}
                                className="w-full text-sm p-2.5 bg-black border border-white/5 rounded text-slate-200 focus:outline-none focus:border-white/20"
                              />
                            </div>
                          </div>
                        )}

                        {(scene.adFormat === AdFormatType.SKIPPABLE_PERFORMANCE || scene.adFormat === AdFormatType.SQUEEZEBACK_QR) && (
                        <div className="space-y-2.5">
                          <div>
                            <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-tighter">Advertiser Logo URL</label>
                            <input
                              type="text"
                              value={scene.advertiserLogoUrl || ''}
                              placeholder="Logo URL"
                              onChange={(e) => updateScene(scene.id, { advertiserLogoUrl: e.target.value })}
                              className="w-full text-sm p-2.5 bg-black border border-white/5 rounded text-slate-200 focus:outline-none focus:border-white/20"
                            />
                          </div>
                          <div>
                            <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-tighter">URL</label>
                            <input
                              type="text"
                              value={scene.displayUrl || ''}
                              placeholder="example.com"
                              onChange={(e) => updateScene(scene.id, { displayUrl: e.target.value })}
                              className="w-full text-sm p-2.5 bg-black border border-white/5 rounded text-slate-200 focus:outline-none focus:border-white/20"
                            />
                          </div>
                          <div>
                            <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-tighter">Headline</label>
                            <input
                              type="text"
                              value={scene.headline || ''}
                              placeholder="Visit advertiser"
                              onChange={(e) => updateScene(scene.id, { headline: e.target.value })}
                              className="w-full text-sm p-2.5 bg-black border border-white/5 rounded text-slate-200 focus:outline-none focus:border-white/20"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      </section>
    </div>

      <div className="p-7 bg-black border-t border-white/5">
        <div className="flex items-center gap-2.5 text-[11.5px] text-slate-600 font-bold uppercase tracking-widest">
          <Video size={14} />
          Total Scenes: {scenes.length}
        </div>
      </div>
    </div>
  );
};
