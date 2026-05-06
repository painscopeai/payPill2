import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import BulkImportPanel from '@/components/admin/BulkImportPanel.jsx';

const TAB_KEYS = [
	'employees',
	'providers',
	'provider_types',
	'visit_types',
	'insurance_options',
	'provider_services',
	'contracts',
];

export default function BulkImportsHubPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const tabFromUrl = searchParams.get('tab');
	const activeTab = TAB_KEYS.includes(tabFromUrl) ? tabFromUrl : 'employees';

	const setTab = (v) => {
		setSearchParams({ tab: v }, { replace: true });
	};

	const [employers, setEmployers] = useState([]);
	const [providers, setProviders] = useState([]);
	const [employerId, setEmployerId] = useState('');
	const [providerId, setProviderId] = useState('');
	const [contractEmployerId, setContractEmployerId] = useState('');

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const {
					data: { session },
				} = await supabase.auth.getSession();
				const token = session?.access_token;
				const res = await apiServerClient.fetch('/admin/bulk/employer-options', {
					headers: token ? { Authorization: `Bearer ${token}` } : {},
				});
				const body = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(body.error || 'Failed to load employers');
				if (!cancelled) setEmployers(body.items || []);
			} catch (e) {
				console.error(e);
				toast.error(e.message || 'Could not load employer accounts');
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const { data, error } = await supabase
					.from('providers')
					.select('id,name')
					.order('name', { ascending: true })
					.limit(500);
				if (error) throw error;
				if (!cancelled) setProviders(data || []);
			} catch (e) {
				console.error(e);
				toast.error('Could not load providers');
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<div className="space-y-6 max-w-4xl mx-auto">
			<div>
				<h1 className="text-3xl font-bold font-display">Bulk imports</h1>
				<p className="text-muted-foreground">
					Upload CSV or Excel using each entity&apos;s template (download per tab). Headers must match exactly.
				</p>
			</div>

			<Tabs value={activeTab} onValueChange={setTab} className="w-full">
				<TabsList className="flex flex-wrap h-auto gap-1 justify-start">
					<TabsTrigger value="employees">Employees</TabsTrigger>
					<TabsTrigger value="providers">Providers</TabsTrigger>
					<TabsTrigger value="provider_types">Provider types</TabsTrigger>
					<TabsTrigger value="visit_types">Visit types</TabsTrigger>
					<TabsTrigger value="insurance_options">Insurance options</TabsTrigger>
					<TabsTrigger value="provider_services">Provider services</TabsTrigger>
					<TabsTrigger value="contracts">Employer contracts</TabsTrigger>
				</TabsList>

				<TabsContent value="employees" className="mt-6">
					<BulkImportPanel
						title="Bulk employee upload"
						description="Creates Supabase users (Manage Your Health) and links them to the selected employer. Passwords require change on first login."
						templateKind="employees"
						uploadPath="/admin/bulk/employees"
					>
						<div className="space-y-2 max-w-md">
							<Label htmlFor="employer-acct">Employer account</Label>
							<input type="hidden" name="employerId" value={employerId} />
							<Select value={employerId} onValueChange={setEmployerId} required>
								<SelectTrigger id="employer-acct">
									<SelectValue placeholder="Select employer organization" />
								</SelectTrigger>
								<SelectContent>
									{employers.map((p) => (
										<SelectItem key={p.id} value={p.id}>
											{p.label || p.email || p.id}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{employers.length === 0 && (
								<p className="text-xs text-muted-foreground">
									No employer accounts found. Ensure profiles have role &quot;employer&quot; or a row in employers with
									user_id set to that login.
								</p>
							)}
						</div>
					</BulkImportPanel>
				</TabsContent>

				<TabsContent value="providers" className="mt-6">
					<BulkImportPanel
						title="Bulk provider upload"
						description="Import provider organizations into the directory."
						templateKind="providers"
						uploadPath="/admin/bulk/providers"
					/>
				</TabsContent>

				<TabsContent value="provider_types" className="mt-6">
					<BulkImportPanel
						title="Bulk provider types"
						description="Slug must be unique (lowercase letters, digits, hyphen, underscore)."
						templateKind="provider_types"
						uploadPath="/admin/bulk/provider-types"
					/>
				</TabsContent>

				<TabsContent value="visit_types" className="mt-6">
					<BulkImportPanel
						title="Bulk visit types"
						description="Appointment visit types shown during booking."
						templateKind="visit_types"
						uploadPath="/admin/bulk/visit-types"
					/>
				</TabsContent>

				<TabsContent value="insurance_options" className="mt-6">
					<BulkImportPanel
						title="Bulk insurance options"
						description="Insurance selections for booking; separate template from visit types."
						templateKind="insurance_options"
						uploadPath="/admin/bulk/insurance-options"
					/>
				</TabsContent>

				<TabsContent value="provider_services" className="mt-6">
					<BulkImportPanel
						title="Bulk provider services"
						description="Services or pricing rows for one provider. Choose the provider below."
						templateKind="provider_services"
						uploadPath="/admin/bulk/provider-services"
					>
						<div className="space-y-2 max-w-md">
							<Label htmlFor="prov-pick">Provider</Label>
							<input type="hidden" name="providerId" value={providerId} />
							<Select value={providerId} onValueChange={setProviderId} required>
								<SelectTrigger id="prov-pick">
									<SelectValue placeholder="Select provider" />
								</SelectTrigger>
								<SelectContent>
									{providers.map((p) => (
										<SelectItem key={p.id} value={p.id}>
											{p.name || p.id}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</BulkImportPanel>
				</TabsContent>

				<TabsContent value="contracts" className="mt-6">
					<BulkImportPanel
						title="Bulk employer contracts"
						description="Minimal contract rows for an employer organization."
						templateKind="employer_contracts"
						uploadPath="/admin/bulk/contracts"
					>
						<div className="space-y-2 max-w-md">
							<Label htmlFor="contract-emp">Employer account</Label>
							<input type="hidden" name="employerUserId" value={contractEmployerId} />
							<Select value={contractEmployerId} onValueChange={setContractEmployerId} required>
								<SelectTrigger id="contract-emp">
									<SelectValue placeholder="Select employer" />
								</SelectTrigger>
								<SelectContent>
									{employers.map((p) => (
										<SelectItem key={p.id} value={p.id}>
											{p.label || p.email || p.id}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</BulkImportPanel>
				</TabsContent>
			</Tabs>
		</div>
	);
}
