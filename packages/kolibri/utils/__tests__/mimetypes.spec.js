import {
  inferPresetFromMimetype,
  hasPresetForMimetype,
  getRegisteredMimetypes,
} from '../mimetypes';

describe('mimetypes utility', () => {
  describe('inferPresetFromMimetype', () => {
    it('returns correct preset for video/mp4', () => {
      expect(inferPresetFromMimetype('video/mp4')).toBe('high_res_video');
    });

    it('returns correct preset for video/webm', () => {
      expect(inferPresetFromMimetype('video/webm')).toBe('high_res_video');
    });

    it('returns correct preset for audio/mp3', () => {
      expect(inferPresetFromMimetype('audio/mp3')).toBe('audio');
    });

    it('returns correct preset for audio/mpeg', () => {
      expect(inferPresetFromMimetype('audio/mpeg')).toBe('audio');
    });

    it('returns correct preset for application/pdf', () => {
      expect(inferPresetFromMimetype('application/pdf')).toBe('document');
    });

    it('returns correct preset for application/epub+zip', () => {
      expect(inferPresetFromMimetype('application/epub+zip')).toBe('epub');
    });

    it('returns correct preset for application/h5p+zip', () => {
      expect(inferPresetFromMimetype('application/h5p+zip')).toBe('h5p');
    });

    it('returns correct preset for application/zip', () => {
      expect(inferPresetFromMimetype('application/zip')).toBe('html5_zip');
    });

    it('returns "document" as default for unknown mimetypes', () => {
      expect(inferPresetFromMimetype('application/unknown')).toBe('document');
    });

    it('returns "document" for null mimetype', () => {
      expect(inferPresetFromMimetype(null)).toBe('document');
    });

    it('returns "document" for undefined mimetype', () => {
      expect(inferPresetFromMimetype(undefined)).toBe('document');
    });
  });

  describe('hasPresetForMimetype', () => {
    it('returns true for known mimetypes', () => {
      expect(hasPresetForMimetype('video/mp4')).toBe(true);
      expect(hasPresetForMimetype('audio/mpeg')).toBe(true);
      expect(hasPresetForMimetype('application/pdf')).toBe(true);
    });

    it('returns false for unknown mimetypes', () => {
      expect(hasPresetForMimetype('application/unknown')).toBe(false);
      expect(hasPresetForMimetype('text/html')).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(hasPresetForMimetype(null)).toBe(false);
      expect(hasPresetForMimetype(undefined)).toBe(false);
    });
  });

  describe('getRegisteredMimetypes', () => {
    it('returns an array of mimetypes', () => {
      const mimetypes = getRegisteredMimetypes();
      expect(Array.isArray(mimetypes)).toBe(true);
      expect(mimetypes.length).toBeGreaterThan(0);
    });

    it('includes expected video mimetypes', () => {
      const mimetypes = getRegisteredMimetypes();
      expect(mimetypes).toContain('video/mp4');
      expect(mimetypes).toContain('video/webm');
    });

    it('includes expected audio mimetypes', () => {
      const mimetypes = getRegisteredMimetypes();
      expect(mimetypes).toContain('audio/mp3');
      expect(mimetypes).toContain('audio/mpeg');
    });

    it('includes expected document mimetypes', () => {
      const mimetypes = getRegisteredMimetypes();
      expect(mimetypes).toContain('application/pdf');
    });
  });
});
