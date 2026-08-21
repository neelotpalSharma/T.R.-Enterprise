import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, StoreSettings } from '../types';

// Helper to format Indian currency with standard grouping and clean ASCII Rs. prefix
export function formatINR(amount: number): string {
  const num = Number(amount || 0);
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const parts = absNum.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian number grouping: last 3 digits, then 2-digit groups
  const lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }
  return `${isNegative ? '-' : ''}Rs. ${integerPart}.${decimalPart}`;
}

// Helper to convert number to words for Indian Rupees
function numberToWords(num: number): string {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.floor(num);
  if (n === 0) return 'Zero Rupees Only';

  const inWords = (n: number): string => {
    let str = '';
    if (n > 9999999) {
      str += inWords(Math.floor(n / 10000000)) + 'Crore ';
      n %= 10000000;
    }
    if (n > 99999) {
      str += inWords(Math.floor(n / 100000)) + 'Lakh ';
      n %= 100000;
    }
    if (n > 999) {
      str += inWords(Math.floor(n / 1000)) + 'Thousand ';
      n %= 1000;
    }
    if (n > 99) {
      str += inWords(Math.floor(n / 100)) + 'Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) {
        str += a[n];
      } else {
        str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
      }
    }
    return str;
  };

  return (inWords(n).trim() + ' Rupees Only').replace(/\s+/g, ' ');
}

export function generateInvoicePDF(invoice: Invoice, settings: StoreSettings) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 15;

  // Header Banner Background
  doc.setFillColor(24, 43, 73); // Deep Berger Navy Blue #182B49
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Accent Line (Berger Orange)
  doc.setFillColor(234, 88, 12); // #EA580C Berger Orange
  doc.rect(0, 38, pageWidth, 2.5, 'F');

  // Business Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(settings.businessName.toUpperCase(), 14, 16);

  // Tagline & Dealer Badge
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(226, 232, 240);
  doc.text(settings.tagline, 14, 21.5);
  doc.text(settings.dealerFor, 14, 26);
  doc.text(`GST No. ${settings.gstin || '18ANOPT3702B1Z1'} | Phn No. ${settings.phone || '7002006152'} | Mail ID: ${settings.email || 'prachir.thakuria.pt@gmail.com'}`, 14, 31.5);

  // Right-aligned Tax Invoice Badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('TAX INVOICE', pageWidth - 14, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, pageWidth - 14, 25, { align: 'right' });
  doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageWidth - 14, 30, { align: 'right' });

  currentY = 48;

  // Two-column Info Card (Store info / Customer info)
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, (pageWidth - 32) / 2, 34, 2, 2, 'FD');
  doc.roundedRect(14 + (pageWidth - 32) / 2 + 4, currentY, (pageWidth - 32) / 2, 34, 2, 2, 'FD');

  // Left Box: Supplier Details
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('SUPPLIER / STORE DETAILS', 18, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(settings.businessName || 'T. R. Enterprise', 18, currentY + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`GST No. ${settings.gstin || '18ANOPT3702B1Z1'} | Phn No. ${settings.phone || '7002006152'}`, 18, currentY + 16.5);
  const fullAddress = `${settings.address || 'Kahikuchi, Ganakpara, SOS Road'}, ${settings.city || 'Kamrup (M)'}, ${settings.state || 'Assam'} - PIN: ${settings.pincode || '781017'}`;
  doc.text(fullAddress, 18, currentY + 21, { maxWidth: 75 });
  doc.text(`Mail ID: ${settings.email || 'prachir.thakuria.pt@gmail.com'}`, 18, currentY + 29);

  // Right Box: Customer Billed To
  const rightBoxX = 14 + (pageWidth - 32) / 2 + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('BILLED TO (CUSTOMER)', rightBoxX, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.customerName, rightBoxX, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Phone: ${invoice.customerPhone}`, rightBoxX, currentY + 17);
  if (invoice.customerAddress) {
    doc.text(`Address: ${invoice.customerAddress}`, rightBoxX, currentY + 22, { maxWidth: 78 });
  }
  if (invoice.customerGst) {
    doc.text(`Customer GST: ${invoice.customerGst}`, rightBoxX, currentY + 29);
  }

  currentY += 40;

  // Calculate standard GST breakdown with explicit discount support
  const rawSubtotal = invoice.subtotal || invoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const discountAmount = invoice.discountAmount || 0;
  const taxableGrandAmount = Math.max(0, rawSubtotal - discountAmount);

  const effectiveTaxPercent = invoice.taxPercent || 18;
  const halfTaxPercent = effectiveTaxPercent / 2; // e.g. 9.00%
  const cgstAmount = +(taxableGrandAmount * (halfTaxPercent / 100)).toFixed(2);
  const sgstAmount = +(taxableGrandAmount * (halfTaxPercent / 100)).toFixed(2);
  const unroundedTotal = taxableGrandAmount + cgstAmount + sgstAmount;
  const roundedGrandTotal = Math.round(unroundedTotal);
  const roundOff = +(roundedGrandTotal - unroundedTotal).toFixed(2);

  // Invoice Items Table matching the uploaded bill format: HSN | UNITS | RATE | AMOUNT
  const tableData = invoice.items.map((item, index) => {
    const effectiveRate = item.unitPrice * (1 - (item.discountPercent || 0) / 100);
    const itemAmount = item.quantity * effectiveRate;
    return [
      (index + 1).toString(),
      `${item.name}${item.packSize ? ` (${item.packSize})` : ''}`,
      item.hsn || item.sku || '-',
      `${item.quantity}`,
      effectiveRate.toFixed(2),
      itemAmount.toFixed(2)
    ];
  });

  // Table summary subtotal row
  tableData.push([
    '',
    'Gross Subtotal',
    '',
    '',
    '',
    rawSubtotal.toFixed(2)
  ]);

  if (discountAmount > 0) {
    tableData.push([
      '',
      'Less: Discount Applied',
      '',
      '',
      '',
      `-${discountAmount.toFixed(2)}`
    ]);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Description of Goods', 'HSN', 'Units', 'Rate (Rs)', 'Amount (Rs)']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [24, 43, 73],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 76, halign: 'left' },
      2: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      // Ensure header cell alignment exactly matches the data column alignment
      if (data.section === 'head') {
        if (data.column.index === 0 || data.column.index === 2 || data.column.index === 3) {
          data.cell.styles.halign = 'center';
        } else if (data.column.index === 4 || data.column.index === 5) {
          data.cell.styles.halign = 'right';
        } else {
          data.cell.styles.halign = 'left';
        }
      }
      // Style the total row at bottom of table
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.8,
      textColor: [30, 41, 59],
      valign: 'middle'
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255]
    },
    margin: { left: 14, right: 14 }
  });

  const finalY = (doc as any).lastAutoTable.finalY || currentY + 60;

  // Totals & Breakdown matching GST standard format:
  const hasDiscount = discountAmount > 0;
  const summaryBoxY = finalY + 6;
  const summaryBoxWidth = 88;
  const summaryBoxHeight = hasDiscount ? 56 : 48;
  const summaryBoxX = pageWidth - 14 - summaryBoxWidth;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(summaryBoxX, summaryBoxY, summaryBoxWidth, summaryBoxHeight, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  let currentSummaryLineY = summaryBoxY + 7.5;

  if (hasDiscount) {
    // 1. Gross Subtotal
    doc.setFont('helvetica', 'normal');
    doc.text('Gross Subtotal', summaryBoxX + 5, currentSummaryLineY);
    doc.setFont('helvetica', 'bold');
    doc.text(rawSubtotal.toFixed(2), summaryBoxX + summaryBoxWidth - 5, currentSummaryLineY, { align: 'right' });
    currentSummaryLineY += 6;

    // 2. Discount Applied
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(22, 101, 52); // Dark emerald green
    doc.text('Discount Applied', summaryBoxX + 5, currentSummaryLineY);
    doc.setFont('helvetica', 'bold');
    doc.text(`-${discountAmount.toFixed(2)}`, summaryBoxX + summaryBoxWidth - 5, currentSummaryLineY, { align: 'right' });
    doc.setTextColor(30, 41, 59);
    currentSummaryLineY += 6;

    // 3. Taxable Amount
    doc.setFont('helvetica', 'normal');
    doc.text('Taxable Amount', summaryBoxX + 5, currentSummaryLineY);
    doc.setFont('helvetica', 'bold');
    doc.text(taxableGrandAmount.toFixed(2), summaryBoxX + summaryBoxWidth - 5, currentSummaryLineY, { align: 'right' });
    currentSummaryLineY += 6;
  } else {
    // 1. Grand Amount (Taxable)
    doc.setFont('helvetica', 'normal');
    doc.text('Grand Amount', summaryBoxX + 5, currentSummaryLineY);
    doc.setFont('helvetica', 'bold');
    doc.text(taxableGrandAmount.toFixed(2), summaryBoxX + summaryBoxWidth - 5, currentSummaryLineY, { align: 'right' });
    currentSummaryLineY += 7;
  }

  // CGST
  doc.setFont('helvetica', 'normal');
  doc.text(`CGST ${halfTaxPercent.toFixed(2)}%`, summaryBoxX + 5, currentSummaryLineY);
  doc.setFont('helvetica', 'bold');
  doc.text(cgstAmount.toFixed(2), summaryBoxX + summaryBoxWidth - 5, currentSummaryLineY, { align: 'right' });
  currentSummaryLineY += hasDiscount ? 6 : 7;

  // SGST
  doc.setFont('helvetica', 'normal');
  doc.text(`SGST ${halfTaxPercent.toFixed(2)}%`, summaryBoxX + 5, currentSummaryLineY);
  doc.setFont('helvetica', 'bold');
  doc.text(sgstAmount.toFixed(2), summaryBoxX + summaryBoxWidth - 5, currentSummaryLineY, { align: 'right' });
  currentSummaryLineY += hasDiscount ? 6 : 7;

  // ROUND OFF
  doc.setFont('helvetica', 'normal');
  doc.text('ROUND OFF', summaryBoxX + 5, currentSummaryLineY);
  doc.setFont('helvetica', 'bold');
  const roundOffStr = roundOff < 0 
    ? `(- ${Math.abs(roundOff).toFixed(2)})` 
    : roundOff > 0 
      ? `(+ ${roundOff.toFixed(2)})` 
      : '0.00';
  doc.text(roundOffStr, summaryBoxX + summaryBoxWidth - 5, currentSummaryLineY, { align: 'right' });
  currentSummaryLineY += 4;

  // Divider inside summary box
  doc.setDrawColor(203, 213, 225);
  doc.line(summaryBoxX + 3, currentSummaryLineY, summaryBoxX + summaryBoxWidth - 3, currentSummaryLineY);

  // GRAND TOTAL (Dark Banner)
  doc.setFillColor(24, 43, 73);
  doc.roundedRect(summaryBoxX + 2.5, currentSummaryLineY + 2, summaryBoxWidth - 5, 10, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('GRAND TOTAL', summaryBoxX + 5.5, currentSummaryLineY + 8.5);
  doc.text(`${roundedGrandTotal}/-`, summaryBoxX + summaryBoxWidth - 5.5, currentSummaryLineY + 8.5, { align: 'right' });

  // Amount in words & Bank info (Left side of totals)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  doc.text('Amount in Words:', 14, summaryBoxY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(numberToWords(invoice.totalAmount), 14, summaryBoxY + 11, { maxWidth: summaryBoxX - 20 });

  // Payment Details Badge
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, summaryBoxY + 14, summaryBoxX - 18, 30, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('PAYMENT & BANK DETAILS', 18, summaryBoxY + 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`Payment Mode: ${invoice.paymentMode}  |  Status: ${invoice.paymentStatus.toUpperCase()}`, 18, summaryBoxY + 24);
  doc.text(`Bank Name: ${settings.bankName || 'UCO Bank'}  |  Account Name: ${settings.accountName || 'T R ENTERPRISE'}`, 18, summaryBoxY + 28.5);
  doc.text(`Account Number: ${settings.accountNumber || '10390210001868'}  |  IFSC Code: ${settings.ifscCode || 'UCBA0001039'}`, 18, summaryBoxY + 33);
  doc.text(`UPI ID: ${settings.upiId || '10390210001868@ucobank'}`, 18, summaryBoxY + 37.5);

  // Footer & Signatures
  const footerY = Math.max(summaryBoxY + 48, 250);

  // Terms & Conditions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('TERMS & CONDITIONS:', 14, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(settings.termsAndConditions, 14, footerY + 4, { maxWidth: 110 });

  // Authorized Signatory
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(`For ${settings.businessName.toUpperCase()}`, pageWidth - 14, footerY + 4, { align: 'right' });

  doc.setDrawColor(148, 163, 184);
  doc.line(pageWidth - 65, footerY + 18, pageWidth - 14, footerY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Signatory / Counter Seal', pageWidth - 14, footerY + 22, { align: 'right' });

  // Bottom Center Watermark / Powered by
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('This is a computer-generated tax invoice generated by T R Enterprise Retail Suite.', pageWidth / 2, 288, { align: 'center' });

  // Save the PDF
  doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
}

