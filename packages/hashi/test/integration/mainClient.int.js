const url = function(html) {
  return `http://127.0.0.1:6543/${html}.html`;
};

describe('Hashi integration', () => {
  it('should not be ready if the iframe has not loaded', async () => {
    await page.goto(url('iframeunloaded'));
    await page.waitForFunction('Boolean(window.hashi)');
    expect(await page.evaluate('window.hashi.ready')).toBe(false);
  });
  it('should be ready if the ready event has been triggered', async () => {
    await page.goto(url('iframeloaded'));
    await page.waitForFunction('Boolean(window.hashi)');
    await page.waitForFunction('window.hashi.ready === true');
    expect(await page.evaluate('window.hashi.ready')).toBe(true);
  });
  it('should synchronize localstorage from inside the iframe to the hashi storage', async () => {
    await page.goto(url('iframelocalstorage'));
    await page.waitForFunction('Boolean(window.hashi)');
    await page.waitForFunction('window.hashi.ready === true');
    await page.waitForFunction('Boolean(window.data)');
    expect(await page.evaluate('window.data.localStorage.test')).toBe('this is a test');
  });
  it('should synchronize cookie from inside the iframe to the hashi storage', async () => {
    await page.goto(url('iframecookie'));
    await page.waitForFunction('Boolean(window.hashi)');
    await page.waitForFunction('window.hashi.ready === true');
    await page.waitForFunction('Boolean(window.data)');
    expect(await page.evaluate('window.data.cookie.rootCookies.test.value')).toBe('this is a test');
  });
});
