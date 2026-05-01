'use client';

import dynamic from 'next/dynamic';

const LegacyCatchAllInner = dynamic(() => import('./LegacyCatchAllInner'), { ssr: false });

export default function CatchAllPage() {
	return <LegacyCatchAllInner />;
}
