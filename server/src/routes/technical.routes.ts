import { Router, Response } from 'express';
import { Role, ProjectStatus, MilestoneStatus, CommissionEligibility, WorkOrderStatus } from '@prisma/client';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { authenticateJWT, authorizeRoles, AuthRequest, logAudit, createNotification } from '../middleware/auth';
import { appCache } from '../utils/cache';

const router = Router();
router.use(authenticateJWT);
router.use(authorizeRoles(Role.TECHNICAL, Role.ADMIN, Role.BGA));

// ============================================================================
// AUTOMATIC MILESTONE PROGRESS RECALCULATION HELPER
// Progress = (Sum of weights of completed milestones / Total milestone weights) * 100
// ============================================================================
export async function recalculateProjectProgress(projectId: string): Promise<number> {
  const milestones = await prisma.projectMilestone.findMany({ where: { projectId } });
  if (milestones.length === 0) return 0;

  const totalWeight = milestones.reduce((sum, m) => sum + (m.weight || 1), 0);
  const completedWeight = milestones
    .filter((m) => m.status === MilestoneStatus.COMPLETED)
    .reduce((sum, m) => sum + (m.weight || 1), 0);

  const percentage = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

  const project = await prisma.technicalProject.findUnique({
    where: { id: projectId },
  });

  if (project) {
    let newStatus: ProjectStatus = project.status;
    if (percentage === 100 && project.status !== ProjectStatus.COMPLETED) {
      newStatus = ProjectStatus.UNDER_REVIEW;
    } else if (percentage > 0 && project.status === ProjectStatus.READY_TO_START) {
      newStatus = ProjectStatus.IN_PROGRESS;
    }

    await prisma.technicalProject.update({
      where: { id: projectId },
      data: {
        progressPercentage: percentage,
        status: newStatus,
      },
    });

    appCache.invalidatePrefix('technical:');
    appCache.invalidatePrefix('admin:');
    appCache.invalidatePrefix('bga:');
  }

  return percentage;
}

// 1. Technical Dashboard Stats (Optimized with Promise.all & cache)
router.get('/dashboard-stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cached = appCache.get('technical:dashboard-stats');
    if (cached) {
      res.json(cached);
      return;
    }

    const now = new Date();
    const months: { label: string; yearMonth: string; start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = start.toLocaleString('en-US', { month: 'short' });
      months.push({ label, yearMonth: `${label} ${start.getFullYear()}`, start, end });
    }
    const sixMonthsAgo = months[0].start;

    const [
      totalProjects,
      readyToStart,
      inProgress,
      underReview,
      correctionRequired,
      completed,
      categoryStats,
      totalMilestones,
      completedMilestones,
      inProgressMilestones,
      underReviewMilestones,
      recentProjects,
      activeProjectsList,
    ] = await Promise.all([
      prisma.technicalProject.count(),
      prisma.technicalProject.count({ where: { status: ProjectStatus.READY_TO_START } }),
      prisma.technicalProject.count({ where: { status: ProjectStatus.IN_PROGRESS } }),
      prisma.technicalProject.count({ where: { status: ProjectStatus.UNDER_REVIEW } }),
      prisma.technicalProject.count({
        where: { status: ProjectStatus.CORRECTION_REQUIRED },
      }),
      prisma.technicalProject.count({ where: { status: ProjectStatus.COMPLETED } }),
      // Category Breakdown
      prisma.technicalProject.groupBy({
        by: ['serviceCategory'],
        _count: { id: true },
      }),
      // Milestones
      prisma.projectMilestone.count(),
      prisma.projectMilestone.count({ where: { status: MilestoneStatus.COMPLETED } }),
      prisma.projectMilestone.count({ where: { status: MilestoneStatus.IN_PROGRESS } }),
      prisma.projectMilestone.count({ where: { status: MilestoneStatus.TODO } }),
      // Last 6 months projects for trend
      prisma.technicalProject.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { status: true, createdAt: true, updatedAt: true },
      }),
      // Active project list
      prisma.technicalProject.findMany({
        where: { status: { in: [ProjectStatus.READY_TO_START, ProjectStatus.IN_PROGRESS, ProjectStatus.UNDER_REVIEW, ProjectStatus.CORRECTION_REQUIRED] } },
        take: 6,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          projectNumber: true,
          serviceCategory: true,
          status: true,
          progressPercentage: true,
          updatedAt: true,
          client: { select: { clientName: true, businessName: true } },
          _count: {
            select: { milestones: true, deliverables: true },
          },
        },
      }),
    ]);

    // Monthly velocity
    const monthlyVelocity = months.map((m) => {
      const initiated = recentProjects.filter((p) => p.createdAt >= m.start && p.createdAt < m.end).length;
      const completedCount = recentProjects.filter((p) => p.status === ProjectStatus.COMPLETED && p.updatedAt >= m.start && p.updatedAt < m.end).length;
      return {
        month: m.label,
        yearMonth: m.yearMonth,
        initiated,
        completed: completedCount,
      };
    });

    const categoryBreakdown = categoryStats.map((c) => ({
      category: c.serviceCategory,
      count: c._count.id,
      percentage: totalProjects > 0 ? Math.round((c._count.id / totalProjects) * 100) : 0,
    }));

    const result = {
      total: totalProjects,
      readyToStart,
      inProgress,
      underReview,
      correctionRequired,
      completed,
      categoryBreakdown,
      milestoneHealth: {
        total: totalMilestones,
        completed: completedMilestones,
        inProgress: inProgressMilestones,
        underReview: underReviewMilestones,
        completionRate: totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0,
      },
      monthlyVelocity,
      activeProjectsList: activeProjectsList.map((p) => ({
        id: p.id,
        projectNumber: p.projectNumber,
        serviceCategory: p.serviceCategory,
        status: p.status,
        progressPercentage: p.progressPercentage,
        clientName: p.client?.clientName || 'Client',
        businessName: p.client?.businessName || '',
        milestonesCount: p._count.milestones,
        deliverablesCount: p._count.deliverables,
        updatedAt: p.updatedAt,
      })),
    };

    appCache.set('technical:dashboard-stats', result, 20);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch technical stats' });
  }
});

// 2. Assigned Projects (Auto-routed following Advance Payment Verification)
router.get('/projects', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { team } = req.query;

    const projects = await prisma.technicalProject.findMany({
      where: {
        workOrder: {
          advanceVerified: true,
          handoverApproved: true,
        },
      },
      include: {
        client: {
          select: {
            id: true,
            clientName: true,
            businessName: true,
            location: true,
            businessCategory: true,
            mobile: true,
            email: true,
          },
        },
        workOrder: {
          select: {
            id: true,
            workOrderNumber: true,
            advanceVerified: true,
            advancePaid: true,
            advanceRequired: true,
            totalValue: true,
            handoverApproved: true,
            handoverApprovedAt: true,
            handoverNotes: true,
            status: true,
            agreedScope: true,
            bgaId: true,
            bga: {
              select: {
                id: true,
                name: true,
                email: true,
                mobile: true,
              },
            },
            quotation: {
              select: {
                id: true,
                quotationNumber: true,
                totalAmount: true,
                serviceScope: true,
                createdAt: true,
                enquiry: {
                  select: {
                    id: true,
                    requirements: true,
                    attachmentUrl: true,
                  },
                },
              },
            },
          },
        },
        assignedLead: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        milestones: {
          orderBy: { createdAt: 'asc' },
        },
        deliverables: {
          include: {
            milestone: {
              select: { id: true, title: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        feedback: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Ensure all active projects have a secure clientAccessToken for client portal access
    for (const prj of projects) {
      if (!prj.clientAccessToken) {
        const token = `prj_${crypto.randomBytes(16).toString('hex')}`;
        await prisma.technicalProject.update({
          where: { id: prj.id },
          data: { clientAccessToken: token },
        });
        (prj as any).clientAccessToken = token;
      }
    }

    let teamResolvedProjects = projects.map((p) => {
      const isMarketing = p.serviceCategory === 'DIGITAL_MARKETING';
      const assignedTeam = isMarketing ? 'DIGITAL_MARKETING' : 'SOFTWARE_DEVELOPMENT';
      const assignedTeamName = isMarketing ? 'Digital Marketing Team' : 'Software Development Team';
      return {
        ...p,
        assignedTeam,
        assignedTeamName,
      };
    });

    if (team && typeof team === 'string' && team !== 'ALL') {
      teamResolvedProjects = teamResolvedProjects.filter((p) => p.assignedTeam === team);
    }

    res.json({ projects: teamResolvedProjects });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load projects' });
  }
});

// 3. Start Execution / Update Project Status
router.put('/projects/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, progressPercentage, targetCompletionDate, assignedLeadId } = req.body;

    const project = await prisma.technicalProject.findUnique({
      where: { id },
      include: {
        workOrder: {
          include: { bga: true },
        },
        client: true,
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // ENFORCE: Project execution can only start if advance payment is verified AND Admin handover is approved
    if (!project.workOrder.advanceVerified || !project.workOrder.handoverApproved) {
      res.status(403).json({
        error: 'Execution Blocked: Project requires verified advance payment AND Admin Technical Handover authorization before work can proceed.',
      });
      return;
    }

    const updateData: any = {};
    if (status) updateData.status = status as ProjectStatus;
    if (progressPercentage !== undefined) updateData.progressPercentage = parseInt(progressPercentage);
    if (targetCompletionDate) updateData.targetCompletionDate = new Date(targetCompletionDate);

    // Lead assignment or reassignment handling
    if (assignedLeadId && assignedLeadId !== project.assignedLeadId) {
      updateData.assignedLeadId = assignedLeadId;
      const leadUser = await prisma.user.findUnique({ where: { id: assignedLeadId } });
      if (leadUser) {
        // POLICY ENFORCED: Technical Team members receive email + in-app notification!
        await createNotification(
          leadUser.id,
          'Project Lead Assignment',
          `You have been assigned as lead for project ${project.projectNumber} (${project.client.clientName}, ${project.serviceCategory}).`,
          'ACTION_REQUIRED',
          '/technical?tab=projects'
        );

        if (project.workOrder?.bgaId) {
          await createNotification(
            project.workOrder.bgaId,
            'Technical Lead Assigned to Project',
            `${leadUser.name} has been assigned as technical lead for project ${project.projectNumber} (${project.client.clientName}).`,
            'INFO',
            '/bga?tab=projects'
          );
        }
      }
    }

    if (status === ProjectStatus.IN_PROGRESS && !project.startDate) {
      updateData.startDate = new Date();
      // Update WorkOrder status
      await prisma.workOrder.update({
        where: { id: project.workOrderId },
        data: { status: WorkOrderStatus.IN_PRODUCTION },
      });

      // Notify BGA and Admin that project execution has officially started
      await createNotification(
        project.workOrder.bgaId,
        'Project Execution Started',
        `Technical team has started work on project ${project.projectNumber} for ${project.client.clientName}.`,
        'INFO',
        '/bga/projects'
      );

      const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
      for (const a of admins) {
        await createNotification(
          a.id,
          'Project Started by Technical Team',
          `Technical team has initiated execution for project ${project.projectNumber} (${project.client.clientName}).`,
          'INFO',
          '/admin/work-orders'
        );
      }
    }

    if (status === ProjectStatus.COMPLETED) {
      updateData.completedAt = new Date();
      updateData.progressPercentage = 100;

      // Update WorkOrder
      await prisma.workOrder.update({
        where: { id: project.workOrderId },
        data: { status: WorkOrderStatus.COMPLETED },
      });

      // Check if any commission was waiting for project completion
      const pendingCommissions = await prisma.commission.findMany({
        where: {
          workOrderId: project.workOrderId,
          eligibilityStatus: CommissionEligibility.PENDING_CRITERIA,
        },
      });

      for (const comm of pendingCommissions) {
        await prisma.commission.update({
          where: { id: comm.id },
          data: {
            projectId: project.id,
            eligibilityStatus: CommissionEligibility.ELIGIBLE,
            notes: `${comm.notes || ''} | Updated to ELIGIBLE on technical completion.`,
          },
        });
      }

      // Notify BGA, Accounts and Admin with complete structured details & direct links
      const bgaName = project.workOrder.bga?.name || 'Growth Associate';
      const woNum = project.workOrder.workOrderNumber;
      const totalVal = (project.workOrder.totalValue || 0).toLocaleString('en-IN');
      const serviceCat = project.serviceCategory;

      // 1. Notify Assigned BGA
      await createNotification(
        project.workOrder.bgaId,
        'Project Completed – Final Payment Follow-up Required',
        `Technical team completed project ${project.projectNumber} for ${project.client.clientName} (WO: ${woNum}, Value: ₹${totalVal}, Category: ${serviceCat}). Action required: Contact client regarding final payment clearance.`,
        'ACTION_REQUIRED',
        `/bga?tab=projects&projectId=${project.id}`
      );

      // 2. Notify Accounts Team
      const accountsUsers = await prisma.user.findMany({
        where: { role: Role.ACCOUNTS },
      });
      for (const acc of accountsUsers) {
        await createNotification(
          acc.id,
          'Project Completed – Final Payment Follow-up Required',
          `Technical team completed project ${project.projectNumber} for ${project.client.clientName} (BGA: ${bgaName}, WO: ${woNum}, Value: ₹${totalVal}). Action required: Monitor client final payment clearance.`,
          'ACTION_REQUIRED',
          `/accounts?tab=final-payments&projectId=${project.id}`
        );
      }

      // 3. Notify Admin Team
      const adminUsers = await prisma.user.findMany({
        where: { role: Role.ADMIN },
      });
      for (const adm of adminUsers) {
        await createNotification(
          adm.id,
          'Project Completed by Technical Team',
          `Project ${project.projectNumber} for ${project.client.clientName} (${serviceCat}) has been marked COMPLETED. Total Value: ₹${totalVal}. BGA: ${bgaName}.`,
          'INFO',
          `/admin?tab=technical&projectId=${project.id}`
        );
      }
    }

    const updated = await prisma.technicalProject.update({
      where: { id },
      data: updateData,
    });

    appCache.invalidatePrefix('technical:');
    appCache.invalidatePrefix('admin:');

    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'PROJECT_STATUS_UPDATE',
      'PROJECT',
      id,
      { previousStatus: project.status, newStatus: status, progressPercentage },
      req.ip
    );

    res.json({ message: 'Project status updated successfully', project: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project status' });
  }
});

// 4. Milestone Management (With Automatic Progress Recalculation)
router.post('/projects/:id/milestones', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, targetDate, weight } = req.body;

    const milestone = await prisma.projectMilestone.create({
      data: {
        projectId: id,
        title,
        description,
        weight: weight ? parseInt(weight) : 1,
        targetDate: targetDate ? new Date(targetDate) : null,
        status: MilestoneStatus.TODO,
      },
    });

    const recalculatedProgress = await recalculateProjectProgress(id);

    res.status(201).json({ milestone, progressPercentage: recalculatedProgress });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create milestone' });
  }
});

router.put('/milestones/:milestoneId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { milestoneId } = req.params;
    const { status, title, description, weight } = req.body;

    const existing = await prisma.projectMilestone.findUnique({
      where: { id: milestoneId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Milestone not found' });
      return;
    }

    const updateData: any = {};
    if (status) {
      updateData.status = status as MilestoneStatus;
      updateData.completedAt = status === MilestoneStatus.COMPLETED ? new Date() : null;
      updateData.completedById = status === MilestoneStatus.COMPLETED ? req.user!.id : null;
    }
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (weight !== undefined) updateData.weight = parseInt(weight);

    const milestone = await prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: updateData,
    });

    // AUTOMATIC PROGRESS RECALCULATION
    const recalculatedProgress = await recalculateProjectProgress(milestone.projectId);

    // Notify BGA and Admin if milestone was completed
    if (status === MilestoneStatus.COMPLETED && existing.status !== MilestoneStatus.COMPLETED) {
      const proj = await prisma.technicalProject.findUnique({
        where: { id: milestone.projectId },
        include: { client: true, workOrder: true },
      });
      if (proj && proj.workOrder?.bgaId) {
        await createNotification(
          proj.workOrder.bgaId,
          'Project Milestone Completed',
          `Milestone "${milestone.title}" for project ${proj.projectNumber} (${proj.client.clientName}) has been completed. Overall progress: ${recalculatedProgress}%.`,
          'SUCCESS',
          '/bga?tab=projects'
        );
      }
    }

    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'MILESTONE_STATUS_UPDATE',
      'PROJECT_MILESTONE',
      milestoneId,
      { title: milestone.title, status, recalculatedProgress },
      req.ip
    );

    res.json({ milestone, progressPercentage: recalculatedProgress });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update milestone' });
  }
});

router.delete('/milestones/:milestoneId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { milestoneId } = req.params;

    const existing = await prisma.projectMilestone.findUnique({
      where: { id: milestoneId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Milestone not found' });
      return;
    }

    await prisma.projectMilestone.delete({ where: { id: milestoneId } });
    const recalculatedProgress = await recalculateProjectProgress(existing.projectId);

    res.json({ message: 'Milestone removed', progressPercentage: recalculatedProgress });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete milestone' });
  }
});

// 5. Deliverables Submission (With Milestone Association & Version Tracking)
router.post('/projects/:id/deliverables', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, fileUrl, fileType, fileSize, version, milestoneId, previousVersionId } = req.body;

    const project = await prisma.technicalProject.findUnique({
      where: { id },
      include: { workOrder: true },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const deliverable = await prisma.projectDeliverable.create({
      data: {
        projectId: id,
        title,
        description,
        fileUrl: fileUrl || '/sample-deliverable.zip',
        fileType: fileType || 'LINK',
        fileSize: fileSize ? parseInt(fileSize) : null,
        version: version || '1.0',
        milestoneId: milestoneId || null,
        previousVersionId: previousVersionId || null,
        status: 'PENDING_BGA_REVIEW',
        isClientVisible: false,
        uploadedById: req.user!.id,
      },
      include: {
        milestone: {
          select: { id: true, title: true },
        },
      },
    });

    // Notify assigned BGA that deliverable is ready for review
    if (project.workOrder?.bgaId) {
      await createNotification(
        project.workOrder.bgaId,
        'Deliverable Ready for Review',
        `Technical team uploaded deliverable "${title}" (v${version || '1.0'}) for project ${project.projectNumber}. Please review and approve for client.`,
        'INFO',
        '/bga/projects'
      );
    }

    appCache.invalidatePrefix('technical:');
    appCache.invalidatePrefix('bga:');

    res.status(201).json({ deliverable });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add deliverable' });
  }
});

// 6. Unified Three-Way Feedback & Communication Thread
router.get('/projects/:id/feedback', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const project = await prisma.technicalProject.findUnique({
      where: { id },
      include: { workOrder: true },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (req.user!.role === Role.BGA && project.workOrder.bgaId !== req.user!.id) {
      res.status(403).json({ error: 'Unauthorized to view feedback for this project' });
      return;
    }

    const whereClause: any = { projectId: id };
    if (req.user!.role === Role.BGA) {
      whereClause.OR = [
        { visibility: { not: 'INTERNAL' } },
        { authorId: req.user!.id }
      ];
    }

    const feedback = await prisma.projectFeedback.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
    });

    res.json({ feedback });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load feedback' });
  }
});

router.post('/projects/:id/feedback', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { content, feedbackType, messageType, visibility, milestoneId, deliverableId, parentFeedbackId } = req.body;

    const project = await prisma.technicalProject.findUnique({
      where: { id },
      include: { client: true, workOrder: true },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (req.user!.role === Role.BGA && project.workOrder.bgaId !== req.user!.id) {
      res.status(403).json({ error: 'Unauthorized to post feedback for this project' });
      return;
    }

    const feedback = await prisma.projectFeedback.create({
      data: {
        projectId: id,
        content: content.trim(),
        authorId: req.user!.id,
        authorName: req.user!.name,
        authorRole: req.user!.role,
        messageType: messageType || 'TECHNICAL_REPLY',
        visibility: visibility || 'CLIENT_VISIBLE',
        feedbackType: feedbackType || 'TECHNICAL_RESPONSE',
        status: 'IN_PROGRESS',
        milestoneId: milestoneId || null,
        deliverableId: deliverableId || null,
        parentFeedbackId: parentFeedbackId || null,
      },
    });

    // Notify appropriate party based on author role
    if (req.user!.role === Role.BGA) {
      // BGA posted: notify Technical team & Admins
      const techUsers = await prisma.user.findMany({
        where: { role: { in: [Role.TECHNICAL, Role.ADMIN] } },
        select: { id: true },
      });
      for (const t of techUsers) {
        await createNotification(
          t.id,
          'New Client Feedback from BGA',
          `BGA ${req.user!.name} posted a message on project ${project.projectNumber} (${project.client.clientName}): "${content.slice(0, 70)}..."`,
          'INFO',
          `/technical?tab=projects&projectId=${project.id}`
        );
      }
    } else if (visibility !== 'INTERNAL' && project.workOrder?.bgaId) {
      // Technical/Admin posted: notify assigned BGA
      await createNotification(
        project.workOrder.bgaId,
        'Technical Team Replied to Project Feedback',
        `Technical team posted a response for project ${project.projectNumber} (${project.client.clientName}): "${content.slice(0, 70)}..."`,
        'INFO',
        '/bga?tab=work-orders'
      );
    } else if (visibility === 'INTERNAL') {
      // Internal note: strictly kept internal to Technical & Admin
      const internalRecipients = await prisma.user.findMany({
        where: { role: { in: [Role.TECHNICAL, Role.ADMIN] }, id: { not: req.user!.id } },
        select: { id: true },
      });
      for (const recipient of internalRecipients) {
        await createNotification(
          recipient.id,
          'Internal Project Note Recorded',
          `${req.user!.name} posted an internal note on project ${project.projectNumber}: "${content.slice(0, 70)}..."`,
          'INFO',
          `/technical?tab=projects&projectId=${project.id}`
        );
      }
    }

    appCache.invalidatePrefix('technical:');
    appCache.invalidatePrefix('bga:');

    res.status(201).json({ feedback });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

router.put('/feedback/:feedbackId/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { feedbackId } = req.params;
    const { status, responseNotes } = req.body;

    const feedback = await prisma.projectFeedback.update({
      where: { id: feedbackId },
      data: {
        status,
        responseNotes: responseNotes || undefined,
        resolvedAt: status === 'RESOLVED' || status === 'CONFIRMED_BY_CLIENT' ? new Date() : undefined,
      },
    });

    appCache.invalidatePrefix('technical:');
    appCache.invalidatePrefix('bga:');

    res.json({ feedback });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update feedback status' });
  }
});

router.put('/feedback/:feedbackId/resolve', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { feedbackId } = req.params;

    const feedback = await prisma.projectFeedback.update({
      where: { id: feedbackId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    });

    res.json({ feedback });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve feedback' });
  }
});

export default router;

