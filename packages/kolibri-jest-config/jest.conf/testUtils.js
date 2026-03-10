// Run `fn` with console.error silenced.  Used to suppress jsdom's
// "Not implemented: navigation" error which fires whenever code
// assigns to window.location (non-configurable in modern jsdom).
function withSilentConsoleError(fn) {
  const orig = console.error; // eslint-disable-line no-console
  console.error = () => {}; // eslint-disable-line no-console
  try {
    fn();
  } finally {
    console.error = orig; // eslint-disable-line no-console
  }
}

// Add this to the beginning of a test suite to avoid 'not implemented: navigation'
// errors from JSDOM
export function stubWindowLocation(beforeAll, afterAll) {
  const originalLocation = window.location;

  beforeAll(() => {
    withSilentConsoleError(() => {
      delete window.location;
      window.location = {
        href: '',
        pathname: '',
      };
    });
  });

  afterAll(() => {
    withSilentConsoleError(() => {
      window.location = originalLocation;
    });
  });
}
