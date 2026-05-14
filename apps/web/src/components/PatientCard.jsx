import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PatientCard({ patient }) {
  const navigate = useNavigate();
  const isHighRisk = Math.random() > 0.8; // Mock risk for MVP
  const cov = patient.coverage_summary;

  return (
    <Card 
      className="cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={() => navigate(`/provider/patients/${patient.patient_id}`)}
    >
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {patient.patient_name ? patient.patient_name.substring(0, 2).toUpperCase() : 'PT'}
          </div>
          <div>
            <h4 className="font-medium flex items-center gap-2">
              {patient.patient_name || 'Patient Name'}
              {isHighRisk && <AlertTriangle className="h-4 w-4 text-destructive" />}
            </h4>
            <p className="text-xs text-muted-foreground">
              ID: {patient.patient_id?.substring(0, 8) || 'Unknown'}
            </p>
            {cov ? (
              <p className="text-xs text-muted-foreground mt-1">
                {cov.coverage_type === 'employer' ? 'Employee' : 'Walk-in'}
                {cov.insurance_label ? ` · ${cov.insurance_label}` : ''}
                {cov.employer_name ? ` · ${cov.employer_name}` : ''}
              </p>
            ) : null}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}