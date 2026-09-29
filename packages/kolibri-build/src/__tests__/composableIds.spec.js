const path = require('node:path');
const { createHash } = require('node:crypto');
const { stampComposableIds } = require('../composableIds');
const composableIdLoader = require('../composableIdLoader');

const COMPOSABLE_ID = Symbol.for('kolibri.composableId');

const resourcePath = path.resolve(
  __dirname,
  '../../../kolibri-common/composables/useFacilities.js',
);

const IMPORT_STORE = "import GlobalStore from 'kolibri/composables/GlobalStore';";

function evaluate(code, module = { exports: {} }) {
  const body = code.replace(/^\s*import (\w+) from '[^']+';$/gm, 'const $1 = Base;');
  new Function('module', 'Base', body)(module, class {});
  return module.exports;
}

function stampAndEvaluate(source, options = {}, file = resourcePath) {
  return evaluate(stampComposableIds(source, file, options).code);
}

describe('stampComposableIds', () => {
  it('stamps a GlobalStore subclass with its package-relative path and class name', () => {
    const { FacilitiesStore } = stampAndEvaluate(`
      ${IMPORT_STORE}
      class FacilitiesStore extends GlobalStore {}
      module.exports = { FacilitiesStore };
    `);
    expect(FacilitiesStore[COMPOSABLE_ID]).toBe(
      'kolibri-common/composables/useFacilities.js#FacilitiesStore',
    );
  });

  it('stamps a 6 character base64url hash of the development id in production', () => {
    const { FacilitiesStore } = stampAndEvaluate(
      `
      ${IMPORT_STORE}
      class FacilitiesStore extends GlobalStore {}
      module.exports = { FacilitiesStore };
    `,
      { production: true },
    );
    const expected = createHash('sha256')
      .update('kolibri-common/composables/useFacilities.js#FacilitiesStore')
      .digest('base64url')
      .slice(0, 6);
    expect(FacilitiesStore[COMPOSABLE_ID]).toBe(expected);
  });

  it('recognises GlobalStore imported by a relative path or another name', () => {
    const specPath = path.resolve(__dirname, '../../../kolibri/composables/__tests__/a.spec.js');
    const { Relative, Renamed } = stampAndEvaluate(
      `
      import GlobalStore from '../GlobalStore';
      import Store from 'kolibri/composables/GlobalStore.js';
      class Relative extends GlobalStore {}
      class Renamed extends Store {}
      module.exports = { Relative, Renamed };
    `,
      {},
      specPath,
    );
    expect(Object.hasOwn(Relative, COMPOSABLE_ID)).toBe(true);
    expect(Object.hasOwn(Renamed, COMPOSABLE_ID)).toBe(true);
  });

  it('leaves classes that do not directly extend GlobalStore unstamped', () => {
    const { Indirect, Failure, Local } = stampAndEvaluate(`
      ${IMPORT_STORE}
      import ComposableBase from 'kolibri/composables/ComposableBase';
      class FacilitiesStore extends GlobalStore {}
      class Indirect extends FacilitiesStore {}
      class Failure extends Error {}
      class Local extends ComposableBase {}
      module.exports = { Indirect, Failure, Local };
    `);
    expect(Object.hasOwn(Indirect, COMPOSABLE_ID)).toBe(false);
    expect(Object.hasOwn(Failure, COMPOSABLE_ID)).toBe(false);
    expect(Object.hasOwn(Local, COMPOSABLE_ID)).toBe(false);
  });

  it('names class expressions after the variable they are assigned to', () => {
    const { Named } = stampAndEvaluate(`
      ${IMPORT_STORE}
      const Named = class extends GlobalStore {};
      module.exports = { Named };
    `);
    expect(Named[COMPOSABLE_ID]).toBe('kolibri-common/composables/useFacilities.js#Named');
  });

  it('gives anonymous and same-named classes in one file distinct ids', () => {
    const { first, second, anonymous } = stampAndEvaluate(`
      ${IMPORT_STORE}
      function makeFirst() { return class Store extends GlobalStore {}; }
      function makeSecond() { return class Store extends GlobalStore {}; }
      module.exports = {
        first: makeFirst(),
        second: makeSecond(),
        anonymous: [class extends GlobalStore {}][0],
      };
    `);
    const ids = new Set([first, second, anonymous].map(cls => cls[COMPOSABLE_ID]));
    expect(ids.size).toBe(3);
  });

  it('returns null for a file with no GlobalStore subclasses', () => {
    expect(stampComposableIds('class A {}\nclass B extends A {}\n', resourcePath)).toBeNull();
  });

  it('fails on a GlobalStore file it cannot parse, naming the file and position', () => {
    expect(() =>
      stampComposableIds(`${IMPORT_STORE}\nclass A extends GlobalStore {\n`, resourcePath),
    ).toThrow(`${resourcePath}: Unexpected token (3:0)`);
  });

  it('returns a source map for the stamped file', () => {
    const { map } = stampComposableIds(
      `${IMPORT_STORE}\nclass A extends GlobalStore {}\n`,
      resourcePath,
    );
    expect(map.sources).toEqual([resourcePath]);
  });
});

describe('composableIdLoader', () => {
  const STORE_SOURCE = `${IMPORT_STORE}\nclass A extends GlobalStore {}\nmodule.exports = { A };\n`;

  function load(source, { hot, file = resourcePath }) {
    let output;
    composableIdLoader.call(
      {
        resourcePath: file,
        mode: 'development',
        hot,
        callback: (error, code) => {
          output = code;
        },
      },
      source,
    );
    return output;
  }

  function hotDeclines(code) {
    const decline = jest.fn();
    evaluate(code, { exports: {}, hot: { decline } });
    return decline.mock.calls.length > 0;
  }

  it('declines hot updates to a stamped file, so editing a store reloads the page', () => {
    expect(hotDeclines(load(STORE_SOURCE, { hot: true }))).toBe(true);
  });

  it('leaves hot updates alone when hot module replacement is off', () => {
    expect(hotDeclines(load(STORE_SOURCE, { hot: false }))).toBe(false);
  });

  it('passes through a file with no global stores unchanged', () => {
    const source = 'class A {}\n';
    expect(load(source, { hot: true })).toBe(source);
  });

  it('passes through the script of a .vue file unchanged, as Jest does', () => {
    const file = resourcePath.replace(/\.js$/, '.vue');
    expect(load(STORE_SOURCE, { hot: false, file })).toBe(STORE_SOURCE);
  });
});
