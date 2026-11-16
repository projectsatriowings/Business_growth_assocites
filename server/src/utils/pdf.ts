import PDFDocument from 'pdfkit';
import { Response } from 'express';

export interface QuotationPdfData {
  quotationNumber: string;
  version: number;
  date: string;
  validityDate: string;
  client: {
    clientName: string;
    businessName: string;
    mobile: string;
    email: string;
    location: string;
  };
  bga: {
    name: string;
    email: string;
    mobile: string;
  };
  preparedBy: string;
  serviceCategory: string;
  serviceScope: string;
  serviceFee: number;
  adBudget: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  advanceRequiredPercent: number;
  advanceRequiredAmount: number;
  paymentTerms: string;
  company: {
    name: string;
    email: string;
    phone: string;
    address: string;
    gstin: string;
  };
}

export function generateQuotationPdf(data: QuotationPdfData, res: Response) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="Quotation-${data.quotationNumber}-v${data.version}.pdf"`
  );

  doc.pipe(res);

  // Header
  doc
    .fillColor('#1e293b')
    .fontSize(20)
    .font('Helvetica-Bold')
    .text(data.company.name, 50, 45);

  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#64748b')
    .text(`${data.company.address} | Phone: ${data.company.phone}`, 50, 70)
    .text(`Email: ${data.company.email} | GSTIN: ${data.company.gstin}`, 50, 83);

  // Line
  doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, 105).lineTo(550, 105).stroke();

  // Quotation Title & Number
  doc
    .fillColor('#0f172a')
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('OFFICIAL COMMERCIAL QUOTATION', 50, 120);

  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#475569')
    .text(`Quotation No: `, 50, 142)
    .font('Helvetica-Bold')
    .text(`${data.quotationNumber} (v${data.version})`, 130, 142)
    .font('Helvetica')
    .text(`Date of Issue: ${data.date}`, 380, 142)
    .text(`Valid Until: ${data.validityDate}`, 380, 156);

  // Client Details & BGA
  const boxTop = 180;
  doc
    .rect(50, boxTop, 240, 95)
    .fillAndStroke('#f8fafc', '#e2e8f0');

  doc
    .rect(305, boxTop, 245, 95)
    .fillAndStroke('#f8fafc', '#e2e8f0');

  // Client Text
  doc
    .fillColor('#0f172a')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('CLIENT DETAILS', 60, boxTop + 10)
    .font('Helvetica')
    .fontSize(9)
    .text(`Name: ${data.client.clientName}`, 60, boxTop + 26)
    .text(`Company: ${data.client.businessName}`, 60, boxTop + 40)
    .text(`Phone: ${data.client.mobile}`, 60, boxTop + 54)
    .text(`Email: ${data.client.email}`, 60, boxTop + 68)
    .text(`Location: ${data.client.location}`, 60, boxTop + 82);

  // BGA text
  doc
    .fillColor('#0f172a')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('BUSINESS GROWTH ASSOCIATE', 315, boxTop + 10)
    .font('Helvetica')
    .fontSize(9)
    .text(`Associate: ${data.bga.name}`, 315, boxTop + 26)
    .text(`Email: ${data.bga.email}`, 315, boxTop + 40)
    .text(`Mobile: ${data.bga.mobile}`, 315, boxTop + 54)
    .text(`Prepared By: ${data.preparedBy}`, 315, boxTop + 68);

  // Scope of Work
  const scopeTop = 295;
  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .fillColor('#1e293b')
    .text(`Scope of Work: ${data.serviceCategory.replace(/_/g, ' ')}`, 50, scopeTop);

  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#334155')
    .text(data.serviceScope, 50, scopeTop + 18, { width: 500, align: 'justify' });

  // Commercial Table
  const tableTop = 410;
  doc
    .rect(50, tableTop, 500, 22)
    .fill('#0f172a');

  doc
    .fillColor('#ffffff')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('DESCRIPTION / COMPONENT', 60, tableTop + 6)
    .text('AMOUNT (INR)', 440, tableTop + 6, { align: 'right', width: 95 });

  let curY = tableTop + 30;

  const addRow = (label: string, amount: number, isBold: boolean = false) => {
    doc
      .fillColor('#1e293b')
      .fontSize(9)
      .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
      .text(label, 60, curY)
      .text(`Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 440, curY, {
        align: 'right',
        width: 95,
      });
    curY += 18;
  };

  addRow('Base Professional Service Fee', data.serviceFee);

  if (data.adBudget > 0) {
    addRow('Monthly Advertisement Budget (Excluded from service commission)', data.adBudget);
  }

  if (data.discount > 0) {
    addRow('Promotional Discount', -data.discount);
  }

  addRow(`Goods & Services Tax (GST ${data.taxRate}%)`, data.taxAmount);

  // Divider
  doc.strokeColor('#0f172a').lineWidth(1.5).moveTo(50, curY + 4).lineTo(550, curY + 4).stroke();
  curY += 12;

  // Total
  doc
    .rect(50, curY - 4, 500, 24)
    .fill('#f1f5f9');

  doc
    .fillColor('#0f172a')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('TOTAL CONTRACT VALUE', 60, curY + 3)
    .text(`Rs. ${data.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 440, curY + 3, {
      align: 'right',
      width: 95,
    });

  curY += 35;

  // Advance Payment Box
  doc
    .rect(50, curY, 500, 36)
    .fillAndStroke('#eff6ff', '#bfdbfe');

  doc
    .fillColor('#1e40af')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text(`Mandatory Advance Payment (${data.advanceRequiredPercent}%):`, 60, curY + 8)
    .text(
      `Rs. ${data.advanceRequiredAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      350,
      curY + 8,
      { align: 'right', width: 185 }
    );

  doc
    .font('Helvetica')
    .fontSize(8)
    .text('* Technical project kick-off starts only upon verified receipt of advance payment.', 60, curY + 22);

  curY += 50;

  // Payment Terms
  doc
    .fillColor('#0f172a')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Payment Terms & Conditions:', 50, curY);

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#475569')
    .text(data.paymentTerms, 50, curY + 14, { width: 500 });

  // Signatures
  const sigY = 680;
  doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, sigY).lineTo(200, sigY).stroke();
  doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(400, sigY).lineTo(550, sigY).stroke();

  doc
    .fontSize(8)
    .fillColor('#64748b')
    .text('Authorized Signatory (Accounts)', 50, sigY + 5)
    .text('Client Acceptance Signature / Seal', 380, sigY + 5, { align: 'right', width: 170 });

  doc.end();
}
