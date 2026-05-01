import { App } from '@tinyhttp/app';
import { ContentBlockType, stream, uploadIntegratedAiImages, getHistory } from '../api/integrated-ai.js';
import { SystemPrompt } from '../constants/prompts.js';
import { uploadFiles } from '../middleware/file-upload.js';
import { integratedAiRateLimit } from '../middleware/integrated-ai-rate-limit.js';
import { requireSupabaseUser } from '../middleware/requireSupabaseUser.js';

const router = new App();

router.use(requireSupabaseUser);

/** JSON history for client-side chat (replaces direct PocketBase reads). */
router.get('/history', async (req, res) => {
	const history = await getHistory({ userId: req.user.id });
	return res.json(history);
});

router.post(
	'/stream',
	integratedAiRateLimit,
	uploadFiles({
		allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
		fieldName: 'images',
	}),
	async (req, res) => {
		const { message } = req.body;

		if (!message) {
			throw new Error('message is required');
		}

		const parsedMessage = JSON.parse(message);

		if (req.files?.length > 0) {
			const imageUrls = await uploadIntegratedAiImages({ images: req.files });
			imageUrls.forEach((url) => {
				parsedMessage.push({ type: ContentBlockType.Image, image: url });
			});
		}

		const sseStream = await stream({
			userId: req.user.id,
			systemPrompt: SystemPrompt,
			userMessage: parsedMessage,
		});

		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.setHeader('X-Accel-Buffering', 'no');

		sseStream.pipe(res, { end: false });

		res.on('close', () => sseStream.destroy());
	},
);

export default router;
