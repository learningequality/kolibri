import H5PRunner from './H5PRunner';

jest.mock('kolibri-zip', () => jest.fn());

const settles = promise =>
  Promise.race([
    promise.then(
      () => 'resolved',
      () => 'rejected',
    ),
    new Promise(resolve => setTimeout(() => resolve('pending'), 0)),
  ]);

describe('H5PRunner', () => {
  let iframe;
  let runner;

  beforeEach(() => {
    for (const step of [
      'recurseDependencies',
      'processFiles',
      'setDependencies',
      'processCssDependencies',
      'processJsDependencies',
    ]) {
      jest.spyOn(H5PRunner.prototype, step).mockResolvedValue();
    }
    jest.spyOn(console, 'debug').mockImplementation();
    iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    runner = new H5PRunner({ stateUpdated: jest.fn() });
  });

  afterEach(() => {
    iframe.remove();
    jest.restoreAllMocks();
  });

  function start() {
    return runner.init(iframe, '/content/storage/abc.h5p');
  }

  describe('init', () => {
    it('fails when the host page loads without H5P', async () => {
      const init = start();
      await settles(Promise.resolve());

      iframe.dispatchEvent(new Event('load'));

      await expect(init).rejects.toThrow('H5P');
    });

    it('fails when the host page had already loaded without H5P', async () => {
      Object.defineProperty(iframe, 'contentDocument', {
        get: () => ({ readyState: 'complete', URL: 'http://localhost/h5p/h5p.html' }),
      });
      Object.defineProperty(iframe, 'contentWindow', { get: () => ({}) });

      expect(await settles(start())).toBe('rejected');
    });

    it('starts H5P once, however many times the host page loads', async () => {
      const H5P = {
        init: jest.fn(),
        instances: [],
        ContentType: jest.fn(),
        XAPIEvent: function () {},
        externalDispatcher: { on: jest.fn() },
      };
      const hostPage = { H5P, document: document.implementation.createHTMLDocument() };
      Object.defineProperty(iframe, 'contentWindow', { get: () => hostPage });
      jest.spyOn(runner, 'scriptLoader').mockResolvedValue();
      const init = start();
      await settles(Promise.resolve());

      iframe.dispatchEvent(new Event('load'));
      iframe.dispatchEvent(new Event('load'));
      await init;

      expect(H5P.init).toHaveBeenCalledTimes(1);
    });

    it('fails when H5P throws while starting', async () => {
      const failure = new Error('unsupported library');
      const H5P = {
        init: jest.fn(() => {
          throw failure;
        }),
        ContentType: jest.fn(),
        XAPIEvent: function () {},
        externalDispatcher: { on: jest.fn() },
      };
      const hostPage = { H5P, document: document.implementation.createHTMLDocument() };
      Object.defineProperty(iframe, 'contentWindow', { get: () => hostPage });
      jest.spyOn(runner, 'scriptLoader').mockResolvedValue();
      const init = start();
      await settles(Promise.resolve());

      iframe.dispatchEvent(new Event('load'));

      await expect(init).rejects.toBe(failure);
    });
  });
});
