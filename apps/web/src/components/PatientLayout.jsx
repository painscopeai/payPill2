import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Home, User, Sparkles, FileText, Calendar, MessageSquare, LogOut, Menu, Shield } from 'lucide-react';
import { PayPillLogo } from '@/components/PayPillLogo.jsx';
import apiServerClient from '@/lib/apiServerClient';
import NotificationBell from '@/components/NotificationBell.jsx';
import ThemeToggleButton from '@/components/ThemeToggleButton.jsx';

export default function PatientLayout({ children }) {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  const handleLogout = () => {
    void logout();
  };

  const navItems = [
    { label: 'Dashboard', icon: Home, path: '/patient/dashboard' },
    { label: 'Messages', icon: MessageSquare, path: '/patient/messages' },
    { label: 'Records', icon: FileText, path: '/patient/records' },
    { label: 'Appointments', icon: Calendar, path: '/patient/appointments' },
    { label: 'Insurance', icon: Shield, path: '/patient/insurance' },
    { label: 'Insights', icon: Sparkles, path: '/patient/ai-recommendations' },
    { label: 'Profile', icon: User, path: '/patient/onboarding' },
  ];

  const isActive = (path) => location.pathname.startsWith(path);

  useEffect(() => {
    let mounted = true;
    const loadUnread = async () => {
      try {
        const res = await apiServerClient.fetch('/patient/messages');
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !mounted) return;
        const items = Array.isArray(body.items) ? body.items : [];
        const count = items.reduce(
          (sum, item) => sum + Number(item.unread_from_employer || (!item.read_at ? 1 : 0)),
          0,
        );
        setUnreadMessageCount(count);
      } catch {
        /* keep layout usable */
      }
    };
    void loadUnread();
    const t = window.setInterval(() => void loadUnread(), 30000);
    return () => {
      mounted = false;
      window.clearInterval(t);
    };
  }, [location.pathname]);

  const unreadBadgeText = useMemo(() => {
    if (unreadMessageCount <= 0) return '';
    if (unreadMessageCount > 99) return '99+';
    return String(unreadMessageCount);
  }, [unreadMessageCount]);

  const showOnboardingReminder =
    currentUser?.role === 'individual' &&
    currentUser?.onboarding_completed !== true &&
    !location.pathname.startsWith('/patient/onboarding');

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <header className="md:hidden sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur flex items-center justify-between px-4 h-16">
        <Link to="/patient/dashboard" className="flex items-center gap-2">
          <PayPillLogo className="h-7 max-h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggleButton />
          <NotificationBell />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[250px] flex flex-col">
              <div className="py-4">
                <p className="font-medium">{currentUser?.first_name || 'Patient'}</p>
                <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
              </div>
              <nav className="flex flex-col gap-2 flex-1">
                {navItems.map((item) => (
                  <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(item.path) ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.path === '/patient/messages' && unreadMessageCount > 0 ? (
                      <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white">
                        {unreadBadgeText}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </nav>
              <Button variant="ghost" className="justify-start text-destructive mt-auto" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" /> Logout
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card min-h-screen sticky top-0">
        <div className="h-16 flex items-center px-6 border-b">
          <Link to="/patient/dashboard" className="flex items-center gap-2">
            <PayPillLogo className="h-8 max-h-9 w-auto" />
          </Link>
        </div>
        <div className="p-4 border-b">
          <p className="font-medium truncate">{currentUser?.first_name} {currentUser?.last_name}</p>
          <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive(item.path) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {item.path === '/patient/messages' && unreadMessageCount > 0 ? (
                <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white">
                  {unreadBadgeText}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Desktop Top Bar */}
        <header className="hidden md:flex h-16 items-center justify-between px-8 border-b bg-background/95 backdrop-blur sticky top-0 z-40">
          <div className="text-sm text-muted-foreground capitalize">
            {location.pathname.split('/').filter(Boolean).join(' / ')}
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggleButton />
            <NotificationBell />
          </div>
        </header>
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          {showOnboardingReminder ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
              <span className="font-medium">Finish your health profile when you can.</span>{' '}
              <Link to="/patient/onboarding" className="underline font-semibold">
                Continue setup
              </Link>
              <span className="text-amber-800/90 dark:text-amber-200/90">
                {' '}
                — you can use the rest of the app; progress is saved as you go.
              </span>
            </div>
          ) : null}
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t bg-background flex items-center justify-around px-2 z-50 pb-safe">
        {navItems.slice(0, 4).map((item) => (
          <Link key={item.path} to={item.path} className={`flex flex-col items-center justify-center w-16 h-full gap-1 ${isActive(item.path) ? 'text-primary' : 'text-muted-foreground'}`}>
            <span className="relative">
              <item.icon className="h-5 w-5" />
              {item.path === '/patient/messages' && unreadMessageCount > 0 ? (
                <span className="absolute -right-2 -top-1 inline-flex min-w-4 h-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-semibold text-white">
                  {unreadMessageCount > 9 ? '9+' : unreadBadgeText}
                </span>
              ) : null}
            </span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}