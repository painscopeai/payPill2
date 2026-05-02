import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient';
import { useRecommendations } from '@/contexts/RecommendationContext';

export default function AskAIButton() {
  const { generateRecommendations, recommendations, isGenerating } = useRecommendations();
  const [open, setOpen] = useState(false);
  const [focusArea, setFocusArea] = useState('general');
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const runConnectionTest = async () => {
    setIsDiagnosing(true);
    try {
      const res = await apiServerClient.fetch('/ai-recommendations/diagnostic');
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Diagnostic request failed');
        return;
      }
      console.info('[ai-diagnostic]', data);
      const g = data.gemini;
      if (data.geminiKeyConfigured === false) {
        toast.error('GEMINI_API_KEY is not configured on the server.');
      } else if (g?.ok) {
        toast.success(`Gemini OK (${g.ms}ms). See console for full JSON.`);
      } else {
        toast.error(g?.timedOut ? 'Gemini timed out (probe).' : (g?.message || 'Gemini probe failed. Check console.'));
      }
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Diagnostic failed');
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleGenerate = async () => {
    try {
      await generateRecommendations(focusArea);
      setOpen(false);
    } catch (error) {
      // Error handled in context
    }
  };

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <Button 
          size="lg" 
          className="w-full sm:w-auto text-lg h-14 px-8 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all"
          onClick={() => setOpen(true)}
        >
          <Sparkles className="h-5 w-5 mr-2" /> Ask AI for Recommendation
        </Button>
        <p className="text-xs text-muted-foreground">
          {recommendations.length} recommendations in your plan
        </p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Generate Recommendations
            </DialogTitle>
            <DialogDescription>
              Our AI summarizes your onboarding profile and health records from the last 24 hours. Pick a focus—every
              recommendation will follow that category.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Focus Area</label>
              <Select value={focusArea} onValueChange={setFocusArea}>
                <SelectTrigger>
                  <SelectValue placeholder="Select focus area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Analyze Current Health Status</SelectItem>
                  <SelectItem value="medications">Review Medication Interactions</SelectItem>
                  <SelectItem value="lifestyle">Lifestyle Optimization</SelectItem>
                  <SelectItem value="preventive">Preventive Care Check</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={runConnectionTest}
              disabled={isGenerating || isDiagnosing}
            >
              {isDiagnosing ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" /> Testing…
                </>
              ) : (
                'Test AI connection'
              )}
            </Button>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isGenerating}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...
                  </>
                ) : (
                  'Generate Now'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}