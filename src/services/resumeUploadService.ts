import crypto from 'node:crypto';

/**
 * Direct-to-Storage Presigned Upload Pipeline
 * Solves Vercel's 4.5MB Serverless Function payload limit on `/careers`.
 */

export interface PresignedUploadIntent {
  candidateId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: 'application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  storageKey: string;
  expiresInSeconds: number;
  maxSizeBytes: number;
  headers: Record<string, string>;
}

const MAX_RESUME_SIZE = 15 * 1024 * 1024; // 15 Megabytes (well beyond 4.5MB serverless limit)

export class ResumeUploadService {
  /**
   * Generates a restricted, signed PUT URL directly to AWS S3 or Cloudflare R2
   */
  public async generatePresignedUploadUrl(
    intent: PresignedUploadIntent
  ): Promise<PresignedUploadResponse> {
    if (intent.fileSizeBytes > MAX_RESUME_SIZE) {
      throw new Error(`Resume file size exceeds maximum permitted limit of 15MB.`);
    }

    const fileExtension = intent.mimeType === 'application/pdf' ? 'pdf' : 'docx';
    const uniqueFileId = crypto.randomUUID();
    const storageKey = `careers/resumes/${intent.candidateId}/${uniqueFileId}.${fileExtension}`;

    // In production with AWS SDK / S3 Client:
    // const command = new PutObjectCommand({
    //   Bucket: process.env.S3_BUCKET_NAME,
    //   Key: storageKey,
    //   ContentType: intent.mimeType,
    //   ContentLength: intent.fileSizeBytes,
    // });
    // const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    const uploadUrl = `https://storage.cynbit.in/${storageKey}?signature=mock_${crypto.randomBytes(16).toString('hex')}`;

    return {
      uploadUrl,
      storageKey,
      expiresInSeconds: 900, // 15 minutes
      maxSizeBytes: MAX_RESUME_SIZE,
      headers: {
        'Content-Type': intent.mimeType,
        'x-amz-server-side-encryption': 'AES256',
      },
    };
  }

  /**
   * Verifies file binary header magic bytes to prevent MIME-type spoofing
   * (e.g., verifying PDF header `%PDF-` / 0x25 0x50 0x44 0x46)
   */
  public verifyMagicBytes(buffer: Buffer): { isValid: boolean; detectedType?: string } {
    if (buffer.length < 4) {
      return { isValid: false };
    }

    // PDF Magic Bytes: 25 50 44 46 (%PDF)
    if (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    ) {
      return { isValid: true, detectedType: 'application/pdf' };
    }

    // DOCX Magic Bytes (ZIP header): 50 4B 03 04 (PK..)
    if (
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    ) {
      return { isValid: true, detectedType: 'application/docx' };
    }

    return { isValid: false };
  }
}

export const resumeUploadService = new ResumeUploadService();
