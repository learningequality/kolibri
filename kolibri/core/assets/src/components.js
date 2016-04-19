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
            console.log(attr);
            console.log(val);
            this.model.set(attr, val);
        }, this));
        this.collection.add(this.model);
        this.trigger('closeModal');
    }
});


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
        this.addItemTitle = options.addItemTitle || 'Add a new item';
        this.create = options.create;
        this.collection = options.collection;
        this.modelClass = options.modelClass || Backbone.Model;
        this.createModalTitle = options.createModalTotal || 'Create a new item';
        this.collectionView = new CrudCollection({
            collection: options.collection,
            display: options.display || false
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
        this.trigger('showModal', modalView, this.createModalTitle);
    }
});


module.exports = {
    KolibriCrudView: KolibriCrudView
};
