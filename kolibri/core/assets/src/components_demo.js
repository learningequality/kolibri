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

    once: {},

    initialize: function() {
        logging.info('Demo initialized!');
        app.start();
    }
});


var TextInputWithTagDisplay = Mn.LayoutView.extend({
    template: function(serialized_model) {
        var template_html = '<div class="textinput"></div>' +
                            '<div class="taglist"></div>';
        return _.template(template_html)({});
    },

    regions: {
        textinput: '.textinput',
        taglist: '.taglist'
    },

    initialize: function() {
        this.textInputField = new components.TextInputField();
        this.tagList = new components.TagList({model: this.model}); // Should have a "tags" attribute
        this.listenTo(this.tagList, 'tag_list:tag_clicked', function(tag_name) {
            console.log(tag_name + ' was clicked!');
        });
    },

    onBeforeShow: function() {
        this.showChildView('taglist', this.tagList);
        this.showChildView('textinput', this.textInputField);
    }
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
