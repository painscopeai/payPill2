import React from 'react';
import { Navigate } from 'react-router-dom';

/** @deprecated Use `/admin/bulk-imports?tab=providers`. */
export default function BulkProviderUploadPage() {
	return <Navigate to="/admin/bulk-imports?tab=providers" replace />;
}
