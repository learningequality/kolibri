const path = require('node:path');
const fs = require('fs');
const os = require('os');
const { resolve, addAliases, resetAliases } = require('../moduleResolver');

// Helper function to create project structure
function createProjectStructure(baseDir, structure, currentPath = '') {
  Object.entries(structure).forEach(([name, content]) => {
    const itemPath = path.join(baseDir, currentPath, name);

    if (typeof content === 'object') {
      // It's a directory
      fs.mkdirSync(itemPath, { recursive: true });
      // Create its contents
      createProjectStructure(baseDir, content, path.join(currentPath, name));
    } else {
      // It's a file
      fs.writeFileSync(itemPath, content);
    }
  });
}

// Create a temporary test directory structure
describe('Module Resolver', () => {
  let tempDir;
  const projectStructure = {
    src: {
      components: {
        'Button.js': 'export default function Button() { return "Button"; }',
        'index.js': 'export { default as Button } from "./Button.js";',
      },
      utils: {
        'format.js': 'export function format() { return "format"; }',
        'index.js': 'export { format } from "./format.js";',
      },
      assets: {
        styles: {
          'main.js': 'export default { color: "blue" };',
        },
      },
      'index.js': '// Main entry',
    },
  };

  // Set up test directory and files
  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'module-resolver-test-'));
    createProjectStructure(tempDir, projectStructure);
  });

  // Clean up after tests
  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    // Reset aliases before each test
    resetAliases();
  });

  test('resolves paths without aliases', () => {
    const currentFile = path.join(tempDir, 'src', 'index.js');

    // Relative path
    const resolvedRelative = resolve(currentFile, './components/Button.js');
    expect(resolvedRelative).toBe(path.join(tempDir, 'src', 'components', 'Button.js'));
  });

  test('adds and uses aliases', () => {
    const currentFile = path.join(tempDir, 'src', 'index.js');

    // Add aliases
    addAliases({
      components: path.join(tempDir, 'src', 'components'),
      utils: path.join(tempDir, 'src', 'utils'),
      styles: path.join(tempDir, 'src', 'assets', 'styles'),
    });

    // Resolve using aliases
    const resolvedComponent = resolve(currentFile, 'components/Button.js');
    expect(resolvedComponent).toBe(path.join(tempDir, 'src', 'components', 'Button.js'));

    const resolvedUtil = resolve(currentFile, 'utils/format.js');
    expect(resolvedUtil).toBe(path.join(tempDir, 'src', 'utils', 'format.js'));

    const resolvedStyle = resolve(currentFile, 'styles/main.js');
    expect(resolvedStyle).toBe(path.join(tempDir, 'src', 'assets', 'styles', 'main.js'));
  });

  test('removes aliases when reset', () => {
    const currentFile = path.join(tempDir, 'src', 'index.js');

    // Add aliases
    addAliases({
      components: path.join(tempDir, 'src', 'components'),
    });

    // Verify alias works
    const resolvedWithAlias = resolve(currentFile, 'components/Button.js');
    expect(resolvedWithAlias).toBe(path.join(tempDir, 'src', 'components', 'Button.js'));

    // Reset aliases
    resetAliases();

    // Verify alias no longer works
    expect(() => {
      resolve(currentFile, 'components/Button.js');
    }).toThrow();
  });

  test('overrides existing aliases', () => {
    const currentFile = path.join(tempDir, 'src', 'index.js');

    // Add initial alias
    addAliases({
      components: path.join(tempDir, 'src', 'components'),
    });

    // Override with new alias
    addAliases({
      components: path.join(tempDir, 'src', 'utils'), // Changed path
    });

    // Verify the new alias is used
    const resolvedOverridden = resolve(currentFile, 'components/format.js');
    expect(resolvedOverridden).toBe(path.join(tempDir, 'src', 'utils', 'format.js'));
  });
});
