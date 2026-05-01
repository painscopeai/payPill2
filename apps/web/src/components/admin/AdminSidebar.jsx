
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Building2, ShieldCheck, 
  CreditCard, Activity, FileText, Brain, Settings,
  LogOut, ChevronLeft, ChevronRight, ListTodo, ClipboardList, BookOpen, ScrollText, FileSpreadsheet,
  PieChart, TrendingUp, BarChart3, LineChart
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const sections = [
  {
    title: 'Overview',
    items: [
      { title: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    ]
  },
  {
    title: 'Analytics',
    items: [
      { title: 'Financial', path: '/admin/analytics/financial', icon: TrendingUp },
      { title: 'Subscriptions', path: '/admin/analytics/subscriptions', icon: PieChart },
      { title: 'Patients', path: '/admin/analytics/patients', icon: Users },
      { title: 'Employers', path: '/admin/analytics/employers', icon: Building2 },
      { title: 'Insurance', path: '/admin/analytics/insurance', icon: ShieldCheck },
      { title: 'Providers', path: '/admin/analytics/providers', icon: BarChart3 },
      { title: 'AI Usage', path: '/admin/analytics/ai', icon: Brain },
      { title: 'Forms', path: '/admin/analytics/forms', icon: LineChart },
    ]
  },
  {
    title: 'Users',
    items: [
      { title: 'Patients', path: '/admin/patients', icon: Users },
      { title: 'Employers', path: '/admin/employers', icon: Building2 },
      { title: 'Insurance', path: '/admin/insurance-users', icon: ShieldCheck },
    ]
  },
  {
    title: 'Financials',
    items: [
      { title: 'Transactions', path: '/admin/transactions', icon: CreditCard },
      { title: 'Subscription Plans', path: '/admin/subscription-plans', icon: ListTodo },
      { title: 'Sub Assignment', path: '/admin/subscription-assignment', icon: ClipboardList },
      { title: 'Sub Monitoring', path: '/admin/subscription-monitoring', icon: Activity },
      { title: 'Sub Logs', path: '/admin/subscription-logs', icon: ScrollText },
    ]
  },
  {
    title: 'Providers',
    items: [
      { title: 'Management', path: '/admin/providers', icon: Building2 },
      { title: 'Onboarding', path: '/admin/provider-onboarding', icon: FileText },
      { title: 'Bulk Upload', path: '/admin/bulk-provider-upload', icon: FileSpreadsheet },
    ]
  },
  {
    title: 'Content & AI',
    items: [
      { title: 'Forms Builder', path: '/admin/forms', icon: FileText },
      { title: 'Form Responses', path: '/admin/form-responses', icon: ClipboardList },
      { title: 'Knowledge Base', path: '/admin/knowledge-base', icon: BookOpen },
      { title: 'AI Logs', path: '/admin/ai-logs', icon: Brain },
    ]
  },
  {
    title: 'System',
    items: [
      { title: 'Settings', path: '/admin/settings', icon: Settings },
    ]
  }
];

export default function AdminSidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
  const location = useLocation();
  const { logout } = useAuth();

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[hsl(var(--admin-sidebar-bg))] text-[hsl(var(--admin-sidebar-fg))]">
      <div className="p-4 flex items-center justify-between border-b border-[hsl(var(--admin-sidebar-fg))]/10 h-16 shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-2 font-display font-bold text-xl tracking-tight text-[hsl(var(--admin-sidebar-fg))]">
            <div className="w-8 h-8 rounded-lg bg-primary-gradient flex items-center justify-center shadow-sm">
              P
            </div>
            <span>PayPill Admin</span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 mx-auto rounded-lg bg-primary-gradient flex items-center justify-center text-[hsl(var(--primary-foreground))] font-bold shadow-sm">
            P
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-hide">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!isCollapsed && (
              <h4 className="px-3 text-xs font-semibold text-[hsl(var(--admin-sidebar-fg))]/50 uppercase tracking-wider mb-2">
                {section.title}
              </h4>
            )}
            {isCollapsed && <div className="h-4 border-b border-[hsl(var(--admin-sidebar-fg))]/10 mb-2 mx-4" />}
            
            {section.items.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  title={isCollapsed ? item.title : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group text-sm",
                    isActive 
                      ? "bg-[hsl(var(--admin-sidebar-active))] text-[hsl(var(--admin-sidebar-fg))] font-medium shadow-md" 
                      : "text-[hsl(var(--admin-sidebar-fg))]/75 hover:bg-[hsl(var(--admin-sidebar-hover))] hover:text-[hsl(var(--admin-sidebar-fg))]"
                  )}
                >
                  <item.icon className={cn(
                    "w-4 h-4 shrink-0",
                    isActive ? "text-[hsl(var(--admin-sidebar-fg))]" : "text-[hsl(var(--admin-sidebar-fg))]/75 group-hover:text-[hsl(var(--admin-sidebar-fg))]"
                  )} />
                  {!isCollapsed && <span>{item.title}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-[hsl(var(--admin-sidebar-fg))]/10 shrink-0">
        <button
          type="button"
          onClick={() => void logout()}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg w-full transition-all duration-200 text-sm text-[hsl(var(--admin-sidebar-fg))]/75 hover:bg-destructive/20 hover:text-destructive",
            isCollapsed && "justify-center"
          )}
          title={isCollapsed ? "Logout" : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside 
        className={cn(
          "hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out border-r border-[hsl(var(--admin-border))]",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <SidebarContent />
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 bg-[hsl(var(--admin-sidebar-bg))] text-[hsl(var(--admin-sidebar-fg))] border border-[hsl(var(--admin-sidebar-fg))]/15 rounded-full p-1 shadow-md hover:bg-[hsl(var(--admin-sidebar-hover))] z-50"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:hidden shadow-2xl",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
