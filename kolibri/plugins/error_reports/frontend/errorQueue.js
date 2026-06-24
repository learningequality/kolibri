import useConnection from 'kolibri/composables/useConnection';
import { get } from '@vueuse/core';
import client from 'kolibri/client';
import urls from 'kolibri/urls';

const QUEUE_KEY = 'kolibri_error_queue';
const MAX_QUEUED_ERRORS = 50;
const MAX_ERROR_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEDUP_WINDOW_MS = 60000; // 1 minute

// In-memory fallback Map: fingerprint -> entry
// JS Maps preserve insertion order, so we get queue semantics
let memoryQueue = new Map();
let storageAvailable = null;

// For testing - reset storage availability check
export function _resetStorageCheck() {
  storageAvailable = null;
}

export function isStorageAvailable() {
  if (storageAvailable !== null) return storageAvailable;

  try {
    const testKey = '__kolibri_storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  return storageAvailable;
}

export function generateFingerprint(errorData) {
  // Derive the client-side dedup key from the Sentry exception in the
  // context - the exception type and value plus a signature of the stack
  // frames - mirroring the identity the backend hashes server-side.
  const exception = errorData.context?.exception?.values?.[0] || {};
  const frames = exception.stacktrace?.frames || [];
  const stackSignature = frames
    .map(frame => `${frame.filename}|${frame.function}|${frame.lineno}`)
    .join('\n');
  return `${exception.type || ''}|${exception.value || ''}|${stackSignature}`;
}

// Convert Map to array for storage
function mapToArray(map) {
  return Array.from(map.values());
}

// Convert array to Map, keyed by fingerprint
function arrayToMap(arr) {
  const map = new Map();
  for (const entry of arr) {
    map.set(entry._fingerprint, entry);
  }
  return map;
}

// localStorage is used directly rather than through Lockr (the convention
// elsewhere in Kolibri) - Lockr.set swallows write failures, and the queue
// must detect them to fall back to memory without losing entries.
function getQueue() {
  if (!isStorageAvailable()) {
    return memoryQueue;
  }
  try {
    const arr = JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
    return arrayToMap(arr);
  } catch {
    return memoryQueue;
  }
}

function saveQueue(queue) {
  if (!isStorageAvailable()) {
    memoryQueue = queue;
    return;
  }
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(mapToArray(queue)));
  } catch {
    // Storage full or failed - fall back to memory for the rest of the
    // session, so that entries saved here stay visible to later reads.
    // The queue passed in was loaded from localStorage, so nothing
    // already stored is lost by the switch.
    storageAvailable = false;
    memoryQueue = queue;
  }
}

/**
 * Add error to queue, deduplicating if same error seen recently
 * Returns: { queued: boolean, deduplicated: boolean, count: number }
 */
export function enqueue(errorData) {
  const queue = getQueue();
  const now = Date.now();
  const fingerprint = generateFingerprint(errorData);

  // Clean expired entries
  for (const [key, entry] of queue) {
    if (now - entry._firstSeen > MAX_ERROR_AGE_MS) {
      queue.delete(key);
    }
  }

  // Check for duplicate within dedup window
  const existing = queue.get(fingerprint);

  if (existing && now - existing._lastSeen < DEDUP_WINDOW_MS) {
    existing._count++;
    existing._lastSeen = now;
    saveQueue(queue);
    return { queued: true, deduplicated: true, count: existing._count };
  }

  // New error (or outside dedup window) - add/replace in queue. The
  // cumulative count and first occurrence carry over from an existing
  // entry, so the reported deduplication metadata stays consistent.
  const entry = {
    ...errorData,
    _fingerprint: fingerprint,
    _firstSeen: existing ? existing._firstSeen : now,
    _lastSeen: now,
    _count: existing ? existing._count + 1 : 1,
  };

  // Delete and re-add to move to end of Map (maintains insertion order)
  queue.delete(fingerprint);
  queue.set(fingerprint, entry);

  // Limit queue size - remove oldest (first) entries
  while (queue.size > MAX_QUEUED_ERRORS) {
    const firstKey = queue.keys().next().value;
    queue.delete(firstKey);
  }

  saveQueue(queue);
  return { queued: true, deduplicated: false, count: entry._count };
}

/**
 * Get all queued errors for transmission, cleaning internal fields
 */
export function getQueuedForTransmission(queue = getQueue()) {
  const results = [];

  for (const entry of queue.values()) {
    // Destructured to omit internal fields from the transmitted data
    // eslint-disable-next-line no-unused-vars
    const { _fingerprint, _firstSeen, _lastSeen, _count, ...errorData } = entry;
    results.push({
      ...errorData,
      context: {
        ...errorData.context,
        ...(_count > 1 && {
          deduplication: {
            count: _count,
            first_seen: new Date(_firstSeen).toISOString(),
            last_seen: new Date(_lastSeen).toISOString(),
          },
        }),
      },
    });
  }

  return results;
}

export function clearQueue() {
  if (isStorageAvailable()) {
    try {
      localStorage.removeItem(QUEUE_KEY);
    } catch {
      // Ignore
    }
  }
  memoryQueue = new Map();
}

// Guards against concurrent flushes - the interval, the online listener
// and report() can all trigger a flush while one is awaiting the network,
// which would re-send the same entries and remove untransmitted ones.
let flushing = false;

async function flushQueue() {
  if (flushing) return;

  const { connected } = useConnection();

  if (!navigator.onLine || !get(connected)) {
    return;
  }

  // Read the queue once for this snapshot, so the errors to send and the
  // counts recorded against them come from the same read and cannot disagree.
  const queue = getQueue();
  const errors = getQueuedForTransmission(queue);
  if (errors.length === 0) return;

  // Snapshot each entry's count at send time. An occurrence recorded while
  // the submission is in flight bumps the entry's count, and such an entry
  // must not be removed wholesale on completion - only entries unchanged
  // since they were sent are removed; the rest are left for the next flush.
  const sentCounts = new Map();
  for (const [fingerprint, entry] of queue) {
    sentCounts.set(fingerprint, entry._count);
  }

  flushing = true;
  try {
    const url = urls['kolibri:kolibri.plugins.error_reports:report']();
    const handledFingerprints = [];

    for (const errorData of errors) {
      try {
        await client({ url, method: 'post', data: errorData });
        handledFingerprints.push(generateFingerprint(errorData));
      } catch (err) {
        if (!err.response) break; // Network error - stop
        if (err.response.status === 429 || err.response.status >= 500) {
          // Throttled or server failure - retryable, keep queued and stop
          break;
        }
        // Server rejected the report as invalid - drop it rather than
        // retrying forever
        handledFingerprints.push(generateFingerprint(errorData));
      }
    }

    if (handledFingerprints.length > 0) {
      removeUnchanged(handledFingerprints, sentCounts);
    }
  } finally {
    flushing = false;
  }
}

// Remove the handled entries, but keep any whose count has grown since it was
// sent - those carry occurrences recorded mid-flight that were not part of
// the submission, and are re-sent on the next flush.
function removeUnchanged(fingerprints, sentCounts) {
  const queue = getQueue();
  for (const fingerprint of fingerprints) {
    const entry = queue.get(fingerprint);
    if (entry && entry._count === sentCounts.get(fingerprint)) {
      queue.delete(fingerprint);
    }
  }
  saveQueue(queue);
}

export async function report(errorData) {
  const { queued, deduplicated, count } = enqueue(errorData);

  if (!deduplicated) {
    await flushQueue();
  }

  return { queued, deduplicated, count };
}

export function initErrorQueue() {
  flushQueue();
  window.addEventListener('online', flushQueue);
  setInterval(flushQueue, 60000);
}
