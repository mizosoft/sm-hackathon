/** Logger abstraction. */

export interface Logger {
  debug(msg: string): void;
  info(msg: string): void;
  error(msg: string): void;
}

export function createConsoleLogger(): Logger {
  return {
    debug: (msg) => console.debug(`[DEBUG] ${msg}`),
    info: (msg) => console.log(`[INFO] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`),
  };
}

export function createSilentLogger(): Logger {
  const noop = () => {};
  return { debug: noop, info: noop, error: noop };
}
