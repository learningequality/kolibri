import {
  VueErrorReport,
  JavascriptErrorReport,
  UnhandledRejectionErrorReport,
  getWindowBreakpoint,
} from '../utils';

jest.mock('kolibri/utils/browserInfo', () => ({
  browser: { name: 'Chrome', version: '100.0.0', major: '100', minor: '0', patch: '0' },
  os: { name: 'Windows', version: '10', major: '10' },
  device: { type: 'desktop', model: null, vendor: null },
  isTouchDevice: false,
}));

jest.mock('kolibri/router', () => ({
  __esModule: true,
  default: {
    currentRoute: {
      name: 'TestRoute',
      path: '/test',
      fullPath: '/test?param=1',
      params: { id: '123' },
      query: { param: '1' },
    },
  },
}));

jest.mock('../breadcrumbs', () => ({
  getBreadcrumbs: jest.fn(() => [
    { category: 'ui.click', message: 'button', timestamp: 1000 },
    { category: 'navigation', data: { to: '/test' }, timestamp: 2000 },
  ]),
}));

jest.mock('../errorQueue', () => ({
  report: jest.fn(() => Promise.resolve({ queued: true, deduplicated: false, count: 1 })),
}));

// Envelope shape is covered in index.spec.js; these are the per-class branches.
describe('utils', () => {
  describe('getWindowBreakpoint', () => {
    // Breakpoint levels match KDS useKResponsiveWindow: index into the
    // breakpoint ranges 0-7, not pixel values.
    it('should return level 0 for small screens', () => {
      expect(getWindowBreakpoint(400)).toBe(0);
    });

    it('should return level 2 for medium screens', () => {
      expect(getWindowBreakpoint(700)).toBe(2);
    });

    it('should return level 4 for large screens', () => {
      expect(getWindowBreakpoint(1200)).toBe(4);
    });

    it('should return level 6 for screens within the largest range', () => {
      expect(getWindowBreakpoint(1500)).toBe(6);
    });

    it('should return level 7 for screens beyond the largest range', () => {
      expect(getWindowBreakpoint(2000)).toBe(7);
    });

    it('should use window.innerWidth by default', () => {
      const originalInnerWidth = window.innerWidth;
      Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });

      expect(getWindowBreakpoint()).toBe(1);

      Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, writable: true });
    });
  });

  describe('VueErrorReport', () => {
    // Helper to create mock vm with explicit control over undefined values
    const createMockVm = (overrides = {}) => {
      const vm = {
        $options: {
          name: 'name' in overrides ? overrides.name : 'TestComponent',
          _componentTag: '_componentTag' in overrides ? overrides._componentTag : undefined,
        },
        $parent: '$parent' in overrides ? overrides.$parent : null,
        $props: '$props' in overrides ? overrides.$props : { propA: 'value', propB: 123 },
      };
      return vm;
    };

    const vueContext = report => report.getErrorReport().context.contexts.vue;

    it('should capture component name from $options.name', () => {
      const error = new Error('Vue error');
      const vm = createMockVm({ name: 'MyComponent' });
      const report = new VueErrorReport(error, vm);

      expect(vueContext(report).component_name).toBe('MyComponent');
    });

    it('should fall back to _componentTag when name is not available', () => {
      const error = new Error('Vue error');
      const vm = createMockVm({ name: undefined, _componentTag: 'my-component' });
      const report = new VueErrorReport(error, vm);

      expect(vueContext(report).component_name).toBe('my-component');
    });

    it('should use "Unknown Component" when no name available', () => {
      const error = new Error('Vue error');
      const vm = createMockVm({ name: undefined, _componentTag: undefined });
      const report = new VueErrorReport(error, vm);

      expect(vueContext(report).component_name).toBe('Unknown Component');
    });

    it('should capture parent component chain', () => {
      const error = new Error('Vue error');
      const grandparent = createMockVm({ name: 'GrandParent' });
      const parent = createMockVm({ name: 'Parent', $parent: grandparent });
      const vm = createMockVm({ name: 'Child', $parent: parent });

      const report = new VueErrorReport(error, vm);

      expect(vueContext(report).parents).toEqual(['Parent', 'GrandParent']);
    });

    it('should limit parent chain to 5 levels', () => {
      const error = new Error('Vue error');

      // Create a deep parent chain
      let current = createMockVm({ name: 'Level0' });
      for (let i = 1; i <= 10; i++) {
        current = createMockVm({ name: `Level${i}`, $parent: current });
      }

      const report = new VueErrorReport(error, current);

      expect(vueContext(report).parents.length).toBe(5);
    });

    it('should serialize props - exclude functions', () => {
      const error = new Error('Vue error');
      const vm = createMockVm({
        $props: {
          numberProp: 123,
          funcProp: () => {},
        },
      });

      const report = new VueErrorReport(error, vm);

      expect(vueContext(report).props.numberProp).toBe(123);
      expect(vueContext(report).props.funcProp).toBeUndefined();
    });

    it('should serialize props - collapse objects to a placeholder', () => {
      const error = new Error('Vue error');
      const vm = createMockVm({
        $props: {
          objectProp: { nested: 'data' },
          arrayProp: [1, 2, 3],
        },
      });

      const report = new VueErrorReport(error, vm);

      expect(vueContext(report).props.objectProp).toBe('[Object]');
      expect(vueContext(report).props.arrayProp).toBe('[Object]');
    });

    it('should serialize props - keep primitive values including strings', () => {
      // Matches Sentry's attachProps. Frontend props carry little sensitive
      // data, and the report is re-reported into Sentry regardless.
      const error = new Error('Vue error');
      const vm = createMockVm({
        $props: {
          fullName: 'A Learner Name',
          count: 3,
          isVisible: true,
        },
      });

      const report = new VueErrorReport(error, vm);

      expect(vueContext(report).props.fullName).toBe('A Learner Name');
      expect(vueContext(report).props.count).toBe(3);
      expect(vueContext(report).props.isVisible).toBe(true);
    });

    it('should handle null props', () => {
      const error = new Error('Vue error');
      const vm = createMockVm({ $props: null });

      const report = new VueErrorReport(error, vm);

      expect(vueContext(report).props).toEqual({});
    });
  });

  describe('JavascriptErrorReport', () => {
    const exceptionOf = report => report.getErrorReport().context.exception.values[0];

    it('should extract message from error event', () => {
      const errorEvent = {
        error: new Error('JS runtime error'),
        message: 'fallback message',
      };

      const report = new JavascriptErrorReport(errorEvent);

      expect(exceptionOf(report).value).toBe('JS runtime error');
    });

    it('should fall back to event message when error object is missing', () => {
      const errorEvent = {
        error: null,
        message: 'Script error',
      };

      const report = new JavascriptErrorReport(errorEvent);

      expect(exceptionOf(report).value).toBe('Script error');
    });
  });

  describe('UnhandledRejectionErrorReport', () => {
    const exceptionOf = report => report.getErrorReport().context.exception.values[0];

    it('should extract message from rejection reason', () => {
      const event = {
        reason: new Error('Promise rejected'),
      };

      const report = new UnhandledRejectionErrorReport(event);

      expect(exceptionOf(report).value).toBe('Promise rejected');
    });

    it('should handle string rejection reasons', () => {
      const event = {
        reason: 'Simple string rejection',
      };

      const report = new UnhandledRejectionErrorReport(event);

      // String reason won't have .message, so it uses fallback
      expect(exceptionOf(report).value).toBeDefined();
    });

    it('should handle undefined rejection reasons', () => {
      const event = {
        reason: undefined,
      };

      const report = new UnhandledRejectionErrorReport(event);

      expect(exceptionOf(report).value).toBe('Unknown Error');
    });
  });

  describe('route context', () => {
    const router = require('kolibri/router').default;

    it('should report a null route context when reading the route throws', () => {
      // A router that isn't ready must not fail the capture.
      const original = Object.getOwnPropertyDescriptor(router, 'currentRoute');
      Object.defineProperty(router, 'currentRoute', {
        configurable: true,
        get() {
          throw new Error('router not ready');
        },
      });

      const report = new JavascriptErrorReport({ error: new Error('x') });
      expect(report.getErrorReport().context.contexts.route).toBeNull();

      Object.defineProperty(router, 'currentRoute', original);
    });
  });
});
