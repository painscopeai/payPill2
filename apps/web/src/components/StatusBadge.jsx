import React from 'react';
import { Badge } from '@/components/ui/badge';

export default function StatusBadge({ status, className = '' }) {
  const getStatusStyles = (s) => {
    const normalized = s?.toLowerCase() || '';
    switch (normalized) {
      case 'scheduled':
      case 'active':
      case 'ready':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'completed':
      case 'delivered':
      case 'adherent':
        return 'bg-success/10 text-success border-success/20';
      case 'cancelled':
      case 'no-show':
      case 'abandoned':
      case 'expired':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'in-progress':
      case 'pending':
      case 'shipped':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Badge variant="outline" className={`capitalize ${getStatusStyles(status)} ${className}`}>
      {status || 'Unknown'}
    </Badge>
  );
}