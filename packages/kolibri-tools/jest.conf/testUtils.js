/* eslint-env jest */

// Add this to the beginning of a test suite to avoid 'not implemented: navigation'
// errors from JSDOM
export function stubWindowLocation(beforeAll, afterAll) {
  const originalLocation = window.location;

  beforeAll(() => {
    delete window.location;

    window.location = {
      href: '',
      pathname: '',
    };
  });

  afterAll(() => {
    window.location = originalLocation;
  });
}
