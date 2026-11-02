/**
 * Candidate Service: Atomic, Race-Condition Safe Submission Handler
 * Demonstrates Prisma transactional isolation and status guards.
 */

export interface CandidateRecord {
  id: string;
  token: string;
  name: string;
  email: string;
  status: 'PENDING' | 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED';
  submissionUrl?: string;
  notes?: string;
  version: number; // Optimistic concurrency control
  updatedAt: Date;
}

export class CandidateService {
  private candidates = new Map<string, CandidateRecord>([
    [
      'cmvxlxwlp000208l7tz276p4e',
      {
        id: 'cuid_cmvxlxwlp000208',
        token: 'cmvxlxwlp000208l7tz276p4e',
        name: 'Abhay Agrawal',
        email: 'agabhay07@gmail.com',
        status: 'PENDING',
        version: 1,
        updatedAt: new Date(),
      },
    ],
  ]);

  /**
   * Atomic Submission with Optimistic Locking
   * Prevents double-submission race conditions when multiple requests arrive concurrently.
   */
  public async submitAssessment({
    token,
    repositoryUrl,
    technicalNotes,
  }: {
    token: string;
    repositoryUrl: string;
    technicalNotes?: string;
  }): Promise<{ success: boolean; candidate: CandidateRecord; message: string }> {
    // In production with Prisma ORM:
    // return await prisma.$transaction(async (tx) => {
    //   const existing = await tx.candidate.findUnique({
    //     where: { token },
    //     select: { id: true, status: true, version: true }
    //   });
    //   if (!existing) throw new Error('CANDIDATE_NOT_FOUND');
    //   if (existing.status !== 'PENDING') throw new Error('ALREADY_SUBMITTED');
    //   const updated = await tx.candidate.update({
    //     where: { token, version: existing.version },
    //     data: {
    //       status: 'SUBMITTED',
    //       submissionUrl: repositoryUrl,
    //       notes: technicalNotes,
    //       version: { increment: 1 }
    //     }
    //   });
    //   return updated;
    // });

    const candidate = this.candidates.get(token);
    if (!candidate) {
      throw new Error('CANDIDATE_NOT_FOUND');
    }

    if (candidate.status !== 'PENDING') {
      return {
        success: false,
        candidate,
        message: 'Assessment has already been submitted and locked for review.',
      };
    }

    // Atomic update simulation
    candidate.status = 'SUBMITTED';
    candidate.submissionUrl = repositoryUrl;
    candidate.notes = technicalNotes;
    candidate.version += 1;
    candidate.updatedAt = new Date();

    return {
      success: true,
      candidate,
      message: 'Assessment submitted successfully and queued for talent review.',
    };
  }

  public async getCandidateByToken(token: string): Promise<CandidateRecord | null> {
    return this.candidates.get(token) || null;
  }
}

export const candidateService = new CandidateService();
