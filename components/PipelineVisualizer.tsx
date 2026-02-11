
import React from 'react';
import { StreamSession } from '../types';

interface PipelineVisualizerProps {
  session: StreamSession;
}

const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({ session }) => {
  const activeDestinations = session.destinations.filter(d => d.isActive);

  return (
    <div className="w-full bg-slate-900 rounded-xl p-6 border border-slate-700 shadow-inner overflow-x-auto">
      <h3 className="text-sm font-semibold text-slate-400 mb-6 flex items-center gap-2">
        <i className="fas fa-project-diagram"></i> PIPELINE LOGIC VIEW
      </h3>
      
      <div className="flex items-center min-w-max gap-4 py-8">
        {/* Sources */}
        <div className="flex flex-col gap-4">
          <div className="bg-blue-600/20 border border-blue-500 p-3 rounded text-xs text-center w-32">
            <span className="block font-bold">VIDEO SRC</span>
            <span className="opacity-70">{session.videoSource}</span>
          </div>
          <div className="bg-blue-600/20 border border-blue-500 p-3 rounded text-xs text-center w-32">
            <span className="block font-bold">AUDIO SRC</span>
            <span className="opacity-70">{session.audioSource}</span>
          </div>
        </div>

        <i className="fas fa-long-arrow-alt-right text-slate-600"></i>

        {/* Processing/Encoders */}
        <div className="flex flex-col gap-4">
          <div className="bg-purple-600/20 border border-purple-500 p-3 rounded text-xs text-center w-32">
            <span className="block font-bold">V-ENCODE</span>
            <span className="opacity-70">{session.encoder}</span>
          </div>
          <div className="bg-purple-600/20 border border-purple-500 p-3 rounded text-xs text-center w-32">
            <span className="block font-bold">A-ENCODE</span>
            <span className="opacity-70">voaacenc</span>
          </div>
        </div>

        <i className="fas fa-long-arrow-alt-right text-slate-600"></i>

        {/* Tee */}
        <div className="flex flex-col gap-4">
          <div className="bg-amber-600/20 border border-amber-500 p-3 rounded-full h-12 w-12 flex items-center justify-center text-xs font-bold">
            TEE
          </div>
        </div>

        <i className="fas fa-share-alt text-slate-600"></i>

        {/* Dest Sinks */}
        <div className="flex flex-col gap-2">
          {activeDestinations.length > 0 ? activeDestinations.map((dest, idx) => (
            <div key={dest.id} className="flex items-center gap-3">
               <i className="fas fa-chevron-right text-slate-600"></i>
               <div className="bg-emerald-600/20 border border-emerald-500 p-2 rounded text-[10px] w-48 truncate">
                 <span className="block font-bold">RTMP SINK {idx+1}</span>
                 <span className="opacity-70">{dest.name}</span>
               </div>
            </div>
          )) : (
            <div className="text-slate-500 italic text-xs">No active destinations</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PipelineVisualizer;
