import extractors from '../fileExtractors';

/**
 * Helper to create a mock DOM element
 * @param {string} tagName - Tag name to create
 * @param {object} attributes - Attributes to set on the element
 * @param {Element[]} children - Child elements to append
 * @returns {Element}
 */
function createElement(tagName, attributes = {}, children = []) {
  const element = document.createElement(tagName);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  for (const child of children) {
    element.appendChild(child);
  }
  return element;
}

describe('fileExtractors', () => {
  describe('video extractor', () => {
    it('extracts file from video element with src attribute', () => {
      const video = createElement('video', { src: 'http://example.com/video.mp4' });
      const files = extractors.video(video);

      expect(files).toHaveLength(1);
      expect(files[0]).toMatchObject({
        storage_url: 'http://example.com/video.mp4',
        preset: 'high_res_video',
        available: true,
        supplementary: false,
        thumbnail: false,
        extension: 'mp4',
      });
    });

    it('extracts files from video with source children', () => {
      const source1 = createElement('source', { src: 'video.mp4', type: 'video/mp4' });
      const source2 = createElement('source', { src: 'video.webm', type: 'video/webm' });
      const video = createElement('video', {}, [source1, source2]);

      const files = extractors.video(video);

      expect(files).toHaveLength(2);
      // DOM resolves relative URLs, so check that URL ends with the filename
      expect(files[0].storage_url).toMatch(/video\.mp4$/);
      expect(files[0].extension).toBe('mp4');
      expect(files[1].storage_url).toMatch(/video\.webm$/);
      expect(files[1].extension).toBe('webm');
    });

    it('extracts subtitle tracks from video', () => {
      const source = createElement('source', { src: 'video.mp4', type: 'video/mp4' });
      const track = createElement('track', {
        src: 'subtitles.vtt',
        kind: 'subtitles',
        srclang: 'en',
        label: 'English',
      });
      const video = createElement('video', {}, [source, track]);

      const files = extractors.video(video);

      // Should have 2 files: 1 video source + 1 subtitle
      expect(files).toHaveLength(2);

      const subtitleFile = files.find(f => f.preset === 'video_subtitle');
      expect(subtitleFile).toBeDefined();
      expect(subtitleFile.storage_url).toMatch(/subtitles\.vtt$/);
      expect(subtitleFile.supplementary).toBe(true);
      expect(subtitleFile.lang).toBe('en');
    });

    it('ignores metadata tracks', () => {
      const source = createElement('source', { src: 'video.mp4', type: 'video/mp4' });
      const metadataTrack = createElement('track', {
        src: 'chapters.vtt',
        kind: 'metadata',
      });
      const video = createElement('video', {}, [source, metadataTrack]);

      const files = extractors.video(video);

      // Should only have 1 file (the video source)
      expect(files).toHaveLength(1);
      expect(files[0].preset).toBe('high_res_video');
    });

    it('ignores chapters tracks', () => {
      const source = createElement('source', { src: 'video.mp4', type: 'video/mp4' });
      const chaptersTrack = createElement('track', {
        src: 'chapters.vtt',
        kind: 'chapters',
      });
      const video = createElement('video', {}, [source, chaptersTrack]);

      const files = extractors.video(video);

      expect(files).toHaveLength(1);
      expect(files[0].preset).toBe('high_res_video');
    });

    it('combines src attribute and source children', () => {
      const source = createElement('source', { src: 'video-alt.webm', type: 'video/webm' });
      const video = createElement('video', { src: 'video.mp4' }, [source]);

      const files = extractors.video(video);

      expect(files).toHaveLength(2);
      expect(files[0].storage_url).toMatch(/video\.mp4$/);
      expect(files[1].storage_url).toMatch(/video-alt\.webm$/);
    });

    it('assigns correct priority to multiple sources', () => {
      const source1 = createElement('source', { src: 'video1.mp4', type: 'video/mp4' });
      const source2 = createElement('source', { src: 'video2.webm', type: 'video/webm' });
      const video = createElement('video', {}, [source1, source2]);

      const files = extractors.video(video);

      expect(files[0].priority).toBe(1);
      expect(files[1].priority).toBe(2);
    });
  });

  describe('audio extractor', () => {
    it('extracts file from audio element with src attribute', () => {
      const audio = createElement('audio', { src: 'http://example.com/audio.mp3' });
      const files = extractors.audio(audio);

      expect(files).toHaveLength(1);
      expect(files[0]).toMatchObject({
        storage_url: 'http://example.com/audio.mp3',
        preset: 'audio',
        available: true,
        supplementary: false,
        thumbnail: false,
        extension: 'mp3',
      });
    });

    it('extracts files from audio with source children', () => {
      const source = createElement('source', { src: 'audio.mp3', type: 'audio/mpeg' });
      const audio = createElement('audio', {}, [source]);

      const files = extractors.audio(audio);

      expect(files).toHaveLength(1);
      expect(files[0].storage_url).toMatch(/audio\.mp3$/);
      expect(files[0].preset).toBe('audio');
    });

    it('returns empty array for audio without sources', () => {
      const audio = createElement('audio', {});
      const files = extractors.audio(audio);

      expect(files).toHaveLength(0);
    });
  });

  describe('extractor exports', () => {
    it('exports video and audio extractors', () => {
      expect(extractors).toHaveProperty('video');
      expect(extractors).toHaveProperty('audio');
      expect(typeof extractors.video).toBe('function');
      expect(typeof extractors.audio).toBe('function');
    });
  });
});
