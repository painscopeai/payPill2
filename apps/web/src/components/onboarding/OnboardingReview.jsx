import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '@/contexts/OnboardingContext.jsx';
import { useAuth } from '@/contexts/AuthContext';
import OnboardingWizard from './OnboardingWizard.jsx';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient';
import { CheckCircle2, LayoutDashboard, PencilLine } from 'lucide-react';

export default function OnboardingReview() {
  const navigate = useNavigate();
  const { completeOnboarding, updateFormData, formData, goToStep } = useOnboarding();
  const { currentUser } = useAuth();
  const [consent, setConsent] = useState({ accuracy: false, processing: false, hipaa: false });
  const [submittedOk, setSubmittedOk] = useState(false);

  const isValid = consent.accuracy && consent.processing && consent.hipaa;

  const handleComplete = async () => {
    if (!currentUser?.id) {
      toast.error('Authentication error: Patient ID missing. Please log in again.');
      return false;
    }

    const step14Payload = {
      consent_accuracy: !!consent.accuracy,
      consent_processing: !!consent.processing,
      consent_hipaa: !!consent.hipaa,
      completed_at_ack: new Date().toISOString(),
    };

    const mergedAll = {
      ...formData,
      step14: { ...(formData.step14 || {}), ...step14Payload },
    };

    updateFormData(14, step14Payload);

    try {
      const saveRes = await apiServerClient.fetch('/onboarding/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 14,
          data: mergedAll.step14,
        }),
      });

      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}));
        const detail = Array.isArray(err.fields) ? err.fields.join('; ') : '';
        toast.error(err.error || 'Could not save final step', {
          description: detail || undefined,
        });
        return false;
      }

      await completeOnboarding(currentUser.id, {
        allDataOverride: mergedAll,
        skipPreflightSave: true,
      });

      toast.success('Your health profile is saved.');
      setSubmittedOk(true);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not complete onboarding';
      toast.error(msg);
      return false;
    }
  };

  const goDashboard = () => navigate('/patient/dashboard', { replace: true });

  const editProfile = () => {
    setSubmittedOk(false);
    goToStep(1);
  };

  if (submittedOk) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-4">
          <p className="text-sm font-medium text-primary mb-1 tracking-wide uppercase">Step 14 of 14</p>
          <h1 className="text-3xl md:text-4xl font-bold text-balance">You&apos;re all set</h1>
          <p className="text-muted-foreground mt-2 text-lg max-w-prose">
            Your profile was saved successfully. You can update these answers anytime from Profile.
          </p>
        </div>

        <div className="bg-card border rounded-2xl p-6 md:p-8 shadow-lg mb-8 space-y-6">
          <div className="flex items-start gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
            <CheckCircle2 className="h-10 w-10 shrink-0 text-primary" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Health profile complete</h3>
              <p className="text-sm text-muted-foreground mt-1">
                We&apos;ll use this information for safer recommendations and care coordination.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button type="button" variant="outline" className="gap-2" onClick={editProfile}>
              <PencilLine className="h-4 w-4" />
              Review or edit answers
            </Button>
            <Button type="button" className="gap-2 shadow-md" onClick={goDashboard}>
              <LayoutDashboard className="h-4 w-4" />
              Go to dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <OnboardingWizard
      title="Review & Complete"
      description="Please review your information and provide final consent."
      isValid={isValid}
      onNext={handleComplete}
    >
      <div className="space-y-6">
        <div className="bg-muted/50 p-6 rounded-xl space-y-3 border border-border">
          <h3 className="text-xl font-semibold text-foreground">Ready to Submit</h3>
          <p className="text-base text-muted-foreground">
            You have completed all sections of the health profile. Your data will be securely encrypted and used to
            generate personalized AI health recommendations.
          </p>
        </div>

        <div className="space-y-5 pt-6 border-t border-border">
          <h4 className="text-lg font-medium text-foreground">Required Consents</h4>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="accuracy"
              checked={consent.accuracy}
              onCheckedChange={(c) => setConsent((p) => ({ ...p, accuracy: c === true }))}
              className="mt-1"
            />
            <Label htmlFor="accuracy" className="text-base font-normal leading-snug text-foreground cursor-pointer">
              I confirm that the information provided is accurate to the best of my knowledge.
            </Label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="processing"
              checked={consent.processing}
              onCheckedChange={(c) => setConsent((p) => ({ ...p, processing: c === true }))}
              className="mt-1"
            />
            <Label htmlFor="processing" className="text-base font-normal leading-snug text-foreground cursor-pointer">
              I consent to the processing of my health data for personalized recommendations.
            </Label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="hipaa"
              checked={consent.hipaa}
              onCheckedChange={(c) => setConsent((p) => ({ ...p, hipaa: c === true }))}
              className="mt-1"
            />
            <Label htmlFor="hipaa" className="text-base font-normal leading-snug text-foreground cursor-pointer">
              I have read and understand the HIPAA Privacy Notice.
            </Label>
          </div>
        </div>
      </div>
    </OnboardingWizard>
  );
}
