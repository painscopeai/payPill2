import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle2, FileText, Sparkles } from 'lucide-react';

export default function HealthTimelineWidget({ activities = [] }) {
  const defaultActivities = [
    { title: 'Profile Updated', date: 'Today', icon: Activity },
    { title: 'Recommendations Generated', date: 'Yesterday', icon: Sparkles },
    { title: 'Vitals Logged', date: '3 days ago', icon: FileText },
    { title: 'Onboarding Completed', date: '1 week ago', icon: CheckCircle2 },
  ];

  const displayActivities = activities.length > 0 ? activities : defaultActivities;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {displayActivities.slice(0, 5).map((activity, i) => (
            <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-background bg-muted text-primary shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                <activity.icon className="h-4 w-4" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border bg-card shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-sm">{activity.title}</h4>
                </div>
                <time className="text-xs text-muted-foreground">{activity.date}</time>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}