import { z } from 'zod';

/**
 * CUID validation regex matching Prisma default CUID format (e.g., cjld2cjxh0000qzrmn831i7rn)
 */
export const cuidSchema = z
  .string()
  .min(20, 'Invalid token length')
  .max(32, 'Invalid token length')
  .regex(/^c[a-z0-9]+$/, 'Malformed capability token format');

/**
 * Assessment Submission Schema
 * Enforces valid public git repository URLs, sensible notes length, and token validation.
 */
export const submitAssessmentSchema = z.object({
  candidateToken: cuidSchema,
  repositoryUrl: z
    .string()
    .url('Must be a valid URL')
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return (
            (parsed.hostname === 'github.com' ||
              parsed.hostname === 'gitlab.com' ||
              parsed.hostname === 'bitbucket.org') &&
            parsed.pathname.split('/').filter(Boolean).length >= 2
          );
        } catch {
          return false;
        }
      },
      {
        message: 'Repository URL must point to a valid GitHub, GitLab, or Bitbucket repository',
      }
    ),
  technicalNotes: z
    .string()
    .max(5000, 'Technical notes cannot exceed 5,000 characters')
    .optional()
    .default(''),
});

export type SubmitAssessmentInput = z.infer<typeof submitAssessmentSchema>;

/**
 * Support Ticket Submission Schema
 */
export const submitSupportTicketSchema = z.object({
  candidateToken: cuidSchema,
  subject: z.string().min(5, 'Subject too short').max(150, 'Subject too long').trim(),
  message: z.string().min(10, 'Message too short').max(2500, 'Message too long').trim(),
  category: z.enum(['TECHNICAL_ISSUE', 'ASSESSMENT_QUERY', 'SUBMISSION_PORTAL', 'OTHER']),
});

export type SubmitSupportTicketInput = z.infer<typeof submitSupportTicketSchema>;

/**
 * Cashfree Payment Verification Schema
 */
export const verifyPaymentSchema = z.object({
  orderId: z.string().min(5).max(100),
  paymentId: z.string().min(5).max(100).optional(),
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
