const MAX_BREADCRUMBS = 30;
// Cap an individual breadcrumb message, mirroring Sentry's truncation of
// long console output and DOM trees.
const MAX_MESSAGE_LENGTH = 1024;
const breadcrumbs = [];

// Store TRUE original methods at module load time (before any wrapping)
const trueOriginalXhrOpen =
  typeof XMLHttpRequest !== 'undefined' ? XMLHttpRequest.prototype.open : null;
const trueOriginalXhrSend =
  typeof XMLHttpRequest !== 'undefined' ? XMLHttpRequest.prototype.send : null;

// Store original methods for restoration/chaining (saved once, never overwritten)
let originalConsoleMethods = null;
let originalFetch = null;
let originalXhrOpen = null;
let originalXhrSend = null;
let initialized = false;

// For testing - reset initialization state (but don't unwrap - methods stay wrapped)
export function _resetInitialized() {
  initialized = false;
}

// For testing - fully reset wrapper state (allows re-wrapping)
export function _resetWrappers() {
  originalConsoleMethods = null;
  originalFetch = null;
  originalXhrOpen = null;
  originalXhrSend = null;
  initialized = false;
  // Restore XHR prototype methods to their true originals
  if (typeof XMLHttpRequest !== 'undefined') {
    if (trueOriginalXhrOpen) {
      XMLHttpRequest.prototype.open = trueOriginalXhrOpen;
    }
    if (trueOriginalXhrSend) {
      XMLHttpRequest.prototype.send = trueOriginalXhrSend;
    }
  }
}

/**
 * Append a Sentry-shaped breadcrumb. `timestamp` is epoch seconds (Sentry's
 * convention), and the crumb carries `category`, optional `type`/`level`, a
 * human-readable `message`, and structured `data`.
 */
export function addBreadcrumb(crumb) {
  breadcrumbs.push({
    timestamp: Date.now() / 1000,
    ...crumb,
  });
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift();
  }
}

export function getBreadcrumbs() {
  return [...breadcrumbs];
}

export function clearBreadcrumbs() {
  breadcrumbs.length = 0;
}

// Stringify a console argument without throwing on circular or exotic values.
function safeStringify(arg) {
  if (typeof arg === 'string') {
    return arg;
  }
  try {
    return JSON.stringify(arg);
  } catch {
    try {
      return String(arg);
    } catch {
      return '[unserializable]';
    }
  }
}

// Map a console method to a Sentry severity level.
function consoleLevel(method) {
  if (method === 'warn') return 'warning';
  if (method === 'error') return 'error';
  return 'info';
}

// Intentionally accesses and replaces console methods to record breadcrumbs
/* eslint-disable no-console */
function wrapConsole() {
  // Only wrap once - if originalConsoleMethods is already set, we've already wrapped
  if (originalConsoleMethods) return;

  originalConsoleMethods = {};
  ['log', 'warn', 'error', 'info'].forEach(level => {
    originalConsoleMethods[level] = console[level];
    console[level] = function (...args) {
      // Capture the console message, matching Sentry's console breadcrumb
      // (category 'console', the joined arguments as the message). The
      // telemetry server re-reports into Sentry, so frontend breadcrumbs
      // mirror what Sentry's own SDK would record.
      addBreadcrumb({
        category: 'console',
        level: consoleLevel(level),
        message: args.map(safeStringify).join(' ').slice(0, MAX_MESSAGE_LENGTH),
        data: { logger: 'console' },
      });
      originalConsoleMethods[level].apply(console, args);
    };
  });
}
/* eslint-enable no-console */

// A faithful port of Sentry's htmlTreeAsString (sentry-javascript,
// packages/browser breadcrumbs integration). It describes a clicked element
// as a CSS-selector-like ancestor chain - tag, id, classes and a small
// allowlist of non-identifying attributes - and deliberately does NOT include
// the element's text content, which could carry PII (a learner's name in a
// row, a value in a label). The telemetry server re-reports into Sentry, so
// capturing exactly what Sentry's own frontend would keeps us from sending
// anything it would not.
const MAX_TRAVERSE_HEIGHT = 5;
const TREE_SEPARATOR = ' > ';
// The attributes Sentry serializes verbatim - all UI metadata, not content.
const SERIALIZABLE_ATTRS = ['aria-label', 'type', 'name', 'title', 'alt'];

// Serialize one element as `tag#id.class.class[attr="value"]`.
function elementAsString(element) {
  if (!element || !element.tagName) {
    return '';
  }
  const out = [element.tagName.toLowerCase()];
  if (element.id) {
    out.push(`#${element.id}`);
  }
  const className = (element.className || '').toString().trim();
  if (className) {
    for (const c of className.split(/\s+/)) {
      out.push(`.${c}`);
    }
  }
  for (const attr of SERIALIZABLE_ATTRS) {
    const value = element.getAttribute && element.getAttribute(attr);
    if (value) {
      out.push(`[${attr}="${value}"]`);
    }
  }
  return out.join('');
}

// Walk up to MAX_TRAVERSE_HEIGHT ancestors, joining each element's
// description oldest-first (e.g. `body > div#app > button.btn`), stopping at
// <html> or once the accumulated length would exceed MAX_MESSAGE_LENGTH. The
// final slice bounds the message even when a single element is oversized,
// which Sentry's first-element exemption would otherwise leave uncapped.
function htmlTreeAsString(element) {
  try {
    let current = element;
    const out = [];
    let height = 0;
    let len = 0;
    while (current && height++ < MAX_TRAVERSE_HEIGHT) {
      const next = elementAsString(current);
      // Stop at the <html> root and at any non-element ancestor (the document
      // node serializes to ''), so the chain never grows a leading separator.
      if (
        !next ||
        (current.tagName && current.tagName.toLowerCase() === 'html') ||
        (height > 1 && len + out.length * TREE_SEPARATOR.length + next.length >= MAX_MESSAGE_LENGTH)
      ) {
        break;
      }
      out.push(next);
      len += next.length;
      current = current.parentNode;
    }
    return out.reverse().join(TREE_SEPARATOR).slice(0, MAX_MESSAGE_LENGTH);
  } catch {
    return '<unknown>';
  }
}

function setupClickListener() {
  document.addEventListener(
    'click',
    e => {
      const target = e.target;
      if (!target || !target.tagName) return;

      addBreadcrumb({
        type: 'ui',
        category: 'ui.click',
        message: htmlTreeAsString(target),
      });
    },
    { capture: true, passive: true },
  );
}

function wrapFetch() {
  // Only wrap once
  if (originalFetch) return;
  if (typeof window.fetch !== 'function') return;

  originalFetch = window.fetch;
  window.fetch = function (url, options = {}) {
    const data = {
      method: (options.method || 'GET').toUpperCase(),
      url: String(url),
    };
    addBreadcrumb({ type: 'http', category: 'fetch', data });
    // Record the response status onto the breadcrumb once it resolves, as
    // Sentry's fetch breadcrumb does. The breadcrumb holds the same data
    // reference, so the later mutation is reflected.
    return originalFetch.apply(this, arguments).then(response => {
      data.status_code = response.status;
      return response;
    });
  };
}

function wrapXhr() {
  // Only wrap once
  if (originalXhrOpen) return;
  if (typeof XMLHttpRequest === 'undefined') return;

  originalXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    this._breadcrumbData = {
      method: (method || 'GET').toUpperCase(),
      url: String(url),
    };
    return originalXhrOpen.apply(this, arguments);
  };

  originalXhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    const data = this._breadcrumbData;
    if (data) {
      addBreadcrumb({ type: 'http', category: 'xhr', data });
      // Record the response status when the request completes, mirroring
      // Sentry's xhr breadcrumb.
      this.addEventListener('loadend', () => {
        data.status_code = this.status;
      });
    }
    return originalXhrSend.apply(this, arguments);
  };
}

function setupRouterListener(router) {
  if (!router || typeof router.afterEach !== 'function') return;

  router.afterEach((to, from) => {
    addBreadcrumb({
      category: 'navigation',
      data: {
        from: from.fullPath,
        to: to.fullPath,
        name: to.name,
      },
    });
  });
}

export function initBreadcrumbs(router = null) {
  if (initialized) return;
  initialized = true;

  wrapConsole();
  setupClickListener();
  wrapFetch();
  wrapXhr();
  setupRouterListener(router);
}
