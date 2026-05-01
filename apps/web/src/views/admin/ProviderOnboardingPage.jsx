
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, Plus, Loader2, AlertCircle } from 'lucide-react';

const TYPE_OPTIONS = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'specialist', label: 'Specialist' },
  { value: 'other', label: 'Other' },
];

function categoryLabelForType(type) {
  const o = TYPE_OPTIONS.find((x) => x.value === type);
  return o ? o.label : type;
}

export default function ProviderOnboardingPage() {
  const [applicationId, setApplicationId] = useState(null);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [formData, setFormData] = useState({
    organization_name: '',
    type: '',
    applicant_email: '',
    phone: '',
    specialty: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [searchUserId, setSearchUserId] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const [forms, setForms] = useState([]);
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  const [isCreatingForm, setIsCreatingForm] = useState(false);

  const authHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadDraftApplication = useCallback(async () => {
    try {
      const res = await apiServerClient.fetch('/admin/provider-applications?mine=1&limit=5', {
        headers: await authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load application');
      }
      const data = await res.json();
      const first = data.items?.[0];
      if (first) {
        setApplicationId(first.id);
        setApplicationStatus(first.status);
        setFormData({
          organization_name: first.organization_name || '',
          type: first.type || '',
          applicant_email: first.applicant_email || '',
          phone: first.phone || '',
          specialty: first.specialty || '',
        });
      } else {
        setApplicationId(null);
        setApplicationStatus(null);
      }
    } catch (err) {
      toast.error(err.message);
    }
  }, []);

  const fetchFormsList = async () => {
    setIsLoadingForms(true);
    try {
      const res = await apiServerClient.fetch('/forms?limit=50&form_type=provider_application', {
        headers: await authHeaders(),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to load forms list.');
      }

      const data = await res.json();
      setForms(data.items || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoadingForms(false);
    }
  };

  const handleCreateForm = async () => {
    setIsCreatingForm(true);
    try {
      const res = await apiServerClient.fetch('/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({
          name: 'New Provider Evaluation',
          form_type: 'provider_application',
          description: 'Provider onboarding evaluation',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create form.');
      }

      toast.success('Form created successfully!');
      fetchFormsList();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsCreatingForm(false);
    }
  };

  const handleSearchUser = async (e) => {
    e.preventDefault();
    if (!searchUserId.trim()) return;

    setIsLoadingProfile(true);
    setUserProfile(null);
    try {
      const { data: record, error } = await supabase
        .from('profiles')
        .select('id, email, role, name, first_name, last_name')
        .eq('id', searchUserId.trim())
        .maybeSingle();
      if (error) throw error;
      if (!record) {
        toast.error('User profile not found');
        return;
      }
      setUserProfile({
        ...record,
        name: record.name || [record.first_name, record.last_name].filter(Boolean).join(' ') || null,
      });
      toast.success('User profile loaded successfully');
    } catch (err) {
      toast.error('An error occurred while fetching the user profile');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    loadDraftApplication();
    fetchFormsList();
  }, [loadDraftApplication]);

  const saveDraft = async (e) => {
    e.preventDefault();
    if (!formData.applicant_email?.trim()) {
      toast.error('Applicant email is required');
      return;
    }
    setIsSaving(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(await authHeaders()),
      };
      const category = formData.type ? categoryLabelForType(formData.type) : null;
      const body = {
        applicant_email: formData.applicant_email.trim(),
        organization_name: formData.organization_name?.trim() || null,
        type: formData.type || 'unspecified',
        category,
        phone: formData.phone?.trim() || null,
        specialty: formData.specialty?.trim() || null,
      };

      let res;
      if (applicationId) {
        res = await apiServerClient.fetch(`/admin/provider-applications/${applicationId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(body),
        });
      } else {
        res = await apiServerClient.fetch('/admin/provider-applications', {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Save failed');
      }
      const json = await res.json();
      const app = json.application;
      setApplicationId(app.id);
      setApplicationStatus(app.status);
      toast.success('Draft saved');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const submitForReview = async () => {
    if (!applicationId) {
      toast.error('Save a draft first');
      return;
    }
    setIsSubmittingReview(true);
    try {
      const res = await apiServerClient.fetch(`/admin/provider-applications/${applicationId}/submit`, {
        method: 'POST',
        headers: await authHeaders(),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Submit failed');
      }
      const json = await res.json();
      setApplicationStatus(json.application?.status);
      toast.success('Application submitted for review');
      setApplicationId(null);
      setFormData({
        organization_name: '',
        type: '',
        applicant_email: '',
        phone: '',
        specialty: '',
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold font-display">Provider Onboarding</h1>
        <p className="text-muted-foreground">
          Create a provider application (draft), save, then submit for admin review. Approved applications become
          marketplace provider records.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">User Profile Lookup</CardTitle>
            <CardDescription>Search for a user record by ID (reference only)</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearchUser} className="flex gap-2">
              <Input
                placeholder="Enter User ID..."
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
                className="bg-background"
              />
              <Button type="submit" disabled={isLoadingProfile} variant="secondary">
                {isLoadingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </form>
            {userProfile && (
              <div className="mt-4 p-3 bg-muted rounded-md text-sm border border-border">
                <p><strong>Name:</strong> {userProfile.name || 'N/A'}</p>
                <p><strong>Email:</strong> {userProfile.email}</p>
                <p><strong>Role:</strong> {userProfile.role || 'N/A'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Application status</CardTitle>
            <CardDescription>Your current draft or last known state on this device</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadDraftApplication} variant="outline" className="w-full mb-4">
              Refresh draft
            </Button>
            <div className="text-sm bg-muted p-3 rounded-md border border-border space-y-1">
              <p>
                <strong>Draft ID:</strong> {applicationId || '—'}
              </p>
              <p>
                <strong>Status:</strong> {applicationStatus || (applicationId ? 'draft' : 'none')}
              </p>
              {!applicationId && (
                <p className="text-muted-foreground flex items-center gap-2 mt-2">
                  <AlertCircle className="w-4 h-4" /> Fill the form below and save to create a draft.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Forms Management</CardTitle>
            <CardDescription>Templates with form type &quot;provider_application&quot;</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchFormsList} disabled={isLoadingForms} variant="outline" size="sm">
              Refresh
            </Button>
            <Button onClick={handleCreateForm} disabled={isCreatingForm} size="sm" className="gap-2 bg-primary text-primary-foreground">
              {isCreatingForm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              New Form
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {forms.length > 0 ? (
            <div className="space-y-2">
              {forms.map((form) => (
                <div key={form.id} className="flex justify-between items-center p-3 border border-border rounded-md bg-card">
                  <span className="font-medium text-sm">{form.name}</span>
                  <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-1 rounded-full">
                    {form.form_type || form.category || '—'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No forms found.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Provider application</CardTitle>
          <CardDescription>Save as draft, then submit for review (emails sent when Resend + notify addresses are configured)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveDraft} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Organization / provider name</Label>
                <Input
                  required
                  value={formData.organization_name}
                  onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>Provider type</Label>
                <Select
                  value={formData.type || undefined}
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Applicant email</Label>
                <Input
                  type="email"
                  required
                  value={formData.applicant_email}
                  onChange={(e) => setFormData({ ...formData, applicant_email: e.target.value })}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label>Specialty (optional)</Label>
                <Input value={formData.specialty} onChange={(e) => setFormData({ ...formData, specialty: e.target.value })} className="bg-background" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" disabled={isSaving} className="flex-1 bg-primary text-primary-foreground">
                {isSaving ? 'Saving...' : 'Save draft'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmittingReview || !applicationId}
                onClick={() => void submitForReview()}
              >
                {isSubmittingReview ? 'Submitting...' : 'Submit for review'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
