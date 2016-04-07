'use strict';
var components = require('components');
var logging = require('loglevel');
var KolibriModule = require('kolibri_module');
var $ = require('jquery');
var Backbone = require('backbone');
Backbone.$ = $;
var Mn = require('backbone.marionette');
var _ = require('lodash');

logging.setDefaultLevel(2);

logging.info('Component demo loaded!');


var app = new Mn.Application();


var ComponentDemoPlugin = KolibriModule.extend({

    events: {},

    once: { /* I'm broken, don't use me */ },

    initialize: function() {
        logging.info('Demo initialized!');
        app.start();
    }
});


var TextInputWithTagDisplay = Mn.LayoutView.extend({
    template: function(serialized_model) {
        return _.template(this.template_html)({});
    },

    template_html: '<div>Foo!</div>'
});


app.on('start', function(){
    app.addRegions({
        content: '#content'
    });

    var tiwtd = new TextInputWithTagDisplay();
    app.getRegion('content').show(tiwtd);
});


var cpd = new ComponentDemoPlugin();


module.exports = {};
