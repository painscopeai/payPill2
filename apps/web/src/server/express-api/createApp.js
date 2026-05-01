import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import routes from './routes/index.js';
import { errorMiddleware } from './middleware/error.js';
import { globalRateLimit } from './middleware/global-rate-limit.js';
import { BodyLimit } from './constants/common.js';

/**
 * Express app without listening — used by Next.js Route Handlers and by main.js.
 */
export function createApp() {
	const app = express();

	app.set('trust proxy', true);

	app.use(helmet());
	app.use(
		cors({
			origin: process.env.CORS_ORIGIN || true,
			credentials: true,
		}),
	);
	app.use(morgan('combined'));
	app.use(globalRateLimit);
	app.use(
		express.json({
			limit: BodyLimit,
		}),
	);
	app.use(
		express.urlencoded({
			extended: true,
			limit: BodyLimit,
		}),
	);

	app.use('/', routes());

	app.use(errorMiddleware);

	app.use((req, res) => {
		res.status(404).json({ error: 'Route not found' });
	});

	return app;
}
