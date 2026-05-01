import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function TermsModal({ isOpen, onClose, onAccept }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Terms and Conditions</DialogTitle>
          <DialogDescription>Last updated: April 2026</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <h3 className="font-semibold text-foreground">1. Acceptance of Terms</h3>
          <p>By accessing and using PayPill, you accept and agree to be bound by the terms and provision of this agreement.</p>
          
          <h3 className="font-semibold text-foreground">2. Medical Disclaimer</h3>
          <p>PayPill provides AI-driven health recommendations and organizational tools. It does not replace professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.</p>
          
          <h3 className="font-semibold text-foreground">3. User Responsibilities</h3>
          <p>You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer or device.</p>
          
          <h3 className="font-semibold text-foreground">4. Data Accuracy</h3>
          <p>You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.</p>
        </div>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => { onAccept(); onClose(); }}>I Accept</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}