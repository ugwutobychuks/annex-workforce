'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Loader2, Plus, X, Upload, FileText, GraduationCap, Briefcase } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function ProfilePage() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api<any>('/candidates/me', { token: accessToken }),
    enabled: !!accessToken,
  });

  const updateProfile = useMutation({
    mutationFn: (data: any) => api('/candidates/me', { method: 'PATCH', body: data, token: accessToken }),
    onSuccess: () => {
      toast.success('Profile updated');
      qc.invalidateQueries({ queryKey: ['my-profile'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addSkill = useMutation({
    mutationFn: (name: string) =>
      api('/candidates/me/skills', { method: 'POST', body: { name }, token: accessToken }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-profile'] }),
  });

  const removeSkill = useMutation({
    mutationFn: (skillId: string) =>
      api(`/candidates/me/skills/${skillId}`, { method: 'DELETE', token: accessToken }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-profile'] }),
  });

  const addExperience = useMutation({
    mutationFn: (data: any) =>
      api('/candidates/me/experience', { method: 'POST', body: data, token: accessToken }),
    onSuccess: () => {
      toast.success('Experience added');
      qc.invalidateQueries({ queryKey: ['my-profile'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addEducation = useMutation({
    mutationFn: (data: any) =>
      api('/candidates/me/education', { method: 'POST', body: data, token: accessToken }),
    onSuccess: () => {
      toast.success('Education added');
      qc.invalidateQueries({ queryKey: ['my-profile'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const uploadResume = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/v1/candidates/me/resume`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
      });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Resume uploaded');
      qc.invalidateQueries({ queryKey: ['my-profile'] });
    },
    onError: () => toast.error('Resume upload failed'),
  });

  const [skillInput, setSkillInput] = useState('');
  const [showExp, setShowExp] = useState(false);
  const [showEdu, setShowEdu] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    updateProfile.mutate({
      headline: fd.get('headline'),
      summary: fd.get('summary'),
      location: fd.get('location'),
      country: fd.get('country'),
      yearsOfExperience: Number(fd.get('yearsOfExperience') || 0),
      expectedSalary: Number(fd.get('expectedSalary') || 0),
      salaryCurrency: fd.get('salaryCurrency'),
      availability: fd.get('availability'),
      remotePreference: fd.get('remotePreference'),
      linkedinUrl: fd.get('linkedinUrl') || undefined,
      githubUrl: fd.get('githubUrl') || undefined,
      portfolioUrl: fd.get('portfolioUrl') || undefined,
    });
  }

  return (
    <div className="space-y-8">
      <header>
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">Your profile</div>
        <h1 className="font-display text-4xl">Tell employers who you are.</h1>
      </header>

      {/* Basic info form */}
      <form onSubmit={onSubmit} className="card space-y-6">
        <h2 className="font-display text-xl">Basics</h2>
        <div>
          <label className="label">Headline</label>
          <input name="headline" defaultValue={profile?.headline ?? ''} className="input" placeholder="e.g. Senior Backend Engineer" />
        </div>
        <div>
          <label className="label">Professional summary</label>
          <textarea
            name="summary" rows={4} className="input" defaultValue={profile?.summary ?? ''}
            placeholder="Brief overview of your background, focus areas, and what you're looking for next."
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Location</label>
            <input name="location" defaultValue={profile?.location ?? ''} className="input" placeholder="Lagos" />
          </div>
          <div>
            <label className="label">Country</label>
            <select name="country" defaultValue={profile?.country ?? 'NG'} className="input">
              <option value="NG">Nigeria</option>
              <option value="KE">Kenya</option>
              <option value="GH">Ghana</option>
              <option value="ZA">South Africa</option>
            </select>
          </div>
          <div>
            <label className="label">Years of experience</label>
            <input name="yearsOfExperience" type="number" min={0} max={60} defaultValue={profile?.yearsOfExperience ?? 0} className="input" />
          </div>
          <div>
            <label className="label">Availability</label>
            <select name="availability" defaultValue={profile?.availability ?? 'PASSIVELY_LOOKING'} className="input">
              <option value="IMMEDIATELY">Immediately</option>
              <option value="WITHIN_2_WEEKS">Within 2 weeks</option>
              <option value="WITHIN_MONTH">Within a month</option>
              <option value="PASSIVELY_LOOKING">Open to opportunities</option>
              <option value="NOT_LOOKING">Not looking</option>
            </select>
          </div>
          <div>
            <label className="label">Expected salary (monthly)</label>
            <input name="expectedSalary" type="number" min={0} defaultValue={profile?.expectedSalary ?? ''} className="input" />
          </div>
          <div>
            <label className="label">Currency</label>
            <select name="salaryCurrency" defaultValue={profile?.salaryCurrency ?? 'NGN'} className="input">
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <div>
            <label className="label">Work arrangement</label>
            <select name="remotePreference" defaultValue={profile?.remotePreference ?? 'HYBRID'} className="input">
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
              <option value="ONSITE">On-site</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">LinkedIn</label>
            <input name="linkedinUrl" type="url" defaultValue={profile?.linkedinUrl ?? ''} className="input" />
          </div>
          <div>
            <label className="label">GitHub</label>
            <input name="githubUrl" type="url" defaultValue={profile?.githubUrl ?? ''} className="input" />
          </div>
          <div>
            <label className="label">Portfolio</label>
            <input name="portfolioUrl" type="url" defaultValue={profile?.portfolioUrl ?? ''} className="input" />
          </div>
        </div>
        <button type="submit" disabled={updateProfile.isPending} className="btn-primary">
          {updateProfile.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Save basics
        </button>
      </form>

      {/* Resume */}
      <div className="card">
        <h2 className="font-display text-xl mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5" /> Resume
        </h2>
        {profile?.resumeUrl ? (
          <div className="flex items-center gap-3">
            <a href={profile.resumeUrl} target="_blank" rel="noopener" className="text-brand-700 hover:underline text-sm">
              View current resume
            </a>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary text-sm"
              disabled={uploadResume.isPending}
            >
              {uploadResume.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Replace
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary"
            disabled={uploadResume.isPending}
          >
            {uploadResume.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload resume (PDF, DOCX)
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadResume.mutate(file);
          }}
        />
      </div>

      {/* Skills */}
      <div className="card">
        <h2 className="font-display text-xl mb-4">Skills</h2>
        <div className="flex flex-wrap gap-2 mb-4 min-h-[28px]">
          {profile?.skills?.length === 0 && <span className="text-sm text-slate-400">No skills added yet.</span>}
          {profile?.skills?.map((s: any) => (
            <span key={s.id} className="chip flex items-center gap-1.5">
              {s.skill.name}
              <button onClick={() => removeSkill.mutate(s.skill.id)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!skillInput.trim()) return;
            addSkill.mutate(skillInput.trim());
            setSkillInput('');
          }}
          className="flex gap-2"
        >
          <input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            placeholder="e.g. Python"
            className="input flex-1"
          />
          <button type="submit" className="btn-secondary"><Plus className="w-4 h-4" /> Add</button>
        </form>
      </div>

      {/* Work experience */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl flex items-center gap-2">
            <Briefcase className="w-5 h-5" /> Work experience
          </h2>
          <button onClick={() => setShowExp(!showExp)} className="btn-secondary text-sm">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {showExp && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              addExperience.mutate({
                company: fd.get('company'),
                title: fd.get('title'),
                location: fd.get('location') || undefined,
                description: fd.get('description') || undefined,
                startDate: fd.get('startDate'),
                endDate: fd.get('endDate') || undefined,
                isCurrent: fd.get('isCurrent') === 'on',
              });
              (e.currentTarget as HTMLFormElement).reset();
              setShowExp(false);
            }}
            className="bg-slate-50 rounded-md p-4 mb-4 space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <input name="title" required placeholder="Job title" className="input" />
              <input name="company" required placeholder="Company" className="input" />
              <input name="location" placeholder="Location" className="input" />
              <div className="flex items-center gap-2 text-sm">
                <input id="isCurrent" name="isCurrent" type="checkbox" />
                <label htmlFor="isCurrent">I currently work here</label>
              </div>
              <input name="startDate" type="date" required className="input" />
              <input name="endDate" type="date" className="input" />
            </div>
            <textarea name="description" rows={3} placeholder="What you did" className="input" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowExp(false)} className="btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={addExperience.isPending} className="btn-primary text-sm">
                {addExperience.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {profile?.experiences?.length === 0 && (
            <p className="text-sm text-slate-400">No experience added yet.</p>
          )}
          {profile?.experiences?.map((e: any) => (
            <div key={e.id} className="border-l-2 border-brand-200 pl-4">
              <div className="font-medium">{e.title}</div>
              <div className="text-sm text-slate-600">{e.company}{e.location ? ` · ${e.location}` : ''}</div>
              <div className="text-xs text-slate-500 mt-1">
                {formatDate(e.startDate)} – {e.isCurrent ? 'Present' : (e.endDate ? formatDate(e.endDate) : '—')}
              </div>
              {e.description && <p className="text-sm text-slate-700 mt-2">{e.description}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Education */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl flex items-center gap-2">
            <GraduationCap className="w-5 h-5" /> Education
          </h2>
          <button onClick={() => setShowEdu(!showEdu)} className="btn-secondary text-sm">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {showEdu && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              addEducation.mutate({
                institution: fd.get('institution'),
                degree: fd.get('degree'),
                fieldOfStudy: fd.get('fieldOfStudy') || undefined,
                startYear: Number(fd.get('startYear')),
                endYear: fd.get('endYear') ? Number(fd.get('endYear')) : undefined,
                grade: fd.get('grade') || undefined,
              });
              (e.currentTarget as HTMLFormElement).reset();
              setShowEdu(false);
            }}
            className="bg-slate-50 rounded-md p-4 mb-4 space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <input name="institution" required placeholder="University / school" className="input" />
              <input name="degree" required placeholder="Degree (e.g. B.Sc.)" className="input" />
              <input name="fieldOfStudy" placeholder="Field of study" className="input" />
              <input name="grade" placeholder="Grade (optional)" className="input" />
              <input name="startYear" type="number" required min={1950} max={2100} placeholder="Start year" className="input" />
              <input name="endYear" type="number" min={1950} max={2100} placeholder="End year" className="input" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowEdu(false)} className="btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={addEducation.isPending} className="btn-primary text-sm">
                {addEducation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {profile?.educations?.length === 0 && (
            <p className="text-sm text-slate-400">No education added yet.</p>
          )}
          {profile?.educations?.map((e: any) => (
            <div key={e.id} className="border-l-2 border-brand-200 pl-4">
              <div className="font-medium">{e.institution}</div>
              <div className="text-sm text-slate-600">
                {e.degree}{e.fieldOfStudy ? `, ${e.fieldOfStudy}` : ''}
                {e.grade ? ` · ${e.grade}` : ''}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {e.startYear} – {e.endYear ?? 'Present'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
