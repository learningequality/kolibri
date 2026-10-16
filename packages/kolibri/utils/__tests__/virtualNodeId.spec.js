import { virtualNodeId } from '../virtualNodeId';

// Shared with kolibri/core/content/test/test_virtual_node_identity.py
const VECTOR_ROOT_ID = '000102030405060708090a0b0c0d0e0f';
const VECTOR_PATH = 'A/Albert_Einstein';
const VECTOR_NODE_ID = 'b3e2475bf80f5e7a9a5d7c1cd0770c8b';

describe('virtual node id', () => {
  it('matches the shared Python vector', () => {
    expect(virtualNodeId(VECTOR_ROOT_ID, VECTOR_PATH)).toEqual(VECTOR_NODE_ID);
  });

  it('differs by path', () => {
    expect(virtualNodeId(VECTOR_ROOT_ID, 'A/One')).not.toEqual(
      virtualNodeId(VECTOR_ROOT_ID, 'A/Two'),
    );
  });
});
