import { getAbsoluteFilePath, getDOMPaths, replaceDOMPaths, _internal } from '../src/fileUtils';

const {
  getCSSPathsModern,
  getCSSPathsLegacy,
  replaceCSSPathsModern,
  replaceCSSPathsLegacy,
  supportsLookbehind,
} = _internal;

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
  describe('supportsLookbehind detection', () => {
    it('should be a boolean', () => {
      expect(typeof supportsLookbehind).toBe('boolean');
    });
  });

  describe.each([
    ['Modern', getCSSPathsModern],
    ['Legacy', getCSSPathsLegacy],
  ])('CSS path finding (%s)', (name, getCSSPathsFn) => {
    it('should find a simple relative path', () => {
      const packageFiles = ['./test.woff'];
      expect(getCSSPathsFn('url("./test.woff")')).toEqual(packageFiles);
    });
    it('should find a more complex relative path', () => {
      const packageFiles = ['../fonts/test.woff'];
      expect(getCSSPathsFn('url("../fonts/test.woff")')).toEqual(packageFiles);
    });
    it('should find a more complex relative path with query parameters', () => {
      const packageFiles = ['../fonts/test.woff'];
      expect(getCSSPathsFn('url("../fonts/test.woff?iefix")')).toEqual(packageFiles);
    });
    it('should find a path with a space', () => {
      const packageFiles = ['../fonts/test this.woff'];
      expect(getCSSPathsFn('url("../fonts/test this.woff?iefix")')).toEqual(packageFiles);
    });
    it('should find a path with an encoded space', () => {
      const packageFiles = ['../fonts/test this.woff'];
      expect(getCSSPathsFn('url("../fonts/test%20this.woff?iefix")')).toEqual(packageFiles);
    });
    it('should find paths that use single quotes', () => {
      const packageFiles = ['../fonts/test.woff'];
      expect(getCSSPathsFn("url('../fonts/test.woff')")).toEqual(packageFiles);
    });
    it('should find paths that use single quotes with query parameters', () => {
      const packageFiles = ['../fonts/test.woff'];
      expect(getCSSPathsFn("url('../fonts/test.woff?iefix')")).toEqual(packageFiles);
    });
    it('should find paths that use no quotes', () => {
      const packageFiles = ['../fonts/test.woff'];
      expect(getCSSPathsFn('url(../fonts/test.woff)')).toEqual(packageFiles);
    });
    it('should find paths with no quotes with query parameters', () => {
      const packageFiles = ['../fonts/test.woff'];
      expect(getCSSPathsFn('url(../fonts/test.woff?iefix)')).toEqual(packageFiles);
    });
    it('should find paths with special characters in CSS url()', () => {
      expect(getCSSPathsFn('url("./test%23%26%3F.woff")')).toEqual(['./test#&?.woff']);
    });
    it('should handle plus signs in CSS urls', () => {
      expect(getCSSPathsFn('url("./my%2Bfile.woff")')).toEqual(['./my+file.woff']);
    });
    it('handles URLs with parentheses in filename when quoted', () => {
      const css = `
        background: url('image(1).png');
        background-image: url("file(with)brackets.jpg");
      `;
      const paths = getCSSPathsFn(css);
      expect(paths).toEqual(['image(1).png', 'file(with)brackets.jpg']);
    });
    it('does not handle URLs with parentheses in filename when not quoted', () => {
      const css = `
        border-image: url(filename(final).gif);
      `;
      const paths = getCSSPathsFn(css);
      expect(paths).toEqual(['filename(final']);
    });

    it('handles query parameters correctly with parentheses in filename', () => {
      const css = `
        background: url('image(1).png?v=123');
        background-image: url("file(with)brackets.jpg?version=2");
      `;
      const paths = getCSSPathsFn(css);
      expect(paths).toEqual(['image(1).png', 'file(with)brackets.jpg']);
    });

    it('handles complex filenames with multiple parentheses', () => {
      const css = `
        background: url('path/to/image(1)(2).png');
        background-image: url("file(with)(more)brackets.jpg");
      `;
      const paths = getCSSPathsFn(css);
      expect(paths).toEqual(['path/to/image(1)(2).png', 'file(with)(more)brackets.jpg']);
    });
    it('handles multiple filenames with no quotation marks', () => {
      const css = `
      .h5p-question-plus-one {
        background-image: url(../images/plus-one.svg);
      }
      .h5p-question-minus-one {
        background-image: url(../images/minus-one.svg);
      }
      .h5p-question-hidden-one {
        opacity: 0;
        transform: translateY(100%);
      }
      `;
      const paths = getCSSPathsFn(css);
      expect(paths).toEqual(['../images/plus-one.svg', '../images/minus-one.svg']);
    });
    it('handles mixed quotes and no quotes correctly', () => {
      const css = `
        background: url(plain.png);
        background-image: url('single.jpg');
        border-image: url("double.gif");
      `;
      const paths = getCSSPathsFn(css);
      expect(paths).toEqual(['plain.png', 'single.jpg', 'double.gif']);
    });
    it('handles empty url() values', () => {
      const css = `
        background: url();
        background: url('');
        background: url("");
      `;
      const paths = getCSSPathsFn(css);
      expect(paths).toEqual(['', '', '']);
    });

    it('handles escaped quotes in filenames', () => {
      const css = `
        background: url('file\\'s.png');
        background: url("file\\".png");
        background: url("file\\").png");
        background: url('file\\').png');
      `;
      const paths = getCSSPathsFn(css);
      expect(paths).toEqual(["file's.png", 'file".png', 'file").png', "file').png"]);
    });

    it('handles escaped spaces', () => {
      const css = `
        background: url('file\\ with\\ spaces.png');
        background: url("path\\ to\\ file.jpg");
        background: url('multiple\\  spaces.png');
      `;
      const paths = getCSSPathsFn(css);
      expect(paths).toEqual(['file with spaces.png', 'path to file.jpg', 'multiple  spaces.png']);
    });

    it('handles multiple escaped backslashes', () => {
      const css = `
        background: url('path\\\\.png');
        background: url("file\\\\\\\\.jpg");
        background: url('test\\\\\\\\\\\\.gif');
      `;
      const paths = getCSSPathsFn(css);
      expect(paths).toEqual(['path\\.png', 'file\\\\.jpg', 'test\\\\\\.gif']);
    });

    it('handles complex combinations of parentheses and query params', () => {
      const css = `
        background: url('img(v1)(final).png?v=(1)&x=(2)');
      `;
      const paths = getCSSPathsFn(css);
      expect(paths).toEqual(['img(v1)(final).png']);
    });

    it('handles URLs with spaces and special characters', () => {
      const css = `
        background: url('my image (1).png');
        background: url("path/to/image (v2).jpg");
      `;
      const paths = getCSSPathsFn(css);
      expect(paths).toEqual(['my image (1).png', 'path/to/image (v2).jpg']);
    });

    it('handles malformed but recoverable URLs', () => {
      const css = `
        background: url('broken(but(fixable.png');
        background: url("missing(paren.jpg?v=1");
      `;
      const paths = getCSSPathsFn(css);
      expect(paths).toEqual(['broken(but(fixable.png', 'missing(paren.jpg']);
    });

    it('handles query parameters with special characters', () => {
      const css = `
        background: url('image.jpg?param=(test)&other=(value)');
        background: url("image.png?base64=abc()123");
        background: url(image.gif?key=test(1)&key2=test(2));
      `;
      const paths = getCSSPathsFn(css);
      expect(paths).toEqual(['image.jpg', 'image.png', 'image.gif']);
    });

    it('handles multiple consecutive parentheses', () => {
      const css = `
        background: url('image((((1)))).jpg');
        background: url("file(()()).png");
      `;
      const paths = getCSSPathsFn(css);
      expect(paths).toEqual(['image((((1)))).jpg', 'file(()()).png']);
    });

    it('finds paths in @import statements with url()', () => {
      const css = `
        @import url('components/buttons.css');
        @import url("styles/main.css");
        @import url(base.css);
      `;
      const paths = getCSSPathsFn(css);
      expect(paths).toEqual(['components/buttons.css', 'styles/main.css', 'base.css']);
    });

    it('finds paths in @import statements without url()', () => {
      const css = `
        @import 'components/buttons.css';
        @import "styles/main.css";
      `;
      const paths = getCSSPathsFn(css);
      expect(paths).toEqual(['components/buttons.css', 'styles/main.css']);
    });

    it('finds paths in mixed @import and url() usage', () => {
      const css = `
        @import url('reset.css');
        @import 'theme.css';
        .icon { background: url('../icons/play.png'); }
        @import "utilities.css";
      `;
      const paths = getCSSPathsFn(css);
      expect(paths).toEqual(['reset.css', 'theme.css', '../icons/play.png', 'utilities.css']);
    });

    it('finds paths in @import with query parameters', () => {
      const css = `
        @import 'styles.css?v=123';
        @import "theme.css?version=2";
      `;
      const paths = getCSSPathsFn(css);
      expect(paths).toEqual(['styles.css', 'theme.css']);
    });

    it('finds paths in @import with escaped quotes', () => {
      const css = `
        @import 'file\\'s.css';
        @import "path\\".css";
      `;
      const paths = getCSSPathsFn(css);
      expect(paths).toEqual(["file's.css", 'path".css']);
    });
  });
  describe.each([
    ['Modern', replaceCSSPathsModern],
    ['Legacy', replaceCSSPathsLegacy],
  ])('CSS path replacement (%s)', (name, replaceCSSPathsFn) => {
    it('should replace a simple relative path', () => {
      const packageFiles = {
        './test.woff': 'different',
      };
      expect(replaceCSSPathsFn('url("./test.woff")', packageFiles)).toEqual('url("different")');
    });
    it('should replace a more complex relative path', () => {
      const packageFiles = {
        '../fonts/test.woff': 'different',
      };
      expect(replaceCSSPathsFn('url("../fonts/test.woff")', packageFiles)).toEqual(
        'url("different")',
      );
    });
    it('should replace a path with a space', () => {
      const packageFiles = {
        '../fonts/test this.woff': 'different',
      };
      expect(replaceCSSPathsFn('url("../fonts/test this.woff")', packageFiles)).toEqual(
        'url("different")',
      );
    });
    it('should replace a path with an encoded space', () => {
      const packageFiles = {
        '../fonts/test this.woff': 'different',
      };
      expect(replaceCSSPathsFn('url("../fonts/test%20this.woff")', packageFiles)).toEqual(
        'url("different")',
      );
    });
    it('should replace paths that use single quotes', () => {
      const packageFiles = {
        '../fonts/test.woff': 'different',
      };
      expect(replaceCSSPathsFn("url('../fonts/test.woff')", packageFiles)).toEqual(
        "url('different')",
      );
    });
    it('should replace paths that use no quotes', () => {
      const packageFiles = {
        '../fonts/test.woff': 'different',
      };
      expect(replaceCSSPathsFn('url(../fonts/test.woff)', packageFiles)).toEqual('url(different)');
    });
    it('should replace paths that use query parameters', () => {
      const packageFiles = {
        '../fonts/test.woff': 'different',
      };
      expect(replaceCSSPathsFn('url(../fonts/test.woff?iefix)', packageFiles)).toEqual(
        'url(different)',
      );
    });
    it('should not replace urls that are not a registered path', () => {
      const packageFiles = {
        '../../../../audio/test.mp3': 'different',
      };
      expect(replaceCSSPathsFn('url(../../../../fonts/test.woff)', packageFiles)).toEqual(
        'url(../../../../fonts/test.woff)',
      );
    });
    it('should not replace urls that are not a valid path', () => {
      // This is mostly to make sure the function does not error.
      const packageFiles = {
        'package/audio/test.mp3': 'different',
      };
      expect(replaceCSSPathsFn('url(flob a dob dib dob)', packageFiles)).toEqual(
        'url(flob a dob dib dob)',
      );
    });
    it('should replace paths with special characters in CSS', () => {
      const packageFiles = {
        './test#&?.woff': 'new-file.woff',
      };
      expect(replaceCSSPathsFn('url("./test%23%26%3F.woff")', packageFiles)).toEqual(
        'url("new-file.woff")',
      );
    });
    it('handles multiple filenames with no quotation marks in replacements', () => {
      const css = `
      .h5p-question-plus-one {
        background-image: url(../images/plus-one.svg);
      }
      .h5p-question-minus-one {
        background-image: url(../images/minus-one.svg);
      }
      .h5p-question-hidden-one {
        opacity: 0;
        transform: translateY(100%);
      }
      `;
      const packageFiles = {
        '../images/plus-one.svg': 'assets/plus.svg',
        '../images/minus-one.svg': 'assets/minus.svg',
      };
      const result = replaceCSSPathsFn(css, packageFiles);
      expect(result).toBe(`
      .h5p-question-plus-one {
        background-image: url(assets/plus.svg);
      }
      .h5p-question-minus-one {
        background-image: url(assets/minus.svg);
      }
      .h5p-question-hidden-one {
        opacity: 0;
        transform: translateY(100%);
      }
      `);
    });
    it('replaces paths containing parentheses correctly', () => {
      const css = `
        background: url('image(1).png');
        background-image: url("file(with)brackets.jpg?v=123");
      `;
      const packageFiles = {
        'image(1).png': 'new/path/image(1).png',
        'file(with)brackets.jpg': 'new/path/file(with)brackets.jpg',
      };

      const result = replaceCSSPathsFn(css, packageFiles);
      expect(result).toBe(`
        background: url('new/path/image(1).png');
        background-image: url("new/path/file(with)brackets.jpg");
      `);
    });
    it('preserves original url() format', () => {
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

      const result = replaceCSSPathsFn(css, packageFiles);
      expect(result).toBe(`
        background: url(new/plain.png);
        background-image: url('new/single.jpg');
        border-image: url("new/double.gif");
      `);
    });

    it('handles escaped quotes in filename replacements', () => {
      const css = `
        background: url('file\\'s.png');
        background: url("file\\".png");
        background: url("file\\").png");
        background: url('file\\').png');
      `;
      const packageFiles = {
        "file's.png": "new's.png",
        'file".png': 'new".png',
        'file").png': 'new").png',
        "file').png": "new').png",
      };
      const result = replaceCSSPathsFn(css, packageFiles);
      /* eslint-disable no-useless-escape */
      expect(result).toBe(`
        background: url('new's.png');
        background: url("new\".png");
        background: url("new\").png");
        background: url('new').png');
      `);
      /* eslint-enable */
    });
    it('handles escaped spaces in replacements', () => {
      const css = `
        background: url('file\\ with\\ spaces.png');
        background: url("path\\ to\\ file.jpg");
        background: url('multiple\\  spaces.png');
      `;
      const packageFiles = {
        'file with spaces.png': 'new-spaces.png',
        'path to file.jpg': 'new-path.jpg',
        'multiple  spaces.png': 'new-multiple.png',
      };
      const result = replaceCSSPathsFn(css, packageFiles);
      expect(result).toBe(`
        background: url('new-spaces.png');
        background: url("new-path.jpg");
        background: url('new-multiple.png');
      `);
    });

    it('handles multiple escaped backslashes in replacements', () => {
      const css = `
        background: url('path\\\\.png');
        background: url("file\\\\\\\\.jpg");
        background: url('test\\\\\\\\\\\\.gif');
      `;
      const packageFiles = {
        'path\\.png': 'new1.png',
        'file\\\\.jpg': 'new2.jpg',
        'test\\\\\\.gif': 'new3.gif',
      };
      const result = replaceCSSPathsFn(css, packageFiles);
      expect(result).toBe(`
        background: url('new1.png');
        background: url("new2.jpg");
        background: url('new3.gif');
      `);
    });

    it('replaces @import url() paths', () => {
      const css = `
        @import url('components/buttons.css');
        @import url("styles/main.css");
      `;
      const packageFiles = {
        'components/buttons.css': 'blob:buttons',
        'styles/main.css': 'blob:main',
      };
      const result = replaceCSSPathsFn(css, packageFiles);
      expect(result).toBe(`
        @import url('blob:buttons');
        @import url("blob:main");
      `);
    });

    it('replaces @import paths without url()', () => {
      const css = `
        @import 'components/buttons.css';
        @import "styles/main.css";
      `;
      const packageFiles = {
        'components/buttons.css': 'blob:buttons',
        'styles/main.css': 'blob:main',
      };
      const result = replaceCSSPathsFn(css, packageFiles);
      expect(result).toBe(`
        @import 'blob:buttons';
        @import "blob:main";
      `);
    });

    it('replaces mixed @import and url() paths', () => {
      const css = `
        @import url('reset.css');
        @import 'theme.css';
        .icon { background: url('../icons/play.png'); }
      `;
      const packageFiles = {
        'reset.css': 'blob:reset',
        'theme.css': 'blob:theme',
        '../icons/play.png': 'blob:icon',
      };
      const result = replaceCSSPathsFn(css, packageFiles);
      expect(result).toBe(`
        @import url('blob:reset');
        @import 'blob:theme';
        .icon { background: url('blob:icon'); }
      `);
    });

    it('replaces @import paths with query parameters', () => {
      const css = `
        @import 'styles.css?v=123';
        @import "theme.css?version=2";
      `;
      const packageFiles = {
        'styles.css': 'blob:styles',
        'theme.css': 'blob:theme',
      };
      const result = replaceCSSPathsFn(css, packageFiles);
      expect(result).toBe(`
        @import 'blob:styles';
        @import "blob:theme";
      `);
    });

    it('replaces @import paths with escaped quotes', () => {
      const css = `
        @import 'file\\'s.css';
        @import "path\\".css";
      `;
      const packageFiles = {
        "file's.css": 'blob:file',
        'path".css': 'blob:path',
      };
      const result = replaceCSSPathsFn(css, packageFiles);
      expect(result).toBe(`
        @import 'blob:file';
        @import "blob:path";
      `);
    });

    it('does not replace unregistered @import paths', () => {
      const css = `
        @import 'registered.css';
        @import 'unregistered.css';
      `;
      const packageFiles = {
        'registered.css': 'blob:registered',
      };
      const result = replaceCSSPathsFn(css, packageFiles);
      expect(result).toBe(`
        @import 'blob:registered';
        @import 'unregistered.css';
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
