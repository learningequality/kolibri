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
var Handlebars = require('handlebars.runtime');

// Set Backbone.$ explicitly, as it's required for View DOM manipulation in general and Marionette specifically.
var $ = require('jquery');
var Backbone = require('backbone');
Backbone.$ = $;
global.$ = $;
var Mn = require('backbone.marionette');
var _ = require('lodash');

// 'jQuery' needs to be defined in order for the bootstrap-modal jQuery plugin to start correctly.
// ...but surely there has to be a better way for webpack to manage dependency injection?
var jQuery = $;
require('bootstrap-modal');

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


var User = Backbone.Model.extend({
    initialize: function(options) {
        options = options || {};
        this.set('classrooms', options.classrooms || []);
    }
});


// This is a deeply nested view, used below.
// Marionette requires deeply-nested views to be defined before they're used in their containing views.
var ClassroomView = Mn.LayoutView.extend({
    template: function(serialized_model) {
        var html =
            '<span>{{ name }}</span>' +
            '<ul class="ko_list userList">' +
                '{{#each users}}<li>' +
                    '{{ firstname }} {{ lastname }}' +
                    '<button class="delete standard-button" data-cid="{{ cid }}">Remove</button>' +
                '</li>{{/each}}' +
            '</ul>' +
            '<div class="ko_drop_list">' +
                '<button class="ko_drop_btn subheading">Add user \\/</button>' +
                '<div class="ko_drop_content subheading">' +
                    '{{#each usersToAdd }}<a href="#" data-cid="{{ cid }}">' +
                    '{{ firstname }} {{ lastname }}' +
                    '</a>{{/each}}' +
                '</div>' +
            '</div>';
        _.extend(serialized_model, {
            users: this.usersHash,
            usersToAdd: this.usersToAddHash
        });
        return Handlebars.compile(html)(serialized_model);
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

        // Used as template context variables
        var userModelToHash = function(user) {
            var attrs = _.clone(user.attributes);
            _.extend(attrs, {
                cid: user.cid
            });
            return attrs;
        };
        this.usersHash = _.map(this.users, userModelToHash);
        this.usersToAddHash = _.map(this.usersToAdd, userModelToHash);

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
        users.on('remove change add', _.bind(function() {
            this.classList.render();
        }, this));
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
            display: ['username', 'firstname', 'lastname'],
            // Specify which attributes are specifiable when creating a new item. This *must* be provided.
            create: ['username', 'firstname', 'lastname'],
            // Setting the modelClass ensures that models are properly instantiated even when not all the fields
            // are specifiable from the "create" dialog -- in this case, we initialize the classrooms attribute.
            modelClass: User,
            // See the KolibriCrudView for explanation of this option
            modalService: app
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
        userManagementToyApp: '#userManagementToyApp',
        modal: '#modal_view_el'
    });

    // Setting up static test data for the User Management demo
    // In Particular, we construct one very inhomogeneous model which represents the app's state.
    // That's so we can listen to events on the model and trigger rerenders as needed.
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

    var userMgmt = new UserManagementView({model: umModel});
    app.getRegion('userManagementToyApp').show(userMgmt);

});


/*
 ModalContainerView is used in the example "modal service" -- the idea is that this singleton view manages the
 modal DOM elements and responds to requests to display a subview in the modal as the modal's content.
*/
var ModalContainerView = Mn.LayoutView.extend({
    template: _.template('<div class="modal-content">' +
                            '<div class="modal-header">' +
                                '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
                                '<h4 class="modal-title" id="myModalLabel"><%= title %></h4>' +
                            '</div>' +
                            '<div class="modal-body">' +
                            '</div>' +
                        '</div>'),

    regions: {
        modal: '.modal-body'
    },

    initialize: function(options) {
        // Will be used to set the title in the template implicitly
        this.model = new Backbone.Model();
        this.model.set('title', options.title || '');

        this.subview = options.subview;
        this.listenTo(this.subview, 'closeModal', _.bind(function(){
            this.getRegion('modal').empty();
            $('#modal').modal('hide');
        }, this));
    },

    onBeforeShow: function() {
        $('#modal').modal();
        this.showChildView('modal', this.subview);
    }
});


/*
 Modals are requested to be shown by triggering the "showModal" event on a modal service and providing an instantiated
 view and the modal's title as arguments.
 A modal service is anything that handles the "showModal" event -- in this case, it's the Application object.
 Any communication between a modalView and its originator should occur through a shared Model or Collection
 provided to the instantiated modalView.
 */
app.on('showModal', function(modalView, modalTitle) {
    var container = new ModalContainerView({
        subview: modalView,
        title: modalTitle
    });
    app.getRegion('modal').show(container);
});

var cpd = new ComponentDemoPlugin();


module.exports = {};
