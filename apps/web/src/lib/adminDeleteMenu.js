import { Trash2 } from 'lucide-react';

/**
 * @param {string} displayName
 * @param {{ message?: string }} [options]
 */
export function confirmDeleteRecord(displayName, options = {}) {
  const message =
    options.message ??
    `Delete "${displayName}"? This cannot be undone.`;
  return window.confirm(message);
}

/**
 * @param {{ displayName: string, onDelete: () => void | Promise<void>, separatorBefore?: boolean, hidden?: boolean, message?: string }} opts
 */
export function deleteMenuItem({ displayName, onDelete, separatorBefore = true, hidden, message }) {
  return {
    label: 'Delete',
    icon: Trash2,
    destructive: true,
    separatorBefore,
    hidden,
    onClick: () => {
      if (confirmDeleteRecord(displayName, { message })) {
        void onDelete();
      }
    },
  };
}

/**
 * @param {import('@/components/admin/TableRowActionsMenu.jsx').TableRowActionItem[]} items
 * @param {{ displayName: string, onDelete: () => void | Promise<void>, hidden?: boolean }} opts
 */
export function withDeleteMenuItem(items, opts) {
  const deleteItem = deleteMenuItem(opts);
  const hasDelete = items.some((i) => i.label === 'Delete' || i.label === 'Soft-disable');
  if (hasDelete) {
    return items.map((i) =>
      i.label === 'Soft-disable' ? { ...deleteItem, separatorBefore: i.separatorBefore } : i,
    );
  }
  return [...items, deleteItem];
}
