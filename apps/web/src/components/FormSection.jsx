import React from 'react';
import { Progress } from '@/components/ui/progress';

export default function FormSection({ title, description, step, totalSteps, children }) {
  const progress = (step / totalSteps) * 100;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-balance text-foreground">{title}</h1>
            {description && <p className="text-muted-foreground mt-1">{description}</p>}
          </div>
          <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
            Step {step} of {totalSteps}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
      <div className="form-section-container">
        {children}
      </div>
    </div>
  );
}