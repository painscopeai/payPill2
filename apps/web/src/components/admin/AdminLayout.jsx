
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar.jsx';
import AdminNavigation from './AdminNavigation.jsx';
import { cn } from '@/lib/utils';

export default function AdminLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { pathname } = useLocation();
  /** Forms builder & related routes need full main width — max-w-7xl leaves huge gutters and starves the editor at 100% zoom. */
  const fullWidthStudio = pathname.startsWith('/admin/forms');

  return (
    <div className="min-h-screen bg-[hsl(var(--admin-bg))] flex font-sans">
      <AdminSidebar 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out",
        isCollapsed ? "lg:ml-20" : "lg:ml-64"
      )}>
        <AdminNavigation setIsMobileOpen={setIsMobileOpen} />
        
        <main
          className={cn(
            'flex min-h-0 flex-1 flex-col overflow-x-hidden',
            fullWidthStudio ? 'p-2 sm:p-3 md:p-4 lg:p-5' : 'p-4 lg:p-8',
          )}
        >
          <div
            className={cn(
              'animate-in fade-in duration-500',
              fullWidthStudio
                ? 'mx-auto flex min-h-0 w-full max-w-none flex-1 flex-col'
                : 'mx-auto max-w-7xl',
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
