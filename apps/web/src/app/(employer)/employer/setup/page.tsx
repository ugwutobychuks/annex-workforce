'use client';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { Loader2, Building2 } from 'lucide-react';

export default function EmployerSetupPage() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const create = useMutation({
    mutationFn: (data: any) => api('/employers', { method: 'POST', body: data, token: accessToken }),
    onSuccess: () => {
      toast.success('Company created');
      router.push('/employer/dashboard');
    },
    onError: (e: any) => toast.error(e.message),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    create.mutate({
      name: fd.get('name'),
      legalName: fd.get('legalName') || undefined,
      industry: fd.get('industry') || undefined,
      size: fd.get('size') || undefined,
      website: fd.get('website') || undefined,
      description: fd.get('description') || undefined,
      hqCountry: fd.get('hqCountry') || 'NG',
      hqCity: fd.get('hqCity') || undefined,
      rcNumber: fd.get('rcNumber') || undefined,
      taxId: fd.get('taxId') || undefined,
    });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <Building2 className="w-10 h-10 text-forest-700 mb-3" />
        <div className="text-xs uppercase tracking-[0.18em] text-stone-500 mb-2">Welcome</div>
        <h1 className="font-display text-4xl">Set up your company.</h1>
        <p className="text-stone-600 mt-2">
          Tell us about your organization. You can edit these details any time.
        </p>
      </header>

      <form onSubmit={onSubmit} className="card space-y-5">
        <div>
          <label className="label">Company name *</label>
          <input name="name" required className="input" placeholder="e.g. TechStartup Inc." />
        </div>
        <div>
          <label className="label">Legal name (optional)</label>
          <input name="legalName" className="input" placeholder="e.g. TechStartup Limited" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Industry</label>
            <input name="industry" className="input" placeholder="e.g. Software, Fintech" />
          </div>
          <div>
            <label className="label">Company size</label>
            <select name="size" className="input" defaultValue="">
              <option value="">Select...</option>
              <option value="1-10">1-10</option>
              <option value="11-50">11-50</option>
              <option value="51-200">51-200</option>
              <option value="201-500">201-500</option>
              <option value="501+">501+</option>
            </select>
          </div>
          <div>
            <label className="label">Website</label>
            <input name="website" type="url" className="input" placeholder="https://..." />
          </div>
          <div>
            <label className="label">HQ country</label>
            <select name="hqCountry" className="input" defaultValue="NG">
              <option value="NG">Nigeria</option>
              <option value="KE">Kenya</option>
              <option value="GH">Ghana</option>
              <option value="ZA">South Africa</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
            </select>
          </div>
          <div>
            <label className="label">HQ city</label>
            <input name="hqCity" className="input" placeholder="e.g. Lagos" />
          </div>
          <div>
            <label className="label">CAC RC Number (Nigeria, optional)</label>
            <input name="rcNumber" className="input" placeholder="e.g. RC123456" />
          </div>
          <div>
            <label className="label">Tax ID (optional)</label>
            <input name="taxId" className="input" />
          </div>
        </div>
        <div>
          <label className="label">About the company</label>
          <textarea
            name="description"
            rows={4}
            className="input"
            placeholder="What does the company do? Why is it a great place to work?"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-stone-200">
          <button type="submit" disabled={create.isPending} className="btn-primary">
            {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Create company
          </button>
        </div>
      </form>
    </div>
  );
}
