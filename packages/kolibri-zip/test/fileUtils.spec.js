import {
  getAbsoluteFilePath,
  getCSSPaths,
  replaceCSSPaths,
  getDOMPaths,
  replaceDOMPaths,
} from '../src/fileUtils';

describe('File Path replacement', () => {
  describe('Absolute path resolution', () => {
    it('should resolve a simple relative path', () => {
      expect(getAbsoluteFilePath('package/test.css', './test.woff')).toEqual('package/test.woff');
    });
    it('should resolve a more complex relative path', () => {
      expect(getAbsoluteFilePath('package/css/test.css', '../fonts/test.woff')).toEqual(
        'package/fonts/test.woff',
      );
    });
    it('should handle a path with a space in it', () => {
      expect(getAbsoluteFilePath('test.htm', 'Basic Book.css')).toEqual('Basic Book.css');
    });
    it('should decode special characters in paths', () => {
      expect(getAbsoluteFilePath('package/test.css', './test%23%26%3F.woff')).toEqual(
        'package/test#&?.woff',
      );
    });

    it('should decode plus signs in paths', () => {
      expect(getAbsoluteFilePath('test.htm', 'file%2Bname.css')).toEqual('file+name.css');
    });
  });
  describe('CSS path finding', () => {
    it('should find a simple relative path', () => {
      const packageFiles = ['./test.woff'];
      expect(getCSSPaths('url("./test.woff")')).toEqual(packageFiles);
    });
    it('should find a more complex relative path', () => {
      const packageFiles = ['../fonts/test.woff'];
      expect(getCSSPaths('url("../fonts/test.woff")')).toEqual(packageFiles);
    });
    it('should find a more complex relative path with query parameters', () => {
      const packageFiles = ['../fonts/test.woff'];
      expect(getCSSPaths('url("../fonts/test.woff?iefix")')).toEqual(packageFiles);
    });
    it('should find a path with a space', () => {
      const packageFiles = ['../fonts/test this.woff'];
      expect(getCSSPaths('url("../fonts/test this.woff?iefix")')).toEqual(packageFiles);
    });
    it('should find a path with an encoded space', () => {
      const packageFiles = ['../fonts/test this.woff'];
      expect(getCSSPaths('url("../fonts/test%20this.woff?iefix")')).toEqual(packageFiles);
    });
    it('should find paths that use single quotes', () => {
      const packageFiles = ['../fonts/test.woff'];
      expect(getCSSPaths("url('../fonts/test.woff')")).toEqual(packageFiles);
    });
    it('should find paths that use single quotes with query parameters', () => {
      const packageFiles = ['../fonts/test.woff'];
      expect(getCSSPaths("url('../fonts/test.woff?iefix')")).toEqual(packageFiles);
    });
    it('should find paths that use no quotes', () => {
      const packageFiles = ['../fonts/test.woff'];
      expect(getCSSPaths('url(../fonts/test.woff)')).toEqual(packageFiles);
    });
    it('should find paths with no quotes with query parameters', () => {
      const packageFiles = ['../fonts/test.woff'];
      expect(getCSSPaths('url(../fonts/test.woff?iefix)')).toEqual(packageFiles);
    });
    it('should find paths with special characters in CSS url()', () => {
      expect(getCSSPaths('url("./test%23%26%3F.woff")')).toEqual(['./test#&?.woff']);
    });
    it('should handle plus signs in CSS urls', () => {
      expect(getCSSPaths('url("./my%2Bfile.woff")')).toEqual(['./my+file.woff']);
    });
    test('handles URLs with parentheses in filename', () => {
      const css = `
        background: url('image(1).png');
        background-image: url("file(with)brackets.jpg");
        border-image: url(filename(final).gif);
      `;
      const paths = getCSSPaths(css);
      expect(paths).toEqual(['image(1).png', 'file(with)brackets.jpg', 'filename(final).gif']);
    });

    test('handles query parameters correctly with parentheses in filename', () => {
      const css = `
        background: url('image(1).png?v=123');
        background-image: url("file(with)brackets.jpg?version=2");
        border-image: url(filename(final).gif?x=1&y=2);
      `;
      const paths = getCSSPaths(css);
      expect(paths).toEqual(['image(1).png', 'file(with)brackets.jpg', 'filename(final).gif']);
    });

    test('handles complex filenames with multiple parentheses', () => {
      const css = `
        background: url('path/to/image(1)(2).png');
        background-image: url("file(with)(more)brackets.jpg");
        border-image: url(file(name(1))(v2).gif);
      `;
      const paths = getCSSPaths(css);
      expect(paths).toEqual([
        'path/to/image(1)(2).png',
        'file(with)(more)brackets.jpg',
        'file(name(1))(v2).gif',
      ]);
    });
    test('handles mixed quotes and no quotes correctly', () => {
      const css = `
        background: url(plain.png);
        background-image: url('single.jpg');
        border-image: url("double.gif");
      `;
      const paths = getCSSPaths(css);
      expect(paths).toEqual(['plain.png', 'single.jpg', 'double.gif']);
    });
    test('handles empty url() values', () => {
      const css = `
        background: url();
        background: url('');
        background: url("");
      `;
      const paths = getCSSPaths(css);
      expect(paths).toEqual(['', '', '']);
    });

    test('handles escaped quotes in filenames', () => {
      const css = `
        background: url('file\\'s.png');
        background: url("file\\".png");
      `;
      const paths = getCSSPaths(css);
      expect(paths).toEqual(["file's.png", 'file".png']);
    });

    test('handles complex combinations of parentheses and query params', () => {
      const css = `
        background: url('img(v1)(final).png?v=(1)&x=(2)');
        background: url(img((1)(2)(3)).png?v=1);
      `;
      const paths = getCSSPaths(css);
      expect(paths).toEqual(['img(v1)(final).png', 'img((1)(2)(3)).png']);
    });

    test('handles URLs with spaces and special characters', () => {
      const css = `
        background: url('my image (1).png');
        background: url("path/to/image (v2).jpg");
        background: url(folder (old)/image.png);
      `;
      const paths = getCSSPaths(css);
      expect(paths).toEqual([
        'my image (1).png',
        'path/to/image (v2).jpg',
        'folder (old)/image.png',
      ]);
    });

    test('handles malformed but recoverable URLs', () => {
      const css = `
        background: url('broken(but(fixable.png');
        background: url("missing(paren.jpg?v=1");
        background: url(extra)paren).gif);
      `;
      const paths = getCSSPaths(css);
      expect(paths).toEqual(['broken(but(fixable.png', 'missing(paren.jpg', 'extra)paren).gif']);
    });

    test('handles query parameters with special characters', () => {
      const css = `
        background: url('image.jpg?param=(test)&other=(value)');
        background: url("image.png?base64=abc()123");
        background: url(image.gif?key=test(1)&key2=test(2));
      `;
      const paths = getCSSPaths(css);
      expect(paths).toEqual(['image.jpg', 'image.png', 'image.gif']);
    });

    test('handles multiple consecutive parentheses', () => {
      const css = `
        background: url('image((((1)))).jpg');
        background: url("file(()()).png");
        background: url(multiple()()()().gif);
      `;
      const paths = getCSSPaths(css);
      expect(paths).toEqual(['image((((1)))).jpg', 'file(()()).png', 'multiple()()()().gif']);
    });
  });
  describe('CSS path replacement', () => {
    it('should replace a simple relative path', () => {
      const packageFiles = {
        './test.woff': 'different',
      };
      expect(replaceCSSPaths('url("./test.woff")', packageFiles)).toEqual('url("different")');
    });
    it('should replace a more complex relative path', () => {
      const packageFiles = {
        '../fonts/test.woff': 'different',
      };
      expect(replaceCSSPaths('url("../fonts/test.woff")', packageFiles)).toEqual(
        'url("different")',
      );
    });
    it('should replace a path with a space', () => {
      const packageFiles = {
        '../fonts/test this.woff': 'different',
      };
      expect(replaceCSSPaths('url("../fonts/test this.woff")', packageFiles)).toEqual(
        'url("different")',
      );
    });
    it('should replace a path with an encoded space', () => {
      const packageFiles = {
        '../fonts/test this.woff': 'different',
      };
      expect(replaceCSSPaths('url("../fonts/test%20this.woff")', packageFiles)).toEqual(
        'url("different")',
      );
    });
    it('should replace paths that use single quotes', () => {
      const packageFiles = {
        '../fonts/test.woff': 'different',
      };
      expect(replaceCSSPaths("url('../fonts/test.woff')", packageFiles)).toEqual(
        "url('different')",
      );
    });
    it('should replace paths that use no quotes', () => {
      const packageFiles = {
        '../fonts/test.woff': 'different',
      };
      expect(replaceCSSPaths('url(../fonts/test.woff)', packageFiles)).toEqual('url(different)');
    });
    it('should replace paths that use query parameters', () => {
      const packageFiles = {
        '../fonts/test.woff': 'different',
      };
      expect(replaceCSSPaths('url(../fonts/test.woff?iefix)', packageFiles)).toEqual(
        'url(different)',
      );
    });
    it('should not replace urls that are not a registered path', () => {
      const packageFiles = {
        '../../../../audio/test.mp3': 'different',
      };
      expect(replaceCSSPaths('url(../../../../fonts/test.woff)', packageFiles)).toEqual(
        'url(../../../../fonts/test.woff)',
      );
    });
    it('should not replace urls that are not a valid path', () => {
      // This is mostly to make sure the function does not error.
      const packageFiles = {
        'package/audio/test.mp3': 'different',
      };
      expect(replaceCSSPaths('url(flob a dob dib dob)', packageFiles)).toEqual(
        'url(flob a dob dib dob)',
      );
    });
    it('should replace paths with special characters in CSS', () => {
      const packageFiles = {
        './test#&?.woff': 'new-file.woff',
      };
      expect(replaceCSSPaths('url("./test%23%26%3F.woff")', packageFiles)).toEqual(
        'url("new-file.woff")',
      );
    });
    test('replaces paths containing parentheses correctly', () => {
      const css = `
        background: url('image(1).png');
        background-image: url("file(with)brackets.jpg?v=123");
      `;
      const packageFiles = {
        'image(1).png': 'new/path/image(1).png',
        'file(with)brackets.jpg': 'new/path/file(with)brackets.jpg',
      };

      const result = replaceCSSPaths(css, packageFiles);
      expect(result).toBe(`
        background: url('new/path/image(1).png');
        background-image: url("new/path/file(with)brackets.jpg");
      `);
    });
    test('preserves original url() format', () => {
      const css = `
        background: url(plain.png);
        background-image: url('single.jpg');
        border-image: url("double.gif");
      `;
      const packageFiles = {
        'plain.png': 'new/plain.png',
        'single.jpg': 'new/single.jpg',
        'double.gif': 'new/double.gif',
      };

      const result = replaceCSSPaths(css, packageFiles);
      expect(result).toBe(`
        background: url(new/plain.png);
        background-image: url('new/single.jpg');
        border-image: url("new/double.gif");
      `);
    });
  });
  const htmlTemplate = (attr, value) =>
    `<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body><img ${attr}="${value}" /></body></html>`;
  describe.each(['href', 'src'])('HTML path finding for %s', attr => {
    const mimeType = 'text/html';
    it('should find a simple relative path', () => {
      const packageFiles = ['./test.png'];
      expect(getDOMPaths(htmlTemplate(attr, './test.png'), mimeType)).toEqual(packageFiles);
    });
    it('should find a more complex relative path', () => {
      const packageFiles = ['../fonts/test.png'];
      expect(getDOMPaths(htmlTemplate(attr, '../fonts/test.png'), mimeType)).toEqual(packageFiles);
    });
    it('should find a path with a space', () => {
      const packageFiles = ['../fonts/test this.png'];
      expect(getDOMPaths(htmlTemplate(attr, '../fonts/test this.png'), mimeType)).toEqual(
        packageFiles,
      );
    });
    it('should find a path with an encoded space', () => {
      const packageFiles = ['../fonts/test this.png'];
      expect(getDOMPaths(htmlTemplate(attr, '../fonts/test%20this.png'), mimeType)).toEqual(
        packageFiles,
      );
    });
    it('should find a more complex relative path with query parameters', () => {
      const packageFiles = ['../fonts/test.png'];
      expect(getDOMPaths(htmlTemplate(attr, '../fonts/test.png?iefix'), mimeType)).toEqual(
        packageFiles,
      );
    });
    it('should find paths with special characters', () => {
      const packageFiles = ['./page#&?.html'];
      expect(getDOMPaths(htmlTemplate(attr, './page%23%26%3F.html'), mimeType)).toEqual(
        packageFiles,
      );
    });
    it('should find paths with plus signs', () => {
      const packageFiles = ['./image+name.jpg'];
      expect(getDOMPaths(htmlTemplate(attr, './image%2Bname.jpg'), mimeType)).toEqual(packageFiles);
    });
  });
  const inlineCSSHtmlTemplate = value =>
    `<html xmlns="http://www.w3.org/1999/xhtml"><head><style>background: url('${value}');</style></head><body></body></html>`;
  describe('Inline CSS path finding', () => {
    const mimeType = 'text/html';
    it('should find a simple relative path', () => {
      const packageFiles = ['./test.png'];
      expect(getDOMPaths(inlineCSSHtmlTemplate('./test.png'), mimeType)).toEqual(packageFiles);
    });
    it('should find a more complex relative path', () => {
      const packageFiles = ['../fonts/test.png'];
      expect(getDOMPaths(inlineCSSHtmlTemplate('../fonts/test.png'), mimeType)).toEqual(
        packageFiles,
      );
    });
    it('should find a path with a space', () => {
      const packageFiles = ['../fonts/test this.png'];
      expect(getDOMPaths(inlineCSSHtmlTemplate('../fonts/test this.png'), mimeType)).toEqual(
        packageFiles,
      );
    });
    it('should find a path with an encoded space', () => {
      const packageFiles = ['../fonts/test this.png'];
      expect(getDOMPaths(inlineCSSHtmlTemplate('../fonts/test%20this.png'), mimeType)).toEqual(
        packageFiles,
      );
    });
    it('should find a more complex relative path with query parameters', () => {
      const packageFiles = ['../fonts/test.png'];
      expect(getDOMPaths(inlineCSSHtmlTemplate('../fonts/test.png?iefix'), mimeType)).toEqual(
        packageFiles,
      );
    });
    it('should find paths with special characters', () => {
      const packageFiles = ['./bg#&?.png'];
      expect(getDOMPaths(inlineCSSHtmlTemplate('./bg%23%26%3F.png'), mimeType)).toEqual(
        packageFiles,
      );
    });
  });
  describe.each(['href', 'src'])('HTML path replacement for %s', attr => {
    const mimeType = 'text/html';
    it('should replace a simple relative path', () => {
      const packageFiles = {
        './test.png': 'different',
      };
      expect(replaceDOMPaths(htmlTemplate(attr, './test.png'), packageFiles, mimeType)).toEqual(
        htmlTemplate(attr, 'different'),
      );
    });
    it('should replace a more complex relative path', () => {
      const packageFiles = {
        '../fonts/test.png': 'different',
      };
      expect(
        replaceDOMPaths(htmlTemplate(attr, '../fonts/test.png'), packageFiles, mimeType),
      ).toEqual(htmlTemplate(attr, 'different'));
    });
    it('should replace a path with a space', () => {
      const packageFiles = {
        '../fonts/test this.png': 'different',
      };
      expect(
        replaceDOMPaths(htmlTemplate(attr, '../fonts/test this.png'), packageFiles, mimeType),
      ).toEqual(htmlTemplate(attr, 'different'));
    });
    it('should replace a path with an encoded space', () => {
      const packageFiles = {
        '../fonts/test this.png': 'different',
      };
      expect(
        replaceDOMPaths(htmlTemplate(attr, '../fonts/test%20this.png'), packageFiles, mimeType),
      ).toEqual(htmlTemplate(attr, 'different'));
    });
    it('should replace paths with query parameters', () => {
      const packageFiles = {
        '../fonts/test.png': 'different',
      };
      expect(
        replaceDOMPaths(htmlTemplate(attr, '../fonts/test.png?iefix'), packageFiles, mimeType),
      ).toEqual(htmlTemplate(attr, 'different'));
    });
  });
  const xmlTemplate = (attr, value) =>
    `<tt xmlns="http://www.w3.org/ns/ttml" xml:lang="en"><body><div><img ${attr}="${value}"/></div></body></tt>`;
  describe.each(['href', 'src'])('XML path finding for %s', attr => {
    const mimeType = 'text/xml';
    it('should find a simple relative path', () => {
      const packageFiles = ['./test.png'];
      expect(getDOMPaths(xmlTemplate(attr, './test.png'), mimeType)).toEqual(packageFiles);
    });
    it('should find a more complex relative path', () => {
      const packageFiles = ['../fonts/test.png'];
      expect(getDOMPaths(xmlTemplate(attr, '../fonts/test.png'), mimeType)).toEqual(packageFiles);
    });
    it('should find a path with a space', () => {
      const packageFiles = ['../fonts/test this.png'];
      expect(getDOMPaths(xmlTemplate(attr, '../fonts/test this.png'), mimeType)).toEqual(
        packageFiles,
      );
    });
    it('should find a path with an encoded space', () => {
      const packageFiles = ['../fonts/test this.png'];
      expect(getDOMPaths(xmlTemplate(attr, '../fonts/test%20this.png'), mimeType)).toEqual(
        packageFiles,
      );
    });
    it('should find a more complex relative path with query parameters', () => {
      const packageFiles = ['../fonts/test.png'];
      expect(getDOMPaths(xmlTemplate(attr, '../fonts/test.png?iefix'), mimeType)).toEqual(
        packageFiles,
      );
    });
  });
  const styleBlockHtmlTemplate = cssContent =>
    `<html xmlns="http://www.w3.org/1999/xhtml"><head><style>${cssContent}</style></head><body></body></html>`;

  const multipleStyleBlockTemplate = (cssContent1, cssContent2) =>
    `<html xmlns="http://www.w3.org/1999/xhtml"><head><style>${cssContent1}</style><style>${cssContent2}</style></head><body></body></html>`;

  describe('Style block path replacement', () => {
    const mimeType = 'text/html';

    it('should replace a simple relative path in style block', () => {
      const packageFiles = {
        './test.png': 'different',
      };
      const input = styleBlockHtmlTemplate('background: url("./test.png");');
      const expected = styleBlockHtmlTemplate('background: url("different");');
      expect(replaceDOMPaths(input, packageFiles, mimeType)).toEqual(expected);
    });

    it('should replace multiple paths in single style block', () => {
      const packageFiles = {
        './bg.png': 'new-bg',
        './logo.svg': 'new-logo',
      };
      const input = styleBlockHtmlTemplate(
        'background: url("./bg.png"); .logo { background-image: url("./logo.svg"); }',
      );
      const expected = styleBlockHtmlTemplate(
        'background: url("new-bg"); .logo { background-image: url("new-logo"); }',
      );
      expect(replaceDOMPaths(input, packageFiles, mimeType)).toEqual(expected);
    });

    it('should replace paths in multiple style blocks', () => {
      const packageFiles = {
        './bg.png': 'new-bg',
        './logo.svg': 'new-logo',
      };
      const input = multipleStyleBlockTemplate(
        'background: url("./bg.png");',
        '.logo { background-image: url("./logo.svg"); }',
      );
      const expected = multipleStyleBlockTemplate(
        'background: url("new-bg");',
        '.logo { background-image: url("new-logo"); }',
      );
      expect(replaceDOMPaths(input, packageFiles, mimeType)).toEqual(expected);
    });

    it('should handle paths with spaces in style blocks', () => {
      const packageFiles = {
        './my image.png': 'new-image',
      };
      const input = styleBlockHtmlTemplate('background: url("./my image.png");');
      const expected = styleBlockHtmlTemplate('background: url("new-image");');
      expect(replaceDOMPaths(input, packageFiles, mimeType)).toEqual(expected);
    });

    it('should handle encoded paths in style blocks', () => {
      const packageFiles = {
        './my image.png': 'new-image',
      };
      const input = styleBlockHtmlTemplate('background: url("./my%20image.png");');
      const expected = styleBlockHtmlTemplate('background: url("new-image");');
      expect(replaceDOMPaths(input, packageFiles, mimeType)).toEqual(expected);
    });

    it('should handle paths with query parameters in style blocks', () => {
      const packageFiles = {
        './test.png': 'new-image',
      };
      const input = styleBlockHtmlTemplate('background: url("./test.png?v=123");');
      const expected = styleBlockHtmlTemplate('background: url("new-image");');
      expect(replaceDOMPaths(input, packageFiles, mimeType)).toEqual(expected);
    });

    it('should not replace unregistered paths in style blocks', () => {
      const packageFiles = {
        './registered.png': 'new-image',
      };
      const css = 'background: url("./unregistered.png");';
      const input = styleBlockHtmlTemplate(css);
      const expected = styleBlockHtmlTemplate(css);
      expect(replaceDOMPaths(input, packageFiles, mimeType)).toEqual(expected);
    });

    const createMixedContentHtml = ({ bgUrl, logoUrl, iconUrl }) =>
      `<html xmlns="http://www.w3.org/1999/xhtml"><head><style>body { background: url("${bgUrl}"); } .logo { background-image: url("${logoUrl}"); }</style></head><body><img src="${iconUrl}" style="background: url('${bgUrl}');" /></body></html>`;

    it('should handle mixed content with style blocks and attributes', () => {
      const packageFiles = {
        './bg.png': 'new-bg',
        './logo.svg': 'new-logo',
        './icon.png': 'new-icon',
      };

      const input = createMixedContentHtml({
        bgUrl: './bg.png',
        logoUrl: './logo.svg',
        iconUrl: './icon.png',
      });

      const expected = createMixedContentHtml({
        bgUrl: 'new-bg',
        logoUrl: 'new-logo',
        iconUrl: 'new-icon',
      });

      expect(replaceDOMPaths(input, packageFiles, mimeType)).toEqual(expected);
    });
  });

  describe('Style block XML path replacement', () => {
    const mimeType = 'text/xml';

    it('should replace paths in XML style blocks', () => {
      const packageFiles = {
        './test.png': 'different',
      };
      const input = `
        <tt xmlns="http://www.w3.org/ns/ttml" xml:lang="en">
          <head>
            <styling>
              <style>background: url("./test.png");</style>
            </styling>
          </head>
        </tt>`.trim();
      const expected = `
        <tt xmlns="http://www.w3.org/ns/ttml" xml:lang="en">
          <head>
            <styling>
              <style>background: url("different");</style>
            </styling>
          </head>
        </tt>`.trim();
      expect(replaceDOMPaths(input, packageFiles, mimeType)).toEqual(expected);
    });
  });

  const createImageWithSrcset = srcset =>
    `<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body><img srcset="${srcset}" /></body></html>`;
  describe('srcset path finding', () => {
    const mimeType = 'text/html';

    it('should find paths in srcset with width descriptors', () => {
      const paths = getDOMPaths(
        createImageWithSrcset('./small.jpg 300w, ./medium.jpg 600w, ./large.jpg 900w'),
        mimeType,
      );
      expect(paths).toEqual(['./small.jpg', './medium.jpg', './large.jpg']);
    });

    it('should find paths in srcset with pixel density descriptors', () => {
      const paths = getDOMPaths(createImageWithSrcset('./small.jpg 1x, ./medium.jpg 2x'), mimeType);
      expect(paths).toEqual(['./small.jpg', './medium.jpg']);
    });

    it('should find paths with query parameters in srcset', () => {
      const paths = getDOMPaths(
        createImageWithSrcset('./image.jpg?v=123 1x, ./other.jpg?v=456 2x'),
        mimeType,
      );
      expect(paths).toEqual(['./image.jpg', './other.jpg']);
    });

    it('should find encoded paths in srcset', () => {
      const paths = getDOMPaths(
        createImageWithSrcset('./my%20image.jpg 1x, ./other%20file.jpg 2x'),
        mimeType,
      );
      expect(paths).toEqual(['./my image.jpg', './other file.jpg']);
    });

    it('should find encoded paths with special characters in srcset', () => {
      const paths = getDOMPaths(
        createImageWithSrcset(
          './image%20with%20%23%26%3F.jpg 1x, ./file%20with%20%2B%20signs.jpg 2x',
        ),
        mimeType,
      );
      expect(paths).toEqual(['./image with #&?.jpg', './file with + signs.jpg']);
    });

    it('should find complex paths in srcset', () => {
      const paths = getDOMPaths(
        createImageWithSrcset(
          '../path/to/my%20image.jpg?v=123 300w, ../../other%20dir/file.jpg?version=2 600w',
        ),
        mimeType,
      );
      expect(paths).toEqual(['../path/to/my image.jpg', '../../other dir/file.jpg']);
    });
  });

  describe('srcset path replacement', () => {
    const mimeType = 'text/html';

    it('should replace paths in srcset with width descriptors', () => {
      const packageFiles = {
        './small.jpg': 'new-small.jpg',
        './medium.jpg': 'new-medium.jpg',
        './large.jpg': 'new-large.jpg',
      };

      const input = createImageWithSrcset('./small.jpg 300w, ./medium.jpg 600w, ./large.jpg 900w');
      const expected = createImageWithSrcset(
        'new-small.jpg 300w, new-medium.jpg 600w, new-large.jpg 900w',
      );

      expect(replaceDOMPaths(input, packageFiles, mimeType)).toEqual(expected);
    });

    it('should replace paths in srcset with pixel density descriptors', () => {
      const packageFiles = {
        './small.jpg': 'new-small.jpg',
        './medium.jpg': 'new-medium.jpg',
      };

      const input = createImageWithSrcset('./small.jpg 1x, ./medium.jpg 2x');
      const expected = createImageWithSrcset('new-small.jpg 1x, new-medium.jpg 2x');

      expect(replaceDOMPaths(input, packageFiles, mimeType)).toEqual(expected);
    });

    it('should handle query parameters in srcset', () => {
      const packageFiles = {
        './image.jpg': 'new-image.jpg',
        './other.jpg': 'new-other.jpg',
      };

      const input = createImageWithSrcset('./image.jpg?v=123 1x, ./other.jpg?v=456 2x');
      const expected = createImageWithSrcset('new-image.jpg 1x, new-other.jpg 2x');

      expect(replaceDOMPaths(input, packageFiles, mimeType)).toEqual(expected);
    });

    it('should handle encoded paths in srcset', () => {
      const packageFiles = {
        './my image.jpg': 'new-image.jpg',
        './other file.jpg': 'new-other.jpg',
      };

      const input = createImageWithSrcset('./my%20image.jpg 1x, ./other%20file.jpg 2x');
      const expected = createImageWithSrcset('new-image.jpg 1x, new-other.jpg 2x');

      expect(replaceDOMPaths(input, packageFiles, mimeType)).toEqual(expected);
    });

    it('should handle encoded paths with special characters in srcset', () => {
      const packageFiles = {
        './image with #&?.jpg': 'new-special.jpg',
        './file with + signs.jpg': 'new-plus.jpg',
      };

      const input = createImageWithSrcset(
        './image%20with%20%23%26%3F.jpg 1x, ./file%20with%20%2B%20signs.jpg 2x',
      );
      const expected = createImageWithSrcset('new-special.jpg 1x, new-plus.jpg 2x');

      expect(replaceDOMPaths(input, packageFiles, mimeType)).toEqual(expected);
    });

    it('should not replace unregistered paths in srcset', () => {
      const packageFiles = {
        './registered.jpg': 'new-image.jpg',
      };

      const srcset = './unregistered.jpg 1x, ./registered.jpg 2x';
      const input = createImageWithSrcset(srcset);
      const expected = createImageWithSrcset('./unregistered.jpg 1x, new-image.jpg 2x');

      expect(replaceDOMPaths(input, packageFiles, mimeType)).toEqual(expected);
    });

    it('should handle complex paths in srcset', () => {
      const packageFiles = {
        '../path/to/my image.jpg': 'new-image.jpg',
        '../../other dir/file.jpg': 'new-file.jpg',
      };

      const input = createImageWithSrcset(
        '../path/to/my%20image.jpg?v=123 300w, ../../other%20dir/file.jpg?version=2 600w',
      );
      const expected = createImageWithSrcset('new-image.jpg 300w, new-file.jpg 600w');

      expect(replaceDOMPaths(input, packageFiles, mimeType)).toEqual(expected);
    });
  });
  describe.each(['href', 'src'])('XML path replacement for %s', attr => {
    const mimeType = 'text/xml';
    it('should replace a simple relative path', () => {
      const packageFiles = {
        './test.png': 'different',
      };
      expect(replaceDOMPaths(xmlTemplate(attr, './test.png'), packageFiles, mimeType)).toEqual(
        xmlTemplate(attr, 'different'),
      );
    });
    it('should replace a more complex relative path', () => {
      const packageFiles = {
        '../fonts/test.png': 'different',
      };
      expect(
        replaceDOMPaths(xmlTemplate(attr, '../fonts/test.png'), packageFiles, mimeType),
      ).toEqual(xmlTemplate(attr, 'different'));
    });
    it('should replace a path with a space', () => {
      const packageFiles = {
        '../fonts/test this.png': 'different',
      };
      expect(
        replaceDOMPaths(xmlTemplate(attr, '../fonts/test this.png'), packageFiles, mimeType),
      ).toEqual(xmlTemplate(attr, 'different'));
    });
    it('should replace a path with an encoded space', () => {
      const packageFiles = {
        '../fonts/test this.png': 'different',
      };
      expect(
        replaceDOMPaths(xmlTemplate(attr, '../fonts/test%20this.png'), packageFiles, mimeType),
      ).toEqual(xmlTemplate(attr, 'different'));
    });
    it('should replace paths with query parameters', () => {
      const packageFiles = {
        '../fonts/test.png': 'different',
      };
      expect(
        replaceDOMPaths(xmlTemplate(attr, '../fonts/test.png?iefix'), packageFiles, mimeType),
      ).toEqual(xmlTemplate(attr, 'different'));
    });
  });
});
