import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
	reactStrictMode: true,
	outputFileTracingRoot: path.join(__dirname, '../..'),
	serverExternalPackages: [
		'express',
		'cors',
		'helmet',
		'morgan',
		'multer',
		'express-rate-limit',
		'jsonwebtoken',
		'pdf-parse',
		'pdfkit',
		'mammoth',
		'csv-parse',
		'axios',
		'pocketbase',
	],
};

export default nextConfig;
