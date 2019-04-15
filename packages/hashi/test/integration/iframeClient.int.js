const url = function(html) {
  return `http://127.0.0.1:6543/${html}.html`;
};

describe('iframe client', () => {
  it('should execute inline script elements in order', async () => {
    await page.goto(url('inlineorder'));
    await page.waitForFunction('Boolean(window.loadTimes && window.loadTimes[3])');
    const time1 = await page.evaluate('window.loadTimes[1]');
    const time2 = await page.evaluate('window.loadTimes[2]');
    const time3 = await page.evaluate('window.loadTimes[3]');
    expect(time1).toBeLessThan(time2);
    expect(time2).toBeLessThan(time3);
  });
  describe('scripts loaded from source', () => {
    it('should execute loaded script elements in order', async () => {
      await page.goto(url('scriptorder'));
      await page.waitForFunction('Boolean(window.loadTimes && window.loadTimes[3])');
      const time1 = await page.evaluate('window.loadTimes[1]');
      const time2 = await page.evaluate('window.loadTimes[2]');
      const time3 = await page.evaluate('window.loadTimes[3]');
      expect(time1).toBeLessThan(time2);
      expect(time2).toBeLessThan(time3);
    });
    it('should execute deferred script elements in order after non-deferred scripts', async () => {
      await page.goto(url('deferred'));
      await page.waitForFunction('Boolean(window.loadTimes && window.loadTimes[6])');
      const time1 = await page.evaluate('window.loadTimes[1]');
      const time2 = await page.evaluate('window.loadTimes[2]');
      const time3 = await page.evaluate('window.loadTimes[3]');
      const time4 = await page.evaluate('window.loadTimes[4]');
      const time5 = await page.evaluate('window.loadTimes[5]');
      const time6 = await page.evaluate('window.loadTimes[6]');
      expect(time1).toBeLessThan(time2);
      expect(time2).toBeLessThan(time3);
      expect(time3).toBeLessThan(time4);
      expect(time4).toBeLessThan(time5);
      expect(time5).toBeLessThan(time6);
    });
  });
  it('should execute all script elements in order even if they error', async () => {
    await page.goto(url('error'));
    await page.waitForFunction('Boolean(window.loadTimes && window.loadTimes[3])');
    const time1 = await page.evaluate('window.loadTimes[1]');
    const time2 = await page.evaluate('window.loadTimes[2]');
    const time3 = await page.evaluate('window.loadTimes[3]');
    expect(time1).toBeLessThan(time2);
    expect(time2).toBeLessThan(time3);
  });
  it('should execute script elements even if hashi loading fails', async () => {
    await page.goto(url('nowindowname'));
    await page.waitForFunction('Boolean(window.loadTimes && window.loadTimes[1])');
    const time1 = await page.evaluate('window.loadTimes[1]');
    expect(time1).not.toBeUndefined();
  });
});
