import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Columns3 } from 'lucide-react';

/**
 * @param {{ key: string, label: string }[]} columnOptions - toggleable columns (required columns stay visible outside this list)
 * @param {Set<string>} visibleKeys
 * @param {(keys: Set<string>) => void} onVisibleKeysChange
 * @param {string[]} [defaultKeys] - for "Reset" action
 */
export function ProviderTableColumnPicker({
	columnOptions,
	visibleKeys,
	onVisibleKeysChange,
	defaultKeys = [],
	minVisible = 1,
}) {
	const visibleCount = columnOptions.filter((c) => visibleKeys.has(c.key)).length;

	const toggle = (key, checked) => {
		const next = new Set(visibleKeys);
		if (checked) {
			next.add(key);
		} else {
			if (visibleCount <= minVisible && next.has(key)) return;
			next.delete(key);
		}
		onVisibleKeysChange(next);
	};

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button type="button" variant="outline" size="sm" className="gap-2 shrink-0">
					<Columns3 className="h-4 w-4" />
					Columns
					<span className="text-muted-foreground font-normal">
						({visibleCount}/{columnOptions.length})
					</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-56 p-3" align="end">
				<div className="flex items-center justify-between gap-2 mb-3">
					<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Show columns</p>
					{defaultKeys.length > 0 ? (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-7 text-xs px-2"
							onClick={() => onVisibleKeysChange(new Set(defaultKeys))}
						>
							Reset
						</Button>
					) : null}
				</div>
				<ul className="space-y-2 max-h-[min(320px,50vh)] overflow-y-auto">
					{columnOptions.map((col) => {
						const id = `col-toggle-${col.key}`;
						const checked = visibleKeys.has(col.key);
						const disabled = checked && visibleCount <= minVisible;
						return (
							<li key={col.key} className="flex items-center gap-2">
								<Checkbox
									id={id}
									checked={checked}
									disabled={disabled}
									onCheckedChange={(v) => toggle(col.key, v === true)}
								/>
								<Label htmlFor={id} className="text-sm font-normal cursor-pointer flex-1 leading-tight">
									{col.label}
								</Label>
							</li>
						);
					})}
				</ul>
			</PopoverContent>
		</Popover>
	);
}

export function loadColumnVisibility(storageKey, defaultKeys, allToggleableKeys) {
	const fallback = new Set(defaultKeys.filter((k) => allToggleableKeys.includes(k)));
	try {
		const raw = localStorage.getItem(storageKey);
		if (!raw) return fallback;
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return fallback;
		const keys = parsed.filter((k) => typeof k === 'string' && allToggleableKeys.includes(k));
		if (!keys.length) return fallback;
		return new Set(keys);
	} catch {
		return fallback;
	}
}

export function saveColumnVisibility(storageKey, visibleKeys) {
	try {
		localStorage.setItem(storageKey, JSON.stringify([...visibleKeys]));
	} catch {
		/* private mode */
	}
}
