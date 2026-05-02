
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function StatusBadge({ status, className }) {
  const normalizedStatus = status?.toLowerCase() || 'unknown';
  
  const getStatusColor = () => {
    switch (normalizedStatus) {
      case 'active':
      case 'completed':
      case 'paid':
      case 'success':
      case 'verified':
      case 'published':
        return 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))/90]';
      case 'pending':
      case 'draft':
      case 'invited':
      case 'paused':
      case 'in_progress':
        return 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] hover:bg-[hsl(var(--warning))/90]';
      case 'failed':
      case 'error':
      case 'cancelled':
      case 'denied':
      case 'rejected':
      case 'suspended':
      case 'inactive':
        return 'bg-[hsl(var(--error))] text-[hsl(var(--error-foreground))] hover:bg-[hsl(var(--error))/90]';
      case 'refunded':
      case 'archived':
      case 'expired':
      case 'abandoned':
        return 'bg-[hsl(var(--muted-foreground))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--muted-foreground))/90]';
      default:
        return 'bg-[hsl(var(--info))] text-[hsl(var(--info-foreground))] hover:bg-[hsl(var(--info))/90]';
    }
  };

  return (
    <Badge className={cn("capitalize font-medium shadow-none", getStatusColor(), className)}>
      {status || 'Unknown'}
    </Badge>
  );
}
