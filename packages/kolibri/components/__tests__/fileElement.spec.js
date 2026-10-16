import { createFileElement } from '../SandboxedContentViewer/internal/fileElement';

describe('createFileElement', () => {
  it('makes the element SafeHTML would show each kind of file as', () => {
    expect(createFileElement('application/pdf', 'blob:4').outerHTML).toBe(
      '<object data="blob:4" type="application/pdf"></object>',
    );
  });

  it.each([
    ['video/webm', 'blob:2', '<video><source src="blob:2" type="video/webm"></video>'],
    ['audio/mpeg', 'blob:3', '<audio><source src="blob:3" type="audio/mpeg"></audio>'],
  ])('gives a %s file, whose blob url has no extension, its type', (mimetype, url, html) => {
    expect(createFileElement(mimetype, url).outerHTML).toBe(html);
  });
});
