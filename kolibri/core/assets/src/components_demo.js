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
        this.textInputField = new components.TextInputField({model: this.model});
        this.tagList = new components.TagList({collection: this.model.get('tags')});
        this.listenTo(this.tagList, 'tag_list:tag_clicked', function(tag_name) {
            console.log(tag_name + ' was clicked!');
            // Don't try to redraw -- just change the underlying model and let the app handle redrawing.
            // Note that Marionette handles the redraw itself, presumably in the CollectionView's logic.
            // If we want to override this behavior, we'll have to look into the internals.
            var coll = this.model.get('tags');
            var tag = coll.findWhere({name: tag_name});
            coll.remove(tag);
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

    var tags = new Backbone.Collection([
        new Backbone.Model({name: 'foo_tag'}),
        new Backbone.Model({name: 'bar_tag'}),
        new Backbone.Model({name: 'baz_tag'})
    ]);
    var appModel = new Backbone.Model({
        enabled: true,
        tags: tags
    });
    var tiwtd = new TextInputWithTagDisplay({model: appModel});
    app.getRegion('content').show(tiwtd);
});


var cpd = new ComponentDemoPlugin();


module.exports = {};
