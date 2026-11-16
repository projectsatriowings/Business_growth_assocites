import { Router, Response } from 'express';
import { Role, ProjectStatus, MilestoneStatus, CommissionEligibility, WorkOrderStatus } from '@prisma/client';
import { prisma } from '../prisma';
import { authenticateJWT, authorizeRoles, AuthRequest, logAudit, createNotification } from '../middleware/auth';
import { appCache } from '../utils/cache';

const router = Router();
router.use(authenticateJWT);
router.use(authorizeRoles(Role.TECHNICAL, Role.ADMIN));

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
      select: {
        id: true,
        projectNumber: true,
        serviceCategory: true,
        approvedScope: true,
        status: true,
        progressPercentage: true,
        startDate: true,
        targetCompletionDate: true,
        completedAt: true,
        createdAt: true,
        client: {
          select: {
            id: true,
            clientName: true,
            businessName: true,
            location: true,
            businessCategory: true,
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
          orderBy: { createdAt: 'desc' },
        },
        feedback: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

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

// 4. Milestone Management
router.post('/projects/:id/milestones', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, targetDate } = req.body;

    const milestone = await prisma.projectMilestone.create({
      data: {
        projectId: id,
        title,
        description,
        targetDate: targetDate ? new Date(targetDate) : null,
        status: MilestoneStatus.TODO,
      },
    });

    res.status(201).json({ milestone });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create milestone' });
  }
});

router.put('/milestones/:milestoneId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { milestoneId } = req.params;
    const { status } = req.body;

    const milestone = await prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        status: status as MilestoneStatus,
        completedAt: status === MilestoneStatus.COMPLETED ? new Date() : null,
      },
    });

    res.json({ milestone });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update milestone' });
  }
});

// 5. Deliverables Submission
router.post('/projects/:id/deliverables', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, fileUrl, fileType, version } = req.body;

    const deliverable = await prisma.projectDeliverable.create({
      data: {
        projectId: id,
        title,
        description,
        fileUrl: fileUrl || '/sample-deliverable.zip',
        fileType: fileType || 'LINK',
        version: version || '1.0',
        uploadedById: req.user!.id,
      },
    });

    res.status(201).json({ deliverable });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add deliverable' });
  }
});

// 6. Correction Requests & Feedback Handling
router.post('/projects/:id/feedback', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { feedbackType, content } = req.body;

    const feedback = await prisma.projectFeedback.create({
      data: {
        projectId: id,
        feedbackType: feedbackType || 'CORRECTION_REQUEST',
        content,
        submittedById: req.user!.id,
        status: 'OPEN',
      },
    });

    // If it's a correction request, mark project as CORRECTION_REQUIRED
    if (feedbackType === 'CORRECTION_REQUEST') {
      await prisma.technicalProject.update({
        where: { id },
        data: { status: ProjectStatus.CORRECTION_REQUIRED },
      });
    }

    res.status(201).json({ feedback });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit feedback' });
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

