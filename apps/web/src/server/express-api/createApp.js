import dotenv from 'dotenv';
dotenv.config();
import { App } from '@tinyhttp/app';
import routes from './routes/index.js';
import { errorMiddleware } from './middleware/error.js';
import { globalRateLimit } from './middleware/global-rate-limit.js';
import { jsonBodyMiddleware } from './middleware/jsonBody.js';
import logger from './utils/logger.js';

function corsMiddleware(req, res, next) {
	const origin = process.env.CORS_ORIGIN || true;
	if (origin === true) {
		res.setHeader('Access-Control-Allow-Origin', '*');
	} else {
		res.setHeader('Access-Control-Allow-Origin', String(origin));
	}
	res.setHeader('Access-Control-Allow-Credentials', 'true');
	res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || '*');
	if (req.method === 'OPTIONS') {
		return res.status(204).end();
	}
	next();
}

function securityHeaders(req, res, next) {
	res.setHeader('X-Content-Type-Options', 'nosniff');
	res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
	res.setHeader('X-Frame-Options', 'SAMEORIGIN');
	next();
}

function requestLogger(req, res, next) {
	const start = Date.now();
	res.on('finish', () => {
		const ms = Date.now() - start;
		logger.info(`${req.method} ${req.url} ${res.statusCode} ${ms}ms`);
	});
	next();
}

/**
 * HTTP app (tinyhttp) — used by Next.js Route Handlers via node-mocks-http.
 */
export function createApp() {
	const app = new App({
		onError: (err, req, res) => errorMiddleware(err, req, res, () => {}),
	});
	app.set('trust proxy', true);
	app.set('networkExtensions', true);
	app.set('bindAppToReqRes', true);

	app.use(securityHeaders);
	app.use(corsMiddleware);
	app.use(requestLogger);
	app.use(globalRateLimit);
	app.use(jsonBodyMiddleware);
	app.use('/', routes());

	app.use((req, res) => {
		res.status(404).json({ error: 'Route not found' });
	});

	return app;
}
