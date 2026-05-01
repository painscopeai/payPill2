import busboy from 'busboy';
import logger from '../utils/logger.js';

export const uploadFiles = ({ maxCount = 5, maxSizeMB = 20, allowedMimeTypes, fieldName }) => {
	return (req, res, next) => {
		const ct = String(req.headers['content-type'] || '');
		if (!ct.toLowerCase().includes('multipart/form-data')) {
			return next();
		}

		const bb = busboy({
			headers: req.headers,
			limits: { files: maxCount, fileSize: maxSizeMB * 1024 * 1024 },
		});

		const files = [];
		const fields = {};
		let uploadError = null;

		bb.on('file', (name, fileStream, info) => {
			if (name !== fieldName) {
				fileStream.resume();
				return;
			}
			if (!allowedMimeTypes.includes(info.mimeType)) {
				fileStream.resume();
				uploadError = new Error(`Invalid file type. Only ${allowedMimeTypes.join(', ')} are allowed.`);
				return;
			}
			const chunks = [];
			fileStream.on('data', (d) => {
				chunks.push(d);
			});
			fileStream.on('limit', () => {
				uploadError = new Error('File too large');
			});
			fileStream.on('end', () => {
				const buffer = Buffer.concat(chunks);
				files.push({
					fieldname: name,
					buffer,
					mimetype: info.mimeType,
					originalname: info.filename || 'upload',
					size: buffer.length,
				});
			});
		});

		bb.on('field', (name, val) => {
			fields[name] = val;
		});

		bb.on('finish', () => {
			if (uploadError) {
				return res.status(400).json({ error: uploadError.message });
			}
			req.body = { ...req.body, ...fields };
			req.files = files;
			next();
		});

		bb.on('error', (err) => {
			logger.warn('[uploadFiles]', err.message);
			if (!res.headersSent) {
				res.status(400).json({ error: err.message || 'Upload failed' });
			}
		});

		req.pipe(bb);
	};
};
