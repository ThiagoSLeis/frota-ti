export function createMutex({ name = 'mutex' } = {}) {
  let tail = Promise.resolve();
  let queued = 0;
  let locked = false;

  const noop = () => {};

  return {
    get name() {
      return name;
    },
    get queued() {
      return queued;
    },
    get locked() {
      return locked;
    },
    runExclusive(task) {
      queued += 1;

      const result = tail.then(async () => {
        locked = true;
        try {
          return await task();
        } finally {
          queued -= 1;
          locked = false;
        }
      });

      tail = result.then(noop, noop);

      return result;
    },
  };
}

export const sheetWriteMutex = createMutex({ name: 'google-sheets-write' });
