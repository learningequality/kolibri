const { percySnapshot } = require('@percy/puppeteer');

// jest.setTimeout(40000);

describe('Kolibri', () => {
  const name = 'login screen';
  beforeAll(async () => {
    await page.goto('http://localhost:8000');
  });
  it(name, async () => {
    await percySnapshot(page, 'test-login');
  });
});
