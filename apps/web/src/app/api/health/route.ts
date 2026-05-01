import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Native Next handler — no legacy HTTP stack. */
export async function GET() {
	return NextResponse.json({ status: 'ok' });
}
