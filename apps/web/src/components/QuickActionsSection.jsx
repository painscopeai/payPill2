import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCircle, FileText, Sparkles, Calendar, MessageSquare, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function QuickActionsSection() {
  const navigate = useNavigate();

  const actions = [
    { label: 'Complete Onboarding', icon: UserCircle, path: '/patient/onboarding' },
    { label: 'Update Profile', icon: Activity, path: '/patient/onboarding' },
    { label: 'AI Recommendations', icon: Sparkles, path: '/patient/ai-recommendations' },
    { label: 'Medical Records', icon: FileText, path: '/patient/records' },
    { label: 'Schedule Appt', icon: Calendar, path: '/patient/appointments' },
    { label: 'Contact Provider', icon: MessageSquare, path: '/patient/dashboard' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {actions.map((action, i) => (
        <Button
          key={i}
          variant="outline"
          className="h-auto py-4 flex flex-col gap-2 items-center justify-center text-center hover:border-primary hover:bg-primary/5 transition-colors"
          onClick={() => navigate(action.path)}
        >
          <action.icon className="h-6 w-6 text-primary" />
          <span className="text-xs font-medium whitespace-normal">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}