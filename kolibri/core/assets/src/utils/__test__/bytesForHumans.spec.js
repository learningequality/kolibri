import bytesForHumans from '../bytesForHumans';

const ONE_KB = 10 ** 3;
const ONE_MB = 10 ** 6;
const ONE_GB = 10 ** 9;

describe('bytesForHumans utility', () => {
  it('formats correctly for 0B', () => {
    expect(bytesForHumans(0)).toEqual('0 B');
  });

  it('formats correctly for B range', () => {
    expect(bytesForHumans(100)).toEqual('100 B');
  });

  it('formats correctly for exactly one of each unit', () => {
    expect(bytesForHumans(1)).toEqual('1 B');
    expect(bytesForHumans(ONE_KB)).toEqual('1 KB');
    expect(bytesForHumans(ONE_MB)).toEqual('1 MB');
    expect(bytesForHumans(ONE_GB)).toEqual('1 GB');
  });

  it('formats correctly for KB range', () => {
    expect(bytesForHumans(5 * ONE_KB + 10)).toEqual('5 KB');
  });

  it('formats correctly for MB range', () => {
    expect(bytesForHumans(20 * ONE_MB + 10)).toEqual('20 MB');
  });

  it('formats correctly for GB range', () => {
    expect(bytesForHumans(30 * ONE_GB + 10)).toEqual('30 GB');
  });
});
