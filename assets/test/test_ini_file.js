var parseBundleIni = require('../src/parse_bundle_ini');
var recurseBundleIni = require('../src/recurse_bundle_ini');

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var temp = require('temp').track();


describe('parseBundleIni', function() {
    after(function() {
        temp.cleanupSync();
    });
    describe('input is valid, output', function() {
        it('should have one entry', function (done) {
            temp.open("test.ini", function (err, info) {
                if (!err) {
                    fs.write(info.fd, "[test_plugin]\nentry_file = this.js\n");
                    fs.close(info.fd, function (err) {
                        assert(parseBundleIni(info.path, [], "/").length === 1);
                        done();
                    });
                }
            });
        });
    });
    describe('input is invalid, output', function() {
        it('should have no entries', function (done) {
            temp.open("test.ini", function (err, info) {
                if (!err) {
                    fs.write(info.fd, "[test_plugin]");
                    fs.close(info.fd, function (err) {
                        assert(parseBundleIni(info.path, [], "/").length === 0);
                        done();
                    });
                }
            });
        });
    });
});

describe('recurseBundleIni', function() {
    after(function() {
        temp.cleanupSync();
    });
    describe('two valid input files, output', function() {
        it('should have two entries', function (done) {
            temp.mkdir("dir1", function(err, dirPath1){
                var base_path = path.dirname(dirPath1);
                fs.writeFile(path.join(dirPath1, "bundles.ini"), "[test_plugin]\nentry_file = this.js\n", function (err) {
                    if (!err) {
                        temp.mkdir("dir2", function(err, dirPath2){
                            fs.writeFile(path.join(dirPath2, "bundles.ini"), "[test_plugin]\nentry_file = this.js\n", function (err) {
                                if (!err) {
                                    assert(recurseBundleIni([dirPath1, dirPath2], [], "/").length === 2);
                                    done();
                                }
                            });
                        });
                    }
                });
            });
        });
    });
    describe('one valid input file, output', function() {
        it('should have one entry', function (done) {
            temp.mkdir("dir1", function(err, dirPath1){
                var base_path = path.dirname(dirPath1);
                fs.writeFile(path.join(dirPath1, "bundles.ini"), "[test_plugin]", function (err) {
                    if (!err) {
                        temp.mkdir("dir2", function(err, dirPath2){
                            fs.writeFile(path.join(dirPath2, "bundles.ini"), "[test_plugin]\nentry_file = this.js\n", function (err) {
                                if (!err) {
                                    assert(recurseBundleIni([dirPath1, dirPath2], [], "/").length === 1);
                                    done();
                                }
                            });
                        });
                    }
                });
            });
        });
    });
    describe('no valid input files, output', function() {
        it('should no entries', function (done) {
            temp.mkdir("dir1", function(err, dirPath1){
                var base_path = path.dirname(dirPath1);
                fs.writeFile(path.join(dirPath1, "bundles.ini"), "[test_plugin]", function (err) {
                    if (!err) {
                        temp.mkdir("dir2", function(err, dirPath2){
                            fs.writeFile(path.join(dirPath2, "bundles.ini"), "[test_plugin]", function (err) {
                                if (!err) {
                                    assert(recurseBundleIni([dirPath1, dirPath2], [], "/").length === 0);
                                    done();
                                }
                            });
                        });
                    }
                });
            });
        });
    });
});
