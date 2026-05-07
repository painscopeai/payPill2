
import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import NotificationBell from '@/components/NotificationBell.jsx';
import ThemeToggleButton from '@/components/ThemeToggleButton.jsx';

export default function AdminNavigation({ setIsMobileOpen }) {
  const location = useLocation();
  const { currentUser: currentAdmin, logout: adminLogout } = useAuth();

  // Generate breadcrumbs from path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const title = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    return { title, isLast: index === pathSegments.length - 1 };
  });

  return (
    <header className="h-16 bg-[hsl(var(--admin-card))] border-b border-[hsl(var(--admin-border))] flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 transition-colors duration-300">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden"
          onClick={() => setIsMobileOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>

        <nav className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span>/</span>}
              <span className={crumb.isLast ? "text-foreground" : "text-muted-foreground/70"}>
                {crumb.title}
              </span>
            </React.Fragment>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3 lg:gap-5">
        <ThemeToggleButton className="rounded-full" />
        <NotificationBell className="rounded-full" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full ml-2">
              <Avatar className="h-9 w-9 border border-[hsl(var(--admin-border))]">
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {currentAdmin?.name?.charAt(0) || 'A'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{currentAdmin?.name || 'Administrator'}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {currentAdmin?.email || 'admin@paypill.com'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={adminLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
