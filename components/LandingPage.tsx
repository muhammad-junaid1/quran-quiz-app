import React, { useState } from 'react';
import BankLogo from "../assets/bank-logo.png"; 

interface LandingPageProps {
  onSignIn: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSignIn }) => {
  const [copied, setCopied] = useState(false);

  const bankInfo = {
    bank: "Allied Bank Limited",
    accountTitle: "Muhammad Junaid",
    accountNumber: "11130010154122580018",
    iban: "PK24ABPA0010154122580018",
  };

  const handleCopy = () => {
    const text = `Bank: ${bankInfo.bank}\nTitle: ${bankInfo.accountTitle}\nAccount: ${bankInfo.accountNumber}\nIBAN: ${bankInfo.iban}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-emerald-500/20 overflow-x-hidden">
      {/* Background Orbs */}
      <div className="fixed -top-64 -right-64 w-[800px] h-[800px] bg-emerald-500/[0.03] rounded-full blur-[160px] pointer-events-none"></div>
      <div className="fixed -bottom-64 -left-64 w-[800px] h-[800px] bg-white/[0.02] rounded-full blur-[160px] pointer-events-none"></div>

      {/* Navigation */}
      <nav className="relative z-10 px-8 py-8 flex items-center justify-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3 group cursor-default">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center ring-1 ring-emerald-500/20 group-hover:ring-emerald-500/40 transition-all duration-500">
            <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.976 8.976 0 00-1.318.236 1 1 0 01-1.091-.637 2.993 2.993 0 00-.816-1.112c-.4-.307-.862-.533-1.352-.667z" />
            </svg>
          </div>
          <span className="text-xl font-premium font-semibold text-white tracking-tight">QuranFurqan</span>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 px-8 pt-20 pb-32 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-full mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-emerald-400/80">Self-Assessment Journey</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-premium font-light text-white mb-8 tracking-tighter leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-1000">
          Deepen Your Understanding of <br /> 
          <span className="font-arabic text-emerald-400">القرآن الكريم</span>
        </h1>
        
        <p className="text-zinc-500 max-w-2xl mb-12 font-light text-lg md:text-xl leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          A self-assessment experience designed to help you verify and deepen your understanding of the Quran, chapter by chapter. Track your progress and preserve your growth.
        </p>

        <button 
          onClick={onSignIn}
          className="px-12 py-5 bg-white text-black rounded-full text-sm font-premium font-bold uppercase tracking-[0.2em] hover:bg-zinc-100 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300 active:scale-95"
          
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign In with Google
        </button>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-40 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
          <div className="p-8 bg-white/[0.02] border border-white/[0.05] rounded-[32px] text-left hover:border-emerald-500/20 transition-all group">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.584.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-premium font-semibold text-white mb-3">Chapter Assessment</h3>
            <p className="text-sm text-zinc-500 leading-relaxed font-light">Test your knowledge of each Surah with precise questions designed for self-assessment.</p>
          </div>

          <div className="p-8 bg-white/[0.02] border border-white/[0.05] rounded-[32px] text-left hover:border-blue-500/20 transition-all group">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-blue-500/20 group-hover:scale-110 transition-transform duration-500">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
              </svg>
            </div>
            <h3 className="text-lg font-premium font-semibold text-white mb-3">Mastery Tracking</h3>
            <p className="text-sm text-zinc-500 leading-relaxed font-light">Comprehensive progress tracking across all chapters to visualize your learning journey.</p>
          </div>

          <div className="p-8 bg-white/[0.02] border border-white/[0.05] rounded-[32px] text-left hover:border-purple-500/20 transition-all group">
            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-purple-500/20 group-hover:scale-110 transition-transform duration-500">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <h3 className="text-lg font-premium font-semibold text-white mb-3">Refined Experience</h3>
            <p className="text-sm text-zinc-500 leading-relaxed font-light">A distraction-free, high-end interface optimized for meaningful reflection and focus.</p>
          </div>
        </div>
      </main>

      {/* Support Section */}
      <section className="relative z-10 px-8 py-32 max-w-5xl mx-auto border-t border-white/[0.05]">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-8 ring-1 ring-emerald-500/20">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-premium font-light text-white mb-4 tracking-tight">Support My Journey</h2>
          <p className="text-zinc-500 max-w-xl mb-12 font-light leading-relaxed">
            Help me perform Umrah. If this app has been meaningful to you, your support would help me reach this spiritual milestone.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        
            {/* Bank Transfer Option */}
            <div className="p-8 bg-white/[0.02] border border-white/[0.05] rounded-[32px] flex flex-col items-center justify-between transition-all">
              <div className="text-center mb-10">
                <p className="text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">Local Support (Pakistan)</p>
                <h3 className="text-xl font-premium font-semibold text-white">Bank Transfer</h3>
              </div>
              
              <div className="mb-12 flex flex-col items-center gap-4">
                <img src={BankLogo} alt="Allied Bank Logo" className="h-14 w-auto object-contain brightness-110" />
                <p className="text-[10px] text-zinc-500 uppercase tracking-[0.4em] font-medium">Allied Bank Limited</p>
              </div>

              <button 
                onClick={handleCopy}
                className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-zinc-300 text-xs font-premium font-bold uppercase tracking-[0.2em] hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied All Details
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy Details
                  </>
                )}
              </button>
            </div>

                {/* RapidoConnect Option */}
                <div className="p-8 bg-white/[0.02] border border-white/[0.05] rounded-[32px] flex flex-col items-center justify-between group hover:border-emerald-500/20 transition-all">
                  <div className="text-center mb-10">
                    <p className="text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">Global Support</p>
                    <h3 className="text-xl font-premium font-semibold text-white">Direct Transfer</h3>
                  </div>
                  
                  <div className="mb-12 flex flex-col items-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-4xl font-bold text-white tracking-tighter uppercase">Share</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] text-zinc-500 font-medium">powered by</span>
                        <div className="flex items-center">
                          <span className="text-sm font-bold text-white tracking-tight">rapido</span>
                          <span className="text-sm font-bold text-emerald-400 tracking-tight">connect</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <a 
                    href="https://rapido.com/share/YOUR_ID" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs font-premium font-bold uppercase tracking-[0.2em] hover:bg-emerald-500 hover:text-white transition-all text-center"
                  >
                    Send Support
                  </a>
                </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-20 px-8 border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center ring-1 ring-emerald-500/20">
                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.976 8.976 0 00-1.318.236 1 1 0 01-1.091-.637 2.993 2.993 0 00-.816-1.112c-.4-.307-.862-.533-1.352-.667z" />
                </svg>
              </div>
              <span className="text-lg font-premium font-semibold text-white tracking-tight">QuranFurqan</span>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-6">
            <p className="text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-zinc-500">Contact Developer</p>
            <div className="flex items-center gap-8">
              <a href="mailto:mjunaid.swe@gmail.com" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors group">
                <svg className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="font-light">mjunaid.swe@gmail.com</span>
              </a>
              <a href="https://instagram.com/thecreativejnd" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors group">
                <svg className="w-4 h-4 text-zinc-600 group-hover:text-pink-500 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.058 2.633.304 3.511 1.183.879.878 1.125 2.145 1.183 3.511.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.058 1.366-.304 2.633-1.183 3.511-.878.879-2.145 1.125-3.511 1.183-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.058-2.633-.304-3.511-1.183-.879-.878-1.125-2.145-1.183-3.511-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.058-1.366.304-2.633 1.183-3.511.878-.879 2.145-1.125 3.511-1.183 1.266-.058 1.646-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948s.014 3.667.072 4.947c.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072s3.667-.014 4.947-.072c4.358-.2 6.78-2.618 6.98-6.98.058-1.281.072-1.689.072-4.948s-.014-3.667-.072-4.947c-.2-4.358-2.618-6.78-6.98-6.98-1.281-.058-1.689-.072-4.948-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                <span className="font-light">@thecreativejnd</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

