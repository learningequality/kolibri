import BloomRunner from './BloomRunner';

jest.mock('kolibri-zip', () => jest.fn());

describe('BloomRunner', () => {
  describe('init', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('starts the player once the book is processed, whatever the frame is showing', async () => {
      // The player replaces the frame's document, so there is nothing to wait for.
      jest.spyOn(BloomRunner.prototype, 'processFiles').mockResolvedValue();
      const runner = new BloomRunner();
      const iframe = document.createElement('iframe');

      await runner.init(iframe, '/content/storage/abc.bloompub');

      expect(iframe.src).toContain('bloomplayer.htm');
    });

    it('rejects when starting the player throws', async () => {
      jest.spyOn(BloomRunner.prototype, 'processFiles').mockResolvedValue();
      const failure = new Error('navigation blocked');
      const iframe = {
        set src(value) {
          throw failure;
        },
      };

      await expect(new BloomRunner().init(iframe, '/b.bloompub')).rejects.toBe(failure);
    });
  });

  describe('initBloom', () => {
    function runnerWithIframe(iframe) {
      const runner = new BloomRunner();
      runner.iframe = iframe;
      runner.contentUrl = 'blob:book.htm';
      runner.metaUrl = 'blob:meta.json';
      return runner;
    }

    it('points the player at the book', () => {
      const iframe = {};
      const runner = runnerWithIframe(iframe);

      runner.initBloom();

      const [path, query] = iframe.src.split('?');
      const params = new URLSearchParams(query);
      expect(path).toContain('bloomplayer.htm');
      expect(params.get('url')).toBe('blob:book.htm');
      expect(params.get('metaJsonUrl')).toBe('blob:meta.json');
    });
  });
});
