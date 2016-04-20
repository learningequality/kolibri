'use strict';
var $ = require('jquery');
var logging = require('loglevel');
var Backbone = require('backbone');
var Mn = require('backbone.marionette');
var _ = require('lodash');

global.jQuery = $;
require('bootstrap-modal');


logging.setDefaultLevel(2);

logging.info('Component views loaded!');


// Implements CRUD actions for a given item
var CrudItem = Mn.ItemView.extend({
    template: function(serialized_model) {
        var html = '';
        _.forEach(this.display, function(key) {
            html += '<span>' + key + ': ' + serialized_model[key] + '</span>';
        });
        html += '<button class="delete standard-button">Delete</button>';
        return _.template(html);
    },

    tagName: 'li',

    className: 'crudItem',

    triggers: {
        'click .delete': 'itemDeleted'
    },

    initialize: function(options) {
        this.display = options.display || _.keys(this.model.attributes);
        _.bindAll(this, 'template');
    }
});


var CrudCollection = Mn.CollectionView.extend({
    childView: CrudItem,

    childViewOptions: function() {
        return {
            display: this.display
        };
    },

    initialize: function(options) {
        this.display = options.display || false;
    },

    tagName: 'ul',

    className: 'ko_list',

    childEvents: {
        itemDeleted: 'onChildItemDeleted'
    },

    onChildItemDeleted: function(child, args) {
        this.collection.remove(child.model);
    }
});


var CrudAddItem = Mn.ItemView.extend({
    template: function() {
        var html = '';
        _.forEach(this.create, function(attr){
            html += _.join(['<input data-attr="', attr, '" type="text" placeholder="', attr ,'"></input>'], '');
            html += '</br>';
        });
        html += '<button class="create flat-button">Create</button>';
        return _.template(html);
    },

    triggers: {
        'click .create': 'create'
    },

    initialize: function(options) {
        this.create = options.create;
        _.bindAll(this, 'template');
    },

    onCreate: function() {
        _.forEach(this.$el.find('input'), _.bind(function(input_el) {
            var attr = $(input_el).data('attr');
            var val = $(input_el).val();
            this.model.set(attr, val);
        }, this));
        this.collection.add(this.model);
        this.trigger('closeModal');
    }
});


/*
    KolibriCrudView attempts to provide a unified interface for managing lists of objects.
    As the name suggests, it provides four basic operations, all of which are customizable by passing options
    to the constructor:
    * Display a collection of items
    * Create new items and add them to the collection
    * Remove existing items from the collection
    * Edit items in the collection

    Required constructor options:
    * collection: A Backbone.Collection which KolibriCrudView manages
    * create: A list of strings naming attributes which the user must provide to create a new item.
        At this time, input is only through a text field and no validation is provided.

    Optional constructor options:
    * display: A list of strings naming attributes of the collection's models which will be displayed.
        If falsy, then *all* of the model's .attributes hash will be shown.
        Default is `false`;
    * createModalTitle: A string, the title of the modal when adding a new item.
        Default: 'Create a new item'
    * modelClass: The class of the Models in the collection. Can be specified to e.g. use custom initialization logic
        when creating a new model through the add modal.
        Default: Backbone.Model
    * modalService: The object on which the "showModal" event is triggered when the user clicks the add button.
        The event is passes two arguments, an instance of a CrudAddItem view to be displayed and the value of
        createModalTitle. The intent is that the user will inject their own modal service object.
        Default: the KolibriCrudView instance itself -- then the user may listen for the event to implement custom
            logic.
 */
var KolibriCrudView = Mn.LayoutView.extend({
    template: _.template('<div class="collectionRegion"></div>' +
                         '<button class="add">Add</button>'),

    regions: {
        collectionRegion: '.collectionRegion'
    },

    events: {
        'click .add': 'onAddClicked'
    },

    initialize: function(options) {
        // Required options
        this.create = options.create;
        this.collection = options.collection;

        // Options with default values
        this.display = options.display || false;
        this.modelClass = options.modelClass || Backbone.Model;
        this.createModalTitle = options.createModalTitle || 'Create a new item';
        this.modalService = options.modalService || this;

        this.collectionView = new CrudCollection({
            collection: this.collection,
            display: this.display
        });
    },

    onBeforeShow: function() {
        this.showChildView('collectionRegion', this.collectionView);
    },

    onAddClicked: function() {
        var model = new this.modelClass();
        var modalView = new CrudAddItem({
            model: model,
            collection: this.collection,
            create: this.create
        });
        // Something *else* has to be listening to this object's "showModal" event in order to handle it.
        // In practice this means that when using KolibriCrudView, the user is responsible for setting up a
        // listener, otherwise the add functionality simply won't work.
        // But is this a good model for a modal service?
        this.modalService.trigger('showModal', modalView, this.createModalTitle);
    }
});


module.exports = {
    KolibriCrudView: KolibriCrudView
};
