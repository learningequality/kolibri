'use strict';

var Kolibri = require('kolibri');
var _ = require('lodash');
var Backbone = require('backbone');

var pluginOptions = [];

var Plugin = function (options) {
    this.name = __plugin_name;
    _.extend(this, _.pick(options, pluginOptions));
    this.initialize.apply(this, arguments);
    this._register_plugin();
};

_.extend(Plugin.prototype, {
    _register_plugin: function() {
        Kolibri.register_plugin_sync(this);
    },

    initialize: function() {},

    stop_listening: function(event, method) {
        Kolibri.stop_listening(event, this, method);
    }
});

// The Backbone Model extend method is a standalone function that is used to extend many Backbone objects.
// We use it here in preference to rolling our own to allow for extension of Plugins.

Plugin.extend = Backbone.Model.extend;

module.exports = Plugin;
