
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar.jsx';
import AdminNavigation from './AdminNavigation.jsx';
import { cn } from '@/lib/utils';

export default function AdminLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const compactPadding =
    pathname.startsWith('/admin/forms') ||
    pathname.startsWith('/admin/form-responses') ||
    pathname.startsWith('/admin/profile-reference-data');

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
            'flex min-h-0 w-full flex-1 flex-col overflow-x-hidden',
            compactPadding ? 'p-2 sm:p-3 md:p-4 lg:p-5' : 'p-4 lg:p-6',
          )}
        >
          <div className="animate-in fade-in duration-500 flex min-h-0 w-full max-w-none flex-1 flex-col">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
