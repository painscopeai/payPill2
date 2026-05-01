import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Building2, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RoleSelectionPage() {
  const navigate = useNavigate();
  const { setUserRole, userRole } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If they already have a role, they shouldn't be here ideally, but we allow changing if needed
  // or we could redirect them. For now, let them select.

  const handleRoleSelect = async (role) => {
    setIsSubmitting(true);
    try {
      await setUserRole(role);
      toast.success('Role updated successfully');
      
      if (role === 'patient') navigate('/dashboard');
      else if (role === 'employer') navigate('/employer/dashboard');
      else if (role === 'insurance_company') navigate('/insurance/dashboard');
      else if (role === 'provider') navigate('/provider/dashboard');
    } catch (error) {
      console.error('Error setting role:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const roles = [
    {
      id: 'patient',
      title: 'Individual (Patient)',
      description: 'Manage your health, book appointments, track prescriptions, and view AI insights.',
      icon: User,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      id: 'employer',
      title: 'Employer',
      description: 'Manage employee health benefits, wellness programs, and organizational health metrics.',
      icon: Building2,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10'
    },
    {
      id: 'insurance_company',
      title: 'Insurance Company',
      description: 'Manage claims, verify coverage, and access population health analytics.',
      icon: ShieldCheck,
      color: 'text-accent',
      bgColor: 'bg-accent/10'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <Helmet>
        <title>Select Your Role - PayPill</title>
      </Helmet>

      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center space-y-3 mb-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">How will you use PayPill?</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Select the account type that best describes you to personalize your experience.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Card 
                key={role.id} 
                className={`border-border/60 shadow-sm rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md hover:border-primary/30 cursor-pointer group ${userRole === role.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => !isSubmitting && handleRoleSelect(role.id)}
              >
                <CardContent className="p-6 flex items-center gap-6">
                  <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 ${role.bgColor}`}>
                    <Icon className={`h-8 w-8 ${role.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1 group-hover:text-primary transition-colors">{role.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{role.description}</p>
                  </div>
                  <div className="shrink-0 pl-4">
                    <Button variant="ghost" size="icon" className="rounded-full group-hover:bg-primary/10 group-hover:text-primary transition-colors" disabled={isSubmitting}>
                      {isSubmitting && userRole === role.id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <ArrowRight className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}