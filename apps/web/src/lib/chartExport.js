function safeFilename(name) {
  return String(name || 'chart')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function exportChartElementAsPng(element, filename) {
  if (!element) throw new Error('Chart container not found');
  const svg = element.querySelector('svg');
  if (!svg) throw new Error('No chart SVG found to export');

  const rect = element.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width || Number(svg.getAttribute('width')) || 1200));
  const height = Math.max(1, Math.round(rect.height || Number(svg.getAttribute('height')) || 700));

  const serialized = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not available'));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((outBlob) => {
          if (!outBlob) return reject(new Error('Could not render chart image'));
          const outUrl = URL.createObjectURL(outBlob);
          const a = document.createElement('a');
          a.href = outUrl;
          a.download = `${safeFilename(filename)}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(outUrl);
          resolve();
        }, 'image/png');
      };
      img.onerror = () => reject(new Error('Failed to load chart SVG'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
