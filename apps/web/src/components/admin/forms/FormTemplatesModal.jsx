
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Copy, Activity, HeartPulse, ShieldCheck, Stethoscope } from 'lucide-react';

const TEMPLATES = [
  { id: 't1', name: 'Patient Health Assessment', category: 'health_assessment', icon: HeartPulse, qCount: 12, desc: 'Standard intake form for new patients.' },
  { id: 't2', name: 'Employer Wellness Survey', category: 'employer_assessment', icon: Activity, qCount: 8, desc: 'Gauge employee wellness and program interest.' },
  { id: 't3', name: 'Insurance Claim Form', category: 'insurance_assessment', icon: ShieldCheck, qCount: 15, desc: 'Detailed form for submitting new claims.' },
  { id: 't4', name: 'Provider Feedback', category: 'custom', icon: Stethoscope, qCount: 5, desc: 'Post-appointment satisfaction survey.' }
];

export function FormTemplatesModal({ isOpen, onClose, onSelectTemplate }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Form Templates</DialogTitle>
          <DialogDescription>Choose a pre-built template to get started quickly.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {TEMPLATES.map(template => (
            <Card key={template.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => onSelectTemplate(template)}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <template.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium bg-muted px-2 py-1 rounded-full">{template.qCount} Questions</span>
                </div>
                <CardTitle className="text-base mt-3">{template.name}</CardTitle>
                <CardDescription className="text-sm">{template.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" className="w-full gap-2" onClick={(e) => { e.stopPropagation(); onSelectTemplate(template); }}>
                  <Copy className="w-4 h-4" /> Use Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
