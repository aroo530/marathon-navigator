const noop = () => {};

export const logger = __DEV__
  ? { log: console.log, warn: console.warn, error: console.error }
  : { log: noop, warn: noop, error: noop };
