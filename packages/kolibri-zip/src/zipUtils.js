export function readUInt32LE(buffer, offset) {
  return (
    buffer[offset] |
    (buffer[offset + 1] << 8) |
    (buffer[offset + 2] << 16) |
    (buffer[offset + 3] << 24)
  );
}

export function readUInt16LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8);
}
