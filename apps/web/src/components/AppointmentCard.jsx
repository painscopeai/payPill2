import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Video, User } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';

export default function AppointmentCard({ appointment, onAction, actionLabel, actionIcon: ActionIcon }) {
  const raw = appointment.appointment_date;
  const date = raw ? new Date(raw) : null;
  const dateLabel = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : '—';
  
  return (
    <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="font-semibold text-lg">{appointment.provider_name || appointment.patient_name || 'Unknown'}</h4>
            <p className="text-sm text-muted-foreground capitalize flex items-center gap-1 mt-1">
              {appointment.type === 'telemedicine' ? <Video className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
              {appointment.type} Visit
            </p>
          </div>
          <StatusBadge status={appointment.status} />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4 bg-muted/30 p-3 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {dateLabel}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {appointment.appointment_time || '—'}
          </div>
        </div>

        {onAction && (
          <div className="flex justify-end mt-4 pt-4 border-t">
            <Button size="sm" onClick={() => onAction(appointment)} className="gap-2">
              {ActionIcon && <ActionIcon className="h-4 w-4" />}
              {actionLabel}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}