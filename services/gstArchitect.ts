
import { StreamSession, EncoderType, SourceType } from '../types';

export const generatePipelineString = (session: StreamSession): string => {
  const { videoSource, videoPlaylist, audioSource, audioPlaylist, vBitrate, aBitrate, encoder, destinations } = session;
  
  // Design-time placeholder for the pipeline string
  let vSource = '';
  if (videoSource === SourceType.TEST) {
    vSource = 'videotestsrc is-live=true';
  } else {
    // For playlists in Python, we'll use uridecodebin and dynamically change the 'uri' property
    vSource = `uridecodebin name=vsrc uri="${videoPlaylist[0] || 'http://placeholder'}"`;
  }

  let enc = encoder === EncoderType.CPU_X264 
    ? `x264enc bitrate=${vBitrate} tune=zerolatency speed-preset=veryfast ! h264parse` 
    : encoder === EncoderType.NVIDIA_NVENC 
    ? `nvv4l2h264enc bitrate=${vBitrate * 1000} preset-level=1 ! h264parse`
    : `vaapih264enc bitrate=${vBitrate} ! h264parse`;

  let aSource = '';
  if (audioSource === 'audiotestsrc') {
    aSource = 'audiotestsrc is-live=true';
  } else {
    aSource = `uridecodebin name=asrc uri="${audioPlaylist[0] || 'http://placeholder'}"`;
  }
  
  let aEnc = `voaacenc bitrate=${aBitrate * 1000}`;

  let pipeline = `
    ${vSource} ! videoconvert ! videoscale ! video/x-raw,width=1920,height=1080,framerate=30/1 ! ${enc} ! tee name=vtee
    ${aSource} ! audioconvert ! audioresample ! ${aEnc} ! tee name=atee
  `;

  destinations.filter(d => d.isActive).forEach((dest, i) => {
    pipeline += `
    vtee. ! queue ! flvmux name=mux${i} ! rtmp2sink location="${dest.url}/${dest.streamKey}"
    atee. ! queue ! mux${i}.
    `;
  });

  return pipeline.replace(/\s+/g, ' ').trim();
};

export const generatePythonCode = (session: StreamSession): string => {
  const pipelineStr = generatePipelineString(session);
  const videoPlaylistJson = JSON.stringify(session.videoPlaylist);
  const audioPlaylistJson = JSON.stringify(session.audioPlaylist);

  return `
import sys
import gi
import json
import time
import logging
gi.require_version('Gst', '1.0')
gi.require_version('GLib', '2.0')
from gi.repository import Gst, GLib

# Setup Production Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("GstArchitect")

class PlaylistManager:
    def __init__(self, element_name, playlist, loop=True):
        self.element_name = element_name
        self.playlist = playlist
        self.loop = loop
        self.current_index = 0
        
    def get_next_uri(self):
        if not self.playlist:
            return None
        uri = self.playlist[self.current_index]
        self.current_index += 1
        if self.current_index >= len(self.playlist):
            if self.loop:
                self.current_index = 0
            else:
                return None
        return uri

class StreamSession:
    def __init__(self, name, pipeline_str, video_playlist, audio_playlist, loop=True):
        self.name = name
        self.pipeline_str = pipeline_str
        self.pipeline = None
        self.loop_thread = GLib.MainLoop()
        
        # Managers for playlist switching
        self.v_manager = PlaylistManager("vsrc", video_playlist, loop)
        self.a_manager = PlaylistManager("asrc", audio_playlist, loop)

    def start(self):
        Gst.init(None)
        logger.info(f"Initializing Session: {self.name}")
        
        try:
            self.pipeline = Gst.parse_launch(self.pipeline_str)
        except Exception as e:
            logger.error(f"Failed to create pipeline for {self.name}: {e}")
            return

        bus = self.pipeline.get_bus()
        bus.add_signal_watch()
        bus.connect("message", self.on_message)

        # Start the pipeline
        logger.info(f"Setting {self.name} to PLAYING")
        self.pipeline.set_state(Gst.State.PLAYING)
        
        try:
            self.loop_thread.run()
        except KeyboardInterrupt:
            self.stop()

    def on_message(self, bus, message):
        t = message.type
        if t == Gst.MessageType.EOS:
            logger.info(f"[{self.name}] Received End-of-Stream signal.")
            self.handle_playlist_switch()
        elif t == Gst.MessageType.ERROR:
            err, debug = message.parse_error()
            logger.error(f"[{self.name}] CRITICAL ERROR from {message.src.get_name()}: {err.message}")
            self.restart()
        elif t == Gst.MessageType.STATE_CHANGED:
            if message.src == self.pipeline:
                old, new, pending = message.parse_state_changed()
                logger.debug(f"[{self.name}] State change: {old.value_name} -> {new.value_name}")

    def handle_playlist_switch(self):
        """Attempts to load the next item in the playlist without crashing the whole pipeline."""
        logger.info(f"[{self.name}] Switching to next playlist item...")
        # Note: Proper gapless switching in Gst is complex. 
        # For this implementation, we restart the source element or the whole pipeline.
        self.restart()

    def stop(self):
        logger.info(f"Stopping Session: {self.name}")
        if self.pipeline:
            self.pipeline.set_state(Gst.State.NULL)
        if self.loop_thread.is_running():
            self.loop_thread.quit()

    def restart(self):
        logger.info(f"Restarting Session: {self.name}...")
        self.stop()
        time.sleep(1) # Grace period
        self.start()

if __name__ == "__main__":
    # CONFIGURATION INJECTED BY GSTARCHITECT
    SESSION_NAME = "${session.name}"
    PIPELINE_DESC = """${pipelineStr}"""
    VIDEO_PLAYLIST = ${videoPlaylistJson}
    AUDIO_PLAYLIST = ${audioPlaylistJson}
    LOOP_ENABLED = ${session.loop ? 'True' : 'False'}

    session = StreamSession(SESSION_NAME, PIPELINE_DESC, VIDEO_PLAYLIST, AUDIO_PLAYLIST, LOOP_ENABLED)
    
    print("\\n" + "="*50)
    print(f"  PRODUCTION STREAMER: {SESSION_NAME}")
    print("="*50 + "\\n")
    
    session.start()
  `;
};
