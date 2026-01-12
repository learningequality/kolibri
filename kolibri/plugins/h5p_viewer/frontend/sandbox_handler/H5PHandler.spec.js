import Mediator from 'kolibri-sandbox/mediator';
import H5PRunner from './H5PRunner';
import H5PHandler from './H5PHandler';

jest.mock('./H5PRunner');

const { default: RealH5PRunner } = jest.requireActual('./H5PRunner');

function realRunnerLoading(init) {
  H5PRunner.mockImplementation(shim => Object.assign(new RealH5PRunner(shim), { init }));
}

describe('H5PHandler', () => {
  let mediator;
  let handler;

  beforeEach(() => {
    mediator = new Mediator(window);
    handler = new H5PHandler({ mediator, registerHandler: jest.fn() });
  });

  afterEach(() => {
    mediator.destroy();
    H5PRunner.mockReset();
  });

  describe('init', () => {
    it('has the runner persist H5P user data through the H5P shim', () => {
      // Content played on 0.19.x has its resume state keyed by 'H5P' in contentState,
      // so the shim the runner writes through has to be that one - hand it the xAPI
      // shim it sits alongside and everything saved before the upgrade is orphaned.
      realRunnerLoading(() => Promise.resolve());
      const state = { 0: { state: '{"answered":true}' } };

      handler.init(document.createElement('iframe'), 'test.h5p');
      handler.shims.H5P.setData(state);

      expect(H5PRunner.mock.results[0].value.data).toBe(state);
    });

    it('has the H5P shim build H5PIntegration through the runner', () => {
      const integration = { url: '/h5p' };
      H5PRunner.mockImplementation(() => ({
        init: () => new Promise(() => {}),
        buildIntegration: () => integration,
      }));
      const contentWindow = {};

      handler.init({}, '/h5p/abc123.h5p');
      handler.shims.H5P.initialize(contentWindow);

      expect(contentWindow.H5PIntegration).toBe(integration);
    });

    it('resolves once the runner has loaded the content', async () => {
      let loaded;
      H5PRunner.mockImplementation(() => ({
        init: () =>
          new Promise(resolve => {
            loaded = resolve;
          }),
      }));
      const settled = jest.fn();

      const initialized = handler.init({}, '/h5p/abc123.h5p');
      initialized.then(settled, settled);
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(settled).not.toHaveBeenCalled();

      loaded();
      await expect(initialized).resolves.toBeUndefined();
    });

    it('rejects when the runner fails to process the file', async () => {
      H5PRunner.mockImplementation(() => ({
        init: () => Promise.reject(new Error('Not found')),
      }));

      await expect(handler.init({}, '/h5p/abc123.h5p')).rejects.toThrow('Not found');
    });
  });
});
