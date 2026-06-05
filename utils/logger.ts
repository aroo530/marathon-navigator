import * as Sentry from '@sentry/react-native';


export const logger = __DEV__
  ? { log: console.log, warn: console.warn, error: console.error }
  : {
      log: (message: string, ...args: unknown[]) => {
        Sentry.addBreadcrumb({
          category: 'app',
          message,
          data: args.length ? { detail: args } : undefined,
          level: 'info',
        });
      },
      warn: (message: string, ...args: unknown[]) => {
        Sentry.addBreadcrumb({
          category: 'app',
          message,
          data: args.length ? { detail: args } : undefined,
          level: 'warning',
        });
      },
      error: (message: string, ...args: unknown[]) => {
        Sentry.captureMessage(message, {
          level: 'error',
          extra: args.length ? { detail: args } : undefined,
        });
      },
    };
