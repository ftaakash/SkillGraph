'use client'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0D14] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      
      {/* HEADER */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-[#1C212B] bg-[#0A0D14]/80 backdrop-blur-md sticky top-0 z-50">
        <h1 className="text-xl font-black tracking-tight">
          Skill<span className="text-blue-500">Graph</span>
        </h1>
        <nav className="hidden md:flex gap-8 text-xs font-bold text-gray-400">
          <Link href="#platform" className="text-blue-400 border-b-2 border-blue-500 pb-1">Platform</Link>
          <Link href="/market" className="hover:text-white transition">Skill Market</Link>
          <Link href="/benchmark" className="hover:text-white transition">Benchmarks</Link>
          <Link href="#about" className="hover:text-white transition">About</Link>
        </nav>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-xs font-bold text-gray-300 hover:text-white transition">Login</Link>
          <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            Get Started
          </Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative px-8 lg:px-24 py-20 lg:py-32 flex flex-col lg:flex-row items-center gap-16 max-w-[1600px] mx-auto">
        {/* Glow */}
        <div className="absolute top-0 left-[20%] w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="flex-1 relative z-10">
          <div className="bg-[#1C212B] text-gray-300 px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest flex items-center gap-2 border border-[#2D3544] w-fit mb-8 uppercase">
             <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
             Industrial AI Engine v2.0
          </div>
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
            Engineer Your Future <br/>
            with <span className="text-cyan-400 font-black">AI Intelligence</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl leading-relaxed mb-10">
            The command center for engineering students. Bridge the skill gap between academia 
            and high-stakes industrial AI roles with data-driven career roadmaps.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/register" className="bg-[#B1C5FF] hover:bg-white text-[#0A0D14] font-bold px-8 py-4 rounded-xl text-sm transition text-center shadow-[0_0_20px_rgba(177,197,255,0.2)]">
              Analyze Skill Gap
            </Link>
            <Link href="/benchmark" className="bg-[#1C212B] hover:bg-[#2D3544] border border-[#2D3544] text-white font-bold px-8 py-4 rounded-xl text-sm transition text-center">
              View Benchmarks
            </Link>
          </div>
        </div>

        {/* HERO GRAPHIC (Mockup simulation) */}
        <div className="flex-1 w-full relative z-10">
          <div className="bg-[#0F1626] border border-[#1E2B4D] rounded-3xl p-6 shadow-2xl relative overflow-hidden h-[450px] flex flex-col justify-between group">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/micro-carbon.png')] opacity-20 MixBlendMode-overlay"></div>
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-cyan-500/20 blur-[80px] rounded-full"></div>
            
            {/* Abstract HUD lines mimicking the original graphic */}
            <div className="relative z-10 opacity-70">
              <div className="flex justify-between items-start mb-4 border-b border-cyan-900/50 pb-4">
                 <div className="w-32 h-20 border border-cyan-800 bg-cyan-900/20"></div>
                 <div className="w-48 h-20 border border-cyan-800 bg-cyan-900/20 grid grid-cols-4 gap-1 p-1">
                   {Array.from({length: 16}).map((_, i) => <div key={i} className="bg-cyan-500/20"></div>)}
                 </div>
                 <div className="w-20 h-20 rounded-full border border-cyan-500 border-dashed flex items-center justify-center animate-[spin_10s_linear_infinite]">
                    <div className="w-16 h-16 rounded-full border-2 border-cyan-400 border-t-transparent animate-[spin_3s_linear_infinite]"></div>
                 </div>
              </div>
              
              <div className="h-24 w-full flex flex-col gap-2 mt-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-400/20 to-cyan-500/0 blur-md"></div>
                {Array.from({length: 6}).map((_, i) => (
                  <div key={i} className="h-1 bg-cyan-900/80 w-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 bg-cyan-400" style={{ width: `${[60, 85, 40, 95, 55, 75][i]}%`, animationDelay: `${i*0.2}s` }}></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#1C212B] border border-[#2D3544] rounded-xl p-5 relative z-10 flex flex-col gap-3">
              <div className="flex justify-between items-center text-[10px] font-black tracking-widest text-white uppercase">
                <span>Live Skill Analysis</span>
                <span className="text-cyan-400">↗</span>
              </div>
              <div className="h-2 w-full bg-[#0A0D14] rounded-full overflow-hidden">
                <div className="h-full bg-[#B1C5FF] w-[85%]"></div>
              </div>
              <div className="h-2 w-[70%] bg-[#0A0D14] rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 w-[60%]"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CORE ECOSYSTEM */}
      <section className="bg-[#111215] py-24 px-8 lg:px-24">
        <div className="max-w-[1600px] mx-auto">
          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-4">Core Ecosystem</h2>
            <p className="text-gray-400 text-sm max-w-xl leading-relaxed">
              Precision tools designed to architect your professional trajectory in the modern industrial landscape.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Skill Gap Analysis */}
            <div className="col-span-12 md:col-span-8 bg-[#1B1B1C] border border-[#2A2A2B] hover:border-gray-500 transition rounded-3xl p-8 relative overflow-hidden group min-h-[300px] flex flex-col">
              <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              
              <div className="relative z-10 flex flex-col h-full justify-center">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 w-1/2">Advanced Skill Gap Analysis</h3>
                <p className="text-gray-400 text-sm w-1/2 leading-relaxed mb-8">
                  Our AI decodes industrial job requirements and maps them against your current academic profile to highlight exactly what you're missing.
                </p>
                <div className="flex gap-2">
                  <span className="bg-[#2A2A2B] text-gray-300 text-[10px] font-bold px-3 py-1.5 rounded-full">Python</span>
                  <span className="bg-[#2A2A2B] text-gray-300 text-[10px] font-bold px-3 py-1.5 rounded-full">TensorFlow</span>
                  <span className="bg-[#2A2A2B] text-gray-300 text-[10px] font-bold px-3 py-1.5 rounded-full">PLC Logic</span>
                </div>
              </div>
            </div>

            {/* Career Benchmarks */}
            <div className="col-span-12 md:col-span-4 bg-[#1C64F2] text-white rounded-3xl p-8 flex flex-col justify-center relative overflow-hidden shadow-[0_20px_40px_rgba(28,100,242,0.15)] group hover:-translate-y-1 transition-transform">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400 blur-[80px] rounded-full opacity-50"></div>
              <div className="relative z-10">
                <div className="w-10 h-10 mb-6 flex space-x-1 items-end">
                  <div className="w-2 h-4 bg-white rounded-sm"></div>
                  <div className="w-2 h-7 bg-white rounded-sm"></div>
                  <div className="w-2 h-10 bg-white rounded-sm"></div>
                </div>
                <h3 className="text-2xl font-bold mb-4">Career Benchmarks</h3>
                <p className="text-blue-100/80 text-sm leading-relaxed mb-8">
                  Compare your trajectory with top engineering peers across the global industrial sector.
                </p>
                <Link href="/benchmark" className="text-white font-bold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
                  Explore Data &rarr;
                </Link>
              </div>
            </div>

            {/* AI Project Ideas */}
            <div className="col-span-12 md:col-span-4 bg-[#1E2022] border border-[#2A2A2B] hover:border-gray-500 transition rounded-3xl p-8 flex flex-col justify-center">
              <div className="w-10 h-10 bg-cyan-400/10 text-cyan-400 rounded-lg flex items-center justify-center mb-6">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">AI Project Ideas</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Get curated project prompts that simulate real-world industrial challenges and build a robust portfolio.
              </p>
            </div>

            {/* Linked AI Integration */}
            <div className="col-span-12 md:col-span-8 bg-[#1B1B1C] border border-[#2A2A2B] transition rounded-3xl p-8 flex items-center justify-between">
              <div className="max-w-md">
                <h3 className="text-2xl font-bold mb-4 text-white">Linked AI Integration</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Connect your professional profiles and let our AI scout for opportunities that match your evolving skill set in real-time.
                </p>
              </div>
              <div className="hidden lg:flex w-24 h-24 bg-[#141517] rounded-2xl items-center justify-center border border-[#2A2A2B]">
                 <svg className="w-10 h-10 text-gray-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm-1-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5 7h-2v-3c0-.55-.45-1-1-1s-1 .45-1 1v3h-2v-6h2v1.1c.36-.67 1.15-1.1 2-1.1 1.66 0 3 1.34 3 3v4z"/></svg>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SUCCESS STORIES */}
      <section className="bg-[#0A0D14] py-24 px-8 lg:px-24">
        <div className="max-w-[1600px] mx-auto text-center">
          <h3 className="text-[10px] font-black tracking-widest text-blue-500 uppercase mb-4">Success Stories</h3>
          <h2 className="text-4xl lg:text-5xl font-bold mb-16">Engineered for Success</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-[#141824] border border-[#1C212B] rounded-3xl p-8 relative">
              <div className="text-4xl text-[#1C212B] absolute top-6 right-6 font-serif">""</div>
              <p className="text-gray-400 text-sm leading-relaxed mb-8 italic relative z-10">
                "The skill gap analysis was a revelation. It identified specific ML frameworks I needed for the energy sector that my university curriculum hadn't even mentioned."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-800 rounded-full flex-shrink-0"></div>
                <div>
                  <h4 className="text-white font-bold text-sm">Marcus Chen</h4>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Robotics Intern @ Tesla</p>
                </div>
              </div>
            </div>

            <div className="bg-[#141824] border border-[#1C212B] shadow-[0_0_30px_rgba(37,99,235,0.05)] rounded-3xl p-8 relative">
              <div className="text-4xl text-[#1C212B] absolute top-6 right-6 font-serif">""</div>
              <p className="text-gray-300 text-sm leading-relaxed mb-8 italic relative z-10">
                "SkillGraph transformed my career search from guesswork into a tactical operation. The benchmarks gave me the leverage I needed during salary negotiations."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-700 rounded-full flex-shrink-0"></div>
                <div>
                  <h4 className="text-white font-bold text-sm">Sarah Jenkins</h4>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">AI Systems Architect</p>
                </div>
              </div>
            </div>

            <div className="bg-[#141824] border border-[#1C212B] rounded-3xl p-8 relative">
              <div className="text-4xl text-[#1C212B] absolute top-6 right-6 font-serif">""</div>
              <p className="text-gray-400 text-sm leading-relaxed mb-8 italic relative z-10">
                "The project ideas aren't just tutorials, they are complex industrial simulations. My portfolio went from 'student-level' to 'industry-ready' in three months."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-800 rounded-full flex-shrink-0"></div>
                <div>
                  <h4 className="text-white font-bold text-sm">David Okoro</h4>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Graduate Engineer</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#1C212B] bg-[#0A0D14] py-8 px-8 lg:px-24">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between text-[10px] font-black tracking-widest text-gray-500 uppercase gap-6">
          <div className="flex items-center gap-8">
            <span className="text-white">SkillGraph</span>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <span className="hover:text-white cursor-pointer transition">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer transition">Terms of Service</span>
            <span className="hover:text-white cursor-pointer transition">Documentation</span>
            <span className="hover:text-white cursor-pointer transition">Support</span>
          </div>
          <div>
            <span>© 2024 SKILLGRAPH. ENGINEERING THE FUTURE.</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
