import router from 'kolibri/router';
import samePageCheckGenerator from '../samePageCheckGenerator';

jest.mock('kolibri/router', () => ({
  currentRoute: { fullPath: '/initial' },
}));

describe('samePageCheckGenerator', () => {
  beforeEach(() => {
    router.currentRoute = { fullPath: '/initial' };
  });

  describe('without route argument (component context)', () => {
    it('returns true when the route has not changed', () => {
      const shouldResolve = samePageCheckGenerator();
      expect(shouldResolve()).toBe(true);
    });

    it('returns false after navigation to a different route', () => {
      const shouldResolve = samePageCheckGenerator();
      router.currentRoute = { fullPath: '/other' };
      expect(shouldResolve()).toBe(false);
    });

    it('returns true when route changes and then returns to the original', () => {
      const shouldResolve = samePageCheckGenerator();
      router.currentRoute = { fullPath: '/other' };
      router.currentRoute = { fullPath: '/initial' };
      expect(shouldResolve()).toBe(true);
    });
  });

  describe('with route argument (beforeEach handler context)', () => {
    it('compares against the provided route, not router.currentRoute', () => {
      // Simulate beforeEach context: router.currentRoute is still the old route,
      // but the handler has access to the target route.
      router.currentRoute = { fullPath: '/old-page' };
      const targetRoute = { fullPath: '/new-page' };
      const shouldResolve = samePageCheckGenerator(targetRoute);

      // After navigation completes, router.currentRoute becomes the target route
      router.currentRoute = { fullPath: '/new-page' };
      expect(shouldResolve()).toBe(true);
    });

    it('returns false when navigated away from the target route', () => {
      router.currentRoute = { fullPath: '/old-page' };
      const targetRoute = { fullPath: '/new-page' };
      const shouldResolve = samePageCheckGenerator(targetRoute);

      // User navigates to a third page
      router.currentRoute = { fullPath: '/another-page' };
      expect(shouldResolve()).toBe(false);
    });
  });

  it('multiple generators track independently', () => {
    const first = samePageCheckGenerator();
    router.currentRoute = { fullPath: '/page-2' };
    const second = samePageCheckGenerator();

    expect(first()).toBe(false);
    expect(second()).toBe(true);
  });
});
