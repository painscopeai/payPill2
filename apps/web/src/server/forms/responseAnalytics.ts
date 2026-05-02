/**
 * Analytics for form_responses rows (mirrors legacy tinyhttp forms.js GET logic).
 */

export type FormResponseRow = {
	id?: string;
	completion_time_seconds?: number | null;
	submitted_at?: string | null;
	created_at?: string | null;
};

export type ResponseAnalytics = {
	total_responses: number;
	completed_responses: number;
	completion_rate: number;
	avg_completion_time_seconds: number;
	response_timeline: Record<string, number>;
};

export function computeResponseAnalytics(allResponses: FormResponseRow[]): ResponseAnalytics {
	const totalResponses = (allResponses || []).length;
	const completedResponses = (allResponses || []).filter((r) => (r.completion_time_seconds || 0) > 0).length;
	const completionRate =
		totalResponses > 0 ? parseFloat(((completedResponses / totalResponses) * 100).toFixed(2)) : 0;
	const avgCompletionTime =
		totalResponses > 0
			? parseFloat(
					(
						(allResponses || []).reduce((sum, r) => sum + (r.completion_time_seconds || 0), 0) / totalResponses
					).toFixed(2),
				)
			: 0;
	const response_timeline: Record<string, number> = {};
	(allResponses || []).forEach((response) => {
		const ts = response.submitted_at || response.created_at;
		if (!ts) return;
		const date = String(ts).split('T')[0];
		response_timeline[date] = (response_timeline[date] || 0) + 1;
	});
	return {
		total_responses: totalResponses,
		completed_responses: completedResponses,
		completion_rate: completionRate,
		avg_completion_time_seconds: avgCompletionTime,
		response_timeline,
	};
}
