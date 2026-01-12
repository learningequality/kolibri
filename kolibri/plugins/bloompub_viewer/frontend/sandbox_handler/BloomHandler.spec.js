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
    mediator.destroy();
    BloomRunner.mockReset();
    jest.restoreAllMocks();
  });

  describe('init', () => {
    it('resolves once the runner has loaded the content', async () => {
      let loaded;
      BloomRunner.mockImplementation(() => ({
        init: () =>
          new Promise(resolve => {
            loaded = resolve;
          }),
      }));
      const settled = jest.fn();

      const initialized = handler.init({}, '/bloompub/abc123.bloompub');
      initialized.then(settled, settled);
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(settled).not.toHaveBeenCalled();

      loaded();
      await expect(initialized).resolves.toBeUndefined();
    });

    it('rejects when the runner fails to process the file', async () => {
      BloomRunner.mockImplementation(() => ({
        init: () => Promise.reject(new Error('Not found')),
      }));

      await expect(handler.init({}, '/bloompub/abc123.bloompub')).rejects.toThrow('Not found');
    });
  });
});
