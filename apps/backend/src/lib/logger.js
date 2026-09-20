const LEVEL_TAG = {
  info: 'INFO ',
  warn: 'WARN ',
  error: 'ERROR',
  debug: 'DEBUG',
};

function emit(level, args) {
  const line = `${new Date().toISOString()} ${LEVEL_TAG[level]}`;
  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  sink(line, ...args);
}

export const logger = {
  info: (...args) => emit('info', args),
  warn: (...args) => emit('warn', args),
  error: (...args) => emit('error', args),
  debug: (...args) => {
    if (process.env.NODE_ENV !== 'production') emit('debug', args);
  },
};
