const { percySnapshot } = require('@percy/webdriverio');

describe('Kolibri login screen', () => {
  beforeAll(() => {
    browser.url('/');
  });

  it('should render properly', async () => {
    const h1 = $('h1');
    expect(h1.getText()).toEqual('Kolibri');

    const { capabilities } = browser;
    const name = [
      capabilities.platform,
      capabilities.browserName,
      capabilities.version,
      'Test Login',
    ];

    await percySnapshot(browser, name.join(' | '));
  });
});
