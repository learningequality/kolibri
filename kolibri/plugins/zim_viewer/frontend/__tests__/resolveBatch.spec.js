import client from 'kolibri/client';
import resolveBatch from '../resolveBatch';

jest.mock('kolibri/client');
jest.mock('kolibri/urls', () => ({
  'kolibri:kolibri.plugins.zim_viewer:zim_resolve_batch': ({ filename }) =>
    `/zim_viewer/api/zim/resolve_batch/${filename}`,
}));

const pathsOf = url => new URL(url, 'http://kolibri').searchParams.getAll('path');
const requestedPaths = () => client.mock.calls.map(([{ url }]) => pathsOf(url));

describe('resolveBatch', () => {
  beforeEach(() => {
    client.mockReset();
    client.mockImplementation(async ({ url }) => ({
      data: { results: Object.fromEntries(pathsOf(url).map(p => [p, { clusterNumber: 0 }])) },
    }));
  });

  it("resolves the paths against the file's resolver", async () => {
    const results = await resolveBatch('abc.zim', ['C/One', 'C/Two']);

    expect(results).toEqual({ 'C/One': { clusterNumber: 0 }, 'C/Two': { clusterNumber: 0 } });
    expect(client.mock.calls[0][0].url).toMatch(
      /^\/zim_viewer\/api\/zim\/resolve_batch\/abc\.zim\?/,
    );
  });

  it('requests the paths sorted, so the same set is always the same URL', async () => {
    await resolveBatch('abc.zim', ['C/Two', 'C/One']);

    expect(requestedPaths()).toEqual([['C/One', 'C/Two']]);
  });

  it('splits a batch too long for one request line across requests, merging the answers', async () => {
    const paths = Array.from({ length: 500 }, (_, i) => `C/${'x'.repeat(20)}${i}`);

    const results = await resolveBatch('abc.zim', paths);

    expect(client.mock.calls.length).toBeGreaterThan(1);
    for (const [{ url }] of client.mock.calls) {
      expect(new URL(url, 'http://kolibri').search.length).toBeLessThanOrEqual(6000);
    }
    expect(requestedPaths().flat().sort()).toEqual([...paths].sort());
    expect(Object.keys(results)).toHaveLength(500);
  });
});
