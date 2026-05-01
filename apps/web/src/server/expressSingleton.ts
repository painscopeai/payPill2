import type { Express } from 'express';

let cached: Express | null = null;

export async function getExpressApp(): Promise<Express> {
	if (cached) return cached;
	const { createApp } = await import('@/server/express-api/createApp.js');
	cached = createApp();
	return cached;
}
