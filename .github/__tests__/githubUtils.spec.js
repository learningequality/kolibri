/* eslint-disable import-x/no-commonjs, import-x/no-amd */
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  generatePackageVersionData,
  validatePackageVersionData,
  renderPackageVersionMarkdown,
} = require('../githubUtils.js');

// ---- generatePackageVersionData ----

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function writeFile(cwd, relPath, contents) {
  fs.mkdirSync(path.join(cwd, path.dirname(relPath)), { recursive: true });
  fs.writeFileSync(path.join(cwd, relPath), contents);
}

function packageJson(name, version, extra = {}) {
  return JSON.stringify({ name, version, ...extra }, null, 2);
}

function pyproject(name, version, classifiers = []) {
  return [
    '[build-system]',
    'requires = ["setuptools>=80"]',
    '',
    '[project]',
    `name = "${name}"`,
    `version = "${version}"`,
    'authors = [{ name = "Learning Equality", email = "info@learningequality.org" }]',
    'classifiers = [',
    ...classifiers.map(c => `    "${c}",`),
    ']',
    '',
    '[project.entry-points."kolibri.plugins"]',
    'version = "not-the-project-version"',
    '',
  ].join('\n');
}

describe('generatePackageVersionData', () => {
  let repo;
  let originalCwd;
  let baseSha;

  beforeEach(() => {
    originalCwd = process.cwd();
    repo = fs.mkdtempSync(path.join(os.tmpdir(), 'version-check-'));
    git(repo, 'init', '--quiet');
    git(repo, 'config', 'user.email', 'test@example.com');
    git(repo, 'config', 'user.name', 'Test');
    git(repo, 'config', 'commit.gpgsign', 'false');

    writeFile(repo, 'packages/widget/package.json', packageJson('widget', '1.0.0'));
    writeFile(repo, 'packages/widget/index.js', 'module.exports = 1;\n');
    writeFile(repo, 'packages/internal/package.json', packageJson('internal', '1.0.0', { private: true }));
    writeFile(repo, 'python_packages/plugin/pyproject.toml', pyproject('plugin', '0.1.0'));
    writeFile(
      repo,
      'python_packages/workspace-only/pyproject.toml',
      pyproject('workspace-only', '0.1.0', ['Framework :: Django', 'Private :: Do Not Upload'])
    );
    git(repo, 'add', '.');
    git(repo, 'commit', '--quiet', '--no-verify', '-m', 'fork point');

    git(repo, 'branch', 'feature');

    // The base branch moves on after the PR branched off it.
    writeFile(repo, 'packages/widget/package.json', packageJson('widget', '2.0.0'));
    git(repo, 'commit', '--quiet', '--no-verify', '-a', '-m', 'bump widget on base');
    baseSha = git(repo, 'rev-parse', 'HEAD');

    git(repo, 'checkout', '--quiet', 'feature');
    process.chdir(repo);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(repo, { recursive: true, force: true });
  });

  it('returns null when the PR changes no package', () => {
    expect(generatePackageVersionData(baseSha)).toBeNull();
  });

  it('ignores version bumps the base branch made while the PR was behind', () => {
    writeFile(repo, 'packages/widget/index.js', 'module.exports = 2;\n');
    git(repo, 'commit', '--quiet', '--no-verify', '-a', '-m', 'edit widget');

    const data = generatePackageVersionData(baseSha);

    expect(data.packages).toEqual([]);
    expect(data.warnings).toEqual([
      { registry: 'npm', name: 'widget', version: '1.0.0', changedFiles: 1 },
    ]);
  });

  it('reports a version bump made by the PR', () => {
    writeFile(repo, 'packages/widget/package.json', packageJson('widget', '1.1.0'));
    git(repo, 'commit', '--quiet', '--no-verify', '-a', '-m', 'bump widget on feature');

    const data = generatePackageVersionData(baseSha);

    expect(data.packages).toEqual([
      { registry: 'npm', name: 'widget', from: '1.0.0', to: '1.1.0' },
    ]);
    expect(data.warnings).toEqual([]);
  });

  it('reports a bumped Python package against PyPI', () => {
    writeFile(repo, 'python_packages/plugin/pyproject.toml', pyproject('plugin', '0.2.0'));
    git(repo, 'commit', '--quiet', '--no-verify', '-a', '-m', 'bump plugin');

    const data = generatePackageVersionData(baseSha);

    expect(data.packages).toEqual([
      { registry: 'PyPI', name: 'plugin', from: '0.1.0', to: '0.2.0' },
    ]);
  });

  it('reports a new package with no previous version', () => {
    writeFile(repo, 'python_packages/fresh/pyproject.toml', pyproject('fresh', '0.1.0'));
    git(repo, 'add', '.');
    git(repo, 'commit', '--quiet', '--no-verify', '-m', 'add fresh');

    const data = generatePackageVersionData(baseSha);

    expect(data.packages).toEqual([
      { registry: 'PyPI', name: 'fresh', from: null, to: '0.1.0' },
    ]);
  });

  it('ignores packages marked unpublishable', () => {
    writeFile(repo, 'packages/internal/package.json', packageJson('internal', '1.1.0', { private: true }));
    writeFile(
      repo,
      'python_packages/workspace-only/pyproject.toml',
      pyproject('workspace-only', '0.2.0', ['Framework :: Django', 'Private :: Do Not Upload'])
    );
    git(repo, 'commit', '--quiet', '--no-verify', '-a', '-m', 'bump unpublishable packages');

    expect(generatePackageVersionData(baseSha)).toBeNull();
  });
});

// ---- validatePackageVersionData ----

describe('validatePackageVersionData', () => {
  it('returns null for JSON null (no packages changed)', () => {
    expect(validatePackageVersionData('null')).toBeNull();
  });

  it('accepts valid data with packages and warnings', () => {
    const raw = JSON.stringify({
      packages: [{ registry: 'npm', name: 'my-lib', from: '1.0.0', to: '1.1.0' }],
      warnings: [{ registry: 'PyPI', name: 'other-pkg', version: '2.0.0', changedFiles: 3 }],
    });
    const data = validatePackageVersionData(raw);
    expect(data.packages).toHaveLength(1);
    expect(data.packages[0].name).toBe('my-lib');
    expect(data.warnings).toHaveLength(1);
  });

  it('accepts package with from: null (new package)', () => {
    const raw = JSON.stringify({
      packages: [{ registry: 'npm', name: '@foo/new', from: null, to: '1.0.0' }],
      warnings: [],
    });
    expect(validatePackageVersionData(raw).packages[0].from).toBeNull();
  });

  it('throws on invalid JSON', () => {
    expect(() => validatePackageVersionData('not-json')).toThrow();
  });

  it('throws when packages is not an array', () => {
    const raw = JSON.stringify({ packages: 'oops', warnings: [] });
    expect(() => validatePackageVersionData(raw)).toThrow();
  });

  it('throws when warnings is not an array', () => {
    const raw = JSON.stringify({ packages: [], warnings: 'oops' });
    expect(() => validatePackageVersionData(raw)).toThrow();
  });

  it('throws when package.registry is not a string', () => {
    const raw = JSON.stringify({
      packages: [{ registry: 42, name: 'x', from: '1.0', to: '1.1' }],
      warnings: [],
    });
    expect(() => validatePackageVersionData(raw)).toThrow();
  });

  it('throws when package.name is not a string', () => {
    const raw = JSON.stringify({
      packages: [{ registry: 'npm', name: 42, from: '1.0', to: '1.1' }],
      warnings: [],
    });
    expect(() => validatePackageVersionData(raw)).toThrow();
  });

  it('throws when package.from is not string or null', () => {
    const raw = JSON.stringify({
      packages: [{ registry: 'npm', name: 'x', from: 42, to: '1.1' }],
      warnings: [],
    });
    expect(() => validatePackageVersionData(raw)).toThrow();
  });

  it('throws when package.to is not a string', () => {
    const raw = JSON.stringify({
      packages: [{ registry: 'npm', name: 'x', from: null, to: 42 }],
      warnings: [],
    });
    expect(() => validatePackageVersionData(raw)).toThrow();
  });

  it('throws when warning.changedFiles is not a number', () => {
    const raw = JSON.stringify({
      packages: [],
      warnings: [{ registry: 'npm', name: 'x', version: '1.0', changedFiles: 'three' }],
    });
    expect(() => validatePackageVersionData(raw)).toThrow();
  });
});

// ---- renderPackageVersionMarkdown ----

describe('renderPackageVersionMarkdown', () => {
  it('returns null for empty data', () => {
    expect(renderPackageVersionMarkdown({ packages: [], warnings: [] })).toBeNull();
  });

  it('renders publish table for bumped packages', () => {
    const data = {
      packages: [{ registry: 'npm', name: '@foo/bar', from: '1.0.0', to: '1.1.0' }],
      warnings: [],
    };
    const result = renderPackageVersionMarkdown(data);
    expect(result).toContain('Package Versions');
    expect(result).toContain('| @foo/bar | npm | 1.0.0 | 1.1.0 |');
  });

  it('renders _new_ for new packages (from: null)', () => {
    const data = {
      packages: [{ registry: 'PyPI', name: 'kolibri-new-plugin', from: null, to: '1.0.0' }],
      warnings: [],
    };
    const result = renderPackageVersionMarkdown(data);
    expect(result).toContain('| kolibri-new-plugin | PyPI | _new_ | 1.0.0 |');
  });

  it('renders warning section with changed file count', () => {
    const data = {
      packages: [],
      warnings: [{ registry: 'npm', name: '@foo/baz', version: '2.0.0', changedFiles: 5 }],
    };
    const result = renderPackageVersionMarkdown(data);
    expect(result).toContain('WARNING');
    expect(result).toContain('| @foo/baz | npm | 2.0.0 | 5 |');
  });

  it('renders both sections when there are packages and warnings', () => {
    const data = {
      packages: [{ registry: 'npm', name: 'my-lib', from: '1.0.0', to: '1.1.0' }],
      warnings: [{ registry: 'PyPI', name: 'other-pkg', version: '2.0.0', changedFiles: 2 }],
    };
    const result = renderPackageVersionMarkdown(data);
    expect(result).toContain('my-lib');
    expect(result).toContain('WARNING');
    expect(result).toContain('other-pkg');
  });
});
