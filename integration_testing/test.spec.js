describe('Google', () => {
  beforeAll(async () => {
    await page.goto('http://localhost:8000');
  });
  it('should display "google" text on page', async () => {
    await expect(page.title()).resolves.toMatch('Google');
  });
});
