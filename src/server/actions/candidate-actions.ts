'use server';

import { createSafeAction } from '../lib/safe-action';
import {
  cuidSchema,
  submitAssessmentSchema,
  submitSupportTicketSchema,
  SubmitAssessmentInput,
  SubmitSupportTicketInput,
} from '../schemas/candidate.schema';
import { candidateSubmissionLimiter, supportTicketLimiter } from '../lib/rate-limiter';

/**
 * Mock database interface representing Prisma ORM Client
 */
interface CandidateRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  token: string;
  assessmentTitle: string;
  status: 'PENDING' | 'SUBMITTED' | 'UNDER_REVIEW';
  submissionUrl?: string;
  submittedAt?: Date;
}

// In-memory simulation of Prisma Candidate Table
const mockDb = new Map<string, CandidateRecord>([
  [
    'cmvxlxwlp000208l7tz276p4e',
    {
      id: 'usr_cmvxlxwlp000208',
      name: 'Abhay Agrawal',
      email: 'agabhay07@gmail.com',
      role: 'Backend Developer Intern',
      token: 'cmvxlxwlp000208l7tz276p4e',
      assessmentTitle: 'Backend Developer Intern - Task — Analyze Cynbit From a Backend Perspective',
      status: 'PENDING',
    },
  ],
]);

/**
 * 1. Safe Hydration Action: fetchCandidateByCandidateToken
 * Sanitizes candidate profile to avoid leaking internal database identifiers.
 */
export const fetchCandidateByCandidateToken = createSafeAction(
  {
    schema: cuidSchema,
  },
  async (token: string) => {
    const candidate = mockDb.get(token);
    if (!candidate) {
      throw new Error('Candidate not found');
    }

    // Return sanitized view model (exclude internal email/system identifiers if appropriate)
    return {
      name: candidate.name,
      role: candidate.role,
      assessmentTitle: candidate.assessmentTitle,
      status: candidate.status,
      submittedAt: candidate.submittedAt ? candidate.submittedAt.toISOString() : null,
      submissionUrl: candidate.submissionUrl || null,
    };
  }
);

/**
 * 2. Safe Submission Action: submitCandidateAssessment
 * Applies token-bucket rate limiting, Zod repository URL checks, and idempotent status mutation.
 */
export const submitCandidateAssessment = createSafeAction(
  {
    schema: submitAssessmentSchema,
    rateLimiter: candidateSubmissionLimiter,
    getRateLimitKey: (input: SubmitAssessmentInput) => `submit_${input.candidateToken}`,
  },
  async (input: SubmitAssessmentInput) => {
    const candidate = mockDb.get(input.candidateToken);
    if (!candidate) {
      throw new Error('Candidate record does not exist');
    }

    if (candidate.status === 'SUBMITTED' || candidate.status === 'UNDER_REVIEW') {
      return {
        message: 'Assessment has already been submitted and is currently under review.',
        submissionUrl: candidate.submissionUrl,
        submittedAt: candidate.submittedAt?.toISOString(),
      };
    }

    // Persist submission
    candidate.status = 'SUBMITTED';
    candidate.submissionUrl = input.repositoryUrl;
    candidate.submittedAt = new Date();

    return {
      message: 'Assessment submitted successfully. The evaluation team has been notified.',
      submissionUrl: candidate.submissionUrl,
      submittedAt: candidate.submittedAt.toISOString(),
    };
  }
);

/**
 * 3. Safe Support Ticket Action: submitCandidateSupportTicket
 */
export const submitCandidateSupportTicket = createSafeAction(
  {
    schema: submitSupportTicketSchema,
    rateLimiter: supportTicketLimiter,
    getRateLimitKey: (input: SubmitSupportTicketInput) => `ticket_${input.candidateToken}`,
  },
  async (input: SubmitSupportTicketInput) => {
    const candidate = mockDb.get(input.candidateToken);
    if (!candidate) {
      throw new Error('Invalid candidate token for ticket submission');
    }

    const ticketId = `TCK-${Date.now().toString(36).toUpperCase()}`;

    return {
      ticketId,
      message: 'Support ticket registered. Our recruitment engineering team will follow up shortly.',
    };
  }
);
