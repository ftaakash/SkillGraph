'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import Link from 'next/link'

type Step = 1 | 2 | 3 | 4

export default function OnboardPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(2)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ skillsExtracted: number } | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) { setFile(accepted[0]); setError('') }
  }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxSize: 5 * 1024 * 1024, maxFiles: 1,
    onDropRejected: () => setError('Please upload a PDF under 5MB')
  })

  const handleUpload = async () => {
    if (!file) return
    setLoading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/resume/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Upload failed'); return }
      setResult(data)
      setStep(3)
      // Trigger gap analysis
      const user = await fetch('/api/users/me').then(r => r.json())
      await fetch('/api/gaps', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ targetRole: user.user?.targetRole ?? 'Industrial AI Engineer' }),
      })
      setStep(4)
    } catch { setError('Upload failed. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] flex text-white relative overflow-hidden">
      
      {/* LEFT COLUMN: HERO MARKETING */}
      <div className="flex-1 hidden lg:flex flex-col justify-center px-16 lg:px-24 relative">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none"></div>

        <h3 className="text-[10px] font-black tracking-[0.3em] text-blue-400 uppercase mb-6">The Future of Engineering</h3>
        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
          Prime your <span className="italic text-[#3B82F6]">Neural Profile.</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-lg leading-relaxed mb-12">
          Upload your academic or professional curriculum. Our AI will instantly decode your experience 
          and cross-reference it against 1,420 high-stakes industrial roles.
        </p>

        <div className="space-y-6 max-w-lg">
          <div className="bg-[#141824] border border-[#1C212B] rounded-2xl p-6 flex gap-4 items-center">
             <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-lg flex items-center justify-center flex-shrink-0 border border-purple-500/20">
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
             </div>
             <div>
               <h4 className="font-bold text-white mb-1">Deep Skill Extraction</h4>
               <p className="text-xs text-gray-400">Natural language processing identifies hidden technical architecture in your history.</p>
             </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-16 right-0 flex max-w-max items-center justify-between text-[10px] font-black tracking-widest text-gray-500 uppercase">
          <span className="flex gap-16">
            <span>SkillGraph</span>
            <span>© 2024 SKILLGRAPH. ENGINEERING THE FUTURE.</span>
          </span>
        </div>
      </div>

      {/* RIGHT COLUMN: UPLOAD FLOW */}
      <div className="w-full lg:w-[600px] bg-[#141824] border-l border-[#1C212B] flex flex-col justify-center px-8 lg:px-16 py-12 relative z-10">
        
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Create Architect Account</h2>
          <p className="text-gray-400 text-sm">Step 2 of 2: Curriculum Ingestion</p>
          <div className="mt-4 flex gap-2">
            <div className="flex-1 h-1 bg-blue-500 rounded-full"></div>
            <div className="flex-1 h-1 bg-blue-500 rounded-full"></div>
          </div>
        </div>

        {step === 2 && (
          <div className="space-y-6">
            <div {...getRootProps()} className={`border border-dashed rounded-xl p-10 text-center cursor-pointer transition-all bg-[#1C212B]/30
              ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-[#2D3544] hover:border-gray-500'}`}>
              <input {...getInputProps()} />
              <div className="w-16 h-16 mx-auto bg-[#1C212B] rounded-full flex items-center justify-center mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              </div>
              {file ? (
                <p className="text-green-400 font-bold text-sm tracking-wide">{file.name}</p>
              ) : (
                <p className="text-gray-400 text-sm">Drag & Drop your resume (PDF), or <span className="text-blue-400 font-bold tracking-wide">Browse Files</span></p>
              )}
              <p className="text-[10px] uppercase tracking-widest text-gray-600 mt-4 font-bold">Max File Size: 5MB</p>
            </div>
            
            {error && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</div>}
            
            <button onClick={handleUpload} disabled={!file || loading}
              className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-3.5 rounded-lg text-sm font-bold shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.23)] disabled:opacity-50 transition-all flex justify-center items-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              Initialize Core Analysis
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="bg-[#1C212B]/30 border border-[#2D3544] rounded-2xl p-8 text-center pt-12">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
            <h2 className="font-bold text-xl mb-6 text-white tracking-wide">Analyzing Neural Profile</h2>
            
            <div className="space-y-4 mt-6 text-left max-w-xs mx-auto">
              <div className="flex items-center gap-3">
                 <div className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0"></div><span className="text-xs text-green-400 font-bold uppercase tracking-wider">Curriculum Parsed</span>
              </div>
              <div className="flex items-center gap-3">
                 <div className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0"></div><span className="text-xs text-green-400 font-bold uppercase tracking-wider">Skills Extracted</span>
              </div>
              <div className="flex items-center gap-3 opacity-60">
                 <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div><span className="text-xs text-gray-300 font-bold uppercase tracking-wider">Mapping Architecture Gaps...</span>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-10 text-center pt-12">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="font-bold text-xl mb-4 text-white">Profile Synchronized</h2>
            <p className="text-gray-400 mb-8 text-sm leading-relaxed">
              We extracted <strong className="text-white bg-white/10 px-1 rounded">{result?.skillsExtracted ?? 'multiple'}</strong> 
              core skills from your curriculum and calculated your readiness indices.
            </p>
            <button onClick={() => router.push('/dashboard')} className="w-full bg-[#1C64F2] hover:bg-blue-600 text-white font-bold px-6 py-4 rounded-lg text-sm transition shadow-[0_4px_14px_0_rgba(28,100,242,0.39)]">
              Enter Dashboard Portal
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
