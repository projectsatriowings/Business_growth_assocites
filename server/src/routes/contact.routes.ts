import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { createNotification, logAudit } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// POST /api/contact - Public contact inquiry submission
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, companyName, subject, message } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Please enter your full name.' });
      return;
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Please enter your message or inquiry details.' });
      return;
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone ? String(phone).trim() : null;
    const cleanCompany = companyName ? String(companyName).trim() : null;
    const cleanSubject = subject ? String(subject).trim() : 'General Inquiry';
    const cleanMessage = message.trim();

    // Notify Super Admin users
    try {
      const admins = await prisma.user.findMany({
        where: { role: Role.ADMIN },
        select: { id: true, email: true },
      });

      for (const admin of admins) {
        await createNotification(
          admin.id,
          `New Contact Inquiry: ${cleanSubject}`,
          `From: ${cleanName} (${cleanEmail})\nPhone: ${cleanPhone || 'Not provided'}\nCompany: ${cleanCompany || 'Not provided'}\n\nMessage:\n${cleanMessage}`,
          'INFO',
          '/admin'
        );
      }
    } catch (notifErr) {
      console.warn('Could not dispatch admin notifications for contact form:', notifErr);
    }

    // Record in Audit Log
    try {
      await logAudit(
        undefined,
        cleanEmail,
        'PUBLIC_VISITOR',
        'CONTACT_FORM_SUBMISSION',
        'CONTACT_INQUIRY',
        undefined,
        {
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          companyName: cleanCompany,
          subject: cleanSubject,
          message: cleanMessage,
        },
        req.ip
      );
    } catch (auditErr) {
      console.warn('Could not record contact audit log:', auditErr);
    }

    res.json({
      success: true,
      message: 'Thank you for contacting Atriowings Technologies! Your inquiry has been received. Our team will review your requirements and respond within 2-4 business hours.',
    });
  } catch (error: any) {
    console.error('Contact form submission error:', error);
    res.status(500).json({
      error: 'Unable to process your inquiry at this moment. Please connect with us directly at info@atriowings.in or call +91 8825948859.',
    });
  }
});

export default router;
