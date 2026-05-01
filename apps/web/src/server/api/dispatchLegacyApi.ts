import { createMocks } from 'node-mocks-http';
import type { App } from '@tinyhttp/app';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

let cachedApp: App | null = null;

async function getLegacyHttpApp(): Promise<App> {
	if (cachedApp) return cachedApp;
	const { createApp } = await import('@/server/express-api/createApp.js');
	cachedApp = createApp();
	return cachedApp;
}

/**
 * Bridge legacy tinyhttp stack → NextResponse (used by catch‑all and curated native routes).
 */
export async function dispatchLegacyApi(
	method: string,
	url: URL,
	headers: Headers,
	bodyBuffer: Buffer | null,
): Promise<NextResponse> {
	const expressPath = (url.pathname.replace(/^\/api/, '') || '/') + url.search;
	const headerObj: Record<string, string> = {};
	headers.forEach((v, k) => {
		headerObj[k] = v;
	});

	const mocks = createMocks({
		method: method as 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
		url: expressPath,
		headers: headerObj,
		...(bodyBuffer && bodyBuffer.length ? { body: bodyBuffer } : {}),
	});

	const { req, res } = mocks;
	const app = await getLegacyHttpApp();

	await new Promise<void>((resolve, reject) => {
		const done = () => {
			res.off('finish', done);
			res.off('error', onErr);
			resolve();
		};
		const onErr = (e: Error) => {
			res.off('finish', done);
			res.off('error', onErr);
			reject(e);
		};
		res.once('finish', done);
		res.once('error', onErr);
		try {
			app.attach(req, res, () => {});
		} catch (e) {
			res.off('finish', done);
			res.off('error', onErr);
			reject(e);
		}
	});

	const status = res._getStatusCode();
	const raw = res._getData();
	const payload: BodyInit =
		Buffer.isBuffer(raw)
			? new Uint8Array(raw)
			: typeof raw === 'string'
				? raw
				: raw != null
					? String(raw)
					: '';

	const outHeaders = new Headers();
	const hdrs = res.getHeaders?.() ?? {};
	for (const [k, v] of Object.entries(hdrs)) {
		if (v === undefined) continue;
		outHeaders.set(k, Array.isArray(v) ? v.join(', ') : String(v));
	}

	return new NextResponse(payload, { status, headers: outHeaders });
}

export async function dispatchFromNextRequest(request: NextRequest, method: string): Promise<NextResponse> {
	const url = new URL(request.url);
	let bodyBuffer: Buffer | null = null;
	if (method !== 'GET' && method !== 'HEAD') {
		const ab = await request.arrayBuffer();
		bodyBuffer = ab.byteLength ? Buffer.from(ab) : null;
	}
	return dispatchLegacyApi(method, url, request.headers, bodyBuffer);
}
