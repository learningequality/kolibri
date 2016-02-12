var parseBundleIni = require('../src/parse_bundle_ini');

var assert = require('assert');
var fs = require('fs');
var temp = require('temp').track();


describe('parseBundleIni', function() {
    var tempfile;
    beforeEach(function(done) {
        temp.open("test.ini", function(err, info) {
            if (!err) {
                fs.write(info.fd, "[test_plugin]\nentry_file = this.js\n");
                tempfile = info.path;
                fs.close(info.fd, function(err) {
                    done();
                });
            }
        });
    });
    afterEach(function() {
        temp.cleanupSync();
    });
    describe('output', function() {
        it('should have one entry', function () {
            assert(parseBundleIni(tempfile, [], "/").length === 1);
        });
    });
});
