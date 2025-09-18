import { z } from 'zod';

/**
 * Validation schemas for API endpoints
 * @notice Ensures type safety and data validation across the platform
 */

// Property schemas
export const CreatePropertySchema = z.object({
  name: z.string().min(1, 'Property name is required').max(255),
  valuationUSD: z.number().positive('Valuation must be positive'),
  totalShares: z.bigint().positive('Total shares must be positive'),
  sharePriceUSD: z.number().positive('Share price must be positive'),
  partitions: z.array(z.enum(['REG_D', 'REG_S'])).min(1, 'At least one partition is required'),
  lockups: z.record(z.string(), z.string()).refine(
    (lockups) => Object.keys(lockups).every(key => ['REG_D', 'REG_S'].includes(key)),
    'Lockups must only contain REG_D and REG_S keys'
  )
});

export const UpdatePropertySchema = CreatePropertySchema.partial();

// Investor schemas
export const InviteInvestorSchema = z.object({
  email: z.string().email('Invalid email address')
});

export const WhitelistInvestorSchema = z.object({
  propertyId: z.string().cuid('Invalid property ID'),
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  claims: z.object({
    countryCode: z.string().length(2, 'Country code must be 2 characters'),
    accredited: z.boolean(),
    lockupUntil: z.date().optional(),
    revoked: z.boolean(),
    expiresAt: z.date()
  })
});

// Transfer schemas
export const CreateTransferSchema = z.object({
  buyerEmail: z.string().email('Invalid buyer email').optional(),
  buyerWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid buyer wallet address').optional(),
  propertyId: z.string().cuid('Invalid property ID'),
  partition: z.enum(['REG_D', 'REG_S']),
  shares: z.bigint().positive('Shares must be positive'),
  pricePerShare: z.number().positive('Price per share must be positive')
});

export const ApproveTransferSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().optional()
});

export const SettlementProofSchema = z.object({
  settlementProof: z.string().min(1, 'Settlement proof is required'),
  onchainTxHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash').optional()
});

// Payout schemas
export const FundPayoutSchema = z.object({
  amountUSDC: z.number().positive('Amount must be positive')
});

export const DistributePayoutSchema = z.object({
  mode: z.enum(['FULL', 'PRO_RATA'])
});

// Webhook schemas
export const KYCWebhookSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  eventType: z.enum(['kyc_verified', 'kyc_rejected', 'accreditation_updated']),
  timestamp: z.string().datetime('Invalid timestamp'),
  data: z.object({
    wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
    countryCode: z.string().length(2, 'Country code must be 2 characters'),
    accredited: z.boolean(),
    lockupUntil: z.string().datetime('Invalid lockup date').optional(),
    revoked: z.boolean(),
    expiresAt: z.string().datetime('Invalid expiration date')
  })
});

// Pagination schemas
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Filter schemas
export const PropertyFilterSchema = PaginationSchema.extend({
  isActive: z.boolean().optional(),
  partitions: z.array(z.enum(['REG_D', 'REG_S'])).optional(),
  minValuation: z.number().optional(),
  maxValuation: z.number().optional()
});

export const TransferFilterSchema = PaginationSchema.extend({
  status: z.enum([
    'DRAFT',
    'KYC_PENDING',
    'READY_FOR_APPROVAL',
    'APPROVED',
    'SETTLED',
    'ONCHAIN_SETTLED',
    'CLOSED'
  ]).optional(),
  propertyId: z.string().cuid().optional(),
  partition: z.enum(['REG_D', 'REG_S']).optional()
});

export const PayoutFilterSchema = PaginationSchema.extend({
  status: z.enum(['PENDING', 'FUNDED', 'DISTRIBUTING', 'COMPLETED', 'FAILED']).optional(),
  propertyId: z.string().cuid().optional(),
  mode: z.enum(['FULL', 'PRO_RATA']).optional()
});

// Response schemas
export const PropertyResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  valuationUSD: z.number(),
  totalShares: z.string(), // BigInt as string
  sharePriceUSD: z.number(),
  partitions: z.array(z.string()),
  lockups: z.record(z.string(), z.string()),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const InvestorResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  wallet: z.string(),
  isWhitelisted: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const TransferResponseSchema = z.object({
  id: z.string(),
  sellerId: z.string(),
  buyerEmail: z.string().nullable(),
  buyerWallet: z.string().nullable(),
  propertyId: z.string(),
  partition: z.string(),
  shares: z.string(), // BigInt as string
  pricePerShare: z.number(),
  status: z.string(),
  kycStatus: z.string(),
  settlementProof: z.string().nullable(),
  onchainTxHash: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const PayoutResponseSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  snapshotId: z.string(),
  totalAmount: z.number(),
  distributedAmount: z.number(),
  residualAmount: z.number(),
  mode: z.string(),
  status: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Error response schema
export const ErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.object({
    reason: z.string().optional(),
    field: z.string().optional(),
    value: z.any().optional()
  }).optional()
});

// Success response schema
export const SuccessResponseSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  message: z.string().optional()
});

// Type exports
export type CreatePropertyRequest = z.infer<typeof CreatePropertySchema>;
export type UpdatePropertyRequest = z.infer<typeof UpdatePropertySchema>;
export type InviteInvestorRequest = z.infer<typeof InviteInvestorSchema>;
export type WhitelistInvestorRequest = z.infer<typeof WhitelistInvestorSchema>;
export type CreateTransferRequest = z.infer<typeof CreateTransferSchema>;
export type ApproveTransferRequest = z.infer<typeof ApproveTransferSchema>;
export type SettlementProofRequest = z.infer<typeof SettlementProofSchema>;
export type FundPayoutRequest = z.infer<typeof FundPayoutSchema>;
export type DistributePayoutRequest = z.infer<typeof DistributePayoutSchema>;
export type KYCWebhookRequest = z.infer<typeof KYCWebhookSchema>;
export type PaginationQuery = z.infer<typeof PaginationSchema>;
export type PropertyFilter = z.infer<typeof PropertyFilterSchema>;
export type TransferFilter = z.infer<typeof TransferFilterSchema>;
export type PayoutFilter = z.infer<typeof PayoutFilterSchema>;
export type PropertyResponse = z.infer<typeof PropertyResponseSchema>;
export type InvestorResponse = z.infer<typeof InvestorResponseSchema>;
export type TransferResponse = z.infer<typeof TransferResponseSchema>;
export type PayoutResponse = z.infer<typeof PayoutResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
