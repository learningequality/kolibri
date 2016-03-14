var path = require('path');
var jsdom = require("jsdom").jsdom;
var _ = require('lodash');
var fs = require('fs');
var mkdirp = require('mkdirp');

function Plugin(options) {
    this.externals = options.externals || {};
    this.kolibri = options.kolibri || {};
    this.plugin_name = options.plugin_name || '';
    this.async_file = options.async_file || '';
    this.kolibri_var_name = this.externals.kolibri;
    this.kolibri_path = this.kolibri.entry[this.kolibri.name];
}

Plugin.prototype.apply = function(compiler) {
    var self = this;

    compiler.plugin('done', function(c){

        var base_dir = c.compilation.compiler.context;
        var output_path = c.compilation.compiler.outputPath;

        var document = jsdom();

        var window = document.defaultView;

        global.document = window.document;

        global[self.kolibri_var_name] = require(path.join(base_dir, self.kolibri_path));

        for (var key in c.compilation.assets) {
            var plugin = require(path.join(base_dir, output_path, key));
            var events = (global[self.kolibri_var_name].plugins[self.plugin_name] || {}).events || {};
            var once = (global[self.kolibri_var_name].plugins[self.plugin_name] || {}).once || {};
            self.writeOutput(events, once);
        }
    });
};

Plugin.prototype.writeOutput = function(events, once) {
    mkdirp.sync(path.dirname(this.async_file));
    fs.writeFileSync(this.async_file, JSON.stringify({once: once, events: events}));
};

module.exports = Plugin;
