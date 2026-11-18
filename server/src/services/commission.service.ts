import { PrismaClient, ServiceCategoryType, CommissionEligibility, CommissionApproval, CommissionPayout } from '@prisma/client';

const prisma = new PrismaClient();

export interface ResolvedRate {
  rate: number;
  source: 'PROJECT_OVERRIDE' | 'CLIENT_DEFAULT' | 'SYSTEM_DEFAULT';
  configId?: string;
}

/**
 * Resolves the applicable commission percentage according to strict business precedence:
 * 1. Project-specific commission rate (if configured and active)
 * 2. Client-level default commission rate (if configured and active)
 * 3. System-level default commission rate (configured in SystemSettings)
 *
 * If no valid rate exists, throws an error requiring Admin configuration.
 */
export async function resolveCommissionRate(
  clientId: string,
  projectId?: string | null,
  serviceCategory?: ServiceCategoryType | string | null
): Promise<ResolvedRate> {
  const now = new Date();

  // 1. Priority 1: Project-specific override
  if (projectId) {
    const projectConfig = await prisma.commissionRateConfig.findFirst({
      where: {
        projectId,
        status: 'ACTIVE',
        effectiveDate: { lte: now },
        OR: [{ expiryDate: null }, { expiryDate: { gte: now } }],
      },
    });

    if (projectConfig && typeof projectConfig.commissionPercentage === 'number' && projectConfig.commissionPercentage > 0) {
      return {
        rate: projectConfig.commissionPercentage,
        source: 'PROJECT_OVERRIDE',
        configId: projectConfig.id,
      };
    }
  }

  // 2. Priority 2: Client-level default rate
  const clientConfig = await prisma.commissionRateConfig.findFirst({
    where: {
      clientId,
      projectId: null,
      status: 'ACTIVE',
      effectiveDate: { lte: now },
      OR: [{ expiryDate: null }, { expiryDate: { gte: now } }],
    },
  });

  if (clientConfig && typeof clientConfig.commissionPercentage === 'number' && clientConfig.commissionPercentage > 0) {
    return {
      rate: clientConfig.commissionPercentage,
      source: 'CLIENT_DEFAULT',
      configId: clientConfig.id,
    };
  }

  // 3. Priority 3: System-level service category default
  let settingKey = 'website_commission_rate';
  const cat = String(serviceCategory || '').toUpperCase();
  if (cat.includes('DIGITAL_MARKETING') || cat.includes('MARKETING')) {
    settingKey = 'dm_commission_rate';
  } else if (cat.includes('MOBILE')) {
    settingKey = 'mobile_commission_rate';
  } else if (cat.includes('SOFTWARE')) {
    settingKey = 'software_commission_rate';
  }

  const categorySetting = await prisma.systemSetting.findUnique({ where: { key: settingKey } });
  if (categorySetting && !isNaN(parseFloat(categorySetting.value)) && parseFloat(categorySetting.value) > 0) {
    return {
      rate: parseFloat(categorySetting.value),
      source: 'SYSTEM_DEFAULT',
    };
  }

  const generalSetting = await prisma.systemSetting.findUnique({ where: { key: 'default_commission_rate' } });
  if (generalSetting && !isNaN(parseFloat(generalSetting.value)) && parseFloat(generalSetting.value) > 0) {
    return {
      rate: parseFloat(generalSetting.value),
      source: 'SYSTEM_DEFAULT',
    };
  }

  throw new Error('MISSING_COMMISSION_CONFIG: No valid commission rate configured for this project, client, or system. Admin configuration required.');
}

/**
 * Calculates the exact commissionable base and commission amount.
 * Ad spends, GST/taxes, and pass-throughs are strictly excluded.
 */
export function computeCommissionBaseAndAmount(
  serviceCategory: ServiceCategoryType | string,
  rate: number,
  params: {
    paymentAmount?: number;
    adBudgetAmount?: number;
    quotationServiceFee?: number;
    quotationDiscount?: number;
    totalValue?: number;
  }
): { commissionableAmount: number; calculatedCommission: number } {
  const cat = String(serviceCategory).toUpperCase();
  let commissionableAmount = 0;

  if (cat.includes('DIGITAL_MARKETING') || cat.includes('MARKETING')) {
    // Digital Marketing: base is payment amount strictly minus ad budget
    const pay = params.paymentAmount || 0;
    const adSpend = params.adBudgetAmount || 0;
    commissionableAmount = Math.max(0, pay - adSpend);
  } else {
    // Development Projects: base is verified service fee minus approved discounts
    if (params.quotationServiceFee !== undefined) {
      const fee = params.quotationServiceFee || 0;
      const discount = params.quotationDiscount || 0;
      commissionableAmount = Math.max(0, fee - discount);
    } else {
      commissionableAmount = params.totalValue || params.paymentAmount || 0;
    }
  }

  const calculatedCommission = Math.round(((commissionableAmount * rate) / 100) * 100) / 100;
  return { commissionableAmount, calculatedCommission };
}

export default {
  resolveCommissionRate,
  computeCommissionBaseAndAmount,
};
