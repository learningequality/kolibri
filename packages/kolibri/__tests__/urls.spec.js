import plugin_data from 'kolibri-plugin-data';
import { createUrlResolver } from '../urls';

// Mock plugin data import
jest.mock('kolibri-plugin-data');

describe('UrlResolver', () => {
  let Urls;

  beforeEach(() => {
    // Setup mock plugin data
    plugin_data.urls = {
      prefix: '/test/',
      __staticUrl: '/static/',
      __mediaUrl: '/media/',
      __contentUrl: '/content/',
      __zipContentUrl: '/zipcontent/',
      __hashiUrl: '/hashi/',
      __zipContentOrigin: 'http://localhost',
      __zipContentPort: '8000',
      urls: {
        user_profile_detail: [['api/users/%(pk)s/', ['pk']]],
        membership_detail: [
          ['api/auth/membership/%(pk)s.%(format)s', ['pk', 'format']],
          ['api/auth/membership/%(pk)s/', ['pk']],
        ],
        simple_list: [['api/simple/', []]],
        download_file: [['api/download/%(type)s/%(id)s/', ['type', 'id']]],
      },
    };
    Urls = createUrlResolver();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('URL pattern handling', () => {
    test('handles simple patterns with no parameters', () => {
      expect(Urls.simple_list()).toBe('/test/api/simple/');
    });

    test('handles patterns with single variations', () => {
      expect(Urls.user_profile_detail(123)).toBe('/test/api/users/123/');
    });

    test('handles patterns with multiple variations', () => {
      // Full format
      expect(Urls['membership_detail']({ pk: '123', format: 'json' })).toBe(
        '/test/api/auth/membership/123.json',
      );

      // Short format
      expect(Urls['membership_detail']({ pk: '123' })).toBe('/test/api/auth/membership/123/');
    });
  });

  describe('Parameter handling', () => {
    test('handles named parameters', () => {
      expect(Urls['download_file']({ type: 'document', id: '123' })).toBe(
        '/test/api/download/document/123/',
      );
    });

    test('handles positional parameters', () => {
      expect(Urls['download_file']('document', '123')).toBe('/test/api/download/document/123/');
    });

    test('handles URL encoding in parameters', () => {
      expect(Urls['download_file']('file type', 'test/id')).toBe(
        '/test/api/download/file%20type/test%2Fid/',
      );
    });

    test('throws error for missing required parameters', () => {
      expect(() => Urls['download_file']({ type: 'document' })).toThrow(
        'Could not find matching URL pattern',
      );
    });

    test('throws error for wrong number of positional parameters', () => {
      expect(() => Urls['download_file']('single')).toThrow('Could not find matching URL pattern');
    });
  });

  describe('Special URL methods', () => {
    const originalLocation = window.location;

    beforeEach(() => {
      delete window.location;
      window.location = new URL('http://kolibri.time');
    });

    afterEach(() => {
      window.location = originalLocation;
    });

    test('generates static URLs', () => {
      expect(Urls.static('js/bundle.js')).toBe('http://kolibri.time/static/js/bundle.js');
    });

    test('generates media URLs', () => {
      expect(Urls.media('images/logo.png')).toBe('http://kolibri.time/media/images/logo.png');
    });

    test('generates hashi URLs', () => {
      expect(Urls.hashi()).toBe('http://localhost:8000/hashi/');
    });

    test('generates zip content URLs', () => {
      expect(Urls.zipContentUrl('abc123', 'mp4')).toBe(
        'http://localhost:8000/zipcontent/abc123.mp4/',
      );

      expect(Urls.zipContentUrl('abc123', 'mp4', 'embedded/file.mp4')).toBe(
        'http://localhost:8000/zipcontent/abc123.mp4/embedded/file.mp4',
      );

      expect(Urls.zipContentUrl('abc123', 'mp4', '', 'baseurl')).toBe(
        'http://localhost:8000/zipcontent/baseurl/abc123.mp4/',
      );
    });

    test('generates storage URLs', () => {
      expect(Urls.storageUrl('abc123', 'mp4')).toBe('http://kolibri.time/content/a/b/abc123.mp4');
    });

    test('throws error when special URLs are not defined', () => {
      plugin_data.urls.__staticUrl = undefined;
      jest.resetModules();
      const UrlsNoStatic = createUrlResolver();

      expect(() => UrlsNoStatic.static('test.js')).toThrow('Static Url is not defined');
    });
  });

  describe('Error handling', () => {
    test('throws error for non-existent patterns', () => {
      expect(() => Urls.nonExistentPattern()).toThrow('URL pattern "nonExistentPattern" not found');
    });

    test('handles initialization with no plugin data', () => {
      jest.resetModules();
      plugin_data.urls = undefined;
      const UrlsNoData = createUrlResolver();

      expect(() => UrlsNoData['user_profile_detail'](123)).toThrow(
        'URL pattern "user_profile_detail" not found',
      );
    });
    test('throws error if URL pattern contains a dash', () => {
      jest.resetModules();
      plugin_data.urls = {
        urls: {
          'user-profile-detail': [['api/users/%(pk)s/', ['pk']]],
          membership_detail: [
            ['api/auth/membership/%(pk)s.%(format)s', ['pk', 'format']],
            ['api/auth/membership/%(pk)s/', ['pk']],
          ],
          'simple-list': [['api/simple/', []]],
          download_file: [['api/download/%(type)s/%(id)s/', ['type', 'id']]],
        },
      };
      expect(createUrlResolver).toThrow(
        'URL pattern names should use underscores instead of dashes. Found "user-profile-detail"',
      );
    });
  });

  describe('Proxy and fallback behavior', () => {
    test('returns same function for repeated calls', () => {
      const func1 = Urls._getUrlFunction('user_profile_detail');
      const func2 = Urls._getUrlFunction('user_profile_detail');
      expect(func1).toBe(func2);
    });

    test('proxy fallback works when Proxy is not available', () => {
      const originalProxy = global.Proxy;
      global.Proxy = undefined;

      jest.resetModules();
      const NoProxyUrls = createUrlResolver();
      expect(NoProxyUrls['user_profile_detail'](123)).toBe('/test/api/users/123/');

      global.Proxy = originalProxy;
    });
  });
});
