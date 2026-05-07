import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import apiServerClient from '@/lib/apiServerClient';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function formatWhen(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

export default function NotificationBell({ className }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [viewAllPath, setViewAllPath] = useState('/');

  const loadSummary = useCallback(async () => {
    try {
      const res = await apiServerClient.fetch('/notifications/summary');
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setItems(Array.isArray(body.items) ? body.items : []);
      setUnread(Number(body.unread || 0));
      setViewAllPath(String(body.viewAllPath || '/'));
    } catch {
      // keep UI interactive even if request fails
    }
  }, []);

  useEffect(() => {
    void loadSummary();
    const poll = window.setInterval(() => void loadSummary(), 30000);
    const onFocus = () => void loadSummary();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadSummary]);

  const unreadText = useMemo(() => {
    if (unread <= 0) return '';
    return unread > 99 ? '99+' : String(unread);
  }, [unread]);

  const markAllRead = async () => {
    try {
      const res = await apiServerClient.fetch('/notifications/summary', { method: 'PATCH' });
      if (res.ok) {
        setItems((prev) => prev.map((it) => ({ ...it, read: true, read_at: it.read_at || new Date().toISOString() })));
        setUnread(0);
      }
    } catch {
      // no-op
    }
  };

  const openItem = async (item) => {
    if (!item.read) await markAllRead();
    navigate(item.link || viewAllPath);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={`relative ${className || ''}`}>
          <Bell className="h-5 w-5" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white">
              {unreadText}
            </span>
          ) : null}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unread > 0 ? (
            <button type="button" onClick={markAllRead} className="text-xs text-primary hover:underline">
              Mark all read
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-3 py-6 text-sm text-muted-foreground">No notifications yet.</div>
        ) : (
          items.slice(0, 6).map((item) => (
            <DropdownMenuItem
              key={item.id}
              onClick={() => void openItem(item)}
              className="flex flex-col items-start gap-1 py-3 cursor-pointer"
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span className={`text-sm ${item.read ? 'text-muted-foreground' : 'font-semibold'}`}>
                  {item.title || 'Notification'}
                </span>
                {!item.read ? <span className="mt-1 h-2 w-2 rounded-full bg-red-600" /> : null}
              </div>
              {item.body ? <p className="line-clamp-2 text-xs text-muted-foreground">{item.body}</p> : null}
              <span className="text-[10px] text-muted-foreground">{formatWhen(item.created_at)}</span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={viewAllPath} className="font-medium">
            View all
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
