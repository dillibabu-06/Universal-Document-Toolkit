import { useState } from 'react';
import { ShieldCheck, Database, HardDrive, Cpu, Search, FolderPlus, ArrowRight, Check } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
  onSelectFolder: () => Promise<void>;
  workspaces: any[];
}

export default function Onboarding({ onComplete, onSelectFolder, workspaces }: OnboardingProps) {
  const [step, setStep] = useState(1);

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-300 font-sans antialiased select-none items-center justify-center relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-indigo-900/10 blur-[120px]"></div>
        <div className="absolute top-[60%] -right-[10%] w-[50%] h-[50%] rounded-full bg-emerald-900/10 blur-[100px]"></div>
      </div>

      <div className="z-10 bg-zinc-900/80 backdrop-blur-xl border border-border-dark p-10 rounded-2xl shadow-2xl max-w-2xl w-full mx-4">
        
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                <Cpu className="h-6 w-6 text-indigo-400" />
              </div>
              <h1 className="text-2xl font-bold text-zinc-100 font-mono tracking-tight">Smart Document Workflow</h1>
            </div>
            
            <p className="text-zinc-400 text-lg leading-relaxed">
              Welcome to the local-first, offline-first productivity operating system. 
              Your files stay on your machine. We bring the intelligence.
            </p>

            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="bg-zinc-950 border border-border-dark p-4 rounded-lg flex items-start gap-3">
                <Search className="h-5 w-5 text-zinc-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-zinc-200">Instant Search</h4>
                  <p className="text-xs text-zinc-500 mt-1">Full-text OCR extraction across all PDFs and images instantly.</p>
                </div>
              </div>
              <div className="bg-zinc-950 border border-border-dark p-4 rounded-lg flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-zinc-200">100% Local</h4>
                  <p className="text-xs text-zinc-500 mt-1">No cloud dependencies. Safe for sensitive finance and enterprise data.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                onClick={() => setStep(2)}
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div>
              <h2 className="text-xl font-bold text-zinc-100">Connect Your First Workspace</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Select a folder on your Mac to start monitoring. We recommend Documents or Downloads.
              </p>
            </div>

            <div className="bg-zinc-950/50 border border-dashed border-zinc-700 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 bg-zinc-900 rounded-full border border-border-dark">
                <HardDrive className="h-8 w-8 text-zinc-500" />
              </div>
              
              {workspaces.length === 0 ? (
                <div>
                  <button 
                    onClick={async () => {
                      await onSelectFolder();
                    }}
                    className="bg-zinc-100 hover:bg-white text-zinc-900 px-6 py-2.5 rounded font-bold shadow-lg transition-all flex items-center gap-2 mx-auto"
                  >
                    <FolderPlus className="h-4 w-4" /> Select Directory
                  </button>
                  <p className="text-[10px] text-zinc-600 mt-3 font-mono">Native OS permission dialog will appear.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-emerald-400 font-bold flex items-center justify-center gap-2">
                    <Check className="h-4 w-4" /> Workspace Connected
                  </div>
                  <div className="text-xs text-zinc-500 font-mono bg-zinc-900 px-3 py-1 rounded inline-block border border-border-dark">
                    {workspaces[0].paths[0]}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <button 
                onClick={() => setStep(1)}
                className="text-zinc-500 hover:text-zinc-300 px-4 py-2 text-sm font-bold transition-colors"
              >
                Back
              </button>
              
              <button 
                onClick={onComplete}
                disabled={workspaces.length === 0}
                className={`px-6 py-2 rounded font-bold shadow-lg transition-all flex items-center gap-2 ${
                  workspaces.length > 0 
                    ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/20' 
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
              >
                Launch Dashboard <Database className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}
