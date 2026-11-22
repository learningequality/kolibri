import compat from 'core-js-compat';
import supportedBrowsers from '../index';
import { browsers } from '../cutoff';

describe('browser cutoff', () => {
  beforeEach(() => {
    jest.replaceProperty(process, 'env', { ...process.env, BROWSERSLIST_IGNORE_OLD_DATA: '1' });
  });

  afterEach(() => jest.restoreAllMocks());

  it('covers every engine resolved from the support browserslist', () => {
    const { targets } = compat({ targets: supportedBrowsers });
    const engines = new Set(Object.values(targets).flatMap(Object.keys));
    expect(Object.keys(browsers)).toEqual(expect.arrayContaining([...engines]));
  });

  it.each(Object.entries(browsers))('sets %s to the Array-copy cutoff', (engine, cutoff) => {
    const modules = ['es.array.to-reversed', 'es.array.to-sorted', 'es.array.to-spliced'];
    const versions = modules.map(module => compat.data[module][engine]);
    expect(versions).not.toContain(undefined);
    const [latest] = versions.sort((left, right) =>
      right.localeCompare(left, 'en', { numeric: true }),
    );
    expect(cutoff).toBe(latest);
  });
});
