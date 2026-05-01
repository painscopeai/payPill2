import { createMocks } from 'node-mocks-http';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getExpressApp } from '@/server/expressSingleton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function runExpress(
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
	const app = await getExpressApp();

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
			(app as (a: typeof req, b: typeof res) => void)(req, res);
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

async function handle(request: NextRequest, method: string) {
	const url = new URL(request.url);
	let bodyBuffer: Buffer | null = null;
	if (method !== 'GET' && method !== 'HEAD') {
		const ab = await request.arrayBuffer();
		bodyBuffer = ab.byteLength ? Buffer.from(ab) : null;
	}
	return runExpress(method, url, request.headers, bodyBuffer);
}

export async function GET(request: NextRequest) {
	return handle(request, 'GET');
}

export async function HEAD(request: NextRequest) {
	return handle(request, 'HEAD');
}

export async function POST(request: NextRequest) {
	return handle(request, 'POST');
}

export async function PUT(request: NextRequest) {
	return handle(request, 'PUT');
}

export async function PATCH(request: NextRequest) {
	return handle(request, 'PATCH');
}

export async function DELETE(request: NextRequest) {
	return handle(request, 'DELETE');
}

export async function OPTIONS() {
	return new NextResponse(null, { status: 204 });
}
