import apiServerClient from '@/lib/apiServerClient';
import { supabase } from '@/lib/supabaseClient';

/** Drop deleted rows from React table state immediately (active or inactive). */
export function removeRowsFromState(setData, rowsOrIds) {
  const list = Array.isArray(rowsOrIds) ? rowsOrIds : [rowsOrIds];
  const ids = new Set(
    list.map((r) => (typeof r === 'string' || typeof r === 'number' ? String(r) : r?.id)).filter(Boolean),
  );
  if (ids.size === 0) return;
  setData((prev) => prev.filter((row) => !ids.has(row.id)));
}

export async function getAdminAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseDeleteError(res) {
  const body = await res.json().catch(() => ({}));
  return body.error || body.message || `Delete failed (${res.status})`;
}

/** Hard-delete rows from allowlisted admin tables. */
export async function deleteAdminDataTableRow(table, id) {
  const res = await apiServerClient.fetch(`/admin/data/${table}/${id}`, {
    method: 'DELETE',
    headers: await getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error(await parseDeleteError(res));
}

export async function deleteAdminProvider(id) {
  const res = await apiServerClient.fetch(`/admin/providers/${id}`, {
    method: 'DELETE',
    headers: await getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error(await parseDeleteError(res));
}

export async function deleteAdminForm(id) {
  const res = await apiServerClient.fetch(`/forms/${id}`, {
    method: 'DELETE',
    headers: await getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error(await parseDeleteError(res));
}

export async function deleteFormResponse(formId, responseId) {
  const res = await apiServerClient.fetch(`/forms/${formId}/responses/${responseId}`, {
    method: 'DELETE',
    headers: await getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error(await parseDeleteError(res));
}
