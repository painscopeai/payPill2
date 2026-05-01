#!/usr/bin/env node
/**
 * Lightweight HTTP smoke against a running Next server (no browser).
 * Usage: npm run start &  sleep 3 && npm run smoke:api
 *    or: SMOKE_BASE_URL=http://127.0.0.1:4173 npm run smoke:api
 */
const base =
	process.env.SMOKE_BASE_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3000';

const paths = [
	['/api/health', [200]],
	['/api/analytics/financial', [200]],
	['/api/analytics/subscriptions', [200]],
	['/api/analytics/patients', [200]],
	['/api/analytics/employers', [200]],
	['/api/analytics/insurance', [200]],
	['/api/analytics/providers', [200]],
	['/api/analytics/ai', [200]],
	['/api/analytics/forms', [200]],
	['/api/admin/users/patients', [401, 403]],
];

async function main() {
	let failed = false;
	for (const [path, okStatuses] of paths) {
		const url = `${base}${path}`;
		try {
			const res = await fetch(url, { redirect: 'manual' });
			const ct = res.headers.get('content-type') || '';
			if (!okStatuses.includes(res.status)) {
				console.error(`FAIL ${path}: ${res.status} (expected one of ${okStatuses.join(',')})`);
				failed = true;
				continue;
			}
			if (res.status === 200 && !ct.includes('json')) {
				console.error(`FAIL ${path}: expected JSON content-type, got ${ct || '(none)'}`);
				failed = true;
				continue;
			}
			console.log(`ok ${path} -> ${res.status}`);
		} catch (e) {
			console.error(`FAIL ${path}: ${e.message}`);
			failed = true;
		}
	}
	if (failed) {
		console.error('\nSmoke failed. Is the server running at', base, '?');
		process.exit(1);
	}
	console.log('\nAll smoke checks passed.');
}

await main();
