import { Router, Response } from 'express';
import { Role } from '@prisma/client';
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

    const quotation = await prisma.quotation.findUnique({
      where: { id },
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

    const companyName = settingsMap.get('company_name') || 'BGA Solutions';
    const companyEmail = settingsMap.get('company_email') || 'billing@bga.com';
    const companyPhone = settingsMap.get('company_phone') || '+91 98765 43210';
    const companyAddress = settingsMap.get('company_address') || 'Cyber Valley, Hyderabad';
    const companyGstin = settingsMap.get('company_gstin') || '36AAACB1234F1Z5';

    let preparedByName = 'Accounts Department';
    if (quotation.preparedById) {
      const prepUser = await prisma.user.findUnique({ where: { id: quotation.preparedById } });
      if (prepUser) preparedByName = prepUser.name;
    }

    let formattedClientLocation = quotation.client.location;
    try {
      if (quotation.client.location && quotation.client.location.startsWith('{')) {
        const parsed = JSON.parse(quotation.client.location);
        formattedClientLocation = parsed.city ? `${parsed.city}${parsed.state ? ', ' + parsed.state : ''}` : (parsed.fullAddress || quotation.client.location);
      }
    } catch {}

    generateQuotationPdf(
      {
        quotationNumber: quotation.quotationNumber,
        version: quotation.version,
        date: quotation.createdAt.toISOString().slice(0, 10),
        validityDate: quotation.validityDate.toISOString().slice(0, 10),
        client: {
          clientName: quotation.client.clientName,
          businessName: quotation.client.businessName,
          mobile: quotation.client.mobile,
          email: quotation.client.email,
          location: formattedClientLocation,
        },
        bga: {
          name: quotation.bga.name,
          email: quotation.bga.email,
          mobile: quotation.bga.mobile,
        },
        preparedBy: preparedByName,
        serviceCategory: quotation.serviceCategory,
        serviceScope: quotation.serviceScope,
        serviceFee: quotation.serviceFee,
        adBudget: quotation.adBudget,
        discount: quotation.discount,
        taxRate: quotation.taxRate,
        taxAmount: quotation.taxAmount,
        totalAmount: quotation.totalAmount,
        advanceRequiredPercent: quotation.advanceRequiredPercent,
        advanceRequiredAmount: quotation.advanceRequiredAmount,
        paymentTerms: quotation.paymentTerms,
        company: {
          name: companyName,
          email: companyEmail,
          phone: companyPhone,
          address: companyAddress,
          gstin: companyGstin,
        },
      },
      res
    );
  } catch (error) {
    console.error('PDF error:', error);
    res.status(500).json({ error: 'Failed to generate quotation PDF' });
  }
});

export default router;

