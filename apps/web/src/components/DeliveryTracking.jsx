import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Truck, CheckCircle2, Clock, MapPin, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useRefillStatus } from '@/hooks/useRefillStatus.js';

export default function DeliveryTracking() {
  const { refills: deliveries, loading } = useRefillStatus();

  const copyTracking = (number) => {
    navigator.clipboard.writeText(number);
    toast.success('Tracking number copied to clipboard');
  };

  const getStepStatus = (currentStatus, stepIndex) => {
    const statuses = ['pending', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
    const currentIndex = statuses.indexOf(currentStatus) !== -1 ? statuses.indexOf(currentStatus) : 0;
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="h-64 bg-muted animate-pulse rounded-xl"></div>
      ) : deliveries.length > 0 ? (
        deliveries.map(delivery => (
          <Card key={delivery.id} className="shadow-sm border-border/50 overflow-hidden">
            <div className="bg-muted/30 p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  {delivery.prescription_details?.medication_name || 'Prescription Delivery'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Order #{delivery.id.substring(0, 8).toUpperCase()} • Placed on {new Date(delivery.created).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Estimated Delivery</p>
                <p className="font-semibold text-primary">
                  {delivery.estimated_delivery_date ? new Date(delivery.estimated_delivery_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'Calculating...'}
                </p>
              </div>
            </div>
            
            <CardContent className="p-6">
              {/* Timeline */}
              <div className="relative flex justify-between items-center mb-8 mt-4">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted -z-10"></div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary -z-10 transition-all duration-500" style={{ width: '50%' }}></div>
                
                {[
                  { icon: Clock, label: 'Order Placed' },
                  { icon: Package, label: 'Processing' },
                  { icon: Truck, label: 'Shipped' },
                  { icon: CheckCircle2, label: 'Delivered' }
                ].map((step, idx) => {
                  const status = getStepStatus(delivery.status || 'shipped', idx);
                  return (
                    <div key={idx} className="flex flex-col items-center gap-2 bg-card px-2">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                        status === 'completed' ? 'bg-primary border-primary text-primary-foreground' :
                        status === 'current' ? 'bg-background border-primary text-primary ring-4 ring-primary/20' :
                        'bg-background border-muted text-muted-foreground'
                      }`}>
                        <step.icon className="h-5 w-5" />
                      </div>
                      <span className={`text-xs font-medium hidden sm:block ${status === 'upcoming' ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-4 rounded-xl border">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Delivery Address</p>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">123 Main Street, Apt 4B<br/>New York, NY 10001</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Tracking Information</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-sm py-1">
                      {delivery.tracking_number || 'USPS-9400123456789'}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyTracking(delivery.tracking_number || 'USPS-9400123456789')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <div className="text-center p-12 border rounded-xl border-dashed text-muted-foreground">
          <Truck className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>No active deliveries found.</p>
        </div>
      )}
    </div>
  );
}