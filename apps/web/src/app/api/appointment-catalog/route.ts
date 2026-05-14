import { NextResponse } from 'next/server';
import { getAppointmentCatalog } from '@/server/admin/appointmentReferenceService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Public read: visit types, insurance options, copay matrix, provider practices linked to completed provider accounts. */
export async function GET() {
	try {
		const catalog = await getAppointmentCatalog();
		return NextResponse.json(catalog);
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Server error';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
