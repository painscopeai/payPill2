import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pill, RefreshCw } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';

export default function PrescriptionCard({ prescription, onRefill, isRefilling }) {
  return (
    <Card className="shadow-sm border-border/50 overflow-hidden">
      <div className="flex flex-col md:flex-row">
        <div className="p-6 flex-1">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">{prescription.medication_name}</h3>
            </div>
            <StatusBadge status={prescription.status} />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Dosage</p>
              <p className="font-medium">{prescription.dosage || 'As directed'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Frequency</p>
              <p className="font-medium">{prescription.frequency || 'Daily'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Quantity</p>
              <p className="font-medium">{prescription.quantity || '30'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Refills Left</p>
              <p className="font-medium">{prescription.refills_remaining || 0}</p>
            </div>
          </div>
        </div>
        
        {onRefill && (
          <div className="bg-muted/20 p-6 border-t md:border-t-0 md:border-l flex flex-col justify-center items-center min-w-[200px]">
            <Button 
              className="w-full gap-2" 
              onClick={() => onRefill(prescription)}
              disabled={prescription.refills_remaining <= 0 || isRefilling}
            >
              <RefreshCw className={`h-4 w-4 ${isRefilling ? 'animate-spin' : ''}`} />
              Request Refill
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}