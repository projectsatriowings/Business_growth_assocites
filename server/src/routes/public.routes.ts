import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { appCache } from '../utils/cache';

const router = Router();

/**
 * Public Commission Ranges
 * Returns Admin-configured commission ranges by service category.
 * If a category has no configured range, returns null/empty so UI can display neutral text.
 */
router.get('/commission-ranges', async (req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = 'public:commission-ranges';
    const cached = appCache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    if (!(prisma as any).commissionRangeConfig) {
      res.json({ ranges: [], timestamp: new Date().toISOString() });
      return;
    }

    const ranges = await prisma.commissionRangeConfig.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { serviceCategory: 'asc' },
    });

    const responseData = {
      ranges: ranges.map((r) => ({
        serviceCategory: r.serviceCategory,
        minPercentage: r.minPercentage,
        maxPercentage: r.maxPercentage,
        displayRange: `${r.minPercentage}% – ${r.maxPercentage}%`,
        effectiveDate: r.effectiveDate,
      })),
      timestamp: new Date().toISOString(),
    };

    appCache.set(cacheKey, responseData, 300); // Cache for 5 minutes
    res.json(responseData);
  } catch (error: any) {
    console.error('Error fetching public commission ranges:', error);
    res.status(500).json({ error: 'Failed to fetch commission ranges' });
  }
});

export default router;
