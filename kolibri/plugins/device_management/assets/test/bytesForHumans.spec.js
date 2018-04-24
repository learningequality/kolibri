/* eslint-env mocha */
import { expect } from 'chai';
import Vue from 'vue-test'; // eslint-disable-line
import bytesForHumans from '../src/views/manage-content-page/bytesForHumans';

const ONE_KB = 1024;
const ONE_MB = 1048576;
const ONE_GB = 1073741824;

describe('bytesForHumans utility', () => {
  it('formats correctly for 0B', () => {
    expect(bytesForHumans(0)).to.equal('0 B');
  });

  it('formats correctly for B range', () => {
    expect(bytesForHumans(100)).to.equal('100 B');
  });

  it('formats correctly for exactly one of each unit', () => {
    expect(bytesForHumans(1)).to.equal('1 B');
    expect(bytesForHumans(ONE_KB)).to.equal('1 KB');
    expect(bytesForHumans(ONE_MB)).to.equal('1 MB');
    expect(bytesForHumans(ONE_GB)).to.equal('1 GB');
  });

  it('formats correctly for KB range', () => {
    expect(bytesForHumans(5 * ONE_KB + 10)).to.equal('5 KB');
  });

  it('formats correctly for MB range', () => {
    expect(bytesForHumans(20 * ONE_MB + 10)).to.equal('20 MB');
  });

  it('formats correctly for GB range', () => {
    expect(bytesForHumans(30 * ONE_GB + 10)).to.equal('30 GB');
  });
});
