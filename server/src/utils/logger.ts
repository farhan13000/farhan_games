import pino from 'pino';

const env = process.env.NODE_ENV ?? 'development';
const level = process.env.LOG_LEVEL ?? (env === 'test' ? 'silent' : 'info');

function devTransport() {
  if (env !== 'development') return undefined;
  try {
    // pino-pretty is a dev dependency; fall back to JSON logs when it is absent.
    import.meta.resolve?.('pino-pretty');
    return { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } };
  } catch {
    return undefined;
  }
}

export const logger = pino({
  level,
  transport: devTransport(),
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token'],
    censor: '[redacted]',
  },
});
