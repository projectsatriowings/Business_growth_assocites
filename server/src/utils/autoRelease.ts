import { Role, ProjectStatus, ServiceCategoryType, WorkOrderStatus } from '@prisma/client';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { createNotification, logAudit } from '../middleware/auth';
import { appCache } from './cache';

export type TechnicalTeamType = 'SOFTWARE_DEVELOPMENT' | 'DIGITAL_MARKETING';

export interface TeamRoutingResult {
  team: TechnicalTeamType;
  teamName: string;
  portalPath: string;
}

/**
 * Resolves the appropriate Technical Team based on Service Category.
 * Route mapping:
 * - Website Development, Software Development, Mobile Application Development -> Software Development Team
 * - Digital Marketing -> Digital Marketing Team
 * - Unmapped -> null (requires Admin classification review)
 */
export function resolveTechnicalTeam(serviceCategory: string | null | undefined): TeamRoutingResult | null {
  if (!serviceCategory) return null;
  const normalized = serviceCategory.toUpperCase().trim();

  // 1. Software Development Team
  if (
    normalized === 'WEBSITE_DEVELOPMENT' ||
    normalized === 'SOFTWARE_DEVELOPMENT' ||
    normalized === 'MOBILE_APPLICATION_DEVELOPMENT' ||
    normalized === 'APPLICATION_DEVELOPMENT' ||
    normalized.includes('DEVELOPMENT') ||
    normalized.includes('SOFTWARE') ||
    normalized.includes('WEBSITE') ||
    normalized.includes('APP')
  ) {
    return {
      team: 'SOFTWARE_DEVELOPMENT',
      teamName: 'Software Development Team',
      portalPath: '/technical',
    };
  }

  // 2. Digital Marketing Team
  if (
    normalized === 'DIGITAL_MARKETING' ||
    normalized.includes('MARKETING') ||
    normalized.includes('SEO') ||
    normalized.includes('ADS')
  ) {
    return {
      team: 'DIGITAL_MARKETING',
      teamName: 'Digital Marketing Team',
      portalPath: '/technical',
    };
  }

  return null;
}

export interface AutoReleaseResult {
  released: boolean;
  reason?: string;
  alreadyReleased?: boolean;
  project?: any;
  team?: TechnicalTeamType;
  teamName?: string;
}

/**
 * Automatically releases and routes a work order to the appropriate Technical Team
 * immediately after required advance payment verification.
 *
 * Fully idempotent: repeated calls will not create duplicate projects, milestones, or notifications.
 */
export async function autoReleaseWorkOrderToTechnical(
  workOrderId: string,
  verifierUserId: string,
  ipAddress?: string
): Promise<AutoReleaseResult> {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      client: true,
      bga: true,
      quotation: true,
      project: {
        include: { milestones: true },
      },
      payments: true,
    },
  });

  if (!workOrder) {
    return { released: false, reason: 'WORK_ORDER_NOT_FOUND' };
  }

  // 1. Check if Work Order is on Hold
  if (workOrder.handoverStatus === 'ON_HOLD') {
    return { released: false, reason: 'WORK_ORDER_ON_HOLD' };
  }

  // 2. Check Advance Payment Fulfillment
  const verifiedAdvancePayments = workOrder.payments.filter(
    (p) => p.status === 'VERIFIED' && p.paymentType === 'ADVANCE'
  );
  const totalVerifiedAdvance = verifiedAdvancePayments.reduce((sum, p) => sum + p.amount, 0);

  if (totalVerifiedAdvance < workOrder.advanceRequired) {
    return {
      released: false,
      reason: 'INSUFFICIENT_ADVANCE',
    };
  }

  // 3. Resolve Responsible Technical Team
  const teamInfo = resolveTechnicalTeam(workOrder.serviceCategory);
  if (!teamInfo) {
    // Unmapped service category -> alert Admin for classification review
    const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
    for (const a of admins) {
      await createNotification(
        a.id,
        'Admin Classification Review Required',
        `Work order ${workOrder.workOrderNumber} (Service: "${workOrder.serviceCategory}") has no valid technical team mapping. Please review and assign a team.`,
        'ACTION_REQUIRED',
        '/admin/work-orders'
      );
    }
    return { released: false, reason: 'UNMAPPED_CATEGORY' };
  }

  // 4. Idempotency Check: if already released and project exists, return cleanly
  if (workOrder.handoverApproved && workOrder.project) {
    return {
      released: true,
      alreadyReleased: true,
      project: workOrder.project,
      team: teamInfo.team,
      teamName: teamInfo.teamName,
    };
  }

  // 5. Atomic Release & Project Routing via Database Transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update Work Order to in-production released status
    const updatedWo = await tx.workOrder.update({
      where: { id: workOrder.id },
      data: {
        advancePaid: totalVerifiedAdvance,
        advanceVerified: true,
        handoverApproved: true,
        handoverStatus: 'APPROVED',
        handoverApprovedAt: new Date(),
        handoverApprovedById: verifierUserId,
        handoverNotes: `Automatically released to ${teamInfo.teamName} upon advance verification`,
        status: WorkOrderStatus.IN_PRODUCTION,
      },
    });

    let project: any = workOrder.project;
    if (!project) {
      const projectNumber = `PRJ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;
      const clientAccessToken = `prj_${crypto.randomBytes(16).toString('hex')}`;

      project = await tx.technicalProject.create({
        data: {
          projectNumber,
          workOrderId: workOrder.id,
          clientId: workOrder.clientId,
          serviceCategory: workOrder.serviceCategory,
          approvedScope: workOrder.agreedScope || workOrder.quotation?.serviceScope || 'Standard approved project scope',
          status: ProjectStatus.READY_TO_START,
          progressPercentage: 0,
          startDate: new Date(),
          clientAccessToken,
        },
      });
    }

    return { updatedWo, project };
  });

  // 6. In-App Notifications (Technical, BGA, Admin)
  const techUsers = await prisma.user.findMany({ where: { role: Role.TECHNICAL } });
  for (const t of techUsers) {
    await createNotification(
      t.id,
      'New Project Ready to Start',
      `A new project has been automatically assigned to your team.\n• Work Order: ${workOrder.workOrderNumber}\n• Client: ${workOrder.client.clientName}\n• Service: ${workOrder.serviceCategory} (${teamInfo.teamName})\n• Status: Advance Payment Verified\n• Action: Open Project and Start Work`,
      'ACTION_REQUIRED',
      '/technical'
    );
  }

  // Notify BGA
  await createNotification(
    workOrder.bgaId,
    'Project Released to Technical Team',
    `Advance payment verified for ${workOrder.client.clientName}. Project ${workOrder.workOrderNumber} has been automatically routed to ${teamInfo.teamName} and is now active.`,
    'SUCCESS',
    '/bga'
  );

  // Notify Admin
  const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
  for (const a of admins) {
    await createNotification(
      a.id,
      'Work Order Automatically Released',
      `Work order ${workOrder.workOrderNumber} for ${workOrder.client.clientName} (${teamInfo.teamName}) was automatically released to Technical Team after advance verification.`,
      'INFO',
      '/admin/work-orders'
    );
  }

  // POLICY ENFORCED: Notify Technical Team members via in-app & registered email!
  const technicalUsers = await prisma.user.findMany({ where: { role: Role.TECHNICAL, status: 'ACTIVE' } });
  for (const tech of technicalUsers) {
    await createNotification(
      tech.id,
      'New Project Assigned to Technical Team',
      `Advance verified for ${workOrder.client.clientName}. Project ${result.project?.projectNumber || workOrder.workOrderNumber} (${teamInfo.teamName}) is now active for team assignment and milestone execution.`,
      'ACTION_REQUIRED',
      '/technical?tab=projects'
    );
  }

  // 7. Invalidate Caches
  appCache.invalidatePrefix('accounts:');
  appCache.invalidatePrefix('technical:');
  appCache.invalidatePrefix('admin:');
  appCache.invalidatePrefix('bga:');

  // 8. Log Audit
  await logAudit(
    verifierUserId,
    'accounts_verification_engine',
    Role.ACCOUNTS,
    'WORK_ORDER_AUTO_RELEASED_TO_TECHNICAL',
    'WORK_ORDER',
    workOrder.id,
    {
      workOrderNumber: workOrder.workOrderNumber,
      routedTeam: teamInfo.team,
      teamName: teamInfo.teamName,
      advancePaid: totalVerifiedAdvance,
      advanceRequired: workOrder.advanceRequired,
      projectNumber: result.project?.projectNumber || 'PRJ-AUTO',
    },
    ipAddress
  );

  return {
    released: true,
    project: result.project,
    team: teamInfo.team,
    teamName: teamInfo.teamName,
  };
}

/**
 * Startup / reconciliation runner to ensure advance-verified work orders
 * are not left unreleased.
 */
export async function reconcileEligibleWorkOrders(): Promise<number> {
  try {
    const unreleased = await prisma.workOrder.findMany({
      where: {
        advanceVerified: true,
        handoverStatus: { not: 'ON_HOLD' },
        OR: [
          { handoverApproved: false },
          { project: null },
        ],
      },
      select: { id: true, workOrderNumber: true },
    });

    if (unreleased.length === 0) return 0;

    let count = 0;
    // Fallback to first admin or system identifier for reconciliation verifier
    const adminUser = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
    const verifierId = adminUser ? adminUser.id : 'system-reconciliation';

    for (const wo of unreleased) {
      const res = await autoReleaseWorkOrderToTechnical(wo.id, verifierId);
      if (res.released) {
        count++;
      }
    }

    if (count > 0) {
      console.log(`[AutoRelease] Reconciled and automatically released ${count} work orders to Technical Team.`);
    }
    return count;
  } catch (err) {
    console.error('[AutoRelease] Reconciliation check error:', err);
    return 0;
  }
}
