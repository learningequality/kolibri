import { loadHandler } from '../src/handlerLoader';

describe('loadHandler', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = {};
    document.head.innerHTML = '';
  });

  const appendedScripts = () => Array.from(document.head.querySelectorAll('script'));

  it('removes the script and clears the resolver on successful registration', async () => {
    const promise = loadHandler('http://example.test/handler.js', sandbox);
    expect(appendedScripts()).toHaveLength(1);

    // Simulate registerHandler firing the stored resolver.
    sandbox._handlerRegistrationResolver();
    await expect(promise).resolves.toBeUndefined();

    expect(appendedScripts()).toHaveLength(0);
    expect(sandbox._handlerRegistrationResolver).toBeNull();
  });

  it('removes the script and clears the resolver on timeout', async () => {
    jest.useFakeTimers();
    try {
      const promise = loadHandler('http://example.test/handler.js', sandbox, 1000);
      jest.advanceTimersByTime(1000);
      await expect(promise).rejects.toThrow(/timeout/);

      expect(appendedScripts()).toHaveLength(0);
      expect(sandbox._handlerRegistrationResolver).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('removes the script and clears the resolver when the script fails to load', async () => {
    const promise = loadHandler('http://example.test/handler.js', sandbox);
    const script = appendedScripts()[0];

    script.onerror();
    await expect(promise).rejects.toThrow(/Failed to load/);

    expect(appendedScripts()).toHaveLength(0);
    expect(sandbox._handlerRegistrationResolver).toBeNull();
  });
});
