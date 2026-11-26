import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool, neonConfig } from '@neondatabase/serverless';

if (typeof globalThis.WebSocket !== 'undefined') {
  neonConfig.webSocketConstructor = globalThis.WebSocket;
}

const globalForPrisma = globalThis;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 10000,
  });

  const adapter = new PrismaNeon(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

export async function withDbRetry(fn, retries = 2, delayMs = 300) {
  if (typeof fn !== 'function') {
    throw new TypeError('withDbRetry requires a callback function, e.g. () => prisma.model.findMany(...)');
  }
  if (!Number.isInteger(retries) || retries < 0 || !Number.isFinite(delayMs) || delayMs < 0) {
    throw new TypeError('withDbRetry retries and delayMs must be non-negative numbers');
  }
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const causes = [err, err?.cause, err?.error, err?.cause?.error].filter(Boolean);
      const code = causes.map((cause) => cause?.code).find(Boolean);
      const message = causes.map((cause) => cause?.message).filter(Boolean).join(' ');
      const isTransient =
        ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE', 'ENETUNREACH', 'UND_ERR_SOCKET', 'P1001', 'P1017'].includes(code) ||
        /fetch failed|connection terminated|connection closed|socket hang up|websocket.*closed|websocket.*error/i.test(message) ||
        causes.some((cause) => cause?.name === 'ErrorEvent' && cause?.type === 'error');

      if (!isTransient || attempt === retries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  throw lastError;
}
