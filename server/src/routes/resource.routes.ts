import { Router, Response } from 'express';
import { Role, QuotationStatus } from '@prisma/client';
import { prisma } from '../prisma';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { generateQuotationPdf } from '../utils/pdf';

const router = Router();
router.use(authenticateJWT);

// Download Quotation PDF with role and ownership check
router.get('/quotations/:id/pdf', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    // Find by either database primary ID or unique quotationNumber for backwards compatibility
    const quotation = await prisma.quotation.findFirst({
      where: {
        OR: [
          { id },
          { quotationNumber: id },
        ],
      },
      include: {
        client: true,
        bga: { select: { id: true, name: true, email: true, mobile: true } },
      },
    });

    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found' });
      return;
    }

    // Role-based security: BGA can only download their own client's quotation
    if (user.role === Role.BGA && quotation.bgaId !== user.id) {
      res.status(403).json({ error: 'Unauthorized to access this quotation' });
      return;
    }

    // Quotation must be drafted/prepared by Accounts before a PDF can be generated
    if (quotation.status === QuotationStatus.REQUESTED || !quotation.preparedById) {
      res.status(400).json({
        error: 'This quotation request has not been prepared by the Accounts Department yet. Official PDF is only available after drafting.',
      });
      return;
    }

    // For BGA role: Quotation must be authorized by Admin before client-facing PDF release
    const isApprovedForRelease =
      quotation.status === QuotationStatus.ADMIN_APPROVED ||
      quotation.status === QuotationStatus.SENT_TO_BGA ||
      quotation.status === QuotationStatus.ACCEPTED ||
      quotation.adminApprovalStatus === 'APPROVED';

    if (user.role === Role.BGA && !isApprovedForRelease) {
      res.status(403).json({
        error: 'This commercial quotation is currently under preparation and has not yet been approved by Management for client release.',
      });
      return;
    }

    // Technical users cannot view financial quotations
    if (user.role === Role.TECHNICAL) {
      res.status(403).json({ error: 'Technical role is not permitted to access commercial quotations' });
      return;
    }

    // Fetch company settings in a single query
    const allSettings = await prisma.systemSetting.findMany({
      where: {
        key: { in: ['company_name', 'company_email', 'company_phone', 'company_address', 'company_gstin'] },
      },
    });
    const settingsMap = new Map(allSettings.map((s) => [s.key, s.value]));

    const companyName = settingsMap.get('company_name') || 'Atriowings Technologies India Private Limited';
    const companyEmail = settingsMap.get('company_email') || 'info@atriowings.in';
    const companyPhone = settingsMap.get('company_phone') || '+91 8825948859';
    const companyAddress = settingsMap.get('company_address') || 'No. 1, Gurudev Complex, 57th St, Venkat Raman Nagar, Korattur, Chennai - 600080';
    const companyGstin = settingsMap.get('company_gstin') || '33AASCA7189D1ZD';

    let preparedByName = 'Accounts Department';
    if (quotation.preparedById) {
      const prepUser = await prisma.user.findUnique({ where: { id: quotation.preparedById } });
      if (prepUser) preparedByName = prepUser.name;
    }

    let formattedClientLocation = quotation.client?.location || 'Tamil Nadu, India';
    try {
      if (quotation.client?.location && quotation.client.location.startsWith('{')) {
        const parsed = JSON.parse(quotation.client.location);
        formattedClientLocation = parsed.city ? `${parsed.city}${parsed.state ? ', ' + parsed.state : ''}` : (parsed.fullAddress || quotation.client.location);
      }
    } catch {}

    // When requested via browser tab, default to inline rendering so PDF viewer renders immediately
    const isDownload = req.query.download === 'true';

    // Safe fallbacks for older quotation records
    const clientName = quotation.client?.clientName || 'Valued Client';
    const businessName = quotation.client?.businessName || clientName;
    const clientMobile = quotation.client?.mobile || 'N/A';
    const clientEmail = quotation.client?.email || 'N/A';
    const bgaName = quotation.bga?.name || 'Growth Associate';
    const bgaEmail = quotation.bga?.email || 'info@atriowings.in';
    const bgaMobile = quotation.bga?.mobile || '+91 8825948859';

    const validityDateStr = quotation.validityDate
      ? quotation.validityDate.toISOString().slice(0, 10)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dateStr = quotation.createdAt
      ? quotation.createdAt.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const serviceFee = quotation.serviceFee || 0;
    const adBudget = quotation.adBudget || 0;
    const discount = quotation.discount || 0;
    const taxRate = quotation.taxRate || 18;
    const taxAmount = quotation.taxAmount || 0;
    const totalAmount = quotation.totalAmount || (serviceFee + adBudget - discount + taxAmount);
    const advancePercent = quotation.advanceRequiredPercent || 50;
    const advanceAmount = quotation.advanceRequiredAmount || Math.round(totalAmount * (advancePercent / 100));

    await generateQuotationPdf(
      {
        quotationNumber: quotation.quotationNumber,
        version: quotation.version || 1,
        date: dateStr,
        validityDate: validityDateStr,
        client: {
          clientName,
          businessName,
          mobile: clientMobile,
          email: clientEmail,
          location: formattedClientLocation,
        },
        bga: {
          name: bgaName,
          email: bgaEmail,
          mobile: bgaMobile,
        },
        preparedBy: preparedByName,
        serviceCategory: quotation.serviceCategory || 'WEBSITE_DEVELOPMENT',
        serviceScope: quotation.serviceScope || 'Standard commercial and engineering scope as agreed upon with Atriowings Technologies.',
        serviceFee,
        adBudget,
        discount,
        taxRate,
        taxAmount,
        totalAmount,
        advanceRequiredPercent: advancePercent,
        advanceRequiredAmount: advanceAmount,
        paymentTerms: quotation.paymentTerms || '50% advance on project sign-off, remaining balance upon verified milestone delivery.',
        company: {
          name: companyName,
          email: companyEmail,
          phone: companyPhone,
          address: companyAddress,
          headOffice: 'No.45 , 2nd Floor , 3rd Avenue , Anna Nagar East , Chennai - 600102 Tamil Nadu, INDIA',
          gstin: companyGstin,
          pan: 'AASCA7189D',
          cin: 'U72900TN20190TC131558',
          website: 'https://atriowings.in',
        },
      },
      res,
      { download: isDownload }
    );
  } catch (error) {
    console.error('PDF error:', error);
    res.status(500).json({ error: 'Failed to generate quotation PDF' });
  }
});

export default router;

