import useConnection from 'kolibri/composables/useConnection';
import { get } from '@vueuse/core';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import { v4 as uuidv4 } from 'uuid';

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
 * @param {object} errorData - The error report payload.
 * @returns {{ queued: boolean, deduplicated: boolean, count: number }}
 */
export function enqueue(errorData) {
  const queue = getQueue();
  const now = Date.now();
  const fingerprint = generateFingerprint(errorData);

  for (const [key, entry] of queue) {
    const sentAndQuiet = entry._count === 0 && now - entry._lastSeen >= DEDUP_WINDOW_MS;
    if (sentAndQuiet || now - entry._firstSeen > MAX_ERROR_AGE_MS) {
      queue.delete(key);
    }
  }

  // Check for duplicate within dedup window
  const existing = queue.get(fingerprint);

  if (existing && now - existing._lastSeen < DEDUP_WINDOW_MS) {
    existing._count++;
    existing._lastSeen = now;
    existing._submissionId = existing._submissionId || uuidv4();
    saveQueue(queue);
    return { queued: true, deduplicated: true, count: existing._count };
  }

  const entry = {
    ...errorData,
    _fingerprint: fingerprint,
    _firstSeen: existing ? existing._firstSeen : now,
    _lastSeen: now,
    _count: existing ? existing._count + 1 : 1,
    _submissionId: existing?._submissionId || uuidv4(),
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
 * @param {Map<string, object>} queue - Queued entries keyed by fingerprint.
 * @returns {object[]}
 */
export function getQueuedForTransmission(queue = getQueue()) {
  const results = [];

  for (const entry of queue.values()) {
    // Destructured to omit internal fields from the transmitted data
    // eslint-disable-next-line no-unused-vars
    const { _fingerprint, _firstSeen, _lastSeen, _count, _submissionId, ...errorData } = entry;
    if (_count === 0) continue;
    results.push({
      ...errorData,
      submission_id: _submissionId,
      context: {
        ...errorData.context,
        ...(_count > 1 && { deduplication: { count: _count } }),
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

  const queue = getQueue();
  const errors = getQueuedForTransmission(queue);
  if (errors.length === 0) return;

  const sent = new Map();
  for (const [fingerprint, entry] of queue) {
    sent.set(fingerprint, { count: entry._count, submissionId: entry._submissionId });
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
      removeSent(handledFingerprints, sent);
    }
  } finally {
    flushing = false;
  }
}

// An entry whose submission id has changed since the snapshot was already
// acknowledged by another tab sharing the queue.
function removeSent(fingerprints, sent) {
  const queue = getQueue();
  for (const fingerprint of fingerprints) {
    const entry = queue.get(fingerprint);
    const { count, submissionId } = sent.get(fingerprint);
    if (!entry || entry._submissionId !== submissionId) continue;
    entry._count = Math.max(entry._count - count, 0);
    entry._submissionId = uuidv4();
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
