
import React from 'react';

export const COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  background: '#0f172a',
  surface: '#1e293b',
  border: '#334155'
};

export const DEFAULT_SESSION: any = {
  id: 'session-1',
  name: 'Main Broadcast',
  videoSource: 'videotestsrc',
  videoPlaylist: [],
  audioSource: 'audiotestsrc',
  audioPlaylist: [],
  loop: true,
  resolution: '1920x1080',
  fps: 30,
  vBitrate: 4500,
  aBitrate: 128,
  encoder: 'x264enc',
  destinations: [
    { id: 'dest-1', name: 'YouTube Live', url: 'rtmp://a.rtmp.youtube.com/live2', streamKey: '****', isActive: true },
    { id: 'dest-2', name: 'Twitch', url: 'rtmp://lax.contribute.live-video.net/app/', streamKey: '****', isActive: true }
  ],
  status: 'idle'
};
