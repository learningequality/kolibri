import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { SourceMap } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import webpack from 'webpack';
import guardSignalsDisposal from '../../kolibri/plugins/perseus_viewer/guardSignalsDisposal';

const source = `(function () {
  var cleanup = function () {};
  cleanup[Symbol.dispose]=cleanup;
  return cleanup;
})()`;

describe('Preact Signals disposal', () => {
  it.each([undefined, '{}', '{invalid'])(
    'falls back to an original map for sidecar %s',
    sidecar => {
      const directory = mkdtempSync(path.join(tmpdir(), 'signals-map-'));
      const resourcePath = path.join(directory, 'signals-core.module.js');
      const callback = jest.fn();
      const loader = {
        sourceMap: true,
        resourcePath,
        addDependency: jest.fn(),
        addMissingDependency: jest.fn(),
        callback,
      };
      try {
        if (sidecar !== undefined) writeFileSync(`${resourcePath}.map`, sidecar);
        guardSignalsDisposal.call(
          loader,
          `${source}\n//# sourceMappingURL=signals-core.module.js.map`,
        );
        const [, output, map] = callback.mock.calls[0];
        expect(runInNewContext(output, { Symbol: {} })).not.toHaveProperty('undefined');
        expect(new SourceMap(map).findEntry(0, 0)).toMatchObject({ originalSource: resourcePath });
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  );

  it('preserves the original mapping for code after a guarded assignment', () => {
    const input = 'cleanup[Symbol.dispose]=cleanup;function action() {}';
    const { OriginalSource } = webpack.sources;
    const upstreamMap = new OriginalSource(input, 'signals.ts').map();
    const callback = jest.fn();
    guardSignalsDisposal.call(
      { sourceMap: true, resourcePath: 'signals.js', callback },
      input,
      upstreamMap,
    );
    expect(callback).toHaveBeenCalledTimes(1);
    const [, output, map] = callback.mock.calls[0];
    const entry = new SourceMap(map).findEntry(0, output.indexOf('function action'));
    expect(entry).toMatchObject({
      originalSource: 'signals.ts',
      originalLine: 0,
      originalColumn: input.indexOf('function action'),
    });
  });

  it('preserves the other operands in a sequence expression', () => {
    const sequence = `(function () {
      var dispose = function () {};
      var count = 0;
      dispose[Symbol.dispose]=dispose, ++count;
      return [count, Object.keys(dispose)];
    })()`;
    expect(runInNewContext(guardSignalsDisposal(sequence), { Symbol: {} })).toEqual([1, []]);
  });

  it('does not add an undefined property when Symbol.dispose is absent', () => {
    const cleanup = runInNewContext(guardSignalsDisposal(source), { Symbol: {} });
    expect(cleanup).not.toHaveProperty('undefined');
  });

  it.each([
    'return cleanup[Symbol.dispose]=cleanup;',
    'return (0, cleanup[Symbol.dispose]=cleanup);',
  ])('rejects a disposal assignment whose result is used: %s', statement => {
    expect(() => guardSignalsDisposal(`function dispose() { ${statement} }`)).toThrow(
      'Cannot guard a Symbol.dispose assignment whose result is used',
    );
  });

  it('keeps the native disposal method when Symbol.dispose is available', () => {
    const dispose = Symbol('dispose');
    const cleanup = runInNewContext(guardSignalsDisposal(source), { Symbol: { dispose } });
    expect(cleanup[dispose]).toBe(cleanup);
  });
});
