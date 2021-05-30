import { replacePaths } from '../src/H5P/H5PRunner';

describe('H5P Path replacement', () => {
  describe('CSS path replacement', () => {
    it('should replace a simple relative path', () => {
      const packageFiles = {
        'package/test.css': 'url("./test.woff")',
        'package/test.woff': 'different',
      };
      expect(replacePaths('package/test.css', packageFiles)).toEqual('url("different")');
    });
    it('should replace a more complex relative path', () => {
      const packageFiles = {
        'package/css/test.css': 'url("../fonts/test.woff")',
        'package/fonts/test.woff': 'different',
      };
      expect(replacePaths('package/css/test.css', packageFiles)).toEqual('url("different")');
    });
    it('should replace paths that use single quotes', () => {
      const packageFiles = {
        'package/css/test.css': "url('../fonts/test.woff')",
        'package/fonts/test.woff': 'different',
      };
      expect(replacePaths('package/css/test.css', packageFiles)).toEqual("url('different')");
    });
    it('should replace paths that use no quotes', () => {
      const packageFiles = {
        'package/css/test.css': 'url(../fonts/test.woff)',
        'package/fonts/test.woff': 'different',
      };
      expect(replacePaths('package/css/test.css', packageFiles)).toEqual('url(different)');
    });
    it('should not replace urls that are not a registered path', () => {
      const packageFiles = {
        'package/scripts/test.js': 'url(../../../../fonts/test.woff)',
        'package/audio/test.mp3': 'different',
      };
      expect(replacePaths('package/scripts/test.js', packageFiles)).toEqual(
        'url(../../../../fonts/test.woff)'
      );
    });
    it('should not replace urls that are not a valid path', () => {
      // This is mostly to make sure the function does not error.
      const packageFiles = {
        'package/scripts/test.js': 'url(flob a dob dib dob)',
        'package/audio/test.mp3': 'different',
      };
      expect(replacePaths('package/scripts/test.js', packageFiles)).toEqual(
        'url(flob a dob dib dob)'
      );
    });
  });
});
