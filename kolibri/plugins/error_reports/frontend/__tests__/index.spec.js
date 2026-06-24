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
  return {
    __esModule: true,
    default: () => ({ connected }),
    _setConnected: val => {
      connected.value = val;
    },
  };
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

    // Assert the full event shape once here; the per-class units don't re-assert it.
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

// Queue behaviour driven through the real global handler, not the queue API.
describe('error submission pipeline', () => {
  const client = require('kolibri/client').default;
  const useConnection = require('kolibri/composables/useConnection');

  // Let the pending flush triggered by a dispatched error settle.
  const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

  function captureError(message) {
    window.dispatchEvent(new ErrorEvent('error', { error: new Error(message), message }));
  }

  beforeEach(() => {
    clearQueue();
    _resetStorageCheck();
    localStorage.clear();
    client.mockReset();
    client.mockResolvedValue({ data: {} });
    useConnection._setConnected(true);
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  });

  it('submits a captured error to the report endpoint when online', async () => {
    captureError('boom');
    await flushPromises();

    expect(client).toHaveBeenCalledTimes(1);
    const { url, method, data } = client.mock.calls[0][0];
    expect(url).toBe('/api/error-report/');
    expect(method).toBe('post');
    expect(data.context.exception.values[0].value).toBe('boom');
  });

  it('holds errors captured offline and sends them on reconnect', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
    captureError('offline boom');
    await flushPromises();
    expect(client).not.toHaveBeenCalled();

    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    window.dispatchEvent(new Event('online'));
    await flushPromises();
    expect(client).toHaveBeenCalledTimes(1);
  });

  it('holds errors while the connection is down even if the browser reports online', async () => {
    useConnection._setConnected(false);
    captureError('disconnected');
    await flushPromises();

    expect(client).not.toHaveBeenCalled();
    expect(getQueuedForTransmission()).toHaveLength(1);
  });

  it('drops an error the server rejects as invalid', async () => {
    client.mockRejectedValue({ response: { status: 400 } });
    captureError('bad payload');
    await flushPromises();

    expect(getQueuedForTransmission()).toHaveLength(0);
  });

  it('keeps an error queued when the server throttles', async () => {
    client.mockRejectedValue({ response: { status: 429 } });
    captureError('throttled');
    await flushPromises();

    expect(getQueuedForTransmission()).toHaveLength(1);
  });

  it('keeps an error queued on a server error', async () => {
    client.mockRejectedValue({ response: { status: 500 } });
    captureError('server down');
    await flushPromises();

    expect(getQueuedForTransmission()).toHaveLength(1);
  });

  it('keeps an error queued on a network failure with no response', async () => {
    client.mockRejectedValue({ message: 'Network Error' });
    captureError('network gone');
    await flushPromises();

    expect(getQueuedForTransmission()).toHaveLength(1);
  });
});
