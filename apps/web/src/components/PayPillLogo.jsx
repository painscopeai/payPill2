import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Brand wordmark (transparent PNG). Use favicon-sized mark when space is tight (e.g. collapsed admin sidebar).
 */
export function PayPillLogo({
	className,
	variant = 'full',
	alt = 'PayPill',
}) {
	if (variant === 'mark') {
		return (
			<img
				src="/favicon.png"
				alt={alt}
				className={cn('h-8 w-8 object-contain', className)}
				width={32}
				height={32}
				decoding="async"
			/>
		);
	}
	return (
		<>
			<img
				src="/paypill-logo.png"
				alt={alt}
				className={cn('h-8 w-auto max-h-10 object-contain object-left dark:hidden', className)}
				decoding="async"
			/>
			<img
				src="/paypill-logo-dark.png"
				alt={alt}
				className={cn('hidden h-8 w-auto max-h-10 object-contain object-left dark:block', className)}
				decoding="async"
			/>
		</>
	);
}
