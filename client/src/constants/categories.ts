export const BUSINESS_CATEGORIES = [
  'IT & Software',
  'Education & Training',
  'Healthcare & Medical',
  'Retail & E-commerce',
  'Manufacturing & Industrial',
  'Real Estate & Construction',
  'Finance & Banking',
  'Hospitality & Tourism',
  'Food & Restaurants',
  'Logistics & Transportation',
  'Media & Entertainment',
  'Professional Services',
  'Other',
] as const;

export type BusinessCategory = typeof BUSINESS_CATEGORIES[number];
