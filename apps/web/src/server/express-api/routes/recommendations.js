import { App } from '@tinyhttp/app';

/**
 * Legacy /recommendations API (PocketBase-era). Use /ai-recommendations instead.
 */
const router = new App();

router.all('*', (_req, res) => {
	return res.status(410).json({
		error: 'This endpoint has been retired. Use /api/ai-recommendations instead.',
	});
});

export default router;
