import Mediator from 'kolibri-sandbox/mediator';
import H5PRunner from './H5PRunner';
import H5PHandler from './H5PHandler';

jest.mock('./H5PRunner');

describe('H5PHandler', () => {
  let mediator;
  let handler;

  beforeEach(() => {
    mediator = new Mediator(window);
    handler = new H5PHandler({ mediator, registerHandler: jest.fn() });
  });

  afterEach(() => {
    handler._destroyShims();
    mediator.destroy();
    H5PRunner.mockReset();
  });

  describe('init', () => {
    it('resolves once the runner reports the content loaded', async () => {
      H5PRunner.mockImplementation(() => ({
        init: (iframe, filepath, loaded) => {
          loaded();
          return Promise.resolve();
        },
      }));

      await expect(handler.init({}, '/h5p/abc123.h5p')).resolves.toBeUndefined();
    });

    it('rejects when the runner fails to process the file', async () => {
      H5PRunner.mockImplementation(() => ({
        init: () => Promise.reject(new Error('Not found')),
      }));

      await expect(handler.init({}, '/h5p/abc123.h5p')).rejects.toThrow('Not found');
    });
  });
});
