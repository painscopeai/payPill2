import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { requireEmployer } from '@/server/auth/requireEmployer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function monthKey(ts: string | null | undefined): string {
	const d = ts ? new Date(ts) : new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function toIsoOrNull(value: string | null): string | null {
	if (!value) return null;
	const d = new Date(value);
	return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

export async function GET(request: NextRequest) {
	const ctx = await requireEmployer(request);
	if (ctx instanceof NextResponse) return ctx;
	const sb = getSupabaseAdmin();

	const now = new Date();
	const url = new URL(request.url);
	const fromIso = toIsoOrNull(url.searchParams.get('from'));
	const toRaw = toIsoOrNull(url.searchParams.get('to'));
	const toIso = toRaw ? new Date(new Date(toRaw).getTime() + 24 * 60 * 60 * 1000 - 1).toISOString() : null;
	const ytdStart = fromIso || new Date(now.getFullYear(), 0, 1).toISOString();
	const endTs = toIso || now.toISOString();
	const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

	const [appointmentRes, employeeRes] = await Promise.all([
		sb
			.from('appointments')
			.select(
				'id,user_id,provider_id,provider_name,provider_service_id,appointment_type,reason,status,created_at,appointment_date,appointment_time',
			)
			.gte('created_at', ytdStart)
			.lte('created_at', endTs),
		sb
			.from('employer_employees')
			.select('id,user_id,email,first_name,last_name,department,status')
			.eq('employer_id', ctx.employerId),
	]);

	if (appointmentRes.error) return NextResponse.json({ error: appointmentRes.error.message }, { status: 500 });
	if (employeeRes.error) return NextResponse.json({ error: employeeRes.error.message }, { status: 500 });

	type EmployeeRow = {
		id: string;
		user_id: string | null;
		email: string;
		first_name: string | null;
		last_name: string | null;
		department: string | null;
		status: string | null;
	};
	type AppointmentRow = {
		id: string;
		user_id: string | null;
		provider_id: string | null;
		provider_name: string | null;
		provider_service_id: string | null;
		appointment_type: string | null;
		reason: string | null;
		status: string | null;
		created_at: string | null;
		appointment_date: string | null;
		appointment_time: string | null;
	};

	const employerEmployees = (employeeRes.data ?? []) as EmployeeRow[];
	const employeeByUserId = new Map(
		employerEmployees.filter((e) => e.user_id).map((e) => [e.user_id as string, e]),
	);
	const employerAppointments = ((appointmentRes.data ?? []) as AppointmentRow[]).filter(
		(a) => a.user_id && employeeByUserId.has(a.user_id),
	);

	const serviceIds = Array.from(
		new Set(employerAppointments.map((a) => a.provider_service_id).filter(Boolean)),
	) as string[];
	type ServiceRow = { id: string; name: string; price: number | null; category: string | null };
	const { data: serviceRows } = serviceIds.length
		? await sb.from('provider_services').select('id,name,price,category').in('id', serviceIds)
		: { data: [] };
	const serviceById = new Map<string, ServiceRow>(
		((serviceRows || []) as ServiceRow[]).map((s) => [s.id, s]),
	);

	const activityLog = employerAppointments
		.map((a) => {
			const employee = employeeByUserId.get(a.user_id as string);
			const service: ServiceRow | null = a.provider_service_id ? serviceById.get(a.provider_service_id) || null : null;
			const serviceCost = Number(service?.price || 0);
			const serviceName =
				service?.name || a.reason || a.appointment_type || 'General visit - no catalog line';
			return {
				appointmentId: a.id,
				employeeId: employee?.id || null,
				employeeName:
					employee &&
					([employee.first_name, employee.last_name].filter(Boolean).join(' ').trim() || employee.email),
				employeeEmail: employee?.email || null,
				department: employee?.department || null,
				providerName: a.provider_name || 'Provider',
				serviceName,
				serviceCategory: service?.category || 'service',
				status: a.status || 'unknown',
				activityAt: a.created_at,
				appointmentDate: a.appointment_date,
				appointmentTime: a.appointment_time,
				cost: serviceCost,
				patientCopay: 0,
				insuranceLiability: serviceCost,
			};
		})
		.sort((a, b) => new Date(b.activityAt || 0).getTime() - new Date(a.activityAt || 0).getTime());

	const totalHealthcareCosts = activityLog.reduce((sum, r) => sum + r.cost, 0);
	const activeEmployees = employerEmployees.filter((e) => e.status === 'active').length;
	const avgCostPerEmployee = activeEmployees > 0 ? totalHealthcareCosts / activeEmployees : 0;
	const uniquePatients = new Set(activityLog.map((r) => r.employeeId).filter(Boolean)).size;
	const totalActivities = activityLog.length;
	const careUtilizationRate =
		activeEmployees > 0 ? Number(((uniquePatients / activeEmployees) * 100).toFixed(1)) : 0;

	const topServicesMap = new Map<string, { name: string; count: number; cost: number }>();
	for (const row of activityLog) {
		const key = row.serviceName;
		const existing = topServicesMap.get(key) || { name: key, count: 0, cost: 0 };
		existing.count += 1;
		existing.cost += row.cost;
		topServicesMap.set(key, existing);
	}
	const topServices = Array.from(topServicesMap.values())
		.sort((a, b) => b.count - a.count)
		.slice(0, 5);
	const highOccurringService = topServices[0]?.name || 'N/A';
	const highOccurringServiceCount = topServices[0]?.count || 0;

	const monthKeys: string[] = [];
	for (let i = 5; i >= 0; i--) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
	}
	const monthRows = new Map<string, { medical: number; pharmacy: number; preventive: number }>();
	for (const key of monthKeys) monthRows.set(key, { medical: 0, pharmacy: 0, preventive: 0 });

	for (const row of activityLog.filter((r) => new Date(r.activityAt || 0).toISOString() >= sixMonthsAgo)) {
		const key = monthKey(row.activityAt || undefined);
		const m = monthRows.get(key);
		if (!m) continue;
		const s = row.serviceName.toLowerCase();
		if (s.includes('pharmacy') || s.includes('drug')) m.pharmacy += row.cost;
		else if (s.includes('prevent') || s.includes('screen')) m.preventive += row.cost;
		else m.medical += row.cost;
	}

	const monthlyCosts = monthKeys.map((key) => {
		const [year, mm] = key.split('-');
		const monthLabel = new Date(Number(year), Number(mm) - 1, 1).toLocaleString('default', { month: 'short' });
		return { month: monthLabel, ...monthRows.get(key)! };
	});

	const pharmacyCost = monthlyCosts.reduce((sum, m) => sum + m.pharmacy, 0);
	const pharmacySpendPercent =
		totalHealthcareCosts > 0 ? Number(((pharmacyCost / totalHealthcareCosts) * 100).toFixed(1)) : 0;

	const savingsCategories = [
		{ name: 'Care Routing', value: Number((totalHealthcareCosts * 0.05).toFixed(2)) },
		{ name: 'Prevention Impact', value: Number((totalHealthcareCosts * 0.08).toFixed(2)) },
		{ name: 'Claims Optimization', value: Number((totalHealthcareCosts * 0.04).toFixed(2)) },
	].filter((r) => r.value > 0);

	const employeeCostMap = new Map<
		string,
		{
			employeeName: string;
			employeeEmail: string;
			department: string | null;
			totalCost: number;
			visitCount: number;
		}
	>();
	for (const row of activityLog) {
		const key = row.employeeId || row.employeeEmail || 'unknown';
		const existing = employeeCostMap.get(key) || {
			employeeName: row.employeeName || 'Unknown employee',
			employeeEmail: row.employeeEmail || '',
			department: row.department,
			totalCost: 0,
			visitCount: 0,
		};
		existing.totalCost += row.cost;
		existing.visitCount += 1;
		employeeCostMap.set(key, existing);
	}
	const employeeCostTable = Array.from(employeeCostMap.values())
		.sort((a, b) => b.totalCost - a.totalCost)
		.map((r) => ({
			...r,
			totalCost: Number(r.totalCost.toFixed(2)),
			avgCost: Number((r.visitCount > 0 ? r.totalCost / r.visitCount : 0).toFixed(2)),
		}));

	return NextResponse.json({
		filters: {
			from: ytdStart,
			to: endTs,
		},
		kpis: {
			totalHealthcareCosts,
			totalSavings: savingsCategories.reduce((sum, x) => sum + x.value, 0),
			avgCostPerEmployee,
			pharmacySpendPercent,
			patientsReceivedCare: uniquePatients,
			totalActivities,
			highOccurringService,
			highOccurringServiceCount,
			careUtilizationRate,
		},
		monthlyCosts,
		savingsCategories,
		topServices,
		employeeCostTable,
		activityLog,
	});
}
