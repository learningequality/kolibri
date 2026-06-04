import Vue from 'vue';

import { getQueuedForTransmission, clearQueue, _resetStorageCheck } from '../errorQueue';

// Importing wires up Vue.config.errorHandler and the window listeners.
import '../index';

// Mock only boundaries - the queue, breadcrumbs and error-report classes are
// real, so this exercises the full wiring from a captured error into the
// queue rather than asserting against a mocked report().
jest.mock('kolibri/client');
jest.mock('kolibri-logging', () => ({
  __esModule: true,
  default: { getLogger: () => ({ debug: jest.fn(), error: jest.fn() }) },
}));
jest.mock('kolibri/urls', () => ({
  __esModule: true,
  default: {
    'kolibri:kolibri.plugins.error_reports:report': () => '/api/error-report/',
  },
}));
jest.mock('kolibri/composables/useConnection', () => {
  const ref = require('vue').ref;
  const connected = ref(true);
  return { __esModule: true, default: () => ({ connected }) };
});
jest.mock('kolibri/router', () => ({
  __esModule: true,
  default: {
    currentRoute: { name: 'TestRoute', path: '/test', params: {} },
    afterEach: jest.fn(),
  },
}));
jest.mock('kolibri/utils/browserInfo', () => ({
  browser: { name: 'Chrome', version: '100.0.0' },
  os: { name: 'Windows', version: '10' },
  device: { type: 'desktop', model: null, vendor: null },
  isTouchDevice: false,
}));

describe('index wiring', () => {
  beforeEach(() => {
    clearQueue();
    _resetStorageCheck();
    localStorage.clear();
    // Offline so report() queues without attempting a network flush.
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
  });

  it('captures Vue component errors and re-emits them to the console', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('Component render failure');
    const vm = { $options: { name: 'TestComponent' }, $props: {}, $parent: null };

    Vue.config.errorHandler(err, vm);

    const queued = getQueuedForTransmission();
    expect(queued).toHaveLength(1);
    expect(queued[0].context.exception.values[0].value).toBe('Component render failure');
    expect(queued[0].context.exception.values[0].mechanism.type).toBe('vue');
    // Capture must not suppress the error from the console.
    expect(consoleErrorSpy).toHaveBeenCalledWith(err);

    // The full Sentry-event shape, asserted once here against a real captured
    // error built by the real ErrorReport classes, breadcrumbs and contexts -
    // so the per-class unit tests need not re-assert the envelope.
    const { context } = queued[0];
    expect(context.platform).toBe('javascript');
    expect(context.level).toBe('error');
    expect(context.contexts.browser).toEqual({ name: 'Chrome', version: '100.0.0' });
    expect(context.contexts.os).toEqual({ name: 'Windows', version: '10' });
    expect(context.contexts.device).toMatchObject({ type: 'desktop', is_touch_device: false });
    expect(context.contexts.device.screen_breakpoint).toBeDefined();
    expect(context.contexts.route).toEqual({ name: 'TestRoute', path: '/test', params: {} });
    expect(context.contexts.vue.component_name).toBe('TestComponent');
    expect(context.request.url).toBeDefined();
    expect(Array.isArray(context.breadcrumbs.values)).toBe(true);

    consoleErrorSpy.mockRestore();
  });

  it('captures uncaught window errors', () => {
    const event = new ErrorEvent('error', { error: new TypeError('boom'), message: 'boom' });
    window.dispatchEvent(event);

    const queued = getQueuedForTransmission();
    expect(queued).toHaveLength(1);
    expect(queued[0].context.exception.values[0].type).toBe('TypeError');
    expect(queued[0].context.exception.values[0].mechanism.type).toBe('onerror');
  });

  it('captures unhandled promise rejections', () => {
    const event = new Event('unhandledrejection');
    event.reason = new Error('rejected');
    window.dispatchEvent(event);

    const queued = getQueuedForTransmission();
    expect(queued).toHaveLength(1);
    expect(queued[0].context.exception.values[0].value).toBe('rejected');
    expect(queued[0].context.exception.values[0].mechanism.type).toBe('onunhandledrejection');
  });
});
