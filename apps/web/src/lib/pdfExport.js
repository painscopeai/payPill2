import jsPDF from 'jspdf';

export const exportToPDF = (data, filename, title = 'Report') => {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  
  let y = 30;
  data.forEach((item, index) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    const text = Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(' | ');
    doc.text(text, 14, y);
    y += 10;
  });
  
  doc.save(`${filename}.pdf`);
};