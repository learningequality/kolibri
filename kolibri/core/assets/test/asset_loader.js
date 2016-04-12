'use strict';

var assert = require('assert');
var rewire = require('rewire');

var assetLoader = rewire('../src/mediator/asset_loader.js');

describe('Asset loader', function() {
    describe('input is invalid', function() {
        it('should raise an error', function (done) {
            assetLoader('nothing', function(error) {
                assert(error instanceof Error);
                done();
            });
        });
    });
    describe('js input is valid, file fetches', function() {
        it('should callback null', function (done) {
            assetLoader.__set__('scriptjs', function(file, success, fail) {
                success();
            });
            assetLoader(['nothing.js'], function(error, missing) {
                assert.equal(error, null);
                done();
            });
        });
    });
    describe('css input is valid, file fetches', function() {
        it('should callback null', function (done) {
            assetLoader.__set__('onloadcss', function(file, success) {
                success();
            });
            assetLoader(['nothing.css'], function(error, missing) {
                assert.equal(error, null);
                done();
            });
        });
    });
    describe('js input is valid, file fails to fetch', function() {
        beforeEach(function(){
            assetLoader.__set__('scriptjs', function(file, success, fail) {
                fail();
            });
        });
        it('should raise an error', function (done) {
            assetLoader(['nothing.js'], function(error, missing) {
                assert(error instanceof Error);
                done();
            });
        });
        it('should have the file in the missing array', function (done) {
            assetLoader(['nothing.js'], function(error, missing) {
                assert.deepEqual(['nothing.js'], missing);
                done();
            });
        });
    });
    describe('css and js input is valid, files fetch', function() {
        beforeEach(function(){
            assetLoader.__set__('scriptjs', function(file, success, fail) {
                success();
            });
            assetLoader.__set__('onloadcss', function(file, success) {
                success();
            });
        });
        it('should callback null', function (done) {
            assetLoader(['nothing.js', 'nothing.css'], function(error, missing) {
                assert.equal(error, null);
                done();
            });
        });
        it('should have a null missing file list', function (done) {
            assetLoader(['nothing.js', 'nothing.css'], function(error, missing) {
                assert.equal(missing, null);
                done();
            });
        });
    });
    describe('css input is valid, file fails to fetch', function() {
        beforeEach(function(){
            assetLoader.__set__('onloadcss', function(file, success) {});
        });
        it('should raise an error', function (done) {
            assetLoader(['nothing.css'], function(error, missing) {
                assert(error instanceof Error);
                done();
            }, 1);
        });
        it('should have the file in the missing array', function (done) {
            assetLoader(['nothing.css'], function(error, missing) {
                assert.deepEqual(['nothing.css'], missing);
                done();
            }, 1);
        });
    });
});
