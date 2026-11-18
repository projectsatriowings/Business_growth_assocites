import { prisma } from '../prisma';

export async function hydrateQuotationVersions<T extends { id: string; previousVersionId?: string | null }>(
  quotations: T[]
): Promise<(T & { previousVersion?: any | null; supersededBy?: any | null })[]> {
  if (!quotations || quotations.length === 0) return quotations as any;

  const prevIds = Array.from(new Set(quotations.map((q) => q.previousVersionId).filter(Boolean) as string[]));
  const allCurrentIds = quotations.map((q) => q.id);

  const [prevQuotes, supersedingQuotes] = await Promise.all([
    prevIds.length > 0
      ? prisma.quotation.findMany({
          where: { id: { in: prevIds } },
          include: {
            client: true,
            bga: { select: { id: true, name: true, email: true, mobile: true } },
          },
        })
      : Promise.resolve([]),
    prisma.quotation.findMany({
      where: { previousVersionId: { in: allCurrentIds } },
      select: {
        id: true,
        quotationNumber: true,
        version: true,
        previousVersionId: true,
        status: true,
        totalAmount: true,
        serviceFee: true,
        createdAt: true,
      },
    }),
  ]);

  const prevMap = new Map<string, any>(prevQuotes.map((p: any) => [p.id, p]));
  const supersededMap = new Map<string, any>(supersedingQuotes.map((s: any) => [s.previousVersionId!, s]));

  return quotations.map((q) => {
    const prev = q.previousVersionId ? prevMap.get(q.previousVersionId) || null : null;
    const superseded = supersededMap.get(q.id) || null;
    return {
      ...q,
      previousVersion: prev,
      supersededBy: superseded,
    };
  });
}

