import React from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * @typedef {object} TableRowActionItem
 * @property {string} label
 * @property {React.ComponentType<{ className?: string }>} [icon]
 * @property {() => void} [onClick]
 * @property {string} [href] — react-router path
 * @property {boolean} [destructive]
 * @property {boolean} [hidden]
 * @property {string} [className]
 * @property {boolean} [separatorBefore]
 */

/**
 * @param {{ items?: TableRowActionItem[], align?: 'start' | 'center' | 'end', label?: string, className?: string }} props
 */
export function TableRowActionsMenu({ items = [], align = 'end', label = 'Actions', className }) {
  const visible = items.filter((item) => !item.hidden);
  if (visible.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', className)}
          aria-label="Row actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        {visible.map((item, index) => {
          const Icon = item.icon;
          const itemClass = cn(
            item.destructive && 'text-destructive focus:text-destructive',
            item.className,
          );
          const content = (
            <>
              {Icon ? <Icon className="h-4 w-4 mr-2" /> : null}
              {item.label}
            </>
          );

          return (
            <React.Fragment key={`${item.label}-${index}`}>
              {item.separatorBefore && index > 0 ? <DropdownMenuSeparator /> : null}
              {item.href ? (
                <DropdownMenuItem asChild className={itemClass}>
                  <Link to={item.href}>{content}</Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className={itemClass} onClick={item.onClick}>
                  {content}
                </DropdownMenuItem>
              )}
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
