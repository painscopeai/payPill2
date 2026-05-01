'use client';

import React from 'react';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext.jsx';
import { RecommendationProvider } from '@/contexts/RecommendationContext.jsx';
import { Toaster } from '@/components/ui/sonner';

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
			<AuthProvider>
				<OnboardingProvider>
					<RecommendationProvider>
						{children}
						<Toaster position="top-center" closeButton />
					</RecommendationProvider>
				</OnboardingProvider>
			</AuthProvider>
		</ThemeProvider>
	);
}
