import crypto from 'crypto';

/**
 * HMAC verification utility for webhook security
 * @notice Verifies webhook signatures to ensure authenticity and prevent tampering
 */
export class HMACVerifier {
  private readonly secret: string;

  constructor(secret: string) {
    if (!secret || secret.length < 32) {
      throw new Error('HMAC secret must be at least 32 characters long');
    }
    this.secret = secret;
  }

  /**
   * Verifies HMAC signature of webhook payload
   * @param payload Raw request body
   * @param signature HMAC signature from header
   * @param algorithm Hash algorithm (default: sha256)
   * @returns True if signature is valid
   */
  verify(
    payload: string | Buffer,
    signature: string,
    algorithm: string = 'sha256'
  ): boolean {
    try {
      const expectedSignature = this.generateSignature(payload, algorithm);
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('HMAC verification failed:', error);
      return false;
    }
  }

  /**
   * Generates HMAC signature for payload
   * @param payload Raw request body
   * @param algorithm Hash algorithm
   * @returns Hex-encoded signature
   */
  generateSignature(
    payload: string | Buffer,
    algorithm: string = 'sha256'
  ): string {
    const hmac = crypto.createHmac(algorithm, this.secret);
    hmac.update(payload);
    return hmac.digest('hex');
  }

  /**
   * Verifies webhook signature from common header formats
   * @param payload Raw request body
   * @param headers Request headers
   * @param vendor Webhook vendor (alloy, parallel, etc.)
   * @returns True if signature is valid
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    headers: Record<string, string>,
    vendor: string
  ): boolean {
    const signatureHeader = this.getSignatureHeader(vendor);
    const signature = headers[signatureHeader];

    if (!signature) {
      console.error(`Missing signature header: ${signatureHeader}`);
      return false;
    }

    return this.verify(payload, signature);
  }

  /**
   * Gets the appropriate signature header for a vendor
   * @param vendor Webhook vendor
   * @returns Header name for signature
   */
  private getSignatureHeader(vendor: string): string {
    const headers: Record<string, string> = {
      alloy: 'x-alloy-signature',
      parallel: 'x-parallel-signature',
      default: 'x-webhook-signature'
    };

    return headers[vendor.toLowerCase()] || headers.default;
  }
}

/**
 * Webhook payload validation interface
 */
export interface WebhookPayload {
  eventId: string;
  eventType: string;
  timestamp: string;
  data: Record<string, any>;
}

/**
 * KYC webhook payload structure
 */
export interface KYCWebhookPayload extends WebhookPayload {
  eventType: 'kyc_verified' | 'kyc_rejected' | 'accreditation_updated';
  data: {
    wallet: string;
    countryCode: string;
    accredited: boolean;
    lockupUntil?: string;
    revoked: boolean;
    expiresAt: string;
    [key: string]: any;
  };
}

/**
 * Validates webhook payload structure
 * @param payload Raw webhook payload
 * @returns Validated payload or null if invalid
 */
export function validateWebhookPayload(
  payload: any
): KYCWebhookPayload | null {
  try {
    // Basic structure validation
    if (!payload.eventId || !payload.eventType || !payload.data) {
      return null;
    }

    // KYC-specific validation
    if (payload.eventType.startsWith('kyc_') || payload.eventType === 'accreditation_updated') {
      const data = payload.data;
      if (!data.wallet || !data.countryCode || typeof data.accredited !== 'boolean') {
        return null;
      }

      return payload as KYCWebhookPayload;
    }

    return null;
  } catch (error) {
    console.error('Webhook payload validation failed:', error);
    return null;
  }
}
