/**
 * Liveness & Readiness Probe Handler (`/api/healthz`)
 * Evaluates database connectivity, cache latency, and V8 runtime health.
 */

export interface ComponentHealth {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  latencyMs?: number;
  message?: string;
}

export interface HealthCheckResponse {
  status: 'HEALTHY' | 'UNHEALTHY';
  version: string;
  uptimeSeconds: number;
  timestamp: string;
  region: string;
  components: {
    database: ComponentHealth;
    cache: ComponentHealth;
    memory: {
      heapUsedMb: number;
      heapTotalMb: number;
      rssMb: number;
    };
  };
}

export async function checkSystemHealth(
  pingDatabase?: () => Promise<boolean>,
  pingCache?: () => Promise<boolean>
): Promise<HealthCheckResponse> {
  const startTime = Date.now();
  const region = process.env.VERCEL_REGION || process.env.AWS_REGION || 'local-bom1';

  // 1. Evaluate Database Health
  let dbHealth: ComponentHealth = { status: 'UP', latencyMs: 2 };
  if (pingDatabase) {
    const dbStart = Date.now();
    try {
      const ok = await pingDatabase();
      dbHealth = {
        status: ok ? 'UP' : 'DOWN',
        latencyMs: Date.now() - dbStart,
      };
    } catch (e: unknown) {
      dbHealth = {
        status: 'DOWN',
        latencyMs: Date.now() - dbStart,
        message: e instanceof Error ? e.message : 'Database ping failed',
      };
    }
  }

  // 2. Evaluate Cache Health (Redis / Memory)
  let cacheHealth: ComponentHealth = { status: 'UP', latencyMs: 1 };
  if (pingCache) {
    const cacheStart = Date.now();
    try {
      const ok = await pingCache();
      cacheHealth = {
        status: ok ? 'UP' : 'DOWN',
        latencyMs: Date.now() - cacheStart,
      };
    } catch (e: unknown) {
      cacheHealth = {
        status: 'DOWN',
        latencyMs: Date.now() - cacheStart,
        message: e instanceof Error ? e.message : 'Cache ping failed',
      };
    }
  }

  // 3. V8 Memory Telemetry
  const memoryUsage = process.memoryUsage();
  const memoryTelemetry = {
    heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
  };

  const isHealthy = dbHealth.status !== 'DOWN' && cacheHealth.status !== 'DOWN';

  return {
    status: isHealthy ? 'HEALTHY' : 'UNHEALTHY',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    region,
    components: {
      database: dbHealth,
      cache: cacheHealth,
      memory: memoryTelemetry,
    },
  };
}
