/**
 * Standardized RFC 7807 Problem Details API Error Serializer
 * https://datatracker.ietf.org/doc/html/rfc7807
 * 
 * Ensures consistent, machine-readable error responses across all Cynbit backend APIs.
 */

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  invalidParams?: Array<{ name: string; reason: string }>;
  timestamp: string;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly type: string;
  public readonly title: string;
  public readonly detail: string;
  public readonly invalidParams?: Array<{ name: string; reason: string }>;

  constructor({
    status,
    title,
    detail,
    type = 'about:blank',
    invalidParams,
  }: {
    status: number;
    title: string;
    detail: string;
    type?: string;
    invalidParams?: Array<{ name: string; reason: string }>;
  }) {
    super(detail);
    this.status = status;
    this.title = title;
    this.detail = detail;
    this.type = type;
    this.invalidParams = invalidParams;
  }

  public toProblemDetails(instancePath?: string): ProblemDetails {
    return {
      type: this.type,
      title: this.title,
      status: this.status,
      detail: this.detail,
      instance: instancePath,
      invalidParams: this.invalidParams,
      timestamp: new Date().toISOString(),
    };
  }
}

export function createValidationError(
  invalidParams: Array<{ name: string; reason: string }>,
  instancePath?: string
): ProblemDetails {
  return new ApiError({
    status: 400,
    title: 'Validation Failed',
    detail: 'One or more request payload parameters failed schema validation constraints.',
    type: 'https://cynbit.in/errors/validation-failed',
    invalidParams,
  }).toProblemDetails(instancePath);
}

export function createRateLimitError(
  resetSeconds: number,
  instancePath?: string
): ProblemDetails {
  return new ApiError({
    status: 429,
    title: 'Rate Limit Exceeded',
    detail: `Too many requests were received. Please retry in ${resetSeconds} second(s).`,
    type: 'https://cynbit.in/errors/rate-limit-exceeded',
  }).toProblemDetails(instancePath);
}

export function createInternalServerError(instancePath?: string): ProblemDetails {
  return new ApiError({
    status: 500,
    title: 'Internal Server Error',
    detail: 'An unexpected technical fault occurred. The engineering team has been notified.',
    type: 'https://cynbit.in/errors/internal-server-error',
  }).toProblemDetails(instancePath);
}
