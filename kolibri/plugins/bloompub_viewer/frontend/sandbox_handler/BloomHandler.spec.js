import Mediator from 'kolibri-sandbox/mediator';
import BloomRunner from './BloomRunner';
import BloomHandler from './BloomHandler';

jest.mock('./BloomRunner');

describe('BloomHandler', () => {
  let mediator;
  let handler;

  beforeEach(() => {
    mediator = new Mediator(window);
    handler = new BloomHandler({ mediator, registerHandler: jest.fn() });
  });

  afterEach(() => {
    handler._destroyShims();
    mediator.destroy();
    BloomRunner.mockReset();
  });

  describe('init', () => {
    it('resolves once the runner reports the content loaded', async () => {
      BloomRunner.mockImplementation(() => ({
        init: (iframe, filepath, loaded) => {
          loaded();
          return Promise.resolve();
        },
      }));

      await expect(handler.init({}, '/bloompub/abc123.bloompub')).resolves.toBeUndefined();
    });

    it('rejects when the runner fails to process the file', async () => {
      BloomRunner.mockImplementation(() => ({
        init: () => Promise.reject(new Error('Not found')),
      }));

      await expect(handler.init({}, '/bloompub/abc123.bloompub')).rejects.toThrow('Not found');
    });
  });
});
