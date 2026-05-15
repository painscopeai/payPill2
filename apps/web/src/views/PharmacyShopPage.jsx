import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';
import { Loader2, Minus, Plus, ShoppingCart } from 'lucide-react';

export default function PharmacyShopPage() {
	const [practices, setPractices] = useState([]);
	const [practicesLoading, setPracticesLoading] = useState(true);
	const [selectedOrgId, setSelectedOrgId] = useState('');

	const [catalog, setCatalog] = useState([]);
	const [catalogLoading, setCatalogLoading] = useState(false);

	const [qtyByDrug, setQtyByDrug] = useState({});
	const [submitting, setSubmitting] = useState(false);

	const loadPractices = useCallback(async () => {
		setPracticesLoading(true);
		try {
			const res = await apiServerClient.fetch('/patient/pharmacy/practices');
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load pharmacies');
			setPractices(Array.isArray(body.items) ? body.items : []);
		} catch (e) {
			toast.error(e.message || 'Failed to load');
			setPractices([]);
		} finally {
			setPracticesLoading(false);
		}
	}, []);

	const loadCatalog = useCallback(async (orgId) => {
		if (!orgId) {
			setCatalog([]);
			return;
		}
		setCatalogLoading(true);
		try {
			const res = await apiServerClient.fetch(
				`/patient/pharmacy/catalog?provider_org_id=${encodeURIComponent(orgId)}`,
			);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load catalog');
			setCatalog(Array.isArray(body.items) ? body.items : []);
			setQtyByDrug({});
		} catch (e) {
			toast.error(e.message || 'Failed to load catalog');
			setCatalog([]);
		} finally {
			setCatalogLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadPractices();
	}, [loadPractices]);

	useEffect(() => {
		void loadCatalog(selectedOrgId);
	}, [selectedOrgId, loadCatalog]);

	const cartLines = useMemo(() => {
		return catalog
			.map((item) => {
				const q = qtyByDrug[item.id] || 0;
				return q > 0
					? {
							drug_catalog_id: item.id,
							quantity: q,
							label: item.name,
							unit: Number(item.unit_price) || 0,
							line: Math.round(Number(item.unit_price) * q * 100) / 100,
						}
					: null;
			})
			.filter(Boolean);
	}, [catalog, qtyByDrug]);

	const cartTotal = useMemo(
		() => Math.round(cartLines.reduce((s, l) => s + l.line, 0) * 100) / 100,
		[cartLines],
	);

	const setQty = (drugId, next) => {
		const item = catalog.find((d) => d.id === drugId);
		const max = item ? Number(item.quantity_on_hand) || 0 : 0;
		const q = Math.max(0, Math.min(max, Math.floor(next)));
		setQtyByDrug((prev) => ({ ...prev, [drugId]: q }));
	};

	const checkout = async () => {
		if (!selectedOrgId) {
			toast.error('Select a pharmacy');
			return;
		}
		const lines = cartLines.map(({ drug_catalog_id, quantity }) => ({ drug_catalog_id, quantity }));
		if (!lines.length) {
			toast.error('Add at least one item');
			return;
		}
		setSubmitting(true);
		try {
			const res = await apiServerClient.fetch('/patient/pharmacy/order', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider_org_id: selectedOrgId, lines }),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Order failed');
			toast.success(`Order placed. Invoice ${body.invoice_id?.slice(0, 8) || ''}… Total $${Number(body.amount || 0).toFixed(2)}`);
			setQtyByDrug({});
			await loadCatalog(selectedOrgId);
		} catch (e) {
			toast.error(e.message || 'Order failed');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="space-y-8 max-w-4xl">
			<Helmet>
				<title>Pharmacy shop — PayPill</title>
			</Helmet>
			<div>
				<Button variant="ghost" className="-ml-2 text-muted-foreground mb-2" asChild>
					<Link to="/patient/pharmacy">← Back to pharmacy</Link>
				</Button>
				<h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
					<ShoppingCart className="h-6 w-6 text-teal-600" />
					Pharmacy shop
				</h1>
				<p className="text-sm text-muted-foreground mt-1">Order in-stock medications from a linked pharmacy practice.</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Choose pharmacy</CardTitle>
					<CardDescription>Only practices registered as pharmacies are listed.</CardDescription>
				</CardHeader>
				<CardContent>
					{practicesLoading ? (
						<p className="text-sm text-muted-foreground flex items-center gap-2">
							<Loader2 className="h-4 w-4 animate-spin" /> Loading…
						</p>
					) : (
						<Select value={selectedOrgId || '__none__'} onValueChange={(v) => setSelectedOrgId(v === '__none__' ? '' : v)}>
							<SelectTrigger className="max-w-md">
								<SelectValue placeholder="Select pharmacy" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__none__">Select pharmacy…</SelectItem>
								{practices.map((p) => (
									<SelectItem key={p.id} value={p.id}>
										{p.name}
										{p.address ? ` — ${p.address}` : ''}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				</CardContent>
			</Card>

			{selectedOrgId ? (
				<Card>
					<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
						<div>
							<CardTitle className="text-lg">In-stock items</CardTitle>
							<CardDescription>Prices and availability are set by the pharmacy.</CardDescription>
						</div>
						<div className="text-sm font-medium">
							Cart: ${cartTotal.toFixed(2)}{' '}
							<span className="text-muted-foreground font-normal">({cartLines.length} line(s))</span>
						</div>
					</CardHeader>
					<CardContent>
						{catalogLoading ? (
							<p className="text-sm text-muted-foreground flex items-center gap-2">
								<Loader2 className="h-4 w-4 animate-spin" /> Loading catalog…
							</p>
						) : catalog.length === 0 ? (
							<p className="text-sm text-muted-foreground">No in-stock items available.</p>
						) : (
							<ul className="divide-y rounded-lg border">
								{catalog.map((item) => {
									const q = qtyByDrug[item.id] || 0;
									const unit = Number(item.unit_price) || 0;
									return (
										<li key={item.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
											<div>
												<p className="font-medium">{item.name}</p>
												{item.default_strength ? (
													<p className="text-xs text-muted-foreground">{item.default_strength}</p>
												) : null}
												<p className="text-sm text-muted-foreground mt-0.5">
													${unit.toFixed(2)} each · {item.quantity_on_hand} in stock
												</p>
											</div>
											<div className="flex items-center gap-2">
												<Button
													type="button"
													variant="outline"
													size="icon"
													className="h-8 w-8"
													disabled={q <= 0}
													onClick={() => setQty(item.id, q - 1)}
												>
													<Minus className="h-4 w-4" />
												</Button>
												<span className="w-8 text-center tabular-nums">{q}</span>
												<Button
													type="button"
													variant="outline"
													size="icon"
													className="h-8 w-8"
													disabled={q >= Number(item.quantity_on_hand)}
													onClick={() => setQty(item.id, q + 1)}
												>
													<Plus className="h-4 w-4" />
												</Button>
											</div>
										</li>
									);
								})}
							</ul>
						)}
						<div className="mt-6 flex flex-wrap items-center justify-between gap-4">
							<p className="text-xs text-muted-foreground max-w-xl">
								Checkout creates a draft invoice and reduces pharmacy stock immediately. Payment collection may be handled
								separately with your pharmacy.
							</p>
							<Button
								className="bg-teal-600 hover:bg-teal-700 text-white"
								disabled={submitting || !cartLines.length}
								onClick={() => void checkout()}
							>
								{submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
								Place order (${cartTotal.toFixed(2)})
							</Button>
						</div>
					</CardContent>
				</Card>
			) : null}
		</div>
	);
}
