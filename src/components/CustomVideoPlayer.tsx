'use client';

import React, { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });
const Player = ReactPlayer as any;

interface CustomVideoPlayerProps {
  url: string;
  playing: boolean;
  onPlayChange: (playing: boolean) => void;
  onProgress?: (state: { playedSeconds: number; played: number }) => void;
  onEnded?: () => void;
  isBlurred?: boolean;
}

export default function CustomVideoPlayer({
  url,
  playing,
  onPlayChange,
  onProgress,
  onEnded,
  isBlurred = false,
}: CustomVideoPlayerProps) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    onPlayChange(!playing);
  };

  const handleSeekMouseDown = () => {
    setIsSeeking(true);
  };

  const handleSeekChange = (e: any) => {
    setPlayed(parseFloat(e.target.value));
  };

  const handleSeekMouseUp = (e: any) => {
    setIsSeeking(false);
    if (playerRef.current) {
      playerRef.current.seekTo(parseFloat(e.target.value), 'fraction');
    }
  };

  const handleProgress = (state: { playedSeconds: number; played: number; loadedSeconds: number; loaded: number }) => {
    if (!isSeeking) {
      setPlayed(state.played);
    }
    if (onProgress) {
      onProgress(state);
    }
  };

  const toggleMute = () => setMuted(!muted);

  const handleVolumeChange = (e: any) => {
    setVolume(parseFloat(e.target.value));
    if (parseFloat(e.target.value) > 0) {
      setMuted(false);
    }
  };

  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#000',
        borderRadius: '10px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Video Area */}
      <div style={{
        flex: 1,
        position: 'relative',
        filter: isBlurred ? 'blur(15px)' : 'none',
        transition: 'filter 0.4s ease',
      }}>
        <Player
          ref={playerRef}
          url={url}
          playing={playing}
          controls={false}
          volume={volume}
          muted={muted}
          width="100%"
          height="100%"
          onProgress={handleProgress}
          onDuration={(d: number) => setDuration(d)}
          onEnded={onEnded}
          config={{
            youtube: {
              playerVars: {
                modestbranding: 1,
                rel: 0,
                showinfo: 0,
                disablekb: 1,
                fs: 0,
                iv_load_policy: 3
              }
            }
          }}
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
        {/* Transparent Overlay to block clicking the YouTube video directly */}
        <div 
          onClick={handlePlayPause}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 10,
            cursor: 'pointer'
          }}
        />
      </div>

      {/* Custom Control Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        background: 'linear-gradient(to top, rgba(11,15,25,0.95), rgba(11,15,25,0.8))',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        gap: '16px',
        zIndex: 20
      }}>
        {/* Play / Pause */}
        <button 
          onClick={handlePlayPause}
          style={{
            background: 'none', border: 'none', color: 'rgb(var(--primary))', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '4px',
            borderRadius: '50%',
          }}
          className="hover-glow"
        >
          {playing ? <Pause size={24} /> : <Play size={24} />}
        </button>

        {/* Time */}
        <div style={{ fontSize: '13px', color: '#fff', fontFamily: 'monospace', minWidth: '85px', textAlign: 'center' }}>
          {formatTime(duration * played)} / {formatTime(duration)}
        </div>

        {/* Progress Slider */}
        <input
          type="range"
          min={0}
          max={1}
          step="any"
          value={played}
          onMouseDown={handleSeekMouseDown}
          onChange={handleSeekChange}
          onMouseUp={handleSeekMouseUp}
          onTouchStart={handleSeekMouseDown}
          onTouchEnd={handleSeekMouseUp}
          style={{
            flex: 1,
            cursor: 'pointer',
            accentColor: 'rgb(var(--primary))',
            height: '6px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '3px',
            outline: 'none'
          }}
        />

        {/* Volume */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={toggleMute}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.8 }}
          >
            {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step="any"
            value={muted ? 0 : volume}
            onChange={handleVolumeChange}
            style={{
              width: '80px',
              cursor: 'pointer',
              accentColor: 'rgb(var(--primary))',
              height: '4px'
            }}
          />
        </div>

        {/* Fullscreen */}
        <button 
          onClick={toggleFullScreen}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.8 }}
        >
          <Maximize size={20} />
        </button>
      </div>

      <style jsx>{`
        .hover-glow:hover {
          filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.8));
          transform: scale(1.05);
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  );
}
