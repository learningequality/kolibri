import { browser, os, device, isTouchDevice } from 'kolibri/utils/browserInfo';
import router from 'kolibri/router';
import { getBreadcrumbs } from './breadcrumbs';
import { report as queueAndReport } from './errorQueue';
import parseStackFrames from './stackFrames';

// Breakpoint ranges from KDS useKResponsiveWindow, which cannot be used
// here as it needs a component context. The reported value is the level
// index 0-7, matching the windowBreakpoint values used throughout Kolibri.
const SCROLL_BAR = 16;
const widthBreakpoints = [
  480,
  600,
  840,
  960 - SCROLL_BAR,
  1280 - SCROLL_BAR,
  1440 - SCROLL_BAR,
  1600 - SCROLL_BAR,
];

export function getWindowBreakpoint(width = window.innerWidth) {
  const index = widthBreakpoints.findIndex(breakpoint => width <= breakpoint);
  return index >= 0 ? index : widthBreakpoints.length;
}

/**
 * Report an error - queues and attempts to send
 */
export function report(error) {
  const data = error.getErrorReport();
  return queueAndReport(data);
}

class ErrorReport {
  constructor(e) {
    this.message = e?.message || 'Unknown Error';
    this.name = e?.name || '';
    this.stack = e?.stack || 'No stack trace available';
    // The Sentry exception mechanism type for how the error was captured.
    this.mechanism = 'generic';
  }

  getErrorReport() {
    // A Sentry-event-shaped context is the whole payload: the exception
    // type, value and stack frames live inside it, so there are no separate
    // top-level identity fields. The backend derives the dedup identity from
    // the event, and re-reports it into Sentry with minimal mapping.
    return {
      context: this.getContext(),
    };
  }

  getContext() {
    return {
      platform: 'javascript',
      level: 'error',
      exception: {
        values: [
          {
            type: this.name,
            value: this.message,
            // None of these are handled by the application - they reach the
            // global handlers that capture them.
            mechanism: { type: this.mechanism, handled: false },
            stacktrace: { frames: parseStackFrames(this.stack) },
          },
        ],
      },
      contexts: this.getContexts(),
      breadcrumbs: { values: getBreadcrumbs() },
      request: { url: window.location.href },
    };
  }

  getContexts() {
    return {
      browser: { name: browser.name, version: browser.version },
      os: { name: os.name, version: os.version },
      device: {
        ...device,
        is_touch_device: isTouchDevice,
        screen_breakpoint: getWindowBreakpoint(),
      },
      route: this._getRouteContext(),
      app: { visibility_state: document.visibilityState },
      ...this.getExtraContexts(),
    };
  }

  _getRouteContext() {
    try {
      const route = router.currentRoute;
      if (!route) return null;
      return {
        name: route.name,
        path: route.path,
        params: route.params,
      };
    } catch {
      return null;
    }
  }

  getExtraContexts() {
    return {};
  }
}

export class VueErrorReport extends ErrorReport {
  constructor(e, vm) {
    super(e);
    this.vm = vm;
    this.mechanism = 'vue';
  }

  getExtraContexts() {
    return {
      vue: {
        component_name:
          this.vm.$options.name || this.vm.$options._componentTag || 'Unknown Component',
        parents: this._getParentChain(this.vm, 5),
        props: this._serializeProps(this.vm.$props),
      },
    };
  }

  _getParentChain(vm, maxDepth) {
    const chain = [];
    let current = vm.$parent;
    while (current && chain.length < maxDepth) {
      chain.push(current.$options.name || current.$options._componentTag || 'Anonymous');
      current = current.$parent;
    }
    return chain;
  }

  _serializeProps(props) {
    if (!props) return {};
    const serialized = {};
    for (const [key, value] of Object.entries(props)) {
      if (typeof value === 'function') continue;
      // Objects are collapsed to keep the payload bounded and avoid circular
      // references; primitives (including strings) are kept, matching Sentry's
      // attachProps. Frontend props carry little sensitive data, and the
      // report is re-reported into Sentry regardless.
      if (value !== null && typeof value === 'object') {
        serialized[key] = '[Object]';
      } else {
        serialized[key] = value;
      }
    }
    return serialized;
  }
}

export class JavascriptErrorReport extends ErrorReport {
  constructor(e) {
    super(e.error || { message: e.message });
    this.mechanism = 'onerror';
  }
}

export class UnhandledRejectionErrorReport extends ErrorReport {
  constructor(e) {
    super(e.reason);
    this.mechanism = 'onunhandledrejection';
  }
}
