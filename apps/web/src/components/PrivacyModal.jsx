import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function PrivacyModal({ isOpen, onClose, onAccept }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Privacy Policy</DialogTitle>
          <DialogDescription>Last updated: April 2026</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <h3 className="font-semibold text-foreground">1. Information We Collect</h3>
          <p>We collect personal information that you voluntarily provide to us when you register on the application, express an interest in obtaining information about us or our products and services.</p>
          
          <h3 className="font-semibold text-foreground">2. HIPAA Compliance</h3>
          <p>All Protected Health Information (PHI) is handled in strict compliance with the Health Insurance Portability and Accountability Act (HIPAA) and applicable state laws.</p>
          
          <h3 className="font-semibold text-foreground">3. How We Use Your Information</h3>
          <p>We use personal information collected via our application for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.</p>
          
          <h3 className="font-semibold text-foreground">4. AI and Data Processing</h3>
          <p>Your de-identified health data may be processed by our AI algorithms to provide personalized health insights and recommendations. We do not sell your personal data to third parties.</p>
        </div>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => { onAccept(); onClose(); }}>I Accept</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}