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
  it('should make document.write not overwrite the DOM', async () => {
    await page.goto(url('documentwrite'));
    await page.waitForSelector('script#test');
    const insertedScript = await page.$('script#test');
    const originalScript = await page.$('script#nottest');
    expect(insertedScript).not.toBe(null);
    expect(originalScript).not.toBe(null);
  });
  it('should make document.write append to the DOM at the point of execution as if writing to an open stream', async () => {
    await page.goto(url('documentwrite'));
    await page.waitForSelector('script#test');
    const siblingElement = await page.$('script#nottest+*');
    expect(await (await siblingElement.getProperty('id')).jsonValue()).toBe('test');
  });
  it('should make body available only after preceding scripts have executed', async () => {
    await page.goto(url('incrementaldomrender'));
    await page.waitForFunction('Boolean(window.headRendered)');
    const bodyDuringHead = await page.evaluate('window.bodyDuringHead');
    expect(bodyDuringHead).toBe(false);
    await page.waitForFunction('Boolean(window.bodyStarted)');
    const nextElementDuringBody = await page.evaluate('window.nextElementDuringBody');
    expect(nextElementDuringBody).toBe(true);
  });
});
