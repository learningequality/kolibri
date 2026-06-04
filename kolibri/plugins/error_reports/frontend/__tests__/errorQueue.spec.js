import {
  enqueue,
  getQueuedForTransmission,
  clearQueue,
  report,
  initErrorQueue,
  isStorageAvailable,
  _resetStorageCheck,
} from '../errorQueue';

// The queue stores Sentry-event payloads. Build one with a given exception
// value (and optional frames), and read the value back out, since the queue
// keys and deduplicates on the exception rather than top-level fields.
function makeError(value = 'Test error', frames = []) {
  return {
    context: {
      exception: { values: [{ type: 'Error', value, stacktrace: { frames } }] },
    },
  };
}

function valueOf(entry) {
  return entry.context.exception.values[0].value;
}

// Mock dependencies
jest.mock('kolibri/client');
jest.mock('kolibri/urls', () => ({
  __esModule: true,
  default: {
    'kolibri:kolibri.plugins.error_reports:report': () => '/api/error-report/',
  },
}));

jest.mock('kolibri/composables/useConnection', () => {
  const ref = require('vue').ref;
  const connected = ref(true);
  return {
    __esModule: true,
    default: () => ({ connected }),
    _setConnected: val => {
      connected.value = val;
    },
  };
});

describe('errorQueue', () => {
  beforeEach(() => {
    // Clear queue before each test
    clearQueue();
    _resetStorageCheck();
    // Reset localStorage mock
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('isStorageAvailable', () => {
    it('should return true when localStorage is available', () => {
      expect(isStorageAvailable()).toBe(true);
    });

    it('should return false when localStorage throws', () => {
      // Reset cached value first
      _resetStorageCheck();

      // Use jest.spyOn to properly mock localStorage.setItem
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage full');
      });

      expect(isStorageAvailable()).toBe(false);

      setItemSpy.mockRestore();
    });
  });

  describe('enqueue', () => {
    it('should add a new error to the queue', () => {
      const result = enqueue(makeError());

      expect(result.queued).toBe(true);
      expect(result.deduplicated).toBe(false);
      expect(result.count).toBe(1);
    });

    it('should deduplicate errors with the same fingerprint within the time window', () => {
      const result1 = enqueue(makeError());
      expect(result1.count).toBe(1);
      expect(result1.deduplicated).toBe(false);

      const result2 = enqueue(makeError());
      expect(result2.count).toBe(2);
      expect(result2.deduplicated).toBe(true);

      const result3 = enqueue(makeError());
      expect(result3.count).toBe(3);
      expect(result3.deduplicated).toBe(true);
    });

    it('should treat errors with different messages as separate', () => {
      enqueue(makeError('Error 1'));
      enqueue(makeError('Error 2'));

      const queued = getQueuedForTransmission();
      expect(queued.length).toBe(2);
    });

    it('should treat errors with different stack frames as separate', () => {
      enqueue(makeError('Same error', [{ filename: 'file1.js', function: 'f', lineno: 1 }]));
      enqueue(makeError('Same error', [{ filename: 'file2.js', function: 'g', lineno: 2 }]));

      const queued = getQueuedForTransmission();
      expect(queued.length).toBe(2);
    });

    it('should ignore column numbers when fingerprinting', () => {
      // The identity is filename|function|line, matching the backend; the
      // column is not part of it, so the same line at a different column
      // deduplicates.
      const error1 = makeError('Test', [{ filename: 'a.js', function: 'f', lineno: 1, colno: 1 }]);
      const error2 = makeError('Test', [{ filename: 'a.js', function: 'f', lineno: 1, colno: 99 }]);

      enqueue(error1);
      const result = enqueue(error2);

      expect(result.deduplicated).toBe(true);
      expect(result.count).toBe(2);
    });

    it('should cap the queue at MAX_QUEUED_ERRORS, evicting oldest first', () => {
      for (let i = 0; i < 55; i++) {
        enqueue(makeError(`Error ${i}`));
      }

      const queued = getQueuedForTransmission();
      expect(queued.length).toBe(50); // MAX_QUEUED_ERRORS
      // The first 5 (oldest) were evicted; the most recent survive.
      expect(queued.find(e => valueOf(e) === 'Error 0')).toBeUndefined();
      expect(queued.find(e => valueOf(e) === 'Error 54')).toBeDefined();
    });

    it('should keep the queue consistent when storage writes start failing', () => {
      // A quota failure mid-session must not make entries saved to the
      // memory fallback invisible to subsequent reads from localStorage.
      enqueue(makeError('Error 1'));

      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage full');
      });

      enqueue(makeError('Error 2'));

      expect(getQueuedForTransmission().map(valueOf)).toEqual(['Error 1', 'Error 2']);

      setItemSpy.mockRestore();
    });

    it('should use in-memory Map when storage is unavailable', () => {
      // Simulate storage unavailable using jest.spyOn - BEFORE reset/clear
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage full');
      });

      // Reset and clear AFTER the spy is in place
      _resetStorageCheck();
      clearQueue();

      enqueue(makeError('Memory error'));

      const queued = getQueuedForTransmission();
      expect(queued.length).toBe(1);
      expect(valueOf(queued[0])).toBe('Memory error');

      setItemSpy.mockRestore();
    });

    it('should recover when the stored queue JSON is corrupt', () => {
      // A garbage value in localStorage must not throw or swallow new entries -
      // getQueue catches the parse failure and continues from an empty queue.
      localStorage.setItem('kolibri_error_queue', 'not valid json{');

      const result = enqueue(makeError('After corruption'));

      expect(result.queued).toBe(true);
      expect(getQueuedForTransmission().map(valueOf)).toContain('After corruption');
    });
  });

  describe('getQueuedForTransmission', () => {
    it('should return empty array when queue is empty', () => {
      const queued = getQueuedForTransmission();
      expect(queued).toEqual([]);
    });

    it('should strip internal fields from returned errors', () => {
      enqueue(makeError());
      const queued = getQueuedForTransmission();

      expect(queued[0]._fingerprint).toBeUndefined();
      expect(queued[0]._firstSeen).toBeUndefined();
      expect(queued[0]._lastSeen).toBeUndefined();
      expect(queued[0]._count).toBeUndefined();
    });

    it('should include deduplication info when count > 1', () => {
      enqueue(makeError());
      enqueue(makeError());
      enqueue(makeError());

      const queued = getQueuedForTransmission();

      expect(queued[0].context.deduplication).toBeDefined();
      expect(queued[0].context.deduplication.count).toBe(3);
      expect(queued[0].context.deduplication.first_seen).toBeDefined();
      expect(queued[0].context.deduplication.last_seen).toBeDefined();
    });

    it('should not include deduplication info when count is 1', () => {
      enqueue(makeError());
      const queued = getQueuedForTransmission();

      expect(queued[0].context.deduplication).toBeUndefined();
    });
  });

  describe('clearQueue', () => {
    it('should remove all errors from the queue', () => {
      enqueue(makeError('Error 1'));
      enqueue(makeError('Error 2'));

      clearQueue();

      const queued = getQueuedForTransmission();
      expect(queued).toEqual([]);
    });

    it('should clear both localStorage and memory queue', () => {
      enqueue(makeError());

      clearQueue();

      expect(localStorage.getItem('kolibri_error_queue')).toBeNull();
      expect(getQueuedForTransmission()).toEqual([]);
    });
  });

  describe('report', () => {
    const client = require('kolibri/client').default;
    const useConnection = require('kolibri/composables/useConnection');

    beforeEach(() => {
      client.mockReset();
      client.mockResolvedValue({ data: { id: 1 } });
      useConnection._setConnected(true);
      // Ensure navigator.onLine is true
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    });

    it('should enqueue error and attempt to flush when online', async () => {
      await report(makeError());

      expect(client).toHaveBeenCalled();
    });

    it('should queue error when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

      await report(makeError('Offline error'));

      // Should not attempt to send
      expect(client).not.toHaveBeenCalled();

      // But should be in queue
      const queued = getQueuedForTransmission();
      expect(queued.length).toBe(1);
    });

    it('should queue error when disconnected', async () => {
      useConnection._setConnected(false);

      await report(makeError('Disconnected error'));

      expect(client).not.toHaveBeenCalled();
      expect(getQueuedForTransmission().length).toBe(1);
    });

    it('should keep errors queued when the server throttles', async () => {
      // 429 means "retry later" - the report endpoint throttles by client
      // address, and a throttled flush must not discard the reports.
      client.mockRejectedValue({ response: { status: 429 } });

      await report(makeError('Throttled error'));

      expect(getQueuedForTransmission().length).toBe(1);
    });

    it('should keep errors queued on server errors', async () => {
      client.mockRejectedValue({ response: { status: 500 } });

      await report(makeError('Server error'));

      expect(getQueuedForTransmission().length).toBe(1);
    });

    it('should drop errors the server rejects as invalid', async () => {
      client.mockRejectedValue({ response: { status: 400 } });

      await report(makeError('Rejected error'));

      expect(getQueuedForTransmission().length).toBe(0);
    });

    it('should keep errors queued on a network failure with no response', async () => {
      // No `response` means the request never reached the server - the
      // entry must stay queued for a later flush, not be dropped.
      client.mockRejectedValue({ message: 'Network Error' });

      await report(makeError('Network error'));

      expect(getQueuedForTransmission().length).toBe(1);
    });
  });

  describe('concurrent flushes', () => {
    const client = require('kolibri/client').default;
    const useConnection = require('kolibri/composables/useConnection');

    beforeEach(() => {
      client.mockReset();
      useConnection._setConnected(true);
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    });

    it('should not start a second flush while one is in flight', async () => {
      const resolvers = [];
      client.mockImplementation(
        () =>
          new Promise(resolve => {
            resolvers.push(resolve);
          }),
      );

      const first = report(makeError('Error A'));
      // While the first flush is awaiting the client, a second report must
      // not start another flush over the same queue - that would re-send
      // 'Error A' and over-remove entries when both flushes finish.
      const second = report(makeError('Error B'));

      expect(client).toHaveBeenCalledTimes(1);

      resolvers.forEach(resolve => resolve({ data: {} }));
      await Promise.all([first, second]);

      // 'Error A' was transmitted and removed; 'Error B' stays queued for
      // the next flush rather than being dropped untransmitted.
      const queued = getQueuedForTransmission();
      expect(queued.map(valueOf)).toEqual(['Error B']);
      expect(client).toHaveBeenCalledTimes(1);
    });

    it('should not drop occurrences recorded while a flush is in flight', async () => {
      const resolvers = [];
      client.mockImplementation(
        () =>
          new Promise(resolve => {
            resolvers.push(resolve);
          }),
      );

      const errorData = makeError('Error A');
      // Starts a flush that snapshots 'Error A' (count 1) and awaits the client.
      const first = report(errorData);
      expect(client).toHaveBeenCalledTimes(1);

      // The same error recurs while the submission is in flight, bumping the
      // queued entry's count to 2. enqueue (not report) avoids the in-flight
      // flush guard.
      enqueue(errorData);

      resolvers.forEach(resolve => resolve({ data: {} }));
      await first;

      // The submission covered only the first occurrence, so the entry must
      // survive with the mid-flight recurrence intact rather than being
      // removed wholesale.
      const queued = getQueuedForTransmission();
      expect(queued.map(valueOf)).toEqual(['Error A']);
      expect(queued[0].context.deduplication.count).toBe(2);
    });
  });

  describe('initErrorQueue', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should set up online event listener', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      initErrorQueue();

      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    });

    it('should set up periodic flush interval', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      initErrorQueue();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);
    });
  });

  describe('deduplication time window', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should not deduplicate after time window expires', () => {
      enqueue(makeError());

      // Advance time past the dedup window (60 seconds)
      jest.advanceTimersByTime(61000);

      const result = enqueue(makeError());

      // Should be treated as new error, not deduplicated
      expect(result.deduplicated).toBe(false);
    });

    it('should drop entries older than MAX_ERROR_AGE_MS on enqueue', () => {
      // Entries past the 7-day age cap are expired when the queue is next
      // touched, so a stale error does not linger indefinitely.
      enqueue(makeError('Old'));

      // Advance past the 7-day age cap, then enqueue an unrelated error.
      jest.advanceTimersByTime(7 * 24 * 60 * 60 * 1000 + 1000);
      enqueue(makeError('New'));

      const values = getQueuedForTransmission().map(valueOf);
      expect(values).toEqual(['New']);
    });

    it('should preserve first_seen when re-occurring outside the window', () => {
      // The cumulative count carries across the window, so first_seen must
      // not claim a first occurrence later than occurrences it counts.
      const errorData = makeError();
      const firstTime = Date.now();

      enqueue(errorData);
      jest.advanceTimersByTime(61000);
      enqueue(errorData);

      const queued = getQueuedForTransmission();
      expect(queued[0].context.deduplication.count).toBe(2);
      expect(new Date(queued[0].context.deduplication.first_seen).getTime()).toBe(firstTime);
    });
  });
});
