import { Role, ServiceCategoryType, WorkOrderStatus, ProjectStatus } from '@prisma/client';
import { prisma } from '../prisma';
import { sendTransactionalNotificationEmail, TransactionalEmailOptions } from '../utils/mailer';

export interface RecipientInfo {
  userId?: string;
  name?: string;
  email?: string;
  role?: Role | string;
}

export interface DispatchNotificationOptions {
  eventType: string;
  title: string;
  message: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ACTION_REQUIRED';
  link?: string;
  recipients?: RecipientInfo[];
  roles?: Role[];
  userIds?: string[];
  emailData?: {
    subject: string;
    badge?: string;
    eventTitle?: string;
    eventDescription?: string;
    details?: Array<{ label: string; value: string | number }>;
    actionUrl?: string;
    actionText?: string;
    remarks?: string;
    remarksLabel?: string;
    priorityNotice?: string;
  };
  metadata?: any;
}

/**
 * Centralized Notification and Email Automation Service
 * Handles in-app notifications, canonical email resolution, bounded retries,
 * and delivery logging for all 5 enterprise portals (Admin, BGA, Accounts, Technical).
 */
export class NotificationService {
  /**
   * Core dispatcher that:
   * 1. Resolves canonical user email & details from database.
   * 2. Saves persistent in-app notifications.
   * 3. Dispatches branded transactional HTML email with bounded retries.
   * 4. Logs delivery status (SENT / FAILED) in EmailDeliveryLog.
   */
  static async dispatch(options: DispatchNotificationOptions): Promise<void> {
    try {
      const {
        eventType,
        title,
        message,
        type = 'INFO',
        link,
        recipients = [],
        roles = [],
        userIds = [],
        emailData,
        metadata,
      } = options;

      // 1. Resolve all recipients
      const resolvedMap = new Map<string, { id: string; name: string; email: string; role: string }>();

      // A. Explicit recipients
      for (const r of recipients) {
        if (r.userId && (!r.email || !r.name)) {
          const u = await prisma.user.findUnique({
            where: { id: r.userId },
            select: { id: true, name: true, email: true, role: true, status: true },
          });
          if (u && u.status !== 'SUSPENDED') {
            resolvedMap.set(u.id, { id: u.id, name: u.name, email: u.email, role: u.role });
          }
        } else if (r.userId && r.email && r.name) {
          resolvedMap.set(r.userId, { id: r.userId, name: r.name, email: r.email, role: String(r.role || 'USER') });
        }
      }

      // B. User IDs
      if (userIds.length > 0) {
        const users = await prisma.user.findMany({
          where: { id: { in: userIds }, status: { not: 'SUSPENDED' } },
          select: { id: true, name: true, email: true, role: true },
        });
        for (const u of users) {
          resolvedMap.set(u.id, { id: u.id, name: u.name, email: u.email, role: u.role });
        }
      }

      // C. Roles (e.g. all ADMINs, all ACCOUNTs, or assigned TECHNICAL)
      if (roles.length > 0) {
        const roleUsers = await prisma.user.findMany({
          where: { role: { in: roles }, status: { not: 'SUSPENDED' } },
          select: { id: true, name: true, email: true, role: true },
        });
        for (const u of roleUsers) {
          resolvedMap.set(u.id, { id: u.id, name: u.name, email: u.email, role: u.role });
        }
      }

      const targetUsers = Array.from(resolvedMap.values());
      if (targetUsers.length === 0) {
        return;
      }

      // 2. Persist in-app notifications
      try {
        await prisma.notification.createMany({
          data: targetUsers.map((u) => ({
            userId: u.id,
            title,
            message,
            type,
            link: link || null,
          })),
        });
      } catch (inAppErr) {
        console.error(`[NotificationService] In-app notification creation error for event ${eventType}:`, inAppErr);
      }

      // 3. Send event-specific emails asynchronously if emailData is provided
      if (emailData && emailData.subject) {
        // Run asynchronously without awaiting to ensure HTTP response is instant
        (async () => {
          for (const user of targetUsers) {
            await NotificationService.deliverEmailWithRetry({
              eventType,
              user,
              emailData: {
                subject: emailData.subject,
                badge: emailData.badge || 'ENTERPRISE UPDATE',
                eventTitle: emailData.eventTitle || title,
                eventDescription: emailData.eventDescription || message,
                details: emailData.details,
                actionUrl: emailData.actionUrl || link,
                actionText: emailData.actionText,
                remarks: emailData.remarks,
                remarksLabel: emailData.remarksLabel,
                priorityNotice: emailData.priorityNotice,
              },
              metadata,
            });
          }
        })().catch((bgErr) => {
          console.error(`[NotificationService Background Error] for event ${eventType}:`, bgErr);
        });
      }
    } catch (err: any) {
      console.error(`[NotificationService Fatal Error] on dispatch:`, err?.message || err);
    }
  }

  /**
   * Delivers transactional email to a single user with bounded retry (2 attempts)
   * and records status in EmailDeliveryLog.
   */
  private static async deliverEmailWithRetry(params: {
    eventType: string;
    user: { id: string; name: string; email: string; role: string };
    emailData: {
      subject: string;
      badge?: string;
      eventTitle: string;
      eventDescription: string;
      details?: Array<{ label: string; value: string | number }>;
      actionUrl?: string;
      actionText?: string;
      remarks?: string;
      remarksLabel?: string;
      priorityNotice?: string;
    };
    metadata?: any;
  }): Promise<void> {
    const { eventType, user, emailData, metadata } = params;

    if (!user.email || !user.email.includes('@')) {
      return;
    }

    let logId: string | null = null;
    if (!(prisma as any).emailDeliveryLog) {
      // Prisma client might not be regenerated yet with EmailDeliveryLog model
      return;
    }
    try {
      const createdLog = await prisma.emailDeliveryLog.create({
        data: {
          eventType,
          recipientId: user.id,
          recipientEmail: user.email,
          recipientRole: user.role,
          subject: emailData.subject,
          status: 'PENDING',
          attempts: 0,
          metadata: JSON.stringify({
            ...(metadata || {}),
            recipientName: user.name,
            badge: emailData.badge,
            eventTitle: emailData.eventTitle,
            eventDescription: emailData.eventDescription,
            details: emailData.details,
            actionUrl: emailData.actionUrl,
            actionText: emailData.actionText,
            remarks: emailData.remarks,
            remarksLabel: emailData.remarksLabel,
            priorityNotice: emailData.priorityNotice,
          }),
        },
      });
      logId = createdLog.id;
    } catch (logErr) {
      console.warn('[NotificationService] Failed to create initial EmailDeliveryLog:', logErr);
    }

    let attempt = 0;
    const maxAttempts = 2;
    let lastError: string | null = null;
    let isSuccess = false;

    while (attempt < maxAttempts && !isSuccess) {
      attempt++;
      try {
        const sendResult = await sendTransactionalNotificationEmail({
          to: user.email,
          recipientName: user.name,
          subject: emailData.subject,
          badge: emailData.badge,
          eventTitle: emailData.eventTitle,
          eventDescription: emailData.eventDescription,
          details: emailData.details,
          actionUrl: emailData.actionUrl,
          actionText: emailData.actionText,
          remarks: emailData.remarks,
          remarksLabel: emailData.remarksLabel,
          priorityNotice: emailData.priorityNotice,
        });

        if (sendResult.success) {
          isSuccess = true;
          break;
        } else {
          lastError = sendResult.error || 'SMTP delivery rejected';
        }
      } catch (err: any) {
        lastError = err?.message || 'SMTP exception';
      }

      if (!isSuccess && attempt < maxAttempts) {
        // Backoff delay before retry (1000ms)
        await new Promise((res) => setTimeout(res, 1000));
      }
    }

    if (logId) {
      try {
        await prisma.emailDeliveryLog.update({
          where: { id: logId },
          data: {
            status: isSuccess ? 'SENT' : 'FAILED',
            attempts: attempt,
            errorMessage: isSuccess ? null : lastError,
          },
        });
      } catch (updateLogErr) {
        console.warn('[NotificationService] Failed to update EmailDeliveryLog:', updateLogErr);
      }
    }
  }

  /**
   * Durable recovery runner for unfulfilled emails across server restarts.
   * Scans for PENDING or retryable FAILED logs in EmailDeliveryLog.
   */
  static async recoverPendingEmails(): Promise<number> {
    try {
      if (!(prisma as any).emailDeliveryLog) {
        return 0;
      }
      const pendingLogs = await prisma.emailDeliveryLog.findMany({
        where: {
          status: 'PENDING',
          attempts: { lt: 3 },
        },
        take: 50,
      });

      if (pendingLogs.length === 0) return 0;

      console.log(`[Notification Recovery] Found ${pendingLogs.length} pending email delivery tasks. Processing recovery...`);

      for (const log of pendingLogs) {
        if (!log.recipientEmail || !log.recipientEmail.includes('@')) {
          await prisma.emailDeliveryLog.update({
            where: { id: log.id },
            data: { status: 'FAILED', errorMessage: 'Invalid recipient email' },
          });
          continue;
        }

        let meta: any = {};
        try {
          meta = log.metadata ? JSON.parse(log.metadata) : {};
        } catch {
          meta = {};
        }

        const sendResult = await sendTransactionalNotificationEmail({
          to: log.recipientEmail,
          recipientName: meta.recipientName || 'Valued Partner',
          subject: log.subject,
          badge: meta.badge || 'SYSTEM ALERT',
          eventTitle: meta.eventTitle || log.subject,
          eventDescription: meta.eventDescription || 'Automated transaction notification update.',
          details: meta.details,
          actionUrl: meta.actionUrl,
          actionText: meta.actionText,
          remarks: meta.remarks,
        });

        await prisma.emailDeliveryLog.update({
          where: { id: log.id },
          data: {
            status: sendResult.success ? 'SENT' : 'FAILED',
            attempts: log.attempts + 1,
            errorMessage: sendResult.success ? null : (sendResult.error || 'Recovery attempt failed'),
          },
        });
      }

      return pendingLogs.length;
    } catch (err: any) {
      console.warn('[Notification Recovery Error]:', err?.message || err);
      return 0;
    }
  }

  // ==========================================================================
  // HIGH-LEVEL WORKFLOW HELPERS
  // ==========================================================================

  /**
   * 1. BGA Registration Submitted
   */
  static async notifyBgaRegistrationSubmitted(user: { id: string; name: string; email: string; mobile: string; city?: string | null }) {
    await NotificationService.dispatch({
      eventType: 'BGA_REGISTRATION_SUBMITTED',
      title: 'New BGA Associate Registration',
      message: `${user.name} has registered as a Growth Associate. Please review documents and KYC.`,
      type: 'ACTION_REQUIRED',
      link: '/admin?tab=associates',
      roles: [Role.ADMIN],
      emailData: {
        subject: `[New Registration] ${user.name} joined as Growth Associate`,
        badge: 'ASSOCIATE ONBOARDING',
        eventTitle: 'New Growth Associate Registration',
        eventDescription: `A new associate has submitted their registration on the Atriowings portal and requires administrative review.`,
        details: [
          { label: 'Associate Name', value: user.name },
          { label: 'Associate ID', value: user.id },
          { label: 'Email Address', value: user.email },
          { label: 'Mobile Number', value: user.mobile },
          { label: 'Location', value: user.city || 'Not specified' },
        ],
        actionUrl: '/admin?tab=associates',
        actionText: 'Review Associate in Admin Portal &rarr;',
      },
    });
  }

  /**
   * 2. BGA KYC Decision (Approved or Rejected)
   */
  static async notifyBgaKycDecision(user: { id: string; name: string; email: string }, isApproved: boolean, remarks?: string | null) {
    await NotificationService.dispatch({
      eventType: isApproved ? 'BGA_KYC_APPROVED' : 'BGA_KYC_REJECTED',
      title: isApproved ? 'KYC Verification Approved' : 'KYC Verification Action Required',
      message: isApproved
        ? 'Your KYC documents and profile have been approved. You can now onboard clients and manage quotations.'
        : `Your KYC verification requires attention: ${remarks || 'Please re-upload valid documents.'}`,
      type: isApproved ? 'SUCCESS' : 'WARNING',
      link: '/bga?tab=profile',
      recipients: [{ userId: user.id, name: user.name, email: user.email, role: Role.BGA }],
      emailData: {
        subject: isApproved
          ? 'KYC Verification Approved - Atriowings Growth Associate Portal'
          : 'Action Required: KYC Verification Update - Atriowings BGA',
        badge: isApproved ? 'KYC APPROVED' : 'KYC ACTION REQUIRED',
        eventTitle: isApproved ? 'KYC Verification Approved & Verified' : 'KYC Verification - Attention Needed',
        eventDescription: isApproved
          ? 'Your identity documents and bank details have been verified by administration. Your account is now fully authorized for client onboarding and commission payouts.'
          : 'Your KYC submission was reviewed and requires updates before approval can be granted.',
        remarks: remarks || undefined,
        remarksLabel: 'Administration Remarks',
        actionUrl: '/bga?tab=profile',
        actionText: isApproved ? 'Open BGA Dashboard &rarr;' : 'Update KYC Documents &rarr;',
      },
    });
  }

  /**
   * 3. New Enquiry Submitted by BGA
   */
  static async notifyEnquirySubmitted(params: {
    enquiryId: string;
    bga: { id: string; name: string; email: string };
    client: { clientName: string; businessName: string };
    serviceCategory: string;
    budget: number;
    requirements: string;
  }) {
    const { enquiryId, bga, client, serviceCategory, budget, requirements } = params;

    // A. Notify Admin & Accounts
    await NotificationService.dispatch({
      eventType: 'ENQUIRY_SUBMITTED',
      title: 'New Commercial Enquiry Submitted',
      message: `BGA ${bga.name} submitted an enquiry (${enquiryId}) for ${client.clientName} (${serviceCategory}).`,
      type: 'ACTION_REQUIRED',
      link: '/admin?tab=enquiries',
      roles: [Role.ADMIN, Role.ACCOUNTS],
      emailData: {
        subject: `[New Enquiry ${enquiryId}] ${client.clientName} - ${serviceCategory}`,
        badge: 'NEW ENQUIRY',
        eventTitle: 'New Commercial Enquiry Submitted',
        eventDescription: `Growth Associate ${bga.name} has submitted a new project enquiry for client ${client.clientName} (${client.businessName}).`,
        details: [
          { label: 'Enquiry Reference', value: enquiryId },
          { label: 'Client / Business', value: `${client.clientName} (${client.businessName})` },
          { label: 'Service Category', value: serviceCategory },
          { label: 'Expected Budget', value: budget > 0 ? `₹${budget.toLocaleString('en-IN')}` : 'Not specified' },
          { label: 'Submitted By (BGA)', value: bga.name },
        ],
        remarks: requirements,
        remarksLabel: 'Client Requirements / Scope Summary',
        actionUrl: '/admin?tab=enquiries',
        actionText: 'Review Enquiry & Authorize &rarr;',
      },
    });

    // B. Confirmation to BGA
    await NotificationService.dispatch({
      eventType: 'ENQUIRY_CONFIRMATION',
      title: 'Enquiry Submitted Successfully',
      message: `Your enquiry (${enquiryId}) for ${client.clientName} has been submitted for company review.`,
      type: 'SUCCESS',
      link: '/bga?tab=enquiries',
      recipients: [{ userId: bga.id, name: bga.name, email: bga.email, role: Role.BGA }],
      emailData: {
        subject: `Enquiry Received: ${enquiryId} - ${client.clientName}`,
        badge: 'ENQUIRY SUBMITTED',
        eventTitle: 'Commercial Enquiry Received',
        eventDescription: `Your enquiry for ${client.clientName} has been logged in our enterprise system. Our administration and accounts teams are reviewing the scope to prepare the official quotation.`,
        details: [
          { label: 'Enquiry ID', value: enquiryId },
          { label: 'Client Name', value: client.clientName },
          { label: 'Service Category', value: serviceCategory },
        ],
        actionUrl: '/bga?tab=enquiries',
        actionText: 'Track Enquiry Status &rarr;',
      },
    });
  }

  /**
   * 4. Enquiry Approved by Admin (Ready for Accounts Quotation)
   */
  static async notifyEnquiryApproved(params: {
    enquiryId: string;
    bga: { id: string; name: string; email: string };
    client: { clientName: string; businessName: string };
    serviceCategory: string;
    adminNotes?: string | null;
  }) {
    const { enquiryId, bga, client, serviceCategory, adminNotes } = params;

    // A. Notify Accounts (Action Required: Prepare Quotation)
    await NotificationService.dispatch({
      eventType: 'ENQUIRY_APPROVED_ACCOUNTS',
      title: 'Enquiry Approved – Ready for Official Quotation',
      message: `Enquiry ${enquiryId} for ${client.clientName} is approved. Please prepare the official quotation.`,
      type: 'ACTION_REQUIRED',
      link: '/accounts?tab=quotations',
      roles: [Role.ACCOUNTS],
      emailData: {
        subject: `[Action Required] Prepare Quotation: Enquiry ${enquiryId} (${client.clientName})`,
        badge: 'QUOTATION QUEUE',
        eventTitle: 'Enquiry Approved – Ready for Quotation',
        eventDescription: `Enquiry ${enquiryId} for ${client.clientName} has been approved by Admin and moved to the Accounts preparation queue.`,
        details: [
          { label: 'Enquiry ID', value: enquiryId },
          { label: 'Client Name', value: client.clientName },
          { label: 'Service Category', value: serviceCategory },
          { label: 'BGA Associate', value: bga.name },
        ],
        remarks: adminNotes || undefined,
        remarksLabel: 'Admin Reviewer Notes',
        actionUrl: '/accounts?tab=quotations',
        actionText: 'Open Accounts Quotation Builder &rarr;',
      },
    });

    // B. Notify BGA (Enquiry Approved)
    await NotificationService.dispatch({
      eventType: 'ENQUIRY_APPROVED_BGA',
      title: 'Enquiry Approved by Company',
      message: `Your enquiry (${enquiryId}) for ${client.clientName} was approved. Accounts is preparing the quotation.`,
      type: 'SUCCESS',
      link: '/bga?tab=enquiries',
      recipients: [{ userId: bga.id, name: bga.name, email: bga.email, role: Role.BGA }],
      emailData: {
        subject: `Enquiry Approved: ${enquiryId} - ${client.clientName}`,
        badge: 'ENQUIRY APPROVED',
        eventTitle: 'Enquiry Approved by Administration',
        eventDescription: `Your enquiry for ${client.clientName} has passed initial review. Accounts department is now drafting the official commercial quotation.`,
        details: [
          { label: 'Enquiry ID', value: enquiryId },
          { label: 'Client', value: client.clientName },
          { label: 'Category', value: serviceCategory },
        ],
        actionUrl: '/bga?tab=enquiries',
        actionText: 'View Enquiry Status &rarr;',
      },
    });
  }

  /**
   * 5. Quotation Prepared by Accounts (Pending Admin Approval)
   */
  static async notifyQuotationPrepared(params: {
    quotationNumber: string;
    bga: { id: string; name: string; email: string };
    client: { clientName: string };
    totalAmount: number;
    proposedCommissionRate: number;
    isRevision?: boolean;
    isException?: boolean;
  }) {
    const { quotationNumber, bga, client, totalAmount, proposedCommissionRate, isRevision, isException } = params;

    await NotificationService.dispatch({
      eventType: 'QUOTATION_PREPARED',
      title: isRevision ? 'Corrected Quotation Awaiting Admin Approval' : 'New Quotation & Commission Proposal Awaiting Approval',
      message: `Quotation ${quotationNumber} for ${client.clientName} (₹${totalAmount.toLocaleString('en-IN')}, Commission: ${proposedCommissionRate}%${isException ? ' [EXCEPTION]' : ''}) requires Admin authorization.`,
      type: 'ACTION_REQUIRED',
      link: '/admin?tab=quotations',
      roles: [Role.ADMIN],
      emailData: {
        subject: `[Approval Required] Quotation ${quotationNumber} - ${client.clientName}`,
        badge: isException ? 'COMMISSION EXCEPTION' : 'APPROVAL REQUIRED',
        eventTitle: isRevision ? 'Corrected Quotation Submitted' : 'Quotation & Commission Proposal Prepared',
        eventDescription: `Accounts has finalized quotation ${quotationNumber} with proposed BGA commission of ${proposedCommissionRate}%. Please review and authorize release to the associate.`,
        details: [
          { label: 'Quotation Number', value: quotationNumber },
          { label: 'Client', value: client.clientName },
          { label: 'Total Value', value: `₹${totalAmount.toLocaleString('en-IN')}` },
          { label: 'Proposed Commission', value: `${proposedCommissionRate}%${isException ? ' (Range Exception Flagged)' : ''}` },
          { label: 'BGA Associate', value: bga.name },
        ],
        actionUrl: '/admin?tab=quotations',
        actionText: 'Review & Authorize Quotation &rarr;',
      },
    });
  }

  /**
   * 6. Quotation Approved by Admin (Released to BGA)
   */
  static async notifyQuotationApproved(params: {
    quotationNumber: string;
    bga: { id: string; name: string; email: string };
    client: { clientName: string };
    totalAmount: number;
    approvedCommissionRate: number;
    adminNotes?: string | null;
  }) {
    const { quotationNumber, bga, client, totalAmount, approvedCommissionRate, adminNotes } = params;

    // A. Notify BGA (Quotation ready to share)
    await NotificationService.dispatch({
      eventType: 'QUOTATION_ADMIN_APPROVED',
      title: 'Quotation Approved & Released for Client',
      message: `Quotation ${quotationNumber} for ${client.clientName} (₹${totalAmount.toLocaleString('en-IN')}) is approved. Approved commission: ${approvedCommissionRate}%.`,
      type: 'SUCCESS',
      link: '/bga?tab=quotations',
      recipients: [{ userId: bga.id, name: bga.name, email: bga.email, role: Role.BGA }],
      emailData: {
        subject: `Quotation Ready: ${quotationNumber} for ${client.clientName}`,
        badge: 'QUOTATION APPROVED',
        eventTitle: 'Official Quotation Approved & Released',
        eventDescription: `The official commercial quotation for ${client.clientName} has been approved by Atriowings Administration. You can now download the PDF and share it with your client.`,
        details: [
          { label: 'Quotation Number', value: quotationNumber },
          { label: 'Client', value: client.clientName },
          { label: 'Contract Value', value: `₹${totalAmount.toLocaleString('en-IN')}` },
          { label: 'Approved Commission Rate', value: `${approvedCommissionRate}%` },
        ],
        remarks: adminNotes || undefined,
        remarksLabel: 'Admin Commercial Remarks',
        actionUrl: '/bga?tab=quotations',
        actionText: 'Download Quotation & Share &rarr;',
      },
    });

    // B. Notify Accounts (Admin Approved)
    await NotificationService.dispatch({
      eventType: 'QUOTATION_ADMIN_APPROVED_ACCOUNTS',
      title: 'Quotation Approved by Admin',
      message: `Quotation ${quotationNumber} for ${client.clientName} has been approved and released to BGA.`,
      type: 'INFO',
      link: '/accounts?tab=quotations',
      roles: [Role.ACCOUNTS],
      emailData: {
        subject: `[Approved] Quotation ${quotationNumber} - ${client.clientName}`,
        badge: 'QUOTATION AUTHORIZED',
        eventTitle: 'Quotation Approved by Administration',
        eventDescription: `Quotation ${quotationNumber} for ${client.clientName} was approved with commission rate ${approvedCommissionRate}%.`,
        details: [
          { label: 'Quotation Number', value: quotationNumber },
          { label: 'Client', value: client.clientName },
          { label: 'Total Amount', value: `₹${totalAmount.toLocaleString('en-IN')}` },
        ],
        actionUrl: '/accounts?tab=quotations',
        actionText: 'View in Accounts &rarr;',
      },
    });
  }

  /**
   * 7. Client Acceptance of Quotation
   */
  static async notifyClientAcceptance(params: {
    quotationNumber: string;
    workOrderNumber: string;
    bga: { id: string; name: string; email: string };
    client: { clientName: string };
    totalValue: number;
    advanceRequired: number;
  }) {
    const { quotationNumber, workOrderNumber, bga, client, totalValue, advanceRequired } = params;

    // Notify Accounts and Admin
    await NotificationService.dispatch({
      eventType: 'QUOTATION_CLIENT_ACCEPTED',
      title: 'Quotation Accepted by Client – Work Order Generated',
      message: `Client ${client.clientName} accepted quotation ${quotationNumber}. Work Order ${workOrderNumber} generated. Advance pending: ₹${advanceRequired.toLocaleString('en-IN')}.`,
      type: 'SUCCESS',
      link: '/accounts?tab=work-orders',
      roles: [Role.ADMIN, Role.ACCOUNTS],
      emailData: {
        subject: `[Client Accepted] Quotation ${quotationNumber} - WO: ${workOrderNumber}`,
        badge: 'CLIENT ACCEPTED',
        eventTitle: 'Quotation Accepted & Work Order Created',
        eventDescription: `Client ${client.clientName} has officially accepted quotation ${quotationNumber}. Work Order ${workOrderNumber} has been generated. Client advance payment is now expected.`,
        details: [
          { label: 'Work Order Number', value: workOrderNumber },
          { label: 'Quotation Reference', value: quotationNumber },
          { label: 'Client Name', value: client.clientName },
          { label: 'Total Contract Value', value: `₹${totalValue.toLocaleString('en-IN')}` },
          { label: 'Advance Payment Required', value: `₹${advanceRequired.toLocaleString('en-IN')}` },
          { label: 'BGA Associate', value: bga.name },
        ],
        actionUrl: '/accounts?tab=work-orders',
        actionText: 'View Work Order in Accounts &rarr;',
      },
    });
  }

  /**
   * 8. Payment Recorded (Advance or Final) - Verification Required
   */
  static async notifyPaymentRecorded(params: {
    paymentId: string;
    paymentType: string;
    amount: number;
    utr: string;
    client: { clientName: string };
    workOrder: { workOrderNumber: string };
    bga: { id: string; name: string; email: string };
    recordedBy: string;
  }) {
    const { paymentType, amount, utr, client, workOrder, bga, recordedBy } = params;

    // A. Notify Accounts & Admin (Action Required: Verify Payment)
    await NotificationService.dispatch({
      eventType: 'PAYMENT_RECORDED_VERIFICATION_REQUIRED',
      title: `${paymentType === 'ADVANCE' ? 'Advance' : 'Final'} Payment Recorded – Verification Required`,
      message: `Payment of ₹${amount.toLocaleString('en-IN')} (UTR: ${utr}) recorded by ${recordedBy} for ${client.clientName} (WO: ${workOrder.workOrderNumber}). Please verify against bank credit.`,
      type: 'ACTION_REQUIRED',
      link: '/accounts?tab=work-orders',
      roles: [Role.ACCOUNTS, Role.ADMIN],
      emailData: {
        subject: `[Payment Verification Needed] ₹${amount.toLocaleString('en-IN')} - ${client.clientName}`,
        badge: 'PAYMENT AUDIT',
        eventTitle: 'Client Payment Recorded – Bank Verification Required',
        eventDescription: `A ${paymentType.toLowerCase()} payment has been recorded for work order ${workOrder.workOrderNumber}. Financial audit and bank reconciliation are required to activate the project or release commissions.`,
        details: [
          { label: 'Payment Type', value: paymentType },
          { label: 'Amount Received', value: `₹${amount.toLocaleString('en-IN')}` },
          { label: 'UTR / Transaction Ref', value: utr },
          { label: 'Work Order', value: workOrder.workOrderNumber },
          { label: 'Client', value: client.clientName },
          { label: 'Recorded By', value: recordedBy },
        ],
        actionUrl: '/accounts?tab=work-orders',
        actionText: 'Verify Payment in Accounts &rarr;',
      },
    });

    // B. Notify BGA (Payment Received, in audit)
    await NotificationService.dispatch({
      eventType: 'PAYMENT_RECORDED_BGA',
      title: `${paymentType === 'ADVANCE' ? 'Advance' : 'Final'} Payment Received by Accounts`,
      message: `Accounts recorded payment of ₹${amount.toLocaleString('en-IN')} (UTR: ${utr}) for ${client.clientName}. Bank verification is in progress.`,
      type: 'INFO',
      link: '/bga?tab=projects',
      recipients: [{ userId: bga.id, name: bga.name, email: bga.email, role: Role.BGA }],
      emailData: {
        subject: `Payment Received: ₹${amount.toLocaleString('en-IN')} - ${client.clientName}`,
        badge: 'PAYMENT RECEIVED',
        eventTitle: 'Client Payment Received – Verification in Progress',
        eventDescription: `Your client's ${paymentType.toLowerCase()} payment has been recorded in the company ledger. Once verified against bank credit, technical production will be activated.`,
        details: [
          { label: 'Amount', value: `₹${amount.toLocaleString('en-IN')}` },
          { label: 'Payment Type', value: paymentType },
          { label: 'Transaction UTR', value: utr },
          { label: 'Client Name', value: client.clientName },
        ],
        actionUrl: '/bga?tab=projects',
        actionText: 'View Project Status &rarr;',
      },
    });
  }

  /**
   * 9. Advance Payment Verified (Project Activated)
   */
  static async notifyAdvancePaymentVerified(params: {
    workOrderNumber: string;
    projectNumber: string;
    client: { clientName: string };
    bga: { id: string; name: string; email: string };
    amount: number;
    serviceCategory: string;
  }) {
    const { workOrderNumber, projectNumber, client, bga, amount, serviceCategory } = params;

    // A. Notify BGA
    await NotificationService.dispatch({
      eventType: 'ADVANCE_PAYMENT_VERIFIED',
      title: 'Advance Payment Verified – Project Activated',
      message: `Advance payment of ₹${amount.toLocaleString('en-IN')} verified for ${client.clientName}. Technical project ${projectNumber} is ready for execution.`,
      type: 'SUCCESS',
      link: '/bga?tab=projects',
      recipients: [{ userId: bga.id, name: bga.name, email: bga.email, role: Role.BGA }],
      emailData: {
        subject: `Advance Verified & Project Activated: ${projectNumber} - ${client.clientName}`,
        badge: 'ADVANCE VERIFIED',
        eventTitle: 'Advance Payment Verified – Project Active',
        eventDescription: `The advance payment for ${client.clientName} has been verified against company bank credit. Technical project ${projectNumber} is now officially in production.`,
        details: [
          { label: 'Project Number', value: projectNumber },
          { label: 'Work Order', value: workOrderNumber },
          { label: 'Client Name', value: client.clientName },
          { label: 'Advance Paid', value: `₹${amount.toLocaleString('en-IN')}` },
          { label: 'Service Domain', value: serviceCategory },
        ],
        actionUrl: '/bga?tab=projects',
        actionText: 'Open Project Dashboard &rarr;',
      },
    });

    // B. POLICY ENFORCED: Notify Technical Team members via in-app AND email!
    await NotificationService.dispatch({
      eventType: 'TECHNICAL_PROJECT_READY',
      title: 'New Project Ready for Technical Assignment',
      message: `Advance verified for project ${projectNumber} (${client.clientName}, ${serviceCategory}). Ready for team assignment and milestone execution.`,
      type: 'ACTION_REQUIRED',
      link: '/technical?tab=projects',
      roles: [Role.TECHNICAL, Role.ADMIN],
      emailData: {
        subject: `[Technical Action Required] Project ${projectNumber} Active - ${client.clientName}`,
        badge: 'TECHNICAL ASSIGNMENT',
        eventTitle: 'New Project Active – Ready for Technical Execution',
        eventDescription: `Commercial advance has been verified for client ${client.clientName}. Technical project ${projectNumber} is now active and requires lead assignment and milestone kick-off.`,
        details: [
          { label: 'Project Reference', value: projectNumber },
          { label: 'Client / Business', value: client.clientName },
          { label: 'Service Domain', value: serviceCategory },
          { label: 'BGA Representative', value: bga.name },
        ],
        actionUrl: '/technical?tab=projects',
        actionText: 'Open Technical Portal & Kick Off &rarr;',
      },
    });
  }

  /**
   * 10. Technical Project Lead Assigned
   */
  static async notifyTechnicalProjectAssigned(params: {
    projectNumber: string;
    client: { clientName: string };
    serviceCategory: string;
    technicalLead: { id: string; name: string; email: string };
    bga: { id: string; name: string; email: string };
    assignedBy: string;
    targetCompletionDate?: Date | null;
  }) {
    const { projectNumber, client, serviceCategory, technicalLead, bga, assignedBy, targetCompletionDate } = params;

    // A. POLICY ENFORCED: Notify Assigned Technical Lead via email AND in-app!
    await NotificationService.dispatch({
      eventType: 'TECHNICAL_PROJECT_ASSIGNED',
      title: 'Project Lead Assignment',
      message: `You have been assigned as lead for project ${projectNumber} (${client.clientName}, ${serviceCategory}) by ${assignedBy}.`,
      type: 'ACTION_REQUIRED',
      link: '/technical?tab=projects',
      recipients: [{ userId: technicalLead.id, name: technicalLead.name, email: technicalLead.email, role: Role.TECHNICAL }],
      emailData: {
        subject: `[Project Assignment] Lead Assigned: ${projectNumber} - ${client.clientName}`,
        badge: 'PROJECT ASSIGNED',
        eventTitle: 'You Have Been Assigned as Project Lead',
        eventDescription: `Administration has assigned you as the technical lead for project ${projectNumber} (${client.clientName}). Please review client specifications, set up milestones, and coordinate deliverables.`,
        details: [
          { label: 'Project Number', value: projectNumber },
          { label: 'Client Name', value: client.clientName },
          { label: 'Service Category', value: serviceCategory },
          { label: 'Target Completion', value: targetCompletionDate ? new Date(targetCompletionDate).toLocaleDateString('en-IN') : 'To be scheduled' },
          { label: 'BGA Contact', value: `${bga.name} (${bga.email})` },
        ],
        actionUrl: '/technical?tab=projects',
        actionText: 'View Project Workspace &rarr;',
      },
    });

    // B. Notify BGA that Technical Lead is assigned
    await NotificationService.dispatch({
      eventType: 'TECHNICAL_LEAD_ASSIGNED_BGA',
      title: 'Technical Lead Assigned to Project',
      message: `${technicalLead.name} has been assigned as technical lead for project ${projectNumber} (${client.clientName}).`,
      type: 'INFO',
      link: '/bga?tab=projects',
      recipients: [{ userId: bga.id, name: bga.name, email: bga.email, role: Role.BGA }],
      emailData: {
        subject: `Technical Lead Assigned: ${projectNumber} - ${client.clientName}`,
        badge: 'PROJECT TEAM',
        eventTitle: 'Technical Team Lead Assigned',
        eventDescription: `Your project ${projectNumber} for ${client.clientName} has been assigned to technical lead ${technicalLead.name}. You can collaborate and track deliverables through your portal.`,
        details: [
          { label: 'Project Number', value: projectNumber },
          { label: 'Assigned Technical Lead', value: technicalLead.name },
          { label: 'Client', value: client.clientName },
        ],
        actionUrl: '/bga?tab=projects',
        actionText: 'View Project Timeline &rarr;',
      },
    });
  }

  /**
   * 11. Technical Deliverable Uploaded
   */
  static async notifyDeliverableUploaded(params: {
    projectNumber: string;
    client: { clientName: string };
    bga: { id: string; name: string; email: string };
    deliverableTitle: string;
    version: string;
    uploadedBy: string;
  }) {
    const { projectNumber, client, bga, deliverableTitle, version, uploadedBy } = params;

    // Notify BGA (Review Required before client sharing)
    await NotificationService.dispatch({
      eventType: 'DELIVERABLE_UPLOADED',
      title: 'Deliverable Ready for Review',
      message: `Technical team (${uploadedBy}) uploaded deliverable "${deliverableTitle}" (v${version}) for ${client.clientName} (${projectNumber}). Please review.`,
      type: 'ACTION_REQUIRED',
      link: '/bga?tab=projects',
      recipients: [{ userId: bga.id, name: bga.name, email: bga.email, role: Role.BGA }],
      emailData: {
        subject: `[Action Required] Deliverable Ready: "${deliverableTitle}" - ${projectNumber}`,
        badge: 'DELIVERABLE REVIEW',
        eventTitle: 'Deliverable Uploaded for Associate Review',
        eventDescription: `Technical team has submitted a project deliverable for your review. Please verify that it meets the client's scope before authorizing release to the client.`,
        details: [
          { label: 'Project Number', value: projectNumber },
          { label: 'Client Name', value: client.clientName },
          { label: 'Deliverable Title', value: deliverableTitle },
          { label: 'Version', value: `v${version}` },
          { label: 'Uploaded By', value: uploadedBy },
        ],
        actionUrl: '/bga?tab=projects',
        actionText: 'Review Deliverable & Approve &rarr;',
      },
    });
  }

  /**
   * 12. Deliverable Reviewed by BGA (Changes Requested or Approved)
   */
  static async notifyDeliverableReviewed(params: {
    projectNumber: string;
    client: { clientName: string };
    deliverableTitle: string;
    isApproved: boolean;
    bgaName: string;
    technicalUsers: Array<{ id: string; name: string; email: string }>;
    notes?: string | null;
  }) {
    const { projectNumber, client, deliverableTitle, isApproved, bgaName, technicalUsers, notes } = params;

    // POLICY ENFORCED: Notify Technical Team members via email AND in-app!
    await NotificationService.dispatch({
      eventType: isApproved ? 'DELIVERABLE_APPROVED' : 'DELIVERABLE_CHANGES_REQUESTED',
      title: isApproved ? 'Deliverable Approved by BGA' : 'Deliverable Changes Requested by BGA',
      message: isApproved
        ? `BGA ${bgaName} approved deliverable "${deliverableTitle}" for project ${projectNumber}.`
        : `BGA ${bgaName} requested revisions on deliverable "${deliverableTitle}" for project ${projectNumber}: ${notes || 'Revisions required'}.`,
      type: isApproved ? 'SUCCESS' : 'WARNING',
      link: '/technical?tab=projects',
      recipients: technicalUsers.map((t) => ({ userId: t.id, name: t.name, email: t.email, role: Role.TECHNICAL })),
      emailData: {
        subject: `[Deliverable ${isApproved ? 'Approved' : 'Revision Required'}] ${deliverableTitle} (${projectNumber})`,
        badge: isApproved ? 'DELIVERABLE APPROVED' : 'REVISION REQUIRED',
        eventTitle: isApproved ? 'Deliverable Approved by Associate' : 'Deliverable Revision Requested',
        eventDescription: isApproved
          ? `Growth Associate ${bgaName} reviewed and approved deliverable "${deliverableTitle}" for client ${client.clientName}. It is now released for client presentation.`
          : `Growth Associate ${bgaName} has requested changes on deliverable "${deliverableTitle}". Please review notes and upload revised version.`,
        details: [
          { label: 'Project Reference', value: projectNumber },
          { label: 'Client Name', value: client.clientName },
          { label: 'Deliverable', value: deliverableTitle },
          { label: 'Reviewed By', value: bgaName },
        ],
        remarks: notes || undefined,
        remarksLabel: 'BGA Review Feedback',
        actionUrl: '/technical?tab=projects',
        actionText: 'Open Deliverable Workspace &rarr;',
      },
    });
  }

  /**
   * 13. Two-Way Project Message Exchange (BGA <-> Technical)
   */
  static async notifyProjectMessage(params: {
    projectNumber: string;
    client: { clientName: string };
    senderName: string;
    senderRole: string;
    messageContent: string;
    recipients: Array<{ id: string; name: string; email: string; role: string }>;
  }) {
    const { projectNumber, client, senderName, senderRole, messageContent, recipients } = params;

    const isFromBga = senderRole === Role.BGA;

    await NotificationService.dispatch({
      eventType: 'PROJECT_MESSAGE_EXCHANGE',
      title: isFromBga ? `New Message from BGA (${senderName})` : `New Message from Technical Team (${senderName})`,
      message: `${senderName} (${senderRole}) on project ${projectNumber} (${client.clientName}): "${messageContent.slice(0, 80)}..."`,
      type: 'INFO',
      link: isFromBga ? '/technical?tab=projects' : '/bga?tab=projects',
      recipients: recipients.map((r) => ({ userId: r.id, name: r.name, email: r.email, role: r.role })),
      emailData: {
        subject: `[Project Message] ${senderName} on ${projectNumber} (${client.clientName})`,
        badge: 'PROJECT DISCUSSION',
        eventTitle: `New Message from ${senderName}`,
        eventDescription: `${senderName} (${senderRole}) posted a project update or feedback on project ${projectNumber} for client ${client.clientName}.`,
        details: [
          { label: 'Project Number', value: projectNumber },
          { label: 'Client', value: client.clientName },
          { label: 'Sender', value: `${senderName} (${senderRole})` },
        ],
        remarks: messageContent,
        remarksLabel: 'Message Content',
        actionUrl: isFromBga ? '/technical?tab=projects' : '/bga?tab=projects',
        actionText: 'Reply in Project Discussion &rarr;',
      },
    });
  }

  /**
   * 14. Project Completed
   */
  static async notifyProjectCompleted(params: {
    projectNumber: string;
    workOrderNumber: string;
    client: { clientName: string };
    bga: { id: string; name: string; email: string };
    totalValue: number;
    completedBy: string;
  }) {
    const { projectNumber, workOrderNumber, client, bga, totalValue, completedBy } = params;

    // A. Notify BGA (Final payment follow-up required)
    await NotificationService.dispatch({
      eventType: 'PROJECT_COMPLETED_BGA',
      title: 'Project Completed – Final Payment Clearance Required',
      message: `Technical team completed project ${projectNumber} for ${client.clientName} (Value: ₹${totalValue.toLocaleString('en-IN')}). Please follow up with client for final settlement.`,
      type: 'ACTION_REQUIRED',
      link: '/bga?tab=projects',
      recipients: [{ userId: bga.id, name: bga.name, email: bga.email, role: Role.BGA }],
      emailData: {
        subject: `[Action Required] Project Completed: ${projectNumber} - Final Payment Follow-Up`,
        badge: 'PROJECT COMPLETED',
        eventTitle: 'Technical Execution Completed – Follow Up for Final Payment',
        eventDescription: `Technical team has achieved 100% completion on project ${projectNumber} for ${client.clientName}. Please coordinate with client to clear the remaining balance so commission can be released.`,
        details: [
          { label: 'Project Number', value: projectNumber },
          { label: 'Work Order', value: workOrderNumber },
          { label: 'Client Name', value: client.clientName },
          { label: 'Total Value', value: `₹${totalValue.toLocaleString('en-IN')}` },
        ],
        actionUrl: '/bga?tab=projects',
        actionText: 'Log Final Payment Follow-Up &rarr;',
      },
    });

    // B. Notify Accounts (Monitor final payment)
    await NotificationService.dispatch({
      eventType: 'PROJECT_COMPLETED_ACCOUNTS',
      title: 'Technical Project Completed – Final Payment Pending',
      message: `Project ${projectNumber} completed for ${client.clientName}. Total value: ₹${totalValue.toLocaleString('en-IN')}. Monitor final balance receipt.`,
      type: 'INFO',
      link: '/accounts?tab=work-orders',
      roles: [Role.ACCOUNTS, Role.ADMIN],
      emailData: {
        subject: `[Project Completed] ${projectNumber} (${client.clientName}) - Final Payment Monitoring`,
        badge: 'FINANCIAL MONITORING',
        eventTitle: 'Project Completed – Awaiting Final Balance Settlement',
        eventDescription: `Technical execution completed by ${completedBy} for project ${projectNumber}. Work order value ₹${totalValue.toLocaleString('en-IN')}.`,
        details: [
          { label: 'Project Reference', value: projectNumber },
          { label: 'Client Name', value: client.clientName },
          { label: 'Total Contract Value', value: `₹${totalValue.toLocaleString('en-IN')}` },
          { label: 'BGA Associate', value: bga.name },
        ],
        actionUrl: '/accounts?tab=work-orders',
        actionText: 'View Accounts Work Orders &rarr;',
      },
    });
  }

  /**
   * 15. Financial Income Entry Recorded in Accounts
   */
  static async notifyIncomeEntry(params: {
    source: string;
    amount: number;
    paymentMethod: string;
    reference: string;
    recordedBy: string;
    notes?: string | null;
  }) {
    const { source, amount, paymentMethod, reference, recordedBy, notes } = params;

    await NotificationService.dispatch({
      eventType: 'INCOME_ENTRY_RECORDED',
      title: 'New Financial Income Entry Recorded',
      message: `Accounts recorded income entry of ₹${amount.toLocaleString('en-IN')} (${source}, Ref: ${reference}) via ${paymentMethod}.`,
      type: 'INFO',
      link: '/accounts?tab=payments',
      roles: [Role.ACCOUNTS, Role.ADMIN],
      emailData: {
        subject: `[Financial Ledger] New Income Entry: ₹${amount.toLocaleString('en-IN')} (${source})`,
        badge: 'INCOME ENTRY',
        eventTitle: 'New Income Entry Recorded in Accounts Ledger',
        eventDescription: `A new revenue/income transaction was recorded by ${recordedBy} in the Atriowings commercial financial system.`,
        details: [
          { label: 'Income Source', value: source },
          { label: 'Amount', value: `₹${amount.toLocaleString('en-IN')}` },
          { label: 'Payment Mode', value: paymentMethod },
          { label: 'Reference / UTR', value: reference },
          { label: 'Recorded By', value: recordedBy },
        ],
        remarks: notes || undefined,
        remarksLabel: 'Ledger Description',
        actionUrl: '/accounts?tab=payments',
        actionText: 'Open Financial Ledger &rarr;',
      },
    });
  }

  /**
   * 16. Commission Payout Approved by Admin
   */
  static async notifyCommissionApproved(params: {
    commissionId: string;
    bga: { id: string; name: string; email: string };
    clientName: string;
    amount: number;
    approvedBy: string;
  }) {
    const { bga, clientName, amount, approvedBy } = params;

    // A. Notify BGA
    await NotificationService.dispatch({
      eventType: 'COMMISSION_PAYOUT_APPROVED',
      title: 'Commission Payout Authorized by Administration',
      message: `Your commission of ₹${amount.toLocaleString('en-IN')} for ${clientName} has been approved by ${approvedBy}. Accounts will process the bank transfer shortly.`,
      type: 'SUCCESS',
      link: '/bga?tab=earnings',
      recipients: [{ userId: bga.id, name: bga.name, email: bga.email, role: Role.BGA }],
      emailData: {
        subject: `Commission Approved: ₹${amount.toLocaleString('en-IN')} for ${clientName}`,
        badge: 'COMMISSION APPROVED',
        eventTitle: 'Commission Payout Approved & Authorized',
        eventDescription: `Congratulations! Your commission payout has been approved by administration and forwarded to the Accounts department for bank disbursement.`,
        details: [
          { label: 'Commission Amount', value: `₹${amount.toLocaleString('en-IN')}` },
          { label: 'Client / Deal', value: clientName },
          { label: 'Authorized By', value: approvedBy },
        ],
        actionUrl: '/bga?tab=earnings',
        actionText: 'View Earnings & Payout Status &rarr;',
      },
    });

    // B. Notify Accounts (Disburse Payout)
    await NotificationService.dispatch({
      eventType: 'COMMISSION_PAYOUT_READY_ACCOUNTS',
      title: 'Commission Payout Approved – Disbursement Required',
      message: `Admin authorized commission payout of ₹${amount.toLocaleString('en-IN')} to BGA ${bga.name}. Ready for bank disbursement.`,
      type: 'ACTION_REQUIRED',
      link: '/accounts?tab=commissions',
      roles: [Role.ACCOUNTS],
      emailData: {
        subject: `[Payout Queue] Disburse Commission: ₹${amount.toLocaleString('en-IN')} to ${bga.name}`,
        badge: 'PAYOUT DISBURSEMENT',
        eventTitle: 'Commission Payout Authorized – Bank Transfer Required',
        eventDescription: `Admin has approved commission payout for associate ${bga.name}. Please execute the NEFT/RTGS bank transfer and record the transaction reference.`,
        details: [
          { label: 'Payee Associate', value: bga.name },
          { label: 'Associate ID', value: bga.id },
          { label: 'Payable Amount', value: `₹${amount.toLocaleString('en-IN')}` },
          { label: 'Client Reference', value: clientName },
        ],
        actionUrl: '/accounts?tab=commissions',
        actionText: 'Process Bank Disbursement &rarr;',
      },
    });
  }

  /**
   * 17. Commission Payout Processed (Bank Transfer Completed)
   */
  static async notifyCommissionPaid(params: {
    bga: { id: string; name: string; email: string };
    clientName: string;
    amount: number;
    payoutRef: string;
    paymentMethod: string;
    processedBy: string;
  }) {
    const { bga, clientName, amount, payoutRef, paymentMethod, processedBy } = params;

    await NotificationService.dispatch({
      eventType: 'COMMISSION_PAID',
      title: 'Commission Disbursed to Your Bank Account',
      message: `Commission of ₹${amount.toLocaleString('en-IN')} for ${clientName} has been transferred to your registered bank account (Ref: ${payoutRef}).`,
      type: 'SUCCESS',
      link: '/bga?tab=earnings',
      recipients: [{ userId: bga.id, name: bga.name, email: bga.email, role: Role.BGA }],
      emailData: {
        subject: `Payment Credit: ₹${amount.toLocaleString('en-IN')} Transferred - Atriowings BGA Commission`,
        badge: 'COMMISSION TRANSFERRED',
        eventTitle: 'Commission Payout Successfully Transferred',
        eventDescription: `We have completed the bank transfer for your commission earnings. The funds have been credited to your verified bank account on file.`,
        details: [
          { label: 'Net Transferred Amount', value: `₹${amount.toLocaleString('en-IN')}` },
          { label: 'Client / Work Order', value: clientName },
          { label: 'Bank Transfer Ref / UTR', value: payoutRef },
          { label: 'Payment Mode', value: paymentMethod },
          { label: 'Disbursed By', value: processedBy },
        ],
        actionUrl: '/bga?tab=earnings',
        actionText: 'Download Commission Receipt &rarr;',
      },
    });
  }
}
