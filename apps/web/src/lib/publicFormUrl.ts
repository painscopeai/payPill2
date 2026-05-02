/** Absolute URL for respondents to open a published form (browser only). */
export function publicFormUrl(formId: string): string {
	if (typeof window === 'undefined') return `/forms/${formId}`;
	return new URL(`/forms/${formId}`, window.location.origin).href;
}
