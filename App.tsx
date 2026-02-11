
import React, { useState, useEffect, useRef } from 'react';
import { StreamSession, SourceType, EncoderType, RTMPDestination } from './types';
import { DEFAULT_SESSION } from './constants';
import { generatePipelineString, generatePythonCode } from './services/gstArchitect';
import PipelineVisualizer from './components/PipelineVisualizer';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [sessions, setSessions] = useState<StreamSession[]>([DEFAULT_SESSION]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(DEFAULT_SESSION.id);
  const [activeTab, setActiveTab] = useState<'design' | 'code' | 'deploy' | 'monitor'>('design');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>('');
  
  // Real-time Simulation State
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const currentSession = sessions.find(s => s.id === selectedSessionId) || sessions[0];

  const updateSession = (updates: Partial<StreamSession>) => {
    setSessions(prev => prev.map(s => s.id === selectedSessionId ? { ...s, ...updates } : s));
  };

  const addNewSession = () => {
    const id = `session-${Date.now()}`;
    const newSession: StreamSession = {
      ...DEFAULT_SESSION,
      id,
      name: `Session ${sessions.length + 1}`,
      videoPlaylist: [],
      audioPlaylist: [],
      destinations: [
        { id: `dest-${Date.now()}`, name: 'Primary RTMP', url: 'rtmp://your-url.com/app', streamKey: '', isActive: true }
      ],
      status: 'idle'
    };
    setSessions([...sessions, newSession]);
    setSelectedSessionId(id);
  };

  const deleteSession = (id: string) => {
    if (sessions.length <= 1) return;
    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    if (selectedSessionId === id) {
      setSelectedSessionId(filtered[0].id);
    }
  };

  const addPlaylistItem = (type: 'video' | 'audio') => {
    const key = type === 'video' ? 'videoPlaylist' : 'audioPlaylist';
    updateSession({ [key]: [...(currentSession[key] || []), ''] });
  };

  const updatePlaylistItem = (type: 'video' | 'audio', index: number, value: string) => {
    const key = type === 'video' ? 'videoPlaylist' : 'audioPlaylist';
    const newList = [...(currentSession[key] || [])];
    newList[index] = value;
    updateSession({ [key]: newList });
  };

  const removePlaylistItem = (type: 'video' | 'audio', index: number) => {
    const key = type === 'video' ? 'videoPlaylist' : 'audioPlaylist';
    const newList = (currentSession[key] || []).filter((_, i) => i !== index);
    updateSession({ [key]: newList });
  };

  const addDestination = () => {
    const newDest: RTMPDestination = {
      id: `dest-${Date.now()}`,
      name: 'New Destination',
      url: 'rtmp://',
      streamKey: '',
      isActive: true
    };
    updateSession({ destinations: [...currentSession.destinations, newDest] });
  };

  const removeDestination = (id: string) => {
    const newDests = currentSession.destinations.filter(d => d.id !== id);
    updateSession({ destinations: newDests });
  };

  const startStreaming = async () => {
    setIsStreaming(true);
    setActiveTab('monitor');
    setLiveLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] INFO: Initializing GStreamer Pipeline...`]);
    
    try {
      if (currentSession.videoSource === SourceType.WEBCAM || currentSession.videoSource === SourceType.TEST) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setLiveLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] INFO: Captured local device.`]);
      }
      setLiveLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] INFO: Encoder: ${currentSession.encoder} starting...`]);
      updateSession({ status: 'running' });
    } catch (err) {
      setLiveLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ERROR: Device access failed.`]);
      setIsStreaming(false);
      updateSession({ status: 'error' });
    }
  };

  const stopStreaming = () => {
    setIsStreaming(false);
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setLiveLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] WARN: Stream stopped.`]);
    updateSession({ status: 'stopped' });
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveLogs]);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3 text-blue-500 mb-2">
            <i className="fas fa-broadcast-tower text-2xl"></i>
            <h1 className="font-bold text-lg tracking-tight">GstArchitect <span className="text-slate-500 font-normal">PRO</span></h1>
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Cloud Deployment Hub</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          <div className="text-xs font-bold text-slate-600 uppercase tracking-widest px-2 mb-2">My Streams</div>
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSessionId(s.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${
                selectedSessionId === s.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800/50 text-slate-400'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${s.status === 'running' ? 'bg-emerald-400' : 'bg-slate-600'}`}></div>
              <span className="truncate flex-1 text-left font-medium">{s.name}</span>
            </button>
          ))}
          <button onClick={addNewSession} className="w-full py-2 border border-dashed border-slate-700 rounded-xl text-slate-500 hover:text-slate-300 text-xs mt-4">+ NEW SESSION</button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-8 z-10">
          <div className="flex gap-8">
            <button onClick={() => setActiveTab('design')} className={`text-sm font-semibold relative py-5 ${activeTab === 'design' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>Design</button>
            <button onClick={() => setActiveTab('monitor')} className={`text-sm font-semibold relative py-5 ${activeTab === 'monitor' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>Monitor</button>
            <button onClick={() => setActiveTab('code')} className={`text-sm font-semibold relative py-5 ${activeTab === 'code' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>Engine Code</button>
            <button onClick={() => setActiveTab('deploy')} className={`text-sm font-bold text-emerald-400 relative py-5 ${activeTab === 'deploy' ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
              <i className="fas fa-ship mr-2"></i>SHIP TO VPS
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={isStreaming ? stopStreaming : startStreaming} className={`px-6 py-2 rounded-full text-xs font-bold transition-all shadow-xl ${isStreaming ? 'bg-red-600 shadow-red-900/20' : 'bg-emerald-600 shadow-emerald-900/20'}`}>
              {isStreaming ? 'STOP LIVE' : 'START LIVE'}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-950/30">
          {activeTab === 'deploy' && (
            <div className="max-w-4xl mx-auto space-y-12 animate-in slide-in-from-bottom-4 duration-500">
              <section className="space-y-4">
                <h1 className="text-3xl font-bold text-white">Distribute to Linux VPS</h1>
                <p className="text-slate-400 leading-relaxed">Follow this blueprint to host your Architect UI and run the Stream Engine 24/7 on a remote server.</p>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
                   <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-4 font-bold">1</div>
                   <h3 className="font-bold mb-2">Server Setup</h3>
                   <p className="text-xs text-slate-500 leading-relaxed">Run this on your VPS to install dependencies:</p>
                   <code className="block mt-4 bg-black/40 p-3 rounded-lg text-[10px] text-emerald-400 border border-slate-800 break-all">
                     sudo apt update && sudo apt install -y nginx python3-gi gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly gstreamer1.0-libav certbot python3-certbot-nginx
                   </code>
                </div>

                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
                   <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 mb-4 font-bold">2</div>
                   <h3 className="font-bold mb-2">SSL Security</h3>
                   <p className="text-xs text-slate-500 leading-relaxed">Crucial for Browser Media APIs. Link your domain:</p>
                   <code className="block mt-4 bg-black/40 p-3 rounded-lg text-[10px] text-blue-400 border border-slate-800">
                     sudo certbot --nginx -d your-domain.com
                   </code>
                </div>
              </div>

              <section className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
                <div className="bg-slate-800 px-6 py-4 border-b border-slate-700 flex justify-between items-center">
                  <h3 className="text-sm font-bold flex items-center gap-2"><i className="fas fa-server"></i> NGINX CONFIGURATION</h3>
                  <span className="text-[10px] text-slate-400">/etc/nginx/sites-available/default</span>
                </div>
                <pre className="p-6 text-[11px] font-mono text-slate-300 bg-black/20 overflow-x-auto">
{`server {
    listen 80;
    server_name your-domain.com;
    root /var/www/gst-architect;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}`}
                </pre>
              </section>

              <section className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
                <div className="bg-slate-800 px-6 py-4 border-b border-slate-700 flex justify-between items-center text-amber-400">
                  <h3 className="text-sm font-bold flex items-center gap-2"><i className="fas fa-clock"></i> 24/7 AUTO-RESTART ENGINE</h3>
                  <span className="text-[10px]">/etc/systemd/system/gst-stream.service</span>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-xs text-slate-500 italic">Create this file to ensure your stream starts automatically if the server reboots.</p>
                  <pre className="p-6 text-[11px] font-mono text-slate-300 bg-black/20 overflow-x-auto rounded-xl">
{`[Unit]
Description=GStreamer Session Service
After=network.target

[Service]
ExecStart=/usr/bin/python3 /home/user/streamer.py
Restart=always
User=user
Environment=API_KEY=your_key_here

[Install]
WantedBy=multi-user.target`}
                  </pre>
                  <code className="block bg-black/40 p-3 rounded-lg text-[10px] text-amber-500 border border-slate-800">
                    sudo systemctl enable gst-stream && sudo systemctl start gst-stream
                  </code>
                </div>
              </section>

              <div className="p-8 bg-blue-600/10 border border-blue-500/30 rounded-3xl">
                <h3 className="font-bold text-blue-400 mb-2 flex items-center gap-2">
                  <i className="fas fa-info-circle"></i> Deployment Final Step
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  1. Download the **Generated Python Code** for each session.<br/>
                  2. Upload them to your VPS via SCP or SFTP: <code className="text-white">scp streamer.py user@vps-ip:~/</code><br/>
                  3. If you have multiple sessions, create multiple service files or use a master Python script to launch them as threads.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'design' && (
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
                <section className="space-y-6">
                   <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800">
                      <h2 className="text-lg font-bold mb-6">Stream Parameters</h2>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Session Name</label>
                          <input type="text" value={currentSession.name} onChange={(e) => updateSession({ name: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                             <label className="text-[10px] font-bold text-slate-500 uppercase">Video Source</label>
                             <select value={currentSession.videoSource} onChange={(e) => updateSession({ videoSource: e.target.value as SourceType })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs">
                               <option value={SourceType.TEST}>Test Pattern</option>
                               <option value={SourceType.WEBCAM}>Live Camera</option>
                               <option value={SourceType.NETWORK}>URL/Network</option>
                             </select>
                           </div>
                           <div className="space-y-1">
                             <label className="text-[10px] font-bold text-slate-500 uppercase">Bitrate (kbps)</label>
                             <input type="number" value={currentSession.vBitrate} onChange={(e) => updateSession({ vBitrate: parseInt(e.target.value) })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm" />
                           </div>
                        </div>
                      </div>
                   </div>

                   <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold">Video Playlist</h2>
                        <button onClick={() => addPlaylistItem('video')} className="text-[10px] bg-blue-600 px-3 py-1 rounded-lg font-bold">ADD URI</button>
                      </div>
                      <div className="space-y-2">
                        {currentSession.videoPlaylist?.map((url, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs" value={url} onChange={(e) => updatePlaylistItem('video', idx, e.target.value)} placeholder="rtmp://... or file:///..." />
                            <button onClick={() => removePlaylistItem('video', idx)} className="text-slate-600 hover:text-red-500"><i className="fas fa-trash"></i></button>
                          </div>
                        ))}
                      </div>
                   </div>
                </section>

                <section className="space-y-6">
                  <PipelineVisualizer session={currentSession} />
                  <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800">
                     <h2 className="text-[10px] font-bold text-slate-500 uppercase mb-4">GStreamer Logic</h2>
                     <div className="bg-black/40 p-6 rounded-2xl border border-slate-800 text-[10px] font-mono text-blue-400 break-all leading-relaxed shadow-inner">
                        gst-launch-1.0 {generatePipelineString(currentSession)}
                     </div>
                  </div>
                </section>
            </div>
          )}

          {activeTab === 'monitor' && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
                <div className="bg-black rounded-[40px] border border-slate-800 overflow-hidden aspect-video relative shadow-2xl group">
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover grayscale opacity-60" />
                  {!isStreaming && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">
                      <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800">
                        <i className="fas fa-video-slash text-slate-700 text-2xl"></i>
                      </div>
                      <p className="text-slate-500 font-bold tracking-widest text-sm">NO ACTIVE PIPELINE</p>
                    </div>
                  )}
                  {isStreaming && (
                    <div className="absolute top-8 left-8 flex items-center gap-3 px-4 py-2 bg-red-600/20 border border-red-500 rounded-full">
                       <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                       <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">Live Preview</span>
                    </div>
                  )}
                </div>

                <div className="bg-slate-900 rounded-3xl border border-slate-800 flex flex-col h-64 overflow-hidden">
                   <div className="bg-slate-800 px-6 py-3 text-xs font-bold text-slate-400">SESSION TERMINAL LOGS</div>
                   <div className="flex-1 overflow-y-auto p-6 font-mono text-[10px] text-slate-500 space-y-1 bg-black/20 custom-scrollbar">
                      {liveLogs.map((log, i) => <div key={i}>{log}</div>)}
                      <div ref={logEndRef} />
                   </div>
                </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
               <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
                  <div className="bg-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-700">
                    <span className="text-xs font-mono text-slate-300">gst_production_engine.py</span>
                    <button onClick={() => { navigator.clipboard.writeText(generatePythonCode(currentSession)); alert("Copied!"); }} className="text-xs text-blue-400 hover:text-blue-200 font-bold">COPY PYTHON</button>
                  </div>
                  <pre className="p-10 text-[12px] font-mono text-blue-100 overflow-x-auto h-[600px] bg-[#0d1117] custom-scrollbar leading-relaxed">
                    <code>{generatePythonCode(currentSession)}</code>
                  </pre>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
