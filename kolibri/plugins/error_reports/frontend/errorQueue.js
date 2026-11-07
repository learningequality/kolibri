import useConnection from 'kolibri/composables/useConnection';
import { get } from '@vueuse/core';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import { v4 as uuidv4 } from 'uuid';

const QUEUE_KEY = 'kolibri_error_queue';
const FLUSH_LOCK = 'kolibri_error_queue_flush';
const MAX_QUEUED_ERRORS = 50;
const MAX_ERROR_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEDUP_WINDOW_MS = 60000; // 1 minute
const PERSIST_INTERVAL_MS = 1000;

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
    .map(frame => `${frame.filename}|${frame.function}|${frame.lineno}|${frame.colno}`)
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

function pruneExpired(queue, now = Date.now()) {
  let pruned = false;
  for (const [key, entry] of queue) {
    const sentAndQuiet = entry._count === 0 && now - entry._lastSeen >= DEDUP_WINDOW_MS;
    if (sentAndQuiet || now - entry._firstSeen > MAX_ERROR_AGE_MS) {
      queue.delete(key);
      pruned = true;
    }
  }
  return pruned;
}

let recentErrors = new Map();
let persistTimer = null;

function persistPending() {
  clearTimeout(persistTimer);
  persistTimer = null;
  const pending = [...recentErrors].filter(([, seen]) => seen.pending > 0);
  if (pending.length === 0) return;
  const queue = getQueue();
  for (const [fingerprint, seen] of pending) {
    const entry = queue.get(fingerprint);
    if (entry) {
      entry._count += seen.pending;
      entry._lastSeen = Math.max(entry._lastSeen, seen.lastSeen);
      entry._submissionId = entry._submissionId || uuidv4();
    } else {
      queue.set(fingerprint, {
        ...seen.errorData,
        _fingerprint: fingerprint,
        _firstSeen: seen.lastSeen,
        _lastSeen: seen.lastSeen,
        _count: seen.pending,
        _submissionId: uuidv4(),
      });
    }
    seen.pending = 0;
  }
  saveQueue(queue);
}

/**
 * Add error to queue, deduplicating if same error seen recently
 * @param {object} errorData - The error report payload.
 * @returns {{ queued: boolean, deduplicated: boolean, count: number }}
 */
export function enqueue(errorData) {
  const now = Date.now();
  const fingerprint = generateFingerprint(errorData);

  const seen = recentErrors.get(fingerprint);
  if (seen && now - seen.lastSeen < DEDUP_WINDOW_MS) {
    seen.count++;
    seen.pending++;
    seen.lastSeen = now;
    persistTimer = persistTimer || setTimeout(persistPending, PERSIST_INTERVAL_MS);
    return { queued: true, deduplicated: true, count: seen.count };
  }

  persistPending();
  for (const [key, recent] of recentErrors) {
    if (now - recent.lastSeen >= DEDUP_WINDOW_MS) {
      recentErrors.delete(key);
    }
  }

  const queue = getQueue();
  pruneExpired(queue, now);

  // Check for duplicate within dedup window
  const existing = queue.get(fingerprint);

  if (existing && now - existing._lastSeen < DEDUP_WINDOW_MS) {
    existing._count++;
    existing._lastSeen = now;
    existing._submissionId = existing._submissionId || uuidv4();
    saveQueue(queue);
    recentErrors.set(fingerprint, { errorData, count: existing._count, lastSeen: now, pending: 0 });
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
  recentErrors.set(fingerprint, { errorData, count: entry._count, lastSeen: now, pending: 0 });
  return { queued: true, deduplicated: false, count: entry._count };
}

/**
 * Get all queued errors for transmission, cleaning internal fields
 * @param {Map<string, object>} [queue] - Queued entries keyed by fingerprint;
 * defaults to the shared queue, including repeats not yet written to it.
 * @returns {object[]}
 */
export function getQueuedForTransmission(queue) {
  if (!queue) {
    persistPending();
    queue = getQueue();
  }
  return unsentEntries(queue).map(([, entry]) => forTransmission(entry));
}

function unsentEntries(queue) {
  return [...queue].filter(([, entry]) => entry._count > 0);
}

function forTransmission(entry) {
  // Destructured to omit internal fields from the transmitted data
  // eslint-disable-next-line no-unused-vars
  const { _fingerprint, _firstSeen, _lastSeen, _count, _submissionId, ...errorData } = entry;
  return {
    ...errorData,
    submission_id: _submissionId,
    context: {
      ...errorData.context,
      ...(_count > 1 && { deduplication: { count: _count } }),
    },
  };
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
  recentErrors = new Map();
  clearTimeout(persistTimer);
  persistTimer = null;
}

// Guards against concurrent flushes - the interval, the online listener
// and report() can all trigger a flush while one is awaiting the network,
// which would re-send the same entries and remove untransmitted ones.
let flushing = false;

// Web Locks need a secure context, so plain-HTTP LAN access takes the
// fallback; without them, concurrent tabs can overwrite each other's queue
// writes and lose occurrences, and an occurrence recorded while two tabs are
// flushing can be counted twice despite the submission ids.
function flushQueue() {
  if (!navigator.locks) {
    return flushHeld();
  }
  return navigator.locks.request(FLUSH_LOCK, { ifAvailable: true }, lock => lock && flushHeld());
}

async function flushHeld() {
  if (flushing) return;

  persistPending();
  const queue = getQueue();
  if (pruneExpired(queue)) {
    saveQueue(queue);
  }

  const { connected } = useConnection();

  if (!navigator.onLine || !get(connected)) {
    return;
  }

  const unsent = unsentEntries(queue);
  if (unsent.length === 0) return;

  const sent = new Map();
  for (const [fingerprint, entry] of unsent) {
    sent.set(fingerprint, { count: entry._count, submissionId: entry._submissionId });
  }

  flushing = true;
  try {
    const url = urls['kolibri:kolibri.plugins.error_reports:report']();
    const handledFingerprints = [];

    for (const [fingerprint, entry] of unsent) {
      try {
        await client({ url, method: 'post', data: forTransmission(entry) });
        handledFingerprints.push(fingerprint);
      } catch (err) {
        // kolibri/client reports a request that got no response as status 0
        const status = err.response?.status;
        if (!status || status === 429 || status >= 500) {
          // Network failure, throttled or server failure - retryable, keep
          // queued and stop
          break;
        }
        // Server rejected the report as invalid - drop it rather than
        // retrying forever
        handledFingerprints.push(fingerprint);
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
    const snapshot = sent.get(fingerprint);
    if (!entry || !snapshot || entry._submissionId !== snapshot.submissionId) continue;
    entry._count = Math.max(entry._count - snapshot.count, 0);
    entry._submissionId = uuidv4();
  }
  pruneExpired(queue);
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
  window.addEventListener('pagehide', persistPending);
  setInterval(flushQueue, 60000);
}
