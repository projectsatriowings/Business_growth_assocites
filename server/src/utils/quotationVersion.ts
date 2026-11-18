import { prisma } from '../prisma';

export async function hydrateQuotationVersions<T extends { id: string; previousVersionId?: string | null; enquiryId?: string }>(
  quotations: T[]
): Promise<(T & { previousVersion?: any | null; supersededBy?: any | null; versionHistory?: any[] })[]> {
  if (!quotations || quotations.length === 0) return quotations as any;

  const enquiryIds = Array.from(new Set(quotations.map((q: any) => q.enquiryId).filter(Boolean) as string[]));
  const prevIds = Array.from(new Set(quotations.map((q) => q.previousVersionId).filter(Boolean) as string[]));
  const allCurrentIds = quotations.map((q) => q.id);

  const [allEnquiryQuotations, prevQuotes, supersedingQuotes] = await Promise.all([
    enquiryIds.length > 0
      ? prisma.quotation.findMany({
          where: { enquiryId: { in: enquiryIds } },
          include: {
            client: true,
            bga: { select: { id: true, name: true, email: true, mobile: true } },
            reminders: { orderBy: { createdAt: 'asc' }, include: { bga: { select: { name: true } } } },
          },
          orderBy: { version: 'asc' },
        })
      : Promise.resolve([]),
    prevIds.length > 0
      ? prisma.quotation.findMany({
          where: { id: { in: prevIds } },
          include: {
            client: true,
            bga: { select: { id: true, name: true, email: true, mobile: true } },
            reminders: { orderBy: { createdAt: 'asc' }, include: { bga: { select: { name: true } } } },
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

  const historyByEnquiry = new Map<string, any[]>();
  for (const eq of allEnquiryQuotations) {
    if (!historyByEnquiry.has(eq.enquiryId)) {
      historyByEnquiry.set(eq.enquiryId, []);
    }
    historyByEnquiry.get(eq.enquiryId)!.push(eq);
  }

  const prevMap = new Map<string, any>(prevQuotes.map((p: any) => [p.id, p]));
  const supersededMap = new Map<string, any>(supersedingQuotes.map((s: any) => [s.previousVersionId!, s]));

  return quotations.map((q) => {
    const eqHistory = (q as any).enquiryId ? historyByEnquiry.get((q as any).enquiryId) || [] : [];
    const prev =
      eqHistory.find((h) => h.version === (q as any).version - 1) ||
      (q.previousVersionId ? prevMap.get(q.previousVersionId) || eqHistory.find((h) => h.id === q.previousVersionId) : null) ||
      null;

    const next =
      eqHistory.find((h) => h.version === (q as any).version + 1) ||
      supersededMap.get(q.id) ||
      eqHistory.find((h) => h.previousVersionId === q.id) ||
      null;

    const superseded = next
      ? {
          id: next.id,
          quotationNumber: next.quotationNumber,
          version: next.version,
          status: next.status,
          totalAmount: next.totalAmount,
        }
      : null;

    // Use enquiry history if available, otherwise synthesize
    const versionHistory = eqHistory.length > 0 ? eqHistory : prev ? [prev, q] : [q];

    return {
      ...q,
      previousVersion: prev,
      supersededBy: superseded,
      versionHistory,
    };
  });
}


