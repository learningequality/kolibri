'use strict';
/*
What is this?
-------------

A proof-of-concept Kolibri GUI widget gallery. Based on the docs here: https://docs.google.com/document/d/1siba2Yv4iJRPbLwvtWDDjrp_32a_MSb_3Dx27BmZ7p4/edit#

Defines a KolibriModule, which is our point of entry into the code.
In this case, it's a wrapper around a Marionette Application object -- but in principle it could provide a unified
point of entry for using *other* frameworks as well.

Demonstrates composition of "base components" from the components module also in this directory.

Read the inline comments for more explanation.
 */
var components = require('components');
var logging = require('loglevel');
var KolibriModule = require('kolibri_module');

// Set Backbone.$ explicitly, as it's required for View DOM manipulation in general and Marionette specifically.
var $ = require('jquery');
var Backbone = require('backbone');
Backbone.$ = $;
global.$ = $;
var Mn = require('backbone.marionette');
var _ = require('lodash');

logging.setDefaultLevel(2);

logging.info('Component demo loaded!');


var app = new Mn.Application();


var ComponentDemoPlugin = KolibriModule.extend({
    events: {},

    once: {},

    // KolibriModules must define an initialize function, which is called when they are instantiated.
    initialize: function() {
        logging.info('Demo initialized!');
        app.start();
    }
});

/*
LayoutViews are containers for subviews.
 */
var TextInputWithTagDisplay = Mn.LayoutView.extend({
    /*
    The template and regions attributes define the DOM containers for subviews.
    Regions are a Marionette abstraction which handle View loading/destroying -- they are essentially named DOM
    elements.
     */
    template: _.template('<div class="textinput"></div>' +
                         '<div class="taglist"></div>'),

    regions: {
        textinput: '.textinput',  // Th selector refers to DOM elements in the View's template only.
        taglist: '.taglist'
    },

    /*
    A good ol' fashioned initialize function. Setup the child views, but *don't* display them. That's
    the responsibility of the framework presently, and in the future our virtual dom(?)
     */
    initialize: function() {
        // A view should pass on it's own model or some element in it. Then events triggered on the model can
        // be handled by the Application.
        this.textInputField = new components.TextLineInput({model: this.model});
        this.tagList = new components.TagList({collection: this.model.get('tags')});

        // The list of events of base elements emit (and the arguments passed with those events)
        // should be enumerated in the documentation.
        // In this case, I'm assuming that TagList base component emits a 'tag_clicked' event, namespaced by 'tag_list'
        // We may choose a different convention.
        this.listenTo(this.tagList, 'tag_list:tag_clicked', function(tag_name) {
            console.log(tag_name + ' was clicked!');
            // Don't try to redraw -- just change the underlying model and let the app handle redrawing.
            // Note that Marionette handles the redraw itself, presumably in the CollectionView's logic.
            // If we want to override this behavior, we'll have to look into the internals.
            var coll = this.model.get('tags');
            var tag = coll.findWhere({name: tag_name});
            coll.remove(tag);
        });
        // Similarly, I'm assuming that textInputFields emit the following event+arguments.
        this.listenTo(this.textInputField, 'text_input:text_changed', function(text){
            this.model.get('tags').push(new Backbone.Model({
                name: text
            }));
            // Does this count as "introducing state"???
            this.textInputField.clear();
        });
    },

    // This convention is recommended by Marionette for efficient repaints.
    // See: http://marionettejs.com/docs/v2.4.5/marionette.layoutview.html#efficient-nested-view-structures
    onBeforeShow: function() {
        this.showChildView('taglist', this.tagList);
        this.showChildView('textinput', this.textInputField);
    }
});

// The Application object is Marionette's container object, and integrates with their debugging tool.
app.on('start', function(){
    // Applications have methods for managing Regions in the DOM -- these are the same Regions used by LayoutViews.
    // addRegions instantiates a Region identified by a selector and attaches it to the app with the given name.
    app.addRegions({
        content: '#content',  // This element already exists in the DOM.
        textLineInput: '#textLineInput',
        textAreaInput: '#textAreaInput',
        passwordInput: '#passwordInput',
        validatingInput: '#validatingInput'

    });

    // Just bootstrapping some data for the demo. In practice, this might be fetched from the server.
    var tags = new Backbone.Collection([
        new Backbone.Model({name: 'foo_tag'}),
        new Backbone.Model({name: 'bar_tag'}),
        new Backbone.Model({name: 'baz_tag'})
    ]);

    // The entire Application state should be externalized. In this case, it's encapsulated in a Model, but in practice
    // you could use several Models/Collections/etc, any object which uses the Backbone.Events framework should
    // suffice.
    var appModel = new Backbone.Model({
        enabled: true,
        tags: tags
    });
    var tiwtd = new TextInputWithTagDisplay({model: appModel});
    app.getRegion('content').show(tiwtd);

    var textLineInput = new components.TextLineInput({model: new Backbone.Model({enabled: true})});
    app.getRegion('textLineInput').show(textLineInput);

    var textAreaInput = new components.TextAreaInput({model: new Backbone.Model({enabled: true})});
    app.getRegion('textAreaInput').show(textAreaInput);

    var passwordInput = new components.PasswordInput({model: new Backbone.Model({enabled: true})});
    app.getRegion('passwordInput').show(passwordInput);

    var validatingInput = new components.ValidatingTextInput({model: new Backbone.Model({enabled: true})});
    app.getRegion('validatingInput').show(validatingInput);

    _.forEach([textLineInput, textAreaInput, passwordInput, validatingInput], function(view) {
        view.on('text_input:text_changed', function(text){
            console.log(view.cid + ' text changed! Got: "' + text + '"');
        });
    });
});


var cpd = new ComponentDemoPlugin();


module.exports = {};
