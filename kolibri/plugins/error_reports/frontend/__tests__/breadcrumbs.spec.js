// These tests intentionally call console methods to verify breadcrumb capture
/* eslint-disable no-console */
import logging from 'kolibri-logging';
import {
  getBreadcrumbs,
  addBreadcrumb,
  initBreadcrumbs,
  clearBreadcrumbs,
  _resetInitialized,
  _resetWrappers,
} from '../breadcrumbs';

jest.mock('kolibri/urls', () => ({
  __esModule: true,
  default: {
    'kolibri:kolibri.plugins.error_reports:report': () => '/error_reports/api/report',
  },
}));

describe('breadcrumbs', () => {
  beforeEach(() => {
    clearBreadcrumbs();
    _resetInitialized();
    jest.clearAllMocks();
  });

  describe('addBreadcrumb', () => {
    it('should add a Sentry-shaped breadcrumb with a seconds timestamp', () => {
      const before = Date.now() / 1000;
      addBreadcrumb({ type: 'ui', category: 'ui.click', message: 'button' });

      const breadcrumbs = getBreadcrumbs();
      expect(breadcrumbs.length).toBe(1);
      expect(breadcrumbs[0]).toMatchObject({
        type: 'ui',
        category: 'ui.click',
        message: 'button',
      });
      // Sentry breadcrumbs are timestamped in epoch seconds, not milliseconds.
      expect(breadcrumbs[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(breadcrumbs[0].timestamp).toBeLessThanOrEqual(Date.now() / 1000 + 1);
    });

    it('should drop oldest breadcrumbs when limit is exceeded', () => {
      for (let i = 0; i < 35; i++) {
        addBreadcrumb({ category: 'item', data: { index: i } });
      }

      const breadcrumbs = getBreadcrumbs();
      // First 5 should be dropped
      expect(breadcrumbs[0].data.index).toBe(5);
      expect(breadcrumbs[29].data.index).toBe(34);
    });
  });

  describe('getBreadcrumbs', () => {
    it('should return empty array when no breadcrumbs', () => {
      expect(getBreadcrumbs()).toEqual([]);
    });

    it('should return a copy, not the original array', () => {
      addBreadcrumb({ category: 'item', data: {} });

      const crumbs1 = getBreadcrumbs();
      const crumbs2 = getBreadcrumbs();

      expect(crumbs1).not.toBe(crumbs2);
      expect(crumbs1).toEqual(crumbs2);
    });
  });

  describe('clearBreadcrumbs', () => {
    it('should remove all breadcrumbs', () => {
      addBreadcrumb({ category: 'item1', data: {} });
      addBreadcrumb({ category: 'item2', data: {} });

      clearBreadcrumbs();

      expect(getBreadcrumbs()).toEqual([]);
    });
  });

  describe('initBreadcrumbs', () => {
    describe('console wrapping', () => {
      let consoleSpies;

      beforeEach(() => {
        // Mock the console methods so the intentional console calls in these
        // tests are silenced (jest-fail-on-console fails the suite on any
        // unsilenced console output), then wrap the mocks.
        consoleSpies = ['log', 'warn', 'error', 'info'].map(level =>
          jest.spyOn(console, level).mockImplementation(() => {}),
        );
        _resetWrappers();
      });

      afterEach(() => {
        consoleSpies.forEach(spy => spy.mockRestore());
        _resetWrappers();
      });

      it('should capture console.log calls as console breadcrumbs', () => {
        initBreadcrumbs();

        console.log('test message');

        const breadcrumbs = getBreadcrumbs();
        const consoleBreadcrumb = breadcrumbs.find(b => b.category === 'console');
        expect(consoleBreadcrumb).toBeDefined();
        expect(consoleBreadcrumb.level).toBe('info');
        expect(consoleBreadcrumb.message).toContain('test message');
      });

      it('should map console.warn to the warning level', () => {
        initBreadcrumbs();

        console.warn('warning message');

        const breadcrumbs = getBreadcrumbs();
        const consoleBreadcrumb = breadcrumbs.find(b => b.level === 'warning');
        expect(consoleBreadcrumb).toBeDefined();
        expect(consoleBreadcrumb.category).toBe('console');
        expect(consoleBreadcrumb.message).toContain('warning message');
      });

      it('should map console.error to the error level', () => {
        initBreadcrumbs();

        console.error('error message');

        const breadcrumbs = getBreadcrumbs();
        const consoleBreadcrumb = breadcrumbs.find(b => b.level === 'error');
        expect(consoleBreadcrumb).toBeDefined();
        expect(consoleBreadcrumb.message).toContain('error message');
      });

      it('should capture loggers created before the console was wrapped', () => {
        const logger = logging.getLogger('created-before-breadcrumbs');
        logger.setLevel('error', false);
        initBreadcrumbs();

        logger.error('logged early');

        const consoleBreadcrumb = getBreadcrumbs().find(b => b.level === 'error');
        expect(consoleBreadcrumb.message).toContain('logged early');
      });

      it('should join the string forms of the arguments into the message', () => {
        initBreadcrumbs();

        console.log('user', { name: 'Ada' }, 42);

        const consoleBreadcrumb = getBreadcrumbs().find(b => b.category === 'console');
        expect(consoleBreadcrumb.message).toBe('user [object Object] 42');
      });

      it('should not serialize the contents of a logged error', () => {
        initBreadcrumbs();
        const error = new Error('Request failed with status code 500');
        error.toJSON = () => ({ config: { data: '{"password":"hunter2"}' } });

        console.error(error);

        const consoleBreadcrumb = getBreadcrumbs().find(b => b.category === 'console');
        expect(consoleBreadcrumb.message).toBe('Error: Request failed with status code 500');
      });

      it('should record an argument that cannot be converted to a string', () => {
        initBreadcrumbs();

        console.log(Object.create(null));

        const consoleBreadcrumb = getBreadcrumbs().find(b => b.category === 'console');
        expect(consoleBreadcrumb.message).toBe('[unserializable]');
      });

      it('should truncate long console messages', () => {
        initBreadcrumbs();

        console.log('x'.repeat(2000));

        const breadcrumbs = getBreadcrumbs();
        const consoleBreadcrumb = breadcrumbs.find(b => b.category === 'console');
        expect(consoleBreadcrumb.message.length).toBeLessThanOrEqual(1024);
      });
    });

    describe('DOM event capturing', () => {
      it('should capture click events as ui.click breadcrumbs', () => {
        initBreadcrumbs();

        const button = document.createElement('button');
        button.id = 'test-button';
        button.className = 'btn primary';
        button.textContent = 'Click me';
        document.body.appendChild(button);

        button.click();

        const breadcrumbs = getBreadcrumbs();
        const clickBreadcrumb = breadcrumbs.find(b => b.category === 'ui.click');

        expect(clickBreadcrumb).toBeDefined();
        expect(clickBreadcrumb.type).toBe('ui');
        // A Sentry-style selector path (tag.classes) built up the ancestor
        // chain. The element's text content is deliberately not captured.
        expect(clickBreadcrumb.message).toContain('button.btn.primary');
        expect(clickBreadcrumb.message).toContain(' > '); // ancestor chain
        expect(clickBreadcrumb.message.startsWith(' > ')).toBe(false); // no empty root
        expect(clickBreadcrumb.message).not.toContain('Click me');
        expect(clickBreadcrumb.message).not.toContain('test-button');

        document.body.removeChild(button);
      });

      it('should not record which picture password icons are clicked', () => {
        initBreadcrumbs();

        const option = document.createElement('div');
        option.innerHTML =
          '<label for="picture-password-option-cat"><input id="picture-password-option-cat" ' +
          'type="checkbox" class="visuallyhidden"></label>';
        document.body.appendChild(option);

        option.querySelector('label').click();

        const clicks = getBreadcrumbs().filter(b => b.category === 'ui.click');
        expect(clicks.length).toBeGreaterThan(0);
        clicks.forEach(click => expect(click.message).not.toContain('cat'));

        document.body.removeChild(option);
      });

      it('should read the classes of SVG elements', () => {
        initBreadcrumbs();

        const container = document.createElement('div');
        container.innerHTML = '<svg class="icon"><path class="stroke"></path></svg>';
        document.body.appendChild(container);

        container.querySelector('path').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        const clickBreadcrumb = getBreadcrumbs().find(b => b.category === 'ui.click');
        expect(clickBreadcrumb.message).toMatch(/svg\.icon > path\.stroke$/);

        document.body.removeChild(container);
      });

      it('serializes allowlisted attributes but never element content', () => {
        initBreadcrumbs();

        const input = document.createElement('input');
        input.setAttribute('type', 'email');
        input.setAttribute('name', 'login');
        input.setAttribute('value', 'secret@example.com');
        document.body.appendChild(input);

        input.click();

        const clickBreadcrumb = getBreadcrumbs().find(b => b.category === 'ui.click');

        expect(clickBreadcrumb.message).toContain('input');
        expect(clickBreadcrumb.message).toContain('[type="email"]');
        expect(clickBreadcrumb.message).toContain('[name="login"]');
        // `value` is not in the allowlist, so the entered text never leaks.
        expect(clickBreadcrumb.message).not.toContain('secret@example.com');

        document.body.removeChild(input);
      });

      it('should truncate long element descriptions', () => {
        initBreadcrumbs();

        const div = document.createElement('div');
        div.className = 'a'.repeat(2000);
        document.body.appendChild(div);

        div.click();

        const breadcrumbs = getBreadcrumbs();
        const clickBreadcrumb = breadcrumbs.find(b => b.category === 'ui.click');

        expect(clickBreadcrumb.message.length).toBeLessThanOrEqual(1024);

        document.body.removeChild(div);
      });
    });

    describe('fetch wrapping', () => {
      let originalFetch;

      beforeEach(() => {
        // Reset wrappers so fetch can be wrapped fresh for each test
        _resetWrappers();
        clearBreadcrumbs();
        originalFetch = window.fetch;
        window.fetch = jest.fn().mockResolvedValue({ status: 201, ok: true });
      });

      afterEach(() => {
        window.fetch = originalFetch;
      });

      it('should capture fetch requests with the response status', async () => {
        initBreadcrumbs();

        await window.fetch('/api/test', { method: 'post' });

        const breadcrumbs = getBreadcrumbs();
        const fetchBreadcrumb = breadcrumbs.find(b => b.category === 'fetch');

        expect(fetchBreadcrumb).toBeDefined();
        expect(fetchBreadcrumb.type).toBe('http');
        expect(fetchBreadcrumb.data.method).toBe('POST');
        expect(fetchBreadcrumb.data.url).toBe('/api/test');
        expect(fetchBreadcrumb.data.status_code).toBe(201);
      });

      it('should default to GET method when not specified', async () => {
        initBreadcrumbs();

        await window.fetch('/api/test');

        const breadcrumbs = getBreadcrumbs();
        const fetchBreadcrumb = breadcrumbs.find(b => b.category === 'fetch');

        expect(fetchBreadcrumb.data.method).toBe('GET');
      });

      it('should accept null options', async () => {
        initBreadcrumbs();

        await window.fetch('/api/test', null);

        const fetchBreadcrumb = getBreadcrumbs().find(b => b.category === 'fetch');
        expect(fetchBreadcrumb.data.method).toBe('GET');
      });

      it('should keep the full URL including the query string', async () => {
        // Matches Sentry, which records the full request URL; frontend data
        // carries little sensitive material and is re-reported into Sentry.
        initBreadcrumbs();

        await window.fetch('/api/test?page=2&q=term');

        const breadcrumbs = getBreadcrumbs();
        const fetchBreadcrumb = breadcrumbs.find(b => b.category === 'fetch');

        expect(fetchBreadcrumb.data.url).toBe('/api/test?page=2&q=term');
      });

      it('should read the method and URL from a Request', async () => {
        initBreadcrumbs();

        // jsdom has no Request; this carries the same url and method properties.
        await window.fetch({ url: 'http://localhost/api/test', method: 'HEAD' });

        const fetchBreadcrumb = getBreadcrumbs().find(b => b.category === 'fetch');
        expect(fetchBreadcrumb.data.method).toBe('HEAD');
        expect(fetchBreadcrumb.data.url).toBe('http://localhost/api/test');
      });

      it('should record a rejected fetch at error level', async () => {
        window.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
        initBreadcrumbs();

        await expect(window.fetch('/api/test')).rejects.toThrow('Failed to fetch');

        const fetchBreadcrumb = getBreadcrumbs().find(b => b.category === 'fetch');
        expect(fetchBreadcrumb.level).toBe('error');
      });

      it('should still fetch when the breadcrumb cannot be recorded', async () => {
        const fetchMock = window.fetch;
        initBreadcrumbs();

        await expect(window.fetch(Object.create(null))).resolves.toEqual({
          status: 201,
          ok: true,
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('XHR wrapping', () => {
      it('should capture XMLHttpRequest on send', () => {
        initBreadcrumbs();

        const xhr = new XMLHttpRequest();
        xhr.open('post', '/api/xhr-test');
        xhr.send(); // Need to send to trigger the breadcrumb

        const breadcrumbs = getBreadcrumbs();
        const xhrBreadcrumb = breadcrumbs.find(b => b.category === 'xhr');

        expect(xhrBreadcrumb).toBeDefined();
        expect(xhrBreadcrumb.type).toBe('http');
        expect(xhrBreadcrumb.data.method).toBe('POST');
        expect(xhrBreadcrumb.data.url).toBe('/api/xhr-test');
      });

      it('should keep the full URL including the query string', () => {
        initBreadcrumbs();

        const xhr = new XMLHttpRequest();
        xhr.open('GET', '/api/xhr-test?token=abc');
        xhr.send();

        const breadcrumbs = getBreadcrumbs();
        const xhrBreadcrumb = breadcrumbs.find(b => b.category === 'xhr');

        expect(xhrBreadcrumb.data.url).toBe('/api/xhr-test?token=abc');
      });

      it("should not record the plugin's own error report submissions", () => {
        initBreadcrumbs();

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/error_reports/api/report');
        xhr.send();

        expect(getBreadcrumbs().filter(b => b.category === 'xhr')).toEqual([]);
      });

      it('should still send when the breadcrumb cannot be recorded', () => {
        initBreadcrumbs();

        const xhr = new XMLHttpRequest();
        xhr.open('GET', '/api/xhr-test');
        xhr._breadcrumbData.url = 'http://[invalid';

        expect(() => xhr.send()).not.toThrow();
      });
    });

    describe('router integration', () => {
      it('should capture route changes when router is provided', () => {
        const mockRouter = {
          afterEach: jest.fn(callback => {
            // Simulate a route change
            callback(
              { path: '/new-page', fullPath: '/new-page', name: 'NewPage' },
              { path: '/old-page', fullPath: '/old-page', name: 'OldPage' },
            );
          }),
        };

        initBreadcrumbs(mockRouter);

        const breadcrumbs = getBreadcrumbs();
        const routeBreadcrumb = breadcrumbs.find(b => b.category === 'navigation');

        expect(routeBreadcrumb).toBeDefined();
        expect(routeBreadcrumb.data.from).toBe('/old-page');
        expect(routeBreadcrumb.data.to).toBe('/new-page');
        expect(routeBreadcrumb.data.name).toBe('NewPage');
      });

      it('should keep the full path including the query string', () => {
        // Matches Sentry's navigation breadcrumb (full URLs).
        const mockRouter = {
          afterEach: jest.fn(callback => {
            callback(
              { path: '/search', fullPath: '/search?keywords=term', name: 'Search' },
              { path: '/home', fullPath: '/home?tab=1', name: 'Home' },
            );
          }),
        };

        initBreadcrumbs(mockRouter);

        const breadcrumbs = getBreadcrumbs();
        const routeBreadcrumb = breadcrumbs.find(b => b.category === 'navigation');

        expect(routeBreadcrumb.data.to).toBe('/search?keywords=term');
        expect(routeBreadcrumb.data.from).toBe('/home?tab=1');
      });

      it('should work without router', () => {
        // Should not throw
        expect(() => initBreadcrumbs()).not.toThrow();
      });
    });
  });
});
