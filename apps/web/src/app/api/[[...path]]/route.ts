import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { dispatchFromNextRequest } from '@/server/api/dispatchLegacyApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
	return dispatchFromNextRequest(request, 'GET');
}

export async function HEAD(request: NextRequest) {
	return dispatchFromNextRequest(request, 'HEAD');
}

export async function POST(request: NextRequest) {
	return dispatchFromNextRequest(request, 'POST');
}

export async function PUT(request: NextRequest) {
	return dispatchFromNextRequest(request, 'PUT');
}

export async function PATCH(request: NextRequest) {
	return dispatchFromNextRequest(request, 'PATCH');
}

export async function DELETE(request: NextRequest) {
	return dispatchFromNextRequest(request, 'DELETE');
}

export async function OPTIONS() {
	return new NextResponse(null, { status: 204 });
}
