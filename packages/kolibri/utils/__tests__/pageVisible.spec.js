describe('pageVisible ref', () => {
  let pageVisible;
  let visibilityHandler;

  beforeEach(() => {
    // Suppress Vue devtools console.info that fires when Vue is re-imported
    // via jest.isolateModules and fake timers advance past the devtools timer
    jest.spyOn(console, 'info').mockImplementation(() => {}); // eslint-disable-line no-console
    // Capture the visibilitychange listener
    visibilityHandler = null;
    const originalAddEventListener = document.addEventListener.bind(document);
    jest.spyOn(document, 'addEventListener').mockImplementation((event, handler, options) => {
      if (event === 'visibilitychange') {
        visibilityHandler = handler;
      } else {
        originalAddEventListener(event, handler, options);
      }
    });

    // Reset module state between tests
    jest.resetModules();
  });

  afterEach(() => {
    // eslint-disable-next-line no-console
    console.info.mockRestore();
    document.addEventListener.mockRestore();
    jest.useRealTimers();
  });

  it('should default to true', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line import-x/no-commonjs
      ({ pageVisible } = require('../browserInfo'));
    });
    expect(pageVisible.value).toBe(true);
  });

  it('should update to false when document becomes hidden after debounce', () => {
    jest.useFakeTimers();
    jest.isolateModules(() => {
      // eslint-disable-next-line import-x/no-commonjs
      ({ pageVisible } = require('../browserInfo'));
    });

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
      configurable: true,
    });
    visibilityHandler();
    // Should not update immediately (debounced)
    expect(pageVisible.value).toBe(true);
    // Advance past debounce (500ms)
    jest.advanceTimersByTime(500);
    expect(pageVisible.value).toBe(false);
  });

  it('should update to true when document becomes visible after debounce', () => {
    jest.useFakeTimers();
    jest.isolateModules(() => {
      // eslint-disable-next-line import-x/no-commonjs
      ({ pageVisible } = require('../browserInfo'));
    });

    // First go hidden
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
      configurable: true,
    });
    visibilityHandler();
    jest.advanceTimersByTime(500);
    expect(pageVisible.value).toBe(false);

    // Now go visible
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });
    visibilityHandler();
    jest.advanceTimersByTime(500);
    expect(pageVisible.value).toBe(true);
  });
});
