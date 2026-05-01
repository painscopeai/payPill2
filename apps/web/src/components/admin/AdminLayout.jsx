
import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar.jsx';
import AdminNavigation from './AdminNavigation.jsx';
import { cn } from '@/lib/utils';

export default function AdminLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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
        
        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
