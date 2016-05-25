/* global define, it, describe, beforeEach */

'use strict';

const assert = require('assert');
const rewire = require('rewire');

const assetLoader = rewire('../src/asset_loader.js');

describe('Asset loader', () => {
  describe('input is invalid', () => {
    it('should raise an error', (done) => {
      assetLoader('nothing', (error) => {
        assert(error instanceof Error);
        done();
      });
    });
  });
  describe('js input is valid, file fetches', () => {
    it('should callback null', (done) => {
      assetLoader.__set__('scriptjs', (file, success) => {
        success();
      });
      assetLoader(['nothing.js'], (error) => {
        assert.equal(error, null);
        done();
      });
    });
  });
  describe('css input is valid, file fetches', () => {
    it('should callback null', (done) => {
      assetLoader.__set__('onloadcss', (file, success) => {
        success();
      });
      assetLoader(['nothing.css'], (error) => {
        assert.equal(error, null);
        done();
      });
    });
  });
  describe('js input is valid, file fails to fetch', () => {
    beforeEach(() => {
      assetLoader.__set__('scriptjs', (file, success, fail) => {
        fail();
      });
    });
    it('should raise an error', (done) => {
      assetLoader(['nothing.js'], (error) => {
        assert(error instanceof Error);
        done();
      });
    });
    it('should have the file in the missing array', (done) => {
      assetLoader(['nothing.js'], (error, missing) => {
        assert.deepEqual(['nothing.js'], missing);
        done();
      });
    });
  });
  describe('css and js input is valid, files fetch', () => {
    beforeEach(() => {
      assetLoader.__set__('scriptjs', (file, success) => {
        success();
      });
      assetLoader.__set__('onloadcss', (file, success) => {
        success();
      });
    });
    it('should callback null', (done) => {
      assetLoader(['nothing.js', 'nothing.css'], (error) => {
        assert.equal(error, null);
        done();
      });
    });
    it('should have a null missing file list', (done) => {
      assetLoader(['nothing.js', 'nothing.css'], (error, missing) => {
        assert.equal(missing, null);
        done();
      });
    });
  });
  describe('css input is valid, file fails to fetch', () => {
    beforeEach(() => {
      assetLoader.__set__('onloadcss', () => {});
    });
    it('should raise an error', (done) => {
      assetLoader(['nothing.css'], (error) => {
        assert(error instanceof Error);
        done();
      }, 1);
    });
    it('should have the file in the missing array', (done) => {
      assetLoader(['nothing.css'], (error, missing) => {
        assert.deepEqual(['nothing.css'], missing);
        done();
      }, 1);
    });
  });
});
