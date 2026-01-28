/**
 * Structured Xero Logger
 *
 * Centralized logging for Xero integration with:
 * - Log levels: DEBUG, INFO, WARN, ERROR
 * - Correlation IDs for request tracing
 * - Timing metrics (startTimer/duration)
 * - Environment-based verbosity (XERO_LOG_LEVEL env var)
 * - JSON-structured output for log aggregation
 * - Sensitive data redaction (tokens, secrets)
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

interface LogContext {
  correlationId?: string;
  jobId?: string;
  orderId?: string;
  customerId?: string;
  invoiceId?: string;
  contactId?: string;
  endpoint?: string;
  duration?: number;
  attempt?: number;
  maxAttempts?: number;
  statusCode?: number;
  [key: string]: unknown;
}

interface TimerResult {
  stop: () => number;
  elapsed: () => number;
}

// Patterns to redact from logs
const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*/gi,
  /access_token['":\s]+['"]?[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*/gi,
  /refresh_token['":\s]+['"]?[A-Za-z0-9\-_.]+/gi,
  /client_secret['":\s]+['"]?[A-Za-z0-9\-_]+/gi,
  /password['":\s]+['"]?[^\s'"]+/gi,
];

function redactSensitiveData(data: unknown): unknown {
  if (typeof data === 'string') {
    let redacted = data;
    for (const pattern of SENSITIVE_PATTERNS) {
      redacted = redacted.replace(pattern, '[REDACTED]');
    }
    return redacted;
  }
  if (Array.isArray(data)) {
    return data.map(redactSensitiveData);
  }
  if (data && typeof data === 'object') {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('password') ||
        lowerKey.includes('authorization')
      ) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactSensitiveData(value);
      }
    }
    return redacted;
  }
  return data;
}

function getConfiguredLogLevel(): LogLevel {
  const envLevel = process.env.XERO_LOG_LEVEL?.toUpperCase() as LogLevel;
  if (envLevel && LOG_LEVEL_PRIORITY[envLevel] !== undefined) {
    return envLevel;
  }
  // Default to INFO in production, DEBUG in development
  return process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG';
}

function getLogFormat(): 'json' | 'text' {
  const format = process.env.XERO_LOG_FORMAT?.toLowerCase();
  if (format === 'json' || format === 'text') {
    return format;
  }
  // Default to JSON in production, text in development
  return process.env.NODE_ENV === 'production' ? 'json' : 'text';
}

function shouldLog(level: LogLevel): boolean {
  const configuredLevel = getConfiguredLogLevel();
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[configuredLevel];
}

function formatTextLog(
  level: LogLevel,
  message: string,
  context?: LogContext
): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [Xero] [${level}]`;

  let contextStr = '';
  if (context) {
    const parts: string[] = [];
    if (context.correlationId) parts.push(`cid=${context.correlationId}`);
    if (context.jobId) parts.push(`job=${context.jobId}`);
    if (context.orderId) parts.push(`order=${context.orderId}`);
    if (context.customerId) parts.push(`customer=${context.customerId}`);
    if (context.invoiceId) parts.push(`invoice=${context.invoiceId}`);
    if (context.contactId) parts.push(`contact=${context.contactId}`);
    if (context.endpoint) parts.push(`endpoint=${context.endpoint}`);
    if (context.duration !== undefined) parts.push(`duration=${context.duration}ms`);
    if (context.attempt !== undefined) parts.push(`attempt=${context.attempt}/${context.maxAttempts || '?'}`);
    if (context.statusCode !== undefined) parts.push(`status=${context.statusCode}`);

    // Add any additional context
    for (const [key, value] of Object.entries(context)) {
      if (
        ![
          'correlationId',
          'jobId',
          'orderId',
          'customerId',
          'invoiceId',
          'contactId',
          'endpoint',
          'duration',
          'attempt',
          'maxAttempts',
          'statusCode',
        ].includes(key)
      ) {
        parts.push(`${key}=${JSON.stringify(value)}`);
      }
    }

    if (parts.length > 0) {
      contextStr = ` {${parts.join(', ')}}`;
    }
  }

  return `${prefix} ${message}${contextStr}`;
}

function formatJsonLog(
  level: LogLevel,
  message: string,
  context?: LogContext
): string {
  const redactedContext = redactSensitiveData(context || {}) as Record<string, unknown>;
  const logEntry = {
    timestamp: new Date().toISOString(),
    service: 'xero',
    level,
    message,
    ...redactedContext,
  };
  return JSON.stringify(logEntry);
}

function log(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) return;

  const format = getLogFormat();
  const formattedMessage =
    format === 'json'
      ? formatJsonLog(level, message, context)
      : formatTextLog(level, message, context);

  switch (level) {
    case 'ERROR':
      console.error(formattedMessage);
      break;
    case 'WARN':
      console.warn(formattedMessage);
      break;
    default:
      console.log(formattedMessage);
  }
}

/**
 * Generate a correlation ID for request tracing
 */
export function generateCorrelationId(): string {
  return `xero-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a timer for measuring operation duration
 */
export function startTimer(): TimerResult {
  const start = Date.now();
  return {
    stop: () => Date.now() - start,
    elapsed: () => Date.now() - start,
  };
}

/**
 * Xero Logger instance with scoped methods
 */
export const xeroLogger = {
  debug: (message: string, context?: LogContext) => log('DEBUG', message, context),
  info: (message: string, context?: LogContext) => log('INFO', message, context),
  warn: (message: string, context?: LogContext) => log('WARN', message, context),
  error: (message: string, context?: LogContext) => log('ERROR', message, context),

  /**
   * Log API request start
   */
  apiRequest: (endpoint: string, method: string, context?: LogContext) => {
    log('DEBUG', `API Request: ${method} ${endpoint}`, {
      endpoint,
      method,
      ...context,
    });
  },

  /**
   * Log API response
   */
  apiResponse: (
    endpoint: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ) => {
    const level: LogLevel = statusCode >= 400 ? 'ERROR' : 'DEBUG';
    log(level, `API Response: ${statusCode} from ${endpoint}`, {
      endpoint,
      statusCode,
      duration,
      ...context,
    });
  },

  /**
   * Log job lifecycle events
   */
  job: {
    queued: (jobId: string, jobType: string, context?: LogContext) => {
      log('INFO', `Job queued: ${jobType}`, { jobId, jobType, ...context });
    },
    started: (jobId: string, jobType: string, context?: LogContext) => {
      log('INFO', `Job started: ${jobType}`, { jobId, jobType, ...context });
    },
    completed: (jobId: string, jobType: string, duration: number, context?: LogContext) => {
      log('INFO', `Job completed: ${jobType}`, { jobId, jobType, duration, ...context });
    },
    failed: (
      jobId: string,
      jobType: string,
      error: string,
      attempt: number,
      maxAttempts: number,
      context?: LogContext
    ) => {
      log('ERROR', `Job failed: ${jobType} - ${error}`, {
        jobId,
        jobType,
        error,
        attempt,
        maxAttempts,
        ...context,
      });
    },
    retrying: (
      jobId: string,
      jobType: string,
      attempt: number,
      maxAttempts: number,
      delayMs: number,
      context?: LogContext
    ) => {
      log('WARN', `Job retrying: ${jobType}`, {
        jobId,
        jobType,
        attempt,
        maxAttempts,
        delayMs,
        ...context,
      });
    },
  },

  /**
   * Log token operations
   */
  token: {
    refreshing: (context?: LogContext) => {
      log('DEBUG', 'Token refresh started', context);
    },
    refreshed: (context?: LogContext) => {
      log('INFO', 'Token refreshed successfully', context);
    },
    refreshFailed: (error: string, context?: LogContext) => {
      log('ERROR', `Token refresh failed: ${error}`, context);
    },
    stored: (context?: LogContext) => {
      log('DEBUG', 'Token stored', context);
    },
  },

  /**
   * Log cache operations
   */
  cache: {
    hit: (key: string, context?: LogContext) => {
      log('DEBUG', `Cache hit: ${key}`, { cacheKey: key, ...context });
    },
    miss: (key: string, context?: LogContext) => {
      log('DEBUG', `Cache miss: ${key}`, { cacheKey: key, ...context });
    },
    set: (key: string, context?: LogContext) => {
      log('DEBUG', `Cache set: ${key}`, { cacheKey: key, ...context });
    },
    cleared: (key: string, context?: LogContext) => {
      log('DEBUG', `Cache cleared: ${key}`, { cacheKey: key, ...context });
    },
  },

  /**
   * Log rate limiting
   */
  rateLimit: {
    waiting: (waitTimeMs: number, context?: LogContext) => {
      log('WARN', `Rate limit reached, waiting ${waitTimeMs}ms`, {
        waitTimeMs,
        ...context,
      });
    },
  },

  /**
   * Log sync operations
   */
  sync: {
    contactCreated: (contactId: string, customerId: string, businessName: string) => {
      log('INFO', `Contact created in Xero`, { contactId, customerId, businessName });
    },
    contactUpdated: (contactId: string, customerId: string, businessName: string) => {
      log('INFO', `Contact updated in Xero`, { contactId, customerId, businessName });
    },
    invoiceCreated: (invoiceId: string, invoiceNumber: string, orderId: string, orderNumber: string) => {
      log('INFO', `Invoice created in Xero`, { invoiceId, invoiceNumber, orderId, orderNumber });
    },
    invoiceUpdated: (invoiceId: string, invoiceNumber: string, orderId: string, orderNumber: string) => {
      log('INFO', `Invoice updated in Xero`, { invoiceId, invoiceNumber, orderId, orderNumber });
    },
    creditNoteCreated: (creditNoteId: string, creditNoteNumber: string, orderId: string, orderNumber: string) => {
      log('INFO', `Credit note created in Xero`, { creditNoteId, creditNoteNumber, orderId, orderNumber });
    },
    creditNoteAllocated: (creditNoteNumber: string, invoiceNumber: string) => {
      log('INFO', `Credit note allocated to invoice`, { creditNoteNumber, invoiceNumber });
    },
  },
};

export type XeroLogger = typeof xeroLogger;
