import {
  getAbsoluteFilePath,
  getCSSPaths,
  replaceCSSPaths,
  getDOMPaths,
  replaceDOMPaths,
} from '../src/fileUtils';

describe('File Path replacement', () => {
  describe('Absolute path resolution', () => {
    it('should resolve a simple relative path', () => {
      expect(getAbsoluteFilePath('package/test.css', './test.woff')).toEqual('package/test.woff');
    });
    it('should resolve a more complex relative path', () => {
      expect(getAbsoluteFilePath('package/css/test.css', '../fonts/test.woff')).toEqual(
        'package/fonts/test.woff'
      );
    });
  });
  describe('CSS path finding', () => {
    it('should find a simple relative path', () => {
      const packageFiles = ['./test.woff'];
      expect(getCSSPaths('url("./test.woff")')).toEqual(packageFiles);
    });
    it('should find a more complex relative path', () => {
      const packageFiles = ['../fonts/test.woff'];
      expect(getCSSPaths('url("../fonts/test.woff")')).toEqual(packageFiles);
    });
    it('should find a more complex relative path with query parameters', () => {
      const packageFiles = ['../fonts/test.woff'];
      expect(getCSSPaths('url("../fonts/test.woff?iefix")')).toEqual(packageFiles);
    });
    it('should find paths that use single quotes', () => {
      const packageFiles = ['../fonts/test.woff'];
      expect(getCSSPaths("url('../fonts/test.woff')")).toEqual(packageFiles);
    });
    it('should find paths that use single quotes with query parameters', () => {
      const packageFiles = ['../fonts/test.woff'];
      expect(getCSSPaths("url('../fonts/test.woff?iefix')")).toEqual(packageFiles);
    });
    it('should find paths that use no quotes', () => {
      const packageFiles = ['../fonts/test.woff'];
      expect(getCSSPaths('url(../fonts/test.woff)')).toEqual(packageFiles);
    });
    it('should find paths with no quotes with query parameters', () => {
      const packageFiles = ['../fonts/test.woff'];
      expect(getCSSPaths('url(../fonts/test.woff?iefix)')).toEqual(packageFiles);
    });
  });
  describe('CSS path replacement', () => {
    it('should replace a simple relative path', () => {
      const packageFiles = {
        './test.woff': 'different',
      };
      expect(replaceCSSPaths('url("./test.woff")', packageFiles)).toEqual('url("different")');
    });
    it('should replace a more complex relative path', () => {
      const packageFiles = {
        '../fonts/test.woff': 'different',
      };
      expect(replaceCSSPaths('url("../fonts/test.woff")', packageFiles)).toEqual(
        'url("different")'
      );
    });
    it('should replace paths that use single quotes', () => {
      const packageFiles = {
        '../fonts/test.woff': 'different',
      };
      expect(replaceCSSPaths("url('../fonts/test.woff')", packageFiles)).toEqual(
        "url('different')"
      );
    });
    it('should replace paths that use no quotes', () => {
      const packageFiles = {
        '../fonts/test.woff': 'different',
      };
      expect(replaceCSSPaths('url(../fonts/test.woff)', packageFiles)).toEqual('url(different)');
    });
    it('should replace paths that use query parameters', () => {
      const packageFiles = {
        '../fonts/test.woff': 'different',
      };
      expect(replaceCSSPaths('url(../fonts/test.woff?iefix)', packageFiles)).toEqual(
        'url(different)'
      );
    });
    it('should not replace urls that are not a registered path', () => {
      const packageFiles = {
        '../../../../audio/test.mp3': 'different',
      };
      expect(replaceCSSPaths('url(../../../../fonts/test.woff)', packageFiles)).toEqual(
        'url(../../../../fonts/test.woff)'
      );
    });
    it('should not replace urls that are not a valid path', () => {
      // This is mostly to make sure the function does not error.
      const packageFiles = {
        'package/audio/test.mp3': 'different',
      };
      expect(replaceCSSPaths('url(flob a dob dib dob)', packageFiles)).toEqual(
        'url(flob a dob dib dob)'
      );
    });
  });
  const htmlTemplate = (attr, value) =>
    `<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body><img ${attr}="${value}" /></body></html>`;
  describe.each(['href', 'src'])('HTML path finding for %s', attr => {
    const mimeType = 'text/html';
    it('should find a simple relative path', () => {
      const packageFiles = ['./test.png'];
      expect(getDOMPaths(htmlTemplate(attr, './test.png'), mimeType)).toEqual(packageFiles);
    });
    it('should find a more complex relative path', () => {
      const packageFiles = ['../fonts/test.png'];
      expect(getDOMPaths(htmlTemplate(attr, '../fonts/test.png'), mimeType)).toEqual(packageFiles);
    });
    it('should find a more complex relative path with query parameters', () => {
      const packageFiles = ['../fonts/test.png'];
      expect(getDOMPaths(htmlTemplate(attr, '../fonts/test.png?iefix'), mimeType)).toEqual(
        packageFiles
      );
    });
  });
  describe.each(['href', 'src'])('HTML path replacement for %s', attr => {
    const mimeType = 'text/html';
    it('should replace a simple relative path', () => {
      const packageFiles = {
        './test.png': 'different',
      };
      expect(replaceDOMPaths(htmlTemplate(attr, './test.png'), packageFiles, mimeType)).toEqual(
        htmlTemplate(attr, 'different')
      );
    });
    it('should replace a more complex relative path', () => {
      const packageFiles = {
        '../fonts/test.png': 'different',
      };
      expect(
        replaceDOMPaths(htmlTemplate(attr, '../fonts/test.png'), packageFiles, mimeType)
      ).toEqual(htmlTemplate(attr, 'different'));
    });
    it('should replace paths with query parameters', () => {
      const packageFiles = {
        '../fonts/test.png': 'different',
      };
      expect(
        replaceDOMPaths(htmlTemplate(attr, '../fonts/test.png?iefix'), packageFiles, mimeType)
      ).toEqual(htmlTemplate(attr, 'different'));
    });
  });
  const xmlTemplate = (attr, value) =>
    `<tt xmlns="http://www.w3.org/ns/ttml" xml:lang="en"><body><div><img ${attr}="${value}"/></div></body></tt>`;
  describe.each(['href', 'src'])('XML path finding for %s', attr => {
    const mimeType = 'text/xml';
    it('should find a simple relative path', () => {
      const packageFiles = ['./test.png'];
      expect(getDOMPaths(xmlTemplate(attr, './test.png'), mimeType)).toEqual(packageFiles);
    });
    it('should find a more complex relative path', () => {
      const packageFiles = ['../fonts/test.png'];
      expect(getDOMPaths(xmlTemplate(attr, '../fonts/test.png'), mimeType)).toEqual(packageFiles);
    });
    it('should find a more complex relative path with query parameters', () => {
      const packageFiles = ['../fonts/test.png'];
      expect(getDOMPaths(xmlTemplate(attr, '../fonts/test.png?iefix'), mimeType)).toEqual(
        packageFiles
      );
    });
  });
  describe.each(['href', 'src'])('XML path replacement for %s', attr => {
    const mimeType = 'text/xml';
    it('should replace a simple relative path', () => {
      const packageFiles = {
        './test.png': 'different',
      };
      expect(replaceDOMPaths(xmlTemplate(attr, './test.png'), packageFiles, mimeType)).toEqual(
        xmlTemplate(attr, 'different')
      );
    });
    it('should replace a more complex relative path', () => {
      const packageFiles = {
        '../fonts/test.png': 'different',
      };
      expect(
        replaceDOMPaths(xmlTemplate(attr, '../fonts/test.png'), packageFiles, mimeType)
      ).toEqual(xmlTemplate(attr, 'different'));
    });
    it('should replace paths with query parameters', () => {
      const packageFiles = {
        '../fonts/test.png': 'different',
      };
      expect(
        replaceDOMPaths(xmlTemplate(attr, '../fonts/test.png?iefix'), packageFiles, mimeType)
      ).toEqual(xmlTemplate(attr, 'different'));
    });
  });
});
