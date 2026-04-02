"use client";

import { useEffect, useState, useCallback } from 'react';
import { User as UserIcon, Mail, Briefcase, Upload, Shield, RefreshCw, CheckCircle2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { useDropzone } from 'react-dropzone';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface User { name: string; email: string; college: string; branch: string; year: string; targetRole: string; readinessScore: number; resumeUrl: string; sprintsCompleted: number; optimizerSessions: number }

const roles = ['Industrial AI Engineer', 'Data Analyst', 'ML Engineer', 'DevOps Engineer', 'Full Stack Dev', 'Cloud Architect', 'Cybersecurity Analyst', 'Product Manager'];

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  
  // Settings Form
  const [form, setForm] = useState({ name: '', college: '', branch: '', year: '', targetRole: '' });
  const [password, setPassword] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  // Resume Upload
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  useEffect(() => {
    fetch('/api/users/me').then(r => r.json()).then(d => {
      setUser(d.user);
      setForm({ name: d.user?.name ?? '', college: d.user?.college ?? '', branch: d.user?.branch ?? '', year: d.user?.year ?? '', targetRole: d.user?.targetRole ?? '' });
    });
  }, []);

  const handleSaveSettings = async () => {
    setSavingSettings(true); setSettingsSaved(false); setSettingsError('');
    
    const payload: any = { ...form };
    if (password) {
      if (password.length < 6) {
        setSettingsError('Password must be at least 6 characters.');
        setSavingSettings(false);
        return;
      }
      payload.password = password;
    }

    try {
      const res = await fetch('/api/users/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const d = await res.json();
        setSettingsError(d.error || 'Failed to update profile');
      } else {
        setSettingsSaved(true);
        setPassword('');
        setTimeout(() => setSettingsSaved(false), 3000);
      }
    } catch {
      setSettingsError('Network error.');
    } finally {
      setSavingSettings(false);
    }
  };

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) { setFile(accepted[0]); setUploadError(''); setUploadSuccess(''); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxSize: 5 * 1024 * 1024, maxFiles: 1,
    onDropRejected: () => setUploadError('Please upload a PDF under 5MB')
  });

  const handleResumeUpload = async () => {
    if (!file) return;
    setUploading(true); setUploadError(''); setUploadSuccess('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/resume/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error || 'Upload failed'); return; }
      
      setUploadSuccess('Curriculum parsed successfully. Re-running gap analysis...');
      
      await fetch('/api/gaps', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ targetRole: form.targetRole || 'Industrial AI Engineer' }),
      });
      
      setUploadSuccess('Neural profile updated with new curriculum.');
      setTimeout(() => window.location.reload(), 2000);
    } catch { setUploadError('Upload failed. Please try again.'); }
    finally { setUploading(false); }
  };

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  return (
    <PageTransition>
      <DashboardLayout title="Profile Settings">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-5xl">
          
          {/* SETTINGS CARD */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
               
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border/50">
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-heading text-xl font-bold ring-2 ring-primary/30 glow-primary">
                  {form.name ? getInitials(form.name) : 'US'}
                </div>
                <div>
                  <h2 className="font-heading text-xl font-semibold text-foreground">{form.name || 'User Profile'}</h2>
                  <p className="text-sm text-muted-foreground">{form.targetRole || 'Target Role Pending'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-foreground font-medium mb-1.5 block">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 text-muted-foreground" size={16} />
                    <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="pl-10 bg-background border-border text-foreground focus:border-primary transition-colors" placeholder="Full Name" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="text-sm text-foreground font-medium mb-1.5 block">Institution</label>
                     <Input value={form.college} onChange={(e) => setForm(f => ({ ...f, college: e.target.value }))} className="bg-background border-border text-foreground focus:border-primary transition-colors" placeholder="University" />
                   </div>
                   <div>
                     <label className="text-sm text-foreground font-medium mb-1.5 block">Branch</label>
                     <Input value={form.branch} onChange={(e) => setForm(f => ({ ...f, branch: e.target.value }))} className="bg-background border-border text-foreground focus:border-primary transition-colors" placeholder="Major" />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-foreground font-medium mb-1.5 block">Cohort / Year</label>
                    <select value={form.year} onChange={(e) => setForm(f => ({ ...f, year: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:border-primary outline-none transition-colors">
                      {['1st', '2nd', '3rd', '4th', 'Graduated'].map(y => <option key={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-foreground font-medium mb-1.5 block">Target Specialization</label>
                    <select value={form.targetRole} onChange={(e) => setForm(f => ({ ...f, targetRole: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:border-primary outline-none transition-colors">
                      {roles.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-border/50">
                  <label className="text-sm text-foreground font-medium mb-1.5 block">Update Password</label>
                  <div className="relative">
                     <Shield className="absolute left-3 top-3 text-muted-foreground" size={16} />
                     <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 bg-background border-border text-foreground focus:border-primary transition-colors" placeholder="Leave blank to keep current" />
                  </div>
                </div>

                {settingsError && <div className="text-destructive text-sm bg-destructive/10 border border-destructive/20 px-4 py-3 rounded-lg font-medium">{settingsError}</div>}
                {settingsSaved && <div className="text-success text-sm bg-success/10 border border-success/20 px-4 py-3 rounded-lg font-medium flex items-center gap-2"><CheckCircle2 size={16}/> Settings saved successfully.</div>}
                
                <Button onClick={handleSaveSettings} disabled={savingSettings} className="w-full mt-4 gradient-primary text-primary-foreground font-semibold glow-primary">
                  {savingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>

          {/* METRICS & RESUME CARD */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Global Stats */}
            {user && (
              <div className="bg-card border border-border rounded-lg p-6 shadow-sm flex gap-4">
                 <div className="flex-1 bg-background border border-border rounded-lg p-4 text-center">
                    <div className="text-3xl font-heading font-black text-primary glow-text drop-shadow-[0_0_10px_rgba(var(--primary),0.5)]">{Math.round(user.readinessScore ?? 0)}%</div>
                    <div className="text-[10px] text-muted-foreground font-semibold mt-1 uppercase tracking-widest">Industry Readiness</div>
                 </div>
                 
                 <div className="flex-1 bg-background border border-border rounded-lg p-4 text-center">
                    <div className="text-3xl font-heading font-black text-foreground drop-shadow-md">{user.sprintsCompleted}</div>
                    <div className="text-[10px] text-muted-foreground font-semibold mt-1 uppercase tracking-widest">Growth Sprints</div>
                 </div>
              </div>
            )}

            {/* Resume Upload */}
            <div className="bg-card border border-border rounded-lg p-6 flex-1 flex flex-col">
              <h2 className="font-heading text-lg font-semibold text-foreground mb-2">Curriculum Analytics</h2>
              <p className="text-sm text-muted-foreground mb-6">Upload an updated resume to recalculate gap analysis.</p>
              
              <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all flex flex-col justify-center flex-1 bg-background
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                <input {...getInputProps()} />
                {file ? (
                  <div className="text-primary font-semibold text-sm break-all flex flex-col items-center">
                     <Upload size={32} className="mx-auto mb-3" />
                     {file.name}
                  </div>
                ) : (
                  <div>
                    <Upload size={32} className="text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-foreground font-medium mb-1">Drag & drop your PDF</p>
                    <p className="text-xs text-muted-foreground">or click to browse</p>
                  </div>
                )}
              </div>

              {uploadError && <div className="text-destructive text-sm font-medium mt-4 bg-destructive/10 border border-destructive/20 p-3 rounded-lg text-center">{uploadError}</div>}
              {uploadSuccess && <div className="text-success text-sm font-medium mt-4 bg-success/10 border border-success/20 p-3 rounded-lg text-center">{uploadSuccess}</div>}

              <Button onClick={handleResumeUpload} disabled={!file || uploading}
                variant="outline"
                className="w-full mt-4 text-sm font-semibold border-border hover:bg-muted transition-colors text-foreground">
                {uploading ? <div className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin"/> Processing...</div> : 'Re-initialize Network'}
              </Button>
            </div>
          </div>

        </div>
      </DashboardLayout>
    </PageTransition>
  );
}
