
export enum SourceType {
  WEBCAM = 'v4l2src',
  TEST = 'videotestsrc',
  FILE = 'filesrc',
  NETWORK = 'uridecodebin'
}

export enum EncoderType {
  CPU_X264 = 'x264enc',
  NVIDIA_NVENC = 'nvv4l2h264enc',
  INTEL_VAAPI = 'vaapih264enc'
}

export interface RTMPDestination {
  id: string;
  name: string;
  url: string;
  streamKey: string;
  isActive: boolean;
}

export interface StreamSession {
  id: string;
  name: string;
  videoSource: SourceType;
  videoPlaylist: string[];
  audioSource: string;
  audioPlaylist: string[];
  loop: boolean;
  resolution: string;
  fps: number;
  vBitrate: number;
  aBitrate: number;
  encoder: EncoderType;
  destinations: RTMPDestination[];
  status: 'idle' | 'running' | 'stopped' | 'error';
}

export interface ArchitectConfig {
  os: string;
  hardware: string;
  sessions: StreamSession[];
}
