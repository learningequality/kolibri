'use strict';
/**
 * event export module.
 * @module event_export
 *
 * This module provides a Webpack plugin for evaluating bundled Javascript for plugins immediately after compilation.
 * They are then inspected in order to extract information about their 'events' and 'once' attributes, which is then
 * written to an external file for use during asynchronous plugin registration and loading.
 */

var path = require('path');
var jsdom = require("jsdom").jsdom;
var _ = require('lodash');
var fs = require('fs');
var mkdirp = require('mkdirp');


/**
 * The EventExport plugin class constructor function.
 * @class
 * @classdesc This plugin inspects the result of compilation from Webpack and executes the code within the context of
 * the main Kolibri core app - this allows us to inspect the events and once properties of that plugin.
 */
function Plugin(options) {
    this.externals = options.externals || {};
    this.kolibri = options.kolibri || {};
    this.kolibri_module_name = options.kolibri_module_name || '';
    this.async_file = options.async_file || '';
    this.kolibri_var_name = this.externals.kolibri;
    this.kolibri_path = this.kolibri.entry[this.kolibri.name];
}

/**
 * @param {object} compiler
 * @description The apply method for the plugin - this is what gets automatically called by Webpack when registering
 * the plugin against the compilation.
 */
Plugin.prototype.apply = function(compiler) {
    var self = this;

    compiler.plugin('done', function(c){
        /**
         * @param {object} c
         * @description This anonymous function inspects the output of the compilation once it has finished (the 'done'
         * event has been fired), requires the Kolibri core app, and then loads the plugin, which automatically registers
         * itself against the Kolibri core app upon initialization.
         */
        // Get the base_dir for the Kolibri project.
        var base_dir = c.compilation.compiler.context;
        // Get the output path where files in this compilation are being written to.
        var output_path = c.compilation.compiler.outputPath;

        // In order to be able to instantiate frontend code within a node.js environment, create a dummy DOM.
        var document = jsdom();

        var window = document.defaultView;

        global.document = window.document;

        // Import the Kolibri core app so that we can run the plugin that is being built and have it register itself.
        global[self.kolibri_var_name] = require(path.join(base_dir, self.kolibri_path));

        for (var key in c.compilation.assets) {
            // Require the plugin - this will then auto register itself against the above instance of the Kolibri core.
            var plugin = require(path.join(base_dir, output_path, key));
            // Read off the two event objects from the plugin so that we can record them in a separate file.
            var events = (global[self.kolibri_var_name].kolibri_modules[self.kolibri_module_name] || {}).events || {};
            var once = (global[self.kolibri_var_name].kolibri_modules[self.kolibri_module_name] || {}).once || {};
            self.writeOutput(events, once);
        }
    });
};


/**
 * @param {object} events
 * @param {object} once
 * @description This method writes out a JSON file of the events object (describing all multi-time firing events) and
 * the once object (describing all one time firing events) with mappings to the plugin methods that they call.
 */Plugin.prototype.writeOutput = function(events, once) {
    mkdirp.sync(path.dirname(this.async_file));
    // Write a file that contains the event objects so that we know when to asynchronously load the plugin if needed.
    fs.writeFileSync(this.async_file, JSON.stringify({once: once, events: events}));
};

module.exports = Plugin;
