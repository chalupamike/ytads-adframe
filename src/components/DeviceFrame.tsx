import React from 'react';
import { DeviceType } from '../types';
import { Monitor, Smartphone, Tv } from 'lucide-react';

interface DeviceFrameProps {
  device: DeviceType;
  children: React.ReactNode;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ device, children }) => {
  const frames = {
    [DeviceType.TV]: (
      <div id="device-frame-target" className="relative w-full h-full flex flex-col items-center justify-center group p-4 lg:p-8 overflow-hidden">
        {/* TV Body Container - maintains 16:9 and fits within parent height minus legs */}
        <div className="relative w-full aspect-video max-h-[calc(100%-4rem)] z-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] bg-black rounded-sm overflow-hidden">
          {/* Screen Content - Full 16:9 */}
          <div className="absolute inset-0">
            {children}
          </div>

          {/* TV Frame/Bezel - Overlaid on top of screen edges */}
          <div className="absolute inset-0 z-20 pointer-events-none">
            {/* Outer Bezel */}
            <div className="absolute inset-0 border-[3px] border-[#1a1a1a] rounded-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" />
            {/* Inner Bezel Depth */}
            <div className="absolute inset-[3px] border-[1px] border-black/40 rounded-sm" />
            {/* Bottom Bezel (slightly thicker with texture) */}
            <div className="absolute bottom-0 left-0 right-0 h-[8px] bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] flex items-center justify-center">
              {/* Subtle Power LED */}
              <div className="w-1 h-1 rounded-full bg-red-500/40 shadow-[0_0_2px_rgba(239,68,68,0.5)]" />
            </div>
          </div>
          
          {/* Subtle Screen Glare */}
          <div className="absolute inset-0 z-10 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.05] pointer-events-none" />

          {/* TV Legs & Floor Shadow - Positioned absolutely relative to TV body */}
          <div className="absolute top-full left-0 right-0 h-16 flex justify-between px-12 lg:px-20 pointer-events-none shrink-0">
            {/* Floor Shadow under TV */}
            <div className="absolute -top-2 left-10 right-10 h-4 bg-black/40 blur-xl rounded-[100%]" />
            
            {/* Left Leg */}
            <div className="relative w-16 lg:w-24 h-full">
              {/* Leg Shadow */}
              <div className="absolute bottom-1 left-0 w-8 lg:w-12 h-2 bg-black/60 blur-md rounded-full transform rotate-[15deg]" />
              {/* Leg Body */}
              <div className="absolute top-0 left-0 w-2 lg:w-3 h-full bg-gradient-to-r from-[#f3f4f6] via-[#9ca3af] to-[#4b5563] transform rotate-[30deg] origin-top rounded-full shadow-lg" />
              {/* Leg Highlight */}
              <div className="absolute top-0 left-[1px] w-[1px] h-full bg-white/30 transform rotate-[30deg] origin-top rounded-full" />
            </div>
            
            {/* Right Leg */}
            <div className="relative w-16 lg:w-24 h-full">
              {/* Leg Shadow */}
              <div className="absolute bottom-1 right-0 w-8 lg:w-12 h-2 bg-black/60 blur-md rounded-full transform -rotate-[15deg]" />
              {/* Leg Body */}
              <div className="absolute top-0 right-0 w-2 lg:w-3 h-full bg-gradient-to-l from-[#f3f4f6] via-[#9ca3af] to-[#4b5563] transform -rotate-[30deg] origin-top rounded-full shadow-lg" />
              {/* Leg Highlight */}
              <div className="absolute top-0 right-[1px] w-[1px] h-full bg-white/30 transform -rotate-[30deg] origin-top rounded-full" />
            </div>
          </div>
        </div>
      </div>
    ),
    [DeviceType.DESKTOP]: (
      <div id="device-frame-target" className="relative w-full h-full flex flex-col items-center justify-center p-4 lg:p-8 overflow-hidden">
        {/* Monitor Body - maintains 16:9 and fits within parent height minus stand */}
        <div className="relative w-full aspect-video max-h-[calc(100%-3rem)] shadow-2xl bg-black rounded-xl overflow-hidden">
          {/* Screen Content - Full 16:9 */}
          <div className="absolute inset-0">
            {children}
          </div>
          
          {/* Monitor Bezel - Overlaid */}
          <div className="absolute inset-0 border-[8px] lg:border-[12px] border-[#222] pointer-events-none z-20" />
          
          {/* Stand - Positioned absolutely relative to monitor body */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
            <div className="w-24 lg:w-32 h-8 lg:h-10 bg-[#333] rounded-b-lg" />
            <div className="w-36 lg:w-48 h-1.5 lg:h-2 bg-[#222] rounded-full -mt-1" />
          </div>
        </div>
      </div>
    ),
    [DeviceType.MOBILE]: (
      <div id="device-frame-target" className="relative h-full w-full flex items-center justify-center p-4 overflow-hidden">
        <div className="relative h-full aspect-[9/18] max-w-full max-h-full flex items-center justify-center">
          <div className="relative w-full h-full">
            {/* Phone Frame */}
            <div className="absolute inset-0 border-[10px] border-[#111] rounded-[40px] shadow-2xl overflow-hidden bg-black">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#111] rounded-b-2xl z-20" />
              {children}
              {/* Home Indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/30 rounded-full z-20" />
            </div>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-black overflow-hidden">
      <div className="w-[90%] h-[90%] flex items-center justify-center">
        {frames[device]}
      </div>
    </div>
  );
};
