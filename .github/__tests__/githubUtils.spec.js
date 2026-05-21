/* eslint-disable import-x/no-commonjs, import-x/no-amd */
'use strict';

const {
  validateNpmVersionData,
  renderNpmVersionMarkdown,
} = require('../githubUtils.js');

// ---- validateNpmVersionData ----

describe('validateNpmVersionData', () => {
  it('returns null for JSON null (no packages changed)', () => {
    expect(validateNpmVersionData('null')).toBeNull();
  });

  it('accepts valid data with packages and warnings', () => {
    const raw = JSON.stringify({
      packages: [{ name: 'my-lib', from: '1.0.0', to: '1.1.0' }],
      warnings: [{ name: 'other-pkg', version: '2.0.0', changedFiles: 3 }],
    });
    const data = validateNpmVersionData(raw);
    expect(data.packages).toHaveLength(1);
    expect(data.packages[0].name).toBe('my-lib');
    expect(data.warnings).toHaveLength(1);
  });

  it('accepts package with from: null (new package)', () => {
    const raw = JSON.stringify({
      packages: [{ name: '@foo/new', from: null, to: '1.0.0' }],
      warnings: [],
    });
    expect(validateNpmVersionData(raw).packages[0].from).toBeNull();
  });

  it('throws on invalid JSON', () => {
    expect(() => validateNpmVersionData('not-json')).toThrow();
  });

  it('throws when packages is not an array', () => {
    const raw = JSON.stringify({ packages: 'oops', warnings: [] });
    expect(() => validateNpmVersionData(raw)).toThrow();
  });

  it('throws when warnings is not an array', () => {
    const raw = JSON.stringify({ packages: [], warnings: 'oops' });
    expect(() => validateNpmVersionData(raw)).toThrow();
  });

  it('throws when package.name is not a string', () => {
    const raw = JSON.stringify({ packages: [{ name: 42, from: '1.0', to: '1.1' }], warnings: [] });
    expect(() => validateNpmVersionData(raw)).toThrow();
  });

  it('throws when package.from is not string or null', () => {
    const raw = JSON.stringify({ packages: [{ name: 'x', from: 42, to: '1.1' }], warnings: [] });
    expect(() => validateNpmVersionData(raw)).toThrow();
  });

  it('throws when package.to is not a string', () => {
    const raw = JSON.stringify({ packages: [{ name: 'x', from: null, to: 42 }], warnings: [] });
    expect(() => validateNpmVersionData(raw)).toThrow();
  });

  it('throws when warning.changedFiles is not a number', () => {
    const raw = JSON.stringify({
      packages: [],
      warnings: [{ name: 'x', version: '1.0', changedFiles: 'three' }],
    });
    expect(() => validateNpmVersionData(raw)).toThrow();
  });
});

// ---- renderNpmVersionMarkdown ----

describe('renderNpmVersionMarkdown', () => {
  it('returns null for empty data', () => {
    expect(renderNpmVersionMarkdown({ packages: [], warnings: [] })).toBeNull();
  });

  it('renders publish table for bumped packages', () => {
    const data = { packages: [{ name: '@foo/bar', from: '1.0.0', to: '1.1.0' }], warnings: [] };
    const result = renderNpmVersionMarkdown(data);
    expect(result).toContain('npm Package Versions');
    expect(result).toContain('@foo/bar');
    expect(result).toContain('1.0.0');
    expect(result).toContain('1.1.0');
  });

  it('renders _new_ for new packages (from: null)', () => {
    const data = { packages: [{ name: '@foo/new', from: null, to: '1.0.0' }], warnings: [] };
    const result = renderNpmVersionMarkdown(data);
    expect(result).toContain('_new_');
    expect(result).toContain('@foo/new');
    expect(result).toContain('1.0.0');
  });

  it('renders warning section with changed file count', () => {
    const data = {
      packages: [],
      warnings: [{ name: '@foo/baz', version: '2.0.0', changedFiles: 5 }],
    };
    const result = renderNpmVersionMarkdown(data);
    expect(result).toContain('WARNING');
    expect(result).toContain('@foo/baz');
    expect(result).toContain('2.0.0');
    expect(result).toContain('5');
  });

  it('renders both sections when there are packages and warnings', () => {
    const data = {
      packages: [{ name: 'my-lib', from: '1.0.0', to: '1.1.0' }],
      warnings: [{ name: 'other-pkg', version: '2.0.0', changedFiles: 2 }],
    };
    const result = renderNpmVersionMarkdown(data);
    expect(result).toContain('my-lib');
    expect(result).toContain('WARNING');
    expect(result).toContain('other-pkg');
  });
});
