import { v5 as uuidv5 } from 'uuid';

// uuid.v5 rejects a string namespace lacking RFC 4122 version/variant bits, as content ids do.
function hexToBytes(hex) {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Must match kolibri.core.content.utils.virtual_nodes.virtual_node_id byte for byte.
export function virtualNodeId(rootId, path) {
  return uuidv5(path, hexToBytes(rootId)).replace(/-/g, '');
}
