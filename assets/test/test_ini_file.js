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
    describe('input is valid, bundles output', function() {
        it('should have one entry', function (done) {
            temp.open("test.ini", function (err, info) {
                if (!err) {
                    fs.write(info.fd, "[test_plugin]\nentry_file = this.js\n");
                    fs.close(info.fd, function (err) {
                        assert(parseBundleIni(info.path, [], "/")[0].length === 1);
                        done();
                    });
                }
            });
        });
    });
    describe('input is invalid, bundles output', function() {
        it('should have no entries', function (done) {
            temp.open("test.ini", function (err, info) {
                if (!err) {
                    fs.write(info.fd, "[test_plugin]");
                    fs.close(info.fd, function (err) {
                        assert(parseBundleIni(info.path, [], "/")[0].length === 0);
                        done();
                    });
                }
            });
        });
    });
    describe('input is valid, has externals flag, externals output', function() {
        it('should have one entry', function (done) {
            temp.open("test.ini", function (err, info) {
                if (!err) {
                    fs.write(info.fd, "[test_plugin]\nentry_file = this.js\nexternal = true\n");
                    fs.close(info.fd, function (err) {
                        assert(Object.keys(parseBundleIni(info.path, [], "/", {})[1]).length === 1);
                        done();
                    });
                }
            });
        });
    });
    describe('input is valid, two plugins with same name, bundles output', function() {
        it('should have one entry', function (done) {
            temp.open("test.ini", function (err, info) {
                if (!err) {
                    fs.write(info.fd, "[test_plugin]\nentry_file = this.js");
                    fs.close(info.fd, function (err) {
                        assert(parseBundleIni(info.path, [], "/", {})[0].length === 1);
                        done();
                    });
                }
            });
        });
    });
    describe('input is valid, two externals with same name, externals output', function() {
        it('should have one entry', function (done) {
            temp.open("test.ini", function (err, info) {
                if (!err) {
                    fs.write(info.fd, "[test_plugin]\nentry_file = this.js\nexternal = true");
                    fs.close(info.fd, function (err) {
                        assert(Object.keys(parseBundleIni(info.path, [], "/", {"test_plugin": ""})[1]).length === 1);
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
    describe('nested folders with one ini file, output', function() {
        it('should have one entry', function (done) {
            temp.mkdir("dir1", function(err, dirPath1){
                fs.mkdir(path.join(dirPath1, "sub"), function (err) {
                    if (!err) {
                        fs.writeFile(path.join(dirPath1, "sub", "bundles.ini"), "[test_plugin]\nentry_file = this.js\n", function (err) {
                            if (!err) {
                                assert(recurseBundleIni([dirPath1], [], "/").length === 1);
                                done();
                            }
                        });
                    }
                });
            });
        });
    });
    describe('two valid input files with an external, output', function() {
        it('should have two entries, each with externals', function (done) {
            temp.mkdir("dir1", function(err, dirPath1){
                fs.writeFile(path.join(dirPath1, "bundles.ini"), "[test_plugin]\nentry_file = this.js\nexternal = true\n", function (err) {
                    if (!err) {
                        temp.mkdir("dir2", function(err, dirPath2){
                            fs.writeFile(path.join(dirPath2, "bundles.ini"), "[test_plugin]\nentry_file = this.js\n", function (err) {
                                if (!err) {
                                    var output = recurseBundleIni([dirPath1, dirPath2], [], "/");
                                    assert(output.length === 2);
                                    output.forEach(function(bundle){
                                        assert(typeof bundle.externals !== "undefined");
                                    });
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
