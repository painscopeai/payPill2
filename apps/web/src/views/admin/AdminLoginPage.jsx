import { Navigate } from 'react-router-dom';

/** Legacy URL; admin auth is unified under Supabase at `/auth/admin`. */
export default function AdminLoginPage() {
	return <Navigate to="/auth/admin" replace />;
}
