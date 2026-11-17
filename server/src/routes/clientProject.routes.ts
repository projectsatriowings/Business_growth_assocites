import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { createNotification, logAudit } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// ============================================================================
// PUBLIC / TOKEN-AUTHENTICATED CLIENT PORTAL API
// Provides secure, restricted access for clients to view their shared deliverables,
// milestone progress, and participate in project feedback without employee login.
// ============================================================================

// 1. Get Client Project by Secure Access Token
router.get('/project/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token || token.trim().length < 8) {
      res.status(400).json({ error: 'Valid project access token required' });
      return;
    }

    const project = await prisma.technicalProject.findFirst({
      where: { clientAccessToken: token },
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
        client: {
          select: {
            clientName: true,
            businessName: true,
            email: true,
            mobile: true,
            location: true,
          },
        },
        workOrder: {
          select: {
            workOrderNumber: true,
            totalValue: true,
            advanceVerified: true,
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
        milestones: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            weight: true,
            completedAt: true,
            targetDate: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        // STRICT SECURITY: Clients only see deliverables explicitly approved & shared with them!
        deliverables: {
          where: {
            isClientVisible: true,
            status: { in: ['SHARED_WITH_CLIENT', 'ACCEPTED_BY_CLIENT', 'CLIENT_VIEWED'] },
          },
          select: {
            id: true,
            title: true,
            description: true,
            fileUrl: true,
            fileType: true,
            fileSize: true,
            version: true,
            status: true,
            createdAt: true,
            milestone: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        // STRICT SECURITY: Clients only see CLIENT_VISIBLE feedback messages!
        feedback: {
          where: {
            visibility: 'CLIENT_VISIBLE',
          },
          select: {
            id: true,
            content: true,
            authorRole: true,
            authorName: true,
            messageType: true,
            status: true,
            responseNotes: true,
            milestoneId: true,
            deliverableId: true,
            createdAt: true,
            resolvedAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project access link is invalid, expired, or has been revoked.' });
      return;
    }

    res.json({ project });
  } catch (error: any) {
    console.error('Client Portal Project fetch error:', error);
    res.status(500).json({ error: 'Failed to retrieve project details' });
  }
});

// 2. Client Marks Deliverable as Viewed
router.post('/project/:token/deliverables/:deliverableId/view', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, deliverableId } = req.params;

    const project = await prisma.technicalProject.findFirst({
      where: { clientAccessToken: token },
      select: { id: true, workOrder: { select: { bgaId: true } }, projectNumber: true },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const deliverable = await prisma.projectDeliverable.findFirst({
      where: { id: deliverableId, projectId: project.id, isClientVisible: true },
    });

    if (!deliverable) {
      res.status(404).json({ error: 'Deliverable not found' });
      return;
    }

    const updated = await prisma.projectDeliverable.update({
      where: { id: deliverableId },
      data: {
        clientViewedAt: new Date(),
        status: deliverable.status === 'SHARED_WITH_CLIENT' ? 'CLIENT_VIEWED' : deliverable.status,
      },
    });

    // Notify BGA that client accessed the deliverable
    if (project.workOrder?.bgaId) {
      await createNotification(
        project.workOrder.bgaId,
        'Client Viewed Deliverable',
        `Client has viewed/accessed deliverable "${deliverable.title}" (v${deliverable.version}) for project ${project.projectNumber}.`,
        'INFO',
        '/bga/projects'
      );
    }

    res.json({ success: true, deliverable: updated });
  } catch (error: any) {
    console.error('Client deliverable view error:', error);
    res.status(500).json({ error: 'Failed to record deliverable view' });
  }
});

// 3. Client Submits Feedback / Change Request
router.post('/project/:token/feedback', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const { content, milestoneId, deliverableId } = req.body;

    if (!content || !content.trim()) {
      res.status(400).json({ error: 'Feedback content message is required.' });
      return;
    }

    const project = await prisma.technicalProject.findFirst({
      where: { clientAccessToken: token },
      include: {
        client: true,
        workOrder: true,
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Create client feedback record in the unified thread
    const feedback = await prisma.projectFeedback.create({
      data: {
        projectId: project.id,
        content: content.trim(),
        authorRole: 'CLIENT',
        authorName: project.client.clientName,
        messageType: 'CLIENT_FEEDBACK',
        visibility: 'CLIENT_VISIBLE',
        status: 'NEW',
        feedbackType: 'CLIENT_FEEDBACK',
        milestoneId: milestoneId || null,
        deliverableId: deliverableId || null,
      },
    });

    // Notify assigned BGA
    if (project.workOrder?.bgaId) {
      await createNotification(
        project.workOrder.bgaId,
        'New Client Feedback Received',
        `Client ${project.client.clientName} has posted feedback on project ${project.projectNumber}: "${content.trim().slice(0, 80)}..."`,
        'INFO',
        '/bga/projects'
      );
    }

    // Notify Technical Team Lead / Admins
    const techUsers = await prisma.user.findMany({
      where: { role: { in: [Role.TECHNICAL, Role.ADMIN] } },
    });
    for (const tech of techUsers) {
      await createNotification(
        tech.id,
        'Client Feedback Received',
        `Client ${project.client.clientName} submitted feedback on project ${project.projectNumber}.`,
        'INFO',
        '/technical'
      );
    }

    res.status(201).json({ message: 'Feedback submitted successfully.', feedback });
  } catch (error: any) {
    console.error('Client feedback submit error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

export default router;
