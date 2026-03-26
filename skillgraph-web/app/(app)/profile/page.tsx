'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDropzone } from 'react-dropzone'

interface User { name: string; email: string; college: string; branch: string; year: string; targetRole: string; readinessScore: number; resumeUrl: string; sprintsCompleted: number; optimizerSessions: number }

const roles = ['Industrial AI Engineer', 'Data Analyst', 'ML Engineer', 'DevOps Engineer', 'Full Stack Dev', 'Cloud Architect', 'Cybersecurity Analyst', 'Product Manager']

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  
  // Settings Form
  const [form, setForm] = useState({ name: '', college: '', branch: '', year: '', targetRole: '' })
  const [password, setPassword] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [settingsError, setSettingsError] = useState('')

  // Resume Upload
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')

  useEffect(() => {
    fetch('/api/users/me').then(r => r.json()).then(d => {
      setUser(d.user)
      setForm({ name: d.user?.name ?? '', college: d.user?.college ?? '', branch: d.user?.branch ?? '', year: d.user?.year ?? '', targetRole: d.user?.targetRole ?? '' })
    })
  }, [])

  const handleSaveSettings = async () => {
    setSavingSettings(true); setSettingsSaved(false); setSettingsError('')
    
    const payload: any = { ...form }
    if (password) {
      if (password.length < 6) {
        setSettingsError('Password must be at least 6 characters.')
        setSavingSettings(false)
        return
      }
      payload.password = password
    }

    try {
      const res = await fetch('/api/users/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const d = await res.json()
        setSettingsError(d.error || 'Failed to update profile')
      } else {
        setSettingsSaved(true)
        setPassword('') // Clear password field after successful save
        setTimeout(() => setSettingsSaved(false), 3000)
      }
    } catch {
      setSettingsError('Network error.')
    } finally {
      setSavingSettings(false)
    }
  }

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) { setFile(accepted[0]); setUploadError(''); setUploadSuccess('') }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxSize: 5 * 1024 * 1024, maxFiles: 1,
    onDropRejected: () => setUploadError('Please upload a PDF under 5MB')
  })

  const handleResumeUpload = async () => {
    if (!file) return
    setUploading(true); setUploadError(''); setUploadSuccess('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/resume/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setUploadError(data.error || 'Upload failed'); return }
      
      setUploadSuccess('Curriculum parsed successfully. Re-running gap analysis...')
      
      await fetch('/api/gaps', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ targetRole: form.targetRole || 'Industrial AI Engineer' }),
      })
      
      setUploadSuccess('Neural profile updated with new curriculum.')
      setTimeout(() => window.location.reload(), 2000)
    } catch { setUploadError('Upload failed. Please try again.') }
    finally { setUploading(false) }
  }

  const inputCls = "w-full bg-[#0A0D14] border border-[#2D3544] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:bg-[#1C212B] focus:outline-none transition-all"
  const labelCls = "text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block focus-within:text-blue-400 transition-colors"

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 min-h-screen">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-4 relative z-10">
        <div className="max-w-xl">
          <span className="bg-[#1C212B] text-blue-400 text-[10px] font-black tracking-widest px-3 py-1.5 rounded-full uppercase mb-4 inline-block shadow-sm">Identity Management</span>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
            Neural <span className="text-blue-500">Profile</span>
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Configure your core identity metrics, operational parameters, and active authentication credentials.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        
        {/* SETTINGS CARD */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
          <div className="bg-[#141824] border border-[#1C212B] rounded-3xl p-8 shadow-xl">
            <h3 className="font-bold text-[10px] uppercase tracking-widest text-[#B1C5FF] mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Architectural Parameters
            </h3>
            
            <div className="space-y-5">
              <div>
                <label className={labelCls}>Full Name Designator</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your Full Name" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Educational Institution</label>
                <input value={form.college} onChange={e => setForm(f => ({ ...f, college: e.target.value }))} placeholder="University / College" className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className={labelCls}>Engineering Branch</label>
                   <input value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} placeholder="E.g. Computer Science" className={inputCls} />
                </div>
                <div>
                   <label className={labelCls}>Cohort / Year</label>
                   <select value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} className={inputCls}>
                     {['1st', '2nd', '3rd', '4th', 'Graduated'].map(y => <option key={y}>{y}</option>)}
                   </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Primary Target Specialization</label>
                <select value={form.targetRole} onChange={e => setForm(f => ({ ...f, targetRole: e.target.value }))} className={inputCls}>
                  {roles.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>

              <div className="pt-4 border-t border-[#1C212B]">
                <label className={labelCls}>Update Access Key (Password)</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep current password" className={inputCls} />
                <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-wider font-bold">Requires a minimum of 6 characters</p>
              </div>

              {settingsError && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg mt-4">{settingsError}</div>}
              {settingsSaved && <div className="text-green-400 text-xs bg-green-500/10 border border-green-500/20 px-3 py-2 rounded-lg mt-4">Profile metrics successfully updated in the core database.</div>}
              
              <button onClick={handleSaveSettings} disabled={savingSettings}
                className="w-full mt-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-3.5 rounded-xl text-sm font-bold shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.23)] disabled:opacity-50 transition-all">
                {savingSettings ? 'Committing Changes...' : 'Save Configuration Parameters'}
              </button>
            </div>
          </div>
        </div>

        {/* METRICS & RESUME SECTION */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          
          {/* USER STATS CARD */}
          {user && (
            <div className="bg-[#141824] border border-[#1C212B] rounded-3xl p-6 shadow-xl grid grid-cols-2 gap-4 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/5 rounded-full pointer-events-none"></div>
               
               <div className="col-span-2">
                 <h3 className="font-bold text-[10px] uppercase tracking-widest text-[#B1C5FF] mb-4 flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-blue-500"></span> Global Metrics
                 </h3>
               </div>

               <div className="bg-[#0A0D14] border border-[#1C212B] rounded-2xl p-4 text-center">
                  <div className="text-2xl font-black text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">{Math.round(user.readinessScore ?? 0)}%</div>
                  <div className="text-[9px] text-gray-500 font-bold mt-1 uppercase tracking-widest">Industry Readiness</div>
               </div>
               
               <div className="bg-[#0A0D14] border border-[#1C212B] rounded-2xl p-4 text-center">
                  <div className="text-2xl font-black text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]">{user.sprintsCompleted}</div>
                  <div className="text-[9px] text-gray-500 font-bold mt-1 uppercase tracking-widest">Growth Sprints</div>
               </div>
            </div>
          )}

          {/* RESUME MODULE */}
          <div className="bg-[#141824] border border-[#1C212B] rounded-3xl p-8 shadow-xl flex-1">
             <h3 className="font-bold text-[10px] uppercase tracking-widest text-[#B1C5FF] mb-6 flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-blue-500"></span> Curriculum Document
             </h3>
             
             <div className="flex flex-col h-full justify-center">
               <div className="mb-6">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-500/10 text-blue-500">
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                   </div>
                   <div>
                     <h4 className="text-white font-bold text-sm">Active Curriculum</h4>
                     <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-0.5">
                       {user?.readinessScore ? 'Parsed and fully integrated' : 'No curriculum detected'}
                     </p>
                   </div>
                 </div>
               </div>

               <div {...getRootProps()} className={`border border-dashed rounded-xl p-8 text-center cursor-pointer transition-all bg-[#0A0D14]
                 ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-[#2D3544] hover:border-gray-500'}`}>
                 <input {...getInputProps()} />
                 {file ? (
                   <div className="text-green-400 font-bold text-sm tracking-wide break-all">{file.name}</div>
                 ) : (
                   <div>
                     <svg className="w-6 h-6 text-gray-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                     <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Drop new PDF to overwrite</p>
                   </div>
                 )}
               </div>

               {uploadError && <div className="text-red-400 text-[10px] mt-4 bg-red-500/10 p-2 rounded uppercase font-bold tracking-wider text-center">{uploadError}</div>}
               {uploadSuccess && <div className="text-green-400 text-[10px] mt-4 bg-green-500/10 p-2 rounded uppercase font-bold tracking-wider text-center">{uploadSuccess}</div>}

               <button onClick={handleResumeUpload} disabled={!file || uploading}
                 className="w-full mt-4 bg-[#1C212B] hover:bg-[#2D3544] text-white py-3 rounded-xl text-xs font-bold uppercase tracking-widest disabled:opacity-50 transition-all shadow-[0_4px_14px_0_rgba(0,0,0,0.2)]">
                 {uploading ? 'Processing Data...' : 'Re-initialize Neural Mapping'}
               </button>
             </div>
          </div>
        </div>

      </div>
    </div>
  )
}
