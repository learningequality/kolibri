/*
 * The first test is what ties this package to the theme. It compares the names derived
 * here against the ones the installed design system emits, so the two cannot diverge.
 */

import { generateThemeCssVariables } from 'kolibri-design-system/lib/styles/themeCssVariables';

import {
  getThemeCssVariableNames,
  isThemedCustomProperty,
  suggestThemeCssVariableName,
} from '../index';

describe('getThemeCssVariableNames', () => {
  it('matches the CSS variables the theme actually emits at runtime', () => {
    // both walk `colorsDefault.js` and `colorsMaterial.js`, so this fails if the names
    // this package derives ever fall out of step with the theme
    const emitted = Object.keys(generateThemeCssVariables()).sort();
    const derived = [...getThemeCssVariableNames()].sort();
    expect(derived).toEqual(emitted);
  });

  it('includes token, brand, and palette names, versioned as `vN` not `v_N`', () => {
    const names = getThemeCssVariableNames();
    expect(names.has('--tokens-focusOutline')).toBe(true);
    expect(names.has('--brand-primary-v600')).toBe(true);
    expect(names.has('--palette-grey-v400')).toBe(true);
    expect(names.has('--palette-black')).toBe(true);
    expect(names.has('--palette-grey-v_400')).toBe(false);
  });
});

describe('isThemedCustomProperty', () => {
  it('is true for theme-owned prefixes', () => {
    expect(isThemedCustomProperty('--tokens-primary')).toBe(true);
    expect(isThemedCustomProperty('--brand-primary-v500')).toBe(true);
    expect(isThemedCustomProperty('--palette-grey-v400')).toBe(true);
  });

  it("is false for a component's own custom properties", () => {
    expect(isThemedCustomProperty('--someLocalProperty')).toBe(false);
    expect(isThemedCustomProperty('--token-primary')).toBe(false);
  });
});

describe('suggestThemeCssVariableName', () => {
  it('normalizes the source `v_N` version key form to a valid name', () => {
    expect(suggestThemeCssVariableName('--palette-grey-v_400')).toBe('--palette-grey-v400');
    expect(suggestThemeCssVariableName('--brand-primary-v_600')).toBe('--brand-primary-v600');
  });

  it('is null when normalizing does not produce a valid name', () => {
    expect(suggestThemeCssVariableName('--tokens-focusOutine')).toBe(null);
    expect(suggestThemeCssVariableName('--palette-grey-v_999')).toBe(null);
  });
});

describe('the design system peer dependency', () => {
  function missingModule(specifier) {
    return () => {
      const error = new Error(`Cannot find module '${specifier}'`);
      error.code = 'MODULE_NOT_FOUND';
      throw error;
    };
  }

  const COLORS = 'kolibri-design-system/lib/styles/colorsMaterial';
  const MANIFEST = 'kolibri-design-system/package.json';

  // reloads the module, with the design system's colors failing to resolve. `manifest`
  // is how `kolibri-design-system/package.json` itself resolves: 'found', 'missing', or
  // 'notExported' for an export map that does not list it.
  function withMissingColors(message, manifest = 'found') {
    jest.resetModules();
    jest.doMock(COLORS, () => {
      const error = new Error(message);
      error.code = 'MODULE_NOT_FOUND';
      throw error;
    });
    if (manifest === 'missing') {
      jest.doMock(MANIFEST, missingModule(MANIFEST));
    }
    if (manifest === 'notExported') {
      jest.doMock(MANIFEST, () => {
        const error = new Error(`Package subpath './package.json' is not defined by "exports"`);
        error.code = 'ERR_PACKAGE_PATH_NOT_EXPORTED';
        throw error;
      });
    }
    return require('../index').getThemeCssVariableNames;
  }

  afterEach(() => {
    jest.dontMock(COLORS);
    jest.dontMock(MANIFEST);
    jest.resetModules();
  });

  it('names the peer dependency when it is the thing missing', () => {
    const load = withMissingColors(`Cannot find module '${COLORS}'`, 'missing');
    expect(load).toThrow(/peer dependency that is not installed/);
  });

  it('lets a moved path through when the design system is installed', () => {
    // a release that moves the colors file is not an install instruction, so the
    // original error names the path that is actually gone
    const load = withMissingColors(`Cannot find module '${COLORS}'`);
    expect(load).toThrow(/colorsMaterial/);
    expect(load).not.toThrow(/peer dependency/);
  });

  it('does not call it missing when an export map hides its `package.json`', () => {
    const load = withMissingColors(`Cannot find module '${COLORS}'`, 'notExported');
    expect(load).not.toThrow(/peer dependency/);
  });

  it('lets a failure from inside the design system through unchanged', () => {
    // relabelling this one would hide the real cause behind an install instruction
    const load = withMissingColors("Cannot find module 'some-transitive-dependency'");
    expect(load).toThrow(/some-transitive-dependency/);
    expect(load).not.toThrow(/peer dependency/);
  });
});
