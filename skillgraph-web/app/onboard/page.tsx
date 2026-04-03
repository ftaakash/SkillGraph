'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import Link from 'next/link'
import { ArrowRight, UploadCloud, FileText, Loader2, CheckCircle2 } from 'lucide-react'
import PageTransition from "@/components/PageTransition"
import NetworkBackground from "@/components/NetworkBackground"
import SkillGraphLogo from "@/components/SkillGraphLogo"
import { Button } from "@/components/ui/button"

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
    <PageTransition>
      <div className="min-h-screen bg-background relative flex text-foreground overflow-hidden pinstripe-pattern">
        <NetworkBackground />
        
        {/* LEFT COLUMN: HERO MARKETING */}
        <div className="flex-1 hidden lg:flex flex-col justify-center px-16 lg:px-24 relative z-10">
          <SkillGraphLogo className="scale-125 origin-left mb-12" />

          <h3 className="font-heading text-xs font-black tracking-[0.3em] text-primary uppercase mb-6">The Future of Engineering</h3>
          <h1 className="font-heading text-5xl lg:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
            Prime your <span className="italic text-primary">Neural Profile.</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-lg leading-relaxed mb-12">
            Upload your academic or professional curriculum. Our AI will instantly decode your experience 
            and cross-reference it against 1,420 high-stakes industrial roles.
          </p>

          <div className="space-y-6 max-w-lg">
            <div className="bg-card border border-border rounded-2xl p-6 flex gap-4 items-center backdrop-blur-sm shadow-xl">
               <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center flex-shrink-0 border border-primary/20">
                 <FileText size={24} />
               </div>
               <div>
                 <h4 className="font-bold text-foreground mb-1">Deep Skill Extraction</h4>
                 <p className="text-xs text-muted-foreground">Natural language processing identifies hidden technical architecture in your history.</p>
               </div>
            </div>
          </div>

          <div className="absolute bottom-8 left-16 right-0 flex max-w-max items-center justify-between text-[10px] font-black tracking-widest text-muted-foreground uppercase">
            <span className="flex gap-16">
              <span>SkillGraph</span>
              <span>© 2024 SKILLGRAPH. ENGINEERING THE FUTURE.</span>
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: UPLOAD FLOW */}
        <div className="w-full lg:w-[600px] bg-card border-l border-border flex flex-col justify-center px-8 lg:px-16 py-12 relative z-10 shadow-2xl backdrop-blur-sm">
          
          <div className="mb-8">
            <h2 className="font-heading text-3xl font-bold mb-2">Create Architect Account</h2>
            <p className="text-muted-foreground text-sm">Step 2 of 2: Curriculum Ingestion</p>
            <div className="mt-4 flex gap-2">
              <div className="flex-1 h-1 bg-primary rounded-full glow-primary"></div>
              <div className="flex-1 h-1 bg-primary rounded-full glow-primary"></div>
            </div>
          </div>

          {step === 2 && (
            <div className="space-y-6">
              <div {...getRootProps()} className={`border border-dashed rounded-xl p-10 text-center cursor-pointer transition-all bg-muted/30
                ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                <input {...getInputProps()} />
                <div className="w-16 h-16 mx-auto bg-card rounded-full flex items-center justify-center mb-4 shadow-lg border border-border">
                  <UploadCloud className="w-8 h-8 text-primary" />
                </div>
                {file ? (
                  <p className="text-primary font-bold text-sm tracking-wide">{file.name}</p>
                ) : (
                  <p className="text-muted-foreground text-sm">Drag & Drop your resume (PDF), or <span className="text-primary font-bold tracking-wide">Browse Files</span></p>
                )}
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-4 font-bold">Max File Size: 5MB</p>
              </div>
              
              {error && <div className="text-destructive text-xs bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg">{error}</div>}
              
              <Button onClick={handleUpload} disabled={!file || loading}
                className="w-full mt-4 gradient-primary text-primary-foreground font-semibold glow-primary py-6 rounded-lg text-sm transition-all flex justify-center items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Initialize Core Analysis <ArrowRight size={16} className="ml-1" />
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="bg-muted/30 border border-border rounded-2xl p-8 text-center pt-12 shadow-lg">
              <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-6 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
              <h2 className="font-heading font-bold text-xl mb-6 text-foreground tracking-wide">Analyzing Neural Profile</h2>
              
              <div className="space-y-4 mt-6 text-left max-w-xs mx-auto">
                <div className="flex items-center gap-3">
                   <div className="w-4 h-4 bg-emerald-500 rounded-full flex-shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                   <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Curriculum Parsed</span>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-4 h-4 bg-emerald-500 rounded-full flex-shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                   <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Skills Extracted</span>
                </div>
                <div className="flex items-center gap-3 opacity-60">
                   <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                   <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Mapping Architecture Gaps...</span>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-10 text-center pt-12 shadow-lg">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="font-heading font-bold text-xl mb-4 text-foreground">Profile Synchronized</h2>
              <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                We extracted <strong className="text-foreground bg-muted px-1.5 py-0.5 rounded ml-1">{result?.skillsExtracted ?? 'multiple'}</strong> 
                 core skills from your curriculum and calculated your readiness indices.
              </p>
              <Button onClick={() => router.push('/dashboard')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-6 rounded-lg text-sm transition shadow-[0_4px_14px_0_rgba(16,185,129,0.39)]">
                Enter Dashboard Portal
              </Button>
            </div>
          )}

        </div>
      </div>
    </PageTransition>
  )
}
