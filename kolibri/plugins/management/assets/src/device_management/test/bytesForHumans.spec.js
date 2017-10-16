/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import assert from 'assert';
import bytesForHumans from '../views/manage-content-page/bytesForHumans';

describe('bytesForHumans utility', () => {
  it('formats correctly for B range', () => {
    assert.equal(bytesForHumans(100), '100B');
  });

  it('formats correctly for KB range', () => {
    assert.equal(bytesForHumans(5 * 1024 + 10), '5KB');
  });

  it('formats correctly for MB range', () => {
    assert.equal(bytesForHumans(20 * 1048576 + 10), '20MB');
  });

  it('formats correctly for GB range', () => {
    assert.equal(bytesForHumans(30 * 1073741824 + 10), '30GB');
  });
});
