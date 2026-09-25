import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function generatePredictionPDF(inputs: number[], result: string, confidence: number) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('Echo-Guard: Sonar Prediction Report', 14, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
  
  // Result Box
  doc.setDrawColor(203, 213, 225); // slate-200
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(14, 40, 182, 30, 3, 3, 'FD');
  
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('Classification Result:', 20, 52);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  if (result === 'ROCK') {
    doc.setTextColor(13, 148, 136); // teal-600
  } else {
    doc.setTextColor(220, 38, 38); // red-600
  }
  doc.text(`${result} (${(confidence * 100).toFixed(1)}% Confidence)`, 70, 52);
  
  // Inputs Table
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.text('Input Feature Signatures (60 Frequencies):', 14, 85);
  
  const tableData = [];
  // Format as 10 rows of 6 columns for compact display
  for (let i = 0; i < 60; i += 6) {
    tableData.push([
      `F${i+1}: ${inputs[i]?.toFixed(4) || '0.0000'}`,
      `F${i+2}: ${inputs[i+1]?.toFixed(4) || '0.0000'}`,
      `F${i+3}: ${inputs[i+2]?.toFixed(4) || '0.0000'}`,
      `F${i+4}: ${inputs[i+3]?.toFixed(4) || '0.0000'}`,
      `F${i+5}: ${inputs[i+4]?.toFixed(4) || '0.0000'}`,
      `F${i+6}: ${inputs[i+5]?.toFixed(4) || '0.0000'}`,
    ]);
  }
  
  // @ts-ignore
  doc.autoTable({
    startY: 92,
    head: [],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [71, 85, 105] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(`EchoGuard_Report_${Date.now()}.pdf`);
}
