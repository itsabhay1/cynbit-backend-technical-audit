import { z } from 'zod';

/**
 * Enterprise Lead Capture Schema (`/contact` & `/bitelevate`)
 * Features:
 * - Invisible honeypot field (`website_fax_verification`) to drop automated bots
 * - Indian phone number format validation
 * - Business domain classification
 */
export const contactLeadSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name cannot exceed 80 characters')
    .trim(),
  email: z
    .string()
    .email('Invalid business email address')
    .toLowerCase()
    .trim(),
  phoneNumber: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number')
    .optional(),
  organization: z.string().max(100).optional().default('Individual / Candidate'),
  serviceVertical: z.enum([
    'AI_AUTOMATION',
    'AUTONOMOUS_AGENTS',
    'FULL_STACK_PLATFORMS',
    'CLOUD_ARCHITECTURE',
    'BITELEVATE_TRAINING',
    'GENERAL_INQUIRY',
  ]),
  message: z
    .string()
    .min(10, 'Message must contain at least 10 characters')
    .max(3000, 'Message cannot exceed 3,000 characters')
    .trim(),
  // Invisible honeypot trap: if this field is populated, request is discarded as bot traffic
  website_fax_verification: z
    .string()
    .max(0, 'Bot verification triggered')
    .optional(),
});

export type ContactLeadInput = z.infer<typeof contactLeadSchema>;
