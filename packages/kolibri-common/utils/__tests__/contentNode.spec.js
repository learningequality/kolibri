import { deduplicateResources } from '../contentNode';

jest.mock('kolibri/utils/i18n', () => ({
  getContentLangActive: () => 0,
}));

describe('deduplicateResources', () => {
  it('returns nodes as-is when there are no duplicates', () => {
    const nodes = [
      { id: 'a', content_id: '1', title: 'A' },
      { id: 'b', content_id: '2', title: 'B' },
    ];
    const result = deduplicateResources(nodes);
    expect(result).toHaveLength(2);
  });

  it('groups nodes by content_id and sets copies on the result', () => {
    const nodes = [
      { id: 'a1', content_id: '1', title: 'Copy A' },
      { id: 'a2', content_id: '1', title: 'Copy B' },
    ];
    const result = deduplicateResources(nodes);
    expect(result).toHaveLength(1);
    expect(result[0].copies).toHaveLength(2);
  });

  it('does not mutate the original node objects when deduplicating', () => {
    const nodeA = { id: 'a1', content_id: '1', title: 'Copy A' };
    const nodeB = { id: 'a2', content_id: '1', title: 'Copy B' };
    const nodes = [nodeA, nodeB];

    deduplicateResources(nodes);

    // The original objects must not have a 'copies' property added
    expect(nodeA).not.toHaveProperty('copies');
    expect(nodeB).not.toHaveProperty('copies');
  });

  it('does not accumulate copies when called repeatedly with the same nodes', () => {
    const nodes = [
      { id: 'a1', content_id: '1', title: 'Copy A' },
      { id: 'a2', content_id: '1', title: 'Copy B' },
    ];

    const result1 = deduplicateResources(nodes);
    expect(result1[0].copies).toHaveLength(2);

    // Simulate what happens when a computed re-runs with the same source nodes:
    // the original nodes should be unchanged, so we get the same result
    const result2 = deduplicateResources(nodes);
    expect(result2[0].copies).toHaveLength(2);
  });
});
