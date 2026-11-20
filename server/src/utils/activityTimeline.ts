import { prisma } from '../prisma';
import { Role, EnquiryStatus } from '@prisma/client';

export interface TimelineEvent {
  id: string;
  clientId: string;
  type: string;
  category:
    | 'ONBOARDING'
    | 'FOLLOW_UP'
    | 'ENQUIRY'
    | 'QUOTATION'
    | 'WORK_ORDER'
    | 'PAYMENT'
    | 'TECHNICAL'
    | 'COMMUNICATION'
    | 'DELIVERABLE'
    | 'COMMISSION';
  title: string;
  description: string;
  timestamp: string;
  authorName?: string;
  authorRole?: string;
  badgeLabel?: string;
  badgeColor?: string;
  status?: string;
  sourceType: string;
  sourceId: string;
  metadata?: Record<string, any>;
  parentFeedbackId?: string | null;
  replies?: TimelineEvent[];
}

export interface ActivityTimelineResponse {
  client: {
    id: string;
    clientName: string;
    businessName: string;
    mobile: string;
    email: string;
    status: string;
    bgaName?: string;
    bgaId?: string;
    createdAt: string;
  };
  events: TimelineEvent[];
  totalCount: number;
  upcomingFollowUps: {
    id: string;
    type: 'ENQUIRY_FOLLOW_UP' | 'CONTACT_FOLLOW_UP' | 'PAYMENT_EXPECTED' | 'QUOTATION_DECISION_PENDING';
    title: string;
    dueDate: string;
    notes?: string | null;
    referenceNumber?: string | null;
    status?: string | null;
  }[];
}

export async function getClientActivityTimeline(
  clientId: string,
  requestingUser: { id: string; role: Role; name?: string }
): Promise<ActivityTimelineResponse | null> {
  // 1. Fetch Client with Ownership Check
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      bga: { select: { id: true, name: true, email: true, mobile: true } },
    },
  });

  if (!client) {
    return null;
  }

  // Authorization Check
  if (requestingUser.role === Role.BGA && client.bgaId !== requestingUser.id) {
    throw new Error('UNAUTHORIZED_CLIENT_ACCESS');
  }

  // 2. Fetch all related entities in parallel
  const [
    contactActivities,
    enquiries,
    quotations,
    workOrders,
    commissions,
  ] = await Promise.all([
    prisma.contactActivity.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.enquiry.findMany({
      where: { clientId },
      include: {
        bga: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.quotation.findMany({
      where: { clientId },
      include: {
        bga: { select: { id: true, name: true } },
        reminders: {
          include: { bga: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { version: 'asc' },
    }),
    prisma.workOrder.findMany({
      where: { clientId },
      include: {
        payments: { orderBy: { createdAt: 'asc' } },
        project: {
          include: {
            milestones: { orderBy: { createdAt: 'asc' } },
            deliverables: { orderBy: { createdAt: 'desc' } },
            finalPaymentFollowUps: {
              include: { bga: { select: { id: true, name: true } } },
              orderBy: { createdAt: 'desc' },
            },
            feedback: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.commission.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const rawEvents: TimelineEvent[] = [];

  // ==========================================================================
  // CATEGORY A: CLIENT ONBOARDING
  // ==========================================================================
  rawEvents.push({
    id: `reg-${client.id}`,
    clientId: client.id,
    type: 'REGISTRATION',
    category: 'ONBOARDING',
    title: 'Client Onboarded & Registered',
    description: `Client '${client.clientName}' (${client.businessName}) registered under Associate account ${client.bga?.name || ''}.`,
    timestamp: client.createdAt.toISOString(),
    authorName: client.bga?.name || 'System',
    authorRole: 'BGA',
    badgeLabel: 'ONBOARDED',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    sourceType: 'CLIENT',
    sourceId: client.id,
  });

  // ==========================================================================
  // CATEGORY B: INITIAL CLIENT CONTACT & FOLLOW-UPS (DEDUPLICATED)
  // ==========================================================================
  // Phase 7 Canonical Rule:
  // Suppress mirrored ContactActivity records created by Payment and FinalPaymentFollowUp actions!
  for (const act of contactActivities) {
    const isMirroredPayment =
      act.outcome === 'ADVANCE_RECORDED' ||
      act.outcome === 'ADVANCE_VERIFIED' ||
      act.outcome === 'FINAL_PAYMENT_RECORDED' ||
      act.outcome === 'FINAL_PAYMENT_VERIFIED' ||
      act.outcome === 'PAYMENT_REJECTED' ||
      act.contactMethod === 'PAYMENT_RECEIPT' ||
      act.contactMethod === 'ACCOUNTS_VERIFICATION' ||
      act.contactMethod === 'ACCOUNTS_AUDIT';

    const isMirroredFinalPaymentFollowUp =
      act.outcome === 'PAYMENT_FOLLOW_UP' ||
      (act.discussionSummary && act.discussionSummary.startsWith('Final Payment Follow-up'));

    if (isMirroredPayment || isMirroredFinalPaymentFollowUp) {
      // Skip mirrored record to enforce canonical representation
      continue;
    }

    rawEvents.push({
      id: `act-${act.id}`,
      clientId: client.id,
      type: 'CONTACT_ACTIVITY',
      category: 'FOLLOW_UP',
      title: `Client Interaction (${act.contactMethod}) — ${act.outcome?.replace(/_/g, ' ') || 'Logged'}`,
      description: `${act.discussionSummary}${act.followUpNotes ? ` • Notes: ${act.followUpNotes}` : ''}${
        act.nextFollowUpDate
          ? ` • Next Follow-up: ${new Date(act.nextFollowUpDate).toLocaleDateString('en-IN')}`
          : ''
      }`,
      timestamp: act.createdAt.toISOString(),
      authorName: act.createdBy || client.bga?.name || 'BGA',
      authorRole: 'BGA',
      badgeLabel: act.outcome?.replace(/_/g, ' ') || 'LOGGED',
      badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
      sourceType: 'CONTACT_ACTIVITY',
      sourceId: act.id,
      metadata: {
        contactMethod: act.contactMethod,
        outcome: act.outcome,
        nextFollowUpDate: act.nextFollowUpDate?.toISOString(),
      },
    });
  }

  // ==========================================================================
  // CATEGORY C: ENQUIRY HISTORY
  // ==========================================================================
  for (const enq of enquiries) {
    // 1. Submission
    const hasInitialDiscussion = !!(enq.discussionNotes && enq.discussionNotes.trim());
    rawEvents.push({
      id: `enq-${enq.id}`,
      clientId: client.id,
      type: 'ENQUIRY_SUBMITTED',
      category: 'ENQUIRY',
      title: `Service Request: ${enq.serviceCategory.replace(/_/g, ' ')}`,
      description: `Requirements: ${enq.requirements.slice(0, 160)}${
        enq.requirements.length > 160 ? '...' : ''
      }${enq.expectedBudget ? ` • Expected Budget: ₹${Number(enq.expectedBudget).toLocaleString('en-IN')}` : ''}${
        hasInitialDiscussion ? ` • Discussion Notes: "${enq.discussionNotes!.trim()}"` : ''
      }`,
      timestamp: enq.createdAt.toISOString(),
      authorName: enq.bga?.name || client.bga?.name || 'BGA',
      authorRole: 'BGA',
      badgeLabel: 'ENQUIRY SUBMITTED',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      sourceType: 'ENQUIRY',
      sourceId: enq.id,
      metadata: {
        serviceCategory: enq.serviceCategory,
        expectedBudget: enq.expectedBudget,
        status: enq.status,
      },
    });

    // 2. Admin Review / Approval
    if (enq.status === 'APPROVED' && enq.reviewedAt) {
      rawEvents.push({
        id: `enq-app-${enq.id}`,
        clientId: client.id,
        type: 'ENQUIRY_APPROVED',
        category: 'ENQUIRY',
        title: `Enquiry Validated & Approved by Admin`,
        description: enq.adminNotes
          ? `Admin Remarks: "${enq.adminNotes}"`
          : 'Service requirements validated. Quotation preparation authorized.',
        timestamp: enq.reviewedAt.toISOString(),
        authorName: 'Admin Executive',
        authorRole: 'ADMIN',
        badgeLabel: 'APPROVED',
        badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        sourceType: 'ENQUIRY',
        sourceId: enq.id,
      });
    } else if (enq.status === 'REJECTED' && enq.reviewedAt) {
      rawEvents.push({
        id: `enq-rej-${enq.id}`,
        clientId: client.id,
        type: 'ENQUIRY_REJECTED',
        category: 'ENQUIRY',
        title: `Enquiry Rejection / Guidance from Admin`,
        description: enq.adminNotes
          ? `Reason: "${enq.adminNotes}"`
          : 'Enquiry scope or commercial feasibility returned by Admin.',
        timestamp: enq.reviewedAt.toISOString(),
        authorName: 'Admin Executive',
        authorRole: 'ADMIN',
        badgeLabel: 'REJECTED',
        badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
        sourceType: 'ENQUIRY',
        sourceId: enq.id,
      });
    }

    // 3. Enquiry Consultation Follow-up (Only if updated AFTER initial creation and not already logged in ContactActivity)
    const isUpdatedAfterCreation = enq.updatedAt && Math.abs(enq.updatedAt.getTime() - enq.createdAt.getTime()) > 30000;
    if (hasInitialDiscussion && isUpdatedAfterCreation) {
      const alreadyInContactActivity = contactActivities.some(
        (ca) => ca.followUpNotes?.includes(enq.discussionNotes!) || ca.discussionSummary?.includes(enq.discussionNotes!)
      );
      if (!alreadyInContactActivity) {
        rawEvents.push({
          id: `enq-consult-${enq.id}`,
          clientId: client.id,
          type: 'ENQUIRY_CONSULTATION',
          category: 'ENQUIRY',
          title: `Client Consultation & Feedback on Enquiry`,
          description: `Consultation Notes: "${enq.discussionNotes}"`,
          timestamp: enq.updatedAt.toISOString(),
          authorName: enq.bga?.name || client.bga?.name || 'BGA',
          authorRole: 'BGA',
          badgeLabel: 'CONSULTATION',
          badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
          sourceType: 'ENQUIRY',
          sourceId: enq.id,
        });
      }
    }
  }

  // ==========================================================================
  // CATEGORY D: QUOTATION HISTORY & REVISIONS
  // ==========================================================================
  for (const q of quotations) {
    const isApproved =
      q.adminApprovalStatus === 'APPROVED' ||
      q.status === 'ADMIN_APPROVED' ||
      q.status === 'SENT_TO_BGA' ||
      q.status === 'ACCEPTED';
    const isRejected = q.adminApprovalStatus === 'REJECTED' || q.status === 'REJECTED';
    const isAccepted = q.status === 'ACCEPTED' || !!q.acceptedAt;

    // 1. Quotation Generation
    if (q.status === 'REQUESTED') {
      rawEvents.push({
        id: `quote-req-${q.id}`,
        clientId: client.id,
        type: 'QUOTATION_REQUESTED',
        category: 'QUOTATION',
        title: `Official Quotation Requested from Accounts`,
        description: `Quotation drafting request for ${q.serviceCategory.replace(/_/g, ' ')} dispatched to Accounts Department following Admin enquiry approval. Awaiting commercial preparation.`,
        timestamp: q.createdAt.toISOString(),
        authorName: 'Admin Executive',
        authorRole: 'ADMIN',
        badgeLabel: 'AWAITING ACCOUNTS DRAFT',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
        sourceType: 'QUOTATION',
        sourceId: q.id,
        metadata: {
          quotationNumber: q.quotationNumber,
          version: q.version,
          status: q.status,
        },
      });
    } else {
      // Prepared by Accounts (Draft submitted to Admin or Approved)
      rawEvents.push({
        id: `quote-${q.id}`,
        clientId: client.id,
        type: 'QUOTATION_CREATED',
        category: 'QUOTATION',
        title: isApproved
          ? `Commercial Quotation ${q.quotationNumber} (v${q.version}) Approved & Released`
          : `Commercial Quotation ${q.quotationNumber} (v${q.version}) Drafted by Accounts`,
        description: `Contract Value: ₹${(q.totalAmount || 0).toLocaleString('en-IN')} (Advance: ₹${(
          q.advanceRequiredAmount || 0
        ).toLocaleString('en-IN')}) • Scope: ${q.serviceScope?.slice(0, 100) || 'Official scope'}`,
        timestamp: (q.updatedAt || q.createdAt).toISOString(),
        authorName: 'Accounts Department',
        authorRole: 'ACCOUNTS',
        badgeLabel: isApproved ? `APPROVED v${q.version}` : `DRAFT v${q.version}`,
        badgeColor: isApproved
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : 'bg-indigo-50 text-indigo-800 border-indigo-200',
        sourceType: 'QUOTATION',
        sourceId: q.id,
        metadata: {
          quotationNumber: q.quotationNumber,
          version: q.version,
          totalAmount: q.totalAmount,
          advanceRequiredAmount: q.advanceRequiredAmount,
        },
      });
    }

    // 2. Revision Notes if requested
    if (q.revisionNotes) {
      rawEvents.push({
        id: `quote-rev-${q.id}`,
        clientId: client.id,
        type: 'QUOTATION_REVISION_REQUESTED',
        category: 'QUOTATION',
        title: `Quotation Revision Feedback (v${q.version})`,
        description: `Feedback: "${q.revisionNotes}"`,
        timestamp: q.createdAt.toISOString(),
        authorName: client.bga?.name || 'BGA',
        authorRole: 'BGA',
        badgeLabel: 'REVISION REQUEST',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
        sourceType: 'QUOTATION',
        sourceId: q.id,
      });
    }

    // 3. Admin Approval / Rejection
    if (isApproved && q.adminReviewedAt) {
      rawEvents.push({
        id: `quote-app-${q.id}`,
        clientId: client.id,
        type: 'QUOTATION_APPROVED',
        category: 'QUOTATION',
        title: `Quotation ${q.quotationNumber} Approved by Admin`,
        description: q.adminNotes ? `Executive Sign-off: "${q.adminNotes}"` : 'Quotation verified and released to BGA for client presentation.',
        timestamp: q.adminReviewedAt.toISOString(),
        authorName: 'Admin Executive',
        authorRole: 'ADMIN',
        badgeLabel: 'ADMIN APPROVED',
        badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
        sourceType: 'QUOTATION',
        sourceId: q.id,
      });
    } else if (isRejected && q.adminReviewedAt) {
      rawEvents.push({
        id: `quote-rej-${q.id}`,
        clientId: client.id,
        type: 'QUOTATION_REJECTED',
        category: 'QUOTATION',
        title: `Quotation ${q.quotationNumber} Returned by Admin`,
        description: q.adminNotes ? `Admin Notes: "${q.adminNotes}"` : 'Quotation returned for price/scope correction.',
        timestamp: q.adminReviewedAt.toISOString(),
        authorName: 'Admin Executive',
        authorRole: 'ADMIN',
        badgeLabel: 'CORRECTION NEEDED',
        badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
        sourceType: 'QUOTATION',
        sourceId: q.id,
      });
    }

    // 4. Client Acceptance
    if (isAccepted && (q.acceptedAt || q.updatedAt)) {
      rawEvents.push({
        id: `quote-acc-${q.id}`,
        clientId: client.id,
        type: 'QUOTATION_ACCEPTED',
        category: 'QUOTATION',
        title: `Client Formally Accepted Quotation ${q.quotationNumber}`,
        description: q.clientAcceptanceNotes ? `Acceptance Notes: "${q.clientAcceptanceNotes}"` : 'Client accepted official commercial terms and authorized work order kickoff.',
        timestamp: (q.acceptedAt || q.updatedAt).toISOString(),
        authorName: q.bga?.name || client.bga?.name || 'BGA',
        authorRole: 'BGA',
        badgeLabel: 'CLIENT ACCEPTED',
        badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        sourceType: 'QUOTATION',
        sourceId: q.id,
      });
    }

    // 5. Reminders
    for (const rem of q.reminders) {
      rawEvents.push({
        id: `rem-${rem.id}`,
        clientId: client.id,
        type: 'QUOTATION_REMINDER',
        category: 'QUOTATION',
        title: `Quotation Preparation Reminder Sent`,
        description: rem.message || 'BGA followed up with Accounts Department on quotation status.',
        timestamp: rem.createdAt.toISOString(),
        authorName: rem.bga?.name || client.bga?.name || 'BGA',
        authorRole: 'BGA',
        badgeLabel: 'REMINDER',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
        sourceType: 'QUOTATION_REMINDER',
        sourceId: rem.id,
      });
    }
  }

  // ==========================================================================
  // CATEGORY E, F, G, H, I, J: WORK ORDERS, PAYMENTS, TECHNICAL & COMMUNICATION
  // ==========================================================================
  for (const wo of workOrders) {
    // 1. Work Order Creation
    rawEvents.push({
      id: `wo-${wo.id}`,
      clientId: client.id,
      type: 'WORK_ORDER_CREATED',
      category: 'WORK_ORDER',
      title: `Work Order ${wo.workOrderNumber} Generated`,
      description: `Contract Value: ₹${(wo.totalValue || 0).toLocaleString('en-IN')} • Advance Requirement: ₹${(
        wo.advanceRequired || 0
      ).toLocaleString('en-IN')}`,
      timestamp: wo.createdAt.toISOString(),
      authorName: 'System',
      authorRole: 'ACCOUNTS',
      badgeLabel: wo.status?.replace(/_/g, ' ') || 'ACTIVE',
      badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
      sourceType: 'WORK_ORDER',
      sourceId: wo.id,
      metadata: {
        workOrderNumber: wo.workOrderNumber,
        totalValue: wo.totalValue,
        advanceRequired: wo.advanceRequired,
      },
    });

    // 2. Advance Handover / Technical Release
    if (wo.advanceVerified && (wo.handoverApprovedAt || wo.updatedAt)) {
      rawEvents.push({
        id: `wo-release-${wo.id}`,
        clientId: client.id,
        type: 'WORK_ORDER_RELEASED',
        category: 'WORK_ORDER',
        title: `Technical Execution Authorized (${wo.workOrderNumber})`,
        description: wo.handoverNotes || 'Advance payment verified by Accounts. Handover authorized for Technical Department kickoff.',
        timestamp: (wo.handoverApprovedAt || wo.updatedAt).toISOString(),
        authorName: 'Accounts / Admin',
        authorRole: 'ACCOUNTS',
        badgeLabel: 'RELEASED TO TECHNICAL',
        badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        sourceType: 'WORK_ORDER',
        sourceId: wo.id,
      });
    }

    // ========================================================================
    // CATEGORY F: CANONICAL PAYMENT EVENTS
    // ========================================================================
    for (const p of wo.payments) {
      const isVerified = p.status === 'VERIFIED';
      const isRejected = p.status === 'REJECTED';

      rawEvents.push({
        id: `pay-${p.id}`,
        clientId: client.id,
        type: isVerified ? 'PAYMENT_VERIFIED' : isRejected ? 'PAYMENT_REJECTED' : 'PAYMENT_RECORDED',
        category: 'PAYMENT',
        title: `${p.paymentType} Payment ${isVerified ? 'Verified' : isRejected ? 'Rejected' : 'Recorded'}: ₹${(
          p.amount || 0
        ).toLocaleString('en-IN')}`,
        description: `Method: ${p.paymentMethod || 'BANK_TRANSFER'} • UTR: ${
          p.transactionReference || 'N/A'
        }${p.verificationNotes ? ` • Verification Note: "${p.verificationNotes}"` : ''}`,
        timestamp: (isVerified && p.verifiedAt ? p.verifiedAt : p.paymentDate || p.createdAt).toISOString(),
        authorName: 'Accounts Department',
        authorRole: 'ACCOUNTS',
        badgeLabel: isVerified ? 'PAYMENT VERIFIED' : isRejected ? 'REJECTED' : 'PENDING AUDIT',
        badgeColor: isVerified
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : isRejected
          ? 'bg-rose-50 text-rose-800 border-rose-200'
          : 'bg-amber-50 text-amber-800 border-amber-200',
        sourceType: 'PAYMENT',
        sourceId: p.id,
        metadata: {
          paymentType: p.paymentType,
          amount: p.amount,
          transactionReference: p.transactionReference,
          status: p.status,
          verifiedAt: p.verifiedAt?.toISOString(),
        },
      });
    }

    // ========================================================================
    // CATEGORY G: TECHNICAL PROJECT LIFECYCLE & MILESTONES
    // ========================================================================
    if (wo.project) {
      const prj = wo.project;

      // 1. Project Activation
      rawEvents.push({
        id: `prj-${prj.id}`,
        clientId: client.id,
        type: 'PROJECT_STARTED',
        category: 'TECHNICAL',
        title: `Technical Project Activated (${prj.projectNumber})`,
        description: `Technical execution initialized. Current progress: ${prj.progressPercentage || 0}%.`,
        timestamp: prj.createdAt.toISOString(),
        authorName: 'Technical Team',
        authorRole: 'TECHNICAL',
        badgeLabel: prj.status?.replace(/_/g, ' ') || 'IN PROGRESS',
        badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        sourceType: 'PROJECT',
        sourceId: prj.id,
        metadata: {
          projectNumber: prj.projectNumber,
          status: prj.status,
        },
      });

      // 2. Completed Milestones
      for (const m of prj.milestones) {
        if (m.status === 'COMPLETED' && (m.completedAt || m.createdAt)) {
          rawEvents.push({
            id: `mile-${m.id}`,
            clientId: client.id,
            type: 'MILESTONE_COMPLETED',
            category: 'TECHNICAL',
            title: `Technical Milestone Completed: ${m.title}`,
            description: m.description ? `Milestone: "${m.description}"` : 'Milestone marked completed by Technical Team.',
            timestamp: (m.completedAt || m.createdAt).toISOString(),
            authorName: 'Technical Team',
            authorRole: 'TECHNICAL',
            badgeLabel: 'MILESTONE COMPLETE',
            badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
            sourceType: 'MILESTONE',
            sourceId: m.id,
          });
        }
      }

      // 3. Project Completed
      if (prj.status === 'COMPLETED' && (prj.completedAt || prj.updatedAt)) {
        rawEvents.push({
          id: `prj-comp-${prj.id}`,
          clientId: client.id,
          type: 'PROJECT_COMPLETED',
          category: 'TECHNICAL',
          title: `Technical Project Execution Completed (${prj.projectNumber})`,
          description: 'All technical deliverables and project milestones completed. Handover authorized for client final settlement.',
          timestamp: (prj.completedAt || prj.updatedAt).toISOString(),
          authorName: 'Technical Team Lead',
          authorRole: 'TECHNICAL',
          badgeLabel: '100% COMPLETED',
          badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          sourceType: 'PROJECT',
          sourceId: prj.id,
          metadata: {
            projectNumber: prj.projectNumber,
          },
        });
      }

      // ======================================================================
      // CATEGORY H: PROJECT COMMUNICATION (ProjectFeedback)
      // ======================================================================
      for (const f of prj.feedback) {
        // Enforce Phase 5 Visibility Rule: Hide internal notes from unauthorized users
        if (f.visibility === 'INTERNAL' && requestingUser.role !== Role.ADMIN && requestingUser.role !== Role.TECHNICAL && requestingUser.role !== Role.BGA) {
          continue;
        }

        const isTechnical = f.authorRole === 'TECHNICAL' || f.messageType === 'TECHNICAL_REPLY';
        const isBga = f.authorRole === 'BGA' || f.messageType === 'BGA_REPRESENTATIVE';

        rawEvents.push({
          id: `msg-${f.id}`,
          clientId: client.id,
          type: 'PROJECT_FEEDBACK',
          category: 'COMMUNICATION',
          title: isTechnical
            ? `Technical Team Reply (${prj.projectNumber})`
            : isBga
            ? `BGA Communication on behalf of Client`
            : `Client Feedback & Revision Request`,
          description: f.content,
          timestamp: f.createdAt.toISOString(),
          authorName: f.authorName || (isTechnical ? 'Engineering Team' : client.bga?.name || 'BGA'),
          authorRole: f.authorRole || (isTechnical ? 'TECHNICAL' : 'BGA'),
          badgeLabel: f.visibility === 'INTERNAL' ? 'INTERNAL NOTE' : isTechnical ? 'TECH REPLY' : 'CLIENT FEEDBACK',
          badgeColor: f.visibility === 'INTERNAL'
            ? 'bg-purple-50 text-purple-800 border-purple-200'
            : isTechnical
            ? 'bg-blue-50 text-blue-800 border-blue-200'
            : 'bg-indigo-50 text-indigo-800 border-indigo-200',
          sourceType: 'PROJECT_FEEDBACK',
          sourceId: f.id,
          parentFeedbackId: f.parentFeedbackId || null,
          metadata: {
            feedbackType: f.feedbackType,
            messageType: f.messageType,
            visibility: f.visibility,
          },
        });
      }

      // ======================================================================
      // CATEGORY I: DELIVERABLES AND DOCUMENTS (ProjectDeliverable)
      // ======================================================================
      for (const d of prj.deliverables) {
        // 1. Upload Event
        rawEvents.push({
          id: `deliv-${d.id}`,
          clientId: client.id,
          type: 'DELIVERABLE_UPLOADED',
          category: 'DELIVERABLE',
          title: `Technical Deliverable Uploaded (v${d.version}): ${d.title}`,
          description: `${d.description || 'Deliverable uploaded for review'}${
            d.fileUrl ? ` • File: ${d.fileType || 'Asset'}` : ''
          }`,
          timestamp: d.createdAt.toISOString(),
          authorName: 'Technical Team',
          authorRole: 'TECHNICAL',
          badgeLabel: `VERSION v${d.version}`,
          badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
          sourceType: 'DELIVERABLE',
          sourceId: d.id,
          metadata: {
            fileUrl: d.fileUrl,
            fileType: d.fileType,
            version: d.version,
            status: d.status,
            isClientVisible: d.isClientVisible,
          },
        });

        // 2. Deliverable Shared with Client
        if (d.bgaApprovalStatus === 'APPROVED' || d.status === 'SHARED_WITH_CLIENT' || d.isClientVisible) {
          rawEvents.push({
            id: `deliv-share-${d.id}`,
            clientId: client.id,
            type: 'DELIVERABLE_SHARED',
            category: 'DELIVERABLE',
            title: `Deliverable Approved & Shared with Client: ${d.title}`,
            description: d.bgaReviewNotes
              ? `BGA Review Notes: "${d.bgaReviewNotes}"`
              : 'Deliverable inspected, approved, and released for client review via Client Portal.',
            timestamp: d.createdAt.toISOString(),
            authorName: client.bga?.name || 'BGA',
            authorRole: 'BGA',
            badgeLabel: 'SHARED WITH CLIENT',
            badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
            sourceType: 'DELIVERABLE',
            sourceId: d.id,
            metadata: {
              fileUrl: d.fileUrl,
              version: d.version,
            },
          });
        }

        // 3. Client Viewed Deliverable
        if (d.clientViewedAt) {
          rawEvents.push({
            id: `deliv-view-${d.id}`,
            clientId: client.id,
            type: 'DELIVERABLE_CLIENT_VIEWED',
            category: 'DELIVERABLE',
            title: `Client Inspected Deliverable: ${d.title}`,
            description: `Client opened and viewed deliverable via secure client portal.`,
            timestamp: d.clientViewedAt.toISOString(),
            authorName: client.clientName,
            authorRole: 'CLIENT',
            badgeLabel: 'CLIENT VIEWED',
            badgeColor: 'bg-cyan-50 text-cyan-800 border-cyan-200',
            sourceType: 'DELIVERABLE',
            sourceId: d.id,
          });
        }
      }

      // ======================================================================
      // CATEGORY J: CANONICAL FINAL PAYMENT FOLLOW-UP (FinalPaymentFollowUp)
      // ======================================================================
      for (const fUp of prj.finalPaymentFollowUps) {
        rawEvents.push({
          id: `fup-${fUp.id}`,
          clientId: client.id,
          type: 'FINAL_PAYMENT_FOLLOWUP',
          category: 'FOLLOW_UP',
          title: `Final Payment Follow-up (${fUp.contactMethod}) — [${(fUp.status || 'CONTACTED').replace(/_/g, ' ')}]`,
          description: `${fUp.notes}${fUp.clientResponse ? ` • Response: "${fUp.clientResponse}"` : ''}${
            fUp.expectedPaymentDate
              ? ` • Promised Date: ${new Date(fUp.expectedPaymentDate).toLocaleDateString('en-IN')}`
              : ''
          }${fUp.expectedAmount ? ` • Promised Amount: ₹${Number(fUp.expectedAmount).toLocaleString('en-IN')}` : ''}`,
          timestamp: (fUp.followUpDate || fUp.createdAt).toISOString(),
          authorName: fUp.bga?.name || client.bga?.name || 'BGA',
          authorRole: 'BGA',
          badgeLabel: (fUp.status || 'FOLLOW-UP').replace(/_/g, ' '),
          badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
          sourceType: 'FINAL_PAYMENT_FOLLOWUP',
          sourceId: fUp.id,
          metadata: {
            contactMethod: fUp.contactMethod,
            status: fUp.status,
            expectedPaymentDate: fUp.expectedPaymentDate?.toISOString(),
            expectedAmount: fUp.expectedAmount,
          },
        });
      }
    }
  }

  // ==========================================================================
  // CATEGORY K: COMMISSION HISTORY
  // ==========================================================================
  if (requestingUser.role === Role.BGA || requestingUser.role === Role.ADMIN || requestingUser.role === Role.ACCOUNTS) {
    for (const comm of commissions) {
      // 1. Commission Calculated
      rawEvents.push({
        id: `comm-${comm.id}`,
        clientId: client.id,
        type: 'COMMISSION_CALCULATED',
        category: 'COMMISSION',
        title: `Associate Commission Calculated: ₹${(comm.calculatedCommission || 0).toLocaleString('en-IN')}`,
        description: `Rate: ${comm.commissionRate}% on commissionable base of ₹${(
          comm.commissionableAmount || 0
        ).toLocaleString('en-IN')} (${comm.billingType || 'PROJECT_BASED'}). Status: ${comm.approvalStatus}.`,
        timestamp: comm.createdAt.toISOString(),
        authorName: 'Commission Engine',
        authorRole: 'SYSTEM',
        badgeLabel: comm.approvalStatus?.replace(/_/g, ' ') || 'CALCULATED',
        badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
        sourceType: 'COMMISSION',
        sourceId: comm.id,
      });

      // 2. Commission Approved by Admin
      if (comm.approvalStatus === 'APPROVED' && comm.approvedAt) {
        rawEvents.push({
          id: `comm-app-${comm.id}`,
          clientId: client.id,
          type: 'COMMISSION_APPROVED',
          category: 'COMMISSION',
          title: `Commission Approved for Payout: ₹${(comm.calculatedCommission || 0).toLocaleString('en-IN')}`,
          description: `Executive approval verified. Handover to Accounts for bank payout disbursement.`,
          timestamp: comm.approvedAt.toISOString(),
          authorName: 'Admin Executive',
          authorRole: 'ADMIN',
          badgeLabel: 'APPROVED FOR PAYOUT',
          badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          sourceType: 'COMMISSION',
          sourceId: comm.id,
        });
      }

      // 3. Commission Paid
      if (comm.payoutStatus === 'PROCESSED' && comm.payoutDate) {
        rawEvents.push({
          id: `comm-paid-${comm.id}`,
          clientId: client.id,
          type: 'COMMISSION_PAID',
          category: 'COMMISSION',
          title: `Commission Payout Disbursed: ₹${(comm.calculatedCommission || 0).toLocaleString('en-IN')}`,
          description: `Transferred to verified associate bank account. Bank Ref / UTR: ${
            comm.payoutReference || 'Disbursed'
          }`,
          timestamp: comm.payoutDate.toISOString(),
          authorName: 'Accounts Department',
          authorRole: 'ACCOUNTS',
          badgeLabel: 'DISBURSED',
          badgeColor: 'bg-emerald-600 text-white border-emerald-700',
          sourceType: 'COMMISSION',
          sourceId: comm.id,
        });
      }
    }
  }

  // ==========================================================================
  // THREADING: Group ProjectFeedback replies by parentFeedbackId
  // ==========================================================================
  const eventMap = new Map<string, TimelineEvent>();
  for (const ev of rawEvents) {
    eventMap.set(ev.id, ev);
  }

  const rootEvents: TimelineEvent[] = [];
  for (const ev of rawEvents) {
    if (ev.parentFeedbackId) {
      const parentEvent = eventMap.get(`msg-${ev.parentFeedbackId}`);
      if (parentEvent) {
        if (!parentEvent.replies) {
          parentEvent.replies = [];
        }
        parentEvent.replies.push(ev);
        continue;
      }
    }
    rootEvents.push(ev);
  }

  // Sort Chronologically Descending (Latest first)
  rootEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // ==========================================================================
  // UPCOMING FOLLOW-UPS WIDGET DATA
  // ==========================================================================
  const now = new Date();
  const upcomingFollowUps: ActivityTimelineResponse['upcomingFollowUps'] = [];

  // Check Enquiry Follow-ups: Only active/pending enquiries awaiting consultation or revisions
  for (const enq of enquiries) {
    const isEnquiryActive =
      enq.status === EnquiryStatus.SUBMITTED ||
      enq.status === EnquiryStatus.UNDER_REVIEW ||
      enq.status === EnquiryStatus.CHANGES_REQUESTED;

    if (isEnquiryActive && enq.followUpDate && new Date(enq.followUpDate) >= now) {
      upcomingFollowUps.push({
        id: `up-enq-${enq.id}`,
        type: 'ENQUIRY_FOLLOW_UP',
        title: `Enquiry Consultation: ${enq.serviceCategory.replace(/_/g, ' ')}`,
        dueDate: enq.followUpDate.toISOString(),
        notes: enq.discussionNotes,
        referenceNumber: enq.id,
        status: enq.status,
      });
    }
  }

  // Check Quotations Awaiting Client Decision: Only Admin-approved quotes awaiting client acceptance
  for (const q of quotations) {
    const isAwaitingClient =
      (q.status === 'ADMIN_APPROVED' || q.status === 'SENT_TO_BGA' || q.adminApprovalStatus === 'APPROVED') &&
      q.status !== 'ACCEPTED' &&
      !q.acceptedAt;

    if (isAwaitingClient && q.validityDate && new Date(q.validityDate) >= now) {
      upcomingFollowUps.push({
        id: `up-quote-${q.id}`,
        type: 'QUOTATION_DECISION_PENDING',
        title: `Client Decision on Quotation: ${q.quotationNumber} (v${q.version})`,
        dueDate: q.validityDate.toISOString(),
        notes: `Total: ₹${(q.totalAmount || 0).toLocaleString('en-IN')}. Follow up with client for commercial sign-off and advance payment.`,
        referenceNumber: q.quotationNumber,
        status: q.status,
      });
    }
  }

  // Check Contact Activity Next Follow-ups: Scheduled callbacks/meetings
  for (const act of contactActivities) {
    if (act.nextFollowUpDate && new Date(act.nextFollowUpDate) >= now) {
      upcomingFollowUps.push({
        id: `up-act-${act.id}`,
        type: 'CONTACT_FOLLOW_UP',
        title: `Client Callback / Meeting (${act.contactMethod})`,
        dueDate: act.nextFollowUpDate.toISOString(),
        notes: act.followUpNotes || act.discussionSummary,
        status: act.outcome,
      });
    }
  }

  // Check Final Payment Follow-up Expected Dates: Only pending payments not yet collected/verified
  for (const wo of workOrders) {
    if (wo.project) {
      for (const fUp of wo.project.finalPaymentFollowUps) {
        const isPaymentPending = fUp.status !== 'COLLECTED' && fUp.status !== 'VERIFIED';
        if (isPaymentPending && fUp.expectedPaymentDate && new Date(fUp.expectedPaymentDate) >= now) {
          upcomingFollowUps.push({
            id: `up-fup-${fUp.id}`,
            type: 'PAYMENT_EXPECTED',
            title: `Expected Final Payment (${wo.project.projectNumber}): ₹${(fUp.expectedAmount || 0).toLocaleString(
              'en-IN'
            )}`,
            dueDate: fUp.expectedPaymentDate.toISOString(),
            notes: fUp.notes,
            referenceNumber: wo.project.projectNumber,
            status: fUp.status,
          });
        }
      }
    }
  }

  upcomingFollowUps.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return {
    client: {
      id: client.id,
      clientName: client.clientName,
      businessName: client.businessName,
      mobile: client.mobile,
      email: client.email,
      status: client.status,
      bgaName: client.bga?.name,
      bgaId: client.bgaId,
      createdAt: client.createdAt.toISOString(),
    },
    events: rootEvents,
    totalCount: rootEvents.length,
    upcomingFollowUps,
  };
}
