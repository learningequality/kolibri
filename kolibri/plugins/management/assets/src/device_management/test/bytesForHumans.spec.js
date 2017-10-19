/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import assert from 'assert';
import bytesForHumans from '../views/manage-content-page/bytesForHumans';

const ONE_KB = 1024;
const ONE_MB = 1048576;
const ONE_GB = 1073741824;

describe('bytesForHumans utility', () => {
  it('formats correctly for 0B', () => {
    assert.equal(bytesForHumans(0), '0 B');
  });

  it('formats correctly for B range', () => {
    assert.equal(bytesForHumans(100), '100 B');
  });

  it('formats correctly for exactly one of each unit', () => {
    assert.equal(bytesForHumans(1), '1 B');
    assert.equal(bytesForHumans(ONE_KB), '1 KB');
    assert.equal(bytesForHumans(ONE_MB), '1 MB');
    assert.equal(bytesForHumans(ONE_GB), '1 GB');
  });

  it('formats correctly for KB range', () => {
    assert.equal(bytesForHumans(5 * ONE_KB + 10), '5 KB');
  });

  it('formats correctly for MB range', () => {
    assert.equal(bytesForHumans(20 * ONE_MB + 10), '20 MB');
  });

  it('formats correctly for GB range', () => {
    assert.equal(bytesForHumans(30 * ONE_GB + 10), '30 GB');
  });
});
