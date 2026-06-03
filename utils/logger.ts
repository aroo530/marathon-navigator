import * as Sentry from '@sentry/react-native';

const noop = () => {};

export const logger = __DEV__
  ? { log: console.log, warn: console.warn, error: console.error }
  : {
      log:   noop,
      warn:  noop,
      error: (message: string, ...args: unknown[]) => {
        Sentry.captureMessage(message, {
          level: 'error',
          extra: args.length ? { detail: args } : undefined,
        });
      },
    };
