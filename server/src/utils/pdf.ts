import PDFKit from 'pdfkit';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Response } from 'express';
import fs from 'fs';
import path from 'path';

export interface QuotationLineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

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
    headOffice?: string;
    gstin: string;
    pan?: string;
    cin?: string;
    website?: string;
  };
  lineItems?: QuotationLineItem[];
}

/**
 * Formats numbers into standard Indian currency representation with comma grouping.
 * Example: 150000 -> "₹ 1,50,000.00"
 */
export function formatIndianCurrency(amount: number): string {
  const parts = Math.abs(amount).toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }
  const sign = amount < 0 ? '-' : '';
  return `${sign}₹ ${integerPart}.${decimalPart}`;
}

/**
 * Formats Date or ISO string to DD/MM/YYYY
 */
export function formatDisplayDate(d: string | Date): string {
  try {
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dateObj.getTime())) return String(d);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(d);
  }
}

/**
 * Formats Service Category enum into polished human-readable title
 */
export function formatServiceCategoryTitle(cat: string): string {
  const map: Record<string, string> = {
    WEBSITE_DEVELOPMENT: 'Website Development & Web Applications',
    MOBILE_APP_DEVELOPMENT: 'Mobile Application Engineering (iOS & Android)',
    SOFTWARE_DEVELOPMENT: 'Custom Software & Enterprise Cloud Systems',
    DIGITAL_MARKETING: 'Digital Marketing & Growth Campaigns (Monthly Retainer)',
  };
  return map[cat] || cat.replace(/_/g, ' ');
}

function findAssetPath(subpath: string): string {
  const candidates = [
    path.resolve(__dirname, '../assets', subpath),
    path.resolve(__dirname, '../../assets', subpath),
    path.resolve(process.cwd(), 'assets', subpath),
    path.resolve(process.cwd(), 'server/assets', subpath),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

/**
 * Returns the absolute secure file path for an archived quotation PDF version
 */
export function getQuotationStoragePath(quotationNumber: string, version: number): string {
  const storageDir = path.resolve(__dirname, '../../storage/quotations');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
  const safeNumber = quotationNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(storageDir, `Quotation-${safeNumber}-v${version}.pdf`);
}

/**
 * Core PDF generation engine:
 * 1. Generates pixel-perfect quotation content with PDFKit inside letterhead-safe bounds.
 * 2. Uses pdf-lib to composite the official Atriowings letterhead artwork as vector underlay on all pages.
 * 3. Adds page numbers in the safe footer zone.
 */
export async function generateQuotationPdfBuffer(data: QuotationPdfData): Promise<Buffer> {
  const kitDoc = new PDFKit({
    size: 'A4',
    margins: { top: 125, bottom: 90, left: 45, right: 45 },
    autoFirstPage: true,
  });

  // Attempt to load embedded Arial fonts from server/assets/fonts/
  const fontPath = findAssetPath('fonts/Arial.ttf');
  const fontBoldPath = findAssetPath('fonts/Arial-Bold.ttf');
  const hasCustomFont = fs.existsSync(fontPath) && fs.existsSync(fontBoldPath);

  if (hasCustomFont) {
    kitDoc.registerFont('CustomFont', fontPath);
    kitDoc.registerFont('CustomFont-Bold', fontBoldPath);
  }

  const regularFont = hasCustomFont ? 'CustomFont' : 'Helvetica';
  const boldFont = hasCustomFont ? 'CustomFont-Bold' : 'Helvetica-Bold';

  const chunks: Buffer[] = [];
  kitDoc.on('data', (chunk) => chunks.push(chunk));

  // --- HEADER SECTION (Y: 125 to 195) ---
  // Left: BUSINESS QUOTATION (Matching sample visual hierarchy)
  kitDoc.font(boldFont).fontSize(24).fillColor('#0f172a').text('BUSINESS', 45, 125);
  kitDoc.font(boldFont).fontSize(24).fillColor('#119DA4').text('QUOTATION', 45, 150);
  kitDoc.font(boldFont).fontSize(7.5).fillColor('#64748b').text('OFFICIAL COMMERCIAL PROPOSAL • BGA ENTERPRISE', 45, 178);

  // Right: Quote Meta Badge
  const metaX = 355;
  const metaY = 125;
  const metaW = 195;
  const metaH = 58;

  kitDoc.roundedRect(metaX, metaY, metaW, metaH, 6).fillAndStroke('#f8fafc', '#e2e8f0');

  const printMetaRow = (label: string, val: string, yOff: number, isTeal: boolean = false) => {
    kitDoc.font(regularFont).fontSize(8.5).fillColor('#64748b').text(label, metaX + 12, metaY + yOff);
    kitDoc
      .font(boldFont)
      .fontSize(8.5)
      .fillColor(isTeal ? '#119DA4' : '#0f172a')
      .text(val, metaX + 80, metaY + yOff, { width: 105, align: 'right' });
  };

  printMetaRow('Quote No:', `${data.quotationNumber} (v${data.version})`, 10, false);
  printMetaRow('Date:', formatDisplayDate(data.date), 26, false);
  printMetaRow('Valid Until:', formatDisplayDate(data.validityDate), 42, true);

  // --- TWO COLUMN PARTY INFO (Y: 198 to 275) ---
  const partyY = 198;
  const colW = 245;

  // Left: Atriowings Details
  kitDoc.font(boldFont).fontSize(9.5).fillColor('#0f172a').text('ATRIOWINGS TECHNOLOGIES', 45, partyY);
  kitDoc.strokeColor('#119DA4').lineWidth(1.5).moveTo(45, partyY + 13).lineTo(135, partyY + 13).stroke();

  kitDoc.font(boldFont).fontSize(8).fillColor('#1e293b').text(data.company.name || 'Atriowings Technologies India Private Limited', 45, partyY + 18);
  kitDoc
    .font(regularFont)
    .fontSize(8)
    .fillColor('#475569')
    .text(data.company.address || 'No. 1, Gurudev Complex, 57th St, Korattur, Chennai - 600080', 45, partyY + 29, { width: colW })
    .text(`Phone: ${data.company.phone || '+91 8825948859'}  |  Email: ${data.company.email || 'info@atriowings.in'}`, 45, partyY + 49)
    .text(`GSTIN: ${data.company.gstin || '33AASCA7189D1ZD'}  |  Web: ${data.company.website || 'https://atriowings.in'}`, 45, partyY + 60);

  // Right: Prepared For Client
  const rightX = 305;
  kitDoc.font(boldFont).fontSize(9.5).fillColor('#0f172a').text('PREPARED FOR', rightX, partyY);
  kitDoc.strokeColor('#119DA4').lineWidth(1.5).moveTo(rightX, partyY + 13).lineTo(rightX + 85, partyY + 13).stroke();

  kitDoc.font(boldFont).fontSize(8.5).fillColor('#0f172a').text(data.client.businessName || data.client.clientName, rightX, partyY + 18);
  kitDoc
    .font(regularFont)
    .fontSize(8)
    .fillColor('#334155')
    .text(`Attn: ${data.client.clientName}`, rightX, partyY + 29)
    .text(data.client.location || 'Location Not Specified', rightX, partyY + 39, { width: colW })
    .text(`${data.client.mobile}  |  ${data.client.email}`, rightX, partyY + 49);
  kitDoc
    .font(boldFont)
    .fontSize(8)
    .fillColor('#3066BE')
    .text(`Growth Associate: ${data.bga.name} (${data.bga.mobile})`, rightX, partyY + 60);

  // Divider
  kitDoc.strokeColor('#e2e8f0').lineWidth(0.8).moveTo(45, 276).lineTo(550, 276).stroke();

  // --- SERVICE SCOPE SUMMARY BOX (Y: 284) ---
  const scopeY = 284;
  const scopeTitle = `SERVICE SPECIFICATION: ${formatServiceCategoryTitle(data.serviceCategory).toUpperCase()}`;
  const scopeText = data.serviceScope || 'Standard commercial and engineering scope as agreed upon between client and Atriowings Technologies.';
  
  // Calculate dynamic height for scope text
  kitDoc.font(regularFont).fontSize(7.8);
  const scopeTextH = kitDoc.heightOfString(scopeText, { width: 485, lineGap: 1.5 });
  const scopeBoxH = Math.min(Math.max(45, scopeTextH + 26), 95);

  kitDoc.roundedRect(45, scopeY, 505, scopeBoxH, 5).fillAndStroke('#f8fafc', '#e2e8f0');

  kitDoc.font(boldFont).fontSize(8).fillColor('#119DA4').text(scopeTitle, 55, scopeY + 7);
  kitDoc.font(regularFont).fontSize(7.8).fillColor('#334155').text(scopeText, 55, scopeY + 19, {
    width: 485,
    lineGap: 1.5,
    height: scopeBoxH - 24,
    ellipsis: true,
  });

  // --- TABLE SECTION ---
  let curY = scopeY + scopeBoxH + 12;

  const drawTableHeader = (yPos: number) => {
    kitDoc.roundedRect(45, yPos, 505, 22, 4).fill('#119DA4');
    kitDoc
      .font(boldFont)
      .fontSize(8.5)
      .fillColor('#ffffff')
      .text('DESCRIPTION', 55, yPos + 6)
      .text('QTY', 310, yPos + 6, { width: 40, align: 'center' })
      .text('RATE (INR)', 360, yPos + 6, { width: 85, align: 'right' })
      .text('TOTAL (INR)', 450, yPos + 6, { width: 90, align: 'right' });
  };

  drawTableHeader(curY);
  curY += 22;

  // Prepare line items
  const items: QuotationLineItem[] =
    data.lineItems && data.lineItems.length > 0
      ? data.lineItems
      : [
          {
            description: `${formatServiceCategoryTitle(data.serviceCategory)} — Core Implementation & Architecture`,
            quantity: 1,
            rate: data.serviceFee,
            amount: data.serviceFee,
          },
          ...(data.adBudget > 0
            ? [
                {
                  description: 'Monthly Platform Advertising & Media Spend Budget (Platform Ad Spend)',
                  quantity: 1,
                  rate: data.adBudget,
                  amount: data.adBudget,
                },
              ]
            : []),
        ];

  // Render Table Rows with dynamic height
  items.forEach((item, idx) => {
    kitDoc.font(boldFont).fontSize(8);
    const textH = kitDoc.heightOfString(item.description, { width: 250 });
    const rowH = Math.max(26, textH + 14);

    if (curY + rowH > 700) {
      kitDoc.addPage({ margins: { top: 125, bottom: 90, left: 45, right: 45 } });
      curY = 135;
      drawTableHeader(curY);
      curY += 22;
    }

    const bg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
    kitDoc.rect(45, curY, 505, rowH).fill(bg);
    kitDoc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(45, curY + rowH).lineTo(550, curY + rowH).stroke();

    kitDoc.font(boldFont).fontSize(8).fillColor('#1e293b').text(item.description, 55, curY + 7, { width: 250 });
    kitDoc.font(regularFont).fontSize(8).fillColor('#475569').text(String(item.quantity), 310, curY + 7, { width: 40, align: 'center' });
    kitDoc.font(regularFont).fontSize(8).fillColor('#475569').text(formatIndianCurrency(item.rate), 360, curY + 7, { width: 85, align: 'right' });
    kitDoc.font(boldFont).fontSize(8).fillColor('#0f172a').text(formatIndianCurrency(item.amount), 450, curY + 7, { width: 90, align: 'right' });

    curY += rowH;
  });

  // --- COMMERCIAL TOTALS BLOCK ---
  // Ensure enough room on current page for Totals + Signatures; if not, wrap cleanly
  if (curY + 140 > 700) {
    kitDoc.addPage({ margins: { top: 125, bottom: 90, left: 45, right: 45 } });
    curY = 135;
  }

  const subtotal = data.serviceFee + data.adBudget;
  const taxable = Math.max(0, subtotal - data.discount);
  const tax = data.taxAmount;
  const grandTotal = data.totalAmount;
  const advance = data.advanceRequiredAmount;
  const balance = Math.max(0, grandTotal - advance);

  const totW = 215;
  const totX = 335;
  curY += 8;

  const printTotRow = (lbl: string, val: string, isDisc: boolean = false, isBold: boolean = false) => {
    kitDoc.font(isBold ? boldFont : regularFont).fontSize(8).fillColor('#475569').text(lbl, totX, curY);
    kitDoc.font(boldFont).fontSize(8.5).fillColor(isDisc ? '#10b981' : '#0f172a').text(val, totX + 90, curY, { width: 125, align: 'right' });
    curY += 15;
  };

  printTotRow('SUBTOTAL', formatIndianCurrency(subtotal), false, false);
  if (data.discount > 0) {
    printTotRow('PROMO DISCOUNT', '-' + formatIndianCurrency(data.discount), true, false);
  }
  printTotRow(`GST (${data.taxRate}% TAX)`, formatIndianCurrency(tax), false, false);

  // Grand Total Teal Box (Matching sample layout)
  kitDoc.roundedRect(totX - 5, curY - 2, totW + 5, 24, 4).fill('#119DA4');
  kitDoc.font(boldFont).fontSize(9).fillColor('#ffffff').text('TOTAL CONTRACT', totX + 5, curY + 5);
  kitDoc.font(boldFont).fontSize(9.5).fillColor('#ffffff').text(formatIndianCurrency(grandTotal), totX + 80, curY + 4, { width: 135, align: 'right' });
  curY += 28;

  // Advance & Balance Row
  kitDoc.roundedRect(totX - 5, curY - 2, totW + 5, 34, 4).fillAndStroke('#f0fdfa', '#ccfbf1');
  kitDoc.font(boldFont).fontSize(7.5).fillColor('#0f766e').text(`MANDATORY ADVANCE (${data.advanceRequiredPercent}%):`, totX + 5, curY + 3);
  kitDoc.font(boldFont).fontSize(8.5).fillColor('#0f766e').text(formatIndianCurrency(advance), totX + 90, curY + 2, { width: 125, align: 'right' });

  kitDoc.font(boldFont).fontSize(7.5).fillColor('#475569').text('BALANCE DUE ON COMPLETION:', totX + 5, curY + 18);
  kitDoc.font(boldFont).fontSize(8.5).fillColor('#475569').text(formatIndianCurrency(balance), totX + 90, curY + 17, { width: 125, align: 'right' });

  // --- TERMS & CONDITIONS & SIGNATURE ---
  let footerY = Math.max(curY + 22, 625);
  if (footerY + 90 > 740) {
    kitDoc.addPage({ margins: { top: 125, bottom: 90, left: 45, right: 45 } });
    footerY = 135;
  }

  kitDoc.strokeColor('#e2e8f0').lineWidth(0.8).moveTo(45, footerY).lineTo(550, footerY).stroke();

  // Left: Terms & Conditions
  const termsY = footerY + 8;
  kitDoc.font(boldFont).fontSize(8.5).fillColor('#0f172a').text('TERMS & CONDITIONS', 45, termsY);
  kitDoc
    .font(regularFont)
    .fontSize(7.2)
    .fillColor('#475569')
    .text(`1. Validity: This commercial quotation is valid until ${formatDisplayDate(data.validityDate)} from the date of issue.`, 45, termsY + 12, { width: 295 })
    .text('2. Mobilization: Engineering kick-off commences within 2 business days of verified advance payment receipt.', 45, termsY + 22, { width: 295 })
    .text(`3. Payment Milestones: ${data.advanceRequiredPercent}% mobilization advance, remaining balance upon verified milestone delivery.`, 45, termsY + 32, { width: 295 })
    .text('4. Account Details: Direct bank transfers to Atriowings Technologies India Private Limited (HDFC Bank).', 45, termsY + 42, { width: 295 });

  kitDoc.font(boldFont).fontSize(8).fillColor('#119DA4').text('Thank you for choosing Atriowings Technologies.', 45, termsY + 56, { width: 295 });

  // Right: Authorized Signatory
  const sigX = 365;
  kitDoc.font(boldFont).fontSize(8.5).fillColor('#0f172a').text('AUTHORIZED SIGNATORY', sigX, termsY);
  // Signature Line placed with ample clearance
  kitDoc.strokeColor('#cbd5e1').lineWidth(0.8).moveTo(sigX, termsY + 36).lineTo(540, termsY + 36).stroke();
  kitDoc.font(boldFont).fontSize(8).fillColor('#0f172a').text(data.preparedBy || 'Accounts & Commercial Department', sigX, termsY + 42, { width: 175 });
  kitDoc.font(regularFont).fontSize(7.5).fillColor('#64748b').text('Atriowings Technologies India Pvt. Ltd.', sigX, termsY + 52, { width: 175 });

  kitDoc.end();

  const contentPdfBytes = await new Promise<Buffer>((resolve, reject) => {
    kitDoc.on('end', () => resolve(Buffer.concat(chunks)));
    kitDoc.on('error', (err) => reject(err));
  });

  // --- PDF-LIB LETTERHEAD VECTOR UNDERLAY COMPOSITING ---
  const letterheadPath = findAssetPath('atriowings-letterhead.pdf');
  if (!fs.existsSync(letterheadPath)) {
    // If letterhead file is somehow not found, return content directly
    return contentPdfBytes;
  }

  const lhBytes = fs.readFileSync(letterheadPath);
  const lhDoc = await PDFDocument.load(lhBytes);
  const contentDoc = await PDFDocument.load(contentPdfBytes);

  const finalDoc = await PDFDocument.create();
  const [embeddedLh] = await finalDoc.embedPdf(lhDoc, [0]);
  const embeddedContentPages = await finalDoc.embedPdf(contentDoc, contentDoc.getPageIndices());

  const helveticaFont = await finalDoc.embedFont(StandardFonts.Helvetica);

  embeddedContentPages.forEach((contentPage, idx) => {
    const page = finalDoc.addPage([595.28, 841.89]);
    // 1. Draw official vector letterhead underlay
    page.drawPage(embeddedLh, { x: 0, y: 0, width: 595.28, height: 841.89 });
    // 2. Composite rendered quotation content
    page.drawPage(contentPage, { x: 0, y: 0, width: 595.28, height: 841.89 });

    // 3. Stamp Page X of Y in the safe footer zone
    page.drawText(`Page ${idx + 1} of ${embeddedContentPages.length}`, {
      x: 500,
      y: 841.89 - 738,
      size: 7,
      font: helveticaFont,
      color: rgb(0.58, 0.64, 0.72),
    });
  });

  const finalPdfBytes = await finalDoc.save();
  return Buffer.from(finalPdfBytes);
}

/**
 * Express handler to generate or stream stored quotation PDF
 */
export async function generateQuotationPdf(
  data: QuotationPdfData,
  res: Response,
  options?: { download?: boolean }
): Promise<void> {
  const isDownload = options?.download !== false;
  const fileName = `Quotation-${data.quotationNumber}-v${data.version}.pdf`;
  const storagePath = getQuotationStoragePath(data.quotationNumber, data.version);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${isDownload ? 'attachment' : 'inline'}; filename="${fileName}"`);

  // Check if already stored on disk to preserve document integrity
  if (fs.existsSync(storagePath)) {
    const stream = fs.createReadStream(storagePath);
    stream.pipe(res);
    return;
  }

  // Generate, store securely, and stream
  const pdfBuffer = await generateQuotationPdfBuffer(data);
  try {
    fs.writeFileSync(storagePath, pdfBuffer);
  } catch (err) {
    console.warn('[PDF Storage] Could not persist to disk, serving dynamically:', err);
  }

  res.send(pdfBuffer);
}
