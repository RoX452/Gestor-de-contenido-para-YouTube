import fs from 'fs';
const filePath = './src/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix models
content = content.replace(/gemini-3.1-flash-lite-preview/g, 'gemini-1.5-flash');
content = content.replace(/gemini-3.1-flash-tts-preview/g, 'gemini-2.0-flash');

// Fix everything
content = content.replace(/gemini-3.1-flash-lite-preview/g, 'gemini-1.5-flash');
content = content.replace(/gemini-3.1-flash-tts-preview/g, 'gemini-2.0-flash');

const target = `{/* Debug Console Overlay */}`;
const restOfFile = `
                <AnimatePresence>
                  {showLogs && (
                    <motion.div 
                      id="debug-console"
                      initial={{ y: 300, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 300, opacity: 0 }}
                      className="absolute bottom-6 left-6 right-6 h-48 bg-black/95 border border-slate-800 rounded-3xl shadow-2xl z-40 overflow-hidden flex flex-col backdrop-blur-xl"
                    >
                       <div id="debug-header" className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-slate-900/50">
                          <div className="flex items-center gap-2">
                            <MonitorPlay className="w-4 h-4 text-emerald-400" />
                            <span className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em]">Debug Console & Pipeline Logs</span>
                          </div>
                          <button onClick={() => setShowLogs(false)} className="text-slate-500 hover:text-white shrink-0">
                            <Maximize2 className="w-3 h-3" />
                          </button>
                       </div>
                       <div id="debug-body" className="flex-1 p-5 font-mono text-[10px] overflow-y-auto custom-scrollbar space-y-1">
                          {logs.length === 0 ? (
                            <div className="text-slate-700 italic">Esperando eventos del pipeline...</div>
                          ) : (
                            logs.map((log, i) => (
                              <div key={i} className={cn(
                                "border-l-2 pl-3 py-0.5 whitespace-pre-wrap",
                                log.includes('ERROR') ? "border-red-500 text-red-400 bg-red-500/5" : "border-emerald-500 text-emerald-400/80"
                              )}>
                                {log}
                              </div>
                            ))
                          )}
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}`;

const parts = content.split('/* Debug Console Overlay */');
if (parts.length === 2) {
    content = parts[0] + target + restOfFile;
}

fs.writeFileSync(filePath, content);
