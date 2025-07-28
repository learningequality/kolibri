const fs = require('fs');
const path = require('path');
const os = require('os');
const logging = require('../../logging');
const astUtils = require('../astUtils');
const { CONTEXT_LINE } = require('../constants');

describe('Translation Extraction Utilities', () => {
  // Setup temporary directory for test files
  let tempDir;
  const filePaths = {};

  beforeAll(() => {
    // Create a temporary directory for our test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-tests-'));

    // Utility function to create test files
    function createTestFile(filename, content) {
      const filePath = path.join(tempDir, filename);
      // Ensure the directory exists before writing the file
      const dirname = path.dirname(filePath);
      if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
      }
      fs.writeFileSync(filePath, content);
      return filePath;
    }

    // Create all test files upfront
    filePaths.textFile = createTestFile('file.txt', 'This is not a JS or Vue file');
    filePaths.emptyJs = createTestFile('empty.js', '');

    // Bad imports
    filePaths.badAppImport = createTestFile(
      'bad-app-import.js',
      `
      // A file with an import that doesn't exist in the application
      import BadModule from './non-existent-module';

      const translator = createTranslator('namespace', {
        key: 'Message string'
      });
    `,
    );

    filePaths.nodeModuleImport = createTestFile(
      'node-module-import.js',
      `
      // A file with an import from node_modules
      import React from 'react';

      const translator = createTranslator('namespace', {
        key: 'Message string'
      });
    `,
    );

    filePaths.someModule = createTestFile(
      'some/module.js',
      `
      // Just a simple module to be imported
      export default function someFunction() {
        return 'Hello from some module';
      }
      `,
    );

    filePaths.dynamicImportTarget = createTestFile(
      'path/to/dynamically/imported/file.js',
      `
      // A module to be dynamically imported
      export default function dynamicFunction() {
        return 'Hello from dynamically imported file';
      }
      `,
    );

    filePaths.requiredFileTarget = createTestFile(
      'path/to/required/file.js',
      `
      // A module to be required
      module.exports = function requiredFunction() {
        return 'Hello from required file';
      };
      `,
    );

    // Now create the files that do the importing
    filePaths.dynamicImport = createTestFile(
      'dynamic-import.js',
      `
      // Static imports
      import standardImport from './some/module';

      // Dynamic imports
      import('./path/to/dynamically/imported/file.js').then(module => {
        // do something with the module
      });

      const translator = createTranslator('namespace', {
        key: 'Message string'
      });
      `,
    );

    filePaths.requireImport = createTestFile(
      'require-import.js',
      `
      // Standard require
      const standardRequire = require('./some/module');

      // Dynamic require
      const dynamicRequire = require('./path/to/required/file.js');

      const translator = createTranslator('namespace', {
        key: 'Message string'
      });
      `,
    );

    filePaths.badDynamicImport = createTestFile(
      'bad-dynamic-import.js',
      `
      // Unresolvable dynamic import
      import('./non/existent/module.js').catch(err => {
        console.log('Handled error', err);
      });

      const translator = createTranslator('namespace', {
        key: 'Message string'
      });
      `,
    );

    // Circular dependencies
    filePaths.circularA = createTestFile(
      'circular-a.js',
      `
      import './circular-b.js';
      export const valueA = 'A';
    `,
    );

    filePaths.circularB = createTestFile(
      'circular-b.js',
      `
      import './circular-a.js';
      export const valueB = 'B';
    `,
    );

    // AST parsing issues
    filePaths.malformedJs = createTestFile(
      'malformed.js',
      `
      this is not valid javascript
      const = something
    `,
    );

    filePaths.noScriptVue = createTestFile(
      'no-script.vue',
      `
      <template>
        <div>Hello World</div>
      </template>

      <style>
        .class { color: red; }
      </style>
    `,
    );

    // Message extraction issues
    filePaths.emptyTrs = createTestFile(
      'empty-trs.vue',
      `
      <template>
        <div>{{ $tr('key') }}</div>
      </template>

      <script>
      export default {
        name: 'EmptyTrs',
        $trs: {}
      }
      </script>
    `,
    );

    filePaths.noNameWithTrs = createTestFile(
      'no-name-with-trs.vue',
      `
      <template>
        <div>{{ $tr('key') }}</div>
      </template>

      <script>
      export default {
        $trs: {
          key: 'This component has no name but has $trs'
        }
      }
      </script>
    `,
    );

    filePaths.badTranslatorVar = createTestFile(
      'bad-translator-var.js',
      `
      // The messages object is never defined
      const translator = createTranslator('namespace', messages);
    `,
    );

    filePaths.duplicateIds = createTestFile(
      'duplicate-ids.vue',
      `
      <template>
        <div>{{ $tr('key') }}</div>
      </template>

      <script>
      export default {
        name: 'DuplicateIds',
        $trs: {
          key: 'First definition'
        },
        methods: {
          init() {
            const translator = createTranslator('DuplicateIds', {
              key: 'Second definition'
            });
          }
        }
      }
      </script>
    `,
    );

    // Member expressions
    filePaths.badMemberExpression = createTestFile(
      'bad-member-expression.js',
      `
      const Constants = {
        // Missing the KEY_NAME property that's referenced below
      };

      const translator = createTranslator('namespace', {
        [Constants.KEY_NAME]: 'This will fail'
      });
    `,
    );

    // Complex cases
    filePaths.constantsJs = createTestFile(
      'constants.js',
      `
      export const KEYS = {
        EXAMPLE_KEY: 'example_key'
      };
    `,
    );

    filePaths.importedKeys = createTestFile(
      'imported-keys.js',
      `
      import { KEYS } from './constants';

      const translator = createTranslator('namespace', {
        [KEYS.EXAMPLE_KEY]: 'Message using imported key'
      });
    `,
    );

    filePaths.templateLiteral = createTestFile(
      'template-literal.js',
      `
      const translator = createTranslator('namespace', {
        key: \`This is a template literal with \${some} interpolation\`
      });
    `,
    );
  });

  beforeEach(() => {
    jest.spyOn(logging, 'error').mockImplementation(() => {});
    jest.spyOn(logging, 'warn').mockImplementation(() => {});
    jest.spyOn(logging, 'info').mockImplementation(() => {});
    jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore mocks after each test
    jest.restoreAllMocks();
  });

  afterAll(() => {
    // Clean up all temporary files and directory after all tests
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('File Type Handling', () => {
    it('should silently ignore non-js/vue files', () => {
      const messages = astUtils.getMessagesFromFile(filePaths.textFile);

      expect(messages).toEqual({});
      expect(logging.error).not.toHaveBeenCalled();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should handle empty files gracefully', () => {
      const messages = astUtils.getMessagesFromFile(filePaths.emptyJs);

      expect(messages).toEqual({});
      expect(logging.error).not.toHaveBeenCalled();
      expect(process.exit).not.toHaveBeenCalled();
    });
  });

  describe('Import Resolution', () => {
    it('should handle unresolvable imports in application code', () => {
      astUtils.getImportFileNames(filePaths.badAppImport, []);

      // The code should silently catch the error from trying to resolve the import
      expect(logging.error).not.toHaveBeenCalled();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should silently ignore unresolvable imports from node_modules', () => {
      const fileNames = astUtils.getImportFileNames(filePaths.nodeModuleImport, []);

      expect(fileNames).toEqual([]);
      expect(logging.error).not.toHaveBeenCalled();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should handle circular dependencies', () => {
      const visited = new Set();
      astUtils.recurseForStrings(filePaths.circularA, [], visited, false);

      // The code should handle the circular dependency without error
      expect(logging.error).not.toHaveBeenCalled();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should handle dynamic imports using import()', () => {
      const fileNames = astUtils.getImportFileNames(filePaths.dynamicImport, []);

      // Assuming getFileNameForImport will resolve the path correctly
      expect(fileNames.some(name => name.includes('path/to/dynamically/imported/file.js'))).toBe(
        true,
      );
      expect(logging.error).not.toHaveBeenCalled();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should handle dynamic imports using require()', () => {
      const fileNames = astUtils.getImportFileNames(filePaths.requireImport, []);

      // Assuming getFileNameForImport will resolve the path correctly
      expect(fileNames.some(name => name.includes('path/to/required/file.js'))).toBe(true);
      expect(logging.error).not.toHaveBeenCalled();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should handle unresolvable dynamic imports without error', () => {
      astUtils.getImportFileNames(filePaths.badDynamicImport, []);

      // The function should silently handle the error
      expect(logging.error).not.toHaveBeenCalled();
      expect(process.exit).not.toHaveBeenCalled();
    });
  });

  describe('AST Parsing', () => {
    it('should handle malformed JavaScript', () => {
      const messages = astUtils.getMessagesFromFile(filePaths.malformedJs);

      expect(messages).toEqual({});
      expect(logging.error).toHaveBeenCalled();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should handle Vue files with missing script section', () => {
      const messages = astUtils.getMessagesFromFile(filePaths.noScriptVue);

      expect(messages).toEqual({});
      expect(logging.error).toHaveBeenCalled();
      expect(process.exit).not.toHaveBeenCalled();
    });
  });

  describe('Message Extraction', () => {
    it('should handle empty $trs objects', () => {
      const messages = astUtils.getMessagesFromFile(filePaths.emptyTrs);

      expect(messages).toEqual({});
      expect(logging.error).not.toHaveBeenCalled();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should detect missing component names in Vue files with $trs', () => {
      astUtils.getMessagesFromFile(filePaths.noNameWithTrs);

      expect(logging.error).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalled();
    });

    it('should detect unresolvable variables in createTranslator', () => {
      astUtils.getMessagesFromFile(filePaths.badTranslatorVar);

      expect(logging.error).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalled();
    });

    it('should detect duplicate message IDs within a file', () => {
      astUtils.getMessagesFromFile(filePaths.duplicateIds);

      expect(logging.error).toHaveBeenCalled();
      // This may not call process.exit depending on how your code handles duplicates
    });
  });

  describe('Error handling for member expressions', () => {
    it('should handle unresolvable member expressions in message keys', () => {
      astUtils.getMessagesFromFile(filePaths.badMemberExpression);

      expect(logging.error).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalled();
    });
  });

  describe('Module resolution and imports', () => {
    it('should resolve imported constants for keys', () => {
      const messages = astUtils.getMessagesFromFile(filePaths.importedKeys);

      // The extracted message should use the resolved key
      expect(Object.keys(messages)).toContain('namespace.example_key');
      expect(logging.error).not.toHaveBeenCalled();
      expect(process.exit).not.toHaveBeenCalled();
    });
  });

  describe('String literal handling', () => {
    it('should handle template literals with interpolation', () => {
      astUtils.getMessagesFromFile(filePaths.templateLiteral);

      // Check if the extraction succeeds without error
      expect(logging.error).not.toHaveBeenCalled();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should handle StringLiteral nodes', () => {
      const node = {
        type: 'StringLiteral',
        value: 'test string',
      };
      const result = astUtils.stringFromAnyLiteral(node);
      expect(result).toBe('test string');
    });

    it('should handle TemplateLiteral nodes without expressions', () => {
      const node = astUtils.parseAST('`test template`').program.body[0].expression;
      const result = astUtils.stringFromAnyLiteral(node);
      expect(result).toBe('test template');
    });

    it('should handle BinaryExpression concatenation', () => {
      const node = astUtils.parseAST('"part1" + "part2"').program.body[0].expression;
      const result = astUtils.stringFromAnyLiteral(node);
      expect(result).toBe('part1part2');
    });

    it('should log errors for unsupported node types', () => {
      const node = astUtils.parseAST('123').program.body[0].expression;
      astUtils.stringFromAnyLiteral(node);
      expect(logging.error).toHaveBeenCalled();
    });
  });

  describe('getObjectifiedValue', () => {
    it('should extract message and context from object with both properties', () => {
      const node = astUtils.parseAST(`({
        message: 'Test message',
        context: 'Test context'
      })`).program.body[0].expression;

      const result = astUtils.getObjectifiedValue(node);
      expect(result.message).toBe('Test message');
      expect(result.context).toBe(`${CONTEXT_LINE}Test context`);
    });

    it('should handle objects without context property', () => {
      const node = astUtils.parseAST(`({
        message: 'Test message only'
      })`).program.body[0].expression;

      const result = astUtils.getObjectifiedValue(node);
      expect(result.message).toBe('Test message only');
      expect(result.context).toBe(CONTEXT_LINE);
    });

    it('should handle string literals directly', () => {
      const node = {
        type: 'StringLiteral',
        value: 'test string',
      };

      const result = astUtils.getObjectifiedValue(node);
      expect(result.message).toBe('test string');
      expect(result.context).toBe(CONTEXT_LINE);
    });

    it('should throw error if message is missing in object', () => {
      const node = astUtils.parseAST(`({
        notMessage: 'Not a message'
      })`).program.body[0].expression;

      expect(() => astUtils.getObjectifiedValue(node)).toThrow(ReferenceError);
    });
  });

  describe('getAllMessagesFromFilePath', () => {
    it('should handle directories with mixed file types', () => {
      astUtils.getAllMessagesFromFilePath(tempDir, ['**/node_modules/**'], false);

      // This should find all valid messages and ignore problematic files
      expect(logging.error).toHaveBeenCalled(); // Some errors will be logged
      // Check if we have successful extractions from valid files
    });
  });

  describe('getAllMessagesFromEntryFiles', () => {
    it('should follow imports correctly', () => {
      const entryFiles = ['imported-keys.js'];
      const messages = astUtils.getAllMessagesFromEntryFiles(entryFiles, tempDir, [], false);

      // Should find messages from both the entry file and its imports
      expect(Object.keys(messages)).toContain('namespace.example_key');
      expect(logging.error).not.toHaveBeenCalled();
      expect(process.exit).not.toHaveBeenCalled();
    });
  });

  describe('extractContext', () => {
    it('should extract context from string with context line', () => {
      const withContext = `${CONTEXT_LINE}This is the context`;
      const result = astUtils.extractContext(withContext);
      expect(result).toBe('This is the context');
    });

    it('should handle multiple context lines', () => {
      const withContext = `${CONTEXT_LINE}part1${CONTEXT_LINE}part2`;
      const result = astUtils.extractContext(withContext);
      expect(result).toBe('part2');
    });
  });

  describe('getVueSFCName', () => {
    it('should extract component name from Vue SFC', () => {
      const ast = astUtils.parseAST(`
        export default {
          name: 'TestComponent',
          data() { return {} }
        }
      `);

      const name = astUtils.getVueSFCName(ast);
      expect(name).toBe('TestComponent');
    });

    it('should return undefined if no name property exists', () => {
      const ast = astUtils.parseAST(`
        export default {
          data() { return {} }
        }
      `);

      const name = astUtils.getVueSFCName(ast);
      expect(name).toBeUndefined();
    });
  });
});
