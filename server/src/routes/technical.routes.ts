import { Router, Response } from 'express';
import { Role, ProjectStatus, MilestoneStatus, CommissionEligibility, WorkOrderStatus } from '@prisma/client';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { authenticateJWT, authorizeRoles, AuthRequest, logAudit, createNotification } from '../middleware/auth';
import { appCache } from '../utils/cache';

const router = Router();
router.use(authenticateJWT);
router.use(authorizeRoles(Role.TECHNICAL, Role.ADMIN));

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

    const [
      totalProjects,
      readyToStart,
      inProgress,
      underReview,
      correctionRequired,
      completed,
    ] = await Promise.all([
      prisma.technicalProject.count(),
      prisma.technicalProject.count({ where: { status: ProjectStatus.READY_TO_START } }),
      prisma.technicalProject.count({ where: { status: ProjectStatus.IN_PROGRESS } }),
      prisma.technicalProject.count({ where: { status: ProjectStatus.UNDER_REVIEW } }),
      prisma.technicalProject.count({
        where: { status: ProjectStatus.CORRECTION_REQUIRED },
      }),
      prisma.technicalProject.count({ where: { status: ProjectStatus.COMPLETED } }),
    ]);

    const result = {
      total: totalProjects,
      readyToStart,
      inProgress,
      underReview,
      correctionRequired,
      completed,
    };

    appCache.set('technical:dashboard-stats', result, 20);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch technical stats' });
  }
});

// 2. Assigned Projects (Only authorized after Admin Handover Approval)
router.get('/projects', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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
            handoverApproved: true,
            handoverApprovedAt: true,
            handoverNotes: true,
            status: true,
            bgaId: true,
            bga: {
              select: {
                id: true,
                name: true,
                email: true,
                mobile: true,
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

    res.json({ projects });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load projects' });
  }
});

// 3. Start Execution / Update Project Status
router.put('/projects/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, progressPercentage, targetCompletionDate } = req.body;

    const project = await prisma.technicalProject.findUnique({
      where: { id },
      include: {
        workOrder: true,
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

      // Notify BGA, Accounts and Admin
      await createNotification(
        project.workOrder.bgaId,
        'Project Completed by Technical Team',
        `Project ${project.projectNumber} for ${project.client.clientName} has been marked COMPLETED.`,
        'SUCCESS',
        '/bga/projects'
      );

      const notifyUsers = await prisma.user.findMany({
        where: { role: { in: [Role.ACCOUNTS, Role.ADMIN] } },
      });

      for (const u of notifyUsers) {
        await createNotification(
          u.id,
          'Technical Project Completed',
          `Project ${project.projectNumber} for ${project.client.clientName} has been marked COMPLETED by Technical Team.`,
          'SUCCESS',
          '/accounts/work-orders'
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

    const feedback = await prisma.projectFeedback.findMany({
      where: { projectId: id },
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

    // Notify assigned BGA
    if (project.workOrder?.bgaId) {
      await createNotification(
        project.workOrder.bgaId,
        'Technical Team Replied to Project Feedback',
        `Technical team posted a response for project ${project.projectNumber} (${project.client.clientName}): "${content.slice(0, 70)}..."`,
        'INFO',
        '/bga/projects'
      );
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

