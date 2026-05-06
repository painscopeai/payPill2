
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Building2, ShieldCheck, 
  FileText, Brain, Settings,
  LogOut, ChevronLeft, ChevronRight, ChevronDown, ClipboardList, BookOpen, FileSpreadsheet,
  PieChart, TrendingUp, BarChart3, LineChart, Tags, CalendarClock, Library, ListChecks
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import apiServerClient from '@/lib/apiServerClient';
import { PROVIDER_PENDING_QUEUE_CHANGED_EVENT } from '@/lib/providerApplicationPendingQueue.js';
import { PayPillLogo } from '@/components/PayPillLogo.jsx';
import { cn } from '@/lib/utils';

const PROVIDERS_MANAGEMENT_PATH = '/admin/providers';

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
      { title: 'Bulk upload', path: '/admin/bulk-imports?tab=employees', icon: FileSpreadsheet },
    ]
  },
  {
    title: 'Providers',
    items: [
      { title: 'Management', path: '/admin/providers', icon: Building2 },
      { title: 'Onboarding', path: '/admin/provider-onboarding', icon: FileText },
      { title: 'Provider types', path: '/admin/provider-types', icon: Tags },
      { title: 'Appointment options', path: '/admin/appointment-options', icon: CalendarClock },
      { title: 'Bulk Upload', path: '/admin/bulk-imports?tab=providers', icon: FileSpreadsheet },
      { title: 'Service List', path: '/admin/provider-services', icon: ListChecks },
    ]
  },
  {
    title: 'Content & AI',
    items: [
      { title: 'Forms Builder', path: '/admin/forms', icon: FileText },
      { title: 'Form Responses', path: '/admin/form-responses', icon: ClipboardList },
      { title: 'Profile reference data', path: '/admin/profile-reference-data', icon: Library },
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

/** Sidebar groups that start collapsed and can be toggled open. Overview + System stay always open. */
const COLLAPSIBLE_SECTION_TITLES = new Set([
  'Analytics',
  'Users',
  'Providers',
  'Content & AI',
]);

function sectionContainsActivePath(section, pathname) {
  return section.items.some(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  );
}

/**
 * Module-level nav so React keeps the same component type across route changes.
 * Defining this inside AdminSidebar recreated the component every render, which
 * remounted the scrollable list and reset scroll to the top on each click.
 */
function AdminSidebarNav({ isCollapsed, setIsMobileOpen }) {
  const location = useLocation();
  const { logout } = useAuth();
  const [pendingProviderApplications, setPendingProviderApplications] = useState(0);
  const [expandedBySection, setExpandedBySection] = useState(() => {
    const initial = {};
    for (const s of sections) {
      if (COLLAPSIBLE_SECTION_TITLES.has(s.title)) {
        initial[s.title] = false;
      }
    }
    return initial;
  });

  /** Keep the active route visible: auto-expand its section while sidebar is expanded. */
  useEffect(() => {
    const path = location.pathname;
    setExpandedBySection((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const s of sections) {
        if (!COLLAPSIBLE_SECTION_TITLES.has(s.title)) continue;
        if (sectionContainsActivePath(s, path) && next[s.title] !== true) {
          next[s.title] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [location.pathname]);

  const toggleSection = useCallback((title) => {
    setExpandedBySection((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  }, []);

  const fetchPendingProviderApplications = useCallback(async () => {
    try {
      const res = await apiServerClient.fetch('/admin/provider-applications?status=submitted&limit=1');
      if (!res.ok) return;
      const data = await res.json();
      const total = typeof data.total === 'number' ? data.total : (data.items || []).length;
      setPendingProviderApplications(total);
    } catch {
      /* ignore — sidebar should still work */
    }
  }, []);

  useEffect(() => {
    void fetchPendingProviderApplications();
  }, [location.pathname, fetchPendingProviderApplications]);

  useEffect(() => {
    const t = window.setInterval(() => void fetchPendingProviderApplications(), 45_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') void fetchPendingProviderApplications();
    };
    const onPendingEvent = () => void fetchPendingProviderApplications();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener(PROVIDER_PENDING_QUEUE_CHANGED_EVENT, onPendingEvent);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener(PROVIDER_PENDING_QUEUE_CHANGED_EVENT, onPendingEvent);
    };
  }, [fetchPendingProviderApplications]);

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--admin-sidebar-bg))] text-[hsl(var(--admin-sidebar-fg))]">
      <div className="p-4 flex items-center justify-between border-b border-[hsl(var(--admin-sidebar-fg))]/10 h-16 shrink-0">
        {!isCollapsed && (
          <div className="flex min-w-0 items-center gap-2 text-[hsl(var(--admin-sidebar-fg))]">
            <PayPillLogo className="h-8 max-h-9 shrink-0" />
            <span className="font-display text-xs font-semibold uppercase tracking-wide text-[hsl(var(--admin-sidebar-fg))]/70">
              Admin
            </span>
          </div>
        )}
        {isCollapsed && (
          <div className="flex justify-center">
            <PayPillLogo variant="mark" />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-hide">
        {sections.map((section, sIdx) => {
          const isCollapsible = COLLAPSIBLE_SECTION_TITLES.has(section.title);
          const isSectionOpen = !isCollapsible || expandedBySection[section.title] === true;
          const showItems = isCollapsed || isSectionOpen;

          return (
            <div key={sIdx} className="space-y-1">
              {!isCollapsed && isCollapsible && (
                <button
                  type="button"
                  onClick={() => toggleSection(section.title)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider',
                    'text-[hsl(var(--admin-sidebar-fg))]/50 hover:bg-[hsl(var(--admin-sidebar-hover))] hover:text-[hsl(var(--admin-sidebar-fg))]/80',
                  )}
                  aria-expanded={isSectionOpen}
                >
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                      isSectionOpen ? 'rotate-0' : '-rotate-90',
                    )}
                    aria-hidden
                  />
                  <span className="flex-1 truncate">{section.title}</span>
                </button>
              )}
              {!isCollapsed && !isCollapsible && (
                <h4 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--admin-sidebar-fg))]/50">
                  {section.title}
                </h4>
              )}
              {isCollapsed && <div className="mx-4 mb-2 h-4 border-b border-[hsl(var(--admin-sidebar-fg))]/10" />}

              {showItems &&
                section.items.map((item) => {
                  const isActive =
                    location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                  const showMgmtDot =
                    item.path === PROVIDERS_MANAGEMENT_PATH && pendingProviderApplications > 0;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileOpen(false)}
                      title={isCollapsed ? item.title : undefined}
                      aria-label={
                        showMgmtDot
                          ? `${item.title}, ${pendingProviderApplications} pending application(s)`
                          : item.title
                      }
                      className={cn(
                        'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 group',
                        isActive
                          ? 'bg-[hsl(var(--admin-sidebar-active))] font-medium text-[hsl(var(--admin-sidebar-fg))] shadow-md'
                          : 'text-[hsl(var(--admin-sidebar-fg))]/75 hover:bg-[hsl(var(--admin-sidebar-hover))] hover:text-[hsl(var(--admin-sidebar-fg))]',
                      )}
                    >
                      <span className="relative inline-flex shrink-0">
                        <item.icon
                          className={cn(
                            'h-4 w-4',
                            isActive
                              ? 'text-[hsl(var(--admin-sidebar-fg))]'
                              : 'text-[hsl(var(--admin-sidebar-fg))]/75 group-hover:text-[hsl(var(--admin-sidebar-fg))]',
                          )}
                        />
                        {isCollapsed && showMgmtDot ? (
                          <span
                            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[hsl(var(--admin-sidebar-bg))]"
                            aria-hidden
                          />
                        ) : null}
                      </span>
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 truncate">{item.title}</span>
                          {showMgmtDot ? (
                            <span
                              className="h-2 w-2 shrink-0 rounded-full bg-red-500 ring-2 ring-[hsl(var(--admin-sidebar-bg))]"
                              title={`${pendingProviderApplications} pending`}
                              aria-hidden
                            />
                          ) : null}
                        </>
                      )}
                    </Link>
                  );
                })}
            </div>
          );
        })}
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
}

export default function AdminSidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
  return (
    <>
      <aside 
        className={cn(
          "hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out border-r border-[hsl(var(--admin-border))]",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <AdminSidebarNav isCollapsed={isCollapsed} setIsMobileOpen={setIsMobileOpen} />
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
        <AdminSidebarNav isCollapsed={isCollapsed} setIsMobileOpen={setIsMobileOpen} />
      </aside>
    </>
  );
}
