import Link from 'next/link';

export default function NotFound() {
	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
			<h1 className="font-display text-4xl font-semibold">Page not found</h1>
			<p className="text-muted-foreground">The page you requested does not exist.</p>
			<Link href="/" className="text-primary underline-offset-4 hover:underline">
				Back to home
			</Link>
		</div>
	);
}
