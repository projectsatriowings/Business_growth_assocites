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

    // Fetch company settings
    const companyName = (await prisma.systemSetting.findUnique({ where: { key: 'company_name' } }))?.value || 'BGA Solutions';
    const companyEmail = (await prisma.systemSetting.findUnique({ where: { key: 'company_email' } }))?.value || 'billing@bga.com';
    const companyPhone = (await prisma.systemSetting.findUnique({ where: { key: 'company_phone' } }))?.value || '+91 98765 43210';
    const companyAddress = (await prisma.systemSetting.findUnique({ where: { key: 'company_address' } }))?.value || 'Cyber Valley, Hyderabad';
    const companyGstin = (await prisma.systemSetting.findUnique({ where: { key: 'company_gstin' } }))?.value || '36AAACB1234F1Z5';

    let preparedByName = 'Accounts Department';
    if (quotation.preparedById) {
      const prepUser = await prisma.user.findUnique({ where: { id: quotation.preparedById } });
      if (prepUser) preparedByName = prepUser.name;
    }

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
          location: quotation.client.location,
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

