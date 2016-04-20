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
    // The component Views provide semantic classes -- in the template, we use classes only to identify regions
    // In other words, region classes shouldn't be the target of style rules
    template: _.template('<div class="searchWrap"></div>' +
                         '<div class="tagListWrap"></div>'),

    tagName: 'div',

    className: 'tiwtd',

    regions: {
        textinput: '.searchWrap',  // The selector refers to DOM elements in the View's template only.
        taglist: '.tagListWrap'
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


// This is a deeply nested view, used below.
// Marionette requires deeply-nested views to be defined before they're used in their containing views.
var ClassroomView = Mn.LayoutView.extend({
    template: function(serialized_model) {
        var html = _.join(['<span>', serialized_model.name, ':', '</span>'], '');
        html += '<ul class="ko_list userList">';
        _.forEach(this.users, function(user){
            html += '<li>' +
                    _.join([user.get('firstname'), user.get('lastname')], ' ') +
                    _.join(['<button class="delete standard-button" data-cid="', user.cid, '">Remove</button>'], '') +
                    '</li>';
        });
        html += '</ul>';
        html += '<div class="ko_drop_list">';
        html += '<button class="ko_drop_btn subheading">Add user \\/</button>';
        html += '<div class="ko_drop_content subheading">';
        _.forEach(this.usersToAdd, function(user){
            html += _.join(['<a href="#" ', 'data-cid="', user.cid, '">'], '') +
                    _.join([user.get('firstname'), user.get('lastname')], ' ') +
                    '</a>';
        });
        html += '</div>';
        html += '</div>';
        return _.template(html);
    },

    tagName: 'li',

    initialize: function(options) {
        var classroom = this.model;
        this.users = options.users.filter(function(user){
            // Assuming for simplicity that user is a model that has a denormalized list of classrooms
            // In reality the user-classroom connection is modeled by a separate object.
            var match = _.find(user.get('classrooms'), function(cr_name) {
                return cr_name === classroom.get('name');
            });
            return match !== undefined;
        });
        this.usersToAdd = options.users.filter(_.bind(function(user){
            var match = _.find(this.users, function(other) {
                return other.get('username') === user.get('username');
            });
            return match === undefined;
        }, this));
        _.bindAll(this, 'template');
    },

    events: {
        'click .delete': 'onClickDelete',
        'click .ko_drop_content a': 'onAddUser'
    },

    onClickDelete: function(ev) {
        var cid = $(ev.target).data('cid');
        var user = _.find(this.users, function(user){
            return user.cid === cid;
        });
        var excludeName = this.model.get('name');
        user.set('classrooms', _.filter(user.get('classrooms'), function(name){
            return name !== excludeName;
        }));
    },

    onAddUser: function(ev) {
        var cid = $(ev.target).data('cid');
        var user = _.find(this.usersToAdd, function(user){
            return user.cid === cid;
        });
        var crName = this.model.get('name');
        var newCrs = _.clone(user.get('classrooms'));
        newCrs.push(crName);
        user.set('classrooms', newCrs);
    }
});


var ClassroomCollection = Mn.CollectionView.extend({
    childView: ClassroomView,

    tagName: 'ul',

    className: 'ko_list'
});


// This is not sufficiently general to be a first-class component.
// It's just a thin wrapper around other components anyway.
var ClassRosterView = Mn.LayoutView.extend({
    template: _.template('<div class="heading">Class Roster</div>' +
                         '<div class="classListRegion"></div>'),

    regions: {
        classList: '.classListRegion'
    },

    initialize: function() {
        var classrooms = this.model.get('classrooms');
        var users = this.model.get('users');
        this.classList = new ClassroomCollection({
            collection: classrooms,
            childViewOptions: { // childViewOptions are passed to the initialize function of each child view
                users: users
            }
        });
    },

    onBeforeShow: function() {
        this.showChildView('classList', this.classList);
    }
});


// This is the main view of the User Management demo.
var UserManagementView = Mn.LayoutView.extend({
    template: _.template('<div class="userListContainer">' +
                            '<div class="heading">Users</div>' +
                            '<div class="userListRegion"></div>' +
                         '</div>' +
                         '<div class="classRosterRegion"></div>'),

    regions: {
        userList: '.userListRegion',
        classRoster: '.classRosterRegion'
    },

    initialize: function() {
        // KolibriCrudView allows us to provide a unified resource collection interface.
        // For instance, we can easily spin up lists of any resource and and provide CRUD widgets on them.
        this.userList = new components.KolibriCrudView({
            collection: this.model.get('users'),
            // If specified only the attributes in "display" are shown, otherwise all of the model's attrs are shown.
            display: ['username', 'firstname', 'lastname']
        });

        // The emerging convention is to pass on your model to your child views,
        // or as with the userList above, pass on some relevant piece of your model.
        this.classRoster = new ClassRosterView({
            model: this.model
        });
    },

    // This is just boilerplate, presumably to ensure child views are rendered so that the child+parent can be
    // attached to the DOM in one go. But if we gut the rendering system and use some virtual dom implementation,
    // then this could disappear -- it presumably wouldn't matter if child views are rendered *after* the parent.
    onBeforeShow: function() {
        this.showChildView('userList', this.userList);
        this.showChildView('classRoster', this.classRoster);
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
        validatingInput: '#validatingInput',
        userManagementToyApp: '#userManagementToyApp'
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


    // Setting up static test data for the User Management demo
    // In Particular, we construct one very inhomogeneous model which represents the app's state.
    // That's so we can listen to events on the model and trigger rerenders as needed.
    var User = Backbone.Model.extend({});
    var Classroom = Backbone.Model.extend({});
    var umModel = new Backbone.Model({
        users: new Backbone.Collection([
            {
                username: 'foo',
                classrooms: ['Classroom 1'],
                firstname: 'Foo',
                lastname: 'Bar'
            },
            {
                username: 'jco',
                classrooms: ['Classroom 1', 'Classroom 2'],
                firstname: 'John',
                lastname: 'Coltrane'
            },
            {
                username: 'jqp',
                classrooms: [],
                firstname: 'Jane Q.',
                lastname: 'Public'
            }
        ], {model: User}),
        classrooms: new Backbone.Collection([
            {
                name: 'Classroom 1'
            },
            {
                name: 'Classroom 2'
            }
        ], {model: Classroom})
    });

    var redraw = function() {
        umModel.trigger('redraw');
    };
    // "change" event corresponds to a collection's model's attributes changing
    umModel.listenTo(umModel.get('users'), 'change', redraw);
    umModel.listenTo(umModel.get('classrooms'), 'change', redraw);
    // "update" is triggered when a model is added or removed from a collection
    umModel.listenTo(umModel.get('users'), 'update', redraw);
    umModel.listenTo(umModel.get('classrooms'), 'update', redraw);

    app.listenTo(umModel, 'redraw', function(){
        console.log('All our views are is dust in the wind...');
        var newView = new UserManagementView({model: umModel});
        app.getRegion('userManagementToyApp').show(newView);
    });

    var userMgmt = new UserManagementView({model: umModel});
    app.getRegion('userManagementToyApp').show(userMgmt);

});


var cpd = new ComponentDemoPlugin();


module.exports = {};
