var assert = require('assert');
var fs = require('fs');
var path = require('path');
var temp = require('temp');
var child_process = require('child_process');
var rewire = require('rewire');
var sinon = require('sinon');

var parseBundlePlugin = require('../src/parse_bundle_plugin');
var recurseBundlePlugins = rewire('../src/recurse_bundle_plugins');
var readBundlePlugin = rewire('../src/read_bundle_plugin');
var EventExport = require('../src/event_export');

describe('parseBundlePlugin', function() {
    describe('input is valid, bundles output', function() {
        it('should have one entry', function (done) {
            var data = {
                name: "kolibri.plugin.test.test_plugin",
                entry_file: "src/file.js",
                stats_file: "output.json",
                async_file: "output_async.json",
                module_path: "kolibri/plugin/test"
            };
            assert(typeof parseBundlePlugin(data, "/")[0] !== "undefined");
            done();
        });
    });
    describe('input is missing name, bundles output', function() {
        it('should be undefined', function (done) {
            var data = {
                entry_file: "src/file.js",
                stats_file: "output.json",
                async_file: "output_async.json",
                module_path: "kolibri/plugin/test"
            };
            assert(typeof parseBundlePlugin(data, "/") === "undefined");
            done();
        });
    });
    describe('input is missing entry_file, bundles output', function() {
        it('should be undefined', function (done) {
            var data = {
                name: "kolibri.plugin.test.test_plugin",
                stats_file: "output.json",
                async_file: "output_async.json",
                module_path: "kolibri/plugin/test"
            };
            assert(typeof parseBundlePlugin(data, "/") === "undefined");
            done();
        });
    });
    describe('input is missing stats_file, bundles output', function() {
        it('should be undefined', function (done) {
            var data = {
                name: "kolibri.plugin.test.test_plugin",
                entry_file: "src/file.js",
                async_file: "output_async.json",
                module_path: "kolibri/plugin/test"
            };
            assert(typeof parseBundlePlugin(data, "/") === "undefined");
            done();
        });
    });
    describe('input is missing module_path, bundles output', function() {
        it('should be undefined', function (done) {
            var data = {
                name: "kolibri.plugin.test.test_plugin",
                entry_file: "src/file.js",
                async_file: "output_async.json",
                stats_file: "output.json"
            };
            assert(typeof parseBundlePlugin(data, "/") === "undefined");
            done();
        });
    });
    describe('input is missing async_file, bundles output', function() {
        it('should be undefined', function (done) {
            var data = {
                name: "kolibri.plugin.test.test_plugin",
                entry_file: "src/file.js",
                module_path: "kolibri/plugin/test",
                stats_file: "output.json"
            };
            assert(typeof parseBundlePlugin(data, "/") === "undefined");
            done();
        });
    });
    describe('input is valid, has externals flag, externals output', function() {
        it('should have one entry', function (done) {
            var data = {
                name: "kolibri.plugin.test.test_plugin",
                entry_file: "src/file.js",
                async_file: "output_async.json",
                external: true,
                stats_file: "output.json",
                module_path: "kolibri/plugin/test"
            };
            assert(typeof parseBundlePlugin(data, "/")[1] !== "undefined");
            done();
        });
    });
    describe('input is valid, has core flag', function() {
        it('should have its name set to Kolibri', function (done) {
            var data = {
                name: "kolibri.plugin.test.test_plugin",
                entry_file: "src/file.js",
                async_file: "output_async.json",
                external: true,
                core: true,
                stats_file: "output.json",
                module_path: "kolibri/plugin/test"
            };
            assert.equal(parseBundlePlugin(data, "/")[0].output.library, "Kolibri");
            done();
        });
    });
});

describe('readBundlePlugins', function() {
    var data = [];

    beforeEach(function() {
        readBundlePlugin.__set__("execSync", function() {
            var output = "";
            for (var i = 0; i < data.length; i++) {
                output += JSON.stringify(data[i]) + ((i === data.length - 1) ? "" : "\n");
            }
            return new Buffer(output);
        });
    });

    describe('two valid inputs, output', function() {
        it('should have two entries', function (done) {
            data = [
                {
                    name: "kolibri.plugin.test.test_plugin",
                    entry_file: "src/file.js",
                    stats_file: "output.json",
                    async_file: "output_async.json",
                    module_path: "kolibri/plugin/test"
                },
                {
                    name: "kolibri.plugin.test.test_plugin1",
                    entry_file: "src/file1.js",
                    stats_file: "output1.json",
                    async_file: "output1_async.json",
                    module_path: "kolibri/plugin/test"
                }
            ];
            assert(readBundlePlugin("", "")[0].length === 2);
            done();
        });
    });
    describe('one valid input out of two, output', function() {
        it('should have one entry', function (done) {
            data = [
                {
                    name: "kolibri.plugin.test.test_plugin",
                    stats_file: "output.json",
                    async_file: "output_async.json",
                    module_path: "kolibri/plugin/test"
                },
                {
                    name: "kolibri.plugin.test.test_plugin1",
                    entry_file: "src/file1.js",
                    stats_file: "output1.json",
                    async_file: "output1_async.json",
                    module_path: "kolibri/plugin/test"
                }
            ];
            assert(readBundlePlugin("", "")[0].length === 1);
            done();
        });
    });
    describe('no valid input, output', function() {
        it('should have no entries', function (done) {
            data = [
                {
                    name: "kolibri.plugin.test.test_plugin",
                    stats_file: "output.json",
                    async_file: "output_async.json",
                    module_path: "kolibri/plugin/test"
                },
                {
                    name: "kolibri.plugin.test.test_plugin1",
                    stats_file: "output1.json",
                    async_file: "output1_async.json",
                    module_path: "kolibri/plugin/test"
                }
            ];
            assert(readBundlePlugin("", "")[0].length === 0);
            done();
        });
    });
    describe('two external flags on inputs, externals output', function() {
        it('should have two entries', function (done) {
            data = [
                {
                    name: "kolibri.plugin.test.test_plugin",
                    entry_file: "src/file.js",
                    stats_file: "output.json",
                    async_file: "output_async.json",
                    external: true,
                    module_path: "kolibri/plugin/test"
                },
                {
                    name: "kolibri.plugin.test.test_plugin1",
                    entry_file: "src/file1.js",
                    stats_file: "output1.json",
                    async_file: "output1_async.json",
                    external: true,
                    module_path: "kolibri/plugin/test"
                }
            ];
            assert(Object.keys(readBundlePlugin("", "")[1]).length === 2);
            done();
        });
    });
    describe('two identically named external flags on inputs, externals output', function() {
        it('should have two entries', function (done) {
            data = [
                {
                    name: "kolibri.plugin.test.test_plugin",
                    entry_file: "src/file.js",
                    stats_file: "output.json",
                    async_file: "output1_async.json",
                    external: true,
                    module_path: "kolibri/plugin/test"
                },
                {
                    name: "kolibri.plugin.test.test_plugin",
                    entry_file: "src/file1.js",
                    stats_file: "output1.json",
                    async_file: "output1_async.json",
                    external: true,
                    module_path: "kolibri/plugin/test"
                }
            ];
            assert(Object.keys(readBundlePlugin("", "")[1]).length === 1);
            done();
        });
    });
});

describe('recurseBundlePlugins', function() {
    var ind = 0;
    var data = [[]];

    after(function() {
        temp.cleanupSync();
    });

    beforeEach(function() {
        ind = 0;
        recurseBundlePlugins.__set__("readBundlePlugin", function() {
            var output = data[ind];
            ind = ind + 1;
            return output;
        });
    });

    describe('two valid input files, output', function() {
        it('should have two entries', function (done) {
            recurseBundlePlugins.__set__("EventExport", function() {
                return {};
            });
            data = [
                [[{core: null, plugins: []}], {}],
                [[{}], {}]
            ];
            temp.mkdir("dir1", function(err, dirPath1){
                fs.writeFile(path.join(dirPath1, "kolibri_plugin.py"), "", function (err) {
                    if (!err) {
                        temp.mkdir("dir2", function(err, dirPath2){
                            fs.writeFile(path.join(dirPath2, "kolibri_plugin.py"), "", function (err) {
                                if (!err) {
                                    assert(recurseBundlePlugins([dirPath1, dirPath2], "/").length === 2);
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
            data = [
                [[{}], {}],
                [[], {}]
            ];
            temp.mkdir("dir1", function(err, dirPath1){
                fs.writeFile(path.join(dirPath1, "kolibri_plugin.py"), "", function (err) {
                    if (!err) {
                        temp.mkdir("dir2", function(err, dirPath2){
                            fs.writeFile(path.join(dirPath2, "kolibri_plugin.py"), "", function (err) {
                                if (!err) {
                                    assert(recurseBundlePlugins([dirPath1, dirPath2], "/").length === 1);
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
            data = [
                [[], {}],
                [[], {}]
            ];
            temp.mkdir("dir1", function(err, dirPath1){
                fs.writeFile(path.join(dirPath1, "kolibri_plugin.py"), "", function (err) {
                    if (!err) {
                        temp.mkdir("dir2", function(err, dirPath2){
                            fs.writeFile(path.join(dirPath2, "kolibri_plugin.py"), "", function (err) {
                                if (!err) {
                                    assert(recurseBundlePlugins([dirPath1, dirPath2], "/").length === 0);
                                    done();
                                }
                            });
                        });
                    }
                });
            });
        });
    });
    describe('nested folders with one file, output', function() {
        it('should have one entry', function (done) {
            data = [
                [[{}], {}]
            ];
            temp.mkdir("dir1", function(err, dirPath1){
                fs.mkdir(path.join(dirPath1, "sub"), function (err) {
                    if (!err) {
                        fs.writeFile(path.join(dirPath1, "sub", "kolibri_plugin.py"), "", function (err) {
                            if (!err) {
                                assert(recurseBundlePlugins([dirPath1], "/").length === 1);
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
            data = [
                [[{}], {name: "this"}],
                [[{}], {name1: "that"}]
            ];
            temp.mkdir("dir1", function(err, dirPath1){
                fs.writeFile(path.join(dirPath1, "kolibri_plugin.py"), "", function (err) {
                    if (!err) {
                        temp.mkdir("dir2", function(err, dirPath2){
                            fs.writeFile(path.join(dirPath2, "kolibri_plugin.py"), "", function (err) {
                                if (!err) {
                                    var output = recurseBundlePlugins([dirPath1, dirPath2], "/");
                                    assert(output.length === 2);
                                    for (var i = 0; i < output.length; i++) {
                                        assert(Object.keys(output[i].externals).length === 2);
                                    }
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

describe('EventExport', function() {
    beforeEach(function() {
        this.test_plugin = new EventExport({
            externals: {
                kolibri: 'kolibri'
            },
            kolibri: {
                entry: {kolibri: 'this.js'},
                name: 'kolibri'
            },
            plugin_name: 'test',
            async_file: 'test_async.json'
        });
    });
    it('should initialize', function() {
        assert(typeof this.test_plugin !== 'undefined');
    });
    it('should call the plugin method of the compilation object', function() {
        var spy = sinon.spy();
        this.test_plugin.apply({plugin: spy});
        assert(spy.called);
    });
});
