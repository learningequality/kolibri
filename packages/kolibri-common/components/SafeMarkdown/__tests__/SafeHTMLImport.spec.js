jest.mock('kolibri', () => ({}));
jest.mock('kolibri/urls');
jest.mock('markdown-it', () => {
  throw new Error('SafeHTML loaded Markdown');
});
jest.mock('markdown-it-math/no-default-renderer', () => {
  throw new Error('SafeHTML loaded Markdown math');
});
jest.mock('mathjax-full/js/input/tex', () => {
  throw new Error('SafeHTML loaded TeX');
});

describe('SafeHTML imports', () => {
  it('imports SafeHTML without initializing Markdown or TeX', () => {
    expect(() => require('../../SafeHTML')).not.toThrow();
  });
});
